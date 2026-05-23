import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { startRuntime } from '@fricta/runtime';
import { logger } from '@fricta/shared';

export const runtimeRoutes = new Hono()
  /**
   * Retrieves the system-wide runtime infrastructure telemetry snapshot.
   */
  .get('/telemetry', async (c) => {
    try {
      const runtime = await startRuntime(prisma);
      const snapshot = await runtime.telemetryService.getSnapshot();
      return c.json({ success: true, telemetry: snapshot });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch runtime telemetry');
      return c.json({ success: false, error: err.message }, 500);
    }
  })

  /**
   * Retrieves session-specific runtime recovery event counts.
   */
  .get('/telemetry/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const runtime = await startRuntime(prisma);
      const recoveryCount = await runtime.telemetryService.getRecoveryCount(sessionId);
      const checkpoint = await runtime.recoverySupervisor.getSessionCheckpoint(sessionId);

      return c.json({
        success: true,
        sessionId,
        recoveryCount,
        checkpoint,
      });
    } catch (err: any) {
      logger.error({ err: err.message, sessionId }, 'Failed to fetch session runtime metrics');
      return c.json({ success: false, error: err.message }, 500);
    }
  });
