import { Hono } from 'hono';

export const projectRoutes = new Hono()
  .get('/', (c) => c.json({ projects: [] }))
  .post('/', (c) => c.json({ project: { id: '1', name: 'New Project' } }));
