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

const getSvgPathForSeries = (data: any[], key: string, w: number, h: number, pad: number) => {
  if (!data || data.length === 0) return { path: '', areaPath: '', points: [] };
  
  const points = data.map((item, idx) => {
    const val = item[key] !== undefined ? Number(item[key]) : 0;
    const x = pad + (data.length > 1 ? (idx / (data.length - 1)) * (w - pad * 2) : (w - pad * 2) / 2);
    const y = h - pad - val * (h - pad * 2);
    return { x, y, val };
  });

  if (points.length === 1) {
    return {
      path: `M ${points[0].x} ${points[0].y}`,
      areaPath: `M ${points[0].x} ${points[0].y} L ${points[0].x} ${h - pad} Z`,
      points
    };
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 3;
    const cp1y = p0.y;
    const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
    const cp2y = p1.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  const areaPath = `${path} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;
  return { path, areaPath, points };
};

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
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'explorer' | 'cognition'>('explorer');

  // Cognition states
  const [cognitiveStates, setCognitiveStates] = useState<any[]>([]);
  const [cognitiveConfidences, setCognitiveConfidences] = useState<any[]>([]);
  const [attentionEvents, setAttentionEvents] = useState<any[]>([]);
  const [expectationMismatches, setExpectationMismatches] = useState<any[]>([]);
  const [abandonmentSignals, setAbandonmentSignals] = useState<any[]>([]);
  const [decisionComplexities, setDecisionComplexities] = useState<any[]>([]);
  const [cognitiveTimeline, setCognitiveTimeline] = useState<any[]>([]);

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
      const [
        behaviorRes,
        replayRes,
        loadRes,
        confRes,
        attRes,
        expRes,
        abaRes,
        decRes,
        timeRes
      ] = await Promise.all([
        fetch(`${baseApiUrl}/simulation/behavior?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/simulation/replay?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/load?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/confidence?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/attention?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/expectation?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/abandonment?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/decisioning?sessionId=${sessionId}`),
        fetch(`${baseApiUrl}/cognition/timeline?sessionId=${sessionId}`)
      ]);

      const behaviorData = await behaviorRes.json();
      const replayData = await replayRes.json();
      const loadData = await loadRes.json();
      const confData = await confRes.json();
      const attData = await attRes.json();
      const expData = await expRes.json();
      const abaData = await abaRes.json();
      const decData = await decRes.json();
      const timeData = await timeRes.json();

      setDecisions(behaviorData.decisions || []);
      setSignals(behaviorData.signals || []);
      setReactions(behaviorData.reactions || []);
      setConfidenceEvents(behaviorData.confidenceEvents || []);
      setReplayEvents(replayData.events || []);

      setCognitiveStates(loadData.states || []);
      setCognitiveConfidences(confData.signals || []);
      setAttentionEvents(attData.events || []);
      setExpectationMismatches(expData.mismatches || []);
      setAbandonmentSignals(abaData.signals || []);
      setDecisionComplexities(decData.events || []);
      setCognitiveTimeline(timeData.events || []);

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
      
      // Clear previous simulation run states to prevent visual bleed-through
      setDecisions([]);
      setSignals([]);
      setReactions([]);
      setConfidenceEvents([]);
      setReplayEvents([]);
      setCognitiveStates([]);
      setCognitiveConfidences([]);
      setAttentionEvents([]);
      setExpectationMismatches([]);
      setAbandonmentSignals([]);
      setDecisionComplexities([]);
      setCognitiveTimeline([]);
      
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

      // Append coordinates for real-time cursor tracking
      if (payload.coordinates) {
        setReplayEvents((prev) => {
          if (prev.some((ev) => ev.stepIndex === payload.stepIndex)) return prev;
          return [
            ...prev,
            {
              id: `live-${payload.stepIndex}`,
              stepIndex: payload.stepIndex,
              eventType: payload.action.type,
              coordinates: payload.coordinates,
              targetSelector: payload.action.target,
              durationMs: 1000,
            }
          ];
        });
      }

      // Append confidence events for real-time graph rendering
      setConfidenceEvents((prev) => {
        if (prev.some((ev) => ev.stepIndex === payload.stepIndex)) return prev;
        return [
          ...prev,
          {
            id: `live-conf-${payload.stepIndex}`,
            stepIndex: payload.stepIndex,
            confidenceValue: payload.confidence,
            contextualDetails: `Step ${payload.stepIndex} complete. Intent: ${payload.intent}.`,
          }
        ];
      });
    });

    eventSource.addEventListener('cognition.updated', (e: any) => {
      const payload = JSON.parse(e.data);
      
      setCognitiveStates((prev) => {
        if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
        return [...prev, {
          id: `live-state-${payload.stepIndex}`,
          stepIndex: payload.stepIndex,
          cognitiveLoad: payload.cognitiveLoad,
          mentalEffort: payload.mentalEffort,
          informationLoad: payload.cognitiveLoad * 0.9,
          interactionLoad: payload.mentalEffort * 0.8,
          description: payload.mentalEffort > 0.65 ? 'Critical load spike.' : 'Standard threshold.'
        }];
      });

      setCognitiveConfidences((prev) => {
        if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
        return [...prev, {
          id: `live-conf-${payload.stepIndex}`,
          stepIndex: payload.stepIndex,
          confidenceScore: payload.confidenceScore,
          certaintyLevel: payload.certaintyLevel,
          description: 'Telemetry update.'
        }];
      });

      setAttentionEvents((prev) => {
        if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
        return [...prev, {
          id: `live-att-${payload.stepIndex}`,
          stepIndex: payload.stepIndex,
          visibilityWeight: payload.visibilityWeight,
          focusHeat: payload.focusHeat,
          description: 'Attention updated.'
        }];
      });

      if (payload.expectationMismatch) {
        setExpectationMismatches((prev) => {
          if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
          return [...prev, {
            id: `live-exp-${payload.stepIndex}`,
            stepIndex: payload.stepIndex,
            expectedAction: payload.expectationMismatch.expectedAction || 'Standard placement',
            actualAction: payload.expectationMismatch.actualAction || 'Misplaced target',
            mismatchCategory: payload.expectationMismatch.category,
            mismatchSeverity: payload.expectationMismatch.severity,
            description: payload.expectationMismatch.description
          }];
        });
      }

      setAbandonmentSignals((prev) => {
        if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
        return [...prev, {
          id: `live-aba-${payload.stepIndex}`,
          stepIndex: payload.stepIndex,
          riskProbability: payload.riskProbability,
          triggerSource: payload.triggerSource,
          description: 'Abandonment updated.'
        }];
      });

      setDecisionComplexities((prev) => {
        if (prev.some(ev => ev.stepIndex === payload.stepIndex)) return prev;
        return [...prev, {
          id: `live-dec-${payload.stepIndex}`,
          stepIndex: payload.stepIndex,
          choiceCount: payload.choiceCount,
          ambiguityScore: 0.4,
          complexityLevel: 'MEDIUM',
          description: 'Ambiguity analysis.'
        }];
      });
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
    <div className="min-h-screen bg-[#070b0a] text-zinc-100 p-6 select-none font-sans overflow-x-hidden max-w-full">
      
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

      {showGuide && (
        <div className="bg-gradient-to-r from-zinc-900 via-[#0a100d] to-[#0c1410] border border-[#222226] p-5 rounded-2xl mb-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5ed29c]" />
              <h2 className="text-xs font-black font-mono text-white uppercase tracking-wider">
                System Guide: What is Autonomous UX Simulation?
              </h2>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-[10px] font-mono text-zinc-500 hover:text-[#5ed29c] uppercase tracking-widest transition-colors focus:outline-none"
            >
              [ Dismiss Guide ]
            </button>
          </div>

          <p className="text-xs text-zinc-400 max-w-4xl leading-relaxed mb-4">
            The Autonomous UX Simulation Engine acts as a **behavioral augmentation layer**. Rather than running simple, rigid test scripts, it generates **synthetic user agents** driven by custom cognitive weights (confidence, reading stability, focus, and patience). It tests your live forms, navigation steps, and interfaces to detect cognitive barriers and friction points before shipping code to real customers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-[#222226]">
            <div className="bg-[#121214]/60 border border-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-3.5 h-3.5 text-[#5ed29c]" />
                <h4 className="text-[10px] font-bold font-mono text-white uppercase">1. Choose Persona</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Select an archetype. <b>Beginners</b> hesitate often and read carefully; <b>Power Users</b> scan layouts quickly and abort if delayed. Watch the <i>Active Archetype Coefficient</i> panel adjust dynamically.
              </p>
            </div>

            <div className="bg-[#121214]/60 border border-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <MousePointer className="w-3.5 h-3.5 text-[#5ed29c]" />
                <h4 className="text-[10px] font-bold font-mono text-white uppercase">2. Viewport Cursor</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                The simulated UI viewport charts coordinates and mouse paths. Jagged paths, loops, or circular coordinates indicate the agent is visual-scanning or looking for a misplaced call-to-action.
              </p>
            </div>

            <div className="bg-[#121214]/60 border border-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#5ed29c]" />
                <h4 className="text-[10px] font-bold font-mono text-white uppercase">3. Live Confidence</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                The <i>Confidence Curve</i> monitors user ease. Successful interactions boost confidence; validation errors, poor contrast, or clutter deplete it. A steep drop warning predicts abandonment.
              </p>
            </div>

            <div className="bg-[#121214]/60 border border-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <h4 className="text-[10px] font-bold font-mono text-white uppercase">4. Usability Friction</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Review simulated timeline highlights. Filter hesitation durations (like form validation doubt) and friction triggers to optimize layouts, reduce steps, and improve conversion metrics.
              </p>
            </div>
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
                    className={`p-3.5 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${
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

                    <div className="flex items-center gap-3 font-mono text-[10px] shrink-0">
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

          {/* Tab selectors control panel */}
          <div className="bg-[#121214] border border-[#222226] p-4 rounded-2xl mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto">
              <div className="w-9 h-9 rounded-xl bg-[#5ed29c]/5 border border-[#5ed29c]/15 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider truncate">
                  SELECT CONSOLE DISPLAY MODE
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono leading-normal">Switch between visual exploration and deep cognitive analytics telemetry</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row bg-[#070b0a] border border-[#222226] p-1.5 rounded-xl gap-2 w-full lg:w-auto shrink-0 shadow-inner">
              <button
                onClick={() => setActiveTab('explorer')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black font-mono tracking-wider uppercase transition-all duration-300 w-full sm:w-auto focus:outline-none ${
                  activeTab === 'explorer'
                    ? 'bg-[#5ed29c] text-[#070b0a] shadow-[0_0_20px_rgba(94,210,156,0.25)] border border-[#5ed29c]'
                    : 'text-zinc-400 hover:text-white border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                1. Explorer View
              </button>
              <button
                onClick={() => setActiveTab('cognition')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black font-mono tracking-wider uppercase transition-all duration-300 w-full sm:w-auto focus:outline-none ${
                  activeTab === 'cognition'
                    ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)] border border-purple-500'
                    : 'text-zinc-400 hover:text-white border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <Brain className="w-4 h-4 shrink-0" />
                2. Cognitive Analytics
              </button>
            </div>
          </div>

          {activeTab === 'explorer' ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Live Visualizer Replay Overlay Map */}
                <div className="md:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                      <MousePointer className="w-4 h-4 text-[#5ed29c]" /> Behavioral Replay & Cursor Trails
                    </h3>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5ed29c]" /> COORD SCANNING ENABLED
                    </div>
                  </div>

                  {/* Mock Screen Overlay with cursor trail - responsive with no horizontal scroll */}
                  <div className="w-full flex items-center justify-center p-3.5 bg-[#08080a] border border-[#222226] rounded-xl overflow-hidden">
                    <div 
                      className="w-full aspect-[27/14] bg-[#0b0c0e] rounded-lg border border-white/[0.04] relative overflow-hidden"
                      style={{
                        background: 'radial-gradient(circle at top left, rgba(94, 210, 156, 0.02), transparent 50%), #0b0c0e'
                      }}
                    >
                      <style>{`
                        @keyframes dash {
                          to {
                            stroke-dashoffset: -20;
                          }
                        }
                      `}</style>

                      {/* Browser top tab bar */}
                      <div className="h-7 bg-[#121214] border-b border-white/[0.04] flex items-center px-3 gap-2 justify-between select-none">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#5ed29c]/40" />
                        </div>
                        {/* URL bar */}
                        <div className="w-72 h-4.5 bg-[#1c1c1f] rounded text-[8px] font-mono text-zinc-500 flex items-center px-2 truncate border border-white/[0.01]">
                          {targetUrl}
                        </div>
                        <div className="w-8 shrink-0" />
                      </div>

                      {(() => {
                        const getActiveLayout = (url: string) => {
                          const normalized = url.toLowerCase();
                          if (normalized.includes('login')) return 'login';
                          if (normalized.includes('pricing') || normalized.includes('plan')) return 'pricing';
                          if (normalized.includes('checkout') || normalized.includes('cart')) return 'checkout';
                          return 'landing';
                        };

                        const layout = getActiveLayout(targetUrl);

                        return (
                          <div className="absolute inset-0 top-7 pointer-events-none select-none">
                            {/* Simulated website frame header */}
                            <div 
                              className="absolute bg-white/[0.01] border-b border-white/[0.03] px-3 py-1.5 flex items-center justify-between"
                              style={{ left: '0px', top: '0px', width: '100%', height: '35px' }}
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-[#5ed29c]/10 border border-[#5ed29c]/30 flex items-center justify-center">
                                  <Compass className="w-1.5 h-1.5 text-[#5ed29c]" />
                                </div>
                                <span className="text-[7.5px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                                  {layout === 'login' && 'Identity Secure Access Portal'}
                                  {layout === 'pricing' && 'Pricing Tiers Selector'}
                                  {layout === 'checkout' && 'Secure Billing Gateway'}
                                  {layout === 'landing' && 'SaaS Platform Home'}
                                </span>
                              </div>
                              <span className="text-[7px] font-mono text-zinc-600">COORDINATE MONITOR LAYER</span>
                            </div>

                            {layout === 'login' && (
                              <>
                                {/* Username Input (left: 12%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-[#5ed29c]/15 hover:border-[#5ed29c]/40 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.06)]"
                                  style={{ left: '12%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Username</span>
                                  <div className="bg-[#18181b]/80 border border-white/[0.04] rounded-lg h-7 flex items-center px-2 text-[10px] text-[#5ed29c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] overflow-hidden truncate">
                                    {selectedSessionId || running ? 'admin@domain.com' : ''}
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[input#username]</span>
                                </div>

                                {/* Password Input (left: 32%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-[#5ed29c]/15 hover:border-[#5ed29c]/40 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.06)]"
                                  style={{ left: '32%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Password</span>
                                  <div className="bg-[#18181b]/80 border border-white/[0.04] rounded-lg h-7 flex items-center px-2 text-[10px] text-zinc-600 overflow-hidden">
                                    ••••••••
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[input#password]</span>
                                </div>

                                {/* Forgot Password Link (left: 52%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/35 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,255,255,0.02)]"
                                  style={{ left: '52%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Recovery</span>
                                  <span className="text-[11px] text-[#5ed29c] font-black underline cursor-pointer hover:text-emerald-300 transition-colors">Reset Pass</span>
                                  <span className="text-[7.5px] text-zinc-500 uppercase font-mono tracking-wider">[link#forgot]</span>
                                </div>

                                {/* Log In Button (left: 72%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#163527]/90 to-[#0b1b14]/95 border border-[#5ed29c]/30 hover:border-[#5ed29c]/60 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.12)]"
                                  style={{ left: '72%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[9px] font-black text-white tracking-widest uppercase">Sign In</span>
                                  <div className="flex items-center justify-center py-1">
                                    <MousePointer className="w-4 h-4 text-[#5ed29c] animate-pulse" />
                                  </div>
                                  <span className="text-[7.5px] text-[#5ed29c]/70 font-mono tracking-wider">[btn#submit]</span>
                                </div>
                              </>
                            )}

                            {layout === 'pricing' && (
                              <>
                                {/* Starter Card Description (left: 12%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1"
                                  style={{ left: '12%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Starter Plan</span>
                                  <span className="text-[13px] font-black text-[#5ed29c]">$19<span className="text-[8.5px] text-zinc-500 font-normal">/mo</span></span>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[card#starter]</span>
                                </div>

                                {/* Select Starter CTA (left: 32%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#163527]/90 to-[#0b1b14]/95 border border-[#5ed29c]/30 hover:border-[#5ed29c]/60 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.06)] transition-all duration-300 hover:-translate-y-1"
                                  style={{ left: '32%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[9px] font-black text-white tracking-widest uppercase">Select Starter</span>
                                  <span className="text-[10.5px] font-bold text-[#5ed29c] uppercase">Get Started</span>
                                  <span className="text-[7.5px] text-[#5ed29c]/60 font-mono tracking-wider">[btn#select-starter]</span>
                                </div>

                                {/* Pro Card Description (left: 52%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#1c1228]/90 to-[#0e0915]/95 border border-purple-500/20 hover:border-purple-400/50 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(168,85,247,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(168,85,247,0.1)]"
                                  style={{ left: '52%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[8px] uppercase tracking-widest text-purple-300 font-bold">Pro Plan</span>
                                    <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                  </div>
                                  <span className="text-[13px] font-black text-purple-400">$49<span className="text-[8.5px] text-zinc-500 font-normal">/mo</span></span>
                                  <span className="text-[7.5px] text-purple-400/70 font-mono tracking-wider">[card#pro]</span>
                                </div>

                                {/* Select Pro CTA (left: 72%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#2a133d]/90 to-[#12071d]/95 border border-purple-500/30 hover:border-purple-400/60 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(168,85,247,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(168,85,247,0.14)]"
                                  style={{ left: '72%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[9.5px] font-black text-purple-200 uppercase tracking-widest">Select Pro</span>
                                  <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">Try Pro Free</span>
                                  <span className="text-[7.5px] text-purple-400/60 font-mono tracking-wider">[btn#select-pro]</span>
                                </div>
                              </>
                            )}

                            {layout === 'checkout' && (
                              <>
                                {/* Email Field (left: 12%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-[#5ed29c]/15 hover:border-[#5ed29c]/40 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.06)]"
                                  style={{ left: '12%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Email Address</span>
                                  <div className="bg-[#18181b]/80 border border-white/[0.04] rounded-lg h-7 flex items-center px-2 text-[10px] text-[#5ed29c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] overflow-hidden truncate">
                                    {selectedSessionId || running ? 'user@fricta.ai' : ''}
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[input#email]</span>
                                </div>

                                {/* Password Field (left: 32%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-[#5ed29c]/15 hover:border-[#5ed29c]/40 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.06)]"
                                  style={{ left: '32%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Password</span>
                                  <div className="bg-[#18181b]/80 border border-white/[0.04] rounded-lg h-7 flex items-center px-2 text-[10px] text-zinc-600 overflow-hidden">
                                    ••••••••••••
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[input#pass]</span>
                                </div>

                                {/* Help Link (left: 52%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/35 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,255,255,0.02)]"
                                  style={{ left: '52%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Assistance</span>
                                  <span className="text-[11px] text-[#5ed29c] font-black underline cursor-pointer hover:text-emerald-300 transition-colors">Get Help</span>
                                  <span className="text-[7.5px] text-zinc-500 uppercase font-mono tracking-wider">[link#help]</span>
                                </div>

                                {/* Submit Button (left: 72%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#163527]/90 to-[#0b1b14]/95 border border-[#5ed29c]/30 hover:border-[#5ed29c]/60 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(94,210,156,0.12)]"
                                  style={{ left: '72%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[9px] font-black text-white tracking-widest uppercase">Pay Now</span>
                                  <span className="text-[10px] text-[#5ed29c] font-bold tracking-wider">Confirm Billing</span>
                                  <span className="text-[7.5px] text-[#5ed29c]/60 font-mono tracking-wider">[btn#submit]</span>
                                </div>
                              </>
                            )}

                            {layout === 'landing' && (
                              <>
                                {/* Hero copy description (left: 12%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1"
                                  style={{ left: '12%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Hero Copy</span>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[9.5px] font-bold text-white leading-none">Home Hero</span>
                                    <span className="text-[8px] text-zinc-500 leading-normal">Welcome to SaaS</span>
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[section#hero]</span>
                                </div>

                                {/* Get Started CTA (left: 32%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#163527]/90 to-[#0b1b14]/95 border border-[#5ed29c]/30 hover:border-[#5ed29c]/60 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.06)] transition-all duration-300 hover:-translate-y-1"
                                  style={{ left: '32%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[9px] font-black text-white tracking-widest uppercase">Action Call</span>
                                  <span className="text-[10.5px] font-bold text-[#5ed29c] uppercase">Get Started</span>
                                  <span className="text-[7.5px] text-[#5ed29c]/60 font-mono tracking-wider">[cta#get-started]</span>
                                </div>

                                {/* Learn More Link (left: 52%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/35 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,255,255,0.02)]"
                                  style={{ left: '52%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Product Tours</span>
                                  <span className="text-[11px] text-[#5ed29c] font-black underline cursor-pointer hover:text-emerald-300 transition-colors">Learn More</span>
                                  <span className="text-[7.5px] text-zinc-500 uppercase font-mono tracking-wider">[link#explore]</span>
                                </div>

                                {/* Newsletter Input (left: 72%) */}
                                <div 
                                  className="absolute bg-gradient-to-b from-[#121318]/90 to-[#090a0d]/95 border border-white/[0.04] hover:border-[#5ed29c]/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1"
                                  style={{ left: '72%', top: '35%', width: '15%', height: '48%' }}
                                >
                                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Newsletter</span>
                                  <div className="bg-[#18181b]/80 border border-white/[0.04] rounded-lg h-7 flex items-center px-2 text-[10px] text-[#5ed29c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] overflow-hidden truncate">
                                    {selectedSessionId || running ? 'sub@email.com' : ''}
                                  </div>
                                  <span className="text-[7.5px] text-zinc-600 font-mono tracking-wider">[input#news]</span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* SVG Overlay representing cursor path */}
                      {replayEvents.length > 0 && (() => {
                        const points = replayEvents
                          .filter((e) => e.coordinates)
                          .map((e) => e.coordinates as { x: number; y: number });
                        
                        if (points.length === 0) return null;

                        const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                        return (
                          <svg 
                            viewBox="0 0 540 280" 
                            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                          >
                            {/* Trail path with dash-offset animation for visual flow */}
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#5ed29c"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                              style={{ animation: 'dash 2s linear infinite' }}
                              className="opacity-70"
                            />
                            
                            {/* Interactive nodes along the coordinate trail */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="5"
                                  fill="#0b0c0e"
                                  stroke="#5ed29c"
                                  strokeWidth="2"
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 10}
                                  fill="#5ed29c"
                                  fontSize="8"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                  className="font-bold opacity-80"
                                >
                                  S{idx + 1}
                                </text>
                                
                                {/* Pinging circle highlight on the current active step or end-of-path */}
                                {(idx === points.length - 1 || (running && idx === activeStep)) && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="10"
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

                      {/* Live Simulation Running Active Cursor Pointer - responsive coordinates positioning */}
                      {running && activeStep >= 0 && (() => {
                        const currentPoint = replayEvents.find((e) => e.stepIndex === activeStep);
                        if (!currentPoint || !currentPoint.coordinates) return null;
                        
                        // Convert absolute coordinates (W=540, H=280) to percentages for responsive element placement
                        const pctX = (currentPoint.coordinates.x / 540) * 100;
                        const pctY = (currentPoint.coordinates.y / 280) * 100;

                        return (
                          <div 
                            className="absolute w-4 h-4 pointer-events-none transition-all duration-300 ease-out"
                            style={{ 
                              left: `calc(${pctX}% - 8px)`, 
                              top: `calc(${pctY}% - 8px)`,
                              zIndex: 50
                            }}
                          >
                            <div className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5ed29c] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#5ed29c] border border-white flex items-center justify-center shadow-lg">
                                <span className="text-[7.5px] font-bold text-[#0c0d10] font-mono">{activeStep + 1}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
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
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-5 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#5ed29c]" /> Cognitive Hesitation & Reactions Timeline
                </h3>

                {(() => {
                  const unifiedEvents = [
                    ...signals.map((s) => ({ ...s, timelineType: 'signal' as const })),
                    ...reactions.map((r) => ({ ...r, timelineType: 'reaction' as const })),
                  ].sort((a, b) => a.stepIndex - b.stepIndex);

                  if (unifiedEvents.length === 0) {
                    return (
                      <div className="text-center py-8 text-zinc-600 font-mono text-xs italic border border-dashed border-[#222226] rounded-xl">
                        No hesitation alerts or friction reactions recorded.
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-6 border-l border-[#222226] ml-3 flex flex-col gap-6 font-mono text-xs">
                      {unifiedEvents.map((event, idx) => {
                        const isSignal = event.timelineType === 'signal';
                        const key = event.id;
                        const stepNum = event.stepIndex + 1;

                        // Header and Icons
                        let title = '';
                        let badgeColor = '';
                        let badgeText = '';
                        let iconColor = '';
                        let iconBg = '';
                        let borderHighlight = '';

                        if (isSignal) {
                          title = event.signalType.replace(/_/g, ' ');
                          badgeText = `${event.severity} SEVERITY`;
                          badgeColor = getSeverityColor(event.severity);
                          iconColor = 'text-[#5ed29c]';
                          iconBg = 'bg-[#5ed29c]/10 border-[#5ed29c]/20';
                          borderHighlight = 'hover:border-[#5ed29c]/25 border-[#2d2d30]';
                        } else {
                          title = `FRICTION REACTION — ${event.reactionType.replace(/_/g, ' ')}`;
                          badgeText = `INTENSITY ${(event.intensity * 100).toFixed(0)}%`;
                          
                          const intensity = event.intensity;
                          if (intensity > 0.7) {
                            badgeColor = 'text-red-400 bg-red-950/15 border-red-500/20';
                          } else if (intensity > 0.4) {
                            badgeColor = 'text-orange-400 bg-orange-950/15 border-orange-500/20';
                          } else {
                            badgeColor = 'text-yellow-400 bg-yellow-950/15 border-yellow-500/20';
                          }
                          
                          iconColor = 'text-red-400';
                          iconBg = 'bg-red-950/10 border-red-500/20';
                          borderHighlight = 'hover:border-red-500/25 border-red-500/10 bg-red-950/5';
                        }

                        return (
                          <div key={key} className="relative group">
                            {/* Connecting point dot */}
                            <div className={`absolute -left-[31px] top-1.5 w-5.5 h-5.5 rounded-full ${iconBg} border flex items-center justify-center z-10`}>
                              {isSignal ? (
                                <Clock className={`w-3 h-3 ${iconColor}`} />
                              ) : (
                                <AlertTriangle className={`w-3 h-3 ${iconColor}`} />
                              )}
                            </div>

                            {/* Event Card */}
                            <div className={`p-4 rounded-xl border transition-all duration-300 ${borderHighlight} shadow-[0_4px_12px_rgba(0,0,0,0.4)]`}>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase bg-[#1c1c1f] border border-[#2d2d30] px-1.5 py-0.5 rounded">
                                    Step #{stepNum}
                                  </span>
                                  <span className={`text-[10.5px] font-black uppercase tracking-wider ${isSignal ? 'text-zinc-200' : 'text-red-400'}`}>
                                    {title}
                                  </span>
                                </div>
                                <span className={`text-[8.5px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
                                  {badgeText}
                                </span>
                              </div>

                              <p className="text-zinc-300 text-[11px] leading-relaxed mb-3">
                                {event.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-white/[0.03] text-[9.5px]">
                                {isSignal ? (
                                  <>
                                    <span className="text-zinc-500 uppercase">Target Element:</span>
                                    {event.targetElement ? (
                                      <code className="text-[#5ed29c] bg-[#5ed29c]/5 px-1.5 py-0.5 rounded border border-[#5ed29c]/10 text-[9px] font-mono">
                                        {event.targetElement}
                                      </code>
                                    ) : (
                                      <span className="text-zinc-400 font-bold">Viewport Frame</span>
                                    )}
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-500 uppercase">Pacing Delay:</span>
                                    <span className="text-white font-bold">{event.durationMs}ms</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-zinc-500 uppercase">Trigger Source:</span>
                                    <span className="text-white font-bold">{(event as any).triggerSource}</span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-500 uppercase">Intensity:</span>
                                    <span className="text-white font-bold">{(((event as any).intensity || 0) * 100).toFixed(0)}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Top Row: Metric Cards & Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Abandonment Risk Probability Gauge */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Abandonment Risk
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">Predictive exit probability</p>
                  </div>
                  
                  {(() => {
                    const latestRisk = abandonmentSignals[abandonmentSignals.length - 1];
                    const riskVal = latestRisk ? latestRisk.riskProbability : 0;
                    const frictionAccum = latestRisk ? latestRisk.frictionAccumulated : 0;
                    const triggerSource = latestRisk ? latestRisk.triggerSource : 'NO_SIGNAL';
                    
                    const ringColor = riskVal > 0.7 ? 'stroke-red-500' : riskVal > 0.4 ? 'stroke-orange-400' : 'stroke-[#5ed29c]';
                    const textColor = riskVal > 0.7 ? 'text-red-400' : riskVal > 0.4 ? 'text-orange-400' : 'text-[#5ed29c]';
                    const displayTrigger = triggerSource.replace(/_/g, ' ').toLowerCase();
                    
                    return (
                      <div className="flex flex-col xl:flex-row items-center gap-4 mt-4 w-full">
                        <div className="relative w-16 h-16 shrink-0">
                          {/* Circle progress indicator */}
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#1c1c1f" strokeWidth="3" />
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="16" 
                              fill="none" 
                              className={ringColor} 
                              strokeWidth="3" 
                              strokeDasharray={`${riskVal * 100} 100`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className={`text-[10.5px] font-black ${textColor}`}>{(riskVal * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        
                        <div className="font-mono text-[10px] flex flex-col gap-1 min-w-0 w-full">
                          <div className="flex justify-between gap-2 items-center">
                            <span className="text-zinc-500 uppercase shrink-0">Trigger:</span>
                            <span className="text-white font-bold truncate capitalize" title={displayTrigger}>{displayTrigger}</span>
                          </div>
                          <div className="flex justify-between gap-2 items-center">
                            <span className="text-zinc-500 uppercase shrink-0">Friction:</span>
                            <span className="text-white font-bold">{(frictionAccum * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between gap-2 items-center">
                            <span className="text-zinc-500 uppercase shrink-0">Risk:</span>
                            <span className={`font-black ${textColor}`}>
                              {riskVal > 0.7 ? 'CRITICAL' : riskVal > 0.4 ? 'ELEVATED' : 'STABLE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Visual Attention focus heat */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Visual Focus Heat
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">CTA Dominance & Clutter load</p>
                  </div>
                  
                  {(() => {
                    const latestAttention = attentionEvents[attentionEvents.length - 1];
                    const visWeight = latestAttention ? latestAttention.visibilityWeight : 0;
                    const focusHeat = latestAttention ? latestAttention.focusHeat : 0;
                    const isOverload = latestAttention ? latestAttention.overloadDetected : false;
                    
                    return (
                      <div className="flex flex-col gap-2 mt-3 font-mono text-[9.5px] overflow-hidden">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-zinc-500 uppercase truncate">CTA Dominance:</span>
                          <span className="text-white font-bold shrink-0">{(visWeight * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1c1c1f] rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400" style={{ width: `${visWeight * 100}%` }} />
                        </div>
                        
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-zinc-500 uppercase truncate">Focus Heat:</span>
                          <span className="text-white font-bold shrink-0">{(focusHeat * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1c1c1f] rounded-full overflow-hidden">
                          <div className="h-full bg-[#5ed29c]" style={{ width: `${focusHeat * 100}%` }} />
                        </div>

                        <div className="flex justify-between items-center mt-0.5 gap-2">
                          <span className="text-zinc-500 uppercase truncate">Overload Status:</span>
                          <span className={`font-black shrink-0 ${isOverload ? 'text-red-400' : 'text-zinc-400'}`}>
                            {isOverload ? 'OVERLOADED' : 'NOMINAL'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Mental Schema & Conventions */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#5ed29c] shrink-0" /> Schema Convention
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">Conformity to UI expectation</p>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 mt-3 font-mono text-[9.5px] overflow-hidden">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-500 uppercase truncate">Traced Conventions:</span>
                      <span className="text-white font-bold shrink-0">{cognitiveStates.length}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-500 uppercase truncate">Schema Mismatches:</span>
                      <span className={`font-bold shrink-0 ${expectationMismatches.length > 0 ? 'text-orange-400' : 'text-[#5ed29c]'}`}>
                        {expectationMismatches.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-500 uppercase truncate">Schema Health:</span>
                      <span className="text-white font-bold shrink-0">
                        {cognitiveStates.length > 0 
                          ? `${((1 - (expectationMismatches.length / cognitiveStates.length)) * 100).toFixed(0)}%`
                          : '100%'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Middle Row: Area Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cognitive Load Curve */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider">
                        Cognitive Load & Mental Effort
                      </h4>
                      <p className="text-[9.5px] text-zinc-500 font-mono uppercase">Info Density (orange) vs interaction effort (purple)</p>
                    </div>
                    <div className="flex gap-3 text-[9px] font-mono shrink-0">
                      <span className="flex items-center gap-1 text-[#fb923c]"><span className="w-1.5 h-1.5 rounded-full bg-[#fb923c]" /> LOAD</span>
                      <span className="flex items-center gap-1 text-purple-400"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> EFFORT</span>
                    </div>
                  </div>
                  
                  <div className="w-full h-48 bg-[#0b0c0e]/40 border border-zinc-900 rounded-xl overflow-hidden p-2">
                    {(() => {
                      const w = 450;
                      const h = 180;
                      const pad = 35;
                      
                      const loadPaths = getSvgPathForSeries(cognitiveStates, 'cognitiveLoad', w, h, pad);
                      const effortPaths = getSvgPathForSeries(cognitiveStates, 'mentalEffort', w, h, pad);
                      
                      if (cognitiveStates.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-[11px] italic">
                            No load telemetry recorded.
                          </div>
                        );
                      }
                      
                      return (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${w} ${h}`}>
                          <defs>
                            <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="effortGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Grid lines & Y-axis labels */}
                          {[0, 0.25, 0.5, 0.75, 1].map((val) => {
                            const y = h - pad - val * (h - pad * 2);
                            return (
                              <g key={val}>
                                <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#1f1f23" strokeWidth="1" strokeDasharray="2 2" />
                                <text x="5" y={y + 3} fill="#71717a" fontSize="8" fontFamily="monospace" className="font-bold">
                                  {(val * 100).toFixed(0)}%
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* X-axis Step Markers */}
                          {cognitiveStates.length > 0 && cognitiveStates.map((item, idx) => {
                            const x = pad + (cognitiveStates.length > 1 ? (idx / (cognitiveStates.length - 1)) * (w - pad * 2) : (w - pad * 2) / 2);
                            const shouldShow = cognitiveStates.length <= 10 || idx % Math.ceil(cognitiveStates.length / 10) === 0;
                            if (!shouldShow) return null;
                            return (
                              <text key={idx} x={x} y={h - 10} fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle" className="font-bold">
                                S{idx + 1}
                              </text>
                            );
                          })}
                          
                          {/* Area paths */}
                          {loadPaths.areaPath && <path d={loadPaths.areaPath} fill="url(#loadGrad)" />}
                          {effortPaths.areaPath && <path d={effortPaths.areaPath} fill="url(#effortGrad)" />}
                          
                          {/* Stroke paths */}
                          {loadPaths.path && <path d={loadPaths.path} fill="none" stroke="#fb923c" strokeWidth="2" />}
                          {effortPaths.path && <path d={effortPaths.path} fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 2" />}
                          
                          {/* Points */}
                          {loadPaths.points.map((p, idx) => (
                            <circle key={`l-${idx}`} cx={p.x} cy={p.y} r="3" fill="#fb923c" stroke="#121214" strokeWidth="1" />
                          ))}
                          {effortPaths.points.map((p, idx) => (
                            <circle key={`e-${idx}`} cx={p.x} cy={p.y} r="2.5" fill="#c084fc" stroke="#121214" strokeWidth="1" />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>

                {/* Confidence & Certainty Curve */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider">
                        Decision Certainty Timeline
                      </h4>
                      <p className="text-[9.5px] text-zinc-500 font-mono uppercase">Evolution of agent confidence & certainty level</p>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-mono text-[#5ed29c] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5ed29c]" /> CONFIDENCE SCORE
                    </span>
                  </div>
                  
                  <div className="w-full h-48 bg-[#0b0c0e]/40 border border-zinc-900 rounded-xl overflow-hidden p-2">
                    {(() => {
                      const w = 450;
                      const h = 180;
                      const pad = 35;
                      
                      const confPaths = getSvgPathForSeries(cognitiveConfidences, 'confidenceScore', w, h, pad);
                      
                      if (cognitiveConfidences.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-[11px] italic">
                            No confidence telemetry recorded.
                          </div>
                        );
                      }
                      
                      return (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${w} ${h}`}>
                          <defs>
                            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#5ed29c" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Grid lines & Y-axis labels */}
                          {[0, 0.25, 0.5, 0.75, 1].map((val) => {
                            const y = h - pad - val * (h - pad * 2);
                            return (
                              <g key={val}>
                                <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#1f1f23" strokeWidth="1" strokeDasharray="2 2" />
                                <text x="5" y={y + 3} fill="#71717a" fontSize="8" fontFamily="monospace" className="font-bold">
                                  {(val * 100).toFixed(0)}%
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* X-axis Step Markers */}
                          {cognitiveConfidences.length > 0 && cognitiveConfidences.map((item, idx) => {
                            const x = pad + (cognitiveConfidences.length > 1 ? (idx / (cognitiveConfidences.length - 1)) * (w - pad * 2) : (w - pad * 2) / 2);
                            const shouldShow = cognitiveConfidences.length <= 10 || idx % Math.ceil(cognitiveConfidences.length / 10) === 0;
                            if (!shouldShow) return null;
                            return (
                              <text key={idx} x={x} y={h - 10} fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle" className="font-bold">
                                S{idx + 1}
                              </text>
                            );
                          })}
                          
                          {/* Area path */}
                          {confPaths.areaPath && <path d={confPaths.areaPath} fill="url(#confGrad)" />}
                          
                          {/* Stroke path */}
                          {confPaths.path && <path d={confPaths.path} fill="none" stroke="#5ed29c" strokeWidth="2" />}
                          
                          {/* Points */}
                          {confPaths.points.map((p, idx) => (
                            <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#5ed29c" stroke="#121214" strokeWidth="1" />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>

              </div>

              {/* Bottom Row: Choice Complexity & Alarms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Choice Complexity Indicator */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#5ed29c] shrink-0" /> Choice Overload & Ambiguity
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase mb-4">Volume of options vs. focus clarity</p>
                  </div>
                  
                  {(() => {
                    if (decisionComplexities.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-36 text-zinc-500 font-mono text-[11px] italic">
                          No choice complexity metrics recorded.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex flex-col gap-3 font-mono text-xs overflow-hidden">
                        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                          <div 
                            className="flex items-end gap-2 h-32 pt-4 px-2 border-b border-zinc-800"
                            style={{ minWidth: `${Math.max(decisionComplexities.length * 32, 280)}px` }}
                          >
                            {decisionComplexities.map((item, idx) => {
                              const maxChoices = Math.max(...decisionComplexities.map(d => d.choiceCount), 5);
                              const heightPct = (item.choiceCount / maxChoices) * 100;
                              const score = item.ambiguityScore;
                              const barColor = score > 0.7 ? 'bg-red-500/80 border border-red-500/50' : score > 0.4 ? 'bg-orange-500/80 border border-orange-500/50' : 'bg-[#5ed29c]/80 border border-[#5ed29c]/50';
                              
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                                  <div className="absolute bottom-full mb-1 bg-[#1a1a1e] border border-[#2d2d30] text-[8.5px] text-zinc-300 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                                    Step: <span className="text-white font-bold">#{idx + 1}</span> <br />
                                    Choices: <span className="text-white font-bold">{item.choiceCount}</span> <br />
                                    Ambiguity: <span className="text-white font-bold">{(item.ambiguityScore * 100).toFixed(0)}%</span> <br />
                                    Level: <span className="text-[#5ed29c] font-bold">{item.complexityLevel}</span>
                                  </div>
                                  
                                  <div 
                                    className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`} 
                                    style={{ height: `${heightPct}%` }}
                                  />
                                  
                                  <span className="text-[8px] text-zinc-500 mt-1">S{idx + 1}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500 uppercase px-1 shrink-0">
                          <span>Timeline Steps</span>
                          <span>Choice Density / Focal CTA Clarity</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Timeline Spike Alarms */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> Timeline Spike Alarms
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase mb-4">Critical cognitive triggers & exceptions</p>
                  </div>
                  
                  {(() => {
                    if (cognitiveTimeline.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-36 text-zinc-500 font-mono text-[11px] italic border border-dashed border-[#222226] rounded-xl">
                          No cognitive alarms triggered.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex flex-col gap-2.5 max-h-36 overflow-y-auto pr-1">
                        {cognitiveTimeline.map((alarm, idx) => {
                          let badgeColor = 'text-yellow-400 bg-yellow-950/10 border-yellow-500/20';
                          if (alarm.eventType === 'EXPECTATION_FAIL') badgeColor = 'text-red-400 bg-red-950/10 border-red-500/20';
                          if (alarm.eventType === 'CONFIDENCE_DROP') badgeColor = 'text-orange-400 bg-orange-950/10 border-orange-500/20';
                          if (alarm.eventType === 'ATTENTION_SHIFT') badgeColor = 'text-purple-400 bg-purple-950/10 border-purple-500/20';
                          if (alarm.eventType === 'RISK_ESCALATION') badgeColor = 'text-rose-400 bg-rose-950/10 border-rose-500/20';

                          return (
                            <div key={alarm.id || idx} className="flex justify-between items-start gap-3 p-2 bg-[#18181b]/50 border border-zinc-800/60 rounded-lg hover:border-zinc-700 transition-all font-mono text-[10px]">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded shrink-0">Step #{alarm.stepIndex + 1}</span>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-wider truncate ${badgeColor}`}>
                                    {alarm.eventType.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-zinc-300 leading-normal text-[9.5px] mt-1 break-words">{alarm.description}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-zinc-500 text-[8px] uppercase">Intensity</span>
                                <span className="text-white font-bold">{(alarm.intensity * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Expectation Mismatch List */}
              <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" /> Expectation Misplacement Events
                </h3>
                
                {expectationMismatches.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 font-mono text-xs italic border border-dashed border-[#222226] rounded-xl">
                    No schema convention or placement expectation mismatches registered.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {expectationMismatches.map((mismatch, idx) => {
                      const sevColor = mismatch.mismatchSeverity === 'HIGH' ? 'text-red-400 bg-red-950/15 border-red-500/20' : mismatch.mismatchSeverity === 'MEDIUM' ? 'text-orange-400 bg-orange-950/15 border-orange-500/20' : 'text-yellow-400 bg-yellow-950/15 border-yellow-500/20';
                      
                      return (
                        <div key={mismatch.id || idx} className="p-3 bg-[#18181b]/40 border border-[#2c2c30] rounded-xl font-mono text-[11px] flex flex-col gap-2 overflow-hidden">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded shrink-0">S{mismatch.stepIndex + 1}</span>
                              <span className="text-white font-bold uppercase tracking-wide truncate">{mismatch.mismatchCategory.replace(/_/g, ' ')}</span>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 rounded border uppercase shrink-0 ${sevColor}`}>
                              {mismatch.mismatchSeverity} Severity
                            </span>
                          </div>
                          
                          <p className="text-zinc-300 text-[10.5px] leading-relaxed break-words">
                            {mismatch.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-white/[0.02] text-[9.5px] text-zinc-500 min-w-0">
                            <div className="min-w-0">
                              <span>Expected: </span>
                              <span className="text-zinc-300 font-bold break-all">{mismatch.expectedAction}</span>
                            </div>
                            <span>•</span>
                            <div className="min-w-0">
                              <span>Actual: </span>
                              <span className="text-zinc-300 font-bold break-all">{mismatch.actualAction}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>

    </div>
  );
};
