export type AgentLifecycleState = 
  | 'IDLE' 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'WAITING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type AgentType = 
  | 'VISUAL_AUDITOR' 
  | 'COGNITIVE_SIMULATOR' 
  | 'UX_ORCHESTRATOR';

export interface OrchestrationTask {
  id: string;
  agentType: AgentType;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies: string[]; // task IDs
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  retryCount: number;
}

export interface AgentMessage {
  fromAgent: string;
  toAgent: string;
  messageType: 'TASK_ASSIGN' | 'TASK_PROGRESS' | 'TASK_SUCCESS' | 'TASK_FAILURE' | 'EVIDENCE_SYNC';
  payload: any;
  timestamp: Date;
}

export interface OrchestrationTimelineEventPayload {
  agentType?: string;
  taskId?: string;
  description?: string;
  error?: string;
  retryAttempt?: number;
  synchronizedFindingsCount?: number;
}
