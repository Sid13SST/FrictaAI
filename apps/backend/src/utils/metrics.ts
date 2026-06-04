import * as client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register });

// Histogram for tracking P50/P95/P99 latency
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});
register.registerMetric(httpRequestDurationMicroseconds);

// Counter for tracking errors by classification
export const errorCounter = new client.Counter({
  name: 'app_errors_total',
  help: 'Total number of application errors',
  labelNames: ['classification', 'route'],
});
register.registerMetric(errorCounter);
