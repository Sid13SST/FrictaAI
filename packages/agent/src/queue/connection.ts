import { Redis } from 'ioredis';
import { logger } from '@fricta/shared';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null, // Disable retries so it doesn't spam logs when Redis is down
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

connection.on('connect', () => {
  logger.info('Connected to Redis');
});
