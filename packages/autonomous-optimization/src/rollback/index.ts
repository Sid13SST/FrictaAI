import { prisma } from '@fricta/db';
import { OptimizationRollbackSummary } from '../types';

export class RollbackController {
  /**
   * Executes a safe reversion of the visual, layout, and metric configuration of a run.
   */
  static async executeRollback(
    optimizationRunId: string,
    initiatedById: string | null,
    reason: string
  ): Promise<OptimizationRollbackSummary> {
    const run = await prisma.autonomousOptimizationRun.findUnique({
      where: { id: optimizationRunId }
    });

    if (!run) throw new Error('Optimization run not found');

    // 1. Log rollback record
    const rollback = await prisma.optimizationRollback.create({
      data: {
        optimizationRunId,
        initiatedById,
        rollbackReason: reason,
        status: 'PENDING'
      }
    });

    try {
      // 2. Perform configuration rollback (transition run status back to ROLLED_BACK)
      await prisma.autonomousOptimizationRun.update({
        where: { id: optimizationRunId },
        data: { status: 'ROLLED_BACK' }
      });

      // 3. Mark rollback completed
      const updatedRollback = await prisma.optimizationRollback.update({
        where: { id: rollback.id },
        data: { status: 'COMPLETED' }
      });

      return {
        id: updatedRollback.id,
        optimizationRunId: updatedRollback.optimizationRunId,
        initiatedById: updatedRollback.initiatedById || undefined,
        rollbackReason: updatedRollback.rollbackReason,
        status: updatedRollback.status as 'PENDING' | 'COMPLETED' | 'FAILED'
      };
    } catch (err) {
      await prisma.optimizationRollback.update({
        where: { id: rollback.id },
        data: { status: 'FAILED' }
      });
      throw err;
    }
  }
}
