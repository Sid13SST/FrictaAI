import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { buildUXReport, SessionData, ActionData, InteractionData, ThoughtData } from '@fricta/ux-engine';
import { ExecutiveSummaryEngine, TimelineCompiler, ExportEngine, UnifiedUXReportPayload, WorkflowSessionDetails } from '@fricta/report-engine';

async function generateReportForSession(sessionId: string) {
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
    include: {
      actions: true,
      interactions: true,
      thoughts: true,
    }
  });

  if (!session) return null;

  // Map Prisma models to UX engine models
  const sessionData: SessionData = {
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
    }) as ActionData),
    interactions: session.interactions.map(i => ({
      id: i.id,
      type: i.type,
      target: i.target,
      metadata: i.metadata,
      timestamp: i.timestamp,
    }) as InteractionData),
    thoughts: session.thoughts.map(t => ({
      id: t.id,
      thought: t.thought,
      stepNumber: t.stepNumber,
      timestamp: t.timestamp,
    }) as ThoughtData)
  };

  const reportData = buildUXReport(sessionData);

  // Save to DB
  await prisma.$transaction(async (tx) => {
    // Clear existing records
    await tx.uXSignal.deleteMany({ where: { workflowSessionId: sessionId }});
    await tx.uXRecommendation.deleteMany({ where: { workflowSessionId: sessionId }});
    await tx.uXScore.deleteMany({ where: { workflowSessionId: sessionId }});

    if (reportData.signals.length > 0) {
      await tx.uXSignal.createMany({
        data: reportData.signals.map(s => ({
          workflowSessionId: sessionId,
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
          workflowSessionId: sessionId,
          title: r.title,
          description: r.description,
          evidence: r.evidence,
          severity: r.severity
        }))
      });
    }

    await tx.uXScore.create({
      data: {
        workflowSessionId: sessionId,
        clarityScore: reportData.scores.clarityScore,
        efficiencyScore: reportData.scores.efficiencyScore,
        smoothnessScore: reportData.scores.smoothnessScore,
        overallScore: reportData.scores.overallScore,
      }
    });

    // Update or create report summary
    const existingReport = await tx.uXReport.findFirst({ where: { sessionId }});
    if (existingReport) {
      await tx.uXReport.update({
        where: { id: existingReport.id },
        data: { summary: reportData.summary, score: reportData.scores.overallScore }
      });
    } else {
      await tx.uXReport.create({
        data: {
          sessionId,
          summary: reportData.summary,
          score: reportData.scores.overallScore
        }
      });
    }
  });

  return reportData;
}

async function compileUnifiedReport(sessionId: string): Promise<UnifiedUXReportPayload | null> {
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
    include: {
      scores: true,
      visualScores: true,
      uxFindings: true,
      cognitiveSignals: true,
      visualFindings: true,
    }
  });

  if (!session) return null;

  // Extract or calculate scores
  const uxScore = session.scores[0];
  const visualScore = session.visualScores[0];

  const clarityScore = Math.round(
    uxScore?.clarityScore ?? visualScore?.clarityScore ?? 80
  );
  const onboardingScore = Math.round(
    uxScore?.smoothnessScore ?? 80
  );
  const iaScore = Math.round(
    visualScore?.navigationScore ?? visualScore?.layoutBalanceScore ?? 80
  );
  const efficiencyScore = Math.round(
    uxScore?.efficiencyScore ?? 80
  );
  const overallScore = Math.round(
    uxScore?.overallScore ?? visualScore?.overallScore ?? 80
  );

  // Fetch persona profiles (custom or default)
  const dbPersonaProfiles = await prisma.personaProfile.findMany();
  const personaProfiles = dbPersonaProfiles.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    traits: p.traits as any,
    behaviorModifiers: p.behaviorModifiers as any
  }));

  const finalPersonaProfiles = personaProfiles.length > 0 ? personaProfiles : [
    {
      name: "Beginner User",
      description: "Requires high discoverability, helper tooltips, and linear navigation paths. Low patience for UI confusion.",
      traits: {
        guidanceDependency: 'high' as const,
        patience: 'low' as const,
        comfortWithIA: 'low' as const
      },
      behaviorModifiers: {
        idleHesitationThresholdMs: 8000,
        maxActionCyclesAllowed: 2,
        excessiveStepsThreshold: 8
      }
    },
    {
      name: "Power User",
      description: "Navigates rapidly, comfortable with advanced shortcuts and high layout density. High patience for complex tasks.",
      traits: {
        guidanceDependency: 'low' as const,
        patience: 'high' as const,
        comfortWithIA: 'high' as const
      },
      behaviorModifiers: {
        idleHesitationThresholdMs: 25000,
        maxActionCyclesAllowed: 5,
        excessiveStepsThreshold: 20
      }
    },
    {
      name: "First-Time User",
      description: "Exploring the system for the first time. Needs clean onboarding, progressive disclosure, and clear call-to-actions.",
      traits: {
        guidanceDependency: 'medium' as const,
        patience: 'medium' as const,
        comfortWithIA: 'medium' as const
      },
      behaviorModifiers: {
        idleHesitationThresholdMs: 15000,
        maxActionCyclesAllowed: 3,
        excessiveStepsThreshold: 12
      }
    }
  ];

  // Map db data to report engine shapes
  const sessionDetails: WorkflowSessionDetails = {
    id: session.id,
    goal: session.goal,
    persona: session.persona,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    stepCount: session.stepCount,
  };

  return {
    session: sessionDetails,
    scores: {
      clarityScore,
      onboardingScore,
      iaScore,
      efficiencyScore,
      overallScore
    },
    uxFindings: session.uxFindings.map(f => ({
      id: f.id,
      workflowSessionId: f.workflowSessionId,
      findingType: f.findingType,
      severity: f.severity as any,
      personaType: f.personaType,
      title: f.title,
      description: f.description,
      evidence: f.evidence,
      recommendation: f.recommendation,
      timestamp: f.timestamp
    })),
    cognitiveSignals: session.cognitiveSignals.map(s => ({
      id: s.id,
      workflowSessionId: s.workflowSessionId,
      signalType: s.signalType,
      intensity: s.intensity,
      metadata: s.metadata,
      timestamp: s.timestamp
    })),
    visualFindings: session.visualFindings.map(vf => ({
      id: vf.id,
      workflowSessionId: vf.workflowSessionId,
      screenshotId: vf.screenshotId,
      findingType: vf.findingType,
      severity: vf.severity,
      title: vf.title,
      description: vf.description,
      boundingBoxes: vf.boundingBoxes as any,
      metadata: vf.metadata,
      timestamp: vf.timestamp
    })),
    personaProfiles: finalPersonaProfiles
  };
}

export const reportRoutes = new Hono()
  .get('/', async (c) => {
    const reports = await prisma.uXReport.findMany();
    return c.json({ reports });
  })
  .post('/:sessionId/generate', async (c) => {
    const sessionId = c.req.param('sessionId');
    const reportData = await generateReportForSession(sessionId);
    if (!reportData) return c.json({ error: 'Session not found' }, 404);
    return c.json({ success: true, reportData });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    
    // Auto-generate legacy report if it doesn't exist
    const legacyReport = await prisma.uXReport.findFirst({ where: { sessionId: id } });
    if (!legacyReport) {
      await generateReportForSession(id);
    }

    const payload = await compileUnifiedReport(id);
    if (!payload) return c.json({ error: 'Report not found' }, 404);

    return c.json(payload);
  })
  .get('/:id/executive', async (c) => {
    const id = c.req.param('id');
    const payload = await compileUnifiedReport(id);
    if (!payload) return c.json({ error: 'Report not found' }, 404);

    const executiveSummary = ExecutiveSummaryEngine.synthesize(payload);
    return c.json(executiveSummary);
  })
  .get('/:id/export', async (c) => {
    const id = c.req.param('id');
    const payload = await compileUnifiedReport(id);
    if (!payload) return c.json({ error: 'Report not found' }, 404);

    const executiveSummary = ExecutiveSummaryEngine.synthesize(payload);
    return c.json({
      markdown: ExportEngine.toMarkdown(payload, executiveSummary),
      textSheet: ExportEngine.toTextSheet(payload, executiveSummary),
      developerJson: ExportEngine.toDeveloperJson(payload, executiveSummary)
    });
  })
  .get('/:id/personas', async (c) => {
    const id = c.req.param('id');
    const payload = await compileUnifiedReport(id);
    if (!payload) return c.json({ error: 'Report not found' }, 404);

    return c.json({
      personaProfiles: payload.personaProfiles,
      uxFindings: payload.uxFindings
    });
  })
  .get('/:id/timeline', async (c) => {
    const id = c.req.param('id');
    const actions = await prisma.agentAction.findMany({
      where: { workflowSessionId: id },
      orderBy: { timestamp: 'asc' }
    });
    const thoughts = await prisma.agentThought.findMany({
      where: { workflowSessionId: id },
      orderBy: { timestamp: 'asc' }
    });
    const uxFindings = await prisma.uXFinding.findMany({
      where: { workflowSessionId: id },
      orderBy: { timestamp: 'asc' }
    });
    const cognitiveSignals = await prisma.cognitiveSignal.findMany({
      where: { workflowSessionId: id },
      orderBy: { timestamp: 'asc' }
    });
    const visualFindings = await prisma.visualFinding.findMany({
      where: { workflowSessionId: id },
      orderBy: { timestamp: 'asc' }
    });
    const screenshots = await prisma.workflowScreenshot.findMany({
      where: { workflowSessionId: id },
      orderBy: { stepIndex: 'asc' }
    });

    const compiledTimeline = TimelineCompiler.compile(
      actions,
      thoughts,
      uxFindings,
      cognitiveSignals,
      visualFindings
    );

    return c.json({
      timeline: compiledTimeline,
      screenshots: screenshots.map(s => ({
        id: s.id,
        stepIndex: s.stepIndex,
        filePath: s.filePath,
        thumbnailPath: s.thumbnailPath,
        pageUrl: s.pageUrl,
        viewportWidth: s.viewportWidth,
        viewportHeight: s.viewportHeight,
        actionContext: s.actionContext,
        metadata: s.metadata
      }))
    });
  });
