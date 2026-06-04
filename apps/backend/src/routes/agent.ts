/**
 * Agent API Routes
 *
 * Handles autonomous AI workflow execution.
 * Routes:
 *   POST  /api/agent/workflow/run          — Start autonomous workflow
 *   GET   /api/agent/workflow/:id/status   — Session status + step count
 *   GET   /api/agent/workflow/:id/thoughts — AI thought log
 *   GET   /api/agent/workflow/:id/actions  — Executed action log
 *   GET   /api/agent/workflow/:id/context  — Latest MCP context snapshot
 */

import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import {
  BrowserManager,
  AgentLoop,
  createAIProvider,
  AIProvider,
  scheduleWorkflow,
} from '@fricta/agent';
import { Page } from 'playwright-core';

export const agentRoutes = new Hono();

const prisma = new PrismaClient();
const browserManager = new BrowserManager();

// ─── In-Memory Fallback Stores ────────────────────────────────────────────────
// Primary: Prisma DB. Fallback: In-memory maps for local dev / DB unavailability.

interface SessionRecord {
  id: string;
  projectId: string;
  goal: string;
  persona: string;
  status: string;
  stepCount: number;
  model: string;
  startedAt: Date;
  endedAt?: Date;
}

interface ThoughtRecord {
  id: string;
  workflowSessionId: string;
  thought: string;
  stepNumber: number;
  timestamp: Date;
}

interface ActionRecord {
  id: string;
  workflowSessionId: string;
  action: string;
  target: string;
  value?: string;
  status: string;
  stepNumber: number;
  errorMessage?: string;
  timestamp: Date;
}

const memSessions = new Map<string, SessionRecord>();
const memThoughts = new Map<string, ThoughtRecord[]>();
const memActions = new Map<string, ActionRecord[]>();
const memContextSnapshots = new Map<string, unknown>();
const activePages = new Map<string, Page>();

// ─── DB Circuit Breaker ───────────────────────────────────────────────────────
// Trips on first DB connection failure. Prevents console spam when Postgres
// is not running. Resets after 60s to retry if DB comes back online.

let dbAvailable = true;
let dbCircuitOpenedAt: number | null = null;
const DB_RETRY_INTERVAL_MS = 60_000;

function isDbAvailable(): boolean {
  if (dbAvailable) return true;
  // Auto-reset after retry interval
  if (dbCircuitOpenedAt && Date.now() - dbCircuitOpenedAt > DB_RETRY_INTERVAL_MS) {
    dbAvailable = true;
    dbCircuitOpenedAt = null;
    console.log('[AgentRoutes] DB circuit breaker reset — retrying database connection');
    return true;
  }
  return false;
}

function tripDbCircuit(err: any): void {
  if (dbAvailable) {
    dbAvailable = false;
    dbCircuitOpenedAt = Date.now();
    const isConnErr = err?.message?.includes('P1001') || err?.message?.includes('connect');
    console.warn(
      isConnErr
        ? '[AgentRoutes] Database unreachable — switching to in-memory mode. Start Postgres to enable persistence.'
        : `[AgentRoutes] DB error: ${err?.message}`
    );
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function updateSessionStatus(
  sessionId: string,
  status: string,
  stepCount?: number,
  endedAt?: Date
): Promise<void> {
  // Update in-memory always
  const memSess = memSessions.get(sessionId);
  if (memSess) {
    memSess.status = status;
    if (stepCount !== undefined) memSess.stepCount = stepCount;
    if (endedAt) memSess.endedAt = endedAt;
  }

  // Update in DB
  if (isDbAvailable()) {
    try {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: {
          status,
          ...(stepCount !== undefined ? { stepCount } : {}),
          ...(endedAt ? { endedAt } : {}),
        },
      });
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }
}

async function saveThought(
  sessionId: string,
  thought: string,
  stepNumber: number
): Promise<void> {
  const record: ThoughtRecord = {
    id: generateId(),
    workflowSessionId: sessionId,
    thought,
    stepNumber,
    timestamp: new Date(),
  };

  // In-memory
  const list = memThoughts.get(sessionId) ?? [];
  list.push(record);
  memThoughts.set(sessionId, list);

  // DB (primary)
  if (isDbAvailable()) {
    try {
      await prisma.agentThought.create({
        data: {
          workflowSessionId: sessionId,
          thought,
          stepNumber,
        },
      });
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }
}

async function saveAction(
  sessionId: string,
  action: {
    action: string;
    target: string;
    value?: string;
    status: string;
    stepNumber: number;
    errorMessage?: string;
  }
): Promise<void> {
  const record: ActionRecord = {
    id: generateId(),
    workflowSessionId: sessionId,
    ...action,
    timestamp: new Date(),
  };

  // In-memory
  const list = memActions.get(sessionId) ?? [];
  list.push(record);
  memActions.set(sessionId, list);

  // DB (primary)
  if (isDbAvailable()) {
    try {
      await prisma.agentAction.create({
        data: {
          workflowSessionId: sessionId,
          action: action.action,
          target: action.target,
          value: action.value,
          status: action.status,
          stepNumber: action.stepNumber,
          errorMessage: action.errorMessage,
        },
      });
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }
}

// ─── POST /workflow/run ───────────────────────────────────────────────────────

agentRoutes.post('/workflow/run', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, url, goal, persona, variables } = body;

  if (!projectId || !url || !goal) {
    return c.json({ error: 'projectId, url, and goal are required' }, 400);
  }

  const resolvedPersona = persona || 'Tech-Savvy User';
  let sessionId = generateId();

  // ── Create AI Provider ────────────────────────────────────────────────────

  let provider: AIProvider;
  try {
    provider = createAIProvider('openrouter');
  } catch (err: any) {
    return c.json({ error: `AI provider setup failed: ${err.message}` }, 500);
  }

  const modelName = provider.getModel();

  // ── Create DB Session (primary) ───────────────────────────────────────────

  try {
    const dbSession = await prisma.workflowSession.create({
      data: {
        projectId,
        goal,
        persona: resolvedPersona,
        status: 'RUNNING',
        model: modelName,
        startedAt: new Date(),
      },
    });
    sessionId = dbSession.id;
  } catch (e: any) {
    console.warn('[AgentRoutes] DB session create failed, using in-memory ID:', e.message);
  }

  // ── Initialize In-Memory Session ──────────────────────────────────────────

  memSessions.set(sessionId, {
    id: sessionId,
    projectId,
    goal,
    persona: resolvedPersona,
    status: 'QUEUED',
    stepCount: 0,
    model: modelName,
    startedAt: new Date(),
  });
  memThoughts.set(sessionId, []);
  memActions.set(sessionId, []);

  // Normalize the URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(normalizedUrl)) {
      normalizedUrl = `http://${normalizedUrl}`;
    } else {
      normalizedUrl = `https://${normalizedUrl}`;
    }
  }

  // ── Enqueue Job to BullMQ ────────────────────────────────────────────────

  try {
    await scheduleWorkflow({
      sessionId,
      projectId,
      goal,
      persona: resolvedPersona,
      model: modelName,
      url: normalizedUrl,
    });
  } catch (err: any) {
    console.error(`[AgentRoutes] Failed to schedule workflow: ${err.message}`);
    try {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED', endedAt: new Date() }
      });
    } catch (dbErr: any) {
      console.error(`[AgentRoutes] Failed to mark session as FAILED: ${dbErr.message}`);
    }
    return c.json({ error: `Failed to schedule workflow: ${err.message}` }, 500);
  }

  return c.json({
    message: 'Autonomous workflow queued successfully',
    workflowId: sessionId,
    sessionId,
    model: modelName,
    goal,
    persona: resolvedPersona,
  });
});

// ─── GET /workflow/:id/status ─────────────────────────────────────────────────

agentRoutes.get('/workflow/:id/status', async (c) => {
  const id = c.req.param('id');

  // Try DB first (skipped silently if circuit is open)
  if (isDbAvailable()) {
    try {
      const session = await prisma.workflowSession.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          stepCount: true,
          model: true,
          goal: true,
          persona: true,
          startedAt: true,
          endedAt: true,
        },
      });
      if (session) {
        return c.json({ session, isActive: activePages.has(id) });
      }
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }

  // Fallback to in-memory
  const memSess = memSessions.get(id);
  if (!memSess) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ session: memSess, isActive: activePages.has(id) });
});

// ─── GET /workflow/:id/thoughts ───────────────────────────────────────────────

agentRoutes.get('/workflow/:id/thoughts', async (c) => {
  const id = c.req.param('id');

  if (isDbAvailable()) {
    try {
      const thoughts = await prisma.agentThought.findMany({
        where: { workflowSessionId: id },
        orderBy: { stepNumber: 'asc' },
      });
      return c.json({ thoughts });
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }

  const thoughts = memThoughts.get(id) ?? [];
  return c.json({ thoughts });
});

// ─── GET /workflow/:id/actions ────────────────────────────────────────────────

agentRoutes.get('/workflow/:id/actions', async (c) => {
  const id = c.req.param('id');

  if (isDbAvailable()) {
    try {
      const actions = await prisma.agentAction.findMany({
        where: { workflowSessionId: id },
        orderBy: { stepNumber: 'asc' },
      });
      return c.json({ actions });
    } catch (e: any) {
      tripDbCircuit(e);
    }
  }

  const actions = memActions.get(id) ?? [];
  return c.json({ actions });
});

// ─── GET /workflow/:id/context ────────────────────────────────────────────────

agentRoutes.get('/workflow/:id/context', async (c) => {
  const id = c.req.param('id');
  const snapshot = memContextSnapshots.get(id);

  if (!snapshot) {
    return c.json({ context: null, message: 'No context snapshot available yet' });
  }

  return c.json({ context: snapshot });
});
