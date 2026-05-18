import { Hono } from 'hono';
import { BrowserManager, SessionManager } from '@fricta/agent';
import { PrismaClient } from '@fricta/db';

export const workflowRoutes = new Hono();
const prisma = new PrismaClient();
const browserManager = new BrowserManager();

// Simple in-memory store mapping sessionId to SessionManager for active sessions
const activeSessions = new Map<string, SessionManager>();

// In-memory store for workflow sessions and events
const memorySessions = new Map<string, any>();
const memoryInteractions = new Map<string, any[]>();
const memoryScreenshots = new Map<string, any[]>();

workflowRoutes.post('/start', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, url, goal, persona } = body;

  if (!projectId || !url) {
    return c.json({ error: 'projectId and url are required' }, 400);
  }

  let sessionId = `session-${Date.now()}`;
  let usePrisma = true;

  try {
    // Verify project exists (skip if it is our default in-memory project)
    if (projectId !== 'default-mem-project-id' && !projectId.startsWith('project-')) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }
    }

    // Create session in DB
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
    // Ensure browser is launched
    await browserManager.launch();

    // Create context and session manager with callbacks to save interactions and screenshots
    const context = await browserManager.createContext(sessionId);
    const sessionManager = new SessionManager(sessionId, context, {
      onInteraction: async (event) => {
        // Save to in-memory array first
        const list = memoryInteractions.get(sessionId) || [];
        list.push(event);
        memoryInteractions.set(sessionId, list);

        // Save to DB if usePrisma is active
        if (usePrisma) {
          try {
            await prisma.interactionEvent.create({
              data: {
                sessionId,
                type: event.type,
                target: event.target,
                metadata: event.metadata || null,
              },
            });
          } catch (e: any) {
            console.warn('Failed to save interaction to database:', e.message);
          }
        }
      },
      onScreenshot: async (screenshot) => {
        // Save to in-memory array first
        const list = memoryScreenshots.get(sessionId) || [];
        list.push(screenshot);
        memoryScreenshots.set(sessionId, list);

        // Save to DB if usePrisma is active
        if (usePrisma) {
          try {
            await prisma.screenshot.create({
              data: {
                sessionId,
                path: screenshot.filePath,
              },
            });
          } catch (e: any) {
            console.warn('Failed to save screenshot to database:', e.message);
          }
        }
      },
    });
    
    // Start session and navigate
    await sessionManager.start(url);
    
    // Store in memory for active interactions
    activeSessions.set(sessionId, sessionManager);

    return c.json({
      message: 'Session started successfully',
      sessionId,
      url,
    });
  } catch (error: any) {
    // Update status to FAILED
    if (usePrisma) {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED', endedAt: new Date() },
      }).catch(() => {});
    } else {
      const s = memorySessions.get(sessionId);
      if (s) {
        s.status = 'FAILED';
        s.endedAt = new Date();
      }
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

  // If active, get from memory. If not active, query DB.
  if (sessionManager) {
    const context = await sessionManager.getContext();
    return c.json({ interactions: context.history });
  }

  // Look up in DB/Memory
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

// A route to close/end a session
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
    if (s) {
      s.status = 'COMPLETED';
      s.endedAt = new Date();
    }
    return c.json({ message: 'Session ended', session: s });
  }
});
