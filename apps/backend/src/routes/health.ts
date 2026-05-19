import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { connection } from '@fricta/agent/src/queue/connection';
// Assuming we have some browser health check in agent, or we just try to launch one
import { chromium } from 'playwright-core';

const health = new Hono();
const prisma = new PrismaClient();

health.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

health.get('/db', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: 'ok', database: 'connected' });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

health.get('/agent', async (c) => {
  try {
    const ping = await connection.ping();
    return c.json({ status: 'ok', redis: ping === 'PONG' ? 'connected' : 'error' });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

health.get('/browser', async (c) => {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return c.json({ status: 'ok', browser: 'ready' });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

export const healthRoutes = health;
