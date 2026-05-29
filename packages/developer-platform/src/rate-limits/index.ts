import { prisma } from '@fricta/db';

export class RateLimiter {
  /**
   * Evaluates rate limits using a persistent token-bucket model in PostgreSQL.
   * key: Unique client identifier (e.g. IP address or hashed API Key).
   * capacity: Maximum bucket size / burst limit (defaults to 100).
   * refillRate: Refill speed in tokens per second (defaults to 5 tokens/sec).
   */
  static async checkLimit(
    key: string,
    capacity = 100,
    refillRate = 5
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = new Date();

    try {
      const bucket = await prisma.rateLimitBucket.findUnique({
        where: { key },
      });

      if (!bucket) {
        // First request: create bucket
        await prisma.rateLimitBucket.create({
          data: {
            key,
            tokens: capacity - 1,
            lastRefilled: now,
          },
        });
        return { allowed: true, remaining: capacity - 1 };
      }

      // Compute refilled tokens based on time delta
      const timePassedSeconds = (now.getTime() - bucket.lastRefilled.getTime()) / 1000;
      const refilledTokens = bucket.tokens + timePassedSeconds * refillRate;
      const currentTokens = Math.min(capacity, refilledTokens);

      if (currentTokens >= 1) {
        const remainingTokens = currentTokens - 1;
        await prisma.rateLimitBucket.update({
          where: { key },
          data: {
            tokens: remainingTokens,
            lastRefilled: now,
          },
        });
        return { allowed: true, remaining: Math.floor(remainingTokens) };
      }

      // Rate limit hit
      return { allowed: false, remaining: 0 };
    } catch (error) {
      // Graceful fallback under database contention
      console.error('[RateLimiter] Error evaluating bucket:', error);
      return { allowed: true, remaining: 1 };
    }
  }
}
