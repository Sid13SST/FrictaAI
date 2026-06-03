import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { getCurrentUser } from '../middleware/authContext';
import { requireProjectOwner } from '../guards/ownership';
import { memoryProjects } from '../utils/memoryDb';

export const projectRoutes = new Hono();

// GET / - List all projects owned by the authenticated user
projectRoutes.get('/', async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' }
    });
    return c.json({ projects });
  } catch (error: any) {
    console.warn('Prisma project fetch failed, falling back to memory database:', error.message);
    const projects = memoryProjects.filter(p => p.userId === user.userId);
    return c.json({ projects });
  }
});

// POST / - Create a new project for the authenticated user
projectRoutes.post('/', async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const { projectName, websiteUrl } = body;

  if (!projectName || !websiteUrl) {
    return c.json({ error: 'projectName and websiteUrl are required' }, 400);
  }

  let normalizedUrl = websiteUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(normalizedUrl)) {
      normalizedUrl = `http://${normalizedUrl}`;
    } else {
      normalizedUrl = `https://${normalizedUrl}`;
    }
  }

  try {
    // Look up or create local User record if needed, to satisfy database constraints
    let localUser = await prisma.user.findUnique({
      where: { id: user.userId }
    });

    if (!localUser) {
      localUser = await prisma.user.create({
        data: {
          id: user.userId,
          email: user.email || `user-${user.userId}@fricta.ai`,
          name: 'Clerk User',
        }
      });
    }

    const project = await prisma.project.create({
      data: {
        projectName,
        websiteUrl: normalizedUrl,
        userId: localUser.id,
      },
    });

    return c.json({ project });
  } catch (error: any) {
    console.warn('Prisma project create failed, falling back to memory database:', error.message);
    const newProject = {
      id: `project-${Date.now()}`,
      projectName,
      websiteUrl: normalizedUrl,
      userId: user.userId,
      createdAt: new Date(),
    };
    memoryProjects.push(newProject);
    return c.json({ project: newProject });
  }
});

// GET /:id - Fetch a single project (owned by user)
projectRoutes.get('/:id', requireProjectOwner('id'), async (c) => {
  const id = c.req.param('id');
  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });
    if (!project) {
      // Try in-memory
      const memProject = memoryProjects.find(p => p.id === id);
      if (!memProject) return c.json({ error: 'Project not found' }, 404);
      return c.json({ project: memProject });
    }
    return c.json({ project });
  } catch (error: any) {
    const memProject = memoryProjects.find(p => p.id === id);
    if (!memProject) return c.json({ error: 'Project not found' }, 404);
    return c.json({ project: memProject });
  }
});

// PUT /:id - Update a project (owned by user)
projectRoutes.put('/:id', requireProjectOwner('id'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { projectName, websiteUrl } = body;

  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        projectName,
        websiteUrl
      }
    });
    return c.json({ project });
  } catch (error: any) {
    console.warn('Prisma project update failed, updating memory database:', error.message);
    const idx = memoryProjects.findIndex(p => p.id === id);
    if (idx === -1) return c.json({ error: 'Project not found' }, 404);
    if (projectName) memoryProjects[idx].projectName = projectName;
    if (websiteUrl) memoryProjects[idx].websiteUrl = websiteUrl;
    return c.json({ project: memoryProjects[idx] });
  }
});

// DELETE /:id - Delete a project (owned by user)
projectRoutes.delete('/:id', requireProjectOwner('id'), async (c) => {
  const id = c.req.param('id');
  try {
    await prisma.project.delete({
      where: { id }
    });
    return c.json({ success: true });
  } catch (error: any) {
    console.warn('Prisma project delete failed, removing from memory database:', error.message);
    const idx = memoryProjects.findIndex(p => p.id === id);
    if (idx === -1) return c.json({ error: 'Project not found' }, 404);
    memoryProjects.splice(idx, 1);
    return c.json({ success: true });
  }
});
