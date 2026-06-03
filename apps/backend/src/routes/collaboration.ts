import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  SharingManager,
  ThreadManager,
  AlertManager,
  DigestManager,
  MentionManager,
  DiscussionManager
} from '@fricta/integration-core';
import { getCurrentUser } from '../middleware/authContext';
import {
  requireProjectOwnerQuery,
  requireProjectOwnerBody,
  verifyInvestigationOwnership,
  verifyAlertOwnership,
  assertProjectOwnership
} from '../guards/ownership';

export const collaborationRoutes = new Hono();

/**
 * POST /api/collaboration/replays
 * Generate a share link/token for a replay session.
 */
collaborationRoutes.post('/replays', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workflowSessionId, sharedWithEmail, notes, expiresInDays } = body;

  if (!projectId || !workflowSessionId) {
    return c.json({ error: 'projectId and workflowSessionId are required' }, 400);
  }

  try {
    const session = await SharingManager.createShareToken({
      projectId,
      workflowSessionId,
      sharedWithEmail,
      notes,
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    });
    return c.json({ success: true, session });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to generate share link' }, 500);
  }
});

/**
 * GET /api/collaboration/replays/validate/:token
 * Validate a share token.
 */
collaborationRoutes.get('/replays/validate/:token', async (c) => {
  const token = c.req.param('token');
  if (!token) {
    return c.json({ error: 'Token is required' }, 400);
  }

  try {
    const session = await SharingManager.validateShareToken(token);
    if (!session) {
      return c.json({ error: 'Invalid or expired share token' }, 404);
    }
    return c.json({ success: true, session });
  } catch (error: any) {
    return c.json({ error: error.message || 'Validation failed' }, 500);
  }
});

/**
 * GET /api/collaboration/replays
 * List active shared sessions for a project.
 */
collaborationRoutes.get('/replays', requireProjectOwnerQuery('projectId'), async (c) => {
  const projectId = c.req.query('projectId')!;
  try {
    const sessions = await SharingManager.listSharedSessions(projectId);
    return c.json({ sessions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/collaboration/investigations
 * Fetch all investigation threads (war rooms) for a project.
 */
collaborationRoutes.get('/investigations', requireProjectOwnerQuery('projectId'), async (c) => {
  const projectId = c.req.query('projectId')!;
  try {
    const threads = await ThreadManager.getThreads(projectId);
    return c.json({ threads });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/investigations
 * Create a new collaborative discussion thread.
 */
collaborationRoutes.post('/investigations', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, title, workflowSessionId, uxFindingId } = body;

  if (!projectId || !title) {
    return c.json({ error: 'projectId and title are required' }, 400);
  }

  try {
    const thread = await ThreadManager.createThread({
      projectId,
      title,
      workflowSessionId,
      uxFindingId,
    });
    return c.json({ success: true, thread });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/threads/discussions
 * Add a comment or annotation to an investigation thread.
 */
collaborationRoutes.post('/threads/discussions', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const body = await c.req.json().catch(() => ({}));
  const { threadId, stepIndex, author, content, x, y } = body;

  if (!threadId || !author || !content) {
    return c.json({ error: 'threadId, author, and content are required' }, 400);
  }

  const result = await verifyInvestigationOwnership(user.userId, threadId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Thread not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  try {
    const annotation = await ThreadManager.addAnnotation({
      threadId,
      stepIndex: stepIndex !== undefined ? parseInt(stepIndex) : 0,
      author,
      content,
      x: x !== undefined ? parseFloat(x) : undefined,
      y: y !== undefined ? parseFloat(y) : undefined,
    });
    return c.json({ success: true, annotation });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/investigations/resolve/:id
 * Mark an investigation thread as resolved.
 */
collaborationRoutes.post('/investigations/resolve/:id', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const threadId = c.req.param('id');
  if (!threadId) {
    return c.json({ error: 'threadId is required' }, 400);
  }

  const result = await verifyInvestigationOwnership(user.userId, threadId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Thread not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  try {
    const thread = await ThreadManager.resolveThread(threadId);
    return c.json({ success: true, thread });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/alerts/escalations
 * Trigger and escalate a manual alert.
 */
collaborationRoutes.post('/alerts/escalations', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, alertType, severity, message, workflowSessionId, channels, recipients } = body;

  if (!projectId || !alertType || !severity || !message) {
    return c.json({ error: 'projectId, alertType, severity, and message are required' }, 400);
  }

  try {
    const alert = await AlertManager.triggerAlert({
      projectId,
      alertType,
      severity,
      message,
      workflowSessionId,
      channels,
      recipients,
    });
    return c.json({ success: true, alert });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/collaboration/alerts/escalations
 * Fetch active alerts for a project.
 */
collaborationRoutes.get('/alerts/escalations', requireProjectOwnerQuery('projectId'), async (c) => {
  const projectId = c.req.query('projectId')!;
  try {
    const alerts = await AlertManager.getAlerts(projectId);
    return c.json({ alerts });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/alerts/resolve/:id
 * Mark an alert as resolved.
 */
collaborationRoutes.post('/alerts/resolve/:id', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const alertId = c.req.param('id');
  if (!alertId) {
    return c.json({ error: 'alertId is required' }, 400);
  }

  const result = await verifyAlertOwnership(user.userId, alertId);
  if (result === 'NOT_FOUND') return c.json({ error: 'Alert not found' }, 404);
  if (result === 'NOT_OWNED') return c.json({ error: 'Access denied' }, 403);

  try {
    const alert = await AlertManager.resolveAlert(alertId);
    return c.json({ success: true, alert });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/collaboration/digests/executive
 * Fetch executive digests for a project.
 */
collaborationRoutes.get('/digests/executive', requireProjectOwnerQuery('projectId'), async (c) => {
  const projectId = c.req.query('projectId')!;
  try {
    const digest = await DigestManager.compileWeeklyDigest(projectId);
    return c.json({ digest });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/digests/executive
 * Subscribe to project executive digests.
 */
collaborationRoutes.post('/digests/executive', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, email, frequency } = body;

  if (!projectId || !email || !frequency) {
    return c.json({ error: 'projectId, email, and frequency are required' }, 400);
  }

  try {
    const subscription = await DigestManager.subscribe(projectId, email, frequency);
    return c.json({ success: true, subscription });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/collaboration/mentions/:username
 * Fetch @mentions for a specific user.
 */
collaborationRoutes.get('/mentions/:username', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const username = c.req.param('username');
  if (!username) {
    return c.json({ error: 'username is required' }, 400);
  }

  try {
    const mentions = await MentionManager.getUserMentions(username);
    
    // Scopes notifications to projects owned by the user
    const filteredMentions = [];
    for (const mention of mentions) {
      const result = await verifyInvestigationOwnership(user.userId, mention.threadId);
      if (result === 'OWNED') {
        filteredMentions.push(mention);
      }
    }

    return c.json({ mentions: filteredMentions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/mentions/read/:id
 * Mark a mention event as read.
 */
collaborationRoutes.post('/mentions/read/:id', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const mentionId = c.req.param('id');
  if (!mentionId) {
    return c.json({ error: 'mentionId is required' }, 400);
  }

  try {
    const mention = await prisma.teamMentionEvent.findUnique({
      where: { id: mentionId },
      select: { threadId: true }
    });
    if (!mention) {
      return c.json({ error: 'Mention not found' }, 404);
    }

    const result = await verifyInvestigationOwnership(user.userId, mention.threadId);
    if (result === 'NOT_OWNED') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const updatedMention = await MentionManager.markAsRead(mentionId);
    return c.json({ success: true, mention: updatedMention });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/collaboration/activity/log
 * Log custom collaborative room activities.
 */
collaborationRoutes.post('/activity/log', requireProjectOwnerBody('projectId'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, roomType, roomId, userEmail, actionType, payload } = body;

  if (!projectId || !roomType || !roomId || !userEmail || !actionType) {
    return c.json({ error: 'projectId, roomType, roomId, userEmail, and actionType are required' }, 400);
  }

  try {
    const log = await DiscussionManager.logRoomActivity(
      projectId,
      roomType,
      roomId,
      userEmail,
      actionType,
      payload
    );
    return c.json({ success: true, log });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
