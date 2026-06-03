/**
 * Middleware barrel exports
 */
export { clerkMiddleware, requireAuth, getAuth } from './clerkAuth';
export { getCurrentUser, requireUser, getCurrentUserId, resolveUser } from './authContext';
export type { AuthenticatedUser } from './authContext';
