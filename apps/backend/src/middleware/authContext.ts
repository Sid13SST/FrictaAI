/**
 * Authenticated Context Utilities
 *
 * Reusable helpers for route handlers to access the verified Clerk user
 * identity without repeatedly parsing auth data.
 *
 * All functions extract from the Clerk-verified JWT claims attached
 * by clerkMiddleware() and validated by requireAuth.
 */

import { getAuth } from '@hono/clerk-auth';
import type { Context } from 'hono';
import { prisma } from '@fricta/db';

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

// ─── resolveUser ──────────────────────────────────────────────────────────────
/**
 * Resolves the authenticated user's Prisma record from the local database
 * using their Clerk verified identity, automatically bootstrapping a local record
 * if they are logging in for the first time.
 */
export async function resolveUser(c: Context): Promise<any> {
  const clerkUser = getCurrentUser(c);
  if (!clerkUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.userId }
  });

  if (user) return user;

  // Bootstrap a local user record to maintain foreign key integrity
  try {
    return await prisma.user.create({
      data: {
        id: clerkUser.userId,
        email: clerkUser.email || `user-${clerkUser.userId}@fricta.ai`,
        name: 'Clerk User',
      }
    });
  } catch (error: any) {
    console.error(`Failed to bootstrap local user ${clerkUser.userId}:`, error.message);
    return null;
  }
}
