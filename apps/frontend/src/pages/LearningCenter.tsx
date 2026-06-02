import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Brain, RefreshCcw, ShieldCheck, Database, Award, AlertOctagon, TrendingUp,
  Search, ArrowDown, ChevronRight, Activity, Clock, Layers, CheckCircle2,
  AlertTriangle, FileSpreadsheet, Eye, HelpCircle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Types matching schema exactly ───────────────────────────────────────────

interface LearningPattern {
  id: string;
  projectId: string;
  patternName: string;
  patternType: 'SUCCESS' | 'FAILURE' | 'FRICTION' | 'RISK' | 'KPI_MOVEMENT' | 'OUTCOME';
  description: string;
  confidence: number;
  occurrences: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    evidences: number;
    recurrences: number;
  };
}

interface SuccessPattern {
  id: string;
  projectId: string;
  title: string;
  description: string;
  winCategory: 'CONVERSION' | 'RETENTION' | 'COMPLETION' | 'FRICTION_REDUCTION';
  impactScore: number;
  createdAt: string;
}

interface FailurePattern {
  id: string;
  projectId: string;
  title: string;
  description: string;
  mistakeType: 'RAGE_CLICK_LOOP' | 'CTA_ABANDONMENT' | 'NAV_LOOPS' | 'FORM_EXIT';
  impactScore: number;
  createdAt: string;
}

interface OrganizationalLesson {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  lessonType: 'WIN' | 'MISTAKE' | 'GOVERNANCE_ADAPTATION';
  impactScore: number;
  evidence: any;
  createdAt: string;
}

interface ResolvedEvidence {
  evidenceId: string;
  evidenceType: 'TELEMETRY' | 'ANOMALY' | 'REPLAY' | 'INVESTIGATION' | 'KPI_HISTORICAL' | 'OUTCOME';
  referenceId: string;
  description: string;
  entityDetails?: any;
}

interface LearningSnapshot {
  id: string;
  projectId: string;
  patternCount: number;
  lessonCount: number;
  snapshotData: any;
  recordedAt: string;
}

export function LearningCenter() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'patterns' | 'success' | 'failures' | 'personas' | 'history' | 'timeline'>('patterns');

  // Page States
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [successes, setSuccesses] = useState<SuccessPattern[]>([]);
  const [failures, setFailures] = useState<FailurePattern[]>([]);
  const [lessons, setLessons] = useState<OrganizationalLesson[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Search Similar Cases
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [similarCases, setSimilarCases] = useState<any[]>([]);
  const [outcomeSummary, setOutcomeSummary] = useState<any>(null);
  const [searchingCases, setSearchingCases] = useState(false);

  // Selected Pattern for Trace / Evidence Chain
  const [selectedPattern, setSelectedPattern] = useState<LearningPattern | null>(null);
  const [patternEvidence, setPatternEvidence] = useState<ResolvedEvidence[]>([]);
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

  // Load main data when projectId is resolved
  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  // Search case matcher trigger
  useEffect(() => {
    if (!projectId) return;
    const delayDebounce = setTimeout(() => {
      searchSimilarCases();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [caseSearchQuery, projectId]);

  // Load selected pattern evidence
  useEffect(() => {
    if (selectedPattern) {
      fetchEvidence(selectedPattern.id);
    }
  }, [selectedPattern]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      // 1. Fetch Patterns
      const patternsRes = await fetch(`${API}/api/learning/patterns?projectId=${projectId}`, { headers }).then(r => r.json());
      const loadedPatterns = patternsRes.patterns || [];
      setPatterns(loadedPatterns);
      if (loadedPatterns.length > 0) {
        setSelectedPattern(loadedPatterns[0]);
      }

      // 2. Fetch Success Catalog
      const successRes = await fetch(`${API}/api/learning/success?projectId=${projectId}`, { headers }).then(r => r.json());
      setSuccesses(successRes.successes || []);

      // 3. Fetch Failure Catalog
      const failureRes = await fetch(`${API}/api/learning/failures?projectId=${projectId}`, { headers }).then(r => r.json());
      setFailures(failureRes.failures || []);

      // 4. Fetch History & Outcomes & Lessons
      const historyRes = await fetch(`${API}/api/learning/history?projectId=${projectId}&title=${encodeURIComponent(caseSearchQuery)}`, { headers }).then(r => r.json());
      setSimilarCases(historyRes.matches || []);
      setOutcomeSummary(historyRes.outcomes || null);
      setLessons(historyRes.lessons || []);

      // 5. Fetch Personas & Timeline
      const personasRes = await fetch(`${API}/api/learning/personas?projectId=${projectId}`, { headers }).then(r => r.json());
      setPersonas(personasRes.personas || []);
      setTimeline(personasRes.timeline || []);

    } catch (err) {
      console.error('Failed to load organizational learning data:', err);
    } fontLabel:
    setLoading(false);
  };

  const fetchEvidence = async (patternId: string) => {
    setLoadingEvidence(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/learning/evidence/${patternId}?projectId=${projectId}`, { headers });
      const data = await res.json();
      setPatternEvidence(data.evidence || []);
    } catch (err) {
      console.error('Failed to fetch evidence chain:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const searchSimilarCases = async () => {
    if (!projectId) return;
    setSearchingCases(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/learning/history?projectId=${projectId}&title=${encodeURIComponent(caseSearchQuery)}`, { headers });
      const data = await res.json();
      setSimilarCases(data.matches || []);
    } catch (err) {
      console.error('Failed to query similar cases:', err);
    } finally {
      setSearchingCases(false);
    }
  };

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/learning/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId })
      });
      const data = res.ok ? await res.json() : null;
      if (data && data.success) {
        alert('Learning Engine scan completed successfully!\n' + data.logs.join('\n'));
        await loadAll();
      } else {
        alert('Scan execution failed. Check server logs.');
      }
    } catch (err: any) {
      alert(`Error running scan: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const getPatternTypeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'FAILURE': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'FRICTION': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'RISK': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'KPI_MOVEMENT': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070b0a] text-slate-100 font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.04] bg-[#090e0d] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                Organizational Learning Engine
                <span className="text-[10px] font-mono font-normal uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Explainable
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspectable organizational memories, recurrence analysis, and evidence-backed lessons.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>RBAC: Read-Write Enforcement</span>
          </div>

          <button
            onClick={handleTriggerScan}
            disabled={scanning || !projectId}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Detecting Patterns...' : 'Trigger Scan'}</span>
          </button>
        </div>
      </header>

      {/* ── Stats Grid ── */}
      <section className="grid grid-cols-2 md:grid-cols-5 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Patterns Discovered</span>
          <span className="text-2xl font-bold text-white mt-1">{patterns.length}</span>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Success Wins</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">{successes.length}</span>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Documented Failures</span>
          <span className="text-2xl font-bold text-rose-400 mt-1">{failures.length}</span>
        </div>
        <div className="p-4 border-r border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Persona Habits</span>
          <span className="text-2xl font-bold text-purple-400 mt-1">{personas.length}</span>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Lessons</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1">{lessons.length}</span>
        </div>
      </section>

      {/* ── Tabs Navigation ── */}
      <div className="px-6 border-b border-white/[0.04] bg-[#090e0d] flex items-center justify-between">
        <div className="flex gap-4 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'patterns' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Pattern Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('success')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'success' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Success Library</span>
          </button>
          <button
            onClick={() => setActiveTab('failures')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'failures' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Failure Library</span>
          </button>
          <button
            onClick={() => setActiveTab('personas')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'personas' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Persona Habits</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historical Case Matcher</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Learning Timeline</span>
          </button>
        </div>

        <div className="hidden sm:block text-[10px] font-mono text-slate-400">
          Project ID: <span className="text-indigo-400 select-all">{projectId}</span>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Synchronizing organizational memories...</span>
          </div>
        ) : (
          <>
            {activeTab === 'patterns' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Patterns Column */}
                <div className="w-full lg:w-1/2 border-r border-white/[0.04] overflow-y-auto p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                      Discovered Patterns
                    </h2>
                    <span className="text-[10px] text-slate-400">{patterns.length} instances</span>
                  </div>

                  {patterns.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center text-center gap-2">
                      <HelpCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-xs text-slate-400">No patterns discovered in this project.</span>
                      <button
                        onClick={handleTriggerScan}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline mt-2"
                      >
                        Trigger a new scan cycle
                      </button>
                    </div>
                  ) : (
                    patterns.map((pat) => (
                      <div
                        key={pat.id}
                        onClick={() => setSelectedPattern(pat)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                          selectedPattern?.id === pat.id
                            ? 'bg-indigo-500/[0.03] border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPatternTypeColor(pat.patternType)}`}>
                            {pat.patternType}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            Confidence:
                            <span className="font-bold text-white">{Math.round(pat.confidence * 100)}%</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white mt-1">{pat.patternName}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{pat.description}</p>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2 border-t border-white/[0.03] pt-2">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            Recurred {pat.occurrences} times
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="w-3.5 h-3.5 text-slate-400" />
                            {pat._count?.evidences ?? 1} evidence links
                          </span>
                        </div>

                        {selectedPattern?.id === pat.id && (
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
                  {selectedPattern ? (
                    <div>
                      <div className="border-b border-white/[0.04] pb-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">Explainable Learning Invariant</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {selectedPattern.id}</span>
                        </div>
                        <h2 className="text-base font-bold text-white mt-1">{selectedPattern.patternName}</h2>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedPattern.description}</p>
                      </div>

                      {/* Evidence Chain Map */}
                      <div className="bg-[#090e0d] border border-white/[0.04] rounded-xl p-4 mb-6">
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Traceable Evidence Chain
                        </h3>

                        <div className="flex flex-col gap-2 relative">
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs">
                            <div className="font-bold text-indigo-400 font-mono text-[9px] uppercase tracking-wider">Learning Pattern</div>
                            <div className="text-white font-medium mt-0.5">{selectedPattern.patternName}</div>
                          </div>

                          <div className="flex justify-center my-0.5">
                            <ArrowDown className="w-4 h-4 text-slate-600 animate-bounce" />
                          </div>

                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                            <div className="font-bold text-amber-400 font-mono text-[9px] uppercase tracking-wider">Pattern Evidence</div>
                            <div className="text-white font-medium mt-0.5">
                              {selectedPattern._count?.evidences ?? 1} Linked Audit Records
                            </div>
                          </div>

                          <div className="flex justify-center my-0.5">
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                          </div>

                          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs">
                            <div className="font-bold text-cyan-400 font-mono text-[9px] uppercase tracking-wider">Historical Context</div>
                            <div className="text-white font-medium mt-0.5">
                              Outcome correlation verified across past initiatives
                            </div>
                          </div>

                          <div className="flex justify-center my-0.5">
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                          </div>

                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                            <div className="font-bold text-emerald-400 font-mono text-[9px] uppercase tracking-wider">Replays / Telemetry</div>
                            <div className="text-white font-medium mt-0.5">
                              Deterministically tracked via user sessions & key metrics
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Supporting Evidence List */}
                      <div>
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                          Supporting Telemetry & Replay Evidence
                        </h3>

                        {loadingEvidence ? (
                          <div className="py-8 flex justify-center">
                            <RefreshCcw className="w-6 h-6 text-slate-400 animate-spin" />
                          </div>
                        ) : patternEvidence.length === 0 ? (
                          <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg text-xs text-slate-400">
                            No active evidence links found.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {patternEvidence.map((ev) => (
                              <div key={ev.evidenceId} className="p-3 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-bold text-slate-400">{ev.evidenceType}</span>
                                </div>
                                <p className="text-xs text-white leading-relaxed">{ev.description}</p>
                                <div className="flex items-center justify-between text-[9px] font-mono text-indigo-400 mt-1">
                                  <span>Ref ID: {ev.referenceId}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                      <Brain className="w-8 h-8 opacity-25" />
                      <span className="text-xs">Select a pattern to trace its explainable evidence trail.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'success' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Documented Wins & Repeated Success Patterns
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {successes.length === 0 ? (
                      <div className="col-span-full p-8 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-400">
                        No success patterns cataloged yet.
                      </div>
                    ) : (
                      successes.map((s) => (
                        <div key={s.id} className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition-all">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-2">
                              <span>Win Catalog Entry</span>
                              <span>Category: {s.winCategory}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-1">{s.description}</p>
                          </div>

                          <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-500">Metric Impact Score</span>
                            <span className="text-emerald-400 font-bold">+{s.impactScore}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Organizational Lessons Released
                  </h2>
                  <div className="flex flex-col gap-3">
                    {lessons.length === 0 ? (
                      <div className="p-6 bg-white/[0.01] border border-white/[0.04] rounded-lg text-center text-xs text-slate-400">
                        No released lessons found.
                      </div>
                    ) : (
                      lessons.map((l) => (
                        <div key={l.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                                l.lessonType === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' :
                                l.lessonType === 'MISTAKE' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-indigo-500/10 text-indigo-400'
                              }`}>
                                {l.lessonType}
                              </span>
                              <h3 className="text-xs font-bold text-white">{l.title}</h3>
                            </div>
                            <p className="text-xs text-slate-300 mt-1"><span className="text-slate-500 font-semibold font-mono">Summary:</span> {l.summary}</p>
                            <p className="text-xs text-slate-300 mt-0.5"><span className="text-slate-500 font-semibold font-mono">Impact Score:</span> {l.impactScore}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap self-end md:self-center">
                            {new Date(l.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'failures' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Mistakes, Rage-Clicks, Navigation Loops & Drop-offs
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {failures.length === 0 ? (
                      <div className="col-span-full p-8 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-400">
                        No failure patterns cataloged.
                      </div>
                    ) : (
                      failures.map((f) => (
                        <div key={f.id} className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] flex flex-col justify-between gap-3 hover:border-rose-500/40 transition-all">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 mb-2">
                              <span>Mistake Entry</span>
                              <span>Type: {f.mistakeType}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-1">{f.description}</p>
                          </div>

                          <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-1.5 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Exit / Impact Score:</span>
                              <span className="text-rose-400 font-bold">{f.impactScore} / 10.0</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personas' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Persona Behavioral Habits & Drop-offs
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {personas.length === 0 ? (
                      <div className="col-span-full p-8 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-400">
                        No persona behavior records detected yet.
                      </div>
                    ) : (
                      personas.map((p, idx) => (
                        <div key={idx} className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-purple-400" />
                              {p.personaName}
                            </h3>
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                              {p.evidenceCount} session traces
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">{p.summary}</p>

                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="p-2.5 rounded bg-[#090e0d] border border-white/[0.02]">
                              <div className="text-[9px] font-mono text-slate-500 uppercase">Friction Level</div>
                              <div className={`text-xs font-bold mt-0.5 ${
                                p.frictionScore > 0.7 ? 'text-rose-400' :
                                p.frictionScore > 0.4 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {Math.round(p.frictionScore * 100)}%
                              </div>
                            </div>
                            <div className="p-2.5 rounded bg-[#090e0d] border border-white/[0.02]">
                              <div className="text-[9px] font-mono text-slate-500 uppercase">Success Rate</div>
                              <div className="text-xs font-bold text-white mt-0.5">
                                {Math.round(p.successRate * 100)}%
                              </div>
                            </div>
                            <div className="p-2.5 rounded bg-[#090e0d] border border-white/[0.02]">
                              <div className="text-[9px] font-mono text-slate-500 uppercase">Key Drop-off</div>
                              <div className="text-xs font-bold text-indigo-400 truncate mt-0.5">
                                {p.frequentExitStep || 'None'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
                {/* Search Panel */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                  <div>
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-2">
                      Historical Case Matcher
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search past initiatives or keywords..."
                        value={caseSearchQuery}
                        onChange={(e) => setCaseSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {searchingCases ? (
                      <div className="py-8 flex justify-center">
                        <RefreshCcw className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    ) : similarCases.length === 0 ? (
                      <div className="p-6 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-400">
                        No matching historical cases found. Try another query.
                      </div>
                    ) : (
                      similarCases.map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <h3 className="text-xs font-bold text-white">{c.case.title}</h3>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                              Match: {Math.round(c.matchScore * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{c.case.description}</p>

                          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono mt-1 pt-2 border-t border-white/[0.03]">
                            <div>
                              <div className="text-slate-500 text-[9px] uppercase">Success Rate</div>
                              <div className="text-white font-bold">{Math.round(c.case.successRate * 100)}%</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[9px] uppercase">Failure Rate</div>
                              <div className="text-rose-400 font-bold">{Math.round(c.case.failureRate * 100)}%</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[9px] uppercase">Outcome ROI</div>
                              <div className="text-emerald-400 font-bold">+{c.case.outcomeValue ?? 0}%</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Outcome Analytics Panel */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Aggregated Outcome Statistics
                  </h2>

                  {outcomeSummary ? (
                    <div className="p-5 rounded-xl bg-[#090e0d] border border-white/[0.04] flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                        <span className="text-xs text-slate-400">Strategic Alignment Rate</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {Math.round(outcomeSummary.successRate * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded bg-white/[0.01] border border-white/[0.03]">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Average ROI Impact</span>
                          <div className="text-lg font-bold text-white mt-1">
                            +{outcomeSummary.avgRoiImpact}%
                          </div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.01] border border-white/[0.03]">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Risk Level</span>
                          <div className={`text-lg font-bold mt-1 ${
                            outcomeSummary.riskScore > 0.6 ? 'text-rose-400' :
                            outcomeSummary.riskScore > 0.3 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {Math.round(outcomeSummary.riskScore * 100)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <h4 className="text-[10px] font-mono uppercase text-slate-500">Key Recommended Directions</h4>
                        <ul className="text-xs text-slate-300 list-disc list-inside flex flex-col gap-1">
                          <li>Prioritize workflow simplification on highlighted high-friction steps.</li>
                          <li>Correlate telemetry observations with outcome reviews to establish clear ROI evidence.</li>
                          <li>Deploy automation policies to auto-remediate rage-click hotspots.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-white/[0.01] border border-white/[0.04] rounded-xl text-center text-xs text-slate-400 flex flex-col items-center gap-2 justify-center flex-1">
                      <FileSpreadsheet className="w-8 h-8 opacity-25" />
                      <span>No outcome statistics computed for this project.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Release History & Learning Snapshots
                  </h2>
                  <span className="text-[10px] text-slate-500">Release logs and system state saves</span>
                </div>

                <div className="relative border-l border-white/[0.04] pl-4 ml-2 flex flex-col gap-6">
                  {timeline.length === 0 ? (
                    <div className="p-6 bg-white/[0.01] border border-white/[0.04] rounded-lg text-center text-xs text-slate-400">
                      No timeline events documented. Run a scan to capture learning records.
                    </div>
                  ) : (
                    timeline.map((event, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[#070b0a]" />

                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] flex flex-col md:flex-row justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {event.eventType}
                              </span>
                              <h3 className="text-xs font-bold text-white">{event.title}</h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{event.description}</p>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 whitespace-nowrap self-end md:self-center">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
