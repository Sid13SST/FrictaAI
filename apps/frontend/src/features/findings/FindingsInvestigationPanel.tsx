import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface UXFinding {
  id: string;
  findingType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  personaType: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  confidence: number;
  timestamp: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

interface FindingsInvestigationPanelProps {
  findings: UXFinding[];
  onFindingUpdated: (finding: UXFinding) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-[#7342e2] bg-[#7342e2]/10 border-[#7342e2]/20',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
  UNDER_REVIEW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  RESOLVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  DISMISSED: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/30',
};

const STATUS_OPTIONS = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export const FindingsInvestigationPanel: React.FC<FindingsInvestigationPanelProps> = ({
  findings,
  onFindingUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<'severity' | 'confidence' | 'timestamp'>('severity');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = [...findings];
    if (severityFilter !== 'ALL') list = list.filter((f) => f.severity === severityFilter);
    if (statusFilter !== 'ALL') list = list.filter((f) => (f.status || 'OPEN') === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.findingType.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortKey === 'severity') {
        return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      }
      if (sortKey === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return list;
  }, [findings, severityFilter, statusFilter, search, sortKey]);

  const handleSave = async (finding: UXFinding) => {
    const status = draftStatus[finding.id] ?? finding.status ?? 'OPEN';
    const notes = draftNotes[finding.id] ?? finding.resolutionNotes ?? '';
    setSavingId(finding.id);
    setSaveError((prev) => ({ ...prev, [finding.id]: '' }));
    try {
      const res = await apiFetch(`/ux/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update finding (${res.status})`);
      }
      const data = await res.json();
      onFindingUpdated(data.finding);
      setSavedId(finding.id);
      setTimeout(() => setSavedId((cur) => (cur === finding.id ? null : cur)), 2000);
    } catch (err: any) {
      setSaveError((prev) => ({ ...prev, [finding.id]: err.message || 'Update failed' }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#222226] pb-3">
        <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">UX Findings</h4>
        <span className="text-[9.5px] font-mono text-zinc-500">{filtered.length} / {findings.length} SHOWN</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings..."
            className="w-full bg-[#0d0d0f] border border-[#222226] rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7342e2]/40"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-[#0d0d0f] border border-[#222226] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-[#7342e2]/40"
        >
          <option value="ALL">All Severities</option>
          {Object.keys(SEVERITY_STYLES).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0d0d0f] border border-[#222226] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-[#7342e2]/40"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="bg-[#0d0d0f] border border-[#222226] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-[#7342e2]/40"
        >
          <option value="severity">Sort: Severity</option>
          <option value="confidence">Sort: Confidence</option>
          <option value="timestamp">Sort: Newest</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-zinc-600 font-mono text-[11px] italic">
          No findings match the current filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f) => {
            const isOpen = expandedId === f.id;
            const status = f.status || 'OPEN';
            return (
              <div key={f.id} className="bg-[#0d0d0f]/60 border border-[#222226] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(isOpen ? null : f.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#0d0d0f]/90 transition-colors"
                >
                  <span className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.LOW}`}>
                    {f.severity}
                  </span>
                  <span className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_STYLES[status] || STATUS_STYLES.OPEN}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-white font-bold font-mono truncate">{f.title}</span>
                  <span className="shrink-0 text-[9.5px] font-mono text-zinc-500">
                    {Math.round((f.confidence ?? 0) * 100)}% confidence
                  </span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#222226] pt-3">
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{f.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#121214] p-2.5 rounded border border-zinc-900">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Evidence</span>
                        <span className="text-[11px] text-zinc-300 font-sans">{f.evidence}</span>
                      </div>
                      <div className="bg-[#121214] p-2.5 rounded border border-zinc-900">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Recommendation</span>
                        <span className="text-[11px] text-zinc-300 font-sans">{f.recommendation}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500">
                      <span>Category: <span className="text-zinc-300">{f.findingType}</span></span>
                      <span>Persona: <span className="text-zinc-300">{f.personaType}</span></span>
                      {f.resolvedBy && <span>Resolved by: <span className="text-zinc-300">{f.resolvedBy}</span></span>}
                    </div>

                    {/* Investigation controls */}
                    <div className="flex flex-col gap-2 bg-[#121214] p-3 rounded-lg border border-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">Status</span>
                        <select
                          value={draftStatus[f.id] ?? status}
                          onChange={(e) => setDraftStatus((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          className="bg-[#0d0d0f] border border-[#222226] rounded px-2 py-1 text-[10.5px] font-mono text-white focus:outline-none focus:border-[#7342e2]/40"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={draftNotes[f.id] ?? f.resolutionNotes ?? ''}
                        onChange={(e) => setDraftNotes((prev) => ({ ...prev, [f.id]: e.target.value }))}
                        placeholder="Investigator notes..."
                        rows={2}
                        className="w-full bg-[#0d0d0f] border border-[#222226] rounded px-2.5 py-1.5 text-[11px] font-sans text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7342e2]/40 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        {saveError[f.id] && (
                          <span className="text-[10px] font-mono text-red-400">{saveError[f.id]}</span>
                        )}
                        <button
                          onClick={() => handleSave(f)}
                          disabled={savingId === f.id}
                          className="ml-auto flex items-center gap-1.5 text-[10.5px] font-mono font-bold px-3 py-1.5 rounded bg-[#7342e2]/15 border border-[#7342e2]/30 text-[#7342e2] hover:bg-[#7342e2]/25 transition-colors disabled:opacity-50"
                        >
                          {savingId === f.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : savedId === f.id ? (
                            <Check className="w-3 h-3" />
                          ) : null}
                          {savingId === f.id ? 'Saving...' : savedId === f.id ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
