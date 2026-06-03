import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../lib/api';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  RefreshCw,
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  HelpCircle,
  Flame,
  ThumbsUp,
  Cpu
} from 'lucide-react';


export function RedesignDashboard() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Redesign Intelligence Data States
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [cognitiveRemediations, setCognitiveRemediations] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Selection/Overlay states
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [impactForecasts, setImpactForecasts] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Visual layout comparator state (interactive toggle for before/after styles)
  const [comparatorMode, setComparatorMode] = useState<'before' | 'after'>('after');
  
  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);

  useEffect(() => {
    fetchInitialContext();
  }, []);

  const fetchInitialContext = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/projects`);
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      if (projectList.length > 0) {
        const defaultProj = projectList[0];
        setProjectId(defaultProj.id);
        setWorkspaceId(defaultProj.workspaceId || null);
        fetchRedesignData(defaultProj.id, defaultProj.workspaceId);
      }
    } catch (err) {
      console.error('Failed to load initial context:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedesignData = async (projId: string, wId: string | null) => {
    try {
      setLoading(true);
      const wQuery = wId ? `&workspaceId=${wId}` : '';

      const [recRes, optRes, cogRes, sugRes] = await Promise.all([
        apiFetch(`/redesign/recommendations?projectId=${projId}${wQuery}`),
        apiFetch(`/redesign/optimization?projectId=${projId}${wQuery}`),
        apiFetch(`/redesign/cognitive?projectId=${projId}${wQuery}`),
        apiFetch(`/redesign/suggestions?projectId=${projId}${wQuery}`)
      ]);

      const recData = await recRes.json();
      const optData = await optRes.json();
      const cogData = await cogRes.json();
      const sugData = await sugRes.json();

      setRecommendations(recData.recommendations || []);
      setOptimizations(optData.optimizations || []);
      setCognitiveRemediations(cogData.cognitiveRemediations || []);
      setSuggestions(sugData.suggestions || []);
    } catch (err) {
      console.error('Failed to load redesign intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerPipeline = async () => {
    try {
      setRunningPipeline(true);
      const res = await apiFetch(`/redesign/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, workspaceId })
      });
      const data = await res.json();
      if (data.success) {
        fetchRedesignData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to run redesign pipeline:', err);
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = projects.find(p => p.id === e.target.value);
    if (selected) {
      setProjectId(selected.id);
      setWorkspaceId(selected.workspaceId || null);
      fetchRedesignData(selected.id, selected.workspaceId);
      setSelectedRec(null);
      setEvidenceList([]);
      setImpactForecasts([]);
      setTraces([]);
    }
  };

  const inspectEvidence = async (rec: any) => {
    setSelectedRec(rec);
    try {
      setLoadingDetails(true);
      const [evRes, impRes] = await Promise.all([
        apiFetch(`/redesign/evidence?recommendationId=${rec.id}`),
        apiFetch(`/redesign/impact?recommendationId=${rec.id}`)
      ]);
      const evData = await evRes.json();
      const impData = await impRes.json();
      setEvidenceList(evData.evidence || []);
      setImpactForecasts(impData.forecasts || []);
      setTraces(rec.redesignTraces || []);
    } catch (err) {
      console.error('Failed to load recommendation evidence details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Safe averages or specific index metric computations
  const getOverallReadiness = () => {
    if (recommendations.length === 0) return 0;
    const total = recommendations.reduce((acc, r) => acc + r.impactScore, 0);
    return Math.round(total / recommendations.length);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 p-6 font-mono selection:bg-[#5ed29c]/30 selection:text-white">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222226] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#5ed29c]/10 text-[#5ed29c] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#5ed29c]/20 uppercase tracking-widest">
              Redesign Intelligence Active
            </span>
            <span className="bg-purple-500/10 text-purple-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-widest">
              Evidence-Backed UX Remediation
            </span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5ed29c] fill-[#5ed29c]/10" /> Explainable Redesign suggestions Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Replay-linked layout optimizations, cognitive complexity simplification, and impact-quantified UX suggestions.
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
            onClick={triggerPipeline}
            disabled={runningPipeline}
            className="flex items-center gap-2 bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase disabled:opacity-50 font-mono"
          >
            {runningPipeline ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Layouts...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#5ed29c]" /> Trigger Redesign Pipeline
              </>
            )}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121214] border border-[#222226] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#5ed29c] animate-spin mb-4" />
          <span className="text-xs text-zinc-500 uppercase">Running layout remediation analysis...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLS: COMPARATORS, COGNITIVE MAP & RECOMMENDATIONS */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Top row widget: Visual Layout Comparator Mockup */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xs font-black uppercase text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" /> Interactive Layout Comparator
                  </h2>
                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Toggle between current implementation and evidence-proposed fix</p>
                </div>
                <div className="flex bg-[#0c0c0e] border border-[#222226] rounded-lg p-0.5 text-[9px] uppercase font-bold">
                  <button 
                    onClick={() => setComparatorMode('before')}
                    className={`px-2.5 py-1 rounded transition-all ${comparatorMode === 'before' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Before Layout
                  </button>
                  <button 
                    onClick={() => setComparatorMode('after')}
                    className={`px-2.5 py-1 rounded transition-all ${comparatorMode === 'after' ? 'bg-[#5ed29c]/10 text-[#5ed29c] border border-[#5ed29c]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Proposed Fix
                  </button>
                </div>
              </div>

              {/* Layout Mockup Area */}
              <div className="bg-[#0c0c0e] border border-[#222226] rounded-xl p-6 min-h-[160px] flex items-center justify-center relative overflow-hidden transition-all duration-300">
                {comparatorMode === 'before' ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <span className="text-[9px] text-red-500/60 font-bold uppercase tracking-widest">Discoverability Friction Detected</span>
                    <button className="bg-zinc-800 text-zinc-500 border border-zinc-700 px-4 py-1.5 rounded text-xs cursor-not-allowed opacity-60">
                      Submit Details
                    </button>
                    <p className="text-[10px] text-zinc-500 max-w-xs leading-normal">
                      Button color has low contrast against the background (2.1:1 ratio). Users experienced hover hesitations.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <span className="text-[9px] text-[#5ed29c] font-bold uppercase tracking-widest animate-pulse">Remediated CTA Proposal</span>
                    <button className="bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/40 font-bold px-6 py-2 rounded-xl text-xs transition-all duration-300 shadow-[0_0_15px_rgba(94,210,156,0.15)]">
                      Submit Details
                    </button>
                    <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                      High contrast (4.8:1), larger border radius, and active hover glow transition. Projected to increase CTR by 18.5%.
                    </p>
                  </div>
                )}
                {/* Visual grid lines behind */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]"></div>
              </div>
            </div>

            {/* Middle row widget: Recommendations Lists */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Evidence-Linked Redesign Proposals
              </h2>

              <div className="flex flex-col gap-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs border border-[#222226] border-dashed rounded-xl">
                    No recommendations synthesized. Press the pipeline run button to analyze telemetry.
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => inspectEvidence(rec)}
                      className="bg-[#18181b] border border-[#222226] hover:border-[#5ed29c]/30 p-4 rounded-xl flex items-start justify-between gap-4 cursor-pointer transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs text-white font-bold">{rec.title}</span>
                          <span className="bg-[#0c0c0e] text-zinc-500 text-[8px] border border-[#222226] px-2 py-0.5 rounded">
                            {rec.recommendationType}
                          </span>
                          <span className="text-[9px] text-zinc-500">at {rec.workflowPath}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{rec.description}</p>
                        <div className="bg-[#0c0c0e] border border-[#222226]/60 p-2.5 rounded-lg text-[10.5px] text-zinc-300 font-mono flex items-start gap-2">
                          <span className="text-[#5ed29c] font-black text-[9px] uppercase mt-0.5">Proposed:</span>
                          <p className="flex-1 leading-normal">{rec.proposedChange}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="bg-[#5ed29c]/5 border border-[#5ed29c]/15 text-[#5ed29c] text-[10px] font-bold px-2 py-0.5 rounded">
                          +{Math.round(rec.impactScore)}% Yield
                        </span>
                        <span className="text-[8px] text-zinc-500 uppercase">Confidence: {Math.round(rec.confidenceScore * 100)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Row Widget: Cognitive Clutter Map */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Cognitive Simplification Analysis Grid
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase mb-5">Workflow steps evaluated for cognitive load and decision friction</p>

              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3 mb-6">
                {Array.from({ length: 10 }).map((_, stepIdx) => {
                  const stepNum = stepIdx + 1;
                  // Look up if we have a remediation for this step
                  const matchedRem = cognitiveRemediations.find((r) => r.targetStep === stepNum);
                  const baseLoad = matchedRem ? Math.round(50 + matchedRem.complexityReduction * 0.4) : Math.round(15 + stepNum * 5);
                  
                  const isSevere = baseLoad > 65;
                  const isModerate = baseLoad > 40 && baseLoad <= 65;
                  const bgClass = isSevere ? 'border-red-500/20 bg-red-500/5 text-red-400' :
                                  isModerate ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' :
                                  'border-emerald-500/10 bg-emerald-500/5 text-[#5ed29c]';

                  return (
                    <div
                      key={stepIdx}
                      className={`border p-3 rounded-xl flex flex-col items-center justify-between text-center ${bgClass}`}
                    >
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">Step #{stepNum}</span>
                      <span className="text-xs font-extrabold my-2">{baseLoad}%</span>
                      <span className="text-[7.5px] font-mono tracking-tighter uppercase opacity-80">
                        {isSevere ? 'Complexity' : isModerate ? 'Attention' : 'Optimal'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cognitive remediations details list */}
              <div className="flex flex-col gap-3">
                {cognitiveRemediations.map((rem) => (
                  <div key={rem.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-purple-400">Step #{rem.targetStep} Remediation Plan</span>
                        <span className="bg-purple-500/10 text-purple-300 text-[8px] px-2 py-0.5 rounded border border-purple-500/20 uppercase font-mono">
                          {rem.loadType}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">{rem.remediationPlan}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black text-[#5ed29c]">-{Math.round(rem.complexityReduction)}% Load</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT 1 COL: IMPACT GAUGES, SURVIVABILITY, SUGGESTIONS */}
          <div className="flex flex-col gap-8">
            
            {/* Impact Gauges */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5ed29c]" /> Redesign Impact Forecast Dials
              </h2>

              <div className="flex flex-col gap-6 items-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" fill="none" stroke="#222226" strokeWidth="10" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      fill="none" 
                      stroke="#5ed29c" 
                      strokeWidth="10" 
                      strokeDasharray={376.8}
                      strokeDashoffset={376.8 - (376.8 * getOverallReadiness()) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl font-black text-white">{getOverallReadiness()}%</span>
                    <span className="text-[8px] text-zinc-500 block uppercase mt-0.5">Remediation Score</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 text-center border-t border-[#222226] pt-4 text-[10px]">
                  <div>
                    <span className="text-zinc-500 block uppercase">Total Suggestions</span>
                    <span className="text-white font-bold block text-sm mt-1">{recommendations.length + suggestions.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase">Cognitive Gains</span>
                    <span className="text-[#5ed29c] font-bold block text-sm mt-1">
                      {cognitiveRemediations.length > 0 ? `-${Math.round(cognitiveRemediations[0].complexityReduction)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Survivability Gains */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#5ed29c]" /> Workflow Optimization Yield
              </h2>
              <div className="flex flex-col gap-4">
                {optimizations.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs">No active workflow reductions mapped.</div>
                ) : (
                  optimizations.map((opt) => (
                    <div key={opt.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-white text-xs font-bold">{opt.workflowPath}</span>
                        <span className="text-[#5ed29c] text-[10px] font-bold">+{Math.round(opt.expectedSurvivalGain)}% Survival</span>
                      </div>
                      <p className="text-[10.5px] text-zinc-400 leading-normal mb-3">{opt.remediationStrategy}</p>
                      <div className="flex justify-between text-[9px] border-t border-[#222226]/60 pt-2 text-zinc-500 uppercase">
                        <span>Steps Reduced:</span>
                        <span className="text-zinc-300 font-bold">-{opt.stepCountReduction} Steps</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* General UX Suggestions List */}
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> General UX Optimizations
              </h2>
              <div className="flex flex-col gap-3">
                {suggestions.map((sug) => (
                  <div key={sug.id} className="bg-[#18181b] border border-[#222226] p-3 rounded-xl">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-xs text-white font-bold leading-tight">{sug.title}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border flex-shrink-0 ${
                        sug.effortEstimate === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {sug.effortEstimate} Effort
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{sug.description}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── SIDE OVERLAY PANEL: REPLAY EVIDENCE TRACE INSPECTOR ─────────────── */}
      {selectedRec && (
        <div className="fixed inset-0 bg-[#070b0a]/80 backdrop-blur-sm z-50 flex justify-end transition-all">
          <div className="w-full max-w-md bg-[#121214] border-l border-[#222226] h-full flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex items-center justify-between border-b border-[#222226] pb-4 mb-6">
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5ed29c] fill-[#5ed29c]/10" /> Redesign Evidence Inspector
                  </h3>
                  <span className="text-[9px] text-zinc-500 uppercase block mt-1">Audit trail and heuristic metrics</span>
                </div>
                <button
                  onClick={() => setSelectedRec(null)}
                  className="p-1.5 hover:bg-[#1c1c22] rounded-lg border border-transparent hover:border-[#222226] transition-all"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>

              <div className="bg-[#18181b] border border-[#222226] p-4 rounded-xl mb-6">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Target Element Recommendation:</span>
                <span className="text-white text-xs font-bold block">{selectedRec.title}</span>
                <span className="text-[9.5px] text-zinc-400 block mt-1">Target: {selectedRec.targetElement || 'Full Layout'}</span>
                <p className="text-[10.5px] text-zinc-400 leading-normal mt-3 border-t border-[#222226] pt-3">
                  {selectedRec.description}
                </p>
              </div>

              {/* Realtime impact forecasts */}
              {impactForecasts.length > 0 && (
                <div className="mb-6">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2 font-bold">Projected Metrics Drift</span>
                  <div className="flex flex-col gap-2">
                    {impactForecasts.map((f) => (
                      <div key={f.id} className="bg-[#0c0c0e] border border-[#222226] p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-zinc-500 block uppercase">Metric</span>
                          <span className="text-white text-xs font-bold">{f.metricName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-red-400 text-xs line-through">{f.beforeValue}%</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[#5ed29c] text-xs font-bold">+{f.afterValue}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence details list */}
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block mb-3 font-bold">Linked Replay telemetry Evidence</span>
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-[#5ed29c] animate-spin" />
                  </div>
                ) : evidenceList.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs border border-[#222226] border-dashed rounded-xl">
                    No active traces linked to this recommendation.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {evidenceList.map((ev) => (
                      <div key={ev.id} className="bg-[#0c0c0e] border border-[#222226] p-3.5 rounded-xl">
                        <p className="text-[10.5px] text-zinc-300 leading-normal mb-2">{ev.evidenceNotes}</p>
                        <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase">
                          <span>Replay Drift: +{ev.metricDriftValue}%</span>
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
              
              {/* Optional traces mapping */}
              {traces.length > 0 && (
                <div className="mt-6">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2 font-bold">Target UI Action Nodes</span>
                  {traces.map((tr) => (
                    <div key={tr.id} className="bg-[#0c0c0e] border border-dashed border-[#222226] p-2.5 rounded-lg flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Index #{tr.actionNodeIndex}: {tr.actionSelector}</span>
                      <span className="text-[#5ed29c] text-[9px] uppercase tracking-wide">Screenshot Mapped</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="border-t border-[#222226] pt-4 mt-6">
              <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                Redesign evidence is stored as immutable operational audit points, fully matching solo mode and governance systems.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
