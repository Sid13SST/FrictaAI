import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { honoClerk, authState } = vi.hoisted(() => ({
  honoClerk: vi.fn((_opts: unknown) => async (_c: unknown, next: () => Promise<void>) => next()),
  authState: { value: null as { userId: string | null } | null },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: honoClerk,
  getAuth: () => authState.value,
}));

import { Hono } from 'hono';
import { clerkMiddleware, requireAuth } from '../../middleware/clerkAuth';

describe('clerkMiddleware options', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    honoClerk.mockClear();
    delete process.env.CLERK_JWT_KEY;
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_x';
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('passes the secret and publishable keys and no jwtKey when CLERK_JWT_KEY is unset', () => {
    clerkMiddleware();
    const opts = honoClerk.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.secretKey).toBe('sk_test_x');
    expect(opts.publishableKey).toBe('pk_test_x');
    expect('jwtKey' in opts).toBe(false);
  });

  it('passes a trimmed jwtKey for networkless verification when CLERK_JWT_KEY is set', () => {
    process.env.CLERK_JWT_KEY = '  PEM-KEY  ';
    clerkMiddleware();
    const opts = honoClerk.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.jwtKey).toBe('PEM-KEY');
  });

  it('falls back to empty keys when env is missing', () => {
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;
    clerkMiddleware();
    const opts = honoClerk.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.secretKey).toBe('');
    expect(opts.publishableKey).toBe('');
  });
});

describe('requireAuth auth states', () => {
  const app = new Hono();
  app.get('/p', requireAuth, (c) => c.json({ ok: true }));

  it('401 when there is no auth object at all', async () => {
    authState.value = null;
    expect((await app.request('/p')).status).toBe(401);
  });

  it('401 when auth has no userId', async () => {
    authState.value = { userId: null };
    expect((await app.request('/p')).status).toBe(401);
  });

  it('200 when auth has a userId', async () => {
    authState.value = { userId: 'user_1' };
    expect((await app.request('/p')).status).toBe(200);
  });
});
