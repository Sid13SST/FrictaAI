import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiJson, ensureOk } from '../../lib/api';
import { toApiError } from '../../lib/errors';
import { toast } from '../../lib/toast';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton, SkeletonGroup } from '../../components/common/Skeleton';
import {
  Download, Clipboard, Brain, ShieldAlert, Sparkles,
  Code, FileText, Check, RefreshCw, ChevronRight,
  Activity, TrendingUp, BarChart3, FileDown, Loader2
} from 'lucide-react';
import { CinematicReplayViewer } from '../replay/CinematicReplayViewer';
import { PersonaComparisonPanel } from '../personas/PersonaComparisonPanel';
import { GlobalInsightEngine } from '../insights/GlobalInsightEngine';
import { CorrelatedTimeline } from '../timeline/CorrelatedTimeline';
import { FrictionProgressionGraph } from '../visuals/FrictionProgressionGraph';
import { AgentOrchestrationConsole } from '../orchestrator/AgentOrchestrationConsole';
import { AIPipelineRibbon } from '../shared/AIPipelineRibbon';
import { UXIntelligenceTab } from '../../components/reports/UXIntelligenceTab';
import { DesktopOnlyNotice } from '../../components/common/DesktopOnlyNotice';

interface UnifiedReportViewerProps {
  sessionId: string;
}

// ─── Pill tab ──────────────────────────────────────────────────────────────────

// ─── Score Gauge ───────────────────────────────────────────────────────────────

const ScoreGauge = ({ label, value }: { label: string; value: number }) => {
  const color =
    value >= 80 ? '#7342E2' :
    value >= 60 ? '#eab308' :
    value >= 40 ? '#f97316' :
    '#f87171';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span className="text-[10px] font-black font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}50` }}
        />
      </div>
    </div>
  );
};

// ─── Severity Badge ───────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config: Record<string, { color: string; bg: string; border: string }> = {
    CRITICAL: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
    HIGH:     { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)' },
    MEDIUM:   { color: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' },
    LOW:      { color: '#7342E2', bg: 'rgba(115, 66, 226,0.08)', border: 'rgba(115, 66, 226,0.2)' },
  };
  const s = config[severity] ?? config['LOW'];
  return (
    <span
      className="text-[8px] px-2 py-0.5 rounded font-black font-mono uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
};

// ─── Panel ───────────────────────────────────────────────────────────────────

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[#121214] border border-[#222226] rounded-xl relative overflow-hidden ${className}`}>
    <div
      className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
      style={{ background: 'linear-gradient(to right, transparent, rgba(115, 66, 226,0.25), transparent)' }}
    />
    {children}
  </div>
);

// ─── Main Viewer ──────────────────────────────────────────────────────────────

export const UnifiedReportViewer: React.FC<UnifiedReportViewerProps> = ({ sessionId }) => {
  type TabKey = 'replay' | 'timeline' | 'personas' | 'insights' | 'orchestrator' | 'findings';
  // Replay is desktop-only; below `lg` open on the findings tab so a phone
  // lands on real content instead of the "optimized for desktop" notice.
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? 'replay' : 'findings');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [reportData, setReportData] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [recommendationsData, setRecommendationsData] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchReportData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [repRes, execRes, expRes, timeRes, recRes] = await Promise.all([
        apiFetch(`/reports/${sessionId}`),
        apiFetch(`/reports/${sessionId}/executive`),
        apiFetch(`/reports/${sessionId}/export`),
        apiFetch(`/reports/${sessionId}/timeline`),
        apiFetch(`/ux/recommendations/${sessionId}`),
      ]);
      await ensureOk(repRes);
      const [rep, exec, exp, time, rec] = await Promise.all([
        repRes.json(), execRes.json(), expRes.json(), timeRes.json(), recRes.json(),
      ]);
      setReportData(rep);
      setExecutiveSummary(exec);
      setExportData(exp);
      setTimelineData(time);
      setRecommendationsData(rec);
    } catch (err) {
      // A background refresh failing shouldn't blank a report that's already on screen.
      if (showLoading) setError(toApiError(err));
      else toast.error(err, 'refresh this report');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchReportData(true); }, [sessionId]);

  const handleRunDiagnostics = async () => {
    setAnalyzing(true);
    try {
      await apiJson(`/orchestrator/start/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      });
      setActiveTab('orchestrator');
      toast.info('UX diagnostics started', 'Specialist agents are analyzing this session. Results stream into the Agent Orchestration tab.');
      await fetchReportData(false);
    } catch (err) {
      toast.error(err, 'start UX diagnostics');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadFile = (content: string | undefined, filename: string, contentType: string) => {
    // The export bundle is fetched alongside the report; if that one request
    // failed there is nothing to download yet.
    if (typeof content !== 'string' || content.length === 0) {
      toast.error(new Error('export unavailable'), 'prepare that export');
      return;
    }
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const res = await ensureOk(await apiFetch(`/reports/${sessionId}/export/pdf`));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fricta-ux-report-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      setPdfError("The PDF couldn't be generated. Try again in a moment.");
      toast.error(err, 'generate the PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyText = () => {
    if (exportData?.textSheet) {
      navigator.clipboard.writeText(exportData.textSheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      downloadFile(exportData.textSheet, `fricta-pm-summary-${sessionId}.txt`, 'text/plain');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SkeletonGroup label="Loading report" className="flex flex-col gap-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-1 flex flex-col gap-5">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
          <div className="xl:col-span-3 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !reportData) {
    return (
      <ErrorState
        className="min-h-[450px]"
        error={error ?? new Error('missing report')}
        action="load this report"
        onRetry={() => fetchReportData(true)}
      />
    );
  }

  const scores = reportData.scores;
  const screenshots = timelineData?.screenshots || [];
  const timeline = timelineData?.timeline || [];
  const grade = executiveSummary?.overallUXGrade || 'C';

  const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
    { key: 'replay',       label: 'Timeline Replay',       icon: <Activity className="w-3 h-3" /> },
    { key: 'findings',     label: 'UX Findings',           icon: <ShieldAlert className="w-3 h-3" /> },
    { key: 'timeline',     label: 'Event Stream',          icon: <TrendingUp className="w-3 h-3" /> },
    { key: 'personas',     label: 'Persona Simulations',   icon: <Sparkles className="w-3 h-3" /> },
    { key: 'insights',     label: 'UX Insights',           icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'orchestrator', label: 'Agent Orchestration',   icon: <Brain className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AIPipelineRibbon
        active={['intelligence', 'correlation', 'severity', 'recommendations']}
        persona={reportData.session?.persona}
      />
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* ── Left Sidebar ──────────────────────────────────────────────────────── */}
      <div className="xl:col-span-1 flex flex-col gap-5">

        {/* Grade Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-6 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7342E2]/40 to-transparent" />
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider font-mono">Executive UX Grade</span>
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7342E2]/5 to-[#7342E2]/20 border-2 border-[#7342E2]/30 flex items-center justify-center text-3xl font-black text-[#7342E2] mt-4 shadow-[0_0_24px_rgba(115,66,226,0.15)] transition-transform hover:scale-105 duration-300">
            {grade}
          </div>
          <div className="text-xl font-bold text-white mt-4 font-mono">{scores.overallScore}/100</div>
          <p className="text-xs text-[#a1a1aa] mt-1 italic px-4 font-mono leading-relaxed">
            Workflow goal: "{reportData.session?.goal || 'Not specified'}"
          </p>
        </div>

        {/* Usability Pillars */}
        <Panel>
          <div className="p-5 flex flex-col gap-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Usability Pillars
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Onboarding',  val: scores.onboardingScore  ?? 0 },
                { label: 'Clarity',     val: scores.clarityScore     ?? 0 },
                { label: 'Architecture',val: scores.iaScore           ?? 0 },
                { label: 'Efficiency',  val: scores.efficiencyScore  ?? 0 },
              ].map(s => <ScoreGauge key={s.label} label={s.label} value={s.val} />)}
            </div>
          </div>
        </Panel>

        {/* Export & Share */}
        <Panel>
          <div className="p-5 flex flex-col gap-3">
            <h4 className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Export & Share
            </h4>
            {[
              {
                key: 'pdf',
                label: downloadingPdf ? 'Generating PDF...' : 'PDF Report',
                icon: downloadingPdf
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#f87171' }} />
                  : <FileDown className="w-4 h-4" style={{ color: '#f87171' }} />,
                onClick: handleDownloadPdf,
                disabled: downloadingPdf,
              },
              {
                key: 'markdown',
                label: 'Markdown Document',
                icon: <FileText className="w-4 h-4" style={{ color: '#7342E2' }} />,
                onClick: () => downloadFile(exportData?.markdown, `fricta-ux-report-${sessionId}.md`, 'text/markdown'),
              },
              {
                key: 'summary',
                label: 'PM Summary Sheet',
                icon: <Clipboard className="w-4 h-4" style={{ color: '#a78bfa' }} />,
                onClick: handleCopyText,
                suffix: copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />,
              },
              {
                key: 'json',
                label: 'Developer JSON',
                icon: <Code className="w-4 h-4" style={{ color: '#60a5fa' }} />,
                onClick: () => downloadFile(exportData?.developerJson, `fricta-ux-dump-${sessionId}.json`, 'application/json'),
              },
            ].map(item => (
              <button
                key={item.key}
                onClick={item.onClick}
                disabled={item.disabled}
                className="w-full py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(115, 66, 226,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                <span className="flex items-center gap-2.5 text-white">{item.icon} {item.label}</span>
                {item.suffix ?? <Download className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>
            ))}
            {pdfError && (
              <p className="text-[10px] font-mono text-red-400 -mt-1">{pdfError}</p>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Main Panel ────────────────────────────────────────────────────────── */}
      <div className="xl:col-span-3 flex flex-col gap-6">

        {/* Navigation Tabs Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#222226] pb-1">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all relative flex items-center gap-2 ${
                  activeTab === t.key
                    ? 'border-[#7342E2] text-white'
                    : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap mb-2 lg:mb-0 whitespace-nowrap">
            <Link
              to={`/app/console/${sessionId}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#7342e2]/10 hover:bg-[#7342e2]/20 border border-[#7342e2]/30 text-[#7342e2] text-xs font-bold rounded-lg transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Launch Operational Console</span>
            </Link>

            <button
              onClick={handleRunDiagnostics}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7342E2] to-[#5C2FC2] hover:from-[#5C2FC2] hover:to-[#4C2494] text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-white animate-spin" />
                  <span>Running Diagnostics...</span>
                </>
              ) : (
                <>
                  <Brain className="w-3.5 h-3.5" />
                  <span>Run UX Diagnostics</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────────── */}

        {activeTab === 'replay' && (
          <>
            <DesktopOnlyNotice
              feature="Timeline Replay"
              description="Frame-by-frame session replay needs a larger screen. Switch to the UX Findings tab for the mobile-friendly view of this report."
            />
            <div className="hidden lg:flex flex-col gap-6">
              <CinematicReplayViewer
                screenshots={screenshots}
                timeline={timeline}
                visualFindings={reportData.visualFindings}
                activeStep={activeStep}
                setActiveStep={setActiveStep}
              />
              {timeline.length > 0 && (
                <FrictionProgressionGraph
                  timeline={timeline}
                  activeStep={activeStep}
                  onStepSelect={setActiveStep}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'findings' && (
          <UXIntelligenceTab sessionId={sessionId} />
        )}

        {activeTab === 'timeline' && timeline.length === 0 && (
          <EmptyState
            variant="inline"
            icon={<TrendingUp className="w-6 h-6" />}
            title="No events recorded for this audit"
            description="The event stream fills in as the agent navigates. This audit ended before any steps were captured."
            action={{ label: 'Run another audit', to: '/app/workflow' }}
          />
        )}

        {activeTab === 'timeline' && timeline.length > 0 && (
          <>
            <DesktopOnlyNotice
              feature="Event Stream"
              description="The correlated event timeline needs a larger screen. Switch to the UX Findings tab for the mobile-friendly view of this report."
            />
            <div className="hidden lg:block">
              <CorrelatedTimeline
                timeline={timeline}
                screenshots={screenshots}
                activeStep={activeStep}
                onStepSelect={setActiveStep}
              />
            </div>
          </>
        )}

        {activeTab === 'personas' && (
          <PersonaComparisonPanel
            personaProfiles={reportData.personaProfiles}
            uxFindings={reportData.uxFindings}
            cognitiveSignals={reportData.cognitiveSignals}
            recommendations={recommendationsData?.recommendations || []}
            scores={scores}
          />
        )}

        {activeTab === 'insights' && (
          <div className="flex flex-col gap-6">
            <GlobalInsightEngine executiveSummary={executiveSummary} />

            {/* UX Findings Checklist */}
            <Panel>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Detailed UX Findings
                  </h4>
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(115, 66, 226,0.08)', color: '#7342E2', border: '1px solid rgba(115, 66, 226,0.2)' }}
                  >
                    {reportData.uxFindings.length} findings
                  </span>
                </div>

                {reportData.uxFindings.length === 0 ? (
                  <div
                    className="rounded-xl p-8 text-center text-xs italic"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
                  >
                    No major UX defects flagged in this workflow.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reportData.uxFindings.map((finding: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-xl p-4 flex flex-col gap-3"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#7342E2' }} />
                            <span className="text-sm font-bold text-white leading-snug">{finding.title}</span>
                          </div>
                          <SeverityBadge severity={finding.severity} />
                        </div>
                        <p className="text-xs leading-relaxed pl-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {finding.description}
                        </p>
                        {finding.recommendation && (
                          <div
                            className="rounded-lg p-3 pl-5 text-[10px] font-mono leading-relaxed"
                            style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <span className="font-bold" style={{ color: '#7342E2' }}>→ Recommendation: </span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{finding.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'orchestrator' && (
          <>
            <DesktopOnlyNotice
              feature="Agent Orchestration"
              description="The multi-agent orchestration console needs a larger screen. Switch to the UX Findings tab for the mobile-friendly view of this report."
            />
            <div className="hidden lg:block">
              <AgentOrchestrationConsole
                sessionId={sessionId}
                onOrchestrationComplete={() => fetchReportData(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
};
