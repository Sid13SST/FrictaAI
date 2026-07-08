import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, API_BASE } from '../../lib/api';
import {
  Download, Clipboard, Brain, ShieldAlert, Sparkles,
  Code, FileText, Check, RefreshCw, ChevronRight,
  Activity, TrendingUp, BarChart3
} from 'lucide-react';
import { CinematicReplayViewer } from '../replay/CinematicReplayViewer';
import { PersonaComparisonPanel } from '../personas/PersonaComparisonPanel';
import { GlobalInsightEngine } from '../insights/GlobalInsightEngine';
import { CorrelatedTimeline } from '../timeline/CorrelatedTimeline';
import { FrictionProgressionGraph } from '../visuals/FrictionProgressionGraph';
import { AgentOrchestrationConsole } from '../orchestrator/AgentOrchestrationConsole';

interface UnifiedReportViewerProps {
  sessionId: string;
}

// ─── Pill tab ──────────────────────────────────────────────────────────────────

// ─── Score Gauge ───────────────────────────────────────────────────────────────

const ScoreGauge = ({ label, value }: { label: string; value: number }) => {
  const color =
    value >= 80 ? '#6366f1' :
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
    LOW:      { color: '#6366f1', bg: 'rgba(99, 102, 241,0.08)', border: 'rgba(99, 102, 241,0.2)' },
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
      style={{ background: 'linear-gradient(to right, transparent, rgba(99, 102, 241,0.25), transparent)' }}
    />
    {children}
  </div>
);

// ─── Main Viewer ──────────────────────────────────────────────────────────────

export const UnifiedReportViewer: React.FC<UnifiedReportViewerProps> = ({ sessionId }) => {
  type TabKey = 'replay' | 'timeline' | 'personas' | 'insights' | 'orchestrator';
  const [activeTab, setActiveTab] = useState<TabKey>('replay');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [reportData, setReportData] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [recommendationsData, setRecommendationsData] = useState<any>(null);

  const fetchReportData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const backendBase = API_BASE.replace('/api', '');
      const [repRes, execRes, expRes, timeRes, recRes] = await Promise.all([
        apiFetch(`/reports/${sessionId}`),
        apiFetch(`/reports/${sessionId}/executive`),
        apiFetch(`/reports/${sessionId}/export`),
        apiFetch(`/reports/${sessionId}/timeline`),
        apiFetch(`/ux/recommendations/${sessionId}`),
      ]);
      if (!repRes.ok) throw new Error('Report dataset not found');
      const [rep, exec, exp, time, rec] = await Promise.all([
        repRes.json(), execRes.json(), expRes.json(), timeRes.json(), recRes.json(),
      ]);
      setReportData(rep);
      setExecutiveSummary(exec);
      setExportData(exp);
      setTimelineData(time);
      setRecommendationsData(rec);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflow report analytics.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchReportData(true); }, [sessionId]);

  const handleRunDiagnostics = async () => {
    setAnalyzing(true);
    try {
      const res = await apiFetch(`/orchestrator/start/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start orchestration');
      }
      setActiveTab('orchestrator');
      await fetchReportData(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to trigger UX diagnostics: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
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
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(99, 102, 241,0.4)', borderTopColor: '#6366f1' }}
        />
        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Aggregating UX session intelligence telemetry...
        </span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !reportData) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 animate-bounce" />
        <h3 className="text-base font-bold text-white">Analysis Generation Failed</h3>
        <p className="text-xs max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {error || 'Session report details are missing.'}
        </p>
        <button
          onClick={() => fetchReportData(true)}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl font-mono mt-2"
          style={{ background: 'rgba(99, 102, 241,0.1)', border: '1px solid rgba(99, 102, 241,0.25)', color: '#6366f1' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const scores = reportData.scores;
  const screenshots = timelineData?.screenshots || [];
  const timeline = timelineData?.timeline || [];
  const grade = executiveSummary?.overallUXGrade || 'C';

  const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
    { key: 'replay',       label: 'Timeline Replay',       icon: <Activity className="w-3 h-3" /> },
    { key: 'timeline',     label: 'Event Stream',          icon: <TrendingUp className="w-3 h-3" /> },
    { key: 'personas',     label: 'Persona Simulations',   icon: <Sparkles className="w-3 h-3" /> },
    { key: 'insights',     label: 'UX Insights',           icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'orchestrator', label: 'Agent Orchestration',   icon: <Brain className="w-3 h-3" /> },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* ── Left Sidebar ──────────────────────────────────────────────────────── */}
      <div className="xl:col-span-1 flex flex-col gap-5">

        {/* Grade Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-6 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6366f1]/40 to-transparent" />
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider font-mono">Executive UX Grade</span>
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#6366f1]/5 to-[#6366f1]/20 border-2 border-[#6366f1]/30 flex items-center justify-center text-3xl font-black text-[#6366f1] mt-4 shadow-[0_0_24px_rgba(99,102,241,0.15)] transition-transform hover:scale-105 duration-300">
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
                label: 'Markdown Document',
                icon: <FileText className="w-4 h-4" style={{ color: '#6366f1' }} />,
                onClick: () => downloadFile(exportData.markdown, `fricta-ux-report-${sessionId}.md`, 'text/markdown'),
              },
              {
                label: 'PM Summary Sheet',
                icon: <Clipboard className="w-4 h-4" style={{ color: '#a78bfa' }} />,
                onClick: handleCopyText,
                suffix: copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />,
              },
              {
                label: 'Developer JSON',
                icon: <Code className="w-4 h-4" style={{ color: '#60a5fa' }} />,
                onClick: () => downloadFile(exportData.developerJson, `fricta-ux-dump-${sessionId}.json`, 'application/json'),
              },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241,0.2)';
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
          </div>
        </Panel>
      </div>

      {/* ── Main Panel ────────────────────────────────────────────────────────── */}
      <div className="xl:col-span-3 flex flex-col gap-6">

        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#222226] pb-1">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all relative flex items-center gap-2 ${
                  activeTab === t.key
                    ? 'border-[#6366f1] text-white'
                    : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap mb-2 sm:mb-0">
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#4f46e5] hover:to-[#3730a3] text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex flex-col gap-6">
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
        )}

        {activeTab === 'timeline' && timeline.length > 0 && (
          <CorrelatedTimeline
            timeline={timeline}
            screenshots={screenshots}
            activeStep={activeStep}
            onStepSelect={setActiveStep}
          />
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
                    style={{ background: 'rgba(99, 102, 241,0.08)', color: '#6366f1', border: '1px solid rgba(99, 102, 241,0.2)' }}
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
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
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
                            <span className="font-bold" style={{ color: '#6366f1' }}>→ Recommendation: </span>
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
          <AgentOrchestrationConsole
            sessionId={sessionId}
            onOrchestrationComplete={() => fetchReportData(false)}
          />
        )}
      </div>
    </div>
  );
};
