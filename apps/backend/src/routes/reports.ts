import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { buildUXReport, SessionData, ActionData, InteractionData, ThoughtData } from '@fricta/ux-engine';

export const reportRoutes = new Hono()
  .get('/', async (c) => {
    // List reports
    const reports = await prisma.uXReport.findMany();
    return c.json({ reports });
  })
  .post('/:sessionId/generate', async (c) => {
    // Generate report from a session
    const sessionId = c.req.param('sessionId');
    const session = await prisma.workflowSession.findUnique({
      where: { id: sessionId },
      include: {
        actions: true,
        interactions: true,
        thoughts: true,
      }
    });

    if (!session) return c.json({ error: 'Session not found' }, 404);

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

    return c.json({ success: true, reportData });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    // For GET /reports/:id we usually pass the session ID or report ID
    // Let's assume it's sessionId for simplicity
    const report = await prisma.uXReport.findFirst({ where: { sessionId: id } });
    if (!report) return c.json({ error: 'Report not found' }, 404);

    const scores = await prisma.uXScore.findFirst({ where: { workflowSessionId: id } });
    const signals = await prisma.uXSignal.findMany({ where: { workflowSessionId: id } });
    const recommendations = await prisma.uXRecommendation.findMany({ where: { workflowSessionId: id } });
    const session = await prisma.workflowSession.findUnique({ where: { id } });

    return c.json({
      report,
      scores,
      signals,
      recommendations,
      session
    });
  })
  .get('/:id/signals', async (c) => {
    const id = c.req.param('id');
    const signals = await prisma.uXSignal.findMany({ where: { workflowSessionId: id } });
    return c.json({ signals });
  })
  .get('/:id/recommendations', async (c) => {
    const id = c.req.param('id');
    const recommendations = await prisma.uXRecommendation.findMany({ where: { workflowSessionId: id } });
    return c.json({ recommendations });
  })
  .get('/:id/scores', async (c) => {
    const id = c.req.param('id');
    const scores = await prisma.uXScore.findFirst({ where: { workflowSessionId: id } });
    return c.json({ scores });
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
    const screenshots = await prisma.screenshot.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' }
    });

    return c.json({ timeline: { actions, thoughts, screenshots } });
  });

