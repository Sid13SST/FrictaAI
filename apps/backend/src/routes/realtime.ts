import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  streamOrchestration,
  streamTimeline,
  streamAgents,
  streamMemory,
  streamReplay,
  streamInsights
} from '@fricta/realtime';

export const realtimeRoutes = new Hono();

realtimeRoutes.get('/orchestration/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamOrchestration(c, prisma, sessionId);
});

realtimeRoutes.get('/timeline/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamTimeline(c, prisma, sessionId);
});

realtimeRoutes.get('/agents/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamAgents(c, prisma, sessionId);
});

realtimeRoutes.get('/memory/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamMemory(c, prisma, sessionId);
});

realtimeRoutes.get('/replay/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamReplay(c, prisma, sessionId);
});

realtimeRoutes.get('/insights/:id', async (c) => {
  const sessionId = c.req.param('id');
  return streamInsights(c, prisma, sessionId);
});
