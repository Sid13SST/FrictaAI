/**
 * Clerk Authentication Middleware for Fricta Backend
 *
 * Uses @hono/clerk-auth (official Clerk middleware for Hono) to:
 *   1. Parse and verify Clerk JWTs from Authorization headers
 *   2. Handle JWKS rotation, clock skew, and token validation edge cases
 *   3. Attach verified auth context to Hono request context
 *
 * Two middleware layers:
 *   - clerkMiddleware() — global: decodes JWT if present (non-blocking)
 *   - requireAuth       — route-level: blocks unauthenticated requests with 401
 */

import { clerkMiddleware as honoClerkMiddleware, getAuth } from '@hono/clerk-auth';
import type { MiddlewareHandler } from 'hono';
import { ApiErrors } from '../utils/errors';

// ─── Global Clerk Middleware ──────────────────────────────────────────────────
// Apply this globally. It decodes the JWT from the Authorization header
// and attaches claims to the Hono context, but does NOT reject requests.
// This allows public routes to work without tokens.
//
// Options are passed explicitly (instead of letting @hono/clerk-auth read
// env on its own) so CLERK_JWT_KEY is honoured: with it set, Clerk verifies
// session JWTs against that PEM public key locally ("networkless" verification,
// Clerk Dashboard → API Keys → JWT public key) instead of fetching JWKS.
// Unset, behaviour is unchanged: JWKS is fetched using CLERK_SECRET_KEY.
export function clerkMiddleware(): MiddlewareHandler {
  const jwtKey = process.env.CLERK_JWT_KEY?.trim();
  return honoClerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY || '',
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    apiUrl: process.env.CLERK_API_URL,
    apiVersion: process.env.CLERK_API_VERSION,
    ...(jwtKey ? { jwtKey } : {}),
  } as Parameters<typeof honoClerkMiddleware>[0]);
}

export { getAuth };

// ─── requireAuth Middleware ───────────────────────────────────────────────────
// Apply to protected route groups. Checks that clerkMiddleware() produced
// a valid userId. If not, returns standardized 401 JSON responses.

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const auth = getAuth(c);

  // Case 1: No auth data at all — token was missing or completely unparseable
  if (!auth) {
    return ApiErrors.unauthorized(c);
  }

  // Case 2: Auth data exists but no userId — token was invalid or expired
  if (!auth.userId) {
    return ApiErrors.unauthorized(c);
  }

  // Case 3: Valid userId — proceed
  await next();
};
