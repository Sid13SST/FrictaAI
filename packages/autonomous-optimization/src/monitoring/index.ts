import { prisma } from '@fricta/db';

export class SafetyMonitor {
  /**
   * Scans existing runs and triggers safety violation flags if threshold metrics exceed boundaries.
   */
  static async monitorActiveRuns(projectId: string): Promise<boolean> {
    const activeRuns = await prisma.autonomousOptimizationRun.findMany({
      where: { projectId, status: 'APPLIED' },
      include: { safetySignals: true }
    });

    let violationsFound = false;
    for (const run of activeRuns) {
      const violated = run.safetySignals.some(s => !s.policyPassed);
      if (violated) {
        violationsFound = true;
        // Trigger run status warning transition
        await prisma.autonomousOptimizationRun.update({
          where: { id: run.id },
          data: { status: 'FAILED' }
        });
      }
    }

    return violationsFound;
  }
}
