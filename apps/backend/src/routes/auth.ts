import { Hono } from 'hono';

export const authRoutes = new Hono()
  .post('/login', (c) => c.json({ token: 'placeholder_token' }))
  .post('/register', (c) => c.json({ user: { id: '1', email: 'test@test.com' } }));
