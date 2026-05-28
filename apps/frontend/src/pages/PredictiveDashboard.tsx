import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Sparkles,
  Clock,
  ArrowRight,
  Layers,
  Users,
  Search,
  RefreshCw,
  Play,
  HelpCircle,
  X
} from 'lucide-react';

const baseApiUrl = 'http://127.0.0.1:3001/api';

export function PredictiveDashboard() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Predictive Data States
  const [risks, setRisks] = useState<any[]>([]);
  const [survivabilitySignals, setSurvivabilitySignals] = useState<any[]>([]);
  const [cognitiveSignals, setCognitiveSignals] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  // Selection/Overlay states
  const [selectedFailure, setSelectedFailure] = useState<any>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [forecasting, setForecasting] = useState(false);

  useEffect(() => {
    fetchInitialContext();
  }, []);

  const fetchInitialContext = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseApiUrl}/projects`);
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      if (projectList.length > 0) {
        const defaultProj = projectList[0];
        setProjectId(defaultProj.id);
        setWorkspaceId(defaultProj.workspaceId || null);
        fetchPredictiveData(defaultProj.id, defaultProj.workspaceId);
      }
    } catch (err) {
      console.error('Failed to load initial context:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictiveData = async (projId: string, wId: string | null) => {
    try {
      setLoading(true);
      const wQuery = wId ? `&workspaceId=${wId}` : '';

      const [riskRes, survRes, cogRes, failRes, trendRes, predRes] = await Promise.all([
        fetch(`${baseApiUrl}/predictive/risks?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/predictive/survivability?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/predictive/cognitive?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/predictive/failures?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/predictive/trends?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/predictive/forecasts?projectId=${projId}${wQuery}`)
      ]);

      const riskData = await riskRes.json();
      const survData = await survRes.json();
      const cogData = await cogRes.json();
      const failData = await failRes.json();
      const trendData = await trendRes.json();
      const predData = await predRes.json();

      setRisks(riskData.risks || []);
      setSurvivabilitySignals(survData.signals || []);
      setCognitiveSignals(cogData.cognitiveSignals || []);
      setFailures(failData.failures || []);
      setTrends(trendData.memorySignals || []);
      setPredictions(predData.predictions || []);
    } catch (err) {
      console.error('Failed to load predictive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerForecast = async () => {
    try {
      setForecasting(true);
      const res = await fetch(`${baseApiUrl}/predictive/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, workspaceId })
      });
      const data = await res.json();
      if (data.success) {
        fetchPredictiveData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to trigger predictive forecast:', err);
    } finally {
      setForecasting(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = projects.find(p => p.id === e.target.value);
    if (selected) {
      setProjectId(selected.id);
      setWorkspaceId(selected.workspaceId || null);
      fetchPredictiveData(selected.id, selected.workspaceId);
      setSelectedFailure(null);
      setEvidenceList([]);
    }
  };

  const inspectEvidence = async (failure: any) => {
    setSelectedFailure(failure);
    try {
      setLoadingEvidence(true);
      const res = await fetch(`${baseApiUrl}/predictive/evidence?predictionId=${failure.id}`);
      const data = await res.json();
      setEvidenceList(data.evidence || []);
    } catch (err) {
      console.error('Failed to load forecast evidence:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Generate SVG points for the default persona curves
  const getCurveData = (persona: string) => {
    // Generate simulated/calculated survival rate over 10 steps
    let startProb = 1.0;
    const points = [];
    const decay = persona === 'BEGINNER' ? 0.08 : persona === 'POWER_USER' ? 0.02 : 0.05;
    for (let step = 1; step <= 10; step++) {
      startProb = Math.max(0.1, startProb - decay * (step / 3));
      const x = 50 + (step - 1) * 50;
      const y = 180 - startProb * 140;
      points.push({ step, prob: Math.round(startProb * 100), x, y });
    }
    return points;
  };

  const curves = [
    { name: 'BEGINNER', color: '#f87171', points: getCurveData('BEGINNER') },
    { name: 'POWER_USER', color: '#5ed29c', points: getCurveData('POWER_USER') },
    { name: 'STANDARD', color: '#a78bfa', points: getCurveData('STANDARD') }
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 p-6 font-mono selection:bg-[#5ed29c]/30 selection:text-white">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222226] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#5ed29c]/10 text-[#5ed29c] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#5ed29c]/20 uppercase tracking-widest">
              Predictive Systems Active
            </span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#5ed29c] fill-[#5ed29c]" /> Predictive UX Failure Detection Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Proactive usability risk forecasting, cognitive fatigue modeling, and workflow survivability analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase">Context Project:</span>
            <select
              value={projectId}
              onChange={handleProjectChange}
              className="bg-transparent text-white text-xs border-none focus:outline-none cursor-pointer font-bold font-mono"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={triggerForecast}
            disabled={forecasting}
            className="flex items-center gap-2 bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase disabled:opacity-50 font-mono"
          >
            {forecasting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating Forecasts...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#5ed29c]" /> Execute Predictive Analysis
              </>
            )}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121214] border border-[#222226] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#5ed29c] animate-spin mb-4" />
          <span className="text-xs text-zinc-500 uppercase">Computing UX failure projections...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLS: GRAPHICS & DETECTORS */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Row 1: Failures & Trends */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Usability Risk & Breakdown Forecasts
              </h2>
              <div className="flex flex-col gap-4">
                {failures.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No predictive failures generated. Run predictive analysis to compute.
                  </div>
                ) : (
                  failures.map((fail) => (
                    <div
                      key={fail.id}
                      className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex items-start justify-between gap-4 hover:border-[#5ed29c]/30 transition-all cursor-pointer"
                      onClick={() => inspectEvidence(fail)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-white font-bold">{fail.predictedFailureType}</span>
                          <span className="text-[10px] text-zinc-500">at {fail.workflowPath}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{fail.description}</p>
                        <div className="flex gap-2 mt-3 text-[10px]">
                          {fail.targetSelector && (
                            <span className="bg-[#0c0c0e] px-2 py-0.5 rounded border border-[#222226] text-amber-400">
                              Selector: {fail.targetSelector}
                            </span>
                          )}
                          {fail.estimatedSteps && (
                            <span className="bg-[#0c0c0e] px-2 py-0.5 rounded border border-[#222226] text-purple-400">
                              Est. Drop Step: {fail.estimatedSteps}
                            </span>
                          )}
                          <span className="bg-[#5ed29c]/5 text-[#5ed29c] px-2 py-0.5 rounded border border-[#5ed29c]/10 text-[9px] uppercase tracking-wider">
                            Inspect Evidence
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${
                          fail.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          fail.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-zinc-500/10 text-zinc-400 border-[#222226]'
                        }`}>
                          {fail.severity}
                        </span>
                        <span className="text-lg font-bold text-white mt-1">
                          {Math.round(fail.probability * 100)}%
                        </span>
                        <span className="text-[8px] text-zinc-500 uppercase">Probability</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Row 2: Survivability Forecast Graphs */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5ed29c]" /> Multi-Step Workflow Survival Curves
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase mb-6">Persona dropoff probability over consecutive workflow steps</p>

              <div className="relative py-4">
                <svg className="w-full h-56 overflow-visible" viewBox="0 0 550 200">
                  {/* Grid Lines */}
                  <line x1="50" y1="40" x2="500" y2="40" stroke="#222226" strokeDasharray="3 3" />
                  <line x1="50" y1="110" x2="500" y2="110" stroke="#222226" strokeDasharray="3 3" />
                  <line x1="50" y1="180" x2="500" y2="180" stroke="#222226" />

                  {/* Y Axis Labels */}
                  <text x="15" y="45" className="fill-zinc-600 text-[9px]">100%</text>
                  <text x="15" y="115" className="fill-zinc-600 text-[9px]">50%</text>
                  <text x="15" y="185" className="fill-zinc-600 text-[9px]">0%</text>

                  {/* Plot Curves */}
                  {curves.map((curve) => {
                    let d = `M ${curve.points[0].x} ${curve.points[0].y}`;
                    for (let i = 1; i < curve.points.length; i++) {
                      d += ` L ${curve.points[i].x} ${curve.points[i].y}`;
                    }
                    return (
                      <g key={curve.name}>
                        <path
                          d={d}
                          fill="none"
                          stroke={curve.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {curve.points.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r="3.5"
                            fill={curve.color}
                            className="stroke-[#121214] stroke-2 hover:r-5 cursor-pointer"
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* X Axis Step Labels */}
                  {curves[0].points.map((pt, idx) => (
                    <text
                      key={idx}
                      x={pt.x}
                      y="196"
                      className="fill-zinc-600 text-[9px] font-mono text-center"
                      textAnchor="middle"
                    >
                      S#{pt.step}
                    </text>
                  ))}
                </svg>

                <div className="flex justify-center gap-6 mt-4 text-[10px]">
                  {curves.map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="w-3 h-1.5 rounded" style={{ backgroundColor: c.color }} />
                      <span className="text-zinc-400 font-bold uppercase">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Cognitive Overload Step Grid */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Cognitive Fatigue Escalation Grid
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase mb-6">Predicted choice complexity and density index per step</p>

              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
                {Array.from({ length: 10 }).map((_, stepIdx) => {
                  const stepNum = stepIdx + 1;
                  // Compute a simulated gradient heat score
                  const score = Math.round(15 + stepNum * 7.5);
                  const isHigh = score > 60;
                  const isMedium = score > 40 && score <= 60;
                  const color = isHigh ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                                isMedium ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                                'border-emerald-500/20 bg-emerald-500/5 text-[#5ed29c]';

                  return (
                    <div
                      key={stepIdx}
                      className={`border p-3 rounded-xl flex flex-col items-center justify-between text-center ${color}`}
                    >
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">Step #{stepNum}</span>
                      <span className="text-sm font-extrabold my-2">{score}%</span>
                      <span className="text-[8px] font-mono tracking-tighter truncate uppercase opacity-80">
                        {isHigh ? 'Overload' : isMedium ? 'Fatigue' : 'Optimal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COL: SUMMARY, ALERTS, & EVIDENCE */}
          <div className="flex flex-col gap-8">
            {/* Risk Index Summary */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5ed29c]" /> Stability Explorer
              </h2>
              <div className="flex flex-col gap-4">
                {risks.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs">No path stability scores mapped.</div>
                ) : (
                  risks.map((r) => (
                    <div key={r.id} className="bg-[#18181b] border border-[#222226] p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white text-xs font-bold">{r.workflowPath}</span>
                        <span className={`text-[10px] font-mono ${r.stabilityIndex > 70 ? 'text-[#5ed29c]' : r.stabilityIndex > 45 ? 'text-amber-400' : 'text-red-400'}`}>
                          Stability: {r.stabilityIndex}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9.5px] mt-2 pt-2 border-t border-[#222226] text-zinc-500">
                        <div>
                          <span>Friction Rate:</span>
                          <span className="text-zinc-300 block font-bold mt-0.5">{Math.round(r.frictionEscalationRate * 100)}%</span>
                        </div>
                        <div>
                          <span>Risk Score:</span>
                          <span className="text-zinc-300 block font-bold mt-0.5">{r.riskScore} pts</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Projected Friction Timeline */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Projected Friction Timelines
              </h2>
              <div className="flex flex-col gap-5 relative pl-4 border-l border-[#222226] ml-2">
                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#121214]" />
                  <span className="text-[9px] text-zinc-500 block uppercase">Step 3 — CTA Friction Threat</span>
                  <p className="text-[10.5px] text-zinc-400 leading-normal mt-1">
                    First sign of CTA discoverability breakdown projected. Low action contrast triggers hover hesitations.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#121214]" />
                  <span className="text-[9px] text-zinc-500 block uppercase">Step 5 — Fatigue Spike</span>
                  <p className="text-[10.5px] text-zinc-400 leading-normal mt-1">
                    Attention fragmentation compounds. Interaction density increases dropoff risk by 2x.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-[#121214]" />
                  <span className="text-[9px] text-zinc-500 block uppercase">Step 8 — Onboarding Collapse</span>
                  <p className="text-[10.5px] text-zinc-400 leading-normal mt-1">
                    Critical abandonment threshold step. 65% probability of user exit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDE OVERLAY / PANEL: FORECAST EVIDENCE ───────────────────────── */}
      {selectedFailure && (
        <div className="fixed inset-0 bg-[#070b0a]/80 backdrop-blur-sm z-50 flex justify-end transition-all">
          <div className="w-full max-w-md bg-[#121214] border-l border-[#222226] h-full flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex items-center justify-between border-b border-[#222226] pb-4 mb-6">
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5ed29c]" /> Forecast Evidence Inspector
                  </h3>
                  <span className="text-[9px] text-zinc-500 uppercase block mt-1">Traceability details</span>
                </div>
                <button
                  onClick={() => setSelectedFailure(null)}
                  className="p-1.5 hover:bg-[#1c1c22] rounded-lg border border-transparent hover:border-[#222226] transition-all"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>

              <div className="bg-[#18181b] border border-[#222226] p-4 rounded-xl mb-6">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Target Forecast:</span>
                <span className="text-white text-xs font-bold block">{selectedFailure.predictedFailureType}</span>
                <span className="text-[9.5px] text-zinc-400 block mt-1">Path: {selectedFailure.workflowPath}</span>
                <p className="text-[10.5px] text-zinc-400 leading-normal mt-3 border-t border-[#222226] pt-3">
                  {selectedFailure.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 uppercase block mb-3 font-bold">Supporting Evidence (Replay-Linked):</span>
                {loadingEvidence ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-[#5ed29c] animate-spin" />
                  </div>
                ) : evidenceList.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs border border-[#222226] border-dashed rounded-xl">
                    No trace logs linked to this prediction.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {evidenceList.map((ev) => (
                      <div key={ev.id} className="bg-[#0c0c0e] border border-[#222226] p-3.5 rounded-xl">
                        <p className="text-[10.5px] text-zinc-300 leading-normal mb-2">{ev.evidenceDescription}</p>
                        <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase">
                          <span>Conf. Weight: {ev.confidenceWeight * 100}%</span>
                          {ev.sessionRefId && (
                            <span className="text-[#5ed29c] font-bold">
                              Session: {ev.sessionRefId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#222226] pt-4 mt-6">
              <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                Evidence is aggregated automatically from historical session events and heuristics algorithms.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
