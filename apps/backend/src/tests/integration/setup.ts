import { prisma } from '@fricta/db';

/**
 * Dynamically truncates all user tables in the fricta_test database,
 * preserving schema structures and prisma migrations.
 */
export async function resetDatabase() {
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public';
    `;

    const names = tables
      .map(t => t.tablename)
      .filter(name => name !== '_prisma_migrations')
      .map(name => `"public"."${name}"`)
      .join(', ');

    if (names.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE;`);
    }
  } catch (error: any) {
    console.error('[Integration Test Setup] Database reset failed:', error.message);
    throw error;
  }
}

// ─── Reusable Integration Fixtures ──────────────────────────────────────────

export const integrationUser = {
  id: 'user_123',
  email: 'test@fricta.dev',
  name: 'Test Integration User',
};

export const foreignUser = {
  id: 'user_different',
  email: 'other@fricta.dev',
  name: 'Different Integration User',
};

export const integrationProject = {
  projectName: 'Test Integration Project',
  websiteUrl: 'https://test-fricta.ai',
};

export const integrationWorkflow = {
  goal: 'Test User Workflow Goal',
  persona: 'BEGINNER',
};
