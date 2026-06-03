import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { resetDatabase, integrationUser, foreignUser } from './setup';
import { clerkMiddleware } from '@hono/clerk-auth';

// Mock @hono/clerk-auth to intercept Bearer token and bypass Clerk network calls
vi.mock('@hono/clerk-auth', () => {
  return {
    clerkMiddleware: () => async (c: any, next: any) => {
      const authHeader = c.req.header('Authorization');
      console.log(`[Mock Clerk Middleware] URL: ${c.req.url} | AuthHeader: ${authHeader}`);
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        console.log(`[Mock Clerk Middleware] Token Extracted: "${token}"`);
        if (token && token !== 'anonymous') {
          c.set('clerkAuth', { userId: token });
        }
      }
      await next();
    },
    getAuth: (c: any) => {
      const auth = c.get('clerkAuth');
      console.log(`[Mock Clerk getAuth] returning:`, auth);
      return auth;
    },
  };
});

import { requireAuth } from '../../middleware/clerkAuth';
import { projectRoutes } from '../../routes/projects';
import { workflowRoutes } from '../../routes/workflows';
import { reportRoutes } from '../../routes/reports';
import { collaborationRoutes } from '../../routes/collaboration';
import { simulationRoutes } from '../../routes/simulation';
import { uxRoutes } from '../../routes/ux';

function createIntegrationApp() {
  const app = new Hono();
  
  app.use('*', clerkMiddleware());

  const protectedApi = new Hono();
  protectedApi.use('*', requireAuth);
  protectedApi.route('/projects', projectRoutes);
  protectedApi.route('/workflows', workflowRoutes);
  protectedApi.route('/reports', reportRoutes);
  protectedApi.route('/collaboration', collaborationRoutes);
  protectedApi.route('/simulation', simulationRoutes);
  protectedApi.route('/ux', uxRoutes);

  app.route('/api', protectedApi);
  return app;
}

describe('Authentication & Authorization Route Integration Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    app = createIntegrationApp();
    await resetDatabase();

    // Setup user accounts in database to satisfy foreign keys
    await prisma.user.createMany({
      data: [
        { id: integrationUser.id, email: integrationUser.email, name: integrationUser.name },
        { id: foreignUser.id, email: foreignUser.email, name: foreignUser.name },
      ],
    });
  });

  describe('Anonymous (Unauthenticated) Access', () => {
    it('should block anonymous requests to protected routes with 401', async () => {
      const res = await app.request('/api/projects');
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication required');
    });

    it('should block anonymous requests with invalid Authorization headers', async () => {
      const res = await app.request('/api/projects', {
        headers: { 'Authorization': 'Bearer anonymous' }
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Ownership Enforcement (403 Access Denied)', () => {
    let projectId: string;
    let sessionId: string;
    let reportId: string;
    let threadId: string;
    let screenshotId: string;

    beforeEach(async () => {
      // 1. Create a Project owned by integrationUser (user_123)
      const project = await prisma.project.create({
        data: {
          projectName: 'Owner Project',
          websiteUrl: 'https://owner.fricta.ai',
          userId: integrationUser.id,
        },
      });
      projectId = project.id;

      // 2. Create Workflow Session under Project
      const session = await prisma.workflowSession.create({
        data: {
          projectId,
          goal: 'Owner Goal',
          status: 'COMPLETED',
          startedAt: new Date(),
        },
      });
      sessionId = session.id;

      // 3. Create Report under Session
      const report = await prisma.uXReport.create({
        data: {
          sessionId,
          summary: 'Owner summary report',
          score: 88,
        },
      });
      reportId = report.id;

      // 4. Create Collaborative Investigation Thread
      const thread = await prisma.investigationThread.create({
        data: {
          projectId,
          workflowSessionId: sessionId,
          title: 'Owner Investigation',
          status: 'ACTIVE',
        },
      });
      threadId = thread.id;

      // 5. Create Workflow Screenshot under Session
      const screenshot = await prisma.workflowScreenshot.create({
        data: {
          workflowSessionId: sessionId,
          screenshotType: 'step',
          filePath: 'welcome_step1.webp',
          thumbnailPath: 'welcome_step1_thumb.webp',
          stepIndex: 1,
          pageUrl: 'https://owner.fricta.ai/welcome',
          viewportWidth: 1280,
          viewportHeight: 720,
          fileSize: 1024,
        },
      });
      screenshotId = screenshot.id;
    });

    it('should reject foreign user attempts to retrieve project details', async () => {
      const res = await app.request(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${foreignUser.id}` },
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Access denied');
    });

    it('should reject foreign user attempts to fetch session workflow screenshots', async () => {
      const res = await app.request(`/api/workflows/screenshots/${screenshotId}`, {
        headers: { 'Authorization': `Bearer ${foreignUser.id}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject foreign user attempts to generate reports for the session', async () => {
      const res = await app.request(`/api/reports/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${foreignUser.id}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject foreign user attempts to fetch report payload', async () => {
      const res = await app.request(`/api/reports/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${foreignUser.id}` },
      });
      expect(res.status).toBe(403);
    });

    it('should reject foreign user attempts to resolve investigation thread', async () => {
      const res = await app.request(`/api/collaboration/investigations/resolve/${threadId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${foreignUser.id}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Successful Owner Access (200 OK)', () => {
    it('should allow owner to fetch their project details', async () => {
      const project = await prisma.project.create({
        data: {
          projectName: 'Owner Project',
          websiteUrl: 'https://owner.fricta.ai',
          userId: integrationUser.id,
        },
      });

      const res = await app.request(`/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${integrationUser.id}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.project.id).toBe(project.id);
    });
  });
});
