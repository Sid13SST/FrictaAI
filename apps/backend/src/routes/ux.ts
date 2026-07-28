import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import { UXIntelligenceCoordinator, RecommendationEngine } from '@fricta/ux-intelligence';
import { requireFindingOwner } from '../guards/ownership';
import { getCurrentUser } from '../middleware/authContext';

export const uxRoutes = new Hono();
const prisma = new PrismaClient();
const coordinator = new UXIntelligenceCoordinator(prisma);

const FINDING_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
type FindingStatus = (typeof FINDING_STATUSES)[number];

// Retrieve all UX findings for a session
uxRoutes.get('/findings/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const findings = await prisma.uXFinding.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return c.json({ findings });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch UX findings for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Update a finding's investigation status, with optional resolution notes.
// Ownership is verified by traversing UXFinding -> WorkflowSession -> Project.
uxRoutes.patch('/findings/:id', requireFindingOwner('id'), async (c) => {
  const id = c.req.param('id');
  const user = getCurrentUser(c);

  try {
    const body = await c.req.json().catch(() => ({}));
    const { status, resolutionNotes } = body as { status?: string; resolutionNotes?: string };

    if (status !== undefined && !FINDING_STATUSES.includes(status as FindingStatus)) {
      return c.json({ error: `status must be one of: ${FINDING_STATUSES.join(', ')}` }, 400);
    }
    if (status === undefined && resolutionNotes === undefined) {
      return c.json({ error: 'Provide at least one of: status, resolutionNotes' }, 400);
    }

    const isTerminal = status === 'RESOLVED' || status === 'DISMISSED';

    const finding = await prisma.uXFinding.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
        ...(isTerminal ? { resolvedAt: new Date(), resolvedBy: user?.userId ?? null } : {}),
      },
    });

    return c.json({ finding });
  } catch (error: any) {
    console.error(`[Backend] Failed to update finding ${id}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve cognitive signals for a session
uxRoutes.get('/cognitive/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const signals = await prisma.cognitiveSignal.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return c.json({ signals });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch cognitive signals for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve detailed UX recommendations for a session
uxRoutes.get('/recommendations/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const findings = await prisma.uXFinding.findMany({
      where: { workflowSessionId: sessionId }
    });
    
    // Map raw findings to structured pattern library recommendations
    const recommendations = RecommendationEngine.generate(findings.map(f => ({
      ...f,
      severity: f.severity as any
    })));
    return c.json({ recommendations });
  } catch (error: any) {
    console.error(`[Backend] Failed to generate UX recommendations for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Trigger UX intelligence analysis for a session
uxRoutes.post('/analyze/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const result = await coordinator.analyzeSession(sessionId);
    return c.json(result);
  } catch (error: any) {
    console.error(`[Backend] UX analysis failed for session ${sessionId}:`, error.message);
    try {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED' }
      });
    } catch (dbErr: any) {
      console.error(`[Backend] Failed to transition session to FAILED status:`, dbErr.message);
    }
    return c.json({ error: error.message }, 500);
  }
});
