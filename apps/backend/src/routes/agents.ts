import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { getCurrentUser } from '../middleware/authContext';
import { verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const agentsRoutes = new Hono()
  /**
   * Returns list of specialized agent execution statuses, runtimes, and metadata.
   */
  .get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      include: {
        agentExecutions: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, session.workflowSessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);
    return c.json({ session });
  })

  /**
   * Returns findings grouped by agent type.
   */
  .get('/:sessionId/findings', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, session.workflowSessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

    const executions = await prisma.agentExecution.findMany({
      where: { orchestrationSessionId: session.id },
      include: { findings: true }
    });

    // Group findings by agentType
    const findingsByAgent: Record<string, any[]> = {};
    for (const exec of executions) {
      findingsByAgent[exec.agentType] = exec.findings;
    }

    return c.json({ findings: findingsByAgent });
  })

  /**
   * Returns chronological trace steps/reasoning events.
   */
  .get('/:sessionId/reasoning', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, session.workflowSessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

    const traces = await prisma.agentReasoningTrace.findMany({
      where: {
        agentExecution: {
          orchestrationSessionId: session.id
        }
      },
      include: {
        agentExecution: {
          select: { agentType: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return c.json({
      traces: traces.map((t) => ({
        id: t.id,
        agentType: t.agentExecution.agentType,
        stepType: t.stepType,
        summary: t.summary,
        evidence: t.evidence,
        timestamp: t.timestamp
      }))
    });
  })

  /**
   * Returns intensity signals emitted by agents.
   */
  .get('/:sessionId/signals', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, session.workflowSessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

    const signals = await prisma.agentSignal.findMany({
      where: {
        agentExecution: {
          orchestrationSessionId: session.id
        }
      },
      include: {
        agentExecution: {
          select: { agentType: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return c.json({
      signals: signals.map((s) => ({
        id: s.id,
        agentType: s.agentExecution.agentType,
        signalType: s.signalType,
        intensity: s.intensity,
        metadata: s.metadata,
        timestamp: s.timestamp
      }))
    });
  })

  /**
   * Analyzes findings and returns cross-agent correlation links.
   */
  .get('/:sessionId/correlations', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await prisma.orchestrationSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { workflowSessionId: sessionId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return c.json({ error: 'Orchestration session not found' }, 404);
    }

    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);
    const ownership = await verifyWorkflowOwnership(user.userId, session.workflowSessionId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

    const executions = await prisma.agentExecution.findMany({
      where: { orchestrationSessionId: session.id },
      include: {
        findings: true,
        signals: true
      }
    });

    const findings = executions.flatMap(e => e.findings);
    const signals = executions.flatMap(e => e.signals.map(s => ({ ...s, agentType: e.agentType, metadata: s.metadata as any })));

    const correlations: any[] = [];

    // Rule 1: Discoverability -> Navigation (User loops because of weak/competing CTAs)
    const loopSignal = signals.find(s => s.signalType === 'NAVIGATION_LOOP_SIGNAL');
    const weakCta = signals.find(s => s.signalType === 'WEAK_CTA_SIGNAL');
    const competingCta = signals.find(s => s.signalType === 'COMPETING_ACTION_HIERARCHY');
    const loopFinding = findings.find(f => f.findingType === 'NAVIGATION_LOOP');
    const ctaFinding = findings.find(f => f.findingType === 'ROUTE_SWITCH_FRICTION' || f.title.toLowerCase().includes('cta') || f.description.toLowerCase().includes('cta'));

    if (loopSignal && (weakCta || competingCta)) {
      correlations.push({
        id: `corr-disc-nav-${session.id}`,
        sourceAgent: 'DISCOVERABILITY_AGENT',
        targetAgent: 'NAVIGATION_AGENT',
        type: 'DISCOVERABILITY_CAUSED_LOOP',
        title: 'CTA Discoverability correlated with Route Loops',
        description: 'The user is repeatedly looping between pages, which strongly correlates with weak contrast or competing actions on the primary Call-To-Action buttons.',
        confidence: 0.9,
        evidence: `Loop intensity ${loopSignal.intensity} combined with CTA signal intensity ${weakCta?.intensity || competingCta?.intensity || 0.75}`,
        sourceFindingId: ctaFinding?.id || null,
        targetFindingId: loopFinding?.id || null
      });
    }

    // Rule 2: Visual Clutter -> Cognitive Overload (High density causing decision fatigue/overload)
    const clutter = signals.find(s => s.signalType === 'VISUAL_CLUTTER');
    const overload = signals.find(s => s.signalType === 'COGNITIVE_OVERLOAD');
    const clutterFinding = findings.find(f => f.findingType === 'IA_CONFUSION' || f.title.toLowerCase().includes('clutter'));
    const overloadFinding = findings.find(f => f.findingType === 'COGNITIVE_OVERLOAD' || f.title.toLowerCase().includes('overload') || f.title.toLowerCase().includes('complexity'));

    if (clutter && overload) {
      correlations.push({
        id: `corr-vis-cog-${session.id}`,
        sourceAgent: 'VISUAL_AGENT',
        targetAgent: 'COGNITIVE_AGENT',
        type: 'CLUTTER_CAUSED_OVERLOAD',
        title: 'Visual Clutter correlated with Cognitive Overload',
        description: 'Excessive visual elements and layout complexity directly correlate with elevated decision times and cognitive load traces.',
        confidence: 0.85,
        evidence: `Max element count of ${clutter.metadata?.maxElementsCount || 50} matches cognitive overload intensity of ${overload.intensity}`,
        sourceFindingId: clutterFinding?.id || null,
        targetFindingId: overloadFinding?.id || null
      });
    }

    // Rule 3: Discoverability -> Onboarding Hesitation (First step delay due to low visual prominence)
    const firstStepHesitation = signals.find(s => s.signalType === 'ONBOARDING_HESITATION');
    const affordanceAmbiguity = signals.find(s => s.signalType === 'AFFORDANCE_AMBIGUITY' || s.signalType === 'WEAK_CTA_SIGNAL');
    const hesitationFinding = findings.find(f => f.title.toLowerCase().includes('hesitation') || f.description.toLowerCase().includes('hesitation'));
    
    if (firstStepHesitation && affordanceAmbiguity) {
      correlations.push({
        id: `corr-disc-onb-${session.id}`,
        sourceAgent: 'DISCOVERABILITY_AGENT',
        targetAgent: 'ONBOARDING_AGENT',
        type: 'UNFOUND_CTA_CAUSED_HESITATION',
        title: 'CTA Affordance issues correlated with Onboarding Hesitation',
        description: 'High delay before the first action suggests the user struggled to discover where to click, matching the weak CTA/affordance signal.',
        confidence: 0.8,
        evidence: `First step took ${firstStepHesitation.metadata?.firstStepDurationSeconds || 'N/A'}s while affordance ambiguity score is ${affordanceAmbiguity.intensity}`,
        sourceFindingId: ctaFinding?.id || null,
        targetFindingId: hesitationFinding?.id || null
      });
    }

    // Rule 4: Workflow bottlenecks -> Navigation Loops (Redundant navigation loops creating bottlenecks)
    const bottleneckSignal = signals.find(s => s.signalType === 'WORKFLOW_BOTTLENECK');

    if (bottleneckSignal && loopSignal) {
      correlations.push({
        id: `corr-wf-nav-${session.id}`,
        sourceAgent: 'NAVIGATION_AGENT',
        targetAgent: 'WORKFLOW_AGENT',
        type: 'LOOP_CAUSED_BOTTLENECK',
        title: 'Navigation Loops driving Workflow Bottleneck',
        description: 'Repeated navigation between the same views has created a severe bottleneck, slowing down user progression and increasing average step duration.',
        confidence: 0.95,
        evidence: `Loop path matches bottleneck step durations averaging ${bottleneckSignal.metadata?.avgStepDuration || 'N/A'}s.`,
        sourceFindingId: loopFinding?.id || null,
        targetFindingId: findings.find(f => f.findingType === 'WORKFLOW_BOTTLENECK')?.id || null
      });
    }

    return c.json({ correlations });
  });
