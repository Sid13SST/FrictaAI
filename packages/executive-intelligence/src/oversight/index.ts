import { prisma } from '@fricta/db';

export class OversightManager {
  static async triggerOversightAlert(projectId: string, title: string, message: string) {
    const alert = await prisma.intelligenceAlert.create({
      data: {
        projectId,
        alertType: 'EXECUTIVE_OVERSIGHT',
        title,
        message,
        severity: 'HIGH',
        isRead: false
      }
    });

    return alert;
  }
}
