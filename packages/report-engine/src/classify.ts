import { VisualFindingData } from '@fricta/visual-intelligence';
import { WorkflowSessionDetails } from './types';

/**
 * Shared, presentation-neutral classification used by the PDF, Markdown, PM
 * summary and executive summary so they never disagree about what is an issue.
 */

/** Visual records that describe coverage or commentary, not defects. */
export const VISUAL_COVERAGE_TYPES = new Set(['vision_summary', 'vision_unavailable']);

export interface SplitVisualFindings {
  /** Actionable visual / discoverability issues (heuristic or AI vision). */
  issues: VisualFindingData[];
  /** AI vision commentary per screenshot (one per successful vision answer). */
  summaries: VisualFindingData[];
  /** Screenshots where AI vision failed or was skipped. */
  unavailable: VisualFindingData[];
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
export const severityRank = (s: string) => SEVERITY_ORDER[String(s).toUpperCase()] ?? 5;

export function splitVisualFindings(findings: VisualFindingData[]): SplitVisualFindings {
  const issues = findings
    .filter((f) => !VISUAL_COVERAGE_TYPES.has(f.findingType))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return {
    issues,
    summaries: findings.filter((f) => f.findingType === 'vision_summary'),
    unavailable: findings.filter((f) => f.findingType === 'vision_unavailable'),
  };
}

/** Where a visual issue came from. */
export function visualProvenance(f: VisualFindingData): string {
  return f.findingType === 'vision_finding' ? 'AI vision (model observation on a recorded screenshot)' : 'Layout heuristic (deterministic rule on a recorded screenshot)';
}

const VISUAL_TYPE_LABELS: Record<string, string> = {
  weak_cta: 'weak call-to-action',
  nav_overload: 'navigation overload',
  form_density: 'dense form',
  clutter: 'visual clutter',
  vision_finding: 'AI vision observation',
};
export const visualTypeLabel = (t: string) => VISUAL_TYPE_LABELS[t] ?? t.replace(/_/g, ' ');

/** The persona the agent actually ran as (the only one tested in this audit). */
export function testedPersona(session: WorkflowSessionDetails): string {
  return session.persona?.trim() || 'Default agent persona';
}

export const PERSONA_PROFILES_PROVENANCE =
  'Configured persona profiles: assumptions used for projections, NOT tested in this run.';

/** Empty-state wording scoped to what was observed, not a claim that no UX issues exist. */
export function noBehaviouralFindingsText(session: WorkflowSessionDetails): string {
  const n = session.stepCount ?? 0;
  return `No behavioural friction was detected in the ${n} recorded step${n === 1 ? '' : 's'} of this session. ` +
    'This covers only the observed path, not the whole product; see the visual findings and coverage notes.';
}
