/**
 * Authenticated Context Utilities
 *
 * Reusable helpers for route handlers to access the verified Clerk user
 * identity without repeatedly parsing auth data.
 *
 * All functions extract from the Clerk-verified JWT claims attached
 * by clerkMiddleware() and validated by requireAuth.
 *
 * Prepares for Phase 1 Part 2 ownership checks by exposing:
 *   - request.user.id
 *   - request.user.email
 *   - request.user.sessionId
 */

import { getAuth } from '@hono/clerk-auth';
import type { Context } from 'hono';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  /** Clerk user ID (e.g., "user_2abc...") */
  userId: string;
  /** User's primary email, if available from the JWT */
  email?: string;
  /** Clerk session ID */
  sessionId?: string;
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────
/**
 * Returns the authenticated user from the Clerk JWT, or null if not
 * authenticated. Safe to call on both public and protected routes.
 */
export function getCurrentUser(c: Context): AuthenticatedUser | null {
  const auth = getAuth(c);
  if (!auth?.userId) return null;

  return {
    userId: auth.userId,
    sessionId: auth.sessionId ?? undefined,
    // Note: Clerk JWTs do not include email by default.
    // To include email in JWT claims, configure Clerk Dashboard → Sessions → Customize session token.
    // For now, email can be resolved via Clerk's Users API if needed.
    email: undefined,
  };
}

// ─── requireUser ──────────────────────────────────────────────────────────────
/**
 * Returns the authenticated user, or throws a 401 JSON response.
 * Use in protected routes where authentication is guaranteed by requireAuth
 * middleware, but you want an extra safety check.
 *
 * @throws Returns 401 Response if user is not authenticated
 */
export function requireUser(c: Context): AuthenticatedUser {
  const user = getCurrentUser(c);
  if (!user) {
    throw c.json({ error: 'Authentication required' }, 401);
  }
  return user;
}

// ─── getCurrentUserId ─────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's ID string, or null.
 * Convenience shorthand for the most common use case.
 */
export function getCurrentUserId(c: Context): string | null {
  const auth = getAuth(c);
  return auth?.userId ?? null;
}
