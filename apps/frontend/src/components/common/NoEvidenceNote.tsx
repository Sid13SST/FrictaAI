import { CircleSlash } from 'lucide-react';

export const NO_EVIDENCE_LABEL = 'Unavailable: no evidence';

/**
 * Placeholder for any diagnostic panel on a zero-evidence report (the audit
 * recorded no agent actions). Deliberately neutral: no numbers, no "Good",
 * no green check, nothing that reads like a clean result.
 */
export function NoEvidenceNote({ detail = 'The audit recorded no agent actions, so there is nothing to measure here.', compact = false, title = NO_EVIDENCE_LABEL }: { detail?: string; compact?: boolean; title?: string }) {
  return (
    <div
      role="note"
      data-no-evidence
      className={`flex flex-col items-center justify-center text-center gap-1.5 rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 ${compact ? 'py-5 px-4' : 'py-10 px-6'}`}
    >
      <CircleSlash className="w-5 h-5 text-slate-500" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{detail}</p>
    </div>
  );
}
