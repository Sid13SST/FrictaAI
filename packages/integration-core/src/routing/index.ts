import { IntegrationProvider } from '../types';
import { FigmaConnector } from '../figma';
import { FigJamConnector } from '../figjam';
import { JiraConnector } from '../jira';
import { LinearConnector } from '../linear';
import { GitHubConnector } from '../github';
import { NotionConnector } from '../notion';
import { ProductboardConnector } from '../productboard';

/**
 * IntegrationRouter — centralized dispatch hub for all integration operations.
 * Routes intelligence propagation requests to the appropriate provider connector.
 */
export class IntegrationRouter {
  private static readonly SUPPORTED_PROVIDERS: IntegrationProvider[] = [
    'FIGMA', 'FIGJAM', 'NOTION', 'JIRA', 'LINEAR', 'GITHUB', 'PRODUCTBOARD'
  ];

  static getSupportedProviders(): IntegrationProvider[] {
    return this.SUPPORTED_PROVIDERS;
  }

  static getProviderDisplayName(provider: IntegrationProvider): string {
    const names: Record<IntegrationProvider, string> = {
      FIGMA: 'Figma',
      FIGJAM: 'FigJam',
      NOTION: 'Notion',
      JIRA: 'Jira',
      LINEAR: 'Linear',
      GITHUB: 'GitHub',
      PRODUCTBOARD: 'Productboard'
    };
    return names[provider];
  }

  static getProviderOAuthUrl(provider: IntegrationProvider): string {
    const urls: Record<IntegrationProvider, string> = {
      FIGMA: 'https://www.figma.com/oauth',
      FIGJAM: 'https://www.figma.com/oauth',
      NOTION: 'https://api.notion.com/v1/oauth/authorize',
      JIRA: 'https://auth.atlassian.com/authorize',
      LINEAR: 'https://linear.app/oauth/authorize',
      GITHUB: 'https://github.com/login/oauth/authorize',
      PRODUCTBOARD: 'https://app.productboard.com/oauth2/authorize'
    };
    return urls[provider];
  }

  static getProviderScopes(provider: IntegrationProvider): string {
    const scopes: Record<IntegrationProvider, string> = {
      FIGMA: 'file_read,webhook:write',
      FIGJAM: 'file_read,webhook:write',
      NOTION: 'read_content write_content',
      JIRA: 'read:jira-work write:jira-work',
      LINEAR: 'read write',
      GITHUB: 'repo issues:write pull_requests:write',
      PRODUCTBOARD: 'notes:write features:read'
    };
    return scopes[provider];
  }
}
