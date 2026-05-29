import React, { useState, useEffect } from 'react';
import {
  GitBranch, CheckCircle2, AlertTriangle, Play, RefreshCw, Layers,
  AlertCircle, Cpu, ExternalLink, GitPullRequest, Timer, FileCode,
  Shield, Eye, Terminal, Sparkles, ChevronRight, X, BarChart3, Activity
} from 'lucide-react';

const baseApiUrl = 'http://127.0.0.1:3001/api';

export function EngineeringDashboard() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'runs' | 'prs' | 'regressions' | 'previews' | 'risks' | 'timeline'>('runs');
  
  // Data States
  const [runs, setRuns] = useState<any[]>([]);
  const [previews, setPreviews] = useState<any[]>([]);
  const [regressions, setRegressions] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  
  // Selection overlays
  const [selectedPr, setSelectedPr] = useState<any>(null);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [runningCi, setRunningCi] = useState(false);

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
        fetchEngineeringData(defaultProj.id);
      }
    } catch (err) {
      console.error('Failed to load projects context:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineeringData = async (projId: string) => {
    try {
      setLoading(true);
      const [runsRes, prevRes, regRes, prRes, riskRes, timelineRes] = await Promise.all([
        fetch(`${baseApiUrl}/engineering/observability?projectId=${projId}`).then(r => r.json()),
        fetch(`${baseApiUrl}/deployments/previews?projectId=${projId}`).then(r => r.json()),
        fetch(`${baseApiUrl}/ci/regressions?projectId=${projId}`).then(r => r.json()),
        fetch(`${baseApiUrl}/pull-requests/intelligence?projectId=${projId}`).then(r => r.json()),
        fetch(`${baseApiUrl}/engineering/risk?projectId=${projId}`).then(r => r.json()),
        fetch(`${baseApiUrl}/deployments/releases?projectId=${projId}`).then(r => r.json())
      ]);

      setRuns(runsRes.summary?.recentRuns || []);
      setPreviews(prevRes.previews || []);
      setRegressions(regRes.regressions || []);
      setPrs(prRes.intelligence || []);
      setRisks(riskRes.signals || []);
      setTimeline(timelineRes.events || []);
    } catch (err) {
      console.error('Failed to fetch engineering data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCiReplay = async () => {
    try {
      setRunningCi(true);
      const res = await fetch(`${baseApiUrl}/ci/replays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          workflowPath: '/onboarding',
          branch: 'feature/streamlined-onboarding',
          commitHash: `commit-${Math.floor(Math.random() * 900000 + 100000)}`,
          provider: 'VERCEL',
          buildId: `gh-build-${Math.floor(Math.random() * 90000 + 10000)}`,
          author: 'fricta-engineer',
          commitMessage: 'refactor: simplify step 2 user selection logic to optimize cognitive load'
        })
      });
      const data = await res.json();
      if (data.execution) {
        // Refresh data
        await fetchEngineeringData(projectId);
      }
    } catch (err) {
      console.error('Failed to trigger CI replay check:', err);
    } finally {
      setRunningCi(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projId = e.target.value;
    setProjectId(projId);
    fetchEngineeringData(projId);
    setSelectedPr(null);
    setSelectedRun(null);
  };

  // Compute stats
  const activePreviewsCount = previews.filter(p => p.status === 'ACTIVE').length;
  const criticalRisksCount = risks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;
  const avgSurvivability = runs.length > 0 
    ? Math.round(runs.reduce((acc, r) => acc + (r.survivabilityScore || 0), 0) / runs.filter(r => r.survivabilityScore).length || 85)
    : 85;

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 p-6 font-mono selection:bg-[#10b981]/30 selection:text-white">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222226] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
              Deployment Aware
            </span>
            <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">
              CI/CD Pipeline Observability
            </span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" /> Engineering Observability Panel
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track user journey survivability, cognitive regressions, PR impact reviews, and preview environment builds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase">Project:</span>
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
            onClick={triggerCiReplay}
            disabled={runningCi}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase disabled:opacity-50 font-mono"
          >
            {runningCi ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Simulating Replay check...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-emerald-400" /> Simulate CI Replay Check
              </>
            )}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121214] border border-[#222226] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
          <span className="text-xs text-zinc-500 uppercase font-mono">Syncing pipeline registries...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* STATS CHIPS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#121214] border border-[#222226] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Deployment Runs</span>
                <span className="text-xl font-extrabold text-white mt-1 block">{runs.length}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Cpu size={16} className="text-zinc-400" />
              </div>
            </div>

            <div className="bg-[#121214] border border-[#222226] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Avg Survivability</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{avgSurvivability}%</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Activity size={16} className="text-emerald-400" />
              </div>
            </div>

            <div className="bg-[#121214] border border-[#222226] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Active Previews</span>
                <span className="text-xl font-extrabold text-indigo-400 mt-1 block">{activePreviewsCount}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <ExternalLink size={16} className="text-indigo-400" />
              </div>
            </div>

            <div className="bg-[#121214] border border-[#222226] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">UX Risk Signals</span>
                <span className={`text-xl font-extrabold mt-1 block ${criticalRisksCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {criticalRisksCount} High
                </span>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${criticalRisksCount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <AlertCircle size={16} className={criticalRisksCount > 0 ? 'text-red-400' : 'text-emerald-400'} />
              </div>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex flex-wrap border-b border-[#222226] gap-2 pb-px text-xs">
            {[
              { id: 'runs', label: 'Deployments', icon: Cpu },
              { id: 'prs', label: 'PR Intelligence', icon: GitPullRequest },
              { id: 'regressions', label: 'Regression Explorer', icon: BarChart3 },
              { id: 'previews', label: 'Preview Environments', icon: ExternalLink },
              { id: 'risks', label: 'UX Risks', icon: AlertTriangle },
              { id: 'timeline', label: 'Timeline', icon: Terminal }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold tracking-tight uppercase transition-all ${
                    isActive 
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-500/[0.02]' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS */}
          <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
            {activeTab === 'runs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">Recent Deployment Runs</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">Vercel, Netlify & CI builds</span>
                </div>
                <div className="flex flex-col gap-3">
                  {runs.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs border border-dashed border-[#222226] rounded-xl">
                      No deployments recorded. Trigger a CI simulation check to generate a run.
                    </div>
                  ) : (
                    runs.map((run) => (
                      <div 
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className="bg-[#18181b] border border-[#222226] hover:border-emerald-500/25 p-4 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            run.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            <Cpu size={14} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">Branch: {run.branch}</span>
                              <span className="text-[9px] uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                {run.environment}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ({run.commitHash.substring(0, 7)})
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 mt-1 block">Provider: {run.provider}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase block font-mono">UX Survivability</span>
                            <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block">
                              {run.survivabilityScore ? `${run.survivabilityScore}%` : 'Pending'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase block font-mono">Risk Level</span>
                            <span className={`text-xs font-extrabold mt-0.5 block ${
                              run.riskLevel === 'HIGH' || run.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {run.riskLevel || 'N/A'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase block font-mono">Status</span>
                            <span className="text-[10px] font-bold text-white uppercase bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded mt-0.5 block">
                              {run.status}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'prs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">Pull Request UX Observability</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">PR summaries and regression audits</span>
                </div>
                <div className="flex flex-col gap-3">
                  {prs.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs border border-dashed border-[#222226] rounded-xl">
                      No PR intelligence records found. Run CI verification to check PR branch.
                    </div>
                  ) : (
                    prs.map((pr) => (
                      <div 
                        key={pr.id}
                        onClick={() => setSelectedPr(pr)}
                        className="bg-[#18181b] border border-[#222226] hover:border-indigo-500/20 p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <GitPullRequest size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">PR #{pr.prNumber}: {pr.prTitle}</span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-zinc-500">
                              <span>Source: {pr.sourceBranch}</span>
                              <span className="text-zinc-600">→</span>
                              <span>Target: {pr.targetBranch}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Survivability Delta</span>
                            <span className={`text-xs font-extrabold mt-0.5 block ${pr.survivabilityDelta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {pr.survivabilityDelta >= 0 ? `+${pr.survivabilityDelta}%` : `${pr.survivabilityDelta}%`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Risk Score</span>
                            <span className={`text-xs font-extrabold mt-0.5 block ${pr.riskScore > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {pr.riskScore}/100
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'regressions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">Replay Regression Explorer</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">Current build vs historical baselines</span>
                </div>
                <div className="flex flex-col gap-3">
                  {regressions.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs border border-dashed border-[#222226] rounded-xl">
                      No regressions detected on recent builds.
                    </div>
                  ) : (
                    regressions.map((reg) => (
                      <div key={reg.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">Path: {reg.workflowPath}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                              reg.severity === 'CRITICAL' || reg.severity === 'HIGH' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {reg.severity}
                            </span>
                            <span className="bg-[#0c0c0e] text-zinc-500 text-[8px] border border-[#222226] px-2 py-0.5 rounded uppercase">
                              {reg.metricName}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-normal">{reg.explanation}</p>
                        </div>

                        <div className="flex items-center gap-6 flex-shrink-0 text-right">
                          <div>
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Baseline</span>
                            <span className="text-xs font-bold text-zinc-500 mt-0.5 block">{reg.baseValue}%</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Current</span>
                            <span className="text-xs font-bold text-white mt-0.5 block">{reg.currentValue}%</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Delta</span>
                            <span className={`text-xs font-extrabold mt-0.5 block ${reg.delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {reg.delta > 0 ? `+${reg.delta.toFixed(1)}%` : `${reg.delta.toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'previews' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">Preview Environment Inspector</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">Temporary site validation logs</span>
                </div>
                <div className="flex flex-col gap-3">
                  {previews.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs border border-dashed border-[#222226] rounded-xl">
                      No temporary preview environments listed.
                    </div>
                  ) : (
                    previews.map((prev) => (
                      <div key={prev.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white">Branch: {prev.branch}</span>
                            <span className="bg-indigo-500/10 text-indigo-400 text-[8px] px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-mono">
                              {prev.provider}
                            </span>
                          </div>
                          <a 
                            href={prev.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 mt-1"
                          >
                            {prev.url} <ExternalLink size={10} />
                          </a>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 uppercase block font-mono">Status</span>
                            <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-2.5 py-0.5 rounded border border-emerald-500/20 uppercase mt-0.5 block">
                              {prev.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">UX Risk Signals</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">Friction alerts triggered during deployment check</span>
                </div>
                <div className="flex flex-col gap-3">
                  {risks.length === 0 ? (
                    <div className="text-center py-10 text-emerald-400 text-xs border border-dashed border-[#222226] rounded-xl">
                      No active friction risks detected on recent builds. All onboarding parameters optimal.
                    </div>
                  ) : (
                    risks.map((rk) => (
                      <div key={rk.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{rk.riskType}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                              rk.severity === 'CRITICAL' || rk.severity === 'HIGH' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {rk.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-normal">{rk.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-white">Release Timeline Log</h3>
                  <span className="text-[10px] text-zinc-500 uppercase">Chronological pipeline logs</span>
                </div>
                <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-6">
                  {timeline.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No pipeline events logged yet.
                    </div>
                  ) : (
                    timeline.map((event) => (
                      <div key={event.id} className="relative">
                        {/* Event Dot */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{event.eventTitle}</span>
                            <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono uppercase">
                              {event.eventType}
                            </span>
                            <span className="text-[9px] text-zinc-500 ml-auto">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 max-w-xl">{event.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PR DETAILS OVERLAY PANEL ────────────────────────────────────────── */}
      {selectedPr && (
        <div className="fixed inset-0 bg-[#070b0a]/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-[#121214] border-l border-[#222226] h-full flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex items-center justify-between border-b border-[#222226] pb-4 mb-6">
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <GitPullRequest className="text-indigo-400" size={14} /> PR Intelligence summary comment
                  </h3>
                  <span className="text-[9px] text-zinc-500 uppercase block mt-1">Report generated on CI check</span>
                </div>
                <button
                  onClick={() => setSelectedPr(null)}
                  className="p-1.5 hover:bg-[#1c1c22] rounded-lg border border-transparent hover:border-[#222226] transition-all"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>

              <div className="bg-[#18181b] border border-[#222226] p-4 rounded-xl mb-6">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">GitHub PR Target Summary</span>
                <span className="text-white text-xs font-bold block">{selectedPr.prTitle}</span>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                  <span>Branch: {selectedPr.sourceBranch}</span>
                  <span>→</span>
                  <span>{selectedPr.targetBranch}</span>
                </div>
              </div>

              <div className="bg-[#0c0c0e] border border-[#222226] p-4 rounded-xl overflow-auto max-h-[400px]">
                <span className="text-[9px] text-zinc-500 uppercase block mb-3 font-bold font-mono">Generated Comment:</span>
                <pre className="text-[10px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap">
                  {selectedPr.summary}
                </pre>
              </div>
            </div>

            <div className="border-t border-[#222226] pt-4 mt-6">
              <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                PR Summaries are pushed back directly to GitHub Action pull requests as comment logs, maintaining governance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPLOYMENT RUN DETAILS OVERLAY PANEL ─────────────────────────────── */}
      {selectedRun && (
        <div className="fixed inset-0 bg-[#070b0a]/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-[#121214] border-l border-[#222226] h-full flex flex-col justify-between shadow-2xl p-6">
            <div>
              <div className="flex items-center justify-between border-b border-[#222226] pb-4 mb-6">
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="text-emerald-400" size={14} /> Deployment Run Details
                  </h3>
                  <span className="text-[9px] text-zinc-500 uppercase block mt-1">Environment and build correlations</span>
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="p-1.5 hover:bg-[#1c1c22] rounded-lg border border-transparent hover:border-[#222226] transition-all"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-[#18181b] border border-[#222226] p-4 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase block mb-1">Commit Hash</span>
                  <span className="text-white text-xs font-bold block">{selectedRun.commitHash}</span>
                </div>

                {selectedRun.buildCorrelations && selectedRun.buildCorrelations.map((bc: any) => (
                  <div key={bc.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl space-y-2">
                    <span className="text-[9px] text-zinc-500 uppercase block">CI Build Correlation</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] block">Build ID:</span>
                        <span className="text-white font-bold">{bc.buildId}</span>
                      </div>
                      {bc.jobId && (
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Job ID:</span>
                          <span className="text-white font-bold">{bc.jobId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500 text-[10px] block">Author:</span>
                        <span className="text-white font-bold">{bc.author || 'N/A'}</span>
                      </div>
                      {bc.duration && (
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Duration:</span>
                          <span className="text-white font-bold">{bc.duration}s</span>
                        </div>
                      )}
                    </div>
                    {bc.commitMessage && (
                      <div className="border-t border-[#222226] pt-2 mt-2">
                        <span className="text-zinc-500 text-[10px] block">Message:</span>
                        <p className="text-white text-xs mt-0.5 italic">"{bc.commitMessage}"</p>
                      </div>
                    )}
                    {bc.logUrl && (
                      <a 
                        href={bc.logUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 mt-2"
                      >
                        View CI Logs <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#222226] pt-4 mt-6">
              <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                Build correlations link code commits directly to Fricta's runtime validation traces.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
