import { TelemetryConfig, BrowserMetadata } from '../types';
import { PrivacyProtector } from '../privacy';
import { InteractionCapture } from '../capture';
import { TelemetryQueue } from '../queue';

export class FrictaTelemetry {
  private static instance: FrictaTelemetry | null = null;
  private config: Required<TelemetryConfig>;
  private privacy: PrivacyProtector;
  private capture!: InteractionCapture;
  private queue!: TelemetryQueue;
  private sessionKey = '';
  private initialized = false;
  private heartbeatTimer: any = null;
  private heartbeatSequence = 0;
  private activeDurationSeconds = 0;

  private constructor(config: TelemetryConfig) {
    this.config = {
      projectId: config.projectId,
      apiKey: config.apiKey || '',
      endpoint: config.endpoint || '/api/telemetry/ingest',
      privacy: {
        maskAllInputs: config.privacy?.maskAllInputs ?? true,
        maskedInputClasses: config.privacy?.maskedInputClasses ?? ['fricta-mask'],
        unmaskedInputClasses: config.privacy?.unmaskedInputClasses ?? ['fricta-unmask'],
        consentGiven: config.privacy?.consentGiven ?? false,
        redactKeywords: config.privacy?.redactKeywords ?? undefined,
        enableDomRedaction: config.privacy?.enableDomRedaction ?? true,
      },
      session: {
        heartbeatIntervalSeconds: config.session?.heartbeatIntervalSeconds ?? 30,
        inactivityTimeoutSeconds: config.session?.inactivityTimeoutSeconds ?? 1800,
      },
      samplingRate: config.samplingRate ?? 1.0,
      batchIntervalMs: config.batchIntervalMs ?? 5000,
      maxBatchSize: config.maxBatchSize ?? 50,
    };

    this.privacy = new PrivacyProtector(this.config.privacy);
  }

  /**
   * Initializes the Fricta Telemetry SDK.
   */
  static init(config: TelemetryConfig): FrictaTelemetry {
    if (this.instance) {
      return this.instance;
    }
    
    // Sampling rate evaluation
    if (config.samplingRate !== undefined && Math.random() > config.samplingRate) {
      console.log('[FrictaTelemetry] Session skipped due to sampling rate restriction.');
    }

    this.instance = new FrictaTelemetry(config);
    this.instance.setup();
    return this.instance;
  }

  /**
   * Gets the active instance.
   */
  static getInstance(): FrictaTelemetry {
    if (!this.instance) {
      throw new Error('[FrictaTelemetry] Instance not initialized. Please call FrictaTelemetry.init(config) first.');
    }
    return this.instance;
  }

  /**
   * Setup session details and start global hooks.
   */
  private setup(): void {
    if (this.initialized || typeof window === 'undefined') return;

    this.sessionKey = this.getOrCreateSessionKey();
    this.queue = new TelemetryQueue(
      this.config.endpoint,
      this.config.apiKey,
      this.config.batchIntervalMs,
      this.config.maxBatchSize
    );

    this.capture = new InteractionCapture(this.privacy, (captured) => {
      // Gate via consent protector
      if (!this.privacy.isConsentGranted()) return;

      this.queue.push({
        eventId: `evt_${Math.random().toString(36).substring(2, 11)}`,
        eventType: captured.eventType,
        timestamp: captured.timestamp,
        payload: {
          ...captured.payload,
          projectId: this.config.projectId,
          sessionKey: this.sessionKey,
        }
      });
    });

    this.capture.start();
    this.startHeartbeat();
    this.bindErrorListeners();
    this.initialized = true;

    // Send initial session start payload if consent is granted
    if (this.privacy.isConsentGranted()) {
      this.trackSessionStart();
    }
  }

  /**
   * Updates consent state dynamically (e.g. from cookie banners).
   */
  setConsent(granted: boolean): void {
    const wasGranted = this.privacy.isConsentGranted();
    this.privacy.setConsent(granted);

    if (granted && !wasGranted) {
      console.log('[FrictaTelemetry] User consent granted. Back-dispatching session initialization.');
      this.trackSessionStart();
    }
  }

  /**
   * Dispatches a custom UX/friction signal to the stream.
   */
  trackSignal(signalType: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', description: string): void {
    if (!this.privacy.isConsentGranted()) return;

    this.queue.push({
      eventId: `sig_${Math.random().toString(36).substring(2, 11)}`,
      eventType: 'SessionSignal',
      timestamp: new Date().toISOString(),
      payload: {
        projectId: this.config.projectId,
        sessionKey: this.sessionKey,
        signalType,
        severity,
        description
      }
    });
  }

  /**
   * Retrieves or creates a temporary sessionKey for cross-reloads correlation.
   */
  private getOrCreateSessionKey(): string {
    const key = 'fricta_live_session_key';
    let sessionKey = sessionStorage.getItem(key);
    if (!sessionKey) {
      sessionKey = `fricta_sess_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      sessionStorage.setItem(key, sessionKey);
    }
    return sessionKey;
  }

  /**
   * Parses user agent for basic OS, browser, and device metrics.
   */
  private getBrowserMetadata(): BrowserMetadata {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
    else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Mobile'; }

    return {
      browser,
      os,
      device,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  }

  /**
   * Track session initialization.
   */
  private trackSessionStart(): void {
    const meta = this.getBrowserMetadata();
    this.queue.push({
      eventId: `init_${Math.random().toString(36).substring(2, 11)}`,
      eventType: 'LiveSessionCreated',
      timestamp: new Date().toISOString(),
      payload: {
        projectId: this.config.projectId,
        sessionKey: this.sessionKey,
        browser: meta.browser,
        os: meta.os,
        device: meta.device,
        ipAddress: '127.0.0.1', // Hydrated by server
        location: 'Localhost',
      }
    });
  }

  /**
   * Tracks periodic heartbeats to maintain session status.
   */
  private startHeartbeat(): void {
    const intervalSeconds = this.config.session?.heartbeatIntervalSeconds || 30;
    this.heartbeatTimer = setInterval(() => {
      if (!this.privacy.isConsentGranted()) return;

      this.activeDurationSeconds += intervalSeconds;
      this.heartbeatSequence += 1;

      this.queue.push({
        eventId: `hb_${Math.random().toString(36).substring(2, 11)}`,
        eventType: 'SessionHeartbeat',
        timestamp: new Date().toISOString(),
        payload: {
          projectId: this.config.projectId,
          sessionKey: this.sessionKey,
          sequenceNumber: this.heartbeatSequence,
          activeDurationSeconds: this.activeDurationSeconds,
        }
      });
    }, intervalSeconds * 1000);
  }

  /**
   * Registers global page error boundary hooks.
   */
  private bindErrorListeners(): void {
    window.addEventListener('error', (event) => {
      this.trackSignal(
        'SCRIPT_ERROR',
        'HIGH',
        `Uncaught error in execution: ${event.message} at ${event.filename}:${event.lineno}`
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackSignal(
        'UNHANDLED_REJECTION',
        'MEDIUM',
        `Promise rejection caught: ${event.reason?.message || event.reason}`
      );
    });
  }
}
