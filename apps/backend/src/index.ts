import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { workflowRoutes } from './routes/workflows';
import { reportRoutes } from './routes/reports';
import { personaRoutes } from './routes/personas';

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/workflows', workflowRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/personas', personaRoutes);

app.get('/health', (c) => c.json({ status: 'ok', service: 'fricta-api' }));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
