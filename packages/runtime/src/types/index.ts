export interface RuntimeOwnershipMetadata {
  version: number;
  workerId: string;
  hostName: string;
  pid: number;
  acquiredAt: string;
}

export interface WorkerAssignmentMetadata {
  version: number;
  workerId: string;
  agentType: string;
  assignedAt: string;
  heartbeatAt: string;
}

export interface RecoveryCheckpointMetadata {
  version: number;
  lastMilestone: string;
  completedTaskIds: string[];
  failedTaskIds: string[];
  retryAttempts: Record<string, number>;
  updatedAt: string;
}

export interface DistributedExecutionMetadata {
  version: number;
  queueName: string;
  jobId: string;
  retryCount: number;
  lastError?: string;
  recoveredFromWorkerId?: string;
}

// Telemetry Types
export interface QueueMetrics {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface WorkerHealth {
  workerId: string;
  status: 'ACTIVE' | 'STALE' | 'DEAD';
  cpuUsage: number;
  memoryUsage: number; // in MB
  activeJobs: number;
  lastHeartbeat: string;
}

export interface BrowserPoolStatus {
  activeContexts: number;
  idleContexts: number;
  totalLaunched: number;
  recycledCount: number;
  contextLeaseAvgMs: number;
}

export interface RuntimeTelemetry {
  timestamp: string;
  queues: QueueMetrics[];
  workers: WorkerHealth[];
  browserPool: BrowserPoolStatus;
  activeSessions: number;
  totalErrors: number;
}
