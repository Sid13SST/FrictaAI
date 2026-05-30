export interface PrivacyOptions {
  maskAllInputs?: boolean;
  maskedInputClasses?: string[];
  unmaskedInputClasses?: string[];
  consentGiven?: boolean;
  redactKeywords?: string[];
  enableDomRedaction?: boolean;
}

export interface SessionOptions {
  heartbeatIntervalSeconds?: number;
  inactivityTimeoutSeconds?: number;
}

export interface TelemetryConfig {
  projectId: string;
  apiKey?: string;
  endpoint?: string;
  privacy?: PrivacyOptions;
  session?: SessionOptions;
  samplingRate?: number; // 0 to 1
  batchIntervalMs?: number;
  maxBatchSize?: number;
}

export interface BrowserMetadata {
  browser: string;
  os: string;
  device: string;
  viewportWidth: number;
  viewportHeight: number;
}

export interface TelemetryPayloadEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: any;
}
