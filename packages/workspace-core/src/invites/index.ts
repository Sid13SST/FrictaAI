import { PrismaClient } from '@fricta/db';
import { WorkspaceRole } from '../types';
import * as crypto from 'crypto';

export class InviteManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a workspace invitation.
   */
  async createInvite(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: WorkspaceRole
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    return this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        inviterId,
        email: email.toLowerCase().trim(),
        role,
        token,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        workspace: true,
      },
    });
  }

  /**
   * Retrieves pending invites for a workspace.
   */
  async getWorkspaceInvites(workspaceId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Accepts an invite token, mapping the user to a workspace member.
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    if (!invite) {
      throw new Error('Invitation code is invalid');
    }

    if (invite.status !== 'PENDING') {
      throw new Error(`Invitation has already been ${invite.status.toLowerCase()}`);
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Invitation code has expired');
    }

    // Verify user exists and retrieve organization id
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error('User not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or find membership
      const member = await tx.workspaceMember.create({
        data: {
          organizationId: invite.workspace.organizationId,
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      });

      // 2. Mark invite as accepted
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      // 3. Log activity
      await tx.workspaceActivity.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          actionType: 'MEMBER_JOINED',
          description: `${user.email} joined workspace via invitation`,
          metadata: { inviteId: invite.id, role: invite.role },
        },
      });

      return member;
    });
  }

  /**
   * Declines a workspace invite.
   */
  async declineInvite(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== 'PENDING') {
      throw new Error('Invitation is not valid or pending');
    }

    return this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED' },
    });
  }
}
