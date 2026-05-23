export * from './types';
export * from './locks';
export * from './queues';
export * from './parallelism';
export * from './telemetry';
export * from './scheduler';
export * from './recovery';
export * from './execution';
export * from './workers';

import { PrismaClient } from '@fricta/db';
import { QueueOrchestrator } from './queues';
import { SessionLockManager } from './locks';
import { BrowserPoolManager } from './parallelism';
import { DistributedTelemetryService } from './telemetry';
import { RecoverySupervisor } from './recovery';
import { RuntimeWorkerPool } from './workers';
import { logger } from '@fricta/shared';

export interface RuntimeSystem {
  queueOrchestrator: QueueOrchestrator;
  lockManager: SessionLockManager;
  browserPoolManager: BrowserPoolManager;
  telemetryService: DistributedTelemetryService;
  recoverySupervisor: RecoverySupervisor;
  workerPool: RuntimeWorkerPool;
}

let activeRuntime: RuntimeSystem | null = null;

export async function startRuntime(prisma: PrismaClient, workerId: string = `worker-${Math.random().toString(36).substring(7)}`): Promise<RuntimeSystem> {
  if (activeRuntime) return activeRuntime;

  logger.info({ workerId }, 'Initializing Fricta Runtime Infrastructure');

  const queueOrchestrator = new QueueOrchestrator();
  const lockManager = new SessionLockManager(queueOrchestrator.getConnection());
  const browserPoolManager = new BrowserPoolManager();
  
  const telemetryService = new DistributedTelemetryService(
    queueOrchestrator,
    browserPoolManager,
    prisma
  );

  const recoverySupervisor = new RecoverySupervisor(
    prisma,
    queueOrchestrator.getConnection(),
    lockManager,
    queueOrchestrator,
    telemetryService
  );

  const workerPool = new RuntimeWorkerPool(
    workerId,
    prisma,
    queueOrchestrator,
    lockManager,
    telemetryService
  );

  // Start background tasks
  recoverySupervisor.start();
  await workerPool.start();

  activeRuntime = {
    queueOrchestrator,
    lockManager,
    browserPoolManager,
    telemetryService,
    recoverySupervisor,
    workerPool
  };

  return activeRuntime;
}

export async function stopRuntime(): Promise<void> {
  if (!activeRuntime) return;

  logger.info('Stopping Fricta Runtime Infrastructure');
  activeRuntime.recoverySupervisor.stop();
  await activeRuntime.workerPool.stop();
  await activeRuntime.browserPoolManager.closeAll();
  await activeRuntime.queueOrchestrator.closeAll();

  activeRuntime = null;
}
