import { Hono } from 'hono';

export const workflowRoutes = new Hono()
  .get('/', (c) => c.json({ workflows: [] }))
  .post('/run', (c) => c.json({ runId: 'run_123', status: 'PENDING' }));
