import { PrismaClient } from '@fricta/db';
import { VisualIntelligenceCoordinator } from '@fricta/visual-intelligence';
import { UXIntelligenceCoordinator } from '@fricta/ux-intelligence';
import { buildUXReport } from '@fricta/ux-engine';
import { SharedContext } from '../memory';
import { MessageBroker } from '../communication';
import { TimelineRecorder } from '../timeline';
import { OrchestrationTask, AgentType } from '../types';
import { 
  NavigationAgent as NavigationSpecialist,
  OnboardingAgent as OnboardingSpecialist,
  DiscoverabilityAgent as DiscoverabilitySpecialist,
  CognitiveAgent as CognitiveSpecialist,
  VisualAgent as VisualSpecialist,
  WorkflowAgent as WorkflowSpecialist 
} from '@fricta/agents';

export abstract class BaseOrchestratedAgent {
  constructor(
    protected prisma: PrismaClient,
    protected sessionId: string,
    protected context: SharedContext,
    protected broker: MessageBroker,
    protected timeline: TimelineRecorder,
    public readonly agentType: AgentType
  ) {}

  abstract execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any>;

  protected async fetchSessionData(): Promise<any> {
    const session = await this.prisma.workflowSession.findUnique({
      where: { id: this.sessionId },
      include: {
        actions: true,
        interactions: true,
        thoughts: true,
        workflowScreenshots: true,
        metrics: true
      }
    });
    if (!session) {
      throw new Error(`WorkflowSession ${this.sessionId} not found`);
    }
    return {
      actions: session.actions,
      interactions: session.interactions,
      thoughts: session.thoughts,
      screenshots: session.workflowScreenshots,
      metrics: session.metrics || {}
    };
  }
}

export class VisualAuditorAgent extends BaseOrchestratedAgent {
  constructor(
    prisma: PrismaClient,
    sessionId: string,
    context: SharedContext,
    broker: MessageBroker,
    timeline: TimelineRecorder
  ) {
    super(prisma, sessionId, context, broker, timeline, 'VISUAL_AUDITOR');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Visual Auditor Agent started analyzing layout structure and CTA discoverability for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const coordinator = new VisualIntelligenceCoordinator(this.prisma);
    const result = await coordinator.analyzeSession(this.sessionId);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    // Sync findings to context
    await this.context.appendEvent('VISUAL_FINDINGS_SYNC', {
      findingsCount: result.findings.length,
      scores: result.scores
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Visual Auditor generated ${result.findings.length} visual observations and computed layout score of ${result.scores.overallScore}%.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('SYNC_COMPLETED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Visual findings successfully synchronized into append-only shared context.`
    });

    return {
      findingsCount: result.findings.length,
      scores: result.scores
    };
  }
}

export class CognitiveSimulatorAgent extends BaseOrchestratedAgent {
  constructor(
    prisma: PrismaClient,
    sessionId: string,
    context: SharedContext,
    broker: MessageBroker,
    timeline: TimelineRecorder
  ) {
    super(prisma, sessionId, context, broker, timeline, 'COGNITIVE_SIMULATOR');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Cognitive Simulator Agent running behavior/thought heuristics for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const coordinator = new UXIntelligenceCoordinator(this.prisma);
    const result = await coordinator.analyzeSession(this.sessionId);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    // Sync findings to context
    await this.context.appendEvent('COGNITIVE_FINDINGS_SYNC', {
      findingsCount: result.findings.length,
      signalsCount: result.cognitiveSignals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Cognitive Simulator generated ${result.findings.length} usability findings and ${result.cognitiveSignals.length} cognitive friction signals.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('SYNC_COMPLETED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Usability findings and persona cognitive signals synchronized into shared context.`
    });

    return {
      findingsCount: result.findings.length,
      signalsCount: result.cognitiveSignals.length
    };
  }
}

export class UXOrchestratorAgent extends BaseOrchestratedAgent {
  constructor(
    prisma: PrismaClient,
    sessionId: string,
    context: SharedContext,
    broker: MessageBroker,
    timeline: TimelineRecorder
  ) {
    super(prisma, sessionId, context, broker, timeline, 'UX_ORCHESTRATOR');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `UX Orchestrator synthesizing unified scorecard and executive summary for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');

    // Run report compilation
    const session = await this.prisma.workflowSession.findUnique({
      where: { id: this.sessionId },
      include: {
        actions: true,
        interactions: true,
        thoughts: true,
      }
    });

    if (!session) {
      throw new Error(`WorkflowSession ${this.sessionId} not found`);
    }

    const sessionData = {
      id: session.id,
      goal: session.goal,
      persona: session.persona,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      actions: session.actions.map(a => ({
        id: a.id,
        action: a.action,
        target: a.target,
        value: a.value,
        status: a.status,
        stepNumber: a.stepNumber,
        errorMessage: a.errorMessage,
        timestamp: a.timestamp,
      })),
      interactions: session.interactions.map(i => ({
        id: i.id,
        type: i.type,
        target: i.target,
        metadata: i.metadata ? i.metadata : undefined,
        timestamp: i.timestamp,
      })),
      thoughts: session.thoughts.map(t => ({
        id: t.id,
        thought: t.thought,
        stepNumber: t.stepNumber,
        timestamp: t.timestamp,
      }))
    };

    const reportData = buildUXReport(sessionData as any);

    if (signal?.aborted) throw new Error('Agent execution aborted');

    // Save reportData scores to DB
    await this.prisma.$transaction(async (tx) => {
      await tx.uXSignal.deleteMany({ where: { workflowSessionId: this.sessionId }});
      await tx.uXRecommendation.deleteMany({ where: { workflowSessionId: this.sessionId }});
      await tx.uXScore.deleteMany({ where: { workflowSessionId: this.sessionId }});

      if (reportData.signals.length > 0) {
        await tx.uXSignal.createMany({
          data: reportData.signals.map(s => ({
            workflowSessionId: this.sessionId,
            signalType: s.signalType,
            severity: s.severity,
            metadata: s.metadata ? (s.metadata as any) : undefined,
            timestamp: s.timestamp
          }))
        });
      }

      if (reportData.recommendations.length > 0) {
        await tx.uXRecommendation.createMany({
          data: reportData.recommendations.map(r => ({
            workflowSessionId: this.sessionId,
            title: r.title,
            description: r.description,
            evidence: r.evidence,
            severity: r.severity
          }))
        });
      }

      await tx.uXScore.create({
        data: {
          workflowSessionId: this.sessionId,
          clarityScore: reportData.scores.clarityScore,
          efficiencyScore: reportData.scores.efficiencyScore,
          smoothnessScore: reportData.scores.smoothnessScore,
          overallScore: reportData.scores.overallScore,
        }
      });

      const existingReport = await tx.uXReport.findFirst({ where: { sessionId: this.sessionId }});
      if (existingReport) {
        await tx.uXReport.update({
          where: { id: existingReport.id },
          data: { summary: reportData.summary, score: reportData.scores.overallScore }
        });
      } else {
        await tx.uXReport.create({
          data: {
            sessionId: this.sessionId,
            summary: reportData.summary,
            score: reportData.scores.overallScore
          }
        });
      }
    });

    await this.context.appendEvent('REPORT_SYNTHESIS_SYNC', {
      overallScore: reportData.scores.overallScore,
      summaryLength: reportData.summary.length
    });

    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `UX Orchestrator compiled final usability grade summary and saved score sheet (${reportData.scores.overallScore}/100) to DB.`
    });

    await this.timeline.logEvent('SYNC_COMPLETED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Final UX scores and summary text written to the database.`
    });

    return {
      overallScore: reportData.scores.overallScore
    };
  }
}

export class NavigationAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'NAVIGATION_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Navigation Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new NavigationSpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Navigation Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

export class OnboardingAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'ONBOARDING_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Onboarding Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new OnboardingSpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Onboarding Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

export class DiscoverabilityAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'DISCOVERABILITY_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Discoverability Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new DiscoverabilitySpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Discoverability Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

export class CognitiveAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'COGNITIVE_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Cognitive Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new CognitiveSpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Cognitive Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

export class VisualAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'VISUAL_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Visual Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new VisualSpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Visual Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

export class WorkflowAgentWrapper extends BaseOrchestratedAgent {
  constructor(prisma: PrismaClient, sessionId: string, context: SharedContext, broker: MessageBroker, timeline: TimelineRecorder) {
    super(prisma, sessionId, context, broker, timeline, 'WORKFLOW_AGENT');
  }

  async execute(task: OrchestrationTask, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('ANALYSIS_STARTED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Workflow Agent specialist started analysis for session ${this.sessionId}.`
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    const sessionData = await this.fetchSessionData();
    if (signal?.aborted) throw new Error('Agent execution aborted');
    const specialist = new WorkflowSpecialist();
    const result = await specialist.execute(sessionData);

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.context.appendEvent('SPECIALIZED_AGENT_SYNC', {
      agentType: this.agentType,
      findingsCount: result.findings.length,
      signalsCount: result.signals.length
    });

    if (signal?.aborted) throw new Error('Agent execution aborted');
    await this.timeline.logEvent('FINDING_GENERATED', {
      agentType: this.agentType,
      taskId: task.id,
      description: `Workflow Agent compiled ${result.findings.length} findings and ${result.signals.length} signals.`
    });

    return result;
  }
}

