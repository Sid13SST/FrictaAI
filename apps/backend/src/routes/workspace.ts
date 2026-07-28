import { Hono } from 'hono';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { resolveUser } from '../middleware';
import { getCurrentUser } from '../middleware/authContext';
import { ApiErrors } from '../utils/errors';
import {
  OrganizationManager,
  PermissionManager,
  AnnotationManager,
  CommentManager,
  ReviewManager,
  SharingManager,
  PresenceManager,
  ActivityLogManager,
  GovernanceManager
} from '@fricta/workspace';

export const workspaceRoutes = new Hono();

// `permissionManager.checkPermission` (below) treats a project with no
// `workspaceId` ("solo mode") as always-allowed for any action — it was
// designed to evaluate workspace RBAC, not project ownership. That means it
// cannot be trusted alone to gate access to a specific project or workspace;
// every route below pairs it with one of these ownership/membership checks.
async function requireProjectAccess(c: Context, projectId: string) {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true, workspaceId: true } });
  if (!project) return ApiErrors.notFound(c);
  if (project.userId === user.userId) return null;
  if (project.workspaceId) {
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: project.workspaceId, userId: user.userId } });
    if (member) return null;
  }
  return ApiErrors.forbidden(c);
}

async function requireWorkspaceMembership(c: Context, workspaceId: string) {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);
  const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId: user.userId } });
  if (!member) return ApiErrors.forbidden(c);
  return null;
}

const orgManager = new OrganizationManager(prisma);
const permissionManager = new PermissionManager(prisma);
const annotationManager = new AnnotationManager(prisma);
const commentManager = new CommentManager(prisma);
const reviewManager = new ReviewManager(prisma);
const sharingManager = new SharingManager(prisma);
const presenceManager = new PresenceManager(); // in-memory
const activityManager = new ActivityLogManager(prisma);
const governanceManager = new GovernanceManager(prisma);


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SSE WORKSPACE STREAM
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/stream/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');

  const membershipError = await requireWorkspaceMembership(c, workspaceId);
  if (membershipError) return membershipError;

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    let isAborted = false;

    // Send connection success payload
    await stream.writeSSE({
      event: 'system.connected',
      data: JSON.stringify({ status: 'connected', workspaceId }),
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribeAll(async (event) => {
      if (isAborted) return;
      
      // Filter events targeted to this workspace
      const payloadWorkspaceId = event.payload?.workspaceId;
      if (payloadWorkspaceId === workspaceId || event.orchestrationSessionId === workspaceId) {
        try {
          await stream.writeSSE({
            event: event.eventType,
            id: event.id,
            data: JSON.stringify(event.payload),
          });
        } catch (writeErr) {
          // ignore
        }
      }
    });

    // Setup ping heartbeats
    const pingTimer = setInterval(async () => {
      if (isAborted) return;
      try {
        await stream.writeSSE({
          event: 'ping',
          data: JSON.stringify({ timestamp: Date.now() }),
        });
      } catch (err) {
        isAborted = true;
        clearInterval(pingTimer);
        unsubscribe();
      }
    }, 15000);

    stream.onAbort(() => {
      isAborted = true;
      clearInterval(pingTimer);
      unsubscribe();
    });

    // Keep active
    while (!isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORGANIZATIONS & WORKSPACES
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/organizations', async (c) => {
  const user = await resolveUser(c);
  if (!user) {
    return c.json({ organizations: [], workspaces: [] });
  }

  // Get workspaces this user belongs to
  const workspaces = await orgManager.getUserWorkspaces(user.id);
  
  // Find organizations associated with these workspaces
  const orgIds = Array.from(new Set(workspaces.map((w) => w.organizationId)));
  const organizations = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
  });

  return c.json({ organizations, workspaces });
});

workspaceRoutes.post('/organizations', async (c) => {
  const user = await resolveUser(c);
  if (!user) {
    return c.json({ error: 'User resolve failed' }, 400);
  }

  const { name } = await c.req.json().catch(() => ({}));
  if (!name) {
    return c.json({ error: 'Organization name is required' }, 400);
  }

  const result = await orgManager.createOrganization(name, user.id);
  
  await activityManager.logActivity(user.id, 'ORGANIZATION_CREATE', `Created organization: ${name}`, {
    workspaceId: result.workspace.id,
  });

  return c.json(result);
});

workspaceRoutes.get('/members', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'workspaceId query parameter is required' }, 400);
  }
  const membershipError = await requireWorkspaceMembership(c, workspaceId);
  if (membershipError) return membershipError;

  const members = await orgManager.getWorkspaceMembers(workspaceId);
  return c.json({ members });
});

workspaceRoutes.post('/members', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workspaceId, targetEmail, role } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !targetEmail || !role) {
    return c.json({ error: 'workspaceId, targetEmail, and role are required' }, 400);
  }

  // Check permissions to add members
  const hasPerm = await permissionManager.checkPermission(user.id, 'MANAGE_MEMBERS', { workspaceId });
  if (!hasPerm) {
    return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Find or create target user
  let targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: { email: targetEmail, name: targetEmail.split('@')[0] },
    });
  }

  // Get workspace organization
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

  const member = await orgManager.addMemberToWorkspace(workspace.organizationId, workspaceId, targetUser.id, role);

  await activityManager.logActivity(user.id, 'PERMISSION_GRANT', `Assigned role ${role} to ${targetEmail}`, {
    workspaceId,
  });

  // Broadcast update
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.members.updated',
    payload: { workspaceId },
  });

  return c.json({ member });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROJECTS SCOPING
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/projects', async (c) => {
  const workspaceId = c.req.query('workspaceId');

  if (!workspaceId) {
    // Standalone (solo-mode) projects — scope to the caller's own, never
    // every solo user's projects platform-wide.
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const projects = await prisma.project.findMany({
      where: { workspaceId: null, userId: user.userId },
    });
    return c.json({ projects });
  }

  const membershipError = await requireWorkspaceMembership(c, workspaceId);
  if (membershipError) return membershipError;

  const projects = await prisma.project.findMany({
    where: { workspaceId },
  });
  return c.json({ projects });
});

workspaceRoutes.post('/projects/scope', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  // Verify project existence
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;
  if (workspaceId) {
    const membershipError = await requireWorkspaceMembership(c, workspaceId);
    if (membershipError) return membershipError;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { workspaceId: workspaceId || null },
  });

  await activityManager.logActivity(user.id, 'PROJECT_SCOPE', `Scoped project "${project.projectName}" to workspace`, {
    projectId,
    workspaceId: workspaceId || undefined,
  });

  return c.json({ project: updated });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EVIDENCE ANNOTATIONS & COMMENTS
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/annotations', async (c) => {
  const projectId = c.req.query('projectId');
  const targetType = c.req.query('targetType');
  const targetId = c.req.query('targetId');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }
  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;

  if (targetType && targetId) {
    const annotations = await annotationManager.getAnnotationsForTarget(targetType, targetId);
    return c.json({ annotations });
  }

  const annotations = await annotationManager.getAnnotationsForProject(projectId);
  return c.json({ annotations });
});

workspaceRoutes.post('/annotations', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { projectId, targetType, targetId, title, content, severity } = body;

  if (!projectId || !targetType || !targetId || !content) {
    return c.json({ error: 'projectId, targetType, targetId, and content are required' }, 400);
  }

  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;

  // Check permission
  const hasPerm = await permissionManager.checkPermission(user.id, 'WRITE_ANNOTATION', { projectId });
  if (!hasPerm) {
    return c.json({ error: 'Forbidden: Insufficient annotation privileges' }, 403);
  }

  const annotation = await annotationManager.createAnnotation({
    projectId,
    targetType,
    targetId,
    content,
    createdById: user.id,
    severity,
    title,
  });

  // Get project workspaceId for broadcast scoping
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  
  await activityManager.logActivity(user.id, 'ANNOTATION_CREATE', `Added annotation on ${targetType}: "${content.substring(0, 30)}..."`, {
    projectId,
    workspaceId: project?.workspaceId || undefined,
  });

  if (project?.workspaceId) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: project.workspaceId,
      eventType: 'annotation.created',
      payload: { workspaceId: project.workspaceId, projectId, annotation },
    });
  }

  return c.json({ annotation });
});

workspaceRoutes.post('/annotations/:id/resolve', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const annotationId = c.req.param('id');
  const { resolved } = await c.req.json().catch(() => ({ resolved: true }));

  const annotation = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!annotation) return c.json({ error: 'Annotation not found' }, 404);

  const accessError = await requireProjectAccess(c, annotation.projectId);
  if (accessError) return accessError;

  // Check permission
  const hasPerm = await permissionManager.checkPermission(user.id, 'WRITE_ANNOTATION', { projectId: annotation.projectId });
  if (!hasPerm) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const updated = await annotationManager.resolveAnnotation(annotationId, resolved);
  const project = await prisma.project.findUnique({ where: { id: annotation.projectId } });

  await activityManager.logActivity(user.id, 'ANNOTATION_RESOLVE', `${resolved ? 'Resolved' : 'Reopened'} annotation`, {
    projectId: annotation.projectId,
    workspaceId: project?.workspaceId || undefined,
  });

  if (project?.workspaceId) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: project.workspaceId,
      eventType: 'annotation.resolved',
      payload: { workspaceId: project.workspaceId, annotationId, resolved },
    });
  }

  return c.json({ annotation: updated });
});

workspaceRoutes.post('/annotations/:id/comments', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const annotationId = c.req.param('id');
  const { content } = await c.req.json().catch(() => ({}));

  if (!content) return c.json({ error: 'Comment content is required' }, 400);

  const annotation = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!annotation) return c.json({ error: 'Annotation not found' }, 404);

  const accessError = await requireProjectAccess(c, annotation.projectId);
  if (accessError) return accessError;

  const comment = await commentManager.addComment(annotationId, content, user.id);
  const project = await prisma.project.findUnique({ where: { id: annotation.projectId } });

  if (project?.workspaceId) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: project.workspaceId,
      eventType: 'comment.created',
      payload: { workspaceId: project.workspaceId, comment },
    });
  }

  return c.json({ comment });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * REVIEWS QUEUE & GOVERNANCE
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/reviews', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;

  const queue = await reviewManager.getReviewQueue(projectId);
  return c.json({ queue });
});

workspaceRoutes.post('/reviews/assign', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workflowSessionId, assignedToId } = await c.req.json().catch(() => ({}));
  if (!workflowSessionId) return c.json({ error: 'workflowSessionId is required' }, 400);

  const session = await prisma.workflowSession.findUnique({ where: { id: workflowSessionId } });
  if (!session) return c.json({ error: 'Workflow session not found' }, 404);

  const accessError = await requireProjectAccess(c, session.projectId);
  if (accessError) return accessError;

  const hasPerm = await permissionManager.checkPermission(user.id, 'MANAGE_REVIEWS', { projectId: session.projectId });
  if (!hasPerm) return c.json({ error: 'Forbidden' }, 403);

  const review = await reviewManager.assignReview(workflowSessionId, assignedToId || null);
  const project = await prisma.project.findUnique({ where: { id: session.projectId } });

  await activityManager.logActivity(user.id, 'REVIEW_ASSIGN', `Assigned session review ${workflowSessionId} to team member`, {
    projectId: session.projectId,
    workspaceId: project?.workspaceId || undefined,
  });

  if (project?.workspaceId) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: project.workspaceId,
      eventType: 'review.updated',
      payload: { workspaceId: project.workspaceId, review },
    });
  }

  return c.json({ review });
});

workspaceRoutes.post('/reviews/status', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workflowSessionId, status, notes } = await c.req.json().catch(() => ({}));
  if (!workflowSessionId || !status) {
    return c.json({ error: 'workflowSessionId and status are required' }, 400);
  }

  const session = await prisma.workflowSession.findUnique({ where: { id: workflowSessionId } });
  if (!session) return c.json({ error: 'Workflow session not found' }, 404);

  const accessError = await requireProjectAccess(c, session.projectId);
  if (accessError) return accessError;

  const hasPerm = await permissionManager.checkPermission(user.id, 'MANAGE_GOVERNANCE', { projectId: session.projectId });
  if (!hasPerm) return c.json({ error: 'Forbidden: Governance checks require UX_LEAD or higher role' }, 403);

  let review;
  if (status === 'APPROVED') {
    review = await governanceManager.approveInvestigation(workflowSessionId, user.id, notes);
  } else if (status === 'REJECTED') {
    review = await governanceManager.rejectInvestigation(workflowSessionId, user.id, notes);
  } else if (status === 'RESOLVED') {
    review = await governanceManager.resolveInvestigation(workflowSessionId, user.id, notes);
  } else {
    review = await reviewManager.updateReviewStatus(workflowSessionId, status, notes);
  }

  const project = await prisma.project.findUnique({ where: { id: session.projectId } });

  await activityManager.logActivity(user.id, 'REVIEW_STATUS', `Set review status to ${status} for session ${workflowSessionId}`, {
    projectId: session.projectId,
    workspaceId: project?.workspaceId || undefined,
  });

  if (project?.workspaceId) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: project.workspaceId,
      eventType: 'review.updated',
      payload: { workspaceId: project.workspaceId, review },
    });
  }

  return c.json({ review });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUDIT FEED & SHARING
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.get('/activity', async (c) => {
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId && !workspaceId) {
    return c.json({ error: 'projectId or workspaceId is required' }, 400);
  }
  if (projectId) {
    const accessError = await requireProjectAccess(c, projectId);
    if (accessError) return accessError;
  } else if (workspaceId) {
    const membershipError = await requireWorkspaceMembership(c, workspaceId);
    if (membershipError) return membershipError;
  }

  const feed = await activityManager.getActivityFeed({ projectId, workspaceId });
  return c.json({ feed });
});

workspaceRoutes.post('/sharing', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { projectId, targetType, targetId, expiresInHours, maxUses } = body;

  if (!projectId || !targetType || !targetId) {
    return c.json({ error: 'projectId, targetType, and targetId are required' }, 400);
  }

  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;

  const hasPerm = await permissionManager.checkPermission(user.id, 'SHARE_INTELLIGENCE', { projectId });
  if (!hasPerm) return c.json({ error: 'Forbidden' }, 403);

  const link = await sharingManager.createSharedLink({
    projectId,
    targetType,
    targetId,
    createdById: user.id,
    expiresInHours,
    maxUses,
  });

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  await activityManager.logActivity(user.id, 'SHARE_CREATE', `Generated secure share link for ${targetType}`, {
    projectId,
    workspaceId: project?.workspaceId || undefined,
  });

  return c.json({ link });
});

workspaceRoutes.get('/sharing/validate/:token', async (c) => {
  const token = c.req.param('token');
  const validation = await sharingManager.validateSharedLink(token);
  return c.json(validation);
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ACTIVE PRESENCE
 * ─────────────────────────────────────────────────────────────────────────────
 */
workspaceRoutes.post('/presence', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workspaceId, activeScreen } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !activeScreen) {
    return c.json({ error: 'workspaceId and activeScreen are required' }, 400);
  }
  const membershipError = await requireWorkspaceMembership(c, workspaceId);
  if (membershipError) return membershipError;

  const record = presenceManager.updatePresence(user.id, user.name || user.email.split('@')[0], activeScreen);
  const activeUsers = presenceManager.getPresenceForScreen(activeScreen);

  // Broadcast presence details workspace-wide
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'presence.sync',
    payload: {
      workspaceId,
      activeScreen,
      users: activeUsers,
    },
  });

  return c.json({ activeUsers });
});

workspaceRoutes.get('/presence', async (c) => {
  const activeScreen = c.req.query('activeScreen');
  if (!activeScreen) return c.json({ error: 'activeScreen parameter is required' }, 400);

  const activeUsers = presenceManager.getPresenceForScreen(activeScreen);
  return c.json({ activeUsers });
});

workspaceRoutes.get('/threads', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const accessError = await requireProjectAccess(c, projectId);
  if (accessError) return accessError;

  const threads = await prisma.investigationThread.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ threads });
});

