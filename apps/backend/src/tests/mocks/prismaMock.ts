import { vi } from 'vitest';

export const mockPrisma = {
  project: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  workflowSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  workflowScreenshot: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  agentAction: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  agentThought: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  visualFinding: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  uXFinding: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  cognitiveSignal: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  executiveReport: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  uXReport: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  apiKey: {
    create: vi.fn(),
  },
  workspace: {
    findMany: vi.fn(),
  },
  workspaceMember: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  personaProfile: {
    count: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  uXSignal: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  uXRecommendation: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  uXScore: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  reportExport: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  behavioralReplayEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  investigationThread: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  operationalAlert: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn().mockImplementation((cb) => {
    if (typeof cb === 'function') {
      return cb(mockPrisma);
    }
    return Promise.resolve(cb);
  }),
};

vi.mock('@fricta/db', () => ({
  prisma: mockPrisma,
  PrismaClient: vi.fn().mockImplementation(function() {
    return mockPrisma;
  }),
}));
