import { prisma } from '@fricta/db';
import type { Context, MiddlewareHandler } from 'hono';
import { getCurrentUser } from '../middleware/authContext';
import { memoryProjects, memorySessions } from '../utils/memoryDb';
import { ApiErrors } from '../utils/errors';


/**
 * Standardized ownership verification results:
 * - 'OWNED': User owns the resource or its parent project
 * - 'NOT_OWNED': User does not own the resource or its parent project
 * - 'NOT_FOUND': The resource or parent project does not exist
 */
export type OwnershipResult = 'OWNED' | 'NOT_OWNED' | 'NOT_FOUND';

/**
 * Core validation helper: checks if the given user owns the project.
 * All other ownership assertions must traverse to this check.
 */
export async function verifyProjectOwnership(userId: string, projectId: string): Promise<OwnershipResult> {
  if (!userId || !projectId) return 'NOT_FOUND';

  // Allow access to default demo project for authenticated users
  if (projectId === 'default-mem-project-id') {
    return 'OWNED';
  }

  try {
    // 1. Try finding in DB
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (project) {
      return project.userId === userId ? 'OWNED' : 'NOT_OWNED';
    }

    // 2. Try finding in memory Projects
    const memProject = memoryProjects.find(p => p.id === projectId);
    if (memProject) {
      // In-memory project matches if userId exists and matches, or fallback to unassigned ownership
      if (!memProject.userId) {
        // If not assigned to any user, assign to the requesting user
        memProject.userId = userId;
      }
      return memProject.userId === userId ? 'OWNED' : 'NOT_OWNED';
    }

    return 'NOT_FOUND';
  } catch (error) {
    console.error(`Error checking project ownership for project ${projectId}:`, error);
    return 'NOT_FOUND';
  }
}

/**
 * Traverses from WorkflowSession to Project to verify ownership.
 */
export async function verifyWorkflowOwnership(userId: string, workflowSessionId: string): Promise<OwnershipResult> {
  if (!userId || !workflowSessionId) return 'NOT_FOUND';

  try {
    // 1. Try finding in DB
    const session = await prisma.workflowSession.findUnique({
      where: { id: workflowSessionId },
      select: { projectId: true }
    });

    if (session) {
      return verifyProjectOwnership(userId, session.projectId);
    }

    // 2. Try finding in in-memory sessions fallback
    const memSession = memorySessions.get(workflowSessionId);
    if (memSession && memSession.projectId) {
      return verifyProjectOwnership(userId, memSession.projectId);
    }

    return 'NOT_FOUND';
  } catch (error) {
    console.error(`Error checking workflow ownership for session ${workflowSessionId}:`, error);
    return 'NOT_FOUND';
  }
}

/**
 * Traverses from Report (ExecutiveReport or UXReport) to Project/Workflow to verify ownership.
 */
export async function verifyReportOwnership(userId: string, reportId: string): Promise<OwnershipResult> {
  if (!userId || !reportId) return 'NOT_FOUND';

  try {
    // 1. Try finding it as an ExecutiveReport
    const execReport = await prisma.executiveReport.findUnique({
      where: { id: reportId },
      select: { projectId: true }
    });

    if (execReport) {
      return verifyProjectOwnership(userId, execReport.projectId);
    }

    // 2. Try finding it as a UXReport
    const uxReport = await prisma.uXReport.findUnique({
      where: { id: reportId },
      select: { sessionId: true }
    });

    if (uxReport) {
      return verifyWorkflowOwnership(userId, uxReport.sessionId);
    }

    return 'NOT_FOUND';
  } catch (error) {
    console.error(`Error checking report ownership for report ${reportId}:`, error);
    return 'NOT_FOUND';
  }
}

/**
 * Traverses from InvestigationThread to Project to verify ownership.
 */
export async function verifyInvestigationOwnership(userId: string, threadId: string): Promise<OwnershipResult> {
  if (!userId || !threadId) return 'NOT_FOUND';

  try {
    const thread = await prisma.investigationThread.findUnique({
      where: { id: threadId },
      select: { projectId: true }
    });

    if (!thread) return 'NOT_FOUND';
    return verifyProjectOwnership(userId, thread.projectId);
  } catch (error) {
    console.error(`Error checking investigation ownership for thread ${threadId}:`, error);
    return 'NOT_FOUND';
  }
}

/**
 * Traverses from OperationalAlert to Project to verify ownership.
 */
export async function verifyAlertOwnership(userId: string, alertId: string): Promise<OwnershipResult> {
  if (!userId || !alertId) return 'NOT_FOUND';

  try {
    const alert = await prisma.operationalAlert.findUnique({
      where: { id: alertId },
      select: { projectId: true }
    });

    if (!alert) return 'NOT_FOUND';
    return verifyProjectOwnership(userId, alert.projectId);
  } catch (error) {
    console.error(`Error checking alert ownership for alert ${alertId}:`, error);
    return 'NOT_FOUND';
  }
}

// ─── Assertion Wrappers (Throwing or Direct Boolean) ─────────────────────────

export async function assertProjectOwnership(userId: string, projectId: string): Promise<boolean> {
  const result = await verifyProjectOwnership(userId, projectId);
  return result === 'OWNED';
}

export async function assertWorkflowOwnership(userId: string, workflowSessionId: string): Promise<boolean> {
  const result = await verifyWorkflowOwnership(userId, workflowSessionId);
  return result === 'OWNED';
}

export async function assertReplayOwnership(userId: string, sessionId: string): Promise<boolean> {
  const result = await verifyWorkflowOwnership(userId, sessionId);
  return result === 'OWNED';
}

export async function assertReportOwnership(userId: string, reportId: string): Promise<boolean> {
  const result = await verifyReportOwnership(userId, reportId);
  return result === 'OWNED';
}

export async function assertInvestigationOwnership(userId: string, threadId: string): Promise<boolean> {
  const result = await verifyInvestigationOwnership(userId, threadId);
  return result === 'OWNED';
}

// ─── Hono Middleware Guards ──────────────────────────────────────────────────

function handleOwnershipResult(c: Context, result: OwnershipResult) {
  if (result === 'NOT_FOUND') {
    return ApiErrors.notFound(c);
  }
  if (result === 'NOT_OWNED') {
    return ApiErrors.forbidden(c);
  }
  return null;
}

/**
 * Guard for endpoints where projectId is passed as a path param.
 */
export const requireProjectOwner = (paramName = 'id'): MiddlewareHandler => {
  return async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    const projectId = c.req.param(paramName);
    if (!projectId) {
      return c.json({ error: 'Project ID is required' }, 400);
    }

    const result = await verifyProjectOwnership(user.userId, projectId);
    const errorResponse = handleOwnershipResult(c, result);
    if (errorResponse) return errorResponse;

    await next();
  };
};

/**
 * Guard for endpoints where projectId is passed as a query parameter.
 */
export const requireProjectOwnerQuery = (queryName = 'projectId'): MiddlewareHandler => {
  return async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    const projectId = c.req.query(queryName);
    if (!projectId) {
      return c.json({ error: `Missing ${queryName} query parameter` }, 400);
    }

    const result = await verifyProjectOwnership(user.userId, projectId);
    const errorResponse = handleOwnershipResult(c, result);
    if (errorResponse) return errorResponse;

    await next();
  };
};

/**
 * Guard for endpoints where projectId is passed in the JSON body.
 */
export const requireProjectOwnerBody = (bodyFieldName = 'projectId'): MiddlewareHandler => {
  return async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    // Read body without consuming stream using cloned raw request
    const body = await c.req.raw.clone().json().catch(() => ({}));
    const projectId = body[bodyFieldName];
    if (!projectId) {
      return c.json({ error: `Missing ${bodyFieldName} in request body` }, 400);
    }

    const result = await verifyProjectOwnership(user.userId, projectId);
    const errorResponse = handleOwnershipResult(c, result);
    if (errorResponse) return errorResponse;

    await next();
  };
};

/**
 * Guard for endpoints where workflowSessionId is passed as a path param.
 */
export const requireWorkflowOwner = (paramName = 'id'): MiddlewareHandler => {
  return async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    const sessionId = c.req.param(paramName);
    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    const result = await verifyWorkflowOwnership(user.userId, sessionId);
    const errorResponse = handleOwnershipResult(c, result);
    if (errorResponse) return errorResponse;

    await next();
  };
};

/**
 * Guard for endpoints where reportId is passed as a path param.
 */
export const requireReportOwner = (paramName = 'id'): MiddlewareHandler => {
  return async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    const reportId = c.req.param(paramName);
    if (!reportId) {
      return c.json({ error: 'Report ID is required' }, 400);
    }

    const result = await verifyReportOwnership(user.userId, reportId);
    const errorResponse = handleOwnershipResult(c, result);
    if (errorResponse) return errorResponse;

    await next();
  };
};
