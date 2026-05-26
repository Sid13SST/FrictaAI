import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import {
  OrganizationManager,
  PermissionManager,
  WorkspaceManager,
  MemberManager,
  InviteManager,
  ProjectWorkspaceManager,
  CollaborationManager,
  ActivityLogManager,
  WorkspaceAnalyticsManager,
  BillingLimitManager
} from '@fricta/workspace-core';

export const workspaceCoreRoutes = new Hono();

const orgManager = new OrganizationManager(prisma);
const permissionManager = new PermissionManager(prisma);
const workspaceManager = new WorkspaceManager(prisma);
const memberManager = new MemberManager(prisma);
const inviteManager = new InviteManager(prisma);
const projectWorkspaceManager = new ProjectWorkspaceManager(prisma);
const collaborationManager = new CollaborationManager(prisma);
const activityLogManager = new ActivityLogManager(prisma);
const analyticsManager = new WorkspaceAnalyticsManager(prisma);
const billingManager = new BillingLimitManager(prisma);

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

  // Fallback to first user in database
  const defaultUser = await prisma.user.findFirst();
  return defaultUser;
}

/**
 * GET /organizations
 * Lists organizations and user's workspaces
 */
workspaceCoreRoutes.get('/organizations', async (c) => {
  const user = await resolveUser(c);
  if (!user) {
    return c.json({ organizations: [], workspaces: [] });
  }

  const workspaces = await workspaceManager.getUserWorkspaces(user.id);
  const orgIds = Array.from(new Set(workspaces.map((w) => w.organizationId)));
  const organizations = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
  });

  return c.json({ organizations, workspaces });
});

/**
 * POST /organizations
 * Creates a new organization, main workspace, and assigns owner role
 */
workspaceCoreRoutes.post('/organizations', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { name } = await c.req.json().catch(() => ({}));
  if (!name) return c.json({ error: 'Organization name is required' }, 400);

  const result = await orgManager.createOrganization(name, user.id);
  await activityLogManager.logActivity(
    result.workspace.id,
    user.id,
    'ORGANIZATION_CREATE',
    `Created organization: ${name}`,
    { workspaceId: result.workspace.id }
  );

  return c.json(result);
});

/**
 * GET /workspaces
 * Lists workspaces for the user
 */
workspaceCoreRoutes.get('/workspaces', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ workspaces: [] });

  const workspaces = await workspaceManager.getUserWorkspaces(user.id);
  return c.json({ workspaces });
});

/**
 * POST /workspaces
 * Creates a new workspace under an organization
 */
workspaceCoreRoutes.post('/workspaces', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { organizationId, name, description } = await c.req.json().catch(() => ({}));
  if (!organizationId || !name) {
    return c.json({ error: 'organizationId and name are required' }, 400);
  }

  // Check billing limit before workspace creation
  const canCreate = await billingManager.canCreateWorkspace(organizationId);
  if (!canCreate) {
    return c.json({ error: 'Quota exceeded: Upgrade to create more workspaces' }, 403);
  }

  const workspace = await workspaceManager.createWorkspace(organizationId, name, description);
  
  // Assign owner role to the creator
  await memberManager.addMemberToWorkspace(organizationId, workspace.id, user.id, 'OWNER');

  await activityLogManager.logActivity(
    workspace.id,
    user.id,
    'WORKSPACE_CREATE',
    `Created workspace: ${name}`,
    { organizationId }
  );

  return c.json({ workspace });
});

/**
 * GET /workspace/members
 * Lists all members of a workspace
 */
workspaceCoreRoutes.get('/workspace/members', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const members = await memberManager.getWorkspaceMembers(workspaceId);
  return c.json({ members });
});

/**
 * GET /workspace/invites
 * Lists pending invites
 */
workspaceCoreRoutes.get('/workspace/invites', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const invites = await inviteManager.getWorkspaceInvites(workspaceId);
  return c.json({ invites });
});

/**
 * POST /workspace/invites
 * Creates and sends an invite
 */
workspaceCoreRoutes.post('/workspace/invites', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workspaceId, email, role } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !email || !role) {
    return c.json({ error: 'workspaceId, email, and role are required' }, 400);
  }

  // Check permission
  const hasPerm = await permissionManager.checkPermission(user.id, 'MANAGE_MEMBERS', { workspaceId });
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  // Check billing limits
  const workspace = await workspaceManager.getWorkspaceDetails(workspaceId);
  if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

  const canAdd = await billingManager.canAddMember(workspace.organizationId);
  if (!canAdd) {
    return c.json({ error: 'Quota exceeded: Upgrade to invite more team members' }, 403);
  }

  const invite = await inviteManager.createInvite(workspaceId, user.id, email, role);

  await activityLogManager.logActivity(
    workspaceId,
    user.id,
    'INVITE_SENT',
    `Sent invitation to ${email} as ${role}`,
    { inviteId: invite.id }
  );

  return c.json({ invite });
});

/**
 * POST /workspace/invites/accept
 * Accepts an invitation token
 */
workspaceCoreRoutes.post('/workspace/invites/accept', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { token } = await c.req.json().catch(() => ({}));
  if (!token) return c.json({ error: 'token is required' }, 400);

  const member = await inviteManager.acceptInvite(token, user.id);

  // Broadcast membership sync
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: member.workspaceId || 'global',
    eventType: 'workspace.members.updated',
    payload: { workspaceId: member.workspaceId },
  });

  return c.json({ member });
});

/**
 * POST /workspace/invites/decline
 * Declines an invitation token
 */
workspaceCoreRoutes.post('/workspace/invites/decline', async (c) => {
  const { token } = await c.req.json().catch(() => ({}));
  if (!token) return c.json({ error: 'token is required' }, 400);

  const invite = await inviteManager.declineInvite(token);
  return c.json({ invite });
});

/**
 * GET /workspace/projects
 * Lists projects associated with a workspace
 */
workspaceCoreRoutes.get('/workspace/projects', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const projects = await projectWorkspaceManager.getWorkspaceProjects(workspaceId);
  return c.json({ projects });
});

/**
 * POST /workspace/projects
 * Links project to a workspace
 */
workspaceCoreRoutes.post('/workspace/projects', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));
  if (!projectId || !workspaceId) {
    return c.json({ error: 'projectId and workspaceId are required' }, 400);
  }

  const project = await projectWorkspaceManager.transferProjectToWorkspace(projectId, workspaceId, user.id);
  
  // Broadcast update
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.projects.updated',
    payload: { workspaceId, projectId },
  });

  return c.json({ project });
});

/**
 * GET /workspace/activity
 * Gets workspace audit feed
 */
workspaceCoreRoutes.get('/workspace/activity', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const feed = await activityLogManager.getWorkspaceActivities(workspaceId);
  return c.json({ feed });
});

/**
 * GET /workspace/investigations
 * Lists shared investigations in workspace
 */
workspaceCoreRoutes.get('/workspace/investigations', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const investigations = await collaborationManager.getWorkspaceInvestigations(workspaceId);
  return c.json({ investigations });
});

/**
 * POST /workspace/investigations
 * Shares a session to workspace
 */
workspaceCoreRoutes.post('/workspace/investigations', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workspaceId, workflowSessionId, name, description } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !workflowSessionId || !name) {
    return c.json({ error: 'workspaceId, workflowSessionId, and name are required' }, 400);
  }

  const investigation = await collaborationManager.shareInvestigation(
    workspaceId,
    workflowSessionId,
    name,
    description || null,
    user.id
  );

  // Broadcast sharing
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.investigations.updated',
    payload: { workspaceId, investigation },
  });

  return c.json({ investigation });
});

/**
 * POST /workspace/investigations/:id/comments
 * Adds comment to shared investigation thread
 */
workspaceCoreRoutes.post('/workspace/investigations/:id/comments', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const investigationId = c.req.param('id');
  const { content } = await c.req.json().catch(() => ({}));

  if (!content) return c.json({ error: 'content is required' }, 400);

  const comment = await collaborationManager.addComment(investigationId, user.id, content);

  // Broadcast comment
  const investigation = await prisma.sharedInvestigation.findUnique({
    where: { id: investigationId },
    select: { workspaceId: true },
  });

  if (investigation) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: investigation.workspaceId,
      eventType: 'workspace.comments.updated',
      payload: { workspaceId: investigation.workspaceId, investigationId, comment },
    });
  }

  return c.json({ comment });
});

/**
 * GET /workspace/analytics
 * Gets aggregated team/workspace analytics
 */
workspaceCoreRoutes.get('/workspace/analytics', async (c) => {
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const analytics = await analyticsManager.getWorkspaceAnalytics(workspaceId);
  return c.json({ analytics });
});

/**
 * POST /workspace/presence
 * Syncs presence details
 */
workspaceCoreRoutes.post('/workspace/presence', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'User resolve failed' }, 400);

  const { workspaceId, activeScreen, cursor } = await c.req.json().catch(() => ({}));
  if (!workspaceId || !activeScreen) {
    return c.json({ error: 'workspaceId and activeScreen are required' }, 400);
  }

  const record = collaborationManager.updatePresence(
    workspaceId,
    user.id,
    user.name || user.email.split('@')[0],
    activeScreen,
    cursor
  );

  const presenceList = collaborationManager.getWorkspacePresence(workspaceId);

  // Broadcast sync event
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'presence.sync',
    payload: { workspaceId, activeScreen, users: presenceList },
  });

  return c.json({ presence: record, activeUsers: presenceList });
});

/**
 * GET /workspace/stream/:workspaceId
 * SSE live sync stream
 */
workspaceCoreRoutes.get('/stream/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    let isAborted = false;

    await stream.writeSSE({
      event: 'system.connected',
      data: JSON.stringify({ status: 'connected', workspaceId }),
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribeAll(async (event) => {
      if (isAborted) return;
      
      const payloadWorkspaceId = event.payload?.workspaceId;
      if (payloadWorkspaceId === workspaceId || event.orchestrationSessionId === workspaceId) {
        try {
          await stream.writeSSE({
            event: event.eventType,
            id: event.id,
            data: JSON.stringify(event.payload),
          });
        } catch (writeErr) {
          // ignore write errors on disconnect
        }
      }
    });

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

    while (!isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });
});
