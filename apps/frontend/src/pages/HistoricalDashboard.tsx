import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Layers, 
  Cpu, 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  HelpCircle, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
}

interface Pattern {
  id: string;
  patternType: string;
  name: string;
  description: string;
  severity: string;
  confidence: number;
  frequency: number;
  evidenceSummary: string;
}

interface Regression {
  id: string;
  workflowPath: string;
  metricName: string;
  baseValue: number;
  currentValue: number;
  deltaPercentage: number;
  severity: string;
  explanation: string;
  evidenceSessionId: string;
  baseSessionId: string;
  createdAt: string;
}

interface PersonaTrend {
  id: string;
  personaType: string;
  metricName: string;
  trendDirection: string;
  averageValue: number;
  observation: string;
  sampleCount: number;
}

interface AdaptiveProfile {
  id: string;
  agentType: string;
  targetPriority: string;
  reasonTrigger: string;
  isActive: boolean;
  metadata: {
    overrides: any;
    confidence: number;
    evidenceSummary: string;
  };
}

export const HistoricalDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Data States
  const [stabilityTrend, setStabilityTrend] = useState<any[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [averageStability, setAverageStability] = useState<number>(100);
  
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [regressions, setRegressions] = useState<Regression[]>([]);
  const [personaTrends, setPersonaTrends] = useState<PersonaTrend[]>([]);
  const [adaptiveProfiles, setAdaptiveProfiles] = useState<AdaptiveProfile[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  // Comparison Baselines
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Tabs for Dashboard views
  type SubTab = 'overview' | 'regressions' | 'personas' | 'adaptation';
  const [activeTab, setActiveTab] = useState<SubTab>('overview');

  const baseApiUrl = 'http://127.0.0.1:3001/api';

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${baseApiUrl}/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to analytics api');
      setLoading(false);
    }
  };

  const fetchProjectAnalytics = async (projectId: string) => {
    try {
      setError(null);
      
      const [
        patternsRes,
        regressionsRes,
        personasRes,
        trendsRes,
        profilesRes,
        sessionsRes
      ] = await Promise.all([
        fetch(`${baseApiUrl}/historical/patterns?projectId=${projectId}`),
        fetch(`${baseApiUrl}/historical/regressions?projectId=${projectId}`),
        fetch(`${baseApiUrl}/historical/personas?projectId=${projectId}`),
        fetch(`${baseApiUrl}/historical/trends?projectId=${projectId}`),
        fetch(`${baseApiUrl}/historical/adaptive-signals?projectId=${projectId}`),
        fetch(`${baseApiUrl}/workflows?projectId=${projectId}`) // fetches all workflow sessions
      ]);

      const [pData, rData, perData, tData, profData, sData] = await Promise.all([
        patternsRes.json(),
        regressionsRes.json(),
        personasRes.json(),
        trendsRes.json(),
        profilesRes.json(),
        sessionsRes.json()
      ]);

      setPatterns(pData.patterns || []);
      setRegressions(rData.regressions || []);
      setPersonaTrends(perData.trends || []);
      
      setStabilityTrend(tData.stabilityTrend || []);
      setHeatmapPoints(tData.heatmapPoints || []);
      setAverageStability(tData.averageStability || 100);
      
      setAdaptiveProfiles(profData.profiles || []);
      
      const validSessions = sData.sessions || sData || [];
      setSessions(validSessions);

      if (validSessions.length > 0) {
        setSelectedSessionId(validSessions[0].id);
        if (validSessions.length > 1) {
          setSelectedBaselineId(validSessions[1].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch longitudinal metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectAnalytics(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleForceAnalyze = async () => {
    if (!selectedProjectId) return;
    try {
      setAnalyzing(true);
      const res = await fetch(`${baseApiUrl}/historical/analyze/${selectedProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latestSessionId: selectedSessionId,
          customBaselineId: selectedBaselineId
        })
      });
      if (!res.ok) throw new Error('Analysis run failed');
      await fetchProjectAnalytics(selectedProjectId);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger historical analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCompareSessions = () => {
    if (!selectedSessionId || !selectedBaselineId) return;
    
    // Find sessions in local state
    const current = sessions.find(s => s.id === selectedSessionId);
    const base = sessions.find(s => s.id === selectedBaselineId);

    if (!current || !base) return;

    // Filter regressions matching these two specific sessions
    const comparisonRegs = regressions.filter(
      r => r.evidenceSessionId === selectedSessionId && r.baseSessionId === selectedBaselineId
    );

    setComparisonResult({
      current,
      base,
      regressions: comparisonRegs
    });
  };

  useEffect(() => {
    if (selectedSessionId && selectedBaselineId && regressions.length > 0) {
      handleCompareSessions();
    }
  }, [selectedSessionId, selectedBaselineId, regressions]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#070b0a] flex flex-col items-center justify-center gap-4 text-zinc-400 font-mono">
        <div className="w-10 h-10 border-2 border-t-transparent animate-spin rounded-full border-[#5ed29c]/20 border-t-[#5ed29c]" />
        <span className="text-[10px] tracking-[0.2em] text-[#5ed29c] font-black uppercase animate-pulse">
          AGGREGATING ORGANIZATIONAL UX MEMORY...
        </span>
      </div>
    );
  }

  const cleanMetricName = (name: string) => {
    return name.replace(/_/g, ' ');
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-400 border-red-500/20 bg-red-500/5';
      case 'HIGH':
        return 'text-orange-400 border-orange-500/20 bg-orange-500/5';
      case 'MEDIUM':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      default:
        return 'text-[#5ed29c] border-[#5ed29c]/20 bg-[#5ed29c]/5';
    }
  };

  return (
    <div className="min-h-screen bg-[#070b0a] text-zinc-100 font-sans p-6 select-none">
      
      {/* ── Header Dashboard Info ────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#222226] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5ed29c]/5 border border-[#5ed29c]/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#5ed29c]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase font-mono">
                Longitudinal UX Intelligence
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">CONTINUOUS PATTERN LEARNING & REGRESSION TRACKING</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
              <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent border-none text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleForceAnalyze}
            disabled={analyzing || !selectedProjectId}
            className="flex items-center gap-2 text-xs font-mono font-bold text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/10 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'RUNNING ANALYTICS...' : 'FORCE RE-ANALYZE'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black font-mono text-red-400 uppercase">Operational Error</h4>
            <p className="text-xs text-zinc-400 mt-1 font-sans">{error}</p>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-12 text-center text-zinc-500 font-mono text-xs max-w-lg mx-auto mt-20">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          NO ACTIVE PROJECTS FOUND. Run a workflow session first to generate project telemetry.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ── Left Rail Navigation ────────────────────────────────────── */}
          <aside className="lg:col-span-1 flex flex-col gap-2">
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black px-3.5 mb-1 block">
              Longitudinal Modules
            </span>
            {[
              { key: 'overview', label: 'UX Stability & Heatmaps', icon: Activity },
              { key: 'regressions', label: 'Regression Compare', icon: Layers },
              { key: 'personas', label: 'Persona Behavior Profiles', icon: Cpu },
              { key: 'adaptation', label: 'Adaptive Orchestration', icon: Sparkles },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as SubTab)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-mono font-bold border text-left transition-all ${
                    isActive
                      ? 'bg-[#5ed29c]/10 text-white border-[#5ed29c]/20'
                      : 'border-transparent text-zinc-400 hover:bg-[#121214] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#5ed29c]' : 'text-zinc-500'}`} />
                  {tab.label}
                </button>
              );
            })}

            {/* Health Overview Widget */}
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 mt-6">
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-black tracking-widest block">Aggregated Stability</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-3xl font-mono font-black text-white">{averageStability}%</span>
                <span className="text-[10px] text-zinc-500 font-mono">INDEX</span>
              </div>
              <div className="w-full h-1.5 bg-[#222226] rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-[#5ed29c] rounded-full transition-all duration-500" 
                  style={{ width: `${averageStability}%` }}
                />
              </div>
              <span className="text-[10px] font-sans text-zinc-500 mt-2 block">
                Aggregated usability score over the entire version history.
              </span>
            </div>
          </aside>

          {/* ── Main Canvas View ────────────────────────────────────────── */}
          <main className="lg:col-span-3 min-w-0">
            
            {/* TAB 1: OVERVIEW & HEATMAP */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                
                {/* Stability Line Chart */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white">
                      UX Stability Index Curve
                    </h3>
                    {hoveredPoint ? (
                      <span className="text-[10px] font-mono text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Run #{hoveredPoint.index + 1}: {hoveredPoint.score}% Stability
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                        Hover points for timeline details
                      </span>
                    )}
                  </div>
                  
                  {stabilityTrend.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
                      Run more investigations to generate stability tracking trendlines.
                    </div>
                  ) : (() => {
                    const chartLeft = 50;
                    const chartTop = 20;
                    const chartWidth = 530;
                    const chartHeight = 175;
                    const points = stabilityTrend.map((t, idx) => {
                      const x = stabilityTrend.length > 1
                        ? chartLeft + (idx / (stabilityTrend.length - 1)) * chartWidth
                        : chartLeft + chartWidth / 2;
                      const y = chartTop + (1 - t.score / 100) * chartHeight;
                      return { x, y, score: t.score, date: t.createdAt, sessionId: t.sessionId, index: idx };
                    });

                    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPath = points.length > 0
                      ? `M ${points[0].x} ${chartTop + chartHeight} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${chartTop + chartHeight} Z`
                      : '';

                    return (
                      <div className="w-full h-64 relative mt-2 select-none">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 600 240">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="#5ed29c" stopOpacity="0.0"/>
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3.5" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Grid Lines */}
                          {[25, 50, 75, 100].map((val) => {
                            const yVal = chartTop + (1 - val / 100) * chartHeight;
                            return (
                              <g key={val}>
                                <line
                                  x1={chartLeft}
                                  y1={yVal}
                                  x2={chartLeft + chartWidth}
                                  y2={yVal}
                                  stroke="#222226"
                                  strokeDasharray="3 4"
                                  strokeWidth="1"
                                />
                                <text
                                  x={chartLeft - 12}
                                  y={yVal + 3}
                                  textAnchor="end"
                                  className="fill-zinc-600 font-mono text-[9px] font-black"
                                >
                                  {val}%
                                </text>
                              </g>
                            );
                          })}

                          {/* Draw Area */}
                          {areaPath && (
                            <path
                              d={areaPath}
                              fill="url(#chartGrad)"
                            />
                          )}

                          {/* Draw Line */}
                          {linePath && (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#5ed29c"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              filter="url(#glow)"
                            />
                          )}

                          {/* X Axis Line */}
                          <line
                            x1={chartLeft}
                            y1={chartTop + chartHeight}
                            x2={chartLeft + chartWidth}
                            y2={chartTop + chartHeight}
                            stroke="#222226"
                            strokeWidth="1.5"
                          />

                          {/* X Axis Labels */}
                          {points.map((p, idx) => {
                            const showLabel = points.length <= 8 || idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2);
                            if (!showLabel) return null;
                            return (
                              <g key={idx}>
                                <line
                                  x1={p.x}
                                  y1={chartTop + chartHeight}
                                  x2={p.x}
                                  y2={chartTop + chartHeight + 4}
                                  stroke="#222226"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={p.x}
                                  y={chartTop + chartHeight + 16}
                                  textAnchor="middle"
                                  className="fill-zinc-500 font-mono text-[9px] font-bold"
                                >
                                  Run #{idx + 1}
                                </text>
                              </g>
                            );
                          })}

                          {/* Interactive Circles */}
                          {points.map((p, idx) => (
                            <circle
                              key={p.sessionId}
                              cx={p.x}
                              cy={p.y}
                              r={hoveredPoint?.sessionId === p.sessionId ? 6 : 4}
                              fill={hoveredPoint?.sessionId === p.sessionId ? '#5ed29c' : '#121214'}
                              stroke="#5ed29c"
                              strokeWidth={hoveredPoint?.sessionId === p.sessionId ? 3 : 2}
                              className="transition-all duration-150 cursor-pointer"
                              onMouseEnter={() => setHoveredPoint(p)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              onClick={() => {
                                setSelectedSessionId(p.sessionId);
                              }}
                            />
                          ))}
                        </svg>

                        {/* Floating Tooltip */}
                        {hoveredPoint && (
                          <div
                            className="absolute bg-[#18181b]/95 border border-[#2d2d30] backdrop-blur-md rounded-xl p-3 shadow-2xl pointer-events-none transition-all duration-100 z-30 font-mono text-[10px] min-w-[140px]"
                            style={{
                              left: `${(hoveredPoint.x / 600) * 100}%`,
                              top: `${(hoveredPoint.y / 240) * 100}%`,
                              transform: 'translate(-50%, -115%)',
                            }}
                          >
                            <div className="text-zinc-500 text-[8.5px] uppercase font-bold mb-1">
                              Run #{hoveredPoint.index + 1}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5ed29c] animate-pulse"></span>
                              <span className="text-white font-bold text-xs">{hoveredPoint.score}% Stability</span>
                            </div>
                            <div className="text-zinc-400 text-[9px] mb-1">
                              {new Date(hoveredPoint.date).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-[#5ed29c] text-[8px] uppercase tracking-wider font-semibold">
                              Click to select session
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* UX Health Friction Heatmap */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2">
                    Friction Hotspot Heatmap
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">UX findings aggregated across paths and severity levels</p>
                  
                  {heatmapPoints.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
                      No aggregated hotzones to display yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#222226] text-zinc-500 text-[10px]">
                            <th className="py-2.5">Workflow Route</th>
                            <th className="py-2.5 text-center">Critical</th>
                            <th className="py-2.5 text-center">High</th>
                            <th className="py-2.5 text-center">Medium</th>
                            <th className="py-2.5 text-center">Low</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(new Set(heatmapPoints.map(p => p.pageUrl))).map((route) => {
                            const getCount = (sev: string) => {
                              return heatmapPoints.find(p => p.pageUrl === route && p.severity === sev)?.count || 0;
                            };

                            const crit = getCount('CRITICAL');
                            const high = getCount('HIGH');
                            const med = getCount('MEDIUM');
                            const low = getCount('LOW');

                            return (
                              <tr key={route} className="border-b border-[#222226]/50 hover:bg-[#121214]/50">
                                <td className="py-3 text-white font-bold max-w-[200px] truncate">{route}</td>
                                <td className={`py-3 text-center ${crit > 0 ? 'text-red-400 font-black' : 'text-zinc-700'}`}>{crit}</td>
                                <td className={`py-3 text-center ${high > 0 ? 'text-orange-400 font-black' : 'text-zinc-700'}`}>{high}</td>
                                <td className={`py-3 text-center ${med > 0 ? 'text-yellow-400 font-black' : 'text-zinc-700'}`}>{med}</td>
                                <td className={`py-3 text-center ${low > 0 ? 'text-[#5ed29c] font-black' : 'text-zinc-700'}`}>{low}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recurring UX Patterns */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white border-b border-[#222226] pb-3 mb-4">
                    Learned Cross-Session Patterns
                  </h3>
                  <div className="flex flex-col gap-4">
                    {patterns.length === 0 ? (
                      <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
                        No recurring patterns detected. Run multiple investigations.
                      </div>
                    ) : (
                      patterns.map((p) => (
                        <div key={p.id} className="p-4 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h4 className="text-xs font-black font-mono text-white uppercase">{p.name}</h4>
                              <p className="text-[10px] text-[#5ed29c] font-mono mt-0.5 uppercase tracking-wide">
                                Pattern: {p.patternType.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(p.severity)}`}>
                              {p.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{p.description}</p>
                          <div className="text-[9.5px] font-mono text-zinc-500 bg-[#070b0a] border border-[#222226] p-2 rounded-lg flex items-center justify-between">
                            <span>{p.evidenceSummary}</span>
                            <span className="text-[#5ed29c] font-bold">{(p.confidence * 100).toFixed(0)}% Conf.</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: REGRESSION COMPARISON PANEL */}
            {activeTab === 'regressions' && (
              <div className="flex flex-col gap-6">
                
                {/* Baseline selector dashboard */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white">
                      Custom Comparison Baseline Workspace
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Select arbitrary sessions to evaluate version deltas</p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#070b0a] border border-[#222226] px-2.5 py-1.5 rounded-lg">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Compare:</span>
                      <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-mono font-bold text-white focus:outline-none cursor-pointer"
                      >
                        {sessions.map((s, idx) => (
                          <option key={s.id} value={s.id} className="bg-[#121214] text-white">
                            Run {sessions.length - idx} ({s.id.slice(0, 6)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#070b0a] border border-[#222226] px-2.5 py-1.5 rounded-lg">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Baseline:</span>
                      <select
                        value={selectedBaselineId}
                        onChange={(e) => setSelectedBaselineId(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-mono font-bold text-white focus:outline-none cursor-pointer"
                      >
                        {sessions.map((s, idx) => (
                          <option key={s.id} value={s.id} className="bg-[#121214] text-white">
                            Run {sessions.length - idx} ({s.id.slice(0, 6)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleCompareSessions}
                      className="text-[10px] font-mono font-bold text-black bg-[#5ed29c] hover:bg-[#5ed29c]/90 px-3 py-1.5 rounded-lg transition-all"
                    >
                      COMPARE
                    </button>
                  </div>
                </div>

                {/* Comparison Results Card */}
                {comparisonResult ? (
                  <div className="flex flex-col gap-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { 
                          label: 'Step Count', 
                          base: comparisonResult.base.stepCount, 
                          curr: comparisonResult.current.stepCount,
                          format: (v: number) => `${v} steps`
                        },
                        { 
                          label: 'Duration', 
                          base: comparisonResult.base.metrics?.duration || 0, 
                          curr: comparisonResult.current.metrics?.duration || 0,
                          format: (v: number) => `${v}s`
                        },
                        { 
                          label: 'Success rate', 
                          base: comparisonResult.base.status === 'COMPLETED' ? 1 : 0, 
                          curr: comparisonResult.current.status === 'COMPLETED' ? 1 : 0,
                          format: (v: number) => v === 1 ? 'SUCCESS' : 'FAILED'
                        },
                        { 
                          label: 'Friction Findings', 
                          base: comparisonResult.base.uxFindings?.length || 0, 
                          curr: comparisonResult.current.uxFindings?.length || 0,
                          format: (v: number) => `${v} flags`
                        }
                      ].map(stat => {
                        const delta = stat.curr - stat.base;
                        const isDegraded = stat.label === 'Success rate' 
                          ? (stat.base === 1 && stat.curr === 0)
                          : (stat.label === 'Friction Findings' || stat.label === 'Step Count' || stat.label === 'Duration') 
                            ? delta > 0 
                            : false;
                        
                        return (
                          <div key={stat.label} className="bg-[#121214] border border-[#222226] p-4 rounded-xl flex flex-col gap-1">
                            <span className="text-[8.5px] font-mono text-zinc-500 uppercase font-black">{stat.label}</span>
                            <div className="flex justify-between items-baseline mt-1">
                              <span className="text-sm font-mono text-white font-bold">{stat.format(stat.curr)}</span>
                              <span className="text-[10px] font-mono text-zinc-500">vs {stat.format(stat.base)}</span>
                            </div>
                            {delta !== 0 && (
                              <span className={`text-[9.5px] font-mono font-bold mt-2 ${isDegraded ? 'text-red-400' : 'text-[#5ed29c]'}`}>
                                {delta > 0 ? `+${delta}` : delta} ({isDegraded ? 'Regressed' : 'Improved'})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detected Regressions List */}
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                      <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white border-b border-[#222226] pb-3 mb-4">
                        Version Usability Regressions
                      </h3>
                      <div className="flex flex-col gap-4">
                        {comparisonResult.regressions.length === 0 ? (
                          <div className="text-center py-12 text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/20 p-4 rounded-xl flex items-center justify-center gap-2 font-mono text-xs font-bold">
                            <CheckCircle className="w-4 h-4" /> NO USABILITY REGRESSIONS DETECTED FOR THIS VERSION DELTA
                          </div>
                        ) : (
                          comparisonResult.regressions.map((reg: any) => (
                            <div key={reg.id} className="p-4 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <h4 className="text-xs font-black font-mono text-white uppercase">{cleanMetricName(reg.metricName)} Regression</h4>
                                  <span className="text-[9.5px] font-mono text-zinc-500 uppercase block mt-0.5">Workflow: {reg.workflowPath}</span>
                                </div>
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(reg.severity)}`}>
                                  {reg.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">{reg.explanation}</p>
                              <div className="text-[9.5px] font-mono text-zinc-500 bg-[#070b0a] border border-[#222226] p-2 rounded-lg flex items-center justify-between">
                                <span>Baseline: <b className="text-white">{reg.baseValue}</b> | Current: <b className="text-white">{reg.currentValue}</b></span>
                                <span className="text-red-400 font-bold">+{reg.deltaPercentage}% Shift</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#121214] border border-[#222226] rounded-xl p-12 text-center text-zinc-500 font-mono text-xs">
                    Configure baseline comparisons to inspect regression models.
                  </div>
                )}

              </div>
            )}

            {/* TAB 3: PERSONA BEHAVIOR CONSOLE */}
            {activeTab === 'personas' && (
              <div className="flex flex-col gap-6">
                
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white border-b border-[#222226] pb-3 mb-4">
                    Persona Behavioral Analysis Console
                  </h3>
                  
                  {personaTrends.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
                      No persona trends loaded.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {Array.from(new Set(personaTrends.map(t => t.personaType))).map((persona) => {
                        const stats = personaTrends.filter(t => t.personaType === persona);
                        return (
                          <div key={persona} className="p-4 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl flex flex-col gap-4">
                            <div className="flex items-center gap-2 border-b border-[#222226] pb-2">
                              <Cpu className="w-4 h-4 text-[#5ed29c]" />
                              <h4 className="text-xs font-black font-mono text-white uppercase">{persona.replace(/_/g, ' ')} Archetype</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {stats.map((stat) => (
                                <div key={stat.id} className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex flex-col justify-between gap-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[8.5px] font-mono text-zinc-500 uppercase font-black">
                                      {cleanMetricName(stat.metricName)}
                                    </span>
                                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                      stat.trendDirection === 'IMPROVING' ? 'text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/20' :
                                      stat.trendDirection === 'DEGRADING' ? 'text-red-400 bg-red-500/5 border border-red-500/20' :
                                      'text-zinc-400 bg-zinc-800'
                                    }`}>
                                      {stat.trendDirection}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-300 leading-normal">{stat.observation}</p>
                                  <span className="text-[9.5px] font-mono text-zinc-500">
                                    Aggregate Score: <b className="text-white">{stat.averageValue}</b> (Sample count: {stat.sampleCount})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: ADAPTIVE ORCHESTRATION PROFILE RULES */}
            {activeTab === 'adaptation' && (
              <div className="flex flex-col gap-6">
                
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <div className="border-b border-[#222226] pb-3 mb-4">
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white">
                      Active Adaptive Prioritization System
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Priorities and parameter tunings applied in upcoming runs based on history</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {adaptiveProfiles.length === 0 ? (
                      <div className="text-center py-12 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl p-4 flex flex-col items-center justify-center gap-2 font-mono text-xs text-zinc-500">
                        <CheckCircle className="w-5 h-5 text-zinc-600" />
                        No overrides needed. System is operating under standard default prioritizations.
                      </div>
                    ) : (
                      adaptiveProfiles.map((prof) => (
                        <div key={prof.id} className="p-4 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div>
                              <h4 className="text-xs font-black font-mono text-white uppercase">{prof.agentType.replace(/_/g, ' ')} Override</h4>
                              <p className="text-[9.5px] text-zinc-500 font-mono mt-0.5">Trigger: {prof.reasonTrigger}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] bg-[#5ed29c]/10 text-[#5ed29c] border border-[#5ed29c]/20 px-2 py-0.5 rounded font-bold font-mono">
                                ACTIVE GUIDED ADAPTATION
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(prof.targetPriority)}`}>
                                Priority: {prof.targetPriority}
                              </span>
                            </div>
                          </div>

                          <div className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex flex-col gap-1 text-[11px] font-mono">
                            <span className="text-[8px] font-mono text-zinc-500 uppercase font-black tracking-widest block mb-1">Threshold Tunings</span>
                            {prof.metadata?.overrides && Object.entries(prof.metadata.overrides).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center text-zinc-300 py-0.5 border-b border-[#222226]/50 last:border-b-0">
                                <span>{k}:</span>
                                <span className="text-white font-bold">{JSON.stringify(v)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="text-[9.5px] font-mono text-zinc-500 flex justify-between items-center mt-1">
                            <span>Evidence: {prof.metadata?.evidenceSummary}</span>
                            <span className="text-[#5ed29c] font-bold">Confidence: {(prof.metadata?.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

          </main>

        </div>
      )}

    </div>
  );
};
