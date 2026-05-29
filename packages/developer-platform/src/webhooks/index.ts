import { prisma } from '@fricta/db';
import * as crypto from 'crypto';

export interface WebhookEventPayload {
  eventId: string;
  eventType:
    | 'SessionCompleted'
    | 'ReplayCreated'
    | 'InvestigationCreated'
    | 'FindingGenerated'
    | 'ReportPublished'
    | 'PredictionGenerated'
    | 'RecommendationCreated'
    | 'OptimizationApproved'
    | 'AlertTriggered'
    | 'GovernanceEvent';
  timestamp: string;
  data: any;
}

export class WebhookDispatcher {
  /**
   * Computes the HMAC-SHA256 signature for a webhook payload.
   */
  static computeSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Dispatches an event payload to all registered and active webhook endpoints for a project.
   * Handles retry loop and logs delivery attempts.
   */
  static async dispatchEvent(projectId: string, event: WebhookEventPayload): Promise<void> {
    console.log(`[WebhookDispatcher] Fetching endpoints for project ${projectId} subscribing to ${event.eventType}`);

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { projectId, active: true },
    });

    const serializedPayload = JSON.stringify(event);

    for (const endpoint of endpoints) {
      // Filter out endpoints not subscribing to this event type
      const subscribedEvents = endpoint.events as string[];
      if (!subscribedEvents.includes(event.eventType)) {
        continue;
      }

      // Compute HMAC signature
      const signature = this.computeSignature(serializedPayload, endpoint.secret);

      // Perform delivery (with retry logic)
      let attempt = 0;
      const maxRetries = 3;
      let success = false;
      let statusCode: number | null = null;
      let errorMessage: string | null = null;

      while (attempt <= maxRetries && !success) {
        console.log(`[WebhookDispatcher] Delivery attempt ${attempt + 1} to: ${endpoint.url}`);
        
        try {
          // Solo mode check: if URL starts with mock:, we skip actual HTTP call
          if (endpoint.url.startsWith('mock:') || endpoint.url.includes('mock-webhook')) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            statusCode = 200;
            success = true;
          } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-fricta-signature': signature,
                'x-fricta-event': event.eventType,
              },
              body: serializedPayload,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            statusCode = res.status;
            success = res.ok;

            if (!success) {
              errorMessage = `HTTP error! Status: ${res.status}`;
            }
          }
        } catch (err: any) {
          statusCode = null;
          success = false;
          errorMessage = err.message || 'Network timeout';
        }

        if (!success) {
          attempt++;
          // Wait before retrying (exponential backoff)
          if (attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          }
        }
      }

      // Record delivery log in DB
      await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventType: event.eventType,
          payload: event.data || {},
          statusCode,
          success,
          errorMessage,
          retryCount: attempt,
          deliveredAt: new Date(),
        },
      });

      console.log(`[WebhookDispatcher] Delivery to ${endpoint.url} status: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }
}
