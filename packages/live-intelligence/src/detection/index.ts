import { prisma } from '@fricta/db';
import { AnomalyRuleEngine } from '../anomalies';
import { AbandonmentDetector } from '../abandonment';
import { FrictionAnalyzer } from '../friction';
import { SurvivabilityMonitor } from '../survivability';
import { CorrelationAnalyzer } from '../correlations';
import { AlertManager } from '../alerts';

export class LiveAnomalyDetector {
  /**
   * Main entrypoint for processing active session telemetry.
   * Runs anomaly detection rules, correlates factors, creates evidence traces,
   * updates survivability indexes, and triggers critical alerts.
   */
  public static async analyzeSessionEvents(liveSessionId: string): Promise<void> {
    try {
      // 1. Fetch current session project context
      const session = await prisma.liveSession.findUnique({
        where: { id: liveSessionId },
        select: { projectId: true, browser: true, os: true },
      });

      if (!session) return;
      const { projectId } = session;

      const appVersion = 'v1.0.0';

      // 2. Execute Survivability Metrics calculations
      await SurvivabilityMonitor.calculateMetrics(projectId);

      // 3. Execute deterministic anomaly checks
      const checks = await Promise.all([
        AnomalyRuleEngine.checkRageClickSpikes(projectId, appVersion),
        AnomalyRuleEngine.checkNavigationLoops(projectId, appVersion),
        AnomalyRuleEngine.checkCTAFailures(projectId, appVersion),
        AbandonmentDetector.checkFormAbandonment(projectId, appVersion),
        AbandonmentDetector.checkSessionDropOffs(projectId, appVersion),
        FrictionAnalyzer.checkFrictionEscalation(projectId, appVersion),
      ]);

      for (const candidate of checks) {
        if (!candidate) continue;

        // Ensure we don't spam identical active unresolved anomalies
        const existing = await prisma.uXAnomaly.findFirst({
          where: {
            projectId,
            anomalyType: candidate.type,
            isResolved: false,
          },
        });

        if (existing) {
          // Add any new session evidence links
          for (const sId of candidate.contributingSessions) {
            const hasEv = await prisma.anomalyEvidence.findFirst({
              where: { anomalyId: existing.id, liveSessionId: sId },
            });
            if (!hasEv) {
              await prisma.anomalyEvidence.create({
                data: {
                  anomalyId: existing.id,
                  liveSessionId: sId,
                  evidenceType: 'SESSION_CONTRIBUTION',
                  details: candidate.details || {},
                },
              });
            }
          }
          continue;
        }

        // 4. Create new Anomaly record
        const anomaly = await prisma.uXAnomaly.create({
          data: {
            projectId,
            anomalyType: candidate.type,
            severity: candidate.severity,
            description: candidate.description,
            isResolved: false,
          },
        });

        // 5. Add Evidence Links
        for (const sId of candidate.contributingSessions) {
          await prisma.anomalyEvidence.create({
            data: {
              anomalyId: anomaly.id,
              liveSessionId: sId,
              evidenceType: 'SESSION_CONTRIBUTION',
              details: candidate.details || {},
            },
          });
        }

        // 6. Compute causal correlations
        const correlations = await CorrelationAnalyzer.analyzeCorrelation(projectId, candidate.contributingSessions);
        for (const corr of correlations) {
          await prisma.correlatedBehavior.create({
            data: {
              anomalyId: anomaly.id,
              correlationType: corr.correlationType,
              correlationKey: corr.correlationKey,
              coefficient: corr.coefficient,
              evidenceDetails: corr.evidenceDetails,
            },
          });
        }

        // 7. Trigger Alert for High / Critical severity candidate
        if (candidate.severity === 'HIGH' || candidate.severity === 'CRITICAL') {
          let alertType = 'FRICTION_ESCALATION';
          if (candidate.type === 'SURVIVABILITY_COLLAPSE') alertType = 'CRITICAL_SURVIVABILITY_FAILURE';
          if (candidate.type === 'FORM_ABANDONMENT_SURGE') alertType = 'ABANDONMENT_ESCALATION';
          if (candidate.type === 'NAV_LOOP_ESCALATION') alertType = 'NAVIGATION_BREAKDOWN';
          if (candidate.type === 'COGNITIVE_FRICTION_ESCALATION') alertType = 'COGNITIVE_RISK_INCREASE';
          if (candidate.type === 'WORKFLOW_DEGRADATION') alertType = 'WORKFLOW_COLLAPSE';

          await AlertManager.createAlert(
            projectId,
            alertType,
            `UX Incident: ${candidate.type}`,
            candidate.description,
            candidate.severity
          );
        }
      }
    } catch (err) {
      console.error('[LiveAnomalyDetector] Detection failed:', err);
    }
  }
}
