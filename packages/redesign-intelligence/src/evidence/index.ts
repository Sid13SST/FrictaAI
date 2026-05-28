export interface EvidenceTraceLink {
  recommendationId: string;
  sessionRefId?: string;
  findingRefId?: string;
  notes: string;
}

export function bindEvidenceTrace(
  recommendationId: string,
  sessionRefId?: string,
  findingRefId?: string,
  notes = 'Correlated to usability findings'
): EvidenceTraceLink {
  return {
    recommendationId,
    sessionRefId,
    findingRefId,
    notes
  };
}
