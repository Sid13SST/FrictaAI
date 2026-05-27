import { prisma } from '@fricta/db';
import { ComplianceReadinessReport, ComplianceReadinessItem } from '../types';

export class ComplianceService {
  /**
   * Compiles the dynamic SOC2 and ISO compliance readiness checklist.
   */
  static async evaluateComplianceReadiness(workspaceId: string | null): Promise<ComplianceReadinessReport> {
    const items: ComplianceReadinessItem[] = [];

    if (!workspaceId) {
      // Solo Mode defaults
      return {
        score: 100,
        items: [
          {
            key: 'solo-mode',
            name: 'Solo mode operations',
            description: 'Running in developer standalone mode. Enterprise audit scopes are bypassed.',
            status: 'COMPLIANT'
          }
        ],
        checkedAt: new Date().toISOString()
      };
    }

    // 1. Check policies
    const policies = await prisma.workspacePolicy.findMany({ where: { workspaceId } });
    const hasExternalSharingRestrict = policies.some(p => p.key === 'externalSharing' && p.value !== 'ENABLED');
    const hasInviteRestrictions = policies.some(p => p.key === 'inviteRestrictions' && p.value !== 'ENABLED');

    items.push({
      key: 'external-sharing-policy',
      name: 'External Sharing Restrictions',
      description: 'Verifies if policy limits sharing tokens to admin or leads only.',
      status: hasExternalSharingRestrict ? 'COMPLIANT' : 'WARNING',
      actionRequired: hasExternalSharingRestrict ? undefined : 'Modify External Sharing policy to ADMIN_ONLY or OWNER_ONLY in settings.'
    });

    items.push({
      key: 'invite-restrictions-policy',
      name: 'Workspace Invitation Limits',
      description: 'Verifies if member registration invitation requires admin approvals.',
      status: hasInviteRestrictions ? 'COMPLIANT' : 'WARNING',
      actionRequired: hasInviteRestrictions ? undefined : 'Activate invite restrictions to limit workspace access.'
    });

    // 2. Check Security Audit Event configuration
    const securityEventCount = await prisma.workspaceSecurityEvent.count({ where: { workspaceId } });
    items.push({
      key: 'audit-logging',
      name: 'Immutable Security Audit Feeds',
      description: 'Confirms active logging of role updates, permission changes, and revokings.',
      status: securityEventCount > 0 ? 'COMPLIANT' : 'WARNING',
      actionRequired: securityEventCount > 0 ? undefined : 'Audit logs require activity generation to pass check.'
    });

    // 3. Check RBAC coverage
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId } });
    const hasOnlyAdmins = members.every(m => m.role === 'OWNER' || m.role === 'ADMIN');
    items.push({
      key: 'least-privilege-rbac',
      name: 'Least Privilege Enforcement',
      description: 'Checks if different roles (e.g. Viewer, Guest) are active to enforce access scoping.',
      status: !hasOnlyAdmins ? 'COMPLIANT' : 'WARNING',
      actionRequired: !hasOnlyAdmins ? undefined : 'Enforce least privilege by assigning non-admin roles (VIEWER, INVESTIGATOR) to members.'
    });

    // 4. Data retention policy
    const retentionRecords = await prisma.complianceRetentionRecord.count({ where: { workspaceId } });
    items.push({
      key: 'data-retention-config',
      name: 'Data Retention Policies Scoped',
      description: 'Validates that data retention policies are active for recording items.',
      status: retentionRecords > 0 ? 'COMPLIANT' : 'WARNING',
      actionRequired: retentionRecords > 0 ? undefined : 'Configure a data retention rules target on the security settings pane.'
    });

    // Calculate score
    const compliantCount = items.filter(i => i.status === 'COMPLIANT').length;
    const score = Math.round((compliantCount / items.length) * 100);

    return {
      score,
      items,
      checkedAt: new Date().toISOString()
    };
  }
}
