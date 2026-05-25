import React, { useState, useEffect } from 'react';
import {
  Play,
  Settings,
  Users,
  Brain,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  MousePointer,
  Compass,
  Zap,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

interface SimulationProfile {
  id: string;
  name: string;
  personaType: string;
  traits: {
    navigationConfidence: number;
    explorationPatience: number;
    errorTolerance: number;
    readingDepth: number;
    ctaTrustLevel: number;
    formConfidence: number;
    cognitiveTolerance: number;
    attentionStability: number;
  };
}

interface ExplorationPath {
  id: string;
  isSuccess: boolean;
  totalFrictionScore: number;
  steps: Array<{
    stepIndex: number;
    url: string;
    action: string;
    duration: number;
  }>;
  profile: {
    name: string;
    personaType: string;
  };
}

interface BehavioralDecision {
  id: string;
  stepIndex: number;
  actionType: string;
  targetElement: string;
  decisionReason: string;
  confidenceBefore: number;
  confidenceAfter: number;
  latencyMs: number;
}

interface HesitationSignal {
  id: string;
  stepIndex: number;
  signalType: string;
  targetElement: string | null;
  durationMs: number;
  severity: string;
  description: string;
}

interface FrictionReaction {
  id: string;
  stepIndex: number;
  reactionType: string;
  triggerSource: string;
  intensity: number;
  description: string;
}

interface ConfidenceEvent {
  id: string;
  stepIndex: number;
  confidenceValue: number;
  contextualDetails: string;
}

interface ReplayEvent {
  id: string;
  stepIndex: number;
  eventType: string;
  coordinates: { x: number; y: number } | null;
  targetSelector: string | null;
  durationMs: number;
}

interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
}

export const SimulationConsole: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Simulation parameters
  const [selectedPersona, setSelectedPersona] = useState<string>('BEGINNER');
  const [targetUrl, setTargetUrl] = useState<string>('https://sandbox.fricta.ai/checkout');
  const [goalDescription, setGoalDescription] = useState<string>('Complete the checkout registration form and submit');

  // Loaded states
  const [profiles, setProfiles] = useState<SimulationProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [paths, setPaths] = useState<ExplorationPath[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Detailed simulation states (linked to selectedSessionId)
  const [decisions, setDecisions] = useState<BehavioralDecision[]>([]);
  const [signals, setSignals] = useState<HesitationSignal[]>([]);
  const [reactions, setReactions] = useState<FrictionReaction[]>([]);
  const [confidenceEvents, setConfidenceEvents] = useState<ConfidenceEvent[]>([]);
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);

  // Simulation Running State
  const [running, setRunning] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [liveIntent, setLiveIntent] = useState<string>('BROWSE_NAVIGATION');
  const [liveConfidence, setLiveConfidence] = useState<number>(0.5);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const baseApiUrl = 'http://127.0.0.1:3001/api';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectSimulationDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionBehaviorDetails(selectedSessionId);
    }
  }, [selectedSessionId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${baseApiUrl}/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to simulation api');
      setLoading(false);
    }
  };

  const fetchProjectSimulationDetails = async (projectId: string) => {
    try {
      const [profilesRes, pathsRes] = await Promise.all([
        fetch(`${baseApiUrl}/simulation/personas?projectId=${projectId}`),
        fetch(`${baseApiUrl}/simulation/exploration?projectId=${projectId}`)
      ]);

      const profData = await profilesRes.json();
      const pathData = await pathsRes.json();

      setProfiles(profData.profiles || []);
      setPaths(pathData.paths || []);

      if (profData.profiles && profData.profiles.length > 0) {
        setSelectedProfileId(profData.profiles[0].id);
      }
      if (pathData.paths && pathData.paths.length > 0) {
        setSelectedSessionId(pathData.paths[0].workflowSessionId || '');
      }
    } catch (err: any) {
      console.error('Failed to load project simulation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionBehaviorDetails = async (sessionId: string) => {
    try {
      const [behaviorRes, replayRes] = await Promise.all([
        fetch(`${baseApiUrl}/simulation/behavior?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/simulation/replay?sessionId=${sessionId}`)
      ]);

      const behaviorData = await behaviorRes.json();
      const replayData = await replayRes.json();

      setDecisions(behaviorData.decisions || []);
      setSignals(behaviorData.signals || []);
      setReactions(behaviorData.reactions || []);
      setConfidenceEvents(behaviorData.confidenceEvents || []);
      setReplayEvents(replayData.events || []);

      if (behaviorData.confidenceEvents && behaviorData.confidenceEvents.length > 0) {
        setLiveConfidence(behaviorData.confidenceEvents[behaviorData.confidenceEvents.length - 1].confidenceValue);
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    try {
      setRunning(true);
      setError(null);
      setActiveStep(-1);
      setLiveIntent('BROWSE_NAVIGATION');
      
      const res = await fetch(`${baseApiUrl}/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          personaType: selectedPersona,
          startUrl: targetUrl,
          goal: goalDescription
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to execute simulation');
      }

      const data = await res.json();
      
      // Connect to Real-time SSE Stream to listen for organic updates
      setupSimulationSSE(data.sessionId);
    } catch (err: any) {
      setError(err.message || 'Error executing autonomous simulation');
      setRunning(false);
    }
  };

  const setupSimulationSSE = (sessionId: string) => {
    const sseUrl = `${baseApiUrl}/simulation/stream/${sessionId}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('replay.updated', (e: any) => {
      const payload = JSON.parse(e.data);
      setActiveStep(payload.stepIndex);
      setLiveIntent(payload.intent);
      setLiveConfidence(payload.confidence);
    });

    eventSource.addEventListener('system.connected', () => {
      console.log('SSE connected for simulation session:', sessionId);
    });

    // Close when simulation completes
    setTimeout(() => {
      eventSource.close();
      setRunning(false);
      fetchProjectSimulationDetails(selectedProjectId);
      setSelectedSessionId(sessionId);
    }, 7000);
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/10 border-red-500/20';
      case 'MEDIUM':
        return 'text-orange-400 bg-orange-950/10 border-orange-500/20';
      default:
        return 'text-[#5ed29c] bg-[#5ed29c]/5 border-[#5ed29c]/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#070b0a] text-zinc-100 p-6 select-none font-sans">
      
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#222226] pb-5 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5ed29c]/5 border border-[#5ed29c]/20 flex items-center justify-center">
            <Compass className="w-4 h-4 text-[#5ed29c]" />
          </div>
          <div>
            <h1 className="text-sm font-black font-mono text-white uppercase tracking-widest">
              AUTONOMOUS UX SIMULATION CONSOLE
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">EXPLAINABLE SYNTHETIC BEHAVIOR RUNNER</p>
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
        </div>
      </header>

      {error && (
        <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black font-mono text-red-400 uppercase">Operational Error</h4>
            <p className="text-xs text-zinc-400 mt-1 font-sans">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ── Left Sidebar Configuration Rail ───────────────────────────────── */}
        <aside className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Controller Form */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
            <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#5ed29c]" /> Simulation Parameters
            </h3>
            
            <form onSubmit={handleStartSimulation} className="flex flex-col gap-4 font-mono text-xs">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black block mb-1">Target Website URL</label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black block mb-1">Persona Archetype</label>
                <select
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="BEGINNER">Beginner (Hesitant, Reads Detail)</option>
                  <option value="POWER_USER">Power User (Fast Paced, Scans)</option>
                  <option value="FIRST_TIME_USER">First-Time User (Moderate Patience)</option>
                  <option value="DISTRACTED_USER">Distracted User (Skims, Drifts)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black block mb-1">Goal Description</label>
                <textarea
                  rows={2}
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={running || !selectedProjectId}
                className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {running ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    SIMULATING...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    TRIGGER SIMULATION
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Persona Traits Panel */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
            <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#5ed29c]" /> Active Archetype Coefficient
            </h3>
            
            {(() => {
              const activeTraits = profiles.find((p) => p.id === selectedProfileId)?.traits || {
                navigationConfidence: 0.5,
                explorationPatience: 0.6,
                errorTolerance: 0.5,
                readingDepth: 0.6,
                ctaTrustLevel: 0.6,
                formConfidence: 0.5,
                cognitiveTolerance: 0.6,
                attentionStability: 0.7,
              };

              return (
                <div className="flex flex-col gap-3 font-mono text-[10px]">
                  {[
                    { label: 'Nav Confidence', value: activeTraits.navigationConfidence },
                    { label: 'Exploration Patience', value: activeTraits.explorationPatience },
                    { label: 'Reading Depth', value: activeTraits.readingDepth },
                    { label: 'CTA Trust Level', value: activeTraits.ctaTrustLevel },
                    { label: 'Attention Stability', value: activeTraits.attentionStability },
                  ].map((trait) => (
                    <div key={trait.label} className="flex justify-between items-center">
                      <span className="text-zinc-500 uppercase">{trait.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 bg-[#1c1c1f] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5ed29c]"
                            style={{ width: `${trait.value * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">{(trait.value * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </aside>

        {/* ── Main Dashboard Panel Canvas ───────────────────────────────────── */}
        <main className="lg:col-span-3 min-w-0 flex flex-col gap-6">
          
          {/* Live Simulation Monitor */}
          {running && (
            <div className="bg-[#121214] border border-[#5ed29c]/20 p-5 rounded-xl flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-[#5ed29c] animate-ping shrink-0" />
                <div>
                  <h4 className="text-xs font-black font-mono text-white uppercase">LIVE BEHAVIOR SIMULATOR IN PROGRESS</h4>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                    Intent: <b className="text-white">{liveIntent}</b> • Step Index: <b className="text-white">#{activeStep + 1}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-500">Live Confidence:</span>
                <span className="text-[#5ed29c] font-black">{(liveConfidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Historical exploration paths */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider">
                  Simulation Paths History
                </h3>
                <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Select a run session to load decision details</p>
              </div>

              {paths.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#070b0a] border border-[#222226] px-2.5 py-1.5 rounded-lg">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Run Session:</span>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-mono font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {paths.map((p, idx) => (
                      <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                        Run {paths.length - idx} ({p.profile.personaType}) - {p.isSuccess ? 'Success' : 'Aborted'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {paths.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 font-mono text-xs border border-dashed border-[#222226] rounded-xl">
                No simulated paths run yet. Trigger a simulation to start.
              </div>
            ) : (
              <div className="flex flex-col gap-2 border border-[#222226] rounded-xl overflow-hidden divide-y divide-[#222226]">
                {paths.slice(0, 3).map((path, idx) => (
                  <div
                    key={path.id}
                    onClick={() => setSelectedSessionId(path.id)}
                    className={`p-3.5 font-mono text-xs flex items-center justify-between gap-4 cursor-pointer transition-all ${
                      selectedSessionId === path.id ? 'bg-[#1c1c1f]' : 'bg-[#18181b]/55 hover:bg-[#1c1c1f]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Compass className="w-4 h-4 text-zinc-500" />
                      <div>
                        <p className="text-zinc-300 font-bold">Exploration Path #{path.id.substring(0, 8)}</p>
                        <p className="text-[9.5px] text-zinc-500 uppercase mt-0.5">
                          Persona: {path.profile.personaType} • Steps count: {path.steps.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded border ${
                        path.isSuccess ? 'text-[#5ed29c] border-[#5ed29c]/20 bg-[#5ed29c]/5' : 'text-red-400 border-red-500/20 bg-red-500/5'
                      }`}>
                        {path.isSuccess ? 'SUCCESS' : 'ABORTED'}
                      </span>
                      <span className="text-zinc-500">Friction Score: {(path.totalFrictionScore * 100).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Live Visualizer Replay Overlay Map */}
            <div className="md:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <MousePointer className="w-4 h-4 text-[#5ed29c]" /> Behavioral Replay & Cursor Trails
              </h3>

              {/* Mock Screen Overlay with cursor trail */}
              <div className="w-full aspect-[4/3] bg-[#0c0d10] border border-[#222226] rounded-xl relative overflow-hidden flex flex-col p-6 font-mono text-[11px] text-zinc-500 select-none">
                <div className="absolute top-2 left-3 text-[9px] uppercase tracking-wider text-zinc-600">Simulated UI Viewport</div>
                
                {/* Form fields */}
                <div className="flex flex-col gap-3 mt-8 max-w-xs mx-auto w-full">
                  <div>
                    <label className="block text-[8.5px] uppercase mb-1">Email Address</label>
                    <div className="w-full bg-[#18181b] border border-[#2d2d30] px-3 py-2 rounded-lg text-zinc-400">
                      {selectedSessionId ? 'user@fricta.ai' : ''}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8.5px] uppercase mb-1">Password</label>
                    <div className="w-full bg-[#18181b] border border-[#2d2d30] px-3 py-2 rounded-lg text-zinc-600">
                      ••••••••••••
                    </div>
                  </div>
                  <button
                    className="w-full mt-4 bg-[#5ed29c]/10 border border-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-lg"
                    disabled
                  >
                    Submit Checkout
                  </button>
                </div>

                {/* SVG Overlay representing cursor path */}
                {replayEvents.length > 0 && (() => {
                  const points = replayEvents
                    .filter((e) => e.coordinates)
                    .map((e) => e.coordinates as { x: number; y: number });
                  
                  if (points.length === 0) return null;

                  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                      {/* Trail path */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#5ed29c"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="opacity-60"
                      />
                      
                      {/* Interactive nodes */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="#5ed29c"
                            className="opacity-80"
                          />
                          {idx === points.length - 1 && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="8"
                              fill="none"
                              stroke="#5ed29c"
                              strokeWidth="1"
                              className="animate-ping"
                            />
                          )}
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Live Navigation Confidence Graph */}
            <div className="md:col-span-1 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#5ed29c]" /> Confidence Curve
              </h3>

              {confidenceEvents.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-mono text-xs italic">
                  Confidence tracker idle.
                </div>
              ) : (() => {
                const chartLeft = 30;
                const chartTop = 15;
                const chartWidth = 140;
                const chartHeight = 110;

                const points = confidenceEvents.map((e, idx) => {
                  const x = confidenceEvents.length > 1
                    ? chartLeft + (idx / (confidenceEvents.length - 1)) * chartWidth
                    : chartLeft + chartWidth / 2;
                  const y = chartTop + (1 - e.confidenceValue) * chartHeight;
                  return { x, y };
                });

                // Smooth Bezier path calculation
                const getBezierPath = (pts: typeof points) => {
                  if (pts.length === 0) return '';
                  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                  
                  let path = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i];
                    const p1 = pts[i + 1];
                    const cp1x = p0.x + (p1.x - p0.x) / 3;
                    const cp1y = p0.y;
                    const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                    const cp2y = p1.y;
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                  }
                  return path;
                };

                const linePath = getBezierPath(points);

                return (
                  <div className="w-full h-40 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 140">
                      {/* Grid lines */}
                      {[0.25, 0.5, 0.75, 1.0].map((val) => {
                        const yVal = chartTop + (1 - val) * chartHeight;
                        return (
                          <line
                            key={val}
                            x1={chartLeft}
                            y1={yVal}
                            x2={chartLeft + chartWidth}
                            y2={yVal}
                            stroke="#222226"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Bezier Path */}
                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#5ed29c"
                          strokeWidth="2"
                        />
                      )}

                      {/* X Axis */}
                      <line
                        x1={chartLeft}
                        y1={chartTop + chartHeight}
                        x2={chartLeft + chartWidth}
                        y2={chartTop + chartHeight}
                        stroke="#222226"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Cognitive Friction timeline & reactions */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
            <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#5ed29c]" /> Cognitive Hesitation & Reactions Timeline
            </h3>

            {signals.length === 0 && reactions.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 font-mono text-xs italic">
                No hesitation alerts or friction reactions recorded.
              </div>
            ) : (
              <div className="flex flex-col gap-3 font-mono text-xs">
                {signals.map((sig) => (
                  <div key={sig.id} className="p-3 bg-[#18181b]/55 border border-[#2d2d30] rounded-xl flex items-start gap-3 justify-between">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white font-bold">{sig.description}</p>
                        <span className="text-[9.5px] text-zinc-500 uppercase mt-0.5 block">
                          Element: {sig.targetElement || 'Window Frame'} • duration: {sig.durationMs}ms
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${getSeverityColor(sig.severity)}`}>
                      {sig.severity}
                    </span>
                  </div>
                ))}

                {reactions.map((react) => (
                  <div key={react.id} className="p-3 bg-red-950/5 border border-red-500/10 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-bold">Friction: {react.reactionType}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{react.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>

    </div>
  );
};
