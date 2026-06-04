import { prisma } from '@fricta/db';
import { connection } from '@fricta/agent';
import { validateEnv } from './envValidation';
import * as fs from 'fs';
import * as path from 'path';

export async function validateStartup(): Promise<void> {
  // 1. Validate Environment Variables
  validateEnv();

  // 2. Validate Database Connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    throw new Error(`DB_CONNECTION_FAILED: Could not connect to PostgreSQL database. Details: ${err.message}`);
  }

  // 3. Validate Redis Connectivity
  try {
    const ping = await connection.ping();
    if (ping !== 'PONG') {
      throw new Error(`Redis ping returned: ${ping}`);
    }
  } catch (err: any) {
    throw new Error(`REDIS_CONNECTION_FAILED: Could not connect to Redis server. Details: ${err.message}`);
  }

  // 4. Validate Migration State
  try {
    // Locate local migrations directory
    const migrationsPaths = [
      path.resolve(__dirname, '../../../../packages/db/prisma/migrations'),
      path.resolve(process.cwd(), 'packages/db/prisma/migrations'),
      path.resolve(process.cwd(), '../../packages/db/prisma/migrations')
    ];

    let migrationsDir = '';
    for (const p of migrationsPaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }

    if (!migrationsDir) {
      throw new Error('MIGRATION_VALIDATION_FAILED: Could not locate migrations folder.');
    }

    // Read local migration folders
    const localMigrations = fs.readdirSync(migrationsDir)
      .filter(item => {
        const itemPath = path.join(migrationsDir, item);
        return fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'migration.sql'));
      })
      .sort();

    // Query applied migrations from the DB
    const appliedMigrations = await prisma.$queryRaw<any[]>`
      SELECT migration_name, applied_steps_count FROM _prisma_migrations
    `.catch((err) => {
      throw new Error(`Could not query _prisma_migrations table. Details: ${err.message}`);
    });

    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));

    // Check missing migrations
    const unapplied: string[] = [];
    for (const migration of localMigrations) {
      if (!appliedNames.has(migration)) {
        unapplied.push(migration);
      }
    }

    const currentMigration = localMigrations.length > 0 ? localMigrations[localMigrations.length - 1] : 'None';
    const latestAppliedMigration = appliedMigrations.length > 0
      ? appliedMigrations.sort((a, b) => a.migration_name.localeCompare(b.migration_name))[appliedMigrations.length - 1].migration_name
      : 'None';

    console.log(`[Startup Validation] Current local migration folder: ${currentMigration}`);
    console.log(`[Startup Validation] Latest applied migration in DB: ${latestAppliedMigration}`);

    if (unapplied.length > 0) {
      console.error(`[Startup Validation] Missing migrations in database: ${unapplied.join(', ')}`);
      throw new Error(`MIGRATION_STATE_OUT_OF_SYNC: The database is missing ${unapplied.length} migrations. Run 'npx prisma migrate deploy'.`);
    }

    console.log('[Startup Validation] Migration Status: Up-to-date');

  } catch (err: any) {
    if (err.message.includes('MIGRATION_STATE_OUT_OF_SYNC') || err.message.includes('MIGRATION_VALIDATION_FAILED')) {
      throw err;
    }
    // Fallback if _prisma_migrations table doesn't exist yet (fresh database setup)
    console.warn(`[Startup Validation] Database migration table query skipped or failed: ${err.message}`);
  }
}
