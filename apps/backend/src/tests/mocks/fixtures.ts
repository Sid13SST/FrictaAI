/**
 * Reusable Mock Fixtures for Fricta Backend Unit Tests (Deliverable 8 Recommendation)
 */

export const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockProject = {
  id: 'project_123',
  userId: 'user_123',
  projectName: 'Test Fricta Project',
  websiteUrl: 'https://test-fricta.ai',
  workspaceId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockWorkflow = {
  id: 'workflow_123',
  projectId: 'project_123',
  goal: 'Test User Workflow Goal',
  persona: 'BEGINNER',
  status: 'COMPLETED',
  stepCount: 3,
  queueJobId: null,
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  endedAt: new Date('2026-01-01T00:10:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const mockReplay = {
  id: 'replay_123',
  workflowSessionId: 'workflow_123',
  stepIndex: 1,
  screenshotUrl: 'https://test-fricta.ai/images/step1.png',
  actionType: 'click',
  targetElement: 'button#onboarding-start',
  createdAt: new Date('2026-01-01T00:01:00.000Z'),
};

export const mockFinding = {
  id: 'finding_123',
  workflowSessionId: 'workflow_123',
  title: 'Severe Navigation Hesitation',
  findingType: 'HESITATION',
  severity: 'HIGH',
  description: 'The user hesitated for 20 seconds before starting onboarding.',
  recommendation: 'Simplify onboarding instructions.',
  timestamp: new Date('2026-01-01T00:01:00.000Z'),
  evidence: 'User clicked start button slowly.',
};

export const mockReport = {
  id: 'report_123',
  projectId: 'project_123',
  title: 'Executive UX Report',
  summary: 'Overall usability score: 92.5%',
  stabilityScore: 92.5,
  completionRate: 100.0,
  riskLevel: 'LOW',
  sections: {},
  createdById: 'user_123',
  createdAt: new Date('2026-01-01T00:15:00.000Z'),
  updatedAt: new Date('2026-01-01T00:15:00.000Z'),
};
