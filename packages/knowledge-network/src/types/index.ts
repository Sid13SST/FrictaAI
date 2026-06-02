export type EntityType =
  | 'PROJECT'
  | 'WORKSPACE'
  | 'OBJECTIVE'
  | 'INITIATIVE'
  | 'KPI'
  | 'OUTCOME'
  | 'RECOMMENDATION'
  | 'INVESTIGATION'
  | 'REPLAY'
  | 'PERSONA'
  | 'RISK'
  | 'GOVERNANCE_RECORD';

export type RelationshipType =
  | 'SUPPORTS'
  | 'BLOCKS'
  | 'INFLUENCES'
  | 'DEPENDS_ON'
  | 'CORRELATES_WITH'
  | 'DERIVED_FROM'
  | 'RELATED_TO'
  | 'REFERENCES';

export type DiscoveryType =
  | 'FINDING'
  | 'RISK'
  | 'INITIATIVE'
  | 'OUTCOME'
  | 'PERSONA'
  | 'OBJECTIVE';

export interface GraphNode {
  id: string;
  projectId: string;
  entityType: EntityType;
  referenceId: string;
  name: string;
  description?: string | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  confidence: number;
  description?: string | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  evidenceCount: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResult {
  node: GraphNode;
  score: number;
  matchType: 'NAME' | 'DESCRIPTION' | 'EVIDENCE' | 'TYPE';
}

export interface EvidenceNode {
  evidenceId: string;
  evidenceType: string;
  referenceId: string;
  description: string;
  entityDetails?: any;
}
