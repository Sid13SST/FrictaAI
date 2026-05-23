import { Redis } from 'ioredis';
import { QueueOrchestrator } from '../queues';
import { BrowserPoolManager } from '../parallelism';
import { RuntimeTelemetry, WorkerHealth, QueueMetrics } from '../types';
import { PrismaClient } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { logger } from '@fricta/shared';

export class DistributedTelemetryService {
  private redis: Redis;
  private prisma: PrismaClient;
  private queueOrchestrator: QueueOrchestrator;
  private browserPoolManager: BrowserPoolManager;

  constructor(
    queueOrchestrator: QueueOrchestrator,
    browserPoolManager: BrowserPoolManager,
    prisma: PrismaClient
  ) {
    this.queueOrchestrator = queueOrchestrator;
    this.browserPoolManager = browserPoolManager;
    this.redis = queueOrchestrator.getConnection();
    this.prisma = prisma;
  }

  /**
   * Report worker heartbeat statistics to Redis.
   */
  async reportWorkerHeartbeat(
    workerId: string,
    activeJobs: number,
    cpuUsage: number,
    memoryUsage: number
  ): Promise<void> {
    const key = `fricta:telemetry:worker:${workerId}`;
    const payload: WorkerHealth = {
      workerId,
      status: 'ACTIVE',
      cpuUsage,
      memoryUsage,
      activeJobs,
      lastHeartbeat: new Date().toISOString(),
    };

    try {
      await this.redis.set(key, JSON.stringify(payload), 'EX', 15); // Expiry in 15 seconds
      logger.debug({ workerId, activeJobs }, 'Worker heartbeat reported');
    } catch (err) {
      logger.error({ err, workerId }, 'Failed to report worker heartbeat');
    }
  }

  /**
   * Fetch health info of all active workers from Redis.
   */
  async getActiveWorkers(): Promise<WorkerHealth[]> {
    try {
      const keys = await this.redis.keys('fricta:telemetry:worker:*');
      if (keys.length === 0) return [];

      const values = await this.redis.mget(...keys);
      return values
        .filter((val): val is string => !!val)
        .map((val) => JSON.parse(val) as WorkerHealth);
    } catch (err) {
      logger.error({ err }, 'Failed to retrieve active workers');
      return [];
    }
  }

  /**
   * Aggregate queue counts from BullMQ.
   */
  async getQueueMetrics(): Promise<QueueMetrics[]> {
    const names = [
      'orchestration-queue',
      'agent-task-queue',
      'replay-processing-queue',
      'screenshot-processing-queue',
      'correlation-queue',
      'recovery-queue',
      'export-queue',
    ];

    const metrics: QueueMetrics[] = [];
    for (const name of names) {
      const q = this.queueOrchestrator.getQueue(name);
      if (q) {
        try {
          const counts = await q.getJobCounts(
            'active',
            'waiting',
            'completed',
            'failed',
            'delayed'
          );
          metrics.push({
            name,
            active: counts.active || 0,
            waiting: counts.waiting || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
          });
        } catch (err) {
          logger.error({ err, queueName: name }, 'Failed to get job counts');
        }
      }
    }
    return metrics;
  }

  /**
   * Log a recovery event count.
   */
  async incrementRecoveryCount(sessionId: string): Promise<void> {
    const key = `fricta:telemetry:recovery:count:${sessionId}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400); // 1 day expire
  }

  /**
   * Get total recovery events count for a session.
   */
  async getRecoveryCount(sessionId: string): Promise<number> {
    const key = `fricta:telemetry:recovery:count:${sessionId}`;
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Reconstruct and stream a snapshot of the runtime telemetry.
   */
  async getSnapshot(): Promise<RuntimeTelemetry> {
    const [queues, workers] = await Promise.all([
      this.getQueueMetrics(),
      this.getActiveWorkers(),
    ]);

    const activeSessionsCount = await this.prisma.orchestrationSession.count({
      where: { status: 'RUNNING' },
    });

    const errorCount = queues.reduce((sum, q) => sum + q.failed, 0);

    return {
      timestamp: new Date().toISOString(),
      queues,
      workers,
      browserPool: this.browserPoolManager.getStatus(),
      activeSessions: activeSessionsCount,
      totalErrors: errorCount,
    };
  }

  /**
   * Publishes periodic telemetry update events to the Realtime Event Bus.
   */
  async publishTelemetryEvent(sessionId: string): Promise<void> {
    const snapshot = await this.getSnapshot();
    RealtimeEventBus.getInstance().publish({
      timestamp: snapshot.timestamp,
      orchestrationSessionId: sessionId,
      eventType: 'runtime.telemetry',
      payload: snapshot,
    });
  }
}
