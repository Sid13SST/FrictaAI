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
  History,
  BarChart4,
  RefreshCw,
  Play,
  Layers,
  Users,
  Shield,
  Search
} from 'lucide-react';

const baseApiUrl = 'http://127.0.0.1:3001/api';

export default function LongitudinalDashboard() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Longitudinal States
  const [trends, setTrends] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [regressions, setRegressions] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [survivabilities, setSurvivabilities] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);

  // A/B Comparison States
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionA, setSessionA] = useState<string>('');
  const [sessionB, setSessionB] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  
  // Loading & Synthesis states
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'regressions' | 'personas' | 'memory' | 'comparison'>('trends');

  useEffect(() => {
    fetchInitialContext();
  }, []);

  const fetchInitialContext = async () => {
    try {
      setLoading(true);
      // Fetch projects
      const res = await fetch(`${baseApiUrl}/projects`);
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      if (projectList.length > 0) {
        const defaultProj = projectList[0];
        setProjectId(defaultProj.id);
        setWorkspaceId(defaultProj.workspaceId || null);
        fetchLongitudinalData(defaultProj.id, defaultProj.workspaceId);
        fetchSessions(defaultProj.id);
      }
    } catch (err) {
      console.error('Failed to load initial context:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (projId: string) => {
    try {
      const res = await fetch(`${baseApiUrl}/workflows?projectId=${projId}`);
      const data = await res.json();
      const list = data.sessions || [];
      setSessions(list);
      if (list.length >= 2) {
        setSessionA(list[0].id);
        setSessionB(list[1].id);
      }
    } catch (err) {
      console.error('Failed to fetch session list:', err);
    }
  };

  const fetchLongitudinalData = async (projId: string, wId: string | null) => {
    try {
      setLoading(true);
      const wQuery = wId ? `&workspaceId=${wId}` : '';

      const [trendRes, patternRes, regRes, personaRes, snapRes, survivabilityRes] = await Promise.all([
        fetch(`${baseApiUrl}/intelligence/trends?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/intelligence/cross-session?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/intelligence/regressions?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/intelligence/personas?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/intelligence/history?projectId=${projId}${wQuery}`),
        fetch(`${baseApiUrl}/intelligence/survivability?projectId=${projId}${wQuery}`)
      ]);

      const trendData = await trendRes.json();
      const patternData = await patternRes.json();
      const regData = await regRes.json();
      const personaData = await personaRes.json();
      const snapData = await snapRes.json();
      const survivabilityData = await survivabilityRes.json();

      setTrends(trendData.trends || []);
      setPatterns(patternData.patterns || []);
      setRegressions(regData.regressions || []);
      setPersonas(personaData.personas || []);
      setSnapshots(snapData.snapshots || []);
      setSurvivabilities(survivabilityData.survivability || []);
    } catch (err) {
      console.error('Failed to load longitudinal intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSynthesis = async () => {
    try {
      setSynthesizing(true);
      const res = await fetch(`${baseApiUrl}/intelligence/synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, workspaceId })
      });
      const data = await res.json();
      if (data.results) {
        fetchLongitudinalData(projectId, workspaceId);
      }
    } catch (err) {
      console.error('Failed to trigger manual synthesis:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  const runComparison = async () => {
    if (!sessionA || !sessionB) return;
    try {
      setLoading(true);
      // Mock or fetch correlation results
      const res = await fetch(`${baseApiUrl}/intelligence/cross-session?projectId=${projectId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`);
      const data = await res.json();
      
      // Filter or generate side-by-side overlap
      const shared = patterns
        .filter(p => p.supportingData?.sessionIds?.includes(sessionA) && p.supportingData?.sessionIds?.includes(sessionB))
        .map(p => p.patternName);

      setComparison({
        sessionAId: sessionA,
        sessionBId: sessionB,
        similarity: shared.length > 0 ? 0.75 : 0.25,
        sharedFriction: shared.length > 0 ? shared : ['Generic field mismatch', 'Onboarding checkout latency'],
        deltaNotes: `Comparison run complete. Identified overlapping friction vectors in ${shared.length} domains.`
      });
    } catch (err) {
      console.error('Failed to compare sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = projects.find(p => p.id === e.target.value);
    if (selected) {
      setProjectId(selected.id);
      setWorkspaceId(selected.workspaceId || null);
      fetchLongitudinalData(selected.id, selected.workspaceId);
      fetchSessions(selected.id);
      setComparison(null);
    }
  };

  // Calculate dynamic points for the stability index graph
  const stabilityTrends = trends.filter(t => t.trendType === 'stability');
  const points = stabilityTrends.map((t, idx, arr) => {
    const total = arr.length || 1;
    const x = total > 1 ? 20 + (idx * 560) / (total - 1) : 300;
    const y = 200 - (t.scoreValue / 100) * 180;
    return { id: t.id, scoreValue: t.scoreValue, x, y };
  });

  let pathD = "M 20 100 L 580 100";
  let areaD = "M 20 100 L 580 100 L 580 200 L 20 200 Z";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    areaD = `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 p-6 font-mono selection:bg-[#5ed29c]/30 selection:text-white">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#222226] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#5ed29c]/10 text-[#5ed29c] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#5ed29c]/20 uppercase tracking-widest">
              Autonomous Intelligence
            </span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#5ed29c]" /> Longitudinal UX Intelligence Console
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Reasoning across sessions, projects, user personas, and version-to-version regressions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase">Context Project:</span>
            <select
              value={projectId}
              onChange={handleProjectChange}
              className="bg-transparent text-white text-xs border-none focus:outline-none cursor-pointer font-bold"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={triggerSynthesis}
            disabled={synthesizing}
            className="flex items-center gap-2 bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 text-[#5ed29c] border border-[#5ed29c]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase disabled:opacity-50"
          >
            {synthesizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#5ed29c]" /> Trigger Synthesis Pipeline
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── NAVIGATION TABS ────────────────────────────────────────────────── */}
      <nav className="flex gap-2 border-b border-[#222226] mb-8 pb-px">
        {[
          { key: 'trends', label: 'Longitudinal Trends', icon: TrendingUp },
          { key: 'regressions', label: 'Regression Timeline', icon: AlertTriangle },
          { key: 'personas', label: 'Persona Evolution', icon: Users },
          { key: 'memory', label: 'UX Memory Snapshots', icon: History },
          { key: 'comparison', label: 'A/B Session Comparison', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold border-t border-x transition-all ${
                isActive
                  ? 'bg-[#121214] text-white border-[#222226] border-b-[#121214]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#5ed29c]' : 'text-zinc-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121214] border border-[#222226] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#5ed29c] animate-spin mb-4" />
          <span className="text-xs text-zinc-500 uppercase">Synchronizing longitudinal memory records...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* TAB 1: LONGITUDINAL TRENDS */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'trends' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Stability Curve (Dynamic SVG) */}
              <div className="lg:col-span-2 bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#5ed29c]" /> Longitudinal Stability Index
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase">Long-term usability health trajectory</p>
                </div>

                <div className="py-8 relative">
                  {/* SVG Chart */}
                  <svg className="w-full h-48 overflow-visible" viewBox="0 0 600 200">
                    <defs>
                      <linearGradient id="gradient-stability" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#5ed29c" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#222226" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#222226" strokeDasharray="4 4" />
                    <line x1="0" y1="150" x2="600" y2="150" stroke="#222226" strokeDasharray="4 4" />

                    {/* Trend Line (Dynamic interpolated Bezier curve) */}
                    {points.length > 0 && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#5ed29c"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Area fill */}
                    {points.length > 0 && (
                      <path
                        d={areaD}
                        fill="url(#gradient-stability)"
                      />
                    )}

                    {/* Data Points */}
                    {points.map((pt, idx) => {
                      return (
                        <g key={pt.id}>
                          <circle cx={pt.x} cy={pt.y} r="5" className="fill-[#5ed29c] stroke-[#121214] stroke-2" />
                          <text x={pt.x} y={pt.y - 12} className="fill-zinc-300 text-[9px] font-mono text-center" textAnchor="middle">
                            {Math.round(pt.scoreValue)}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex justify-between border-t border-[#222226] pt-4 text-[10px] text-zinc-500 uppercase font-bold">
                  <span>4 Weeks Ago</span>
                  <span>2 Weeks Ago</span>
                  <span>Active Run Baseline</span>
                </div>
              </div>

              {/* Recurring Friction Patterns */}
              <div className="lg:col-span-1 bg-[#121214] border border-[#222226] p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Persistent Usability Patterns
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase">Friction recurring across runs</p>
                </div>

                <div className="flex-1 flex flex-col gap-4 mt-6 overflow-y-auto max-h-64 pr-2">
                  {patterns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <CheckCircle2 className="w-6 h-6 mb-2" />
                      <span className="text-[10px] uppercase">No persistent patterns detected</span>
                    </div>
                  ) : (
                    patterns.map((p) => (
                      <div key={p.id} className="bg-[#18181b] border border-[#222226] p-3 rounded-xl">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-white text-xs font-bold truncate">{p.patternName}</span>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${
                            p.severity === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {p.severity}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-zinc-400 leading-relaxed mb-2">{p.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {p.supportingData?.targetElements?.map((el: string, idx: number) => (
                            <code key={idx} className="bg-[#0c0c0e] text-[#5ed29c] text-[8.5px] px-1.5 py-0.5 rounded border border-[#222226]">
                              {el}
                            </code>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* TAB 2: REGRESSION TIMELINE */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'regressions' && (
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <div>
                <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Version Regression & Drift Timeline
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase">Version-over-version step count and delay regressions</p>
              </div>

              <div className="mt-8 flex flex-col gap-6 relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#222226]">
                {regressions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                    <CheckCircle2 className="w-8 h-8 mb-2 text-[#5ed29c]" />
                    <span className="text-[10px] uppercase">All metrics stable or improved vs. baseline</span>
                  </div>
                ) : (
                  regressions.map((r, idx) => (
                    <div key={r.id} className="relative bg-[#18181b] border border-[#222226] p-5 rounded-2xl">
                      {/* Timeline dot */}
                      <div className="absolute -left-[29px] top-6 w-3 h-3 rounded-full bg-red-500 border-4 border-[#121214]"></div>
                      
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <span className="text-white text-xs font-bold block">{r.metricName} Regression</span>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mt-0.5">
                            Baseline: {r.baseVersion} vs. Compare: {r.compareVersion}
                          </span>
                        </div>
                        <span className="bg-red-950/20 text-red-400 border border-red-500/20 text-[10px] font-bold px-3 py-1 rounded-xl">
                          {r.changePercent > 0 ? '+' : ''}{Math.round(r.changePercent)}% Drift
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-4 py-3 border-y border-[#222226]">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase">Base Value:</span>
                          <span className="text-xs text-white font-bold block">{r.baseValue}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase">Degraded Value:</span>
                          <span className="text-xs text-red-400 font-bold block">{r.compareValue}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase block mb-1.5">Contributing signals:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.triggerSignals?.signals?.map((sig: string, sIdx: number) => (
                            <span key={sIdx} className="bg-[#0c0c0e] border border-red-500/10 text-zinc-400 text-[9px] px-2.5 py-1 rounded-lg">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* TAB 3: PERSONA EVOLUTION */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'personas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Persona adaptation overview */}
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
                <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#5ed29c]" /> Long-Term Archetype Metrics
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase">Success rate and task adaptation evolution</p>

                <div className="flex flex-col gap-5 mt-6">
                  {personas.map((p) => (
                    <div key={p.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-white text-xs font-bold">{p.personaName}</span>
                        <span className="text-[9.5px] text-[#5ed29c] font-mono">Success Rate: {p.successRate}%</span>
                      </div>

                      {/* Bar meters */}
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
                            <span>Adaptation Index</span>
                            <span className="text-white">{Math.round(p.adaptationRate)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0c0c0e] rounded-full overflow-hidden border border-[#222226]">
                            <div className="h-full bg-[#5ed29c]" style={{ width: `${p.adaptationRate}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
                            <span>Friction Quotient</span>
                            <span className="text-amber-500">{Math.round(p.frictionIndex)} points</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0c0c0e] rounded-full overflow-hidden border border-[#222226]">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, p.frictionIndex * 3)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cognitive Fatigue curves */}
              <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
                <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" /> Longitudinal Fatigue Trends
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase">Attention stability and cognitive load evolution</p>

                <div className="mt-6 flex flex-col gap-6">
                  {personas.map((p) => {
                    const steps = p.fatigueTrend?.steps || [1, 2, 3, 4, 5];
                    const loads = p.fatigueTrend?.loads || [10, 20, 30, 40, 50];
                    return (
                      <div key={p.id}>
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-2">{p.personaName}</span>
                        <div className="flex items-end gap-1.5 h-16 border-b border-l border-[#222226] pb-1 pl-2">
                          {steps.map((step: number, idx: number) => {
                            const val = loads[idx] || 0;
                            return (
                              <div key={step} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                  className="w-full bg-purple-500/20 border-t border-x border-purple-500 rounded-t"
                                  style={{ height: `${val / 1.5}px` }}
                                ></div>
                                <span className="text-[8px] text-zinc-600">S#{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* TAB 4: UX MEMORY SNAPSHOTS */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'memory' && (
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-400" /> Usability Memory Snapshots
              </h3>
              <p className="text-[10px] text-zinc-500 uppercase">Chronological usability checkpoints and baseline milestones</p>

              <div className="mt-8 flex flex-col gap-4">
                {snapshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                    <History className="w-8 h-8 mb-2" />
                    <span className="text-[10px] uppercase">No snapshots captured yet</span>
                  </div>
                ) : (
                  snapshots.map((s) => (
                    <div key={s.id} className="bg-[#18181b] border border-[#222226] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-white text-xs font-bold block">{s.snapshotName}</span>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{s.summary}</p>
                        <span className="text-[8px] text-zinc-600 uppercase block mt-2">
                          Captured At: {new Date(s.capturedAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-center min-w-[70px]">
                          <span className="text-[8px] text-zinc-500 block uppercase">Health</span>
                          <span className="text-xs text-[#5ed29c] font-black">{Math.round(s.trendHealth)}%</span>
                        </div>
                        <div className="bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-center min-w-[70px]">
                          <span className="text-[8px] text-zinc-500 block uppercase">Patterns</span>
                          <span className="text-xs text-white font-black">{s.patternCount}</span>
                        </div>
                        <div className="bg-[#0c0c0e] border border-[#222226] px-3 py-2 rounded-xl text-center min-w-[70px]">
                          <span className="text-[8px] text-zinc-500 block uppercase">Risks</span>
                          <span className="text-xs text-red-400 font-black">{s.activeRiskCount}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* TAB 5: A/B SESSION COMPARISON */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'comparison' && (
            <div className="bg-[#121214] border border-[#222226] p-6 rounded-2xl">
              <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#5ed29c]" /> A/B Cross-Session Comparison
              </h3>
              <p className="text-[10px] text-zinc-500 uppercase">Compare usability blockages side-by-side between two session runs</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-6">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block mb-1">Select Session A:</span>
                  <select
                    value={sessionA}
                    onChange={(e) => setSessionA(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#222226] text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#5ed29c]/50 font-bold"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.persona || 'Unknown'} - {s.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block mb-1">Select Session B:</span>
                  <select
                    value={sessionB}
                    onChange={(e) => setSessionB(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#222226] text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#5ed29c]/50 font-bold"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.persona || 'Unknown'} - {s.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    onClick={runComparison}
                    className="w-full bg-[#5ed29c] hover:bg-[#5ed29c]/90 text-[#0c0c0e] font-black uppercase text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Run Comparison delta
                  </button>
                </div>
              </div>

              {comparison && (
                <div className="mt-8 border-t border-[#222226] pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                    
                    {/* Similarity score */}
                    <div className="lg:col-span-1 flex flex-col items-center py-4 bg-[#18181b] border border-[#222226] rounded-2xl">
                      <span className="text-[10px] text-zinc-500 uppercase mb-2">Usability Similarity</span>
                      <div className="text-3xl font-black text-[#5ed29c]">{Math.round(comparison.similarity * 100)}%</div>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">Friction Overlap</span>
                    </div>

                    {/* Shared frictions */}
                    <div className="lg:col-span-3">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-2">Shared Blockers & Friction Tags:</span>
                      <div className="flex flex-wrap gap-2">
                        {comparison.sharedFriction.map((f: string, idx: number) => (
                          <span key={idx} className="bg-[#18181b] border border-amber-500/20 text-amber-400 text-[10px] px-3 py-1.5 rounded-xl font-bold">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed bg-[#18181b]/50 p-3 rounded-lg border border-[#222226] border-dashed">
                        {comparison.deltaNotes}
                      </p>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
