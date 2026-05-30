import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { buildUXReport, SessionData, ActionData, InteractionData, ThoughtData } from '@fricta/ux-engine';
import { ExecutiveSummaryEngine, TimelineCompiler, ExportEngine, UnifiedUXReportPayload, WorkflowSessionDetails } from '@fricta/report-engine';
import {
  ExecutiveReportingCompiler,
  SummarySynthesisEngine,
  ReportTemplateBuilder,
  EvidenceLinkManager,
  PresentationDeckBuilder,
  PDFLayoutEngine,
  ExportProcessingService,
  SharedReportManager,
  ReportDistributionDispatcher,
  WorkspaceAnalyticsEngine
} from '@fricta/enterprise-reporting';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

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

// User Resolver Helper
async function resolveUser(c: any): Promise<any> {
  const userId = c.req.query('userId') || c.req.header('X-User-Id');
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  const email = c.req.query('email') || c.req.header('X-User-Email');
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }
  return prisma.user.findFirst();
}

const guard = new RBACAuthorizationGuard(prisma);
const compiler = new ExecutiveReportingCompiler(prisma as any);
const summaryEngine = new SummarySynthesisEngine(prisma as any);
const evidenceManager = new EvidenceLinkManager(prisma as any);
const exportService = new ExportProcessingService(prisma as any);
const shareManager = new SharedReportManager(prisma as any);
const distributionDispatcher = new ReportDistributionDispatcher(prisma as any);
const analyticsEngine = new WorkspaceAnalyticsEngine(prisma as any);

/**
 * GET /api/reports/executive/list
 * Returns compiled reports for workspace/project
 */
reportRoutes.get('/executive/list', async (c) => {
  const workspaceId = c.req.query('workspaceId') || null;
  const projectId = c.req.query('projectId');
  
  const user = await resolveUser(c);
  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
  }

  const reports = await prisma.executiveReport.findMany({
    where: {
      projectId: projectId ? projectId : undefined,
      workspaceId: workspaceId
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ reports });
});

/**
 * POST /api/reports/executive
 * Compiles a new report
 */
reportRoutes.post('/executive', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, projectId, title } = await c.req.json().catch(() => ({}));

  if (!projectId || !title) {
    return c.json({ error: 'projectId and title are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  try {
    const report = await compiler.compileReport(projectId, title, user?.id || '', workspaceId || null);
    return c.json({ report });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * GET /api/reports/executive/:id/deck
 * Returns slides format representation
 */
reportRoutes.get('/executive/:id/deck', async (c) => {
  const id = c.req.param('id');
  const report = await prisma.executiveReport.findUnique({
    where: { id }
  });

  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
  }

  const deck = PresentationDeckBuilder.generatePresentation(report);
  return c.json({ deck });
});

/**
 * GET /api/reports/executive/:id/pdf-layout
 * Returns PDF layout representation
 */
reportRoutes.get('/executive/:id/pdf-layout', async (c) => {
  const id = c.req.param('id');
  const report = await prisma.executiveReport.findUnique({
    where: { id }
  });

  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
  }

  const pdfLayout = PDFLayoutEngine.compilePDFLayout(report);
  return c.json({ pdfLayout });
});

/**
 * GET /api/reports/exports
 * Returns exports history
 */
reportRoutes.get('/exports', async (c) => {
  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'EXPORT', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
  }

  const exports = await prisma.reportExport.findMany({
    where: { reportId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ exports });
});

/**
 * POST /api/reports/exports
 * Triggers document export (PDF/Presentation)
 */
reportRoutes.post('/exports', async (c) => {
  const user = await resolveUser(c);
  const { reportId, format } = await c.req.json().catch(() => ({}));

  if (!reportId || !format) {
    return c.json({ error: 'reportId and format are required' }, 400);
  }

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'EXPORT', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  try {
    const exportRecord = await exportService.triggerExport(reportId, format, user?.id || '');
    return c.json({ export: exportRecord });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * GET /api/reports/templates
 * Returns templates list
 */
reportRoutes.get('/templates', async (c) => {
  const workspaceId = c.req.query('workspaceId') || null;

  const templates = await prisma.reportTemplate.findMany({
    where: { workspaceId }
  });

  return c.json({ templates });
});

/**
 * POST /api/reports/templates
 * Creates custom report template
 */
reportRoutes.post('/templates', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, name, description, layoutType, structure } = await c.req.json().catch(() => ({}));

  if (!name || !layoutType) {
    return c.json({ error: 'name and layoutType are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'MANAGE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const template = await prisma.reportTemplate.create({
    data: {
      workspaceId: workspaceId || null,
      name,
      description,
      layoutType,
      structure: structure || {}
    }
  });

  return c.json({ template });
});

/**
 * GET /api/reports/sharing
 * Returns shared report tokens
 */
reportRoutes.get('/sharing', async (c) => {
  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const shares = await prisma.sharedReport.findMany({
    where: { reportId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ shares });
});

/**
 * POST /api/reports/sharing
 * Creates share link
 */
reportRoutes.post('/sharing', async (c) => {
  const user = await resolveUser(c);
  const { reportId, expiresHours, maxUses, email } = await c.req.json().catch(() => ({}));

  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const share = await shareManager.generateShare(reportId, user?.id || '', { expiresHours, maxUses, email });
  return c.json({ share });
});

/**
 * POST /api/reports/sharing/revoke
 * Revokes share token
 */
reportRoutes.post('/sharing/revoke', async (c) => {
  const user = await resolveUser(c);
  const { shareId } = await c.req.json().catch(() => ({}));

  if (!shareId) return c.json({ error: 'shareId is required' }, 400);

  const share = await prisma.sharedReport.findUnique({
    where: { id: shareId },
    include: { report: true }
  });

  if (!share) return c.json({ error: 'Shared link not found' }, 404);

  if (share.report.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, share.report.workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  await shareManager.revokeShare(shareId);
  return c.json({ success: true });
});

/**
 * GET /api/reports/sharing/resolve/:token
 * Resolves shared report public view
 */
reportRoutes.get('/sharing/resolve/:token', async (c) => {
  const token = c.req.param('token');
  const share = await shareManager.verifyShare(token);
  if (!share) return c.json({ error: 'Invalid or expired share token' }, 403);

  const report = await prisma.executiveReport.findUnique({
    where: { id: share.reportId }
  });

  return c.json({ share, report });
});

/**
 * GET /api/reports/evidence
 * Returns linked evidence
 */
reportRoutes.get('/evidence', async (c) => {
  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const links = await evidenceManager.getLinkedEvidence(reportId);
  return c.json({ links });
});

/**
 * POST /api/reports/evidence
 * Links evidence items
 */
reportRoutes.post('/evidence', async (c) => {
  const user = await resolveUser(c);
  const { reportId, links } = await c.req.json().catch(() => ({}));

  if (!reportId || !Array.isArray(links)) {
    return c.json({ error: 'reportId and links array are required' }, 400);
  }

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const createdLinks = await evidenceManager.linkEvidence(reportId, links);
  return c.json({ links: createdLinks });
});

/**
 * GET /api/reports/distribution
 * Returns distributions history
 */
reportRoutes.get('/distribution', async (c) => {
  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const distributions = await prisma.reportDistributionEvent.findMany({
    where: { reportId },
    orderBy: { sentAt: 'desc' }
  });

  return c.json({ distributions });
});

/**
 * POST /api/reports/distribution
 * Distributes report to recipient
 */
reportRoutes.post('/distribution', async (c) => {
  const user = await resolveUser(c);
  const { reportId, channel, recipient } = await c.req.json().catch(() => ({}));

  if (!reportId || !channel || !recipient) {
    return c.json({ error: 'reportId, channel, and recipient are required' }, 400);
  }

  const report = await prisma.executiveReport.findUnique({ where: { id: reportId } });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, report.workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  try {
    const distribution = await distributionDispatcher.distributeReport(reportId, channel, recipient, user?.id || '');
    return c.json({ distribution });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * GET /api/reports/analytics/curves
 * Returns workspace analytical curves
 */
reportRoutes.get('/analytics/curves', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const user = await resolveUser(c);
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'ANALYTICS', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);

  const curves = await analyticsEngine.getCrossProjectStabilityTimeline(workspaceId);
  return c.json({ curves });
});

/**
 * GET /api/reports/analytics/digests
 * Returns digests list
 */
reportRoutes.get('/analytics/digests', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const user = await resolveUser(c);
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'ANALYTICS', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);

  const digests = await prisma.workspaceInsightDigest.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ digests });
});

/**
 * POST /api/reports/analytics/digests
 * Generates a new workspace digest
 */
reportRoutes.post('/analytics/digests', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, title, period } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !title || !period) {
    return c.json({ error: 'workspaceId, title, and period are required' }, 400);
  }

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'ANALYTICS', 'WRITE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);

  try {
    const digest = await analyticsEngine.generateDigest(workspaceId, title, period);
    return c.json({ digest });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});
