import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { OrchestratorCoordinator } from '@fricta/orchestrator';

export const orchestratorRoutes = new Hono()
  /**
   * Starts a new orchestration session for a given workflow session ID.
   * Runs the coordinator in the background to allow real-time progress observability.
   */
  .post('/start/:sessionId', async (c) => {
    const workflowSessionId = c.req.param('sessionId');
    
    // Ensure workflow session exists
    const workflowSession = await prisma.workflowSession.findUnique({
      where: { id: workflowSessionId }
    });

    if (!workflowSession) {
      return c.json({ error: `Workflow session ${workflowSessionId} not found` }, 404);
    }

    // Check if there is an active running session already to avoid duplicate runs
    const existingRunning = await prisma.orchestrationSession.findFirst({
      where: {
        workflowSessionId,
        status: 'RUNNING'
      }
    });

    if (existingRunning) {
      const isActive = OrchestratorCoordinator.activeWorkflowSessions.has(workflowSessionId);
      if (isActive) {
        return c.json({
          success: true,
          message: 'Orchestration already running',
          orchestrationSessionId: existingRunning.id
        });
      } else {
        // Stale session, mark it as FAILED in the DB so we can start a new one
        console.warn(`[Orchestrator Route] Stale RUNNING session found for workflow ${workflowSessionId}. Marking as FAILED.`);
        await prisma.orchestrationSession.update({
          where: { id: existingRunning.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            metadata: { error: 'Session was interrupted or server restarted' }
          }
        });
      }
    }

    // Instantiate and run coordinator in the background
    const coordinator = new OrchestratorCoordinator(prisma);
    
    // We get the promise to start it, but don't await the full run
    // so we can return the newly created OrchestrationSession ID immediately
    let orchestrationSessionId: string | null = null;
    
    try {
      // We can run it in background
      coordinator.runOrchestration(workflowSessionId).catch((err) => {
        console.error(`[Orchestration Background Failure] Session ${workflowSessionId}:`, err);
      });

      // Fetch the newly created orchestration session (the runOrchestration creates it synchronously at start)
      // Wait a tiny bit for it to be created, or find the most recent running one
      let attempts = 0;
      while (attempts < 5) {
        const session = await prisma.orchestrationSession.findFirst({
          where: {
            workflowSessionId,
            status: 'RUNNING'
          },
          orderBy: { createdAt: 'desc' }
        });
        if (session) {
          orchestrationSessionId = session.id;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!orchestrationSessionId) {
        // Fallback: search for any recent session
        const session = await prisma.orchestrationSession.findFirst({
          where: { workflowSessionId },
          orderBy: { createdAt: 'desc' }
        });
        orchestrationSessionId = session?.id || null;
      }

      return c.json({
        success: true,
        message: 'Orchestration session started successfully',
        orchestrationSessionId
      });
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to start orchestration' }, 500);
    }
  })

  /**
   * Retrieves the current state of the orchestration session (associated with either workflowSessionId or orchestrationSessionId).
   */
  .get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      include: {
        agentExecutions: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    return c.json({ session });
  })

  /**
   * Returns a unified chronological event timeline combining shared context updates and message logs.
   */
  .get('/:sessionId/timeline', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const contextEvents = await prisma.sharedContextEvent.findMany({
      where: { orchestrationSessionId: session.id },
      orderBy: { timestamp: 'asc' }
    });

    const delegationEvents = await prisma.delegationEvent.findMany({
      where: { orchestrationSessionId: session.id },
      orderBy: { timestamp: 'asc' }
    });

    // Merge and sort chronologically
    const timeline = [
      ...contextEvents.map(e => ({
        id: e.id,
        source: 'shared_context',
        type: e.eventType,
        payload: e.payload,
        timestamp: e.timestamp
      })),
      ...delegationEvents.map(e => ({
        id: e.id,
        source: 'delegation',
        type: e.eventType,
        payload: e.payload,
        fromAgent: e.fromAgent,
        toAgent: e.toAgent,
        timestamp: e.timestamp
      }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ timeline });
  })

  /**
   * Retrieves executing/completed agents telemetry logs.
   */
  .get('/:sessionId/agents', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const agents = await prisma.agentExecution.findMany({
      where: { orchestrationSessionId: session.id },
      orderBy: { createdAt: 'asc' }
    });

    return c.json({ agents });
  })

  /**
   * Retrieves append-only shared context events logs.
   */
  .get('/:sessionId/context', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const contextEvents = await prisma.sharedContextEvent.findMany({
      where: { orchestrationSessionId: session.id },
      orderBy: { timestamp: 'asc' }
    });

    return c.json({ contextEvents });
  });
