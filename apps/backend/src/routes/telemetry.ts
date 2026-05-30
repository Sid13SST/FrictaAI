import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { ApiKeyManager } from '@fricta/developer-platform';
import { LiveAnomalyDetector } from '@fricta/live-intelligence';

export const telemetryRoutes = new Hono();

// Helper to decode Base64 compressed payload
function decodePayload(base64Data: string): any[] {
  try {
    const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[TelemetryIngest] Decompression failed:', err);
    return [];
  }
}

/**
 * GET /api/telemetry/health
 */
telemetryRoutes.get('/health', (c) => c.json({ status: 'ok', service: 'fricta-telemetry-ingest' }));

/**
 * POST /api/telemetry/ingest
 * Ingest batched and base64 encoded telemetry events.
 */
telemetryRoutes.post('/ingest', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, sessionKey, data } = body;

  if (!projectId || !sessionKey || !data) {
    return c.json({ error: 'Missing required parameters: projectId, sessionKey, or data' }, 400);
  }

  // 1. Authenticate API Key if header is present (standard auth)
  const authHeader = c.req.header('Authorization')?.replace('Bearer ', '');
  if (authHeader) {
    const validation = await ApiKeyManager.validateKey(authHeader);
    if (!validation.isValid || validation.projectId !== projectId) {
      return c.json({ error: 'Unauthorized: Invalid API Key' }, 401);
    }
  }

  // Ensure project exists
  const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
  if (!projectExists) {
    return c.json({ error: `Project ID ${projectId} not found` }, 404);
  }

  // 2. Decode the compressed telemetry events
  const events = decodePayload(data);
  if (!Array.isArray(events) || events.length === 0) {
    return c.json({ error: 'Invalid data payload: must contain serialized events' }, 400);
  }

  console.log(`[TelemetryIngest] Ingesting ${events.length} events for session ${sessionKey}`);

  // 3. Process events within a database transaction or batch sequence
  let liveSession = await prisma.liveSession.findUnique({
    where: { sessionKey }
  });

  const now = new Date();

  for (const event of events) {
    const { eventType, payload, timestamp } = event;
    const eventTime = timestamp ? new Date(timestamp) : now;

    // A. Ensure session exists or create it
    if (!liveSession && (eventType === 'LiveSessionCreated' || payload)) {
      liveSession = await prisma.liveSession.create({
        data: {
          projectId,
          sessionKey,
          browser: payload.browser || 'Unknown',
          os: payload.os || 'Unknown',
          device: payload.device || 'Desktop',
          ipAddress: payload.ipAddress || c.req.header('x-forwarded-for') || '127.0.0.1',
          location: payload.location || 'Localhost',
          startedAt: eventTime,
          lastActiveAt: eventTime,
          status: 'ACTIVE',
        }
      });
    }

    if (!liveSession) continue;

    // B. Handle each telemetry event type
    switch (eventType) {
      case 'LiveSessionCreated':
        // Handled in creation logic, skip
        break;

      case 'SessionHeartbeat':
        await prisma.sessionHeartbeat.create({
          data: {
            liveSessionId: liveSession.id,
            sequenceNumber: payload.sequenceNumber || 1,
            activeDurationSeconds: payload.activeDurationSeconds || 30,
            timestamp: eventTime,
          }
        });
        // Update active timestamp
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: { lastActiveAt: eventTime }
        });
        break;

      case 'NavigationEvent':
        // Calculate transition duration if possible
        const lastNav = await prisma.navigationEvent.findFirst({
          where: { liveSessionId: liveSession.id },
          orderBy: { timestamp: 'desc' }
        });
        let durationMs = 0;
        if (lastNav) {
          durationMs = eventTime.getTime() - lastNav.timestamp.getTime();
        }
        await prisma.navigationEvent.create({
          data: {
            liveSessionId: liveSession.id,
            fromUrl: payload.fromUrl || '',
            toUrl: payload.toUrl || '',
            timestamp: eventTime,
            durationMs,
          }
        });
        break;

      case 'InteractionEvent':
        await prisma.telemetryInteractionEvent.create({
          data: {
            liveSessionId: liveSession.id,
            target: payload.target || 'unknown',
            elementType: payload.elementType || 'unknown',
            action: payload.action || 'CLICK',
            timestamp: eventTime,
          }
        });
        break;

      case 'FrictionSignal':
        await prisma.frictionSignal.create({
          data: {
            liveSessionId: liveSession.id,
            frictionType: payload.frictionType || 'RAGE_CLICK',
            score: payload.score || 0.0,
            details: payload.details || {},
            timestamp: eventTime,
          }
        });
        // Also log as a SessionSignal
        await prisma.sessionSignal.create({
          data: {
            liveSessionId: liveSession.id,
            signalType: 'FRICTION',
            severity: payload.score >= 0.8 ? 'HIGH' : 'MEDIUM',
            description: `Friction detected: ${payload.frictionType} on ${payload.details?.target || 'unknown'}`,
            timestamp: eventTime,
          }
        });
        break;

      case 'SessionSignal':
        await prisma.sessionSignal.create({
          data: {
            liveSessionId: liveSession.id,
            signalType: payload.signalType || 'CUSTOM',
            severity: payload.severity || 'LOW',
            description: payload.description || '',
            timestamp: eventTime,
          }
        });
        break;

      default:
        // Generic Telemetry Event Logger
        await prisma.telemetryEvent.create({
          data: {
            liveSessionId: liveSession.id,
            eventType: eventType,
            payload: payload || {},
            timestamp: eventTime,
          }
        });
        break;
    }
  }

  // 4. Audit Log creation for compliance
  await prisma.telemetryAuditRecord.create({
    data: {
      projectId,
      liveSessionId: liveSession?.id || null,
      actionType: 'INGESTION',
      details: {
        eventCount: events.length,
        sessionKey,
      }
    }
  });

  // 5. Trigger live anomaly analysis asynchronously
  if (liveSession) {
    LiveAnomalyDetector.analyzeSessionEvents(liveSession.id).catch((err: any) => {
      console.error('[TelemetryIngest] Background anomaly analysis failed:', err);
    });
  }

  return c.json({ success: true, processed: events.length });
});

/**
 * GET /api/telemetry/session/:id
 * Retrieve live user timeline, metadata and friction events.
 */
telemetryRoutes.get('/session/:id', async (c) => {
  const sessionId = c.req.param('id');
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      navigationEvents: { orderBy: { timestamp: 'asc' } },
      interactionEvents: { orderBy: { timestamp: 'asc' } },
      frictionSignals: { orderBy: { timestamp: 'asc' } },
      sessionSignals: { orderBy: { timestamp: 'asc' } },
      sessionHeartbeats: { orderBy: { sequenceNumber: 'asc' } },
    }
  });

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ session });
});

/**
 * GET /api/telemetry/signals
 * Queries all friction signals across active user base.
 */
telemetryRoutes.get('/signals', async (c) => {
  const projectId = c.req.query('projectId');
  const limit = parseInt(c.req.query('limit') || '50');

  const signals = await prisma.sessionSignal.findMany({
    where: projectId ? { liveSession: { projectId } } : undefined,
    include: {
      liveSession: true,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json({ signals });
});

/**
 * GET /api/telemetry/events
 * Live query list of recent events.
 */
telemetryRoutes.get('/events', async (c) => {
  const limit = parseInt(c.req.query('limit') || '30');
  const events = await prisma.telemetryEvent.findMany({
    include: {
      liveSession: true,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json({ events });
});
