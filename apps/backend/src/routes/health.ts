import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { connection } from '@fricta/agent';

const health = new Hono();

// Base /health and liveness checks
health.get('/', (c) => {
  return c.json({ status: 'healthy' });
});

health.get('/live', (c) => {
  return c.json({ status: 'healthy' });
});

// Readiness check verifying DB and Redis connectivity
health.get('/ready', async (c) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';
  let isHealthy = true;

  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'failed';
    isHealthy = false;
  }

  // Check Redis
  try {
    const ping = await connection.ping();
    if (ping !== 'PONG') {
      redisStatus = 'failed';
      isHealthy = false;
    }
  } catch (err) {
    redisStatus = 'failed';
    isHealthy = false;
  }

  const responsePayload = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    database: dbStatus,
    redis: redisStatus,
  };

  return c.json(responsePayload, isHealthy ? 200 : 503);
});

// Version endpoint
health.get('/version', (c) => {
  return c.json({
    version: '1.0.0',
    commit: '404080c',
    environment: process.env.NODE_ENV || 'production',
  });
});

export const healthRoutes = health;
