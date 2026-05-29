import { FrictaClient } from '../sdk';

export class FrictaCli {
  private client: FrictaClient | null = null;
  private currentApiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.currentApiKey = apiKey;
      this.client = new FrictaClient({ apiKey });
    }
  }

  /**
   * Mock CLI Login helper.
   */
  async login(apiKey: string): Promise<string> {
    this.currentApiKey = apiKey;
    this.client = new FrictaClient({ apiKey });
    return `[CLI] Authenticated successfully with key fricta_live_...${apiKey.substring(apiKey.length - 6)}`;
  }

  /**
   * Processes CLI arguments and returns console output.
   */
  async executeCommand(args: string[]): Promise<string> {
    const command = args[0];
    const subCommand = args[1];

    if (!command) {
      return this.getHelpText();
    }

    if (command === 'login') {
      const key = args[1];
      if (!key) return 'Error: API Key is required for login. Usage: fricta login <api_key>';
      return this.login(key);
    }

    if (!this.client) {
      return 'Error: CLI is not authenticated. Please run "fricta login <api_key>" first.';
    }

    try {
      switch (command) {
        case 'replay':
          if (subCommand === 'list') {
            const data = await this.client.replays.list();
            return JSON.stringify(data.replays, null, 2);
          }
          return 'Unknown replay sub-command. Try: fricta replay list';

        case 'findings':
          if (subCommand === 'search') {
            const data = await this.client.findings.list();
            return JSON.stringify(data.findings, null, 2);
          }
          return 'Unknown findings sub-command. Try: fricta findings search';

        case 'investigation':
          if (subCommand === 'open') {
            const data = await this.client.investigations.list();
            return JSON.stringify(data.investigations, null, 2);
          }
          return 'Unknown investigation sub-command. Try: fricta investigation open';

        case 'report':
          if (subCommand === 'generate') {
            const data = await this.client.reports.list();
            return `[CLI] Report generated successfully.\n` + JSON.stringify(data.reports, null, 2);
          }
          return 'Unknown report sub-command. Try: fricta report generate';

        case 'workspace':
          if (subCommand === 'list') {
            return JSON.stringify([
              { id: 'ws_01', name: 'Fricta Core Workspace', plan: 'Enterprise' }
            ], null, 2);
          }
          return 'Unknown workspace sub-command. Try: fricta workspace list';

        default:
          return `Unknown command "${command}". Try "fricta help" to see available options.`;
      }
    } catch (err: any) {
      return `Error executing command: ${err.message}`;
    }
  }

  private getHelpText(): string {
    return `
Fricta CLI Tool — Programmable UX Observability

Usage: fricta <command> <sub-command> [options]

Commands:
  login <apiKey>          Authenticate with the developer platform
  replay list             List timeline events and metrics for session replays
  findings search         Retrieve and filter usability findings
  report generate         Compile and output usability reports
  investigation open      List active investigation rooms
  workspace list          List workspaces associated with API key
`;
  }
}
