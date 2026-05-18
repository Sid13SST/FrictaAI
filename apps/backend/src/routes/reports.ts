import { Hono } from 'hono';

export const reportRoutes = new Hono()
  .get('/', (c) => c.json({ reports: [] }))
  .get('/:id', (c) => c.json({ id: c.req.param('id'), score: 95, summary: 'Good' }));
