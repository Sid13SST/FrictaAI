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

import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import type { MiddlewareHandler } from 'hono';
import { ApiErrors } from '../utils/errors';

// ─── Global Clerk Middleware ──────────────────────────────────────────────────
// Apply this globally. It decodes the JWT from the Authorization header
// and attaches claims to the Hono context, but does NOT reject requests.
// This allows public routes to work without tokens.
export { clerkMiddleware, getAuth };

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
