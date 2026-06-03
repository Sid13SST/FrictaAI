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
import type { Context, MiddlewareHandler } from 'hono';

// ─── Global Clerk Middleware ──────────────────────────────────────────────────
// Apply this globally. It decodes the JWT from the Authorization header
// and attaches claims to the Hono context, but does NOT reject requests.
// This allows public routes to work without tokens.
export { clerkMiddleware, getAuth };

// ─── Auth Error Response Helpers ──────────────────────────────────────────────

interface AuthErrorResponse {
  error: string;
}

function authError(c: Context, message: string, status: 401 | 403 = 401) {
  return c.json<AuthErrorResponse>({ error: message }, status);
}

// ─── requireAuth Middleware ───────────────────────────────────────────────────
// Apply to protected route groups. Checks that clerkMiddleware() produced
// a valid userId. If not, returns standardized 401 JSON responses.

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const auth = getAuth(c);

  // Case 1: No auth data at all — token was missing or completely unparseable
  if (!auth) {
    return authError(c, 'Authentication required');
  }

  // Case 2: Auth data exists but no userId — token was invalid or expired
  if (!auth.userId) {
    // Attempt to distinguish between invalid and expired tokens.
    // The @hono/clerk-auth middleware sets auth object even on failure,
    // but without a userId. We check if a token was actually sent.
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return authError(c, 'Authentication required');
    }

    // Token was sent but couldn't be verified — could be expired or invalid
    return authError(c, 'Invalid authentication token');
  }

  // Case 3: Valid userId — proceed
  await next();
};
