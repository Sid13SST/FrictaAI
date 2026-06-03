import { Hono } from 'hono';
import { BrowserManager, SessionManager } from '@fricta/agent';
import { prisma } from '@fricta/db';
import { VisualTimelineManager, VisualStorageManager } from '@fricta/visual-engine';
import { promises as fs } from 'fs';
import { getCurrentUser } from '../middleware/authContext';
import {
  requireProjectOwnerQuery,
  requireProjectOwnerBody,
  requireWorkflowOwner,
  assertWorkflowOwnership
} from '../guards/ownership';
import {
  activeSessions,
  memorySessions,
  memoryInteractions,
  memoryScreenshots
} from '../utils/memoryDb';

export const workflowRoutes = new Hono();
const browserManager = new BrowserManager();
const timelineManager = new VisualTimelineManager(prisma);
const storageManager = new VisualStorageManager();

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTES — MUST come BEFORE any /:id/* parameterized routes.
// ─────────────────────────────────────────────────────────────────────────────

// Serve raw screenshot files from disk (with ownership checks)
workflowRoutes.get('/screenshots/raw/*', async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const rawPath = c.req.path; // e.g. /api/workflows/screenshots/raw/sessions/abc/file.webp
  const prefix = '/screenshots/raw/';
  const prefixIndex = rawPath.indexOf(prefix);
  const relativePath = prefixIndex !== -1 ? rawPath.slice(prefixIndex + prefix.length) : '';

  if (!relativePath) {
    return c.json({ error: 'Screenshot file path is required' }, 400);
  }

  // Parse session ID from path to perform ownership check: e.g. sessions/session-xxx/... or just session-xxx/...
  const sessionMatch = relativePath.match(/(?:sessions\/)?([^\/]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (sessionId) {
    const isOwner = await assertWorkflowOwnership(user.userId, sessionId);
    if (!isOwner) {
      return c.json({ error: 'Access denied' }, 403);
    }
  } else {
    return c.json({ error: 'Access denied' }, 403);
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

// Fetch screenshot metadata by ID (with ownership checks)
workflowRoutes.get('/screenshots/:screenshotId', async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const screenshotId = c.req.param('screenshotId');
  try {
    const screenshot = await prisma.workflowScreenshot.findUnique({
      where: { id: screenshotId },
    });
    if (!screenshot) {
      return c.json({ error: 'Screenshot not found' }, 404);
    }

    // Verify ownership of parent workflow session
    const isOwner = await assertWorkflowOwnership(user.userId, screenshot.workflowSessionId);
    if (!isOwner) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({ screenshot });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET / - List all workflow sessions for a project (Project ownership required)
workflowRoutes.get('/', requireProjectOwnerQuery('projectId'), async (c) => {
  const projectId = c.req.query('projectId')!;
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

// POST /start - Start a new workflow session (Project ownership required)
workflowRoutes.post('/start', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, url, goal, persona } = body;

  if (!projectId || !url) {
    return c.json({ error: 'projectId and url are required' }, 400);
  }

  let sessionId = `session-${Date.now()}`;
  let usePrisma = true;

  try {
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

// GET /:id/context - Fetch context of active session (Workflow ownership required)
workflowRoutes.get('/:id/context', requireWorkflowOwner('id'), async (c) => {
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

// GET /:id/interactions - Fetch interactions (Workflow ownership required)
workflowRoutes.get('/:id/interactions', requireWorkflowOwner('id'), async (c) => {
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

// GET /:id/screenshots - Fetch screenshots list (Workflow ownership required)
workflowRoutes.get('/:id/screenshots', requireWorkflowOwner('id'), async (c) => {
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

// POST /:id/end - End active workflow session (Workflow ownership required)
workflowRoutes.post('/:id/end', requireWorkflowOwner('id'), async (c) => {
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

// GET /:id/visual-replay - Visual replay timeline (Workflow ownership required)
workflowRoutes.get('/:id/visual-replay', requireWorkflowOwner('id'), async (c) => {
  const sessionId = c.req.param('id');
  try {
    const timeline = await timelineManager.getSessionTimeline(sessionId);
    return c.json(timeline);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /:id/visual-timeline - Visual screenshots timeline (Workflow ownership required)
workflowRoutes.get('/:id/visual-timeline', requireWorkflowOwner('id'), async (c) => {
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
