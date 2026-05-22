import { Hono } from 'hono';
import { prisma, OrchestrationSession } from '@fricta/db';

export const consoleRoutes = new Hono<{
  Variables: {
    orchSession: OrchestrationSession;
  };
}>()
  /**
   * Helper to resolve orchestration session and workflow session IDs.
   */
  .use('/:sessionId/*', async (c, next) => {
    const sessionId = c.req.param('sessionId');
    
    // Find orchestration session
    const orchestrationSession = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!orchestrationSession) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    c.set('orchSession', orchestrationSession);
    await next();
  })

  /**
   * GET /console/:sessionId/overview
   * Returns orchestration overview, active agents, severity indicators.
   */
  .get('/:sessionId/overview', async (c) => {
    const orchSession = c.get('orchSession');
    const wfsId = orchSession.workflowSessionId;

    const [workflowSession, agentExecutions, findings, insights, metrics] = await Promise.all([
      prisma.workflowSession.findUnique({ where: { id: wfsId } }),
      prisma.agentExecution.findMany({
        where: { orchestrationSessionId: orchSession.id },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.uXFinding.findMany({ where: { workflowSessionId: wfsId } }),
      prisma.collaborativeInsight.findMany({ where: { orchestrationSessionId: orchSession.id } }),
      prisma.workflowMetrics.findUnique({ where: { workflowSessionId: wfsId } })
    ]);

    // Calculate severity distribution
    const severityCount = {
      CRITICAL: findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'Critical').length,
      HIGH: findings.filter(f => f.severity === 'HIGH' || f.severity === 'High').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM' || f.severity === 'Medium').length,
      LOW: findings.filter(f => f.severity === 'LOW' || f.severity === 'Low').length
    };

    return c.json({
      session: {
        id: orchSession.id,
        workflowSessionId: wfsId,
        status: orchSession.status,
        startedAt: orchSession.startedAt,
        completedAt: orchSession.completedAt,
        metadata: orchSession.metadata,
        goal: workflowSession?.goal || 'UX Audit Run'
      },
      workflowSession: {
        status: workflowSession?.status,
        stepCount: workflowSession?.stepCount || 0,
        startedAt: workflowSession?.startedAt,
        endedAt: workflowSession?.endedAt
      },
      agents: agentExecutions.map(e => ({
        id: e.id,
        agentType: e.agentType,
        status: e.status,
        task: e.task,
        startedAt: e.startedAt,
        completedAt: e.completedAt
      })),
      health: {
        duration: metrics?.duration || 0,
        tokenUsage: metrics?.tokenUsage || 0,
        retryCount: metrics?.retryCount || 0,
        completionStatus: metrics?.completionStatus || 'UNKNOWN'
      },
      severity: severityCount,
      insightsCount: insights.length
    });
  })

  /**
   * GET /console/:sessionId/timeline
   * Returns unified synchronized timeline events: delegations, findings, screenshots, and context events.
   */
  .get('/:sessionId/timeline', async (c) => {
    const orchSession = c.get('orchSession');
    const wfsId = orchSession.workflowSessionId;

    const [delegationEvents, sharedMemoryEvents, uxFindings, screenshots, agentExecutions] = await Promise.all([
      prisma.delegationEvent.findMany({
        where: { orchestrationSessionId: orchSession.id },
        orderBy: { timestamp: 'asc' }
      }),
      prisma.sharedMemoryEvent.findMany({
        where: { orchestrationSessionId: orchSession.id },
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
        where: { orchestrationSessionId: orchSession.id },
        include: { reasoningTraces: true }
      })
    ]);

    // Build unified chronological timeline
    const events: any[] = [];

    // 1. Delegation Events
    delegationEvents.forEach(e => {
      events.push({
        id: e.id,
        type: 'DELEGATION',
        timestamp: e.timestamp,
        source: e.fromAgent,
        target: e.toAgent,
        title: `Delegated to ${e.toAgent}`,
        description: `Agent ${e.fromAgent} delegated control task: "${e.eventType}"`,
        metadata: e.payload
      });
    });

    // 2. Shared Memory Context
    sharedMemoryEvents.forEach(e => {
      events.push({
        id: e.id,
        type: 'CORRELATION',
        timestamp: e.timestamp,
        source: e.sourceAgent,
        title: `Memory Sync Event: ${e.eventType}`,
        description: `Agent ${e.sourceAgent} updated shared memory with keys: ${Object.keys(e.payload as object).join(', ')}`,
        metadata: e.payload
      });
    });

    // 3. UX Findings
    uxFindings.forEach(f => {
      events.push({
        id: f.id,
        type: 'FINDING',
        timestamp: f.timestamp,
        source: 'UX_ORCHESTRATOR',
        title: f.title,
        description: f.description,
        metadata: {
          severity: f.severity,
          persona: f.personaType,
          recommendation: f.recommendation,
          evidence: f.evidence
        }
      });
    });

    // 4. Screenshots
    screenshots.forEach(s => {
      events.push({
        id: s.id,
        type: 'SCREENSHOT',
        timestamp: s.timestamp,
        source: 'VISUAL_AGENT',
        title: `Captured screenshot at step ${s.stepIndex}`,
        description: `Captured screenshot of url: ${s.pageUrl} (Context: ${s.actionContext || 'N/A'})`,
        metadata: {
          stepIndex: s.stepIndex,
          filePath: s.filePath,
          thumbnailPath: s.thumbnailPath,
          pageUrl: s.pageUrl,
          viewport: `${s.viewportWidth}x${s.viewportHeight}`
        }
      });
    });

    // 5. Failed/Recovery Events
    agentExecutions.forEach(e => {
      if (e.status === 'FAILED') {
        events.push({
          id: e.id,
          type: 'RECOVERY',
          timestamp: e.completedAt || e.createdAt,
          source: e.agentType,
          title: `${e.agentType} execution failure`,
          description: `Attempting automated fallback / error recovery path.`,
          metadata: e.metadata || { error: 'Unknown Execution Error' }
        });
      }
      e.reasoningTraces.forEach(t => {
        events.push({
          id: t.id,
          type: 'REASONING',
          timestamp: t.timestamp,
          source: e.agentType,
          title: `${e.agentType} reasoning step`,
          description: t.summary,
          metadata: { stepType: t.stepType, evidence: t.evidence }
        });
      });
    });

    // Sort chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ timeline: events });
  })

  /**
   * GET /console/:sessionId/evidence
   * Returns evidence graph: screenshots, findings, signals, and correlations.
   */
  .get('/:sessionId/evidence', async (c) => {
    const orchSession = c.get('orchSession');
    const wfsId = orchSession.workflowSessionId;

    const [screenshots, uxFindings, visualFindings, cognitiveSignals, correlatedFindings] = await Promise.all([
      prisma.workflowScreenshot.findMany({
        where: { workflowSessionId: wfsId },
        orderBy: { stepIndex: 'asc' }
      }),
      prisma.uXFinding.findMany({ where: { workflowSessionId: wfsId } }),
      prisma.visualFinding.findMany({ where: { workflowSessionId: wfsId } }),
      prisma.cognitiveSignal.findMany({ where: { workflowSessionId: wfsId } }),
      prisma.correlatedFinding.findMany({ where: { orchestrationSessionId: orchSession.id } })
    ]);

    return c.json({
      screenshots,
      uxFindings,
      visualFindings,
      cognitiveSignals,
      correlations: correlatedFindings
    });
  })

  /**
   * GET /console/:sessionId/insights
   * Returns collaborative insights generated.
   */
  .get('/:sessionId/insights', async (c) => {
    const orchSession = c.get('orchSession');
    const insights = await prisma.collaborativeInsight.findMany({
      where: { orchestrationSessionId: orchSession.id },
      orderBy: { timestamp: 'desc' }
    });

    return c.json({ insights });
  })

  /**
   * GET /console/:sessionId/agents
   * Returns detailed agent intelligence data.
   */
  .get('/:sessionId/agents', async (c) => {
    const orchSession = c.get('orchSession');

    // Scoped descriptions of agents
    const scopedDescriptions: Record<string, string> = {
      NAVIGATION_AGENT: 'Analyzes layout transitions, interactive loops, form submissions, and path clarity.',
      ONBOARDING_AGENT: 'Evaluates first-mile workflows, user authentication gates, and progressive disclosure systems.',
      DISCOVERABILITY_AGENT: 'Detects invisible call-to-actions, missing instructions, and hidden components.',
      COGNITIVE_AGENT: 'Measures decision overhead, hesitation delay thresholds, and task density complexity.',
      VISUAL_AGENT: 'Performs semantic layout structural audits, alignment checking, and graphical balance analysis.',
      WORKFLOW_AGENT: 'Validates complete scenario funnels and detects branching deviations from user intent.'
    };

    const agentExecutions = await prisma.agentExecution.findMany({
      where: { orchestrationSessionId: orchSession.id },
      include: {
        findings: true,
        signals: true,
        reasoningTraces: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Delegation history for references
    const delegations = await prisma.delegationEvent.findMany({
      where: { orchestrationSessionId: orchSession.id }
    });

    const agentsData = Object.keys(scopedDescriptions).map(agentType => {
      const execs = agentExecutions.filter(e => e.agentType === agentType);
      const executionStatus = execs.length > 0 ? execs[execs.length - 1].status : 'IDLE';

      const findings = execs.flatMap(e => e.findings);
      const signals = execs.flatMap(e => e.signals);
      const traces = execs.flatMap(e => e.reasoningTraces);

      // Filter delegations for this agent
      const history = delegations.filter(d => d.fromAgent === agentType || d.toAgent === agentType);

      // Confidence indicator calculation (aggregate or fallback)
      let confidenceSum = 0.85; // baseline default
      if (findings.length > 0) {
        confidenceSum = Math.max(0.65, 0.95 - (findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length * 0.05));
      }

      return {
        agentType,
        status: executionStatus,
        scopedResponsibilities: scopedDescriptions[agentType],
        findings: findings.map(f => ({
          id: f.id,
          title: f.title,
          description: f.description,
          severity: f.severity,
          evidence: f.evidence
        })),
        reasoningTraces: traces.map(t => ({
          id: t.id,
          stepType: t.stepType,
          summary: t.summary,
          evidence: t.evidence,
          timestamp: t.timestamp
        })),
        delegationHistory: history.map(d => ({
          id: d.id,
          fromAgent: d.fromAgent,
          toAgent: d.toAgent,
          eventType: d.eventType,
          timestamp: d.timestamp
        })),
        confidence: parseFloat(confidenceSum.toFixed(2))
      };
    });

    return c.json({ agents: agentsData });
  })

  /**
   * GET /console/:sessionId/memory
   * Returns shared memory event stream.
   */
  .get('/:sessionId/memory', async (c) => {
    const orchSession = c.get('orchSession');
    const memoryEvents = await prisma.sharedMemoryEvent.findMany({
      where: { orchestrationSessionId: orchSession.id },
      orderBy: { timestamp: 'asc' }
    });

    return c.json({ events: memoryEvents });
  })

  /**
   * GET /console/:sessionId/replay-sync
   * Returns metadata required for playback timeline scrubbing.
   */
  .get('/:sessionId/replay-sync', async (c) => {
    const orchSession = c.get('orchSession');
    const wfsId = orchSession.workflowSessionId;

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

    // Build timeline frames mapping screenshots/thoughts/findings to timeline ticks (stepIndex)
    const frames = screenshots.map(shot => {
      const stepIdx = shot.stepIndex;

      // Find matching action for this step
      const stepAction = actions.find(a => a.stepNumber === stepIdx);
      
      // Find matching thoughts for this step
      const stepThoughts = thoughts.filter(t => t.stepNumber === stepIdx);

      // Find findings occurring around this step (rough match by timestamp or step sequence)
      const stepFindings = uxFindings.filter(f => {
        // If we can map via metadata or time, do so. Fallback to matching first finding if small set.
        const diff = Math.abs(new Date(f.timestamp).getTime() - new Date(shot.timestamp).getTime());
        return diff < 60000; // within 1 minute
      });

      return {
        stepIndex: stepIdx,
        timestamp: shot.timestamp,
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

    return c.json({
      sessionId: wfsId,
      totalSteps: screenshots.length,
      frames
    });
  });
