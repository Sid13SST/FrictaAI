import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { buildUXReport, SessionData, ActionData, InteractionData, ThoughtData } from '@fricta/ux-engine';
import { ExecutiveSummaryEngine, TimelineCompiler, ExportEngine, PDFRenderer, UnifiedUXReportPayload, WorkflowSessionDetails } from '@fricta/report-engine';
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
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
  WorkspaceAnalyticsEngine,
  type ExportStorage
} from '@fricta/enterprise-reporting';
import { getCurrentUser } from '../middleware/authContext';
import {
  verifyReportOwnership,
  assertProjectOwnership,
  assertReportOwnership,
  requireWorkflowOwner
} from '../guards/ownership';

// ─── Export file storage (real files on disk, servable via /exports/:id/download) ──
const EXPORTS_DIR = path.resolve(__dirname, '../../../../storage/exports');

class DiskExportStorage implements ExportStorage {
  async save(fileName: string, data: Buffer): Promise<string> {
    await fs.mkdir(EXPORTS_DIR, { recursive: true });
    await fs.writeFile(path.join(EXPORTS_DIR, fileName), data);
    return `exports/${fileName}`;
  }
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}

export const reportRoutes = new Hono();

export async function generateReportForSession(sessionId: string) {
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
        data: { summary: reportData.summary, score: Math.round(reportData.scores.overallScore) }
      });
    } else {
      await tx.uXReport.create({
        data: {
          sessionId,
          summary: reportData.summary,
          score: Math.round(reportData.scores.overallScore)
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

// ─── GET / - List all reports owned by user ───────────────────────────────────
reportRoutes.get('/', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const reports = await prisma.uXReport.findMany({
    where: {
      session: {
        project: {
          userId: user.userId
        }
      }
    }
  });
  return c.json({ reports });
});

// ─── POST /:sessionId/generate - Generate UX report (Session ownership required) 
reportRoutes.post('/:sessionId/generate', requireWorkflowOwner('sessionId'), async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const reportData = await generateReportForSession(sessionId);
    if (!reportData) return c.json({ error: 'Session not found' }, 404);
    return c.json({ success: true, reportData });
  } catch (error: any) {
    console.error(`[Backend] Report generation failed for session ${sessionId}:`, error.message);
    try {
      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED' }
      });
    } catch (dbErr: any) {
      console.error(`[Backend] Failed to transition session to FAILED status after report failure:`, dbErr.message);
    }
    return c.json({ error: error.message }, 500);
  }
});

// ─── GET /:id - Fetch unified report payload (Session ownership required) ──────
reportRoutes.get('/:id', requireWorkflowOwner('id'), async (c) => {
  const id = c.req.param('id');
  
  // Auto-generate legacy report if it doesn't exist
  const legacyReport = await prisma.uXReport.findFirst({ where: { sessionId: id } });
  if (!legacyReport) {
    await generateReportForSession(id);
  }

  const payload = await compileUnifiedReport(id);
  if (!payload) return c.json({ error: 'Report not found' }, 404);

  return c.json(payload);
});

// ─── GET /:id/executive - Fetch synthesized executive summary (Session ownership required)
reportRoutes.get('/:id/executive', requireWorkflowOwner('id'), async (c) => {
  const id = c.req.param('id');
  const payload = await compileUnifiedReport(id);
  if (!payload) return c.json({ error: 'Report not found' }, 404);

  const executiveSummary = ExecutiveSummaryEngine.synthesize(payload);
  return c.json(executiveSummary);
});

// ─── GET /:id/export - Export report payload (Session ownership required) ─────
reportRoutes.get('/:id/export', requireWorkflowOwner('id'), async (c) => {
  const id = c.req.param('id');
  const payload = await compileUnifiedReport(id);
  if (!payload) return c.json({ error: 'Report not found' }, 404);

  const executiveSummary = ExecutiveSummaryEngine.synthesize(payload);
  return c.json({
    markdown: ExportEngine.toMarkdown(payload, executiveSummary),
    textSheet: ExportEngine.toTextSheet(payload, executiveSummary),
    developerJson: ExportEngine.toDeveloperJson(payload, executiveSummary)
  });
});

// ─── GET /:id/export/pdf - Render report as a downloadable PDF (Session ownership required) ─────
reportRoutes.get('/:id/export/pdf', requireWorkflowOwner('id'), async (c) => {
  const id = c.req.param('id');
  const payload = await compileUnifiedReport(id);
  if (!payload) return c.json({ error: 'Report not found' }, 404);

  const executiveSummary = ExecutiveSummaryEngine.synthesize(payload);
  const html = PDFRenderer.renderHTML(payload, executiveSummary);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fricta-ux-report-${id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error(`[Backend] Failed to render PDF for report ${id}:`, error.message);
    return c.json({ error: 'Failed to generate PDF export' }, 500);
  } finally {
    if (browser) await browser.close();
  }
});

// ─── GET /:id/personas - Fetch personas list (Session ownership required) ─────
reportRoutes.get('/:id/personas', requireWorkflowOwner('id'), async (c) => {
  const id = c.req.param('id');
  const payload = await compileUnifiedReport(id);
  if (!payload) return c.json({ error: 'Report not found' }, 404);

  return c.json({
    personaProfiles: payload.personaProfiles,
    uxFindings: payload.uxFindings
  });
});

// ─── GET /:id/timeline - Fetch compiled timeline (Session ownership required) ────
reportRoutes.get('/:id/timeline', requireWorkflowOwner('id'), async (c) => {
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

// ─── Resolve User Helper ──────────────────────────────────────────────────────

async function resolveUser(c: any): Promise<any> {
  const clerkUser = getCurrentUser(c);
  if (!clerkUser) return null;
  const user = await prisma.user.findUnique({ where: { id: clerkUser.userId } });
  if (user) return user;
  
  // Create user locally if they don't exist
  return prisma.user.create({
    data: {
      id: clerkUser.userId,
      email: clerkUser.email || `user-${clerkUser.userId}@fricta.ai`,
      name: 'Clerk User',
    }
  });
}

// Global engine instantiations
const compiler = new ExecutiveReportingCompiler(prisma as any);
const summaryEngine = new SummarySynthesisEngine(prisma as any);
const evidenceManager = new EvidenceLinkManager(prisma as any);
const exportService = new ExportProcessingService(prisma as any, {
  renderPdf: renderHtmlToPdf,
  storage: new DiskExportStorage(),
});
const shareManager = new SharedReportManager(prisma as any);
const distributionDispatcher = new ReportDistributionDispatcher(prisma as any);
const analyticsEngine = new WorkspaceAnalyticsEngine(prisma as any);

/**
 * GET /api/reports/executive/list
 * Returns compiled reports for workspace/project
 */
reportRoutes.get('/executive/list', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (projectId) {
    const isOwner = await assertProjectOwnership(user.userId, projectId);
    if (!isOwner) return c.json({ error: 'Access denied' }, 403);
  } else if (workspaceId) {
    // Traverse: user must own at least one project in this workspace
    const ownedProjects = await prisma.project.findMany({
      where: { workspaceId, userId: user.userId },
      select: { id: true }
    });
    if (ownedProjects.length === 0) {
      return c.json({ error: 'Access denied' }, 403);
    }
  } else {
    return c.json({ error: 'projectId or workspaceId is required' }, 400);
  }

  const reports = await prisma.executiveReport.findMany({
    where: {
      projectId: projectId || undefined,
      workspaceId: workspaceId || undefined
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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { workspaceId, projectId, title } = await c.req.json().catch(() => ({}));
  if (!projectId || !title) {
    return c.json({ error: 'projectId and title are required' }, 400);
  }

  const isOwner = await assertProjectOwnership(user.userId, projectId);
  if (!isOwner) return c.json({ error: 'Access denied' }, 403);

  const localDbUser = await resolveUser(c);

  try {
    const report = await compiler.compileReport(projectId, title, localDbUser?.id || '', workspaceId || null);
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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const id = c.req.param('id');
  const result = await verifyReportOwnership(user.userId, id);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const report = await prisma.executiveReport.findUnique({
    where: { id }
  });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  const deck = PresentationDeckBuilder.generatePresentation(report);
  return c.json({ deck });
});

/**
 * GET /api/reports/executive/:id/pdf-layout
 * Returns PDF layout representation
 */
reportRoutes.get('/executive/:id/pdf-layout', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const id = c.req.param('id');
  const result = await verifyReportOwnership(user.userId, id);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const report = await prisma.executiveReport.findUnique({
    where: { id }
  });
  if (!report) return c.json({ error: 'Report not found' }, 404);

  const pdfLayout = PDFLayoutEngine.compilePDFLayout(report);
  return c.json({ pdfLayout });
});

/**
 * GET /api/reports/exports
 * Returns exports history
 */
reportRoutes.get('/exports', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { reportId, format } = await c.req.json().catch(() => ({}));
  if (!reportId || !format) {
    return c.json({ error: 'reportId and format are required' }, 400);
  }

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const localDbUser = await resolveUser(c);

  try {
    const exportRecord = await exportService.triggerExport(reportId, format, localDbUser?.id || '');
    return c.json({ export: exportRecord });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * GET /api/reports/exports/:exportId/download
 * Streams a completed export file from disk (ownership verified via the
 * export's parent report).
 */
reportRoutes.get('/exports/:exportId/download', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const exportId = c.req.param('exportId');
  const exportRecord = await prisma.reportExport.findUnique({ where: { id: exportId } });
  if (!exportRecord) return c.json({ error: 'Export not found' }, 404);

  const result = await verifyReportOwnership(user.userId, exportRecord.reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  if (exportRecord.status !== 'COMPLETED' || !exportRecord.filePath) {
    return c.json({ error: `Export is ${exportRecord.status.toLowerCase()}, not ready for download` }, 409);
  }

  try {
    const absolutePath = path.resolve(EXPORTS_DIR, path.basename(exportRecord.filePath));
    const fileBytes = await fs.readFile(absolutePath);
    const contentType = exportRecord.format === 'PDF' ? 'application/pdf' : 'application/octet-stream';
    return c.body(new Uint8Array(fileBytes), 200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="fricta-export-${exportId}.${exportRecord.format.toLowerCase()}"`,
    });
  } catch (err: any) {
    return c.json({ error: `Export file not found on disk: ${err.message}` }, 404);
  }
});

/**
 * GET /api/reports/templates
 * Returns templates list
 */
reportRoutes.get('/templates', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const workspaceId = c.req.query('workspaceId') || null;

  if (workspaceId) {
    const ownedProjects = await prisma.project.findMany({
      where: { workspaceId, userId: user.userId },
      select: { id: true }
    });
    if (ownedProjects.length === 0) {
      return c.json({ error: 'Access denied' }, 403);
    }
  }

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { workspaceId, name, description, layoutType, structure } = await c.req.json().catch(() => ({}));
  if (!name || !layoutType) {
    return c.json({ error: 'name and layoutType are required' }, 400);
  }

  if (workspaceId) {
    const ownedProjects = await prisma.project.findMany({
      where: { workspaceId, userId: user.userId },
      select: { id: true }
    });
    if (ownedProjects.length === 0) {
      return c.json({ error: 'Access denied' }, 403);
    }
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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { reportId, expiresHours, maxUses, email } = await c.req.json().catch(() => ({}));
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const localDbUser = await resolveUser(c);

  const share = await shareManager.generateShare(reportId, localDbUser?.id || '', { expiresHours, maxUses, email });
  return c.json({ share });
});

/**
 * POST /api/reports/sharing/revoke
 * Revokes share token
 */
reportRoutes.post('/sharing/revoke', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { shareId } = await c.req.json().catch(() => ({}));
  if (!shareId) return c.json({ error: 'shareId is required' }, 400);

  const share = await prisma.sharedReport.findUnique({
    where: { id: shareId },
    select: { reportId: true }
  });
  if (!share) return c.json({ error: 'Shared link not found' }, 404);

  const result = await verifyReportOwnership(user.userId, share.reportId);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const links = await evidenceManager.getLinkedEvidence(reportId);
  return c.json({ links });
});

/**
 * POST /api/reports/evidence
 * Links evidence items
 */
reportRoutes.post('/evidence', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { reportId, links } = await c.req.json().catch(() => ({}));
  if (!reportId || !Array.isArray(links)) {
    return c.json({ error: 'reportId and links array are required' }, 400);
  }

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const createdLinks = await evidenceManager.linkEvidence(reportId, links);
  return c.json({ links: createdLinks });
});

/**
 * GET /api/reports/distribution
 * Returns distributions history
 */
reportRoutes.get('/distribution', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const reportId = c.req.query('reportId');
  if (!reportId) return c.json({ error: 'reportId is required' }, 400);

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { reportId, channel, recipient } = await c.req.json().catch(() => ({}));
  if (!reportId || !channel || !recipient) {
    return c.json({ error: 'reportId, channel, and recipient are required' }, 400);
  }

  const result = await verifyReportOwnership(user.userId, reportId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Report not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  const localDbUser = await resolveUser(c);

  try {
    const distribution = await distributionDispatcher.distributeReport(reportId, channel, recipient, localDbUser?.id || '');
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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const ownedProjects = await prisma.project.findMany({
    where: { workspaceId, userId: user.userId },
    select: { id: true }
  });
  if (ownedProjects.length === 0) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const curves = await analyticsEngine.getCrossProjectStabilityTimeline(workspaceId);
  return c.json({ curves });
});

/**
 * GET /api/reports/analytics/digests
 * Returns digests list
 */
reportRoutes.get('/analytics/digests', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const ownedProjects = await prisma.project.findMany({
    where: { workspaceId, userId: user.userId },
    select: { id: true }
  });
  if (ownedProjects.length === 0) {
    return c.json({ error: 'Access denied' }, 403);
  }

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
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { workspaceId, title, period } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !title || !period) {
    return c.json({ error: 'workspaceId, title, and period are required' }, 400);
  }

  const ownedProjects = await prisma.project.findMany({
    where: { workspaceId, userId: user.userId },
    select: { id: true }
  });
  if (ownedProjects.length === 0) {
    return c.json({ error: 'Access denied' }, 403);
  }

  try {
    const digest = await analyticsEngine.generateDigest(workspaceId, title, period);
    return c.json({ digest });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});
