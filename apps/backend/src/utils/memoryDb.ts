import { SessionManager } from '@fricta/agent';

export const memoryProjects: any[] = [
  {
    id: 'default-mem-project-id',
    projectName: 'Demo E-commerce Project (In-Memory Fallback)',
    websiteUrl: 'https://example.com',
    createdAt: new Date(),
  }
];

export const activeSessions = new Map<string, SessionManager>();
export const memorySessions = new Map<string, any>();
export const memoryInteractions = new Map<string, any[]>();
export const memoryScreenshots = new Map<string, any[]>();
export const memoryReports = new Map<string, any>();
export const memoryInvestigations = new Map<string, any>();
