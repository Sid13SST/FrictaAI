import { prisma } from '@fricta/db';
import { AutonomousOptimizationRunSummary } from '../types';
import { OptimizationSimulator } from '../simulation';
import { OptimizationValidator } from '../validation';
import { GovernanceEnforcer } from '../governance';

export class AutonomousOptimizationEngine {
  /**
   * Proposes a new optimization run, executing simulations, safety validations, and logging audit events.
   */
  static async createProposalRun(
    projectId: string,
    workspaceId: string | null,
    workflowPath: string,
    remediationPlan = 'Optimize visual contrast on primary elements and progressive disclosures.',
    targetSelector = 'button.cta-primary',
    recommendationId?: string
  ): Promise<AutonomousOptimizationRunSummary> {
    
    // 1. Create the main run
    const run = await prisma.autonomousOptimizationRun.create({
      data: {
        projectId,
        workspaceId,
        workflowPath,
        remediationPlan,
        targetSelector,
        status: 'PENDING_APPROVAL',
        recommendationId: recommendationId || null,
        overallSafetyScore: 0.0
      }
    });

    // 2. Log Governance Event
    await GovernanceEnforcer.validateAndLogEvent(
      projectId,
      workspaceId,
      null,
      'TRIGGER_RUN',
      `Autonomous optimization proposed for path ${workflowPath}`
    );

    // 3. Generate Decision Traces
    await prisma.autonomousDecisionTrace.create({
      data: {
        optimizationRunId: run.id,
        stepIndex: 1,
        decisionNode: 'EVALUATING_ELEMENTS',
        outcomeDescription: `Targeted element selector: ${targetSelector}`
      }
    });

    await prisma.autonomousDecisionTrace.create({
      data: {
        optimizationRunId: run.id,
        stepIndex: 2,
        decisionNode: 'COMPILING_REMEDIATION',
        outcomeDescription: `Remediation proposed: ${remediationPlan}`
      }
    });

    // 4. Run Sandbox Simulation
    const simulations = await OptimizationSimulator.runSandboxSimulation(run.id, remediationPlan);

    // 5. Evaluate Safety Signals
    const safety = await OptimizationValidator.evaluateSafetySignals(run.id, remediationPlan);

    // 6. Update Run with computed safety score
    const updatedRun = await prisma.autonomousOptimizationRun.update({
      where: { id: run.id },
      data: { overallSafetyScore: safety.overallSafetyScore },
      include: {
        simulations: true,
        approvals: true,
        rollbacks: true,
        decisionTraces: true,
        safetySignals: true
      }
    });

    return {
      id: updatedRun.id,
      workflowPath: updatedRun.workflowPath,
      status: updatedRun.status as any,
      recommendationId: updatedRun.recommendationId || undefined,
      remediationPlan: updatedRun.remediationPlan,
      targetSelector: updatedRun.targetSelector || undefined,
      overallSafetyScore: updatedRun.overallSafetyScore,
      simulations: updatedRun.simulations.map(s => ({
        id: s.id,
        optimizationRunId: s.optimizationRunId,
        personaType: s.personaType,
        simulatedSurvivalGain: s.simulatedSurvivalGain,
        simulatedClarityGain: s.simulatedClarityGain,
        cognitiveLoadBefore: s.cognitiveLoadBefore,
        cognitiveLoadAfter: s.cognitiveLoadAfter,
        verdict: s.verdict as any,
        simulatedLogs: s.simulatedLogs
      })),
      approvals: updatedRun.approvals.map(a => ({
        id: a.id,
        optimizationRunId: a.optimizationRunId,
        reviewedById: a.reviewedById || undefined,
        roleScope: a.roleScope,
        action: a.action as any,
        comments: a.comments || undefined
      })),
      rollbacks: updatedRun.rollbacks.map(r => ({
        id: r.id,
        optimizationRunId: r.optimizationRunId,
        initiatedById: r.initiatedById || undefined,
        rollbackReason: r.rollbackReason,
        status: r.status as any
      })),
      decisionTraces: updatedRun.decisionTraces.map(t => ({
        id: t.id,
        optimizationRunId: t.optimizationRunId,
        stepIndex: t.stepIndex,
        decisionNode: t.decisionNode,
        outcomeDescription: t.outcomeDescription,
        evidenceRefId: t.evidenceRefId || undefined
      })),
      safetySignals: updatedRun.safetySignals.map(s => ({
        id: s.id,
        optimizationRunId: s.optimizationRunId,
        metricName: s.metricName,
        metricValue: s.metricValue,
        thresholdLimit: s.thresholdLimit,
        policyPassed: s.policyPassed
      }))
    };
  }

  /**
   * Transition run status on human review action.
   */
  static async submitReviewStatus(
    optimizationRunId: string,
    reviewedById: string | null,
    roleScope: string,
    action: 'APPROVED' | 'REJECTED' | 'REQUESTED_CHANGES',
    comments?: string
  ): Promise<AutonomousOptimizationRunSummary> {
    const run = await prisma.autonomousOptimizationRun.findUnique({
      where: { id: optimizationRunId }
    });

    if (!run) throw new Error('Optimization run not found');

    // 1. Create Approval Record
    await prisma.optimizationApproval.create({
      data: {
        optimizationRunId,
        reviewedById,
        roleScope,
        action,
        comments
      }
    });

    // 2. Perform state transition based on action
    const newStatus = action === 'APPROVED' ? 'APPLIED' : action === 'REJECTED' ? 'FAILED' : 'PENDING_APPROVAL';

    const updated = await prisma.autonomousOptimizationRun.update({
      where: { id: optimizationRunId },
      data: { status: newStatus },
      include: {
        simulations: true,
        approvals: true,
        rollbacks: true,
        decisionTraces: true,
        safetySignals: true
      }
    });

    // 3. Log Governance Event
    await GovernanceEnforcer.validateAndLogEvent(
      updated.projectId,
      updated.workspaceId,
      reviewedById,
      action === 'APPROVED' ? 'CREATE_RULE' : 'REVOKE_APPROVAL',
      `Human review action ${action} submitted for run ${optimizationRunId}`
    );

    return {
      id: updated.id,
      workflowPath: updated.workflowPath,
      status: updated.status as any,
      recommendationId: updated.recommendationId || undefined,
      remediationPlan: updated.remediationPlan,
      targetSelector: updated.targetSelector || undefined,
      overallSafetyScore: updated.overallSafetyScore,
      simulations: updated.simulations.map(s => ({
        id: s.id,
        optimizationRunId: s.optimizationRunId,
        personaType: s.personaType,
        simulatedSurvivalGain: s.simulatedSurvivalGain,
        simulatedClarityGain: s.simulatedClarityGain,
        cognitiveLoadBefore: s.cognitiveLoadBefore,
        cognitiveLoadAfter: s.cognitiveLoadAfter,
        verdict: s.verdict as any,
        simulatedLogs: s.simulatedLogs
      })),
      approvals: updated.approvals.map(a => ({
        id: a.id,
        optimizationRunId: a.optimizationRunId,
        reviewedById: a.reviewedById || undefined,
        roleScope: a.roleScope,
        action: a.action as any,
        comments: a.comments || undefined
      })),
      rollbacks: updated.rollbacks.map(r => ({
        id: r.id,
        optimizationRunId: r.optimizationRunId,
        initiatedById: r.initiatedById || undefined,
        rollbackReason: r.rollbackReason,
        status: r.status as any
      })),
      decisionTraces: updated.decisionTraces.map(t => ({
        id: t.id,
        optimizationRunId: t.optimizationRunId,
        stepIndex: t.stepIndex,
        decisionNode: t.decisionNode,
        outcomeDescription: t.outcomeDescription,
        evidenceRefId: t.evidenceRefId || undefined
      })),
      safetySignals: updated.safetySignals.map(s => ({
        id: s.id,
        optimizationRunId: s.optimizationRunId,
        metricName: s.metricName,
        metricValue: s.metricValue,
        thresholdLimit: s.thresholdLimit,
        policyPassed: s.policyPassed
      }))
    };
  }
}
