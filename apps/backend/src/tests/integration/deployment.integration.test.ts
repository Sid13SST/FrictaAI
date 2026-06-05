import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { validateEnv } from '../../utils/envValidation';
import { validateStartup } from '../../utils/startupCheck';
import { healthRoutes } from '../../routes/health';
import { customLogger } from '../../middleware/customLogger';
import { prisma } from '@fricta/db';

describe('Release Engineering & Deployment Hardening Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ─── Startup & Environment Variable Validation ─────────────────────────────
  describe('Environment Variable Validation', () => {
    it('should throw an error if any required environment variable is missing', () => {
      // Temporarily delete a required environment variable
      delete process.env.DATABASE_URL;

      expect(() => validateEnv()).toThrow(
        /CRITICAL_STARTUP_ERROR: Missing required environment variables/
      );
    });

    it('should pass validation if all required variables are present', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.CLERK_SECRET_KEY = 'sk_test_key';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_key';
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-key';

      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe('Startup Connectivity Validation', () => {
    it('should throw clear error if database validation fails', async () => {
      // Mock db connector or pass invalid connection string to throw error
      process.env.DATABASE_URL = 'postgresql://invalid_host:5432/invalid_db';
      
      const queryRawSpy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection refused'));
      
      await expect(validateStartup()).rejects.toThrow(/DB_CONNECTION_FAILED/);
      expect(queryRawSpy).toHaveBeenCalled();
    });
  });

  // ─── Health & Version Routes ───────────────────────────────────────────────
  describe('Health check and Liveness routes', () => {
    const app = new Hono();
    app.route('/health', healthRoutes);

    it('should return 200 OK for basic health check', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'healthy' });
    });

    it('should return 200 OK for liveness check', async () => {
      const res = await app.request('/health/live');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'healthy' });
    });

    it('should return 200 OK for readiness check when connections are active', async () => {
      const res = await app.request('/health/ready');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.database).toBe('ok');
      expect(json.redis).toBe('ok');
    });

    it('should return 200 OK for version route', async () => {
      const res = await app.request('/health/version');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        version: '1.0.0',
        commit: '404080c',
        environment: expect.any(String),
      });
    });
  });

  // ─── Structured Logging & Request Tracing ──────────────────────────────────
  describe('Structured Logging Middleware', () => {
    it('should add x-request-id header and log structured JSON with requestId', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const app = new Hono();
      app.use('*', customLogger());
      app.get('/test-route', (c) => c.text('OK'));

      const res = await app.request('/test-route');
      expect(res.status).toBe(200);
      expect(res.headers.get('x-request-id')).toBeDefined();

      expect(consoleSpy).toHaveBeenCalled();
      const loggedText = consoleSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedText);
      
      expect(parsedLog).toHaveProperty('level');
      expect(parsedLog).toHaveProperty('requestId');
      expect(parsedLog).toHaveProperty('method', 'GET');
      expect(parsedLog).toHaveProperty('path', '/test-route');
      expect(parsedLog).toHaveProperty('status', 200);
      expect(parsedLog).toHaveProperty('durationMs');
      expect(parsedLog).toHaveProperty('userId');
    });
  });
});
