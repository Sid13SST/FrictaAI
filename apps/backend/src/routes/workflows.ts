import { Hono } from 'hono';
import { BrowserManager, SessionManager } from '@fricta/agent';
import { PrismaClient } from '@fricta/db';
import { VisualTimelineManager, VisualStorageManager } from '@fricta/visual-engine';
import { promises as fs } from 'fs';

export const workflowRoutes = new Hono();
const prisma = new PrismaClient();
const browserManager = new BrowserManager();
const timelineManager = new VisualTimelineManager(prisma);
const storageManager = new VisualStorageManager();

// Simple in-memory store mapping sessionId to SessionManager for active sessions
const activeSessions = new Map<string, SessionManager>();

// In-memory store for workflow sessions and events
const memorySessions = new Map<string, any>();
const memoryInteractions = new Map<string, any[]>();
const memoryScreenshots = new Map<string, any[]>();

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTES — MUST come BEFORE any /:id/* parameterized routes.
// Hono matches params greedily: /:id would capture "screenshots" as an id value,
// shadow these routes, and return a JSON 404 instead of serving image bytes.
// ─────────────────────────────────────────────────────────────────────────────

// Serve raw screenshot files from disk
workflowRoutes.get('/screenshots/raw/*', async (c) => {
  // c.req.param('*') can be unreliable with the hono/node-server adapter when
  // the router is sub-mounted. Extract the relative path from the raw URL instead.
  const rawPath = c.req.path; // e.g. /api/workflows/screenshots/raw/sessions/abc/file.webp
  const prefix = '/screenshots/raw/';
  const prefixIndex = rawPath.indexOf(prefix);
  const relativePath = prefixIndex !== -1 ? rawPath.slice(prefixIndex + prefix.length) : '';

  if (!relativePath) {
    return c.json({ error: 'Screenshot file path is required' }, 400);
  }

  const absolutePath = storageManager.resolvePath(relativePath);
  try {
    const fileBytes = await fs.readFile(absolutePath);
    const contentType = relativePath.endsWith('.webp') ? 'image/webp' : 'image/png';
    return c.body(fileBytes, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  } catch (err: any) {
    return c.json({ error: `Screenshot file not found: ${relativePath}` }, 404);
  }
});

// Fetch screenshot metadata by ID
workflowRoutes.get('/screenshots/:screenshotId', async (c) => {
  const screenshotId = c.req.param('screenshotId');
  try {
    const screenshot = await prisma.workflowScreenshot.findUnique({
      where: { id: screenshotId },
    });
    if (!screenshot) {
      return c.json({ error: 'Screenshot not found' }, 404);
    }
    return c.json({ screenshot });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

workflowRoutes.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'Missing projectId query parameter' }, 400);
  }

  try {
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return c.json({ sessions });
  } catch (error: any) {
    console.warn('Prisma workflow sessions fetch failed, using memory store:', error.message);
    const sessions = Array.from(memorySessions.values()).filter(s => s.projectId === projectId);
    return c.json({ sessions });
  }
});

workflowRoutes.post('/start', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, url, goal, persona } = body;

  if (!projectId || !url) {
    return c.json({ error: 'projectId and url are required' }, 400);
  }

  let sessionId = `session-${Date.now()}`;
  let usePrisma = true;

  try {
    if (projectId !== 'default-mem-project-id' && !projectId.startsWith('project-')) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }
    }

    const sessionRecord = await prisma.workflowSession.create({
      data: {
        projectId,
        goal: goal || null,
        persona: persona || null,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
    sessionId = sessionRecord.id;
  } catch (error: any) {
    console.warn('Prisma workflow session create failed, falling back to memory database:', error.message);
    usePrisma = false;
    memorySessions.set(sessionId, {
      id: sessionId,
      projectId,
      goal: goal || null,
      persona: persona || null,
      status: 'RUNNING',
      startedAt: new Date(),
    });
  }

  try {
    await browserManager.launch();

    const context = await browserManager.createContext(sessionId);
    const sessionManager = new SessionManager(sessionId, context, {
      onInteraction: async (event) => {
        const list = memoryInteractions.get(sessionId) || [];
        list.push(event);
        memoryInteractions.set(sessionId, list);

        if (usePrisma) {
          try {
            await prisma.interactionEvent.create({
              data: { sessionId, type: event.type, target: event.target, metadata: event.metadata || null },
            });
          } catch (e: any) {
            console.warn('Failed to save interaction to database:', e.message);
          }
        }
      },
      onScreenshot: async (screenshot) => {
        const list = memoryScreenshots.get(sessionId) || [];
        list.push(screenshot);
        memoryScreenshots.set(sessionId, list);

        if (usePrisma) {
          try {
            await prisma.screenshot.create({ data: { sessionId, path: screenshot.filePath } });
          } catch (e: any) {
            console.warn('Failed to save screenshot to database:', e.message);
          }
        }
      },
    });

    await sessionManager.start(url);
    activeSessions.set(sessionId, sessionManager);

    return c.json({ message: 'Session started successfully', sessionId, url });
  } catch (error: any) {
    if (usePrisma) {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED', endedAt: new Date() },
      }).catch(() => {});
    } else {
      const s = memorySessions.get(sessionId);
      if (s) { s.status = 'FAILED'; s.endedAt = new Date(); }
    }
    return c.json({ error: error.message }, 500);
  }
});

workflowRoutes.get('/:id/context', async (c) => {
  const id = c.req.param('id');
  const sessionManager = activeSessions.get(id);
  if (!sessionManager) {
    return c.json({ error: 'Active session not found' }, 404);
  }
  try {
    const context = await sessionManager.getContext();
    return c.json({ context });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

workflowRoutes.get('/:id/interactions', async (c) => {
  const id = c.req.param('id');
  const sessionManager = activeSessions.get(id);

  if (sessionManager) {
    const context = await sessionManager.getContext();
    return c.json({ interactions: context.history });
  }

  try {
    const interactions = await prisma.interactionEvent.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' },
    });
    return c.json({ interactions });
  } catch (error: any) {
    console.warn('Prisma interaction fetch failed, using memory store:', error.message);
    const interactions = memoryInteractions.get(id) || [];
    return c.json({ interactions });
  }
});

workflowRoutes.get('/:id/screenshots', async (c) => {
  const id = c.req.param('id');
  try {
    const screenshots = await prisma.screenshot.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' },
    });
    return c.json({ screenshots });
  } catch (error: any) {
    console.warn('Prisma screenshots fetch failed, using memory store:', error.message);
    const screenshots = memoryScreenshots.get(id) || [];
    return c.json({ screenshots });
  }
});

workflowRoutes.post('/:id/end', async (c) => {
  const id = c.req.param('id');
  const sessionManager = activeSessions.get(id);

  if (sessionManager) {
    await sessionManager.close();
    await browserManager.closeContext(id);
    activeSessions.delete(id);
  }

  try {
    const updatedSession = await prisma.workflowSession.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    return c.json({ message: 'Session ended', session: updatedSession });
  } catch (error: any) {
    console.warn('Prisma workflow session end failed, using memory store:', error.message);
    const s = memorySessions.get(id);
    if (s) { s.status = 'COMPLETED'; s.endedAt = new Date(); }
    return c.json({ message: 'Session ended', session: s });
  }
});

// Visual Intelligence Routes
workflowRoutes.get('/:id/visual-replay', async (c) => {
  const sessionId = c.req.param('id');
  try {
    const timeline = await timelineManager.getSessionTimeline(sessionId);
    return c.json(timeline);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

workflowRoutes.get('/:id/visual-timeline', async (c) => {
  const sessionId = c.req.param('id');
  try {
    const timelineEvents = await prisma.screenshotTimelineEvent.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' },
    });
    return c.json({ timelineEvents });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
