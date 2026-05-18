import { Hono } from 'hono';

export const personaRoutes = new Hono()
  .get('/', (c) => c.json({ personas: [{ id: '1', name: 'Confused User' }] }));
