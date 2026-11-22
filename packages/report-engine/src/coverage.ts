import { VisualCoverage } from './types';

/**
 * Derive visual coverage from what visual analysis persisted:
 *   - 'vision_summary'     one per screenshot where the vision model answered
 *   - 'vision_unavailable' one per screenshot where vision failed or was skipped
 * `analyzed` is whether visual analysis ran at all (a VisualScore exists).
 */
export function computeVisualCoverage(input: {
  screenshots: number;
  analyzed: boolean;
  visualFindings: Array<{ findingType: string; screenshotId?: string | null; metadata?: unknown }>;
}): VisualCoverage {
  const distinct = (type: string) =>
    new Set(input.visualFindings.filter((f) => f.findingType === type).map((f) => f.screenshotId ?? `${type}-${Math.random()}`)).size;
  const visionSucceeded = distinct('vision_summary');
  const visionUnavailable = distinct('vision_unavailable');
  const visionTruncated = new Set(
    input.visualFindings
      .filter((f) => f.findingType === 'vision_summary' && (f.metadata as any)?.truncated === true)
      .map((f) => f.screenshotId ?? Math.random()),
  ).size;
  const base = { screenshots: input.screenshots, visionSucceeded, visionUnavailable, visionTruncated };

  if (!input.analyzed || input.screenshots === 0) {
    return { ...base, status: 'not_analyzed', complete: false, note: 'Visual analysis has not run for this audit; no visual review is included.' };
  }
  if (visionUnavailable > 0 && visionSucceeded === 0) {
    return { ...base, status: 'failed', complete: false,
      note: `AI vision failed or was skipped for all ${visionUnavailable} screenshot(s) it was asked to review (e.g. rate limits or empty responses). Visual findings come from layout heuristics only.` };
  }
  if (visionUnavailable > 0) {
    return { ...base, status: 'partial', complete: false,
      note: `AI vision answered for ${visionSucceeded} screenshot(s) but failed or was skipped for ${visionUnavailable}. Those steps were reviewed by layout heuristics only.` };
  }
  if (visionTruncated > 0) {
    return { ...base, status: 'partial', complete: false,
      note: `AI vision answered for ${visionSucceeded} screenshot(s), but ${visionTruncated} answer(s) were cut off by the model; only the findings completed before the cut are included.` };
  }
  if (visionSucceeded === 0) {
    return { ...base, status: 'heuristics_only', complete: false,
      note: 'No AI vision pass ran (none was triggered); visual findings come from layout heuristics only.' };
  }
  return { ...base, status: 'full', complete: true, note: `AI vision reviewed ${visionSucceeded} screenshot(s) without failures.` };
}
