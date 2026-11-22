import { PrismaClient } from '@fricta/db';
import { SessionActivityData, UXReportPayload, ActionData, ThoughtData, InteractionData, ScreenshotMetadata } from './types';
import { BehavioralAnalyzer } from './behavior';
import { CognitiveEngine } from './cognitive';
import { PersonaEngine, SEED_PERSONAS } from './reasoning';
import { ReportCompiler } from './reports';

export class UXIntelligenceCoordinator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Runs the complete UX Heuristics and Cognitive Friction analysis pipeline for a session.
   */
  async analyzeSession(sessionId: string): Promise<UXReportPayload> {
    console.log(`[UXIntelligenceCoordinator] Running UX Analysis for Session: ${sessionId}`);

    // 1. Fetch Session Data with all related telemetry
    const session = await this.prisma.workflowSession.findUnique({
      where: { id: sessionId },
      include: {
        actions: true,
        thoughts: true,
        interactions: true,
        workflowScreenshots: true
      }
    });

    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found.`);
    }

    // 2. Map telemetry to strict internal typings
    const actions: ActionData[] = session.actions.map(a => ({
      id: a.id,
      action: a.action,
      target: a.target,
      value: a.value,
      status: a.status,
      stepNumber: a.stepNumber,
      errorMessage: a.errorMessage,
      timestamp: a.timestamp
    }));

    const thoughts: ThoughtData[] = session.thoughts.map(t => ({
      id: t.id,
      thought: t.thought,
      stepNumber: t.stepNumber,
      timestamp: t.timestamp
    }));

    const interactions: InteractionData[] = session.interactions.map(i => ({
      id: i.id,
      sessionId: i.sessionId,
      type: i.type,
      target: i.target,
      metadata: i.metadata,
      timestamp: i.timestamp
    }));

    const screenshots = session.workflowScreenshots.map(s => {
      let meta: any = {};
      try {
        if (s.metadata) {
          meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
        }
      } catch (err) {
        console.warn(`Failed to parse metadata for screenshot ${s.id}`, err);
      }

      return {
        id: s.id,
        stepIndex: s.stepIndex,
        pageUrl: s.pageUrl,
        metadata: meta
      };
    });

    const activityData: SessionActivityData = {
      id: session.id,
      goal: session.goal,
      persona: session.persona,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      actions,
      thoughts,
      interactions,
      screenshots
    };

    // 3. Seed persona profiles in the database if they do not exist
    await this.ensurePersonasSeeded();

    // 4. Run Analysis Layers — only when there is behavioural evidence.
    // With zero recorded actions the engines still emitted default
    // "measurements" (e.g. cognitive overload 10%, decision fatigue 27%),
    // which read as real diagnostics on a failed audit. No actions → no
    // behavioural signals or findings (stale ones are cleared below).
    const hasEvidence = actions.length > 0;
    const behavioralSignals = hasEvidence ? BehavioralAnalyzer.analyze(activityData) : [];
    const cognitiveSignals = hasEvidence ? CognitiveEngine.calculate(activityData, behavioralSignals) : [];
    const personaFindings = hasEvidence ? PersonaEngine.run(activityData, behavioralSignals) : [];

    // If there are no findings, add a default informative finding if steps were high
    if (personaFindings.length === 0 && actions.length > 5) {
      personaFindings.push({
        workflowSessionId: sessionId,
        findingType: 'COMPLEXITY',
        severity: 'LOW',
        personaType: 'STANDARD',
        title: 'Nominal Workflow Complexity',
        description: 'The workflow progressed linearly with minimal cognitive friction detected.',
        evidence: `Completed in ${actions.length} steps without navigation loops.`,
        recommendation: 'Maintain the current simplified flow layout.'
      });
    }

    // 5. Compile Final Scored Report
    const compiledReport = ReportCompiler.compile(
      sessionId,
      personaFindings,
      cognitiveSignals,
      SEED_PERSONAS
    );

    // 6. Persist results in the database: replace this session's findings and
    // signals atomically. The report tab triggers analysis on mount, so two
    // runs can overlap (React StrictMode double-mounts in dev, two open tabs);
    // with separate delete/create calls both runs inserted and every signal
    // appeared twice. A per-session advisory lock serialises the replace.
    await this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${sessionId}))`;
      await tx.uXFinding.deleteMany({
        where: { workflowSessionId: sessionId }
      });
      await tx.cognitiveSignal.deleteMany({
        where: { workflowSessionId: sessionId }
      });

      // Create many records
      if (compiledReport.findings.length > 0) {
        await tx.uXFinding.createMany({
          data: compiledReport.findings.map(f => ({
            workflowSessionId: f.workflowSessionId,
            findingType: f.findingType,
            severity: f.severity,
            personaType: f.personaType,
            title: f.title,
            description: f.description,
            evidence: f.evidence,
            recommendation: f.recommendation,
            timestamp: f.timestamp || new Date()
          }))
        });
      }

      if (compiledReport.cognitiveSignals.length > 0) {
        await tx.cognitiveSignal.createMany({
          data: compiledReport.cognitiveSignals.map(s => ({
            workflowSessionId: s.workflowSessionId,
            signalType: s.signalType,
            intensity: s.intensity,
            metadata: s.metadata,
            timestamp: s.timestamp || new Date()
          }))
        });
      }
    });

    // Update the WorkflowSession status/stepCount if needed (optional)
    await this.prisma.workflowSession.update({
      where: { id: sessionId },
      data: {
        stepCount: actions.length
      }
    });

    console.log(`[UXIntelligenceCoordinator] Saved ${compiledReport.findings.length} findings and ${compiledReport.cognitiveSignals.length} cognitive signals for session: ${sessionId}`);

    // createMany() does not return the generated rows, so re-fetch the persisted
    // records (with their real DB ids + default status/confidence) before handing
    // them back to the frontend — the resolve/status workflow PATCHes by id, and
    // the pre-insertion objects above never had one.
    const [persistedFindings, persistedSignals] = await Promise.all([
      this.prisma.uXFinding.findMany({ where: { workflowSessionId: sessionId }, orderBy: { timestamp: 'asc' } }),
      this.prisma.cognitiveSignal.findMany({ where: { workflowSessionId: sessionId }, orderBy: { timestamp: 'asc' } })
    ]);

    return {
      ...compiledReport,
      findings: persistedFindings as any,
      cognitiveSignals: persistedSignals as any,
      evidence: hasEvidence ? 'sufficient' : 'insufficient',
    };
  }

  /**
   * Helper to ensure seed personas are present in the DB
   */
  private async ensurePersonasSeeded(): Promise<void> {
    try {
      const count = await this.prisma.personaProfile.count();
      if (count === 0) {
        console.log('[UXIntelligenceCoordinator] Seeding default UX personas...');
        await this.prisma.personaProfile.createMany({
          data: SEED_PERSONAS.map(p => ({
            name: p.name,
            description: p.description,
            traits: p.traits,
            behaviorModifiers: p.behaviorModifiers
          }))
        });
      }
    } catch (err: any) {
      console.warn('Failed to seed default personas:', err.message);
    }
  }
}
