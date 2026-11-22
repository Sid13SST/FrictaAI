import { UXFindingData, CognitiveSignalData, PersonaProfileData } from '@fricta/ux-intelligence';
import { VisualFindingData } from '@fricta/visual-intelligence';

export interface WorkflowSessionDetails {
  id: string;
  goal: string | null;
  persona: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  stepCount: number;
  /** Final run status (COMPLETED / FAILED / TIMEOUT / LOOP_DETECTED / RUNNING …). */
  status?: string | null;
}

/**
 * How much of the visual review actually had an AI vision pass.
 *   full            — vision answered for every screenshot it was asked about
 *   partial         — some vision calls failed / were skipped, or answers
 *                     were cut off and only partly recovered
 *   failed          — every vision call failed / was skipped
 *   heuristics_only — no vision pass ran (none was triggered); layout heuristics only
 *   not_analyzed    — visual analysis has not run for this session
 * Only 'full' is complete.
 */
export interface VisualCoverage {
  status: 'full' | 'partial' | 'failed' | 'heuristics_only' | 'not_analyzed';
  complete: boolean;
  screenshots: number;
  visionSucceeded: number;
  visionUnavailable: number;
  /** Vision answers that were cut off and repaired (counted in visionSucceeded). */
  visionTruncated: number;
  /** Human-readable, shown in the UI, exports and PDF. */
  note: string;
}

/** Shown instead of any behavioural value on a zero-evidence report. */
export const NO_EVIDENCE_LABEL = 'Unavailable: no evidence';

export interface AuditEvidenceInfo {
  status: 'sufficient' | 'insufficient';
  /** Set when insufficient; shown wherever a score would be. */
  reason?: string;
}

export interface UnifiedUXReportPayload {
  session: WorkflowSessionDetails;
  /** All null when evidence.status is 'insufficient'. */
  scores: {
    clarityScore: number | null;
    onboardingScore: number | null;
    iaScore: number | null;
    efficiencyScore: number | null;
    overallScore: number | null;
    /** How overallScore was derived (see scoreAudit in @fricta/ux-engine). */
    basis?: {
      goalReached: boolean;
      behaviouralOverall: number | null;
      uxFindingsPenalty: number;
      visualFindingsPenalty: number;
      outcomeCap: number | null;
    };
  };
  evidence?: AuditEvidenceInfo;
  visualCoverage?: VisualCoverage;
  /**
   * 'pending' while the audit is still running or its post-run analysis
   * (visual review, UX analysis, scoring) has not finished: scores are null
   * and nothing may be presented as final. 'ready' afterwards.
   */
  analysis?: { state: 'pending' | 'ready'; note?: string };
  uxFindings: UXFindingData[];
  cognitiveSignals: CognitiveSignalData[];
  visualFindings: VisualFindingData[];
  personaProfiles: PersonaProfileData[];
}

export interface ExecutiveSummaryPayload {
  /** 'N/A' when there is not enough evidence to grade. */
  overallUXGrade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  overallScore: number | null;
  evidenceStatus: 'sufficient' | 'insufficient';
  /** 'pending' = provisional report (analysis still running); no grade yet. */
  analysisState: 'pending' | 'ready';
  onboardingFrictionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  discoverabilityRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  majorFrictionStepIndices: number[];
  synthesizedInsights: string[];
  visualCoverageNote?: string;
}

export interface CorrelatedTimelineEvent {
  id: string;
  stepIndex: number;
  timestamp: Date;
  eventType: 'ACTION' | 'THOUGHT' | 'ERROR' | 'VISUAL_FINDING' | 'COGNITIVE_SPIKE';
  title: string;
  description: string;
  metadata?: any;
}
