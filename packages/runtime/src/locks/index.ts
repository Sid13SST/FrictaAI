import { Redis } from 'ioredis';
import { logger } from '@fricta/shared';

export type LockType =
  | 'execution'
  | 'replay_sync'
  | 'memory_mutation'
  | 'correlation_gen'
  | 'export';

export class SessionLockManager {
  private redis: Redis;

  constructor(redisOrUrl?: Redis | string) {
    if (redisOrUrl instanceof Redis) {
      this.redis = redisOrUrl;
    } else {
      const url = redisOrUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, { maxRetriesPerRequest: null });
    }
  }

  private getLockKey(sessionId: string, lockType: LockType): string {
    return `fricta:lock:${lockType}:${sessionId}`;
  }

  /**
   * Acquire a lock using Redis SET NX PX.
   */
  async acquire(
    sessionId: string,
    lockType: LockType,
    ownerId: string,
    ttlMs: number = 30000
  ): Promise<boolean> {
    const key = this.getLockKey(sessionId, lockType);
    try {
      const result = await this.redis.set(key, ownerId, 'NX' as any, 'PX' as any, ttlMs as any);
      const success = result === 'OK';
      if (success) {
        logger.info({ key, ownerId, ttlMs }, 'Distributed lock acquired successfully');
      } else {
        logger.debug({ key, ownerId }, 'Failed to acquire distributed lock (already locked)');
      }
      return success;
    } catch (err) {
      logger.error({ err, key, ownerId }, 'Error acquiring distributed lock');
      return false;
    }
  }

  /**
   * Release a lock. Uses a Lua script to ensure safe release (only release if we own it).
   */
  async release(sessionId: string, lockType: LockType, ownerId: string): Promise<boolean> {
    const key = this.getLockKey(sessionId, lockType);
    const luaScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    try {
      const result = await this.redis.eval(luaScript, 1, key, ownerId);
      const success = result === 1;
      if (success) {
        logger.info({ key, ownerId }, 'Distributed lock released successfully');
      } else {
        logger.warn({ key, ownerId }, 'Failed to release lock (not owned or expired)');
      }
      return success;
    } catch (err) {
      logger.error({ err, key, ownerId }, 'Error releasing distributed lock');
      return false;
    }
  }

  /**
   * Check if a lock is currently active.
   */
  async isLocked(sessionId: string, lockType: LockType): Promise<boolean> {
    const key = this.getLockKey(sessionId, lockType);
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (err) {
      logger.error({ err, key }, 'Error checking distributed lock status');
      return false;
    }
  }

  /**
   * Retrieve the owner of a lock.
   */
  async getOwner(sessionId: string, lockType: LockType): Promise<string | null> {
    const key = this.getLockKey(sessionId, lockType);
    try {
      return await this.redis.get(key);
    } catch (err) {
      logger.error({ err, key }, 'Error getting distributed lock owner');
      return null;
    }
  }
}
