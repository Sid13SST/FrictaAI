import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import { UXIntelligenceCoordinator, RecommendationEngine } from '@fricta/ux-intelligence';

export const uxRoutes = new Hono();
const prisma = new PrismaClient();
const coordinator = new UXIntelligenceCoordinator(prisma);

// Retrieve all UX findings for a session
uxRoutes.get('/findings/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const findings = await prisma.uXFinding.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return c.json({ findings });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch UX findings for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve cognitive signals for a session
uxRoutes.get('/cognitive/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const signals = await prisma.cognitiveSignal.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return c.json({ signals });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch cognitive signals for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve detailed UX recommendations for a session
uxRoutes.get('/recommendations/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const findings = await prisma.uXFinding.findMany({
      where: { workflowSessionId: sessionId }
    });
    
    // Map raw findings to structured pattern library recommendations
    const recommendations = RecommendationEngine.generate(findings.map(f => ({
      ...f,
      severity: f.severity as any
    })));
    return c.json({ recommendations });
  } catch (error: any) {
    console.error(`[Backend] Failed to generate UX recommendations for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Trigger UX intelligence analysis for a session
uxRoutes.post('/analyze/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const result = await coordinator.analyzeSession(sessionId);
    return c.json(result);
  } catch (error: any) {
    console.error(`[Backend] UX analysis failed for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});
