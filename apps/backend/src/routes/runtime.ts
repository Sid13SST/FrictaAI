import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { startRuntime } from '@fricta/runtime';
import { logger } from '@fricta/shared';
import { getCurrentUser } from '../middleware/authContext';
import { verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

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
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, sessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);
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
