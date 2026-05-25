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
import { runtimeRoutes } from './routes/runtime';
import { historicalRoutes } from './routes/historical';
import { workspaceRoutes } from './routes/workspace';
import { simulationRoutes } from './routes/simulation';
import { cognitionRoutes } from './routes/cognition';
import { startWorker } from '@fricta/agent';
import { startRuntime } from '@fricta/runtime';
import { prisma } from '@fricta/db';

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
app.route('/api/runtime', runtimeRoutes);
app.route('/api/historical', historicalRoutes);
app.route('/historical', historicalRoutes);
app.route('/api/workspace', workspaceRoutes);
app.route('/api/simulation', simulationRoutes);
app.route('/api/cognition', cognitionRoutes);

app.get('/health', (c) => c.json({ status: 'ok', service: 'fricta-api' }));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`Server is running on port ${port}`);

// Start BullMQ Worker
startWorker();
// Start Runtime Infrastructure (Workers, Supervisor, Telemetry)
startRuntime(prisma).catch((err) => {
  console.error('Failed to start distributed runtime:', err);
});

serve({
  fetch: app.fetch,
  port
});
