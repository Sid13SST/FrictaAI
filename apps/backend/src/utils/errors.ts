import type { Context } from 'hono';

/**
 * Standardized API Error Response Helpers (Deliverable 7)
 * Ensures consistency across authentication middleware, ownership guards, and route handlers.
 */
export const ApiErrors = {
  unauthorized: (c: Context) =>
    c.json({ error: 'Authentication required' }, 401),

  forbidden: (c: Context) =>
    c.json({ error: 'Access denied' }, 403),

  notFound: (c: Context) =>
    c.json({ error: 'Not found' }, 404),
};
