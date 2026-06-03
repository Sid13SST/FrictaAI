import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ─── Auth Middleware ──────────────────────────────────────────────────────────
import { clerkMiddleware, requireAuth } from './middleware';

// ─── Route Imports ────────────────────────────────────────────────────────────
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
import { wisdomRoutes } from './routes/wisdom';
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

// ─── Global Middlewares ───────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', cors());

// SSE query token rewrite middleware: intercepts ?token=... query parameter
// and rewrites it to the Authorization header to support SSE clients.
app.use('*', async (c, next) => {
  const token = c.req.query('token');
  if (token) {
    c.req.raw.headers.set('Authorization', `Bearer ${token}`);
  }
  await next();
});

// Clerk JWT decoding — non-blocking. Decodes the JWT from the Authorization
// header if present and attaches claims to the Hono context. Does NOT reject
// requests without tokens. This allows public routes to work normally.
app.use('*', clerkMiddleware());


// ─── PUBLIC Routes (No Authentication Required) ──────────────────────────────
// Health checks — infrastructure monitoring, no user data
app.route('/api/health', healthRoutes);
app.get('/health', (c) => c.json({ status: 'ok', service: 'fricta-api' }));

// Auth endpoints — login/register (placeholder, logically public)
app.route('/api/auth', authRoutes);

// Public API — uses its own API key authentication via ApiKeyManager
app.route('/api/public', publicRoutes);
app.route('/public', publicRoutes);

// Realtime/SSE — temporary exemption for Phase 1 Part 1
// SSE connections cannot easily send Authorization headers.
// Will be addressed in Phase 1 Part 2 with proper realtime auth strategy.
app.route('/realtime', realtimeRoutes);
app.route('/api/realtime', realtimeRoutes);

// ─── PROTECTED Routes (Clerk Authentication Required) ─────────────────────────
// All routes below this point require a valid Clerk JWT.
// The requireAuth middleware checks that clerkMiddleware() produced a valid
// userId. If not, it returns a standardized 401 JSON response.

const protectedApi = new Hono();
protectedApi.use('*', requireAuth);

// Core platform
protectedApi.route('/projects', projectRoutes);
protectedApi.route('/workflows', workflowRoutes);
protectedApi.route('/reports', reportRoutes);
protectedApi.route('/personas', personaRoutes);
protectedApi.route('/agent', agentRoutes);
protectedApi.route('/visual', visualRoutes);
protectedApi.route('/ux', uxRoutes);

// Orchestration & agents
protectedApi.route('/orchestrator', orchestratorRoutes);
protectedApi.route('/agents', agentsRoutes);
protectedApi.route('/memory', memoryRoutes);
protectedApi.route('/console', consoleRoutes);
protectedApi.route('/runtime', runtimeRoutes);

// Intelligence systems
protectedApi.route('/historical', historicalRoutes);
protectedApi.route('/cognition', cognitionRoutes);
protectedApi.route('/predictive', predictiveRoutes);
protectedApi.route('/intelligence', intelligenceRoutes);
protectedApi.route('/redesign', redesignRoutes);
protectedApi.route('/autonomous', autonomousRoutes);
protectedApi.route('/strategy', strategyRoutes);
protectedApi.route('/outcomes', outcomesRoutes);
protectedApi.route('/portfolio', portfolioRoutes);
protectedApi.route('/executive', executiveRoutes);
protectedApi.route('/knowledge', knowledgeRoutes);
protectedApi.route('/learning', learningRoutes);
protectedApi.route('/forecasts', forecastsRoutes);
protectedApi.route('/wisdom', wisdomRoutes);
protectedApi.route('/live', liveIntelligenceRoutes);
protectedApi.route('/optimization', optimizationRoutes);

// Enterprise systems
protectedApi.route('/workspace', workspaceRoutes);
protectedApi.route('/simulation', simulationRoutes);
protectedApi.route('/swarm', swarmRoutes);
protectedApi.route('/rbac', rbacCoreRoutes);
protectedApi.route('/security', securityRoutes);

// Integrations & collaboration
protectedApi.route('/integrations', integrationRoutes);
protectedApi.route('/collaboration', collaborationRoutes);
protectedApi.route('/telemetry', telemetryRoutes);

// Mount all protected routes under /api
app.route('/api', protectedApi);

// ─── Protected Non-Prefixed Routes ───────────────────────────────────────────
// These duplicate mounts (without /api prefix) also need protection.
const protectedRoot = new Hono();
protectedRoot.use('*', requireAuth);

protectedRoot.route('/orchestrator', orchestratorRoutes);
protectedRoot.route('/agents', agentsRoutes);
protectedRoot.route('/console', consoleRoutes);
protectedRoot.route('/historical', historicalRoutes);
protectedRoot.route('/swarm', swarmRoutes);
protectedRoot.route('/predictive', predictiveRoutes);
protectedRoot.route('/rbac', rbacCoreRoutes);
protectedRoot.route('/redesign', redesignRoutes);
protectedRoot.route('/autonomous', autonomousRoutes);
protectedRoot.route('/strategy', strategyRoutes);
protectedRoot.route('/outcomes', outcomesRoutes);
protectedRoot.route('/portfolio', portfolioRoutes);
protectedRoot.route('/executive', executiveRoutes);
protectedRoot.route('/knowledge', knowledgeRoutes);
protectedRoot.route('/learning', learningRoutes);
protectedRoot.route('/forecasts', forecastsRoutes);
protectedRoot.route('/wisdom', wisdomRoutes);
protectedRoot.route('/integrations', integrationRoutes);
protectedRoot.route('/collaboration', collaborationRoutes);
protectedRoot.route('/telemetry', telemetryRoutes);
protectedRoot.route('/optimization', optimizationRoutes);

app.route('/', protectedRoot);

// Engineering & workspace core routes (mounted at /api and / root)
// These need special handling since they mount at the root path
const protectedEngineering = new Hono();
protectedEngineering.use('*', requireAuth);
protectedEngineering.route('/', engineeringRoutes);
protectedEngineering.route('/', workspaceCoreRoutes);

app.route('/api', protectedEngineering);
app.route('/', protectedEngineering);

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
