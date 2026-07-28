/**
 * Authenticated API Client for Fricta Frontend
 *
 * Wraps the native fetch() API to automatically attach Clerk session tokens
 * to all outgoing requests. This ensures every API call includes:
 *
 *   Authorization: Bearer <clerk_session_token>
 *
 * Usage:
 *   import { apiFetch, API_BASE } from '../lib/api';
 *
 *   // Drop-in replacement for fetch()
 *   const res = await apiFetch('/projects');
 *   const data = await res.json();
 *
 *   // With options
 *   const res = await apiFetch('/projects', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name: 'My Project' }),
 *   });
 *
 * IMPORTANT: This module must only be used within components rendered inside
 * <ClerkProvider>. The Clerk session is accessed via window.__clerk__.
 */

// ─── API Base URL ─────────────────────────────────────────────────────────────
// Centralized base URL — all pages should import this instead of hardcoding.
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ─── Clerk Token Accessor ─────────────────────────────────────────────────────
// We use Clerk's global `window.Clerk` instance to get the session token.
// This avoids requiring React hooks and works in any async context.

async function getClerkToken(): Promise<string | null> {
  try {
    // Access the global Clerk instance injected by @clerk/clerk-react
    const clerk = (window as any).Clerk;
    if (!clerk?.session) return null;
    // getToken() returns a fresh JWT string
    const token = await clerk.session.getToken();
    return token;
  } catch {
    return null;
  }
}

// ─── Authenticated Fetch ──────────────────────────────────────────────────────

/**
 * Drop-in replacement for fetch() that auto-attaches Clerk session tokens.
 *
 * @param path - API path (e.g., '/projects') or full URL
 * @param init - Standard RequestInit options
 * @returns Standard Response
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  // Resolve full URL — if path starts with http, use as-is; otherwise prepend API_BASE
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  // Get Clerk session token
  const token = await getClerkToken();

  // Merge auth header into existing headers
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * Convenience: apiFetch with JSON body serialization.
 */
export async function apiPost(
  path: string,
  body: unknown,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  return apiFetch(path, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
