import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  TrendingUp, RefreshCcw, ShieldCheck, Database, Award, AlertTriangle,
  Search, ArrowDown, ChevronRight, Activity, Clock, Layers, CheckCircle2,
  FileSpreadsheet, HelpCircle, AlertOctagon, Info, Play, Calendar
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Types matching schema ───────────────────────────────────────────────────

interface ForecastRecord {
  id: string;
  forecastType: 'KPI' | 'OUTCOME' | 'INITIATIVE' | 'RISK' | 'OBJECTIVE' | 'PRODUCT_HEALTH';
  targetEntityId: string;
  targetEntityName: string;
  metricName: string;
  currentValue: number;
  projectedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  targetDate: string;
  createdAt: string;
  assumptions?: ForecastAssumption[];
  confidences?: ConfidenceRecord[];
}

interface StrategicForecastEvidence {
  id: string;
  evidenceType: 'HISTORICAL_PATTERN' | 'HISTORICAL_CASE' | 'TELEMETRY_REPLAY' | 'OUTCOME_VERDICT';
  referenceId: string;
  description: string;
  linkedData?: any;
}

interface ScenarioAnalysis {
  id: string;
  title: string;
  description: string;
  scenarioType: 'BEST_CASE' | 'EXPECTED' | 'WORST_CASE' | 'DELAYED_INITIATIVE' | 'KPI_REGRESSION' | 'RISK_ESCALATION';
  parameters: any;
  outcomes?: ScenarioOutcome[];
}

interface ScenarioOutcome {
  id: string;
  metricName: string;
  projectedValue: number;
  deltaPercent: number;
  description: string;
}

interface ForecastAssumption {
  id: string;
  statement: string;
  validityStatus: 'VALID' | 'INVALID' | 'UNKNOWN';
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface EmergingRisk {
  id: string;
  riskType: 'KPI_RISK' | 'UX_RISK' | 'STRATEGIC_RISK' | 'INITIATIVE_RISK' | 'GOVERNANCE_RISK';
  title: string;
  description: string;
  severity: number;
  probability: number;
  triggerCondition: string;
  isDetected: boolean;
  detectedAt?: string;
}

interface ConfidenceRecord {
  id: string;
  score: number;
  explanation: string;
  factors: any;
}

export function ForecastCenter() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'forecasts' | 'scenarios' | 'risks' | 'timeline'>('forecasts');

  // Page States
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastRecord[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioAnalysis[]>([]);
  const [risks, setRisks] = useState<EmergingRisk[]>([]);
  const [assumptions, setAssumptions] = useState<ForecastAssumption[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [timeline, setTimeline] = useState<any[]>([]);

  // Selected Forecast for Inspect / Evidence Chain
  const [selectedForecast, setSelectedForecast] = useState<ForecastRecord | null>(null);
  const [forecastEvidence, setForecastEvidence] = useState<StrategicForecastEvidence[]>([]);
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

  // Load selected forecast evidence
  useEffect(() => {
    if (selectedForecast) {
      fetchEvidence(selectedForecast.id);
    }
  }, [selectedForecast]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      // 1. Fetch Forecasts
      const forecastsRes = await fetch(`${API}/api/forecasts?projectId=${projectId}`, { headers }).then(r => r.json());
      const loadedForecasts = forecastsRes.forecasts || [];
      setForecasts(loadedForecasts);
      if (forecastsRes.disclaimer) {
        setDisclaimer(forecastsRes.disclaimer.message);
      }
      if (loadedForecasts.length > 0) {
        setSelectedForecast(loadedForecasts[0]);
      }

      // 2. Fetch Scenarios
      const scenariosRes = await fetch(`${API}/api/forecasts/scenarios?projectId=${projectId}`, { headers }).then(r => r.json());
      setScenarios(scenariosRes.scenarios || []);

      // 3. Fetch Emerging Risks
      const risksRes = await fetch(`${API}/api/forecasts/risks?projectId=${projectId}`, { headers }).then(r => r.json());
      setRisks(risksRes.risks || []);

      // 4. Fetch Assumptions
      const assumptionsRes = await fetch(`${API}/api/forecasts/assumptions?projectId=${projectId}`, { headers }).then(r => r.json());
      setAssumptions(assumptionsRes.assumptions || []);

    } catch (err) {
      console.error('Failed to load forecasting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (forecastId: string) => {
    setLoadingEvidence(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/forecasts/evidence?projectId=${projectId}&forecastId=${forecastId}`, { headers });
      const data = await res.json();
      setForecastEvidence(data.evidence || []);
    } catch (err) {
      console.error('Failed to fetch forecast evidence:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleTriggerEvaluation = async () => {
    setEvaluating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${API}/api/forecasts/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId })
      });
      const data = res.ok ? await res.json() : null;
      if (data && data.success) {
        alert('Forecasting and Scenario evaluation completed successfully!\n' + data.logs.join('\n'));
        setTimeline(data.timeline || []);
        await loadAll();
      } else {
        alert('Evaluation execution failed. Check server logs.');
      }
    } catch (err: any) {
      alert(`Error running forecasting cycle: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const getForecastTypeColor = (type: string) => {
    switch (type) {
      case 'KPI': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'OUTCOME': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'PRODUCT_HEALTH': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'RISK': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  const getRiskTypeColor = (type: string) => {
    switch (type) {
      case 'KPI_RISK': return 'text-rose-400 bg-rose-500/10';
      case 'UX_RISK': return 'text-amber-400 bg-amber-500/10';
      case 'STRATEGIC_RISK': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-cyan-400 bg-cyan-500/10';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070b0a] text-slate-100 font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.04] bg-[#090e0d] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                Forecast & Scenario Intelligence
                <span className="text-[10px] font-mono font-normal uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Probabilistic
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Explainable scenarios and evidence-backed futures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Workspace: Sandbox Isolation Active</span>
          </div>

          <button
            onClick={handleTriggerEvaluation}
            disabled={evaluating || !projectId}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(115,66,226,0.2)]"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Refresh Forecasts'}</span>
          </button>
        </div>
      </header>

      {/* ── Forecast Disclaimer Indicator ── */}
      {disclaimer && (
        <div className="px-6 py-2 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center gap-2 text-xs text-indigo-300">
          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="font-mono text-[10px]">{disclaimer}</span>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Probabilistic Forecasts</span>
          <span className="text-2xl font-bold text-white mt-1">{forecasts.length}</span>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">What-if Scenarios</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">{scenarios.length}</span>
        </div>
        <div className="p-4 border-r border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Emerging Risks</span>
          <span className="text-2xl font-bold text-rose-400 mt-1">{risks.length}</span>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Validation Assumptions</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1">{assumptions.length}</span>
        </div>
      </section>

      {/* ── Tabs Navigation ── */}
      <div className="px-6 border-b border-white/[0.04] bg-[#090e0d] flex items-center justify-between">
        <div className="flex gap-4 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'forecasts' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Forecast Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scenarios' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scenario Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'risks' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Risk Forecasts</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline Projections</span>
          </button>
        </div>

        <div className="hidden sm:block text-[10px] font-mono text-slate-400">
          Isolation Node: <span className="text-indigo-400 select-all">{projectId || 'N/A'}</span>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Evaluating strategic assumptions and timelines...</span>
          </div>
        ) : (
          <>
            {activeTab === 'forecasts' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Projections Column */}
                <div className="w-full lg:w-1/2 border-r border-white/[0.04] overflow-y-auto p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                      Explainable Forecast Records
                    </h2>
                    <span className="text-[10px] text-slate-500">{forecasts.length} instances</span>
                  </div>

                  {forecasts.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center text-center gap-2">
                      <HelpCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-xs text-slate-400">No active forecasts found.</span>
                      <button
                        onClick={handleTriggerEvaluation}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline mt-2"
                      >
                        Run forecast evaluation cycle
                      </button>
                    </div>
                  ) : (
                    forecasts.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedForecast(f)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                          selectedForecast?.id === f.id
                            ? 'bg-indigo-500/[0.03] border-indigo-500/40 shadow-[0_0_15px_rgba(115,66,226,0.2)]'
                            : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getForecastTypeColor(f.forecastType)}`}>
                            {f.forecastType}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            Confidence:
                            <span className="font-bold text-white">{Math.round(f.confidence * 100)}%</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white mt-1">{f.targetEntityName}</h3>
                        <div className="grid grid-cols-3 gap-2 mt-1 border-t border-white/[0.03] pt-2">
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">Current</div>
                            <div className="text-xs font-bold text-slate-300">{f.currentValue}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">Projected</div>
                            <div className="text-xs font-bold text-emerald-400">+{f.projectedValue}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">Range (90%)</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {f.lowerBound} - {f.upperBound}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                          <span>Target Date: {new Date(f.targetDate).toLocaleDateString()}</span>
                        </div>

                        {selectedForecast?.id === f.id && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Inspector Column */}
                <div className="w-full lg:w-1/2 bg-white/[0.005] overflow-y-auto p-6 flex flex-col gap-6">
                  {selectedForecast ? (
                    <div>
                      <div className="border-b border-white/[0.04] pb-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">Confidence Inspector</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {selectedForecast.id}</span>
                        </div>
                        <h2 className="text-base font-bold text-white mt-1">{selectedForecast.targetEntityName}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Metric Category: <span className="font-mono text-slate-300">{selectedForecast.metricName}</span>
                        </p>
                      </div>

                      {/* Probabilistic Bounds Viz */}
                      <div className="bg-[#090e0d] border border-white/[0.04] rounded-xl p-4 mb-6">
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          Expected Trajectory Bounds (90% Confidence)
                        </h3>

                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-rose-400">Lower Bound: {selectedForecast.lowerBound}</span>
                          <span className="text-emerald-400 font-bold">Expected: {selectedForecast.projectedValue}</span>
                          <span className="text-indigo-400">Upper Bound: {selectedForecast.upperBound}</span>
                        </div>

                        <div className="relative h-6 bg-white/[0.02] border border-white/[0.05] rounded-full overflow-hidden flex items-center">
                          {/* Lower boundary marker */}
                          <div
                            className="absolute bg-rose-500/20 h-full border-r border-rose-500/30"
                            style={{ width: '35%' }}
                          />
                          {/* Expected center glow */}
                          <div
                            className="absolute bg-indigo-500/20 h-full border-x border-indigo-500/40"
                            style={{ left: '35%', width: '30%' }}
                          />
                          {/* Upper bound marker */}
                          <div
                            className="absolute bg-emerald-500/20 h-full border-l border-emerald-500/30"
                            style={{ left: '65%', width: '35%' }}
                          />

                          <div className="absolute w-full flex justify-center text-[10px] font-mono font-bold text-slate-200">
                            Confidence Index: {Math.round(selectedForecast.confidence * 100)}%
                          </div>
                        </div>

                        {selectedForecast.confidences && selectedForecast.confidences.length > 0 && (
                          <div className="mt-3 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                            <h4 className="text-[10px] font-mono uppercase text-slate-500">Explanation Factors</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {selectedForecast.confidences[0].explanation}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Forecast Evidence Trace Chain */}
                      <div className="mb-6">
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Supporting Evidence Chain
                        </h3>

                        {loadingEvidence ? (
                          <div className="py-6 flex justify-center">
                            <RefreshCcw className="w-6 h-6 text-slate-400 animate-spin" />
                          </div>
                        ) : forecastEvidence.length === 0 ? (
                          <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg text-xs text-slate-400">
                            No historical trace evidence linked. Projections require historic backing.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {forecastEvidence.map((ev) => (
                              <div key={ev.id} className="p-3 rounded-lg bg-[#090e0d] border border-white/[0.04] flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400">
                                  <span className="font-bold">Evidence: {ev.evidenceType}</span>
                                </div>
                                <p className="text-xs text-white leading-relaxed">{ev.description}</p>

                                {ev.linkedData && (
                                  <div className="mt-1 p-2 rounded bg-white/[0.01] border border-white/[0.03] text-[11px] text-slate-400 flex flex-col gap-1">
                                    <span className="font-semibold text-slate-300">Grounding Source:</span>
                                    <span className="font-mono truncate">Title: {ev.linkedData.title || ev.linkedData.patternName}</span>
                                    <span>Details: {ev.linkedData.description || ev.linkedData.summary}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Assumptions */}
                      <div>
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                          Active Forecast Assumptions
                        </h3>

                        {assumptions.filter(a => a.id).length === 0 ? (
                          <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg text-xs text-slate-400">
                            No assumptions configured for this projection.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {assumptions.map((asm) => (
                              <div key={asm.id} className="p-3 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs text-slate-200">{asm.statement}</p>
                                  <span className="text-[9px] font-mono text-slate-500">Impact: {asm.impactLevel}</span>
                                </div>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                                  asm.validityStatus === 'VALID' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                  asm.validityStatus === 'INVALID' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                  'text-slate-400 bg-slate-500/10 border-slate-500/20'
                                }`}>
                                  {asm.validityStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                      <TrendingUp className="w-8 h-8 opacity-25" />
                      <span className="text-xs">Select a forecast record to inspect its explainable bounds.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'scenarios' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Scenario Simulator & What-if Analyses
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {scenarios.map((scen) => (
                      <div key={scen.id} className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400 mb-2">
                            <span>Scenario Model</span>
                            <span className="uppercase">{scen.scenarioType}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-white">{scen.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed mt-1">{scen.description}</p>

                          {/* Parameters list */}
                          <div className="mt-3 p-2 bg-[#090e0d] rounded border border-white/[0.02] text-[10px] font-mono">
                            <span className="text-slate-500">Assumed parameters:</span>
                            <pre className="text-slate-300 mt-1 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(scen.parameters, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* Outcomes */}
                        {scen.outcomes && scen.outcomes.length > 0 && (
                          <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Projected Outcomes</span>
                            {scen.outcomes.map((out) => (
                              <div key={out.id} className="flex justify-between items-center text-xs">
                                <span className="text-slate-300">{out.metricName}</span>
                                <span className={`font-bold font-mono ${out.deltaPercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {out.deltaPercent > 0 ? '+' : ''}{out.deltaPercent}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Emerging Strategic & Operational Threat Forecasts
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {risks.length === 0 ? (
                      <div className="col-span-full p-8 border border-dashed border-white/[0.05] rounded-xl text-center text-xs text-slate-400">
                        No active emerging risks flagged.
                      </div>
                    ) : (
                      risks.map((r) => (
                        <div key={r.id} className="p-5 rounded-xl border border-rose-500/10 bg-rose-500/[0.01] flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getRiskTypeColor(r.riskType)}`}>
                              {r.riskType}
                            </span>
                            <span className="text-[10px] font-mono text-rose-400">
                              Severity Index: {r.severity}/10.0
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>

                          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] font-mono bg-[#090e0d] p-3 rounded border border-white/[0.03]">
                            <div>
                              <span className="text-slate-500 text-[9px] uppercase">Probability</span>
                              <div className="text-white font-bold">{Math.round(r.probability * 100)}%</div>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[9px] uppercase">Trigger Condition</span>
                              <div className="text-slate-300 font-bold truncate">{r.triggerCondition}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Projections Roadmap Timeline
                  </h2>
                  <span className="text-[10px] text-slate-500">Timeline events backing release goals</span>
                </div>

                <div className="relative border-l border-white/[0.04] pl-4 ml-2 flex flex-col gap-6">
                  {timeline.length === 0 ? (
                    <div className="p-6 bg-white/[0.01] border border-white/[0.04] rounded-lg text-center text-xs text-slate-400">
                      No projection events compiled. Refresh forecasts to capture timeline milestones.
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

// Forecast Disclaimer display panel clarifying probabilistic and advisory projections.
