import { Hono } from 'hono';
import { register } from '../utils/metrics';
import { getAlerts } from '../utils/alerting';
import * as os from 'os';

export const observabilityRoutes = new Hono();

observabilityRoutes.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

observabilityRoutes.get('/alerts', (c) => {
  return c.json({ alerts: getAlerts() });
});

observabilityRoutes.get('/stats', (c) => {
  const memory = process.memoryUsage();
  return c.json({
    uptime: process.uptime(),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
    },
    cpu: os.loadavg(),
    buildInfo: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});
