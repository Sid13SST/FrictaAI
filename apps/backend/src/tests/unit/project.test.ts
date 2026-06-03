import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';
vi.mock('@fricta/db', () => ({ prisma: mockPrisma })); // Mock Prisma Client import

import { Hono } from 'hono';
import { projectRoutes } from '../../routes/projects';
import { mockProject, mockUser } from '../mocks/fixtures';

// Reusable test app helper
function createTestApp(userId: string = 'user_123') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('clerkAuth', (() => ({ userId })) as any);
    await next();
  });
  app.route('/', projectRoutes);
  return app;
}

describe('Project Lifecycle Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp('user_123');
    vi.clearAllMocks();
  });

  describe('GET / - List Projects', () => {
    it('should retrieve list of projects owned by the user', async () => {
      mockPrisma.project.findMany.mockResolvedValue([mockProject]);

      const res = await app.request('/');
      expect(res.status).toBe(200);
      
      const json = await res.json();
      expect(json.projects).toHaveLength(1);
      expect(json.projects[0].id).toBe(mockProject.id);
      expect(json.projects[0].projectName).toBe(mockProject.projectName);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST / - Create Project', () => {
    it('should successfully create a valid project', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.project.create.mockResolvedValue(mockProject);

      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Test Fricta Project',
          websiteUrl: 'test-fricta.ai',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.project.id).toBe(mockProject.id);
      expect(json.project.websiteUrl).toBe('https://test-fricta.ai'); // Auto-normalized URL
      expect(mockPrisma.project.create).toHaveBeenCalled();
    });

    it('should reject invalid project data (missing projectName or websiteUrl)', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: 'test-fricta.ai',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('projectName and websiteUrl are required');
      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /:id - Fetch Project details', () => {
    it('should return project details if project exists and user owns it', async () => {
      // Mock requireProjectOwner check bypass / verifyProjectOwnership
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const res = await app.request('/project_123');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.project.id).toBe(mockProject.id);
    });
  });

  describe('PUT /:id - Update Project', () => {
    it('should update project details successfully', async () => {
      const updatedProject = { ...mockProject, projectName: 'Updated Project Name' };
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.project.update.mockResolvedValue(updatedProject);

      const res = await app.request('/project_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Updated Project Name',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.project.projectName).toBe('Updated Project Name');
      expect(mockPrisma.project.update).toHaveBeenCalled();
    });
  });

  describe('DELETE /:id - Delete Project', () => {
    it('should remove project correctly', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.project.delete.mockResolvedValue(mockProject);

      const res = await app.request('/project_123', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project_123' },
      });
    });
  });
});
