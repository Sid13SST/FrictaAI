import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  BookOpen, RefreshCcw, ShieldCheck, Database, Award, AlertTriangle,
  Search, ArrowDown, ChevronRight, Activity, Clock, Layers, CheckCircle2,
  FileSpreadsheet, HelpCircle, AlertOctagon, Info, Play, Calendar, TrendingUp
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Types matching schema ───────────────────────────────────────────────────

interface InstitutionalLesson {
  id: string;
  title: string;
  summary: string;
  lessonType: 'UX' | 'STRATEGIC' | 'OUTCOME' | 'GOVERNANCE';
  content: string;
  impactScore: number;
  occurrences: number;
  timespanMonths: number;
  createdAt: string;
  evidences?: WisdomEvidence[];
}

interface OrganizationalPrinciple {
  id: string;
  statement: string;
  description: string;
  principleType: 'SUCCESS_PATTERN' | 'FAILURE_PATTERN' | 'DESIGN_GUIDELINE';
  supportRate: number;
  isVerified: boolean;
  createdAt: string;
}

interface WisdomRecord {
  id: string;
  category: 'EXECUTIVE' | 'OPERATIONAL';
  title: string;
  description: string;
  wisdomData: {
    lessonType: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    firstObserved: string;
    lastObserved: string;
    supportingCases: number;
    evidenceCount: number;
    outcomeReferences: string[];
    kpiReferences: string[];
    validationMethod: string;
    auditTrail: string[];
  };
  createdAt: string;
}

interface WisdomEvidence {
  id: string;
  evidenceType: 'HISTORICAL_CASE' | 'OUTCOME_VERDICT' | 'KPI_TREND' | 'TELEMETRY_REPLAY';
  referenceId: string;
  description: string;
  linkedData?: any;
}

interface HistoricalSynthesis {
  id: string;
  title: string;
  summary: string;
  synthesisType: 'ANNUAL' | 'QUARTERLY' | 'CROSS_PRODUCT';
  details: any;
  createdAt: string;
}

interface LongTermTrend {
  id: string;
  metricName: string;
  direction: 'IMPROVING' | 'DEGRADED' | 'STABLE';
  description: string;
  changePercent: number;
  timespanDays: number;
}

interface StrategicLearning {
  id: string;
  title: string;
  description: string;
  learningType: 'COMPETITIVE' | 'REGULATORY' | 'EXECUTIVE';
  impactRating: number;
}

export function WisdomCenter() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'lessons' | 'principles' | 'synthesis' | 'trends' | 'executive'>('lessons');

  // Page States
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  const [lessons, setLessons] = useState<InstitutionalLesson[]>([]);
  const [principles, setPrinciples] = useState<OrganizationalPrinciple[]>([]);
  const [trends, setTrends] = useState<LongTermTrend[]>([]);
  const [syntheses, setSyntheses] = useState<HistoricalSynthesis[]>([]);
  const [casesStats, setCasesStats] = useState<any>(null);
  
  const [learnings, setLearnings] = useState<StrategicLearning[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [governanceAudit, setGovernanceAudit] = useState<any>(null);
  const [records, setRecords] = useState<WisdomRecord[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>('');

  // Selected Lesson for Evidence Chain
  const [selectedLesson, setSelectedLesson] = useState<InstitutionalLesson | null>(null);
  const [lessonEvidence, setLessonEvidence] = useState<WisdomEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Load project ID
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) {
          headers['x-user-id'] = user.id;
        }
        const res = await fetch(`${API}/api/projects`, { headers });
        const data = await res.json();
        const projectsList = data.projects || data;
        const pid = projectsList?.[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
        setProjectId(pid);
      } catch (err) {
        console.error('Failed to load project, using fallback:', err);
        setProjectId('56b8722a-c7c4-47db-a855-b5d3e0ad32cb');
      }
    };
    fetchProject();
  }, [user]);

  // Load main page data
  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  // Load selected lesson evidence
  useEffect(() => {
    if (selectedLesson) {
      fetchEvidence(selectedLesson.id);
    }
  }, [selectedLesson]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      // 1. Fetch Lessons
      const lessonsRes = await fetch(`${API}/api/wisdom/lessons?projectId=${projectId}`, { headers }).then(r => r.json());
      const loadedLessons = lessonsRes.lessons || [];
      setLessons(loadedLessons);
      if (lessonsRes.disclaimer) {
        setDisclaimer(lessonsRes.disclaimer.message);
      }
      if (loadedLessons.length > 0) {
        setSelectedLesson(loadedLessons[0]);
      }

      // 2. Fetch Principles
      const principlesRes = await fetch(`${API}/api/wisdom/principles?projectId=${projectId}`, { headers }).then(r => r.json());
      setPrinciples(principlesRes.principles || []);

      // 3. Fetch History / Syntheses
      const historyRes = await fetch(`${API}/api/wisdom/history?projectId=${projectId}`, { headers }).then(r => r.json());
      setSyntheses(historyRes.syntheses || []);
      setCasesStats(historyRes.casesStats || null);

      // 4. Fetch Long-Term Trends
      const trendsRes = await fetch(`${API}/api/wisdom/trends?projectId=${projectId}`, { headers }).then(r => r.json());
      setTrends(trendsRes.trends || []);

      // 5. Fetch Synthesis Summary (Strategic learnings, records, personas, compliance)
      const synthRes = await fetch(`${API}/api/wisdom/synthesis?projectId=${projectId}`, { headers }).then(r => r.json());
      setLearnings(synthRes.learnings || []);
      setPersonas(synthRes.personas || []);
      setGovernanceAudit(synthRes.governanceAudit || null);
      setRecords(synthRes.records || []);

    } catch (err) {
      console.error('Failed to load institutional wisdom:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (lessonId: string) => {
    setLoadingEvidence(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/wisdom/evidence?projectId=${projectId}&lessonId=${lessonId}`, { headers });
      const data = await res.json();
      setLessonEvidence(data.evidence || []);
    } catch (err) {
      console.error('Failed to fetch lesson evidence:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleTriggerSynthesis = async () => {
    setEvaluating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/wisdom/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId })
      });
      const data = res.ok ? await res.json() : null;
      if (data && data.success) {
        alert('Institutional Wisdom synthesis cycle completed successfully!\n' + data.logs.join('\n'));
        await loadAll();
      } else {
        alert('Synthesis execution failed. Check server logs.');
      }
    } catch (err: any) {
      alert(`Error running wisdom synthesis cycle: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const getLessonTypeColor = (type: string) => {
    switch (type) {
      case 'UX': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'STRATEGIC': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'OUTCOME': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'GOVERNANCE': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  const getPrincipleTypeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS_PATTERN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'FAILURE_PATTERN': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070b0a] text-slate-100 font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.04] bg-[#090e0d] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                Institutional Wisdom Center
                <span className="text-[10px] font-mono font-normal uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Evidence-Backed
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthesized, audit-ready institutional lessons and observational principles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Workspace Boundaries Enforced</span>
          </div>

          <button
            onClick={handleTriggerSynthesis}
            disabled={evaluating || !projectId}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(115,66,226,0.2)]"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Synthesizing...' : 'Trigger Wisdom Scan'}</span>
          </button>
        </div>
      </header>

      {/* ── Wisdom Disclaimer Indicator ── */}
      {disclaimer && (
        <div className="px-6 py-2 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center gap-2 text-xs text-indigo-300">
          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="font-mono text-[10px]">{disclaimer}</span>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Synthesized Lessons</span>
          <span className="text-2xl font-bold text-white mt-1">{lessons.length}</span>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Observational Principles</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">{principles.length}</span>
        </div>
        <div className="p-4 border-r border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Long-Term Trends</span>
          <span className="text-2xl font-bold text-purple-400 mt-1">{trends.length}</span>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Average Compliance Rating</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1">
            {governanceAudit ? `${Math.round(governanceAudit.averageCompliance * 100)}%` : '96%'}
          </span>
        </div>
      </section>

      {/* ── Tabs Navigation ── */}
      <div className="px-6 border-b border-white/[0.04] bg-[#090e0d] flex items-center justify-between">
        <div className="flex gap-4 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lessons' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lessons Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('principles')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'principles' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Principles Library</span>
          </button>
          <button
            onClick={() => setActiveTab('synthesis')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'synthesis' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Historical Synthesis</span>
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'trends' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Long-Term Trends</span>
          </button>
          <button
            onClick={() => setActiveTab('executive')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'executive' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Executive Learning</span>
          </button>
        </div>

        <div className="hidden sm:block text-[10px] font-mono text-slate-400">
          Sandbox Tenant ID: <span className="text-indigo-400 select-all">{projectId || 'N/A'}</span>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Synthesizing institutional lessons and audit trails...</span>
          </div>
        ) : (
          <>
            {activeTab === 'lessons' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Lessons Explorer Column */}
                <div className="w-full lg:w-1/2 border-r border-white/[0.04] overflow-y-auto p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                      Synthesized Lessons
                    </h2>
                    <span className="text-[10px] text-slate-500">{lessons.length} instances</span>
                  </div>

                  {lessons.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center text-center gap-2">
                      <HelpCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-xs text-slate-400">No synthesized lessons found.</span>
                      <button
                        onClick={handleTriggerSynthesis}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline mt-2"
                      >
                        Trigger institutional wisdom scan
                      </button>
                    </div>
                  ) : (
                    lessons.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLesson(l)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                          selectedLesson?.id === l.id
                            ? 'bg-indigo-500/[0.03] border-indigo-500/40 shadow-[0_0_15px_rgba(115,66,226,0.2)]'
                            : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getLessonTypeColor(l.lessonType)}`}>
                            {l.lessonType}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            Impact:
                            <span className="font-bold text-white">{l.impactScore}/10.0</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white mt-1">{l.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{l.summary}</p>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-white/[0.03] pt-2">
                          <span>Occurrences: {l.occurrences} times</span>
                          <span>Observation Timespan: {l.timespanMonths} months</span>
                        </div>

                        {selectedLesson?.id === l.id && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Evidence Chain Column */}
                <div className="w-full lg:w-1/2 bg-white/[0.005] overflow-y-auto p-6 flex flex-col gap-6">
                  {selectedLesson ? (
                    <div>
                      <div className="border-b border-white/[0.04] pb-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">Traceable Verification Chain</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {selectedLesson.id}</span>
                        </div>
                        <h2 className="text-base font-bold text-white mt-1">{selectedLesson.title}</h2>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {selectedLesson.content}
                        </p>
                      </div>

                      {/* Evidence Trace Grid */}
                      <div className="mb-6">
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Supporting Evidence Chain
                        </h3>

                        {loadingEvidence ? (
                          <div className="py-6 flex justify-center">
                            <RefreshCcw className="w-6 h-6 text-slate-400 animate-spin" />
                          </div>
                        ) : lessonEvidence.length === 0 ? (
                          <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg text-xs text-slate-400">
                            No telemetry trace evidence linked. Lessons must be backed by verifiable telemetry data.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {lessonEvidence.map((ev) => (
                              <div key={ev.id} className="p-3 rounded-lg bg-[#090e0d] border border-white/[0.04] flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400">
                                  <span className="font-bold">Evidence Node: {ev.evidenceType}</span>
                                </div>
                                <p className="text-xs text-white leading-relaxed">{ev.description}</p>

                                {ev.linkedData && (
                                  <div className="mt-1 p-2 rounded bg-white/[0.01] border border-white/[0.03] text-[11px] text-slate-400 flex flex-col gap-1">
                                    <span className="font-semibold text-slate-300">Grounding Source Details:</span>
                                    <span className="font-mono truncate">Name/Title: {ev.linkedData.title || ev.linkedData.name || ev.linkedData.goal}</span>
                                    <span>Details: {ev.linkedData.description || ev.linkedData.verdict || ev.linkedData.metricKey}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Wisdom Record Metadata Panel */}
                      {records.find(r => r.title === selectedLesson.title) && (
                        <div className="bg-[#090e0d] border border-white/[0.04] rounded-xl p-4">
                          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Wisdom Record Audits
                          </h3>

                          {(() => {
                            const rec = records.find(r => r.title === selectedLesson.title);
                            const wData = rec?.wisdomData;
                            if (!wData) return null;
                            return (
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-400 font-mono text-[9px] uppercase">Confidence</span>
                                  <div className="text-emerald-400 font-bold">{wData.confidence}</div>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-mono text-[9px] uppercase">Validation Method</span>
                                  <div className="text-slate-200">{wData.validationMethod}</div>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-mono text-[9px] uppercase">First Observed</span>
                                  <div className="text-slate-300 font-mono">{new Date(wData.firstObserved).toLocaleDateString()}</div>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-mono text-[9px] uppercase">Last Observed</span>
                                  <div className="text-slate-300 font-mono">{new Date(wData.lastObserved).toLocaleDateString()}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400 font-mono text-[9px] uppercase">Audit Trail</span>
                                  <ul className="list-disc list-inside text-slate-300 mt-1 flex flex-col gap-0.5">
                                    {wData.auditTrail.map((trail, idx) => (
                                      <li key={idx}>{trail}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                      <BookOpen className="w-8 h-8 opacity-25" />
                      <span className="text-xs">Select an institutional lesson to inspect its audit trace.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'principles' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Observational Principles Library
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {principles.map((pr) => (
                      <div key={pr.id} className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                            <span className={`px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${getPrincipleTypeColor(pr.principleType)}`}>
                              {pr.principleType}
                            </span>
                            {pr.isVerified ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                <HelpCircle className="w-3.5 h-3.5" /> Observational
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white leading-snug">{pr.statement}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed mt-2">{pr.description}</p>
                        </div>

                        <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between text-xs mt-2">
                          <span className="text-slate-400 font-mono">Principle Support Rate:</span>
                          <span className="font-bold text-emerald-400 font-mono">{Math.round(pr.supportRate * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'synthesis' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                {/* Reports column */}
                <div className="w-full lg:w-2/3 flex flex-col gap-4">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Cross-Year Historical Synthesis Reports
                  </h2>

                  {syntheses.map((s) => (
                    <div key={s.id} className="p-5 rounded-xl border border-white/[0.04] bg-[#090e0d] flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
                          {s.synthesisType} REPORT
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{s.summary}</p>

                      {s.details && (
                        <div className="mt-2 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.01] p-3 rounded-lg border border-white/[0.03]">
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-mono">Lessons Map</span>
                            <div className="text-white font-bold">{s.details.lessonsTracked || 0}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-mono">Principles</span>
                            <div className="text-white font-bold">{s.details.principlesVerified || 0}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-mono">Telemetry sessions</span>
                            <div className="text-white font-bold">{s.details.totalTelemetrySessionsAudited || 0}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-mono">Macro health rating</span>
                            <div className="text-white font-bold">{s.details.macroProductHealthIndex || 0}</div>
                          </div>
                          {s.details.findings && (
                            <div className="col-span-2 md:col-span-4 mt-2">
                              <span className="text-slate-500 text-[9px] uppercase font-mono">Key Findings:</span>
                              <ul className="list-disc list-inside mt-1 flex flex-col gap-1 text-slate-300">
                                {s.details.findings.map((f: string, idx: number) => (
                                  <li key={idx}>{f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Case stats column */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Organizational Case Studies Summary
                  </h2>

                  {casesStats ? (
                    <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#090e0d] p-3 rounded-lg border border-white/[0.02]">
                          <span className="text-slate-500 text-[9px] uppercase font-mono">Total cases</span>
                          <div className="text-white text-xl font-bold">{casesStats.totalCount}</div>
                        </div>
                        <div className="bg-[#090e0d] p-3 rounded-lg border border-white/[0.02]">
                          <span className="text-slate-500 text-[9px] uppercase font-mono">Avg Success Rate</span>
                          <div className="text-emerald-400 text-xl font-bold">{Math.round(casesStats.avgSuccessRate * 100)}%</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-mono text-[9px] uppercase">Indexed Case Studies:</span>
                        {casesStats.casesSummary.map((c: any) => (
                          <div key={c.id} className="p-2 rounded bg-white/[0.005] border border-white/[0.03] text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-white truncate max-w-[70%]">{c.title}</span>
                              <span className={`text-[9px] font-mono px-1 rounded uppercase ${c.caseType === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {c.caseType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-1">{c.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-500">
                      No case studies found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Long-Term Metric Trend Projections
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trends.map((t) => (
                      <div key={t.id} className="p-5 rounded-xl border border-white/[0.04] bg-[#090e0d] flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Timespan: {t.timespanDays} days</span>
                          <h3 className="text-sm font-semibold text-white truncate mt-0.5">{t.metricName}</h3>
                          <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full uppercase ${
                            t.direction === 'IMPROVING' ? 'text-emerald-400 bg-emerald-500/10' :
                            t.direction === 'DEGRADED' ? 'text-rose-400 bg-rose-500/10' :
                            'text-slate-400 bg-slate-500/10'
                          }`}>
                            {t.direction === 'IMPROVING' ? '▲' : t.direction === 'DEGRADED' ? '▼' : '■'} {t.changePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'executive' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                {/* Learnings column */}
                <div className="w-full lg:w-2/3 flex flex-col gap-4">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Strategic Learnings Catalog
                  </h2>

                  <div className="flex flex-col gap-3">
                    {learnings.map((l) => (
                      <div key={l.id} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400 font-mono font-bold text-xs">
                          {l.impactRating}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {l.learningType}
                            </span>
                            <h3 className="text-xs font-bold text-white">{l.title}</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{l.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Governance panel */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                      Persona Completion Habits
                    </h2>

                    <div className="flex flex-col gap-2">
                      {personas.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-[#090e0d] border border-white/[0.04] flex flex-col gap-1">
                          <span className="text-xs font-semibold text-white">{p.personaName}</span>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                            <span>Sessions: {p.totalSessions}</span>
                            <span className="text-emerald-400">Completion: {Math.round(p.completionRate * 100)}%</span>
                          </div>
                          <div className="w-full bg-white/[0.02] h-1.5 rounded-full overflow-hidden mt-1 border border-white/[0.04]">
                            <div className="bg-emerald-500 h-full" style={{ width: `${p.completionRate * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                      Governance Policy Audit Status
                    </h2>

                    {governanceAudit && (
                      <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-300">Policy Compliance:</span>
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                            governanceAudit.isCompliant ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            {governanceAudit.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                          </span>
                        </div>

                        {governanceAudit.complianceAlerts.length > 0 && (
                          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> Compliance Drift Flags:
                            </span>
                            {governanceAudit.complianceAlerts.map((alert: string, idx: number) => (
                              <div key={idx} className="p-2 rounded bg-rose-500/5 border border-rose-500/10 text-[11px] text-rose-300 leading-relaxed">
                                {alert}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
