import { prisma } from '@fricta/db';
import { FrictionPattern } from '../types';

export class PersistentPatternDetector {
  /**
   * Scans previous sessions in a project to discover recurring friction patterns.
   */
  static async detectPersistentPatterns(projectId: string, workspaceId: string | null) {
    // Fetch recent completed sessions with findings, hesitation signals and mismatches
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId },
      include: {
        uxFindings: true,
        cognitiveSignals: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (sessions.length < 2) {
      return [];
    }

    const patternMap = new Map<string, {
      count: number;
      sessionIds: string[];
      elements: string[];
      severities: string[];
      descriptions: string[];
    }>();

    // Loop through findings and signals to cluster by element selector or finding type
    for (const session of sessions) {
      // 1. Check UX findings
      for (const finding of session.uxFindings) {
        const key = finding.title.toLowerCase().trim();
        const existing = patternMap.get(key) || {
          count: 0,
          sessionIds: [],
          elements: [],
          severities: [],
          descriptions: []
        };

        if (!existing.sessionIds.includes(session.id)) {
          existing.count++;
          existing.sessionIds.push(session.id);
          if (finding.evidence && !existing.elements.includes(finding.evidence)) {
            existing.elements.push(finding.evidence);
          }
          existing.severities.push(finding.severity);
          existing.descriptions.push(finding.description);
          patternMap.set(key, existing);
        }
      }

      // 2. Check cognitive signals (e.g. Mismatches)
      for (const signal of session.cognitiveSignals) {
        if (signal.signalType === 'EXPECTATION_MISMATCH' || signal.signalType === 'LOAD_SPIKE') {
          const meta = (signal.metadata as any) || {};
          const elementSelector = meta.elementSelector || '';
          const description = meta.description || `Cognitive signal of type ${signal.signalType}`;
          const key = `Cognitive: ${signal.signalType} on ${elementSelector || 'unknown'}`;
          const existing = patternMap.get(key) || {
            count: 0,
            sessionIds: [],
            elements: [],
            severities: [],
            descriptions: []
          };

          if (!existing.sessionIds.includes(session.id)) {
            existing.count++;
            existing.sessionIds.push(session.id);
            if (elementSelector && !existing.elements.includes(elementSelector)) {
              existing.elements.push(elementSelector);
            }
            existing.severities.push(signal.intensity >= 0.7 ? 'CRITICAL' : 'WARNING');
            existing.descriptions.push(description);
            patternMap.set(key, existing);
          }
        }
      }
    }

    const createdPatterns = [];

    // Filter clusters that occur in at least 2 sessions
    for (const [key, details] of patternMap.entries()) {
      if (details.count >= 2) {
        // Resolve severity
        const hasCritical = details.severities.includes('CRITICAL') || details.severities.includes('HIGH');
        const severity = hasCritical ? 'CRITICAL' : 'WARNING';

        // Check if pattern already exists in DB
        const existingPattern = await prisma.crossSessionPattern.findFirst({
          where: {
            projectId,
            patternName: key
          }
        });

        if (existingPattern) {
          // Update
          const updated = await prisma.crossSessionPattern.update({
            where: { id: existingPattern.id },
            data: {
              evidenceCount: details.count,
              supportingData: {
                sessionIds: details.sessionIds,
                targetElements: details.elements,
                severities: details.severities
              }
            }
          });
          createdPatterns.push(updated);
        } else {
          // Create new
          const created = await prisma.crossSessionPattern.create({
            data: {
              workspaceId,
              projectId,
              patternName: key,
              category: key.startsWith('cognitive') ? 'ATTENTION' : 'FRICTION',
              description: `Recurring usability pattern detected across ${details.count} sessions: ${details.descriptions[0] || key}`,
              evidenceCount: details.count,
              supportingData: {
                sessionIds: details.sessionIds,
                targetElements: details.elements,
                severities: details.severities
              },
              severity
            }
          });
          createdPatterns.push(created);
        }
      }
    }

    return createdPatterns;
  }

  /**
   * Fetches active patterns.
   */
  static async getCrossSessionPatterns(projectId: string, workspaceId: string | null) {
    return prisma.crossSessionPattern.findMany({
      where: {
        projectId,
        workspaceId
      },
      orderBy: { evidenceCount: 'desc' }
    });
  }
}
