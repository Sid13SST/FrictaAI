import { PrismaClient } from '@fricta/db';
import { Context } from 'hono';
import { createRealtimeStream } from '../streaming';
import { RealtimeEvent } from '../types';

/**
 * Resolves the primary OrchestrationSession record using either the session UUID or the workflowSession UUID.
 */
async function resolveOrchestrationSession(prisma: PrismaClient, sessionId: string) {
  return await prisma.orchestrationSession.findFirst({
    where: {
      OR: [
        { id: sessionId },
        { workflowSessionId: sessionId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * 1. Live Orchestration Stream (/realtime/orchestration/:id)
 */
export async function streamOrchestration(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'orchestration',
    filterFn: (e) => [
      'orchestration.started',
      'orchestration.updated',
      'orchestration.completed'
    ].includes(e.eventType),
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;

      const workflowSession = await prisma.workflowSession.findUnique({
        where: { id: session.workflowSessionId }
      });

      // Stream started event
      await stream.writeSSE({
        event: 'orchestration.started',
        data: JSON.stringify({
          workflowSessionId: session.workflowSessionId,
          goal: workflowSession?.goal || 'Usability Audit',
          startedAt: session.startedAt?.toISOString() || session.createdAt.toISOString()
        })
      });

      // Stream current status
      await stream.writeSSE({
        event: 'orchestration.updated',
        data: JSON.stringify({
          status: session.status,
          metadata: session.metadata
        })
      });

      // Stream completed event if status is final
      if (session.status === 'COMPLETED' || session.status === 'FAILED') {
        await stream.writeSSE({
          event: 'orchestration.completed',
          data: JSON.stringify({
            status: session.status,
            completedAt: session.completedAt?.toISOString() || new Date().toISOString(),
            metadata: session.metadata
          })
        });
      }
    }
  });
}

/**
 * 2. Live Timeline Stream (/realtime/timeline/:id)
 */
export async function streamTimeline(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'timeline',
    filterFn: (e) => [
      'delegation.triggered',
      'memory.updated',
      'agent.finding',
      'screenshot.captured',
      'agent.failed',
      'agent.progress'
    ].includes(e.eventType),
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;
      const wfsId = session.workflowSessionId;

      const [delegationEvents, sharedMemoryEvents, uxFindings, screenshots, agentExecutions] = await Promise.all([
        prisma.delegationEvent.findMany({
          where: { orchestrationSessionId: session.id },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.sharedMemoryEvent.findMany({
          where: { orchestrationSessionId: session.id },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.uXFinding.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.workflowScreenshot.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.agentExecution.findMany({
          where: { orchestrationSessionId: session.id },
          include: { reasoningTraces: true }
        })
      ]);

      const events: any[] = [];

      // Add delegations
      delegationEvents.forEach(e => {
        events.push({
          event: 'delegation.triggered',
          timestamp: e.timestamp,
          data: {
            fromAgent: e.fromAgent,
            toAgent: e.toAgent,
            eventType: e.eventType,
            payload: e.payload
          }
        });
      });

      // Add memory sync events
      sharedMemoryEvents.forEach(e => {
        events.push({
          event: 'memory.updated',
          timestamp: e.timestamp,
          data: {
            id: e.id,
            eventType: e.eventType,
            sourceAgent: e.sourceAgent,
            payload: e.payload,
            timestamp: e.timestamp.toISOString()
          }
        });
      });

      // Add findings
      uxFindings.forEach(f => {
        events.push({
          event: 'agent.finding',
          timestamp: f.timestamp,
          data: {
            taskId: '',
            agentType: 'UX_ORCHESTRATOR',
            finding: {
              id: f.id,
              findingType: f.findingType,
              severity: f.severity,
              title: f.title,
              description: f.description,
              evidence: f.evidence
            }
          }
        });
      });

      // Add screenshots
      screenshots.forEach(s => {
        events.push({
          event: 'screenshot.captured',
          timestamp: s.timestamp,
          data: {
            id: s.id,
            workflowSessionId: wfsId,
            screenshotType: s.screenshotType,
            filePath: s.filePath,
            thumbnailPath: s.thumbnailPath,
            stepIndex: s.stepIndex,
            pageUrl: s.pageUrl,
            viewportWidth: s.viewportWidth,
            viewportHeight: s.viewportHeight,
            actionContext: s.actionContext,
            fileSize: s.fileSize,
            metadata: s.metadata
          }
        });
      });

      // Add failed/recovery & reasoning progress
      agentExecutions.forEach(e => {
        if (e.status === 'FAILED') {
          events.push({
            event: 'agent.failed',
            timestamp: e.completedAt || e.createdAt,
            data: {
              taskId: e.id,
              agentType: e.agentType,
              error: (e.metadata as any)?.error || 'Execution failed',
              retryCount: (e.metadata as any)?.retryCount || 0
            }
          });
        }
        e.reasoningTraces.forEach(t => {
          events.push({
            event: 'agent.progress',
            timestamp: t.timestamp,
            data: {
              taskId: e.id,
              agentType: e.agentType,
              description: t.summary,
              step: t.stepType
            }
          });
        });
      });

      // Sort chronologically
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Write each event down the pipeline
      for (const e of events) {
        await stream.writeSSE({
          event: e.event,
          data: JSON.stringify(e.data)
        });
      }
    }
  });
}

/**
 * 3. Live Agent Telemetry Stream (/realtime/agents/:id)
 */
export async function streamAgents(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'agents',
    filterFn: (e) => [
      'agent.started',
      'agent.progress',
      'agent.finding',
      'agent.failed'
    ].includes(e.eventType),
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;

      const executions = await prisma.agentExecution.findMany({
        where: { orchestrationSessionId: session.id },
        include: {
          findings: true,
          signals: true,
          reasoningTraces: true
        },
        orderBy: { createdAt: 'asc' }
      });

      for (const exec of executions) {
        // Stream agent start
        await stream.writeSSE({
          event: 'agent.started',
          data: JSON.stringify({
            taskId: exec.id,
            agentType: exec.agentType,
            description: exec.task
          })
        });

        // Stream reasoning traces as progress
        for (const trace of exec.reasoningTraces) {
          await stream.writeSSE({
            event: 'agent.progress',
            data: JSON.stringify({
              taskId: exec.id,
              agentType: exec.agentType,
              description: trace.summary,
              step: trace.stepType
            })
          });
        }

        // Stream findings
        for (const finding of exec.findings) {
          await stream.writeSSE({
            event: 'agent.finding',
            data: JSON.stringify({
              taskId: exec.id,
              agentType: exec.agentType,
              finding: {
                id: finding.id,
                findingType: finding.findingType,
                severity: finding.severity,
                title: finding.title,
                description: finding.description,
                evidence: finding.evidence
              }
            })
          });
        }

        // Stream failure event if it failed
        if (exec.status === 'FAILED') {
          await stream.writeSSE({
            event: 'agent.failed',
            data: JSON.stringify({
              taskId: exec.id,
              agentType: exec.agentType,
              error: (exec.metadata as any)?.error || 'Execution timeout or failure'
            })
          });
        }
      }
    }
  });
}

/**
 * 4. Live Shared Memory Stream (/realtime/memory/:id)
 */
export async function streamMemory(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'memory',
    filterFn: (e) => e.eventType === 'memory.updated',
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;

      const events = await prisma.sharedMemoryEvent.findMany({
        where: { orchestrationSessionId: session.id },
        orderBy: { timestamp: 'asc' }
      });

      for (const e of events) {
        await stream.writeSSE({
          event: 'memory.updated',
          data: JSON.stringify({
            id: e.id,
            eventType: e.eventType,
            sourceAgent: e.sourceAgent,
            payload: e.payload,
            timestamp: e.timestamp.toISOString()
          })
        });
      }
    }
  });
}

/**
 * 5. Live Replay Stream (/realtime/replay/:id)
 */
export async function streamReplay(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'replay',
    filterFn: (e) => e.eventType === 'replay.updated',
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;
      const wfsId = session.workflowSessionId;

      const [screenshots, actions, thoughts, uxFindings] = await Promise.all([
        prisma.workflowScreenshot.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { stepIndex: 'asc' }
        }),
        prisma.agentAction.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.agentThought.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.uXFinding.findMany({
          where: { workflowSessionId: wfsId },
          orderBy: { timestamp: 'asc' }
        })
      ]);

      // Compile frames
      const frames = screenshots.map(shot => {
        const stepIdx = shot.stepIndex;
        const stepAction = actions.find(a => a.stepNumber === stepIdx);
        const stepThoughts = thoughts.filter(t => t.stepNumber === stepIdx);
        
        const stepFindings = uxFindings.filter(f => {
          const diff = Math.abs(new Date(f.timestamp).getTime() - new Date(shot.timestamp).getTime());
          return diff < 60000;
        });

        return {
          stepIndex: stepIdx,
          timestamp: shot.timestamp.toISOString(),
          screenshot: {
            id: shot.id,
            filePath: shot.filePath,
            pageUrl: shot.pageUrl,
            actionContext: shot.actionContext
          },
          action: stepAction ? {
            type: stepAction.action,
            target: stepAction.target,
            value: stepAction.value,
            status: stepAction.status
          } : null,
          thoughts: stepThoughts.map(t => t.thought),
          findings: stepFindings.map(f => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            recommendation: f.recommendation
          }))
        };
      });

      for (const frame of frames) {
        await stream.writeSSE({
          event: 'replay.updated',
          data: JSON.stringify(frame)
        });
      }
    }
  });
}

/**
 * 6. Live Insights Stream (/realtime/insights/:id)
 */
export async function streamInsights(c: Context, prisma: PrismaClient, sessionId: string) {
  return createRealtimeStream({
    c,
    sessionId,
    streamName: 'insights',
    filterFn: (e) => ['insight.generated', 'correlation.generated'].includes(e.eventType),
    hydrateFn: async (stream) => {
      const session = await resolveOrchestrationSession(prisma, sessionId);
      if (!session) return;

      const [insights, correlations] = await Promise.all([
        prisma.collaborativeInsight.findMany({
          where: { orchestrationSessionId: session.id },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.correlatedFinding.findMany({
          where: { orchestrationSessionId: session.id },
          orderBy: { timestamp: 'asc' }
        })
      ]);

      const events: Array<{ type: 'insight' | 'correlation'; timestamp: Date; data: any }> = [];

      insights.forEach(insight => {
        events.push({
          type: 'insight',
          timestamp: insight.timestamp,
          data: {
            insightId: insight.id,
            title: insight.title,
            summary: insight.summary,
            supportingEvidence: insight.supportingEvidence,
            severity: insight.severity,
            confidence: insight.confidence
          }
        });
      });

      correlations.forEach(corr => {
        events.push({
          type: 'correlation',
          timestamp: corr.timestamp,
          data: {
            correlationId: corr.id,
            findingIds: corr.findingIds,
            correlationType: corr.correlationType,
            summary: corr.summary,
            confidence: corr.confidence,
            metadata: corr.metadata
          }
        });
      });

      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (const e of events) {
        await stream.writeSSE({
          event: e.type === 'insight' ? 'insight.generated' : 'correlation.generated',
          data: JSON.stringify(e.data)
        });
      }
    }
  });
}
