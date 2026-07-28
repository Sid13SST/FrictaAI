import { prisma } from '@fricta/db';
import { IntegrationProvider, WorkspaceIntegrationSummary } from '../types';
import { encryptToken, decryptToken } from './crypto';

/**
 * OAuthManager — enterprise-grade token lifecycle management.
 *
 * Stores one WorkspaceIntegration record per (workspaceId, provider) pair.
 * Solo mode: workspaceId may be null; isolation is maintained at the record level.
 * accessToken/refreshToken are AES-256-GCM encrypted before hitting the DB
 * (see ./crypto.ts) and decrypted transparently by getToken().
 */
export class OAuthManager {
  /**
   * Builds the where-clause that scopes a WorkspaceIntegration lookup.
   * Workspace-owned integrations (workspaceId set) are intentionally shared
   * with the whole workspace — role gating happens in
   * IntegrationPermissionGuard, not here. Solo-mode integrations
   * (workspaceId null) have no workspace to share within, so they must also
   * be scoped to the individual owner or every solo user would see (and could
   * clobber) every other solo user's connections.
   */
  private static scopeWhere(
    workspaceId: string | null,
    userId: string | null,
    provider: IntegrationProvider
  ) {
    return workspaceId
      ? { workspaceId, provider }
      : { workspaceId: null, userId, provider };
  }

  /**
   * Store or update an OAuth token set for a workspace+provider pair.
   * Called after completing an OAuth authorization code exchange.
   */
  static async upsertToken(
    workspaceId: string | null,
    userId: string | null,
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
      where: this.scopeWhere(workspaceId, userId, provider),
      include: { connections: true }
    });

    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken !== undefined ? encryptToken(refreshToken) : undefined;

    let record;
    if (existing) {
      record = await prisma.workspaceIntegration.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken ?? existing.refreshToken,
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
          userId: workspaceId ? null : userId,
          provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
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
    userId: string | null,
    provider: IntegrationProvider
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date } | null> {
    const record = await prisma.workspaceIntegration.findFirst({
      where: { ...this.scopeWhere(workspaceId, userId, provider), status: 'CONNECTED' }
    });

    if (!record || !record.accessToken) return null;

    return {
      accessToken: decryptToken(record.accessToken),
      refreshToken: record.refreshToken ? decryptToken(record.refreshToken) : undefined,
      expiresAt: record.tokenExpiresAt ?? undefined
    };
  }

  /**
   * Revoke an integration token — marks as DISCONNECTED and clears token fields.
   * Full governance audit is logged by GovernanceLogger separately.
   */
  static async revokeToken(
    workspaceId: string | null,
    userId: string | null,
    provider: IntegrationProvider
  ): Promise<void> {
    await prisma.workspaceIntegration.updateMany({
      where: this.scopeWhere(workspaceId, userId, provider),
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
    userId: string | null,
    provider: IntegrationProvider
  ): Promise<void> {
    await prisma.workspaceIntegration.updateMany({
      where: this.scopeWhere(workspaceId, userId, provider),
      data: { status: 'ERROR', tokenExpiresAt: new Date() }
    });
  }

  /**
   * List all integration statuses for a workspace (or solo context).
   * In solo mode, scoped to the caller's own connections — otherwise every
   * solo user would see every other solo user's integrations.
   */
  static async listIntegrations(
    workspaceId: string | null,
    userId: string | null
  ): Promise<WorkspaceIntegrationSummary[]> {
    const records = await prisma.workspaceIntegration.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null, userId },
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
