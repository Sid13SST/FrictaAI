export interface MemoryEventPayload {
  description?: string;
  [key: string]: any;
}

export interface SharedMemoryEventInput {
  eventType: string;
  sourceAgent: string;
  payload: MemoryEventPayload;
}

export interface CorrelatedFindingInput {
  findingIds: string[];
  correlationType: string;
  summary: string;
  confidence: number;
  metadata?: any;
}

export interface CollaborativeInsightInput {
  title: string;
  summary: string;
  supportingEvidence: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
}

export interface MemorySnapshotInput {
  snapshotType: string;
  payload: any;
}
