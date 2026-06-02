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
import { swarmRoutes } from './routes/swarm';
import { predictiveRoutes } from './routes/predictive';
import { workspaceCoreRoutes } from './routes/workspaceCore';
import { rbacCoreRoutes } from './routes/rbacCore';
import { securityRoutes } from './routes/security';
import { intelligenceRoutes } from './routes/intelligence';
import { redesignRoutes } from './routes/redesign';
import { autonomousRoutes } from './routes/autonomous';
import { strategyRoutes } from './routes/strategy';
import { outcomesRoutes } from './routes/outcomes';
import { portfolioRoutes } from './routes/portfolio';
import { executiveRoutes } from './routes/executive';
import { knowledgeRoutes } from './routes/knowledge';
import { learningRoutes } from './routes/learning';
import { forecastsRoutes } from './routes/forecasts';
import { integrationRoutes } from './routes/integrations';
import { engineeringRoutes } from './routes/engineering';
import { collaborationRoutes } from './routes/collaboration';
import { publicRoutes } from './routes/public';
import { telemetryRoutes } from './routes/telemetry';
import { liveIntelligenceRoutes } from './routes/liveIntelligence';
import { optimizationRoutes } from './routes/optimization';
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
app.route('/api/swarm', swarmRoutes);
app.route('/swarm', swarmRoutes);
app.route('/api/predictive', predictiveRoutes);
app.route('/predictive', predictiveRoutes);
app.route('/api/rbac', rbacCoreRoutes);
app.route('/rbac', rbacCoreRoutes);
app.route('/api/security', securityRoutes);
app.route('/api/intelligence', intelligenceRoutes);
app.route('/api/redesign', redesignRoutes);
app.route('/redesign', redesignRoutes);
app.route('/api/autonomous', autonomousRoutes);
app.route('/autonomous', autonomousRoutes);
app.route('/api/strategy', strategyRoutes);
app.route('/strategy', strategyRoutes);
app.route('/api/outcomes', outcomesRoutes);
app.route('/outcomes', outcomesRoutes);
app.route('/api/portfolio', portfolioRoutes);
app.route('/portfolio', portfolioRoutes);
app.route('/api/executive', executiveRoutes);
app.route('/executive', executiveRoutes);
app.route('/api/knowledge', knowledgeRoutes);
app.route('/knowledge', knowledgeRoutes);
app.route('/api/learning', learningRoutes);
app.route('/learning', learningRoutes);
app.route('/api/forecasts', forecastsRoutes);
app.route('/forecasts', forecastsRoutes);
app.route('/api/integrations', integrationRoutes);
app.route('/integrations', integrationRoutes);
app.route('/api/collaboration', collaborationRoutes);
app.route('/collaboration', collaborationRoutes);
app.route('/api/public', publicRoutes);
app.route('/public', publicRoutes);
app.route('/api/telemetry', telemetryRoutes);
app.route('/telemetry', telemetryRoutes);
app.route('/api/live', liveIntelligenceRoutes);
app.route('/api/optimization', optimizationRoutes);
app.route('/optimization', optimizationRoutes);
app.route('/api', engineeringRoutes);
app.route('/', engineeringRoutes);
app.route('/api', workspaceCoreRoutes);
app.route('/', workspaceCoreRoutes);

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
