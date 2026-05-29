import { prisma } from '@fricta/db';
import * as crypto from 'crypto';

export interface CreateKeyDto {
  projectId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export class ApiKeyManager {
  /**
   * Hashes a raw API key using SHA256.
   */
  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generates a new API key and inserts its hash into the database.
   * Returns the plaintext key (only shown once to the user).
   */
  static async generateKey(dto: CreateKeyDto): Promise<{ keyId: string; plaintextKey: string; name: string }> {
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const plaintextKey = `fricta_live_${randomBytes}`;
    const keyHash = this.hashKey(plaintextKey);

    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    const keyRecord = await prisma.apiKey.create({
      data: {
        projectId: dto.projectId,
        keyHash,
        name: dto.name,
        scopes: dto.scopes,
        expiresAt,
        active: true,
      },
    });

    // Log the audit event for compliance
    await prisma.platformAuditEvent.create({
      data: {
        projectId: dto.projectId,
        actor: `user_session`,
        action: 'API_KEY_GENERATE',
        resource: `ApiKey:${keyRecord.id}`,
        status: 'SUCCESS',
      },
    });

    return {
      keyId: keyRecord.id,
      plaintextKey,
      name: keyRecord.name,
    };
  }

  /**
   * Validates a plaintext API key and returns its permissions if valid.
   */
  static async validateKey(plaintextKey: string): Promise<{ isValid: boolean; projectId?: string; scopes?: string[] }> {
    if (!plaintextKey || !plaintextKey.startsWith('fricta_live_')) {
      return { isValid: false };
    }

    const keyHash = this.hashKey(plaintextKey);
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!keyRecord || !keyRecord.active) {
      return { isValid: false };
    }

    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      // Key expired
      return { isValid: false };
    }

    return {
      isValid: true,
      projectId: keyRecord.projectId,
      scopes: keyRecord.scopes as string[],
    };
  }

  /**
   * Revokes (deactivates) an API key.
   */
  static async revokeKey(keyId: string, projectId: string): Promise<boolean> {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { active: false },
    });

    await prisma.platformAuditEvent.create({
      data: {
        projectId,
        actor: 'user_session',
        action: 'API_KEY_REVOKE',
        resource: `ApiKey:${keyId}`,
        status: 'SUCCESS',
      },
    });

    return true;
  }

  /**
   * Lists all active keys for a project.
   */
  static async listKeys(projectId: string): Promise<any[]> {
    return prisma.apiKey.findMany({
      where: { projectId, active: true },
      select: {
        id: true,
        name: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Logs a single public API request invocation for telemetry and usage metrics.
   */
  static async logUsage(apiKeyId: string | null, endpoint: string, method: string, statusCode: number, responseTimeMs: number): Promise<void> {
    await prisma.apiUsageRecord.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
      },
    });
  }
}
