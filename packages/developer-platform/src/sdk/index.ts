export interface FrictaClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FrictaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FrictaClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:3001/api/public';
  }

  /**
   * Helper to perform signed requests to Fricta public REST API.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP error! Status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      console.error(`[FrictaClient] Request failed for ${path}:`, err.message);
      throw err;
    }
  }

  /**
   * Replays API interface.
   */
  public replays = {
    list: async (): Promise<any> => {
      return this.request<any>('/replays');
    },
  };

  /**
   * Findings API interface.
   */
  public findings = {
    list: async (): Promise<any> => {
      return this.request<any>('/findings');
    },
  };

  /**
   * Investigations / War Rooms API interface.
   */
  public investigations = {
    list: async (): Promise<any> => {
      return this.request<any>('/investigations');
    },
  };

  /**
   * Reports API interface.
   */
  public reports = {
    list: async (): Promise<any> => {
      return this.request<any>('/reports');
    },
  };

  /**
   * Webhooks registration interface.
   */
  public webhooks = {
    register: async (dto: { url: string; secret: string; events: string[] }): Promise<any> => {
      return this.request<any>('/webhooks', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  };
}
