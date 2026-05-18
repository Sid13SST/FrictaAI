import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';

export const projectRoutes = new Hono();
const prisma = new PrismaClient();

// In-memory fallback database
const memoryProjects: any[] = [
  {
    id: 'default-mem-project-id',
    projectName: 'Demo E-commerce Project (In-Memory Fallback)',
    websiteUrl: 'https://example.com',
    createdAt: new Date(),
  }
];

projectRoutes.get('/', async (c) => {
  try {
    const projects = await prisma.project.findMany();
    return c.json({ projects });
  } catch (error: any) {
    console.warn('Prisma project fetch failed, falling back to memory database:', error.message);
    return c.json({ projects: memoryProjects });
  }
});

projectRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectName, websiteUrl, userId } = body;

  if (!projectName || !websiteUrl) {
    return c.json({ error: 'projectName and websiteUrl are required' }, 400);
  }

  try {
    // Find or create a default user if userId is not provided
    let actualUserId = userId;
    if (!actualUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        actualUserId = defaultUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: 'default-user@fricta.ai',
            name: 'Default User',
          },
        });
        actualUserId = newUser.id;
      }
    }

    const project = await prisma.project.create({
      data: {
        projectName,
        websiteUrl,
        userId: actualUserId,
      },
    });

    return c.json({ project });
  } catch (error: any) {
    console.warn('Prisma project create failed, falling back to memory database:', error.message);
    const newProject = {
      id: `project-${Date.now()}`,
      projectName,
      websiteUrl,
      createdAt: new Date(),
    };
    memoryProjects.push(newProject);
    return c.json({ project: newProject });
  }
});
