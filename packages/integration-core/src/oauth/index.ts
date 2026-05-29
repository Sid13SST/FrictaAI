import { prisma } from '@fricta/db';
import { IntegrationProvider, WorkspaceIntegrationSummary } from '../types';

/**
 * OAuthManager — enterprise-grade token lifecycle management.
 *
 * Stores one WorkspaceIntegration record per (workspaceId, provider) pair.
 * Solo mode: workspaceId may be null; isolation is maintained at the record level.
 * Tokens are stored as-is here; in production wrap with KMS/Vault encryption.
 */
export class OAuthManager {
  /**
   * Store or update an OAuth token set for a workspace+provider pair.
   * Called after completing an OAuth authorization code exchange.
   */
  static async upsertToken(
    workspaceId: string | null,
    provider: IntegrationProvider,
    accessToken: string,
    refreshToken?: string,
    tokenExpiresAt?: Date,
    providerUserId?: string,
    providerOrgId?: string,
    scopes?: string,
    metadata?: Record<string, any>
  ): Promise<WorkspaceIntegrationSummary> {
    const existing = await prisma.workspaceIntegration.findFirst({
      where: { workspaceId: workspaceId ?? null, provider },
      include: { connections: true }
    });

    let record;
    if (existing) {
      record = await prisma.workspaceIntegration.update({
        where: { id: existing.id },
        data: {
          accessToken,
          refreshToken: refreshToken ?? existing.refreshToken,
          tokenExpiresAt: tokenExpiresAt ?? existing.tokenExpiresAt,
          providerUserId: providerUserId ?? existing.providerUserId,
          providerOrgId: providerOrgId ?? existing.providerOrgId,
          scopes: scopes ?? existing.scopes,
          metadata: metadata ?? (existing.metadata as any),
          status: 'CONNECTED',
          lastSyncedAt: new Date()
        },
        include: { connections: true }
      });
    } else {
      record = await prisma.workspaceIntegration.create({
        data: {
          workspaceId: workspaceId ?? null,
          provider,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          providerUserId,
          providerOrgId,
          scopes,
          metadata,
          status: 'CONNECTED',
          lastSyncedAt: new Date()
        },
        include: { connections: true }
      });
    }

    return this.toSummary(record);
  }

  /**
   * Retrieve the active token for a workspace+provider. Returns null if disconnected.
   */
  static async getToken(
    workspaceId: string | null,
    provider: IntegrationProvider
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date } | null> {
    const record = await prisma.workspaceIntegration.findFirst({
      where: { workspaceId: workspaceId ?? null, provider, status: 'CONNECTED' }
    });

    if (!record || !record.accessToken) return null;

    return {
      accessToken: record.accessToken,
      refreshToken: record.refreshToken ?? undefined,
      expiresAt: record.tokenExpiresAt ?? undefined
    };
  }

  /**
   * Revoke an integration token — marks as DISCONNECTED and clears token fields.
   * Full governance audit is logged by GovernanceLogger separately.
   */
  static async revokeToken(
    workspaceId: string | null,
    provider: IntegrationProvider
  ): Promise<void> {
    await prisma.workspaceIntegration.updateMany({
      where: { workspaceId: workspaceId ?? null, provider },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null
      }
    });
  }

  /**
   * Mark a token as needing refresh (e.g., detected 401 from external API).
   */
  static async markTokenExpired(
    workspaceId: string | null,
    provider: IntegrationProvider
  ): Promise<void> {
    await prisma.workspaceIntegration.updateMany({
      where: { workspaceId: workspaceId ?? null, provider },
      data: { status: 'ERROR', tokenExpiresAt: new Date() }
    });
  }

  /**
   * List all integration statuses for a workspace (or solo context).
   */
  static async listIntegrations(
    workspaceId: string | null
  ): Promise<WorkspaceIntegrationSummary[]> {
    const records = await prisma.workspaceIntegration.findMany({
      where: { workspaceId: workspaceId ?? null },
      include: { connections: true },
      orderBy: { createdAt: 'asc' }
    });

    return records.map(this.toSummary);
  }

  private static toSummary(record: any): WorkspaceIntegrationSummary {
    return {
      id: record.id,
      provider: record.provider,
      status: record.status,
      providerUserId: record.providerUserId ?? undefined,
      providerOrgId: record.providerOrgId ?? undefined,
      lastSyncedAt: record.lastSyncedAt ?? undefined,
      connections: (record.connections ?? []).map((c: any) => ({
        id: c.id,
        provider: c.provider,
        externalId: c.externalId,
        externalName: c.externalName,
        externalUrl: c.externalUrl ?? undefined,
        connectionType: c.connectionType,
        active: c.active
      }))
    };
  }
}
