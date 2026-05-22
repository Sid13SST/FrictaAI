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
import { agentRoutes } from './routes/agent';
import { healthRoutes } from './routes/health';
import { visualRoutes } from './routes/visual';
import { uxRoutes } from './routes/ux';
import { orchestratorRoutes } from './routes/orchestrator';
import { agentsRoutes } from './routes/agents';
import { memoryRoutes } from './routes/memory';
import { consoleRoutes } from './routes/console';
import { realtimeRoutes } from './routes/realtime';
import { startWorker } from '@fricta/agent';

// Trigger reload for EADDRINUSE resolution
const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/workflows', workflowRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/personas', personaRoutes);
app.route('/api/agent', agentRoutes);
app.route('/api/visual', visualRoutes);
app.route('/api/ux', uxRoutes);
app.route('/api/orchestrator', orchestratorRoutes);
app.route('/orchestrator', orchestratorRoutes);
app.route('/api/agents', agentsRoutes);
app.route('/agents', agentsRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/console', consoleRoutes);
app.route('/console', consoleRoutes);
app.route('/realtime', realtimeRoutes);
app.route('/api/realtime', realtimeRoutes);

app.get('/health', (c) => c.json({ status: 'ok', service: 'fricta-api' }));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`Server is running on port ${port}`);

// Start BullMQ Worker
startWorker();

serve({
  fetch: app.fetch,
  port
});
