import { getAuth } from '@hono/clerk-auth';
import type { MiddlewareHandler } from 'hono';
import { httpRequestDurationMicroseconds, errorCounter } from '../utils/metrics';

export function customLogger(): MiddlewareHandler {
  return async (c, next) => {
    const timestamp = new Date().toISOString();
    const reqId = c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15);
    c.header('x-request-id', reqId);
    c.set('requestId', reqId);

    const start = Date.now();
    const { method, path } = c.req;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    let userId = 'anonymous';
    try {
      const auth = getAuth(c);
      userId = auth?.userId || 'anonymous';
    } catch (err) {
      // Safe fallback for unauthenticated, mock, or test environments
    }



    // Check if error was set on context or if status >= 400
    let errorCode = undefined;
    let classification = undefined;
    if (status >= 400) {
      if (status === 401) {
        errorCode = 'UNAUTHORIZED';
        classification = 'AUTH';
      } else if (status === 403) {
        errorCode = 'FORBIDDEN';
        classification = 'AUTH';
      } else if (status === 404) {
        errorCode = 'NOT_FOUND';
        classification = 'NOT_FOUND';
      } else {
        errorCode = 'INTERNAL_SERVER_ERROR';
        classification = 'SERVER';
      }
      errorCounter.labels(classification, path).inc();
    }

    // Record the request duration in the histogram
    httpRequestDurationMicroseconds.labels(method, path, status.toString()).observe(duration);

    const logEntry = {
      level: status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO',
      timestamp,
      requestId: reqId,
      method,
      path,
      status,
      durationMs: duration,
      userId,
      projectId: c.req.header('x-project-id') || 'none',
      workflowId: c.req.header('x-workflow-id') || 'none',
      ...(errorCode ? { errorCode, classification } : {}),
    };

    console.log(JSON.stringify(logEntry));
  };
}
