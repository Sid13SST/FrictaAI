import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Activity, 
  Terminal, 
  Cpu, 
  Layers, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  MessageSquare, 
  Play, 
  ShieldAlert,
  ArrowRight,
  Eye,
  Settings,
  AlertTriangle,
  Sliders,
  Network,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Link2,
  GitBranch,
  HelpCircle,
  FileText,
  Workflow,
  Search,
  Filter
} from 'lucide-react';

interface AgentOrchestrationConsoleProps {
  sessionId: string;
  onOrchestrationComplete?: () => void;
}

interface AgentExecution {
  id: string;
  agentType: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  task: string;
  result?: any;
  startedAt?: string;
  completedAt?: string;
  metadata?: any;
}

interface TimelineEvent {
  id: string;
  source: 'shared_context' | 'delegation';
  type: string;
  payload: any;
  fromAgent?: string;
  toAgent?: string;
  timestamp: string;
}

interface StructuredFinding {
  id: string;
  agentExecutionId: string;
  agentType: string;
  findingType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: string;
  correlatedFindings?: any;
  timestamp: string;
}

interface AgentSignal {
  id: string;
  agentExecutionId: string;
  agentType: string;
  signalType: string;
  intensity: number;
  metadata?: any;
  timestamp: string;
}

interface AgentReasoningTrace {
  id: string;
  agentType: string;
  stepType: string;
  summary: string;
  evidence?: string;
  timestamp: string;
}

interface MemoryEvent {
  id: string;
  eventType: string;
  sourceAgent: string;
  payload: any;
  timestamp: string;
}

interface MemorySnapshot {
  id: string;
  snapshotType: string;
  payload: any;
  createdAt: string;
}

interface CorrelatedFinding {
  id: string;
  findingIds: string[];
  correlationType: string;
  summary: string;
  confidence: number;
  metadata?: any;
  timestamp: string;
}

interface CollaborativeInsight {
  id: string;
  title: string;
  summary: string;
  supportingEvidence: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: string;
}

interface CooperativeRecommendation {
  id: string;
  title: string;
  summary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  collaboratingAgents: string[];
  remediationSteps: string[];
  impactScore: number;
}

const RenderPayload: React.FC<{ payload: any }> = ({ payload }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return null;
  }

  const { description, ...otherProps } = payload;
  const hasOtherProps = Object.keys(otherProps).length > 0;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 w-full font-sans">
      {description && (
        <div className="text-zinc-300 text-xs bg-zinc-950/80 p-3 rounded-lg border border-zinc-900/60 leading-relaxed shadow-inner">
          {description}
        </div>
      )}
      
      {hasOtherProps && (
        <div className="flex flex-col gap-1">
          {!showRaw ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0d0d10]/40 p-2.5 rounded-lg border border-zinc-900/60">
              {Object.entries(otherProps).map(([key, val]) => {
                let displayVal = '';
                if (val === null || val === undefined) {
                  displayVal = 'N/A';
                } else if (typeof val === 'object') {
                  displayVal = JSON.stringify(val);
                } else {
                  displayVal = String(val);
                }

                const formattedKey = key
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .trim()
                  .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div key={key} className="flex flex-wrap items-baseline gap-1.5 text-[10px]">
                    <span className="text-[#888899] font-medium">{formattedKey}:</span>
                    <span className="text-zinc-300 font-mono bg-[#141416] px-1.5 py-0.5 rounded border border-zinc-800/40">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="text-zinc-400 text-[10px] bg-black/60 p-3 rounded-lg border border-zinc-900 overflow-x-auto max-w-full font-mono">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[9px] text-[#6366f1] hover:text-[#4f46e5] transition-colors font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-[#6366f1]/10 hover:border-[#6366f1]/20 bg-[#6366f1]/5 mt-0.5"
            >
              {showRaw ? 'Simple View' : 'Raw JSON'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AgentOrchestrationConsole: React.FC<AgentOrchestrationConsoleProps> = ({ 
  sessionId,
  onOrchestrationComplete 
}) => {
  const [orchestrationSession, setOrchestrationSession] = useState<any>(null);
  const [agents, setAgents] = useState<AgentExecution[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [findings, setFindings] = useState<Record<string, StructuredFinding[]>>({});
  const [reasoning, setReasoning] = useState<AgentReasoningTrace[]>([]);
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  
  // Shared Memory New States
  const [memoryEvents, setMemoryEvents] = useState<MemoryEvent[]>([]);
  const [memoryCorrelations, setMemoryCorrelations] = useState<CorrelatedFinding[]>([]);
  const [memoryInsights, setMemoryInsights] = useState<CollaborativeInsight[]>([]);
  const [memorySnapshots, setMemorySnapshots] = useState<MemorySnapshot[]>([]);
  const [memoryTimeline, setMemoryTimeline] = useState<any[]>([]);
  const [memoryRecommendations, setMemoryRecommendations] = useState<CooperativeRecommendation[]>([]);

  // Filtering local states
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [terminalFilter, setTerminalFilter] = useState<'ALL' | 'INFO' | 'SIGNALS' | 'DELEGATION' | 'RECOVERY'>('ALL');
  
  const [selectedAgentType, setSelectedAgentType] = useState<string>('VISUAL_AGENT');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'timeline' | 'memory' | 'traces'>('timeline');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Accent system color helpers
  const getAgentAccentColor = (agentType: string) => {
    switch (agentType) {
      case 'VISUAL_AGENT':
      case 'VISUAL_AUDITOR':
        return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', hex: '#10b981' };
      case 'NAVIGATION_AGENT':
        return { text: 'text-pink-400', border: 'border-pink-500/20', bg: 'bg-pink-500/10', hex: '#ec4899' };
      case 'COGNITIVE_AGENT':
      case 'COGNITIVE_SIMULATOR':
        return { text: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/10', hex: '#eab308' };
      case 'ONBOARDING_AGENT':
        return { text: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', hex: '#06b6d4' };
      case 'DISCOVERABILITY_AGENT':
        return { text: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/10', hex: '#8b5cf6' };
      case 'WORKFLOW_AGENT':
        return { text: 'text-lime-400', border: 'border-lime-500/20', bg: 'bg-lime-500/10', hex: '#84cc16' };
      case 'UX_ORCHESTRATOR':
      default:
        return { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10', hex: '#a855f7' };
    }
  };

  const fetchSessionData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const backendBase = 'http://127.0.0.1:3001';
      
      // Fetch session status and agents
      const sessionRes = await fetch(`${backendBase}/api/orchestrator/${sessionId}`);
      if (!sessionRes.ok) {
        if (sessionRes.status === 404) {
          setOrchestrationSession(null);
          setAgents([]);
          setTimeline([]);
          setFindings({});
          setReasoning([]);
          setSignals([]);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch orchestration session');
      }
      
      const { session } = await sessionRes.json();
      setOrchestrationSession(session);
      setAgents(session.agentExecutions || []);

      // Fetch timeline logs
      const timelineRes = await fetch(`${backendBase}/api/orchestrator/${sessionId}/timeline`);
      if (timelineRes.ok) {
        const { timeline } = await timelineRes.json();
        setTimeline(timeline);
      }

      // Fetch specialized telemetry (findings, signals, traces)
      const findingsRes = await fetch(`${backendBase}/api/agents/${sessionId}/findings`);
      if (findingsRes.ok) {
        const data = await findingsRes.json();
        setFindings(data.findings || {});
      }

      const reasoningRes = await fetch(`${backendBase}/api/agents/${sessionId}/reasoning`);
      if (reasoningRes.ok) {
        const data = await reasoningRes.json();
        setReasoning(data.traces || []);
      }

      const signalsRes = await fetch(`${backendBase}/api/agents/${sessionId}/signals`);
      if (signalsRes.ok) {
        const data = await signalsRes.json();
        setSignals(data.signals || []);
      }

      // Fetch shared memory data
      const memoryRes = await fetch(`${backendBase}/api/memory/${sessionId}`);
      if (memoryRes.ok) {
        const { events } = await memoryRes.json();
        setMemoryEvents(events || []);
      }

      const correlationsRes = await fetch(`${backendBase}/api/memory/${sessionId}/correlations`);
      if (correlationsRes.ok) {
        const { correlations } = await correlationsRes.json();
        setMemoryCorrelations(correlations || []);
      }

      const insightsRes = await fetch(`${backendBase}/api/memory/${sessionId}/insights`);
      if (insightsRes.ok) {
        const { insights } = await insightsRes.json();
        setMemoryInsights(insights || []);
      }

      const snapshotsRes = await fetch(`${backendBase}/api/memory/${sessionId}/snapshots`);
      if (snapshotsRes.ok) {
        const { snapshots } = await snapshotsRes.json();
        setMemorySnapshots(snapshots || []);
      }

      const memoryTimelineRes = await fetch(`${backendBase}/api/memory/${sessionId}/timeline`);
      if (memoryTimelineRes.ok) {
        const { timeline } = await memoryTimelineRes.json();
        setMemoryTimeline(timeline || []);
      }

      const recommendationsRes = await fetch(`${backendBase}/api/memory/${sessionId}/recommendations`);
      if (recommendationsRes.ok) {
        const { recommendations } = await recommendationsRes.json();
        setMemoryRecommendations(recommendations || []);
      }
      
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading orchestration telemetry');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStartOrchestration = async () => {
    setStarting(true);
    setError(null);
    try {
      const backendBase = 'http://127.0.0.1:3001';
      const res = await fetch(`${backendBase}/api/orchestrator/start/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to trigger orchestrator');
      }

      await fetchSessionData(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    fetchSessionData(false);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    const isRunning = orchestrationSession && (orchestrationSession.status === 'RUNNING' || orchestrationSession.status === 'PENDING');
    
    if (isRunning) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          fetchSessionData(true);
        }, 1500);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        
        if (orchestrationSession?.status === 'COMPLETED' && onOrchestrationComplete) {
          onOrchestrationComplete();
        }
      }
    }
  }, [orchestrationSession]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline, reasoning, memoryTimeline, activeConsoleTab]);

  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getAgentStatusBadge = (status: AgentExecution['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20">COMPLETED</span>;
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 animate-pulse">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            RUNNING
          </span>
        );
      case 'QUEUED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">QUEUED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">IDLE</span>;
    }
  };

  const formatAgentName = (type: string) => {
    return type.replace(/_AGENT/g, '').replace(/_/g, ' ');
  };

  const getEventIcon = (type: string) => {
    if (type.includes('FAIL') || type.includes('ERROR')) return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    if (type.includes('COMPLETED') || type.includes('SUCCESS') || type.includes('SYNC_COMPLETED')) return <CheckCircle2 className="w-3.5 h-3.5 text-[#6366f1]" />;
    if (type.includes('SPAWNED')) return <Cpu className="w-3.5 h-3.5 text-sky-400" />;
    if (type.includes('DELEGATED') || type.includes('ASSIGN')) return <Layers className="w-3.5 h-3.5 text-violet-400" />;
    if (type.includes('RECOVERY') || type.includes('RETRY')) return <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
    return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  // Agent definitions
  const agentDefinitions: Record<string, {
    name: string;
    description: string;
    icon: React.ReactNode;
    heuristics: string[];
    metricsTemplate: { label: string; key: string; format: (val: any) => string }[];
  }> = {
    VISUAL_AGENT: {
      name: 'Visual Agent',
      description: 'Audits layout structures, visual density, overlaps, grid alignment, and visual hierarchy friction.',
      icon: <Eye className="w-4 h-4" />,
      heuristics: [
        'Grid Alignment Consistency',
        'Element Overlap Detection',
        'Contrast Ratio Validation',
        'Visual Clutter Ratio'
      ],
      metricsTemplate: [
        { label: 'Max Elements', key: 'maxElementsCount', format: (v) => `${v || 0} layout elements` },
        { label: 'Overlap Count', key: 'overlapCount', format: (v) => `${v || 0} overlap instances` },
        { label: 'Misalignment Jitter', key: 'alignmentJitterCount', format: (v) => `${v || 0} instances` }
      ]
    },
    DISCOVERABILITY_AGENT: {
      name: 'Discoverability Agent',
      description: 'Measures Call-To-Action exposure, button contrast prominence, features search, and affordance ambiguity.',
      icon: <Sparkles className="w-4 h-4" />,
      heuristics: [
        'CTA Area Prominence Heuristics',
        'Interactive Affordance Verification',
        'Feature Search Density check'
      ],
      metricsTemplate: [
        { label: 'Competing CTAs', key: 'primaryButtonsCount', format: (v) => `${v || 0} primary actions` },
        { label: 'Weak CTA Flag', key: 'details', format: (v) => v ? 'Flagged' : 'Normal' },
        { label: 'Menu Search Clicks', key: 'menuToggles', format: (v) => `${v || 0} searches` }
      ]
    },
    NAVIGATION_AGENT: {
      name: 'Navigation Agent',
      description: 'Evaluates navigation loops, route switches without action progress, dead-ends, and sidebar IA.',
      icon: <Network className="w-4 h-4" />,
      heuristics: [
        'Sequential Route Loop Detector',
        'Dead-end Action Inspector',
        'Sidebar Element IA Density'
      ],
      metricsTemplate: [
        { label: 'Loops Found', key: 'path', format: (v) => v ? '1 Loop Detected' : 'None' },
        { label: 'Route Switches', key: 'consecutiveSwitches', format: (v) => `${v || 0} switches` },
        { label: 'Sidebar Links', key: 'elementCount', format: (v) => `${v || 0} menu nodes` }
      ]
    },
    ONBOARDING_AGENT: {
      name: 'Onboarding Agent',
      description: 'Audits form setup progression, guidance banner presence, progressive disclosure, and first step hesitation.',
      icon: <Sliders className="w-4 h-4" />,
      heuristics: [
        'Guidance Banner Presence index',
        'Empty State Progression audit',
        'First Step Hesitation threshold'
      ],
      metricsTemplate: [
        { label: 'First Step Delay', key: 'firstStepDurationSeconds', format: (v) => `${v || 0} seconds` },
        { label: 'Checked Screens', key: 'checkedScreenshots', format: (v) => `${v || 0} frames` },
        { label: 'Empty State URL', key: 'pageUrl', format: (v) => v ? String(v).slice(0, 20) : 'N/A' }
      ]
    },
    COGNITIVE_AGENT: {
      name: 'Cognitive Agent',
      description: 'Simulates user mental models, decision counts, and form element input density overload.',
      icon: <Cpu className="w-4 h-4" />,
      heuristics: [
        'Mental Model Simulation',
        'Decision Fatigue Tracker',
        'Form Input Density check'
      ],
      metricsTemplate: [
        { label: 'Hesitant Thoughts', key: 'hesitantThoughts', format: (v) => `${v || 0} steps` },
        { label: 'Consecutive Decisions', key: 'consecutiveDecisions', format: (v) => `${v || 0} choices` },
        { label: 'Max Inputs/View', key: 'maxInputsInSingleView', format: (v) => `${v || 0} inputs` }
      ]
    },
    WORKFLOW_AGENT: {
      name: 'Workflow Agent',
      description: 'Audits redundant steps, progressive bottlenecks, and schedules process flow optimizations.',
      icon: <Activity className="w-4 h-4" />,
      heuristics: [
        'Step Redundancy auditor',
        'Progression Bottleneck tracer',
        'Step Count Optimization check'
      ],
      metricsTemplate: [
        { label: 'Redundant Targets', key: 'redundantTargets', format: (v) => Array.isArray(v) ? `${v.length} items` : 'None' },
        { label: 'Avg Step Duration', key: 'avgStepDuration', format: (v) => `${v || 0}s` },
        { label: 'Workflow Step Count', key: 'stepCount', format: (v) => `${v || 0} steps` }
      ]
    },
    UX_ORCHESTRATOR: {
      name: 'UX Orchestrator',
      description: 'Runs final synthesis, aggregates specialized findings, and generates unified scorecards.',
      icon: <Brain className="w-4 h-4" />,
      heuristics: [
        'Consolidated Grade Sheet Generator',
        'Executive Summary Synthesizer'
      ],
      metricsTemplate: [
        { label: 'Final Score', key: 'overallScore', format: (v) => `${v || 0}/100` }
      ]
    }
  };

  if (loading) {
    return (
      <div className="bg-[#09090b] border border-zinc-900 rounded-2xl p-16 flex flex-col items-center justify-center min-h-[400px] text-zinc-400 shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6366f1]/40 to-transparent" />
        <RefreshCw className="w-8 h-8 text-[#6366f1] animate-spin mb-4" />
        <span className="text-xs font-mono tracking-wider text-[#6366f1]/80 uppercase animate-pulse">LOADING COOPERATIVE INTEL CONSOLE...</span>
      </div>
    );
  }

  if (!orchestrationSession) {
    return (
      <div className="bg-[#09090b] border border-zinc-900 rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[450px] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6366f1]/30 to-transparent" />
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6366f1]/5 to-[#6366f1]/20 border border-[#6366f1]/20 flex items-center justify-center text-[#6366f1] mb-6 shadow-[0_0_24px_rgba(99, 102, 241,0.1)] animate-pulse">
          <Brain className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Distributed UX Research Organization</h3>
        <p className="text-xs text-zinc-400 max-w-[500px] leading-relaxed mb-8">
          Deploy Fricta's specialized investigative agents (Visual, Discoverability, Navigation, Onboarding, Cognitive, and Workflow) to analyze your session. The system runs scoped, explainable reasoning traces to diagnose friction.
        </p>

        <button
          onClick={handleStartOrchestration}
          disabled={starting}
          className="flex items-center gap-2.5 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-[#070b0a] text-xs font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed uppercase tracking-wider font-mono"
        >
          {starting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>SPAWNING SPECIALIST AGENT MESH...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>DEPLOY UX RESEARCH MESH</span>
            </>
          )}
        </button>
        {error && (
          <div className="mt-5 p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-mono max-w-[420px]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Find execution records
  const visualExec = agents.find(a => a.agentType === 'VISUAL_AGENT');
  const discoverabilityExec = agents.find(a => a.agentType === 'DISCOVERABILITY_AGENT');
  const navigationExec = agents.find(a => a.agentType === 'NAVIGATION_AGENT');
  const onboardingExec = agents.find(a => a.agentType === 'ONBOARDING_AGENT');
  const cognitiveExec = agents.find(a => a.agentType === 'COGNITIVE_AGENT');
  const workflowExec = agents.find(a => a.agentType === 'WORKFLOW_AGENT');
  const orchestratorExec = agents.find(a => a.agentType === 'UX_ORCHESTRATOR');

  const orderedAgents = [
    { type: 'VISUAL_AGENT', execution: visualExec },
    { type: 'DISCOVERABILITY_AGENT', execution: discoverabilityExec },
    { type: 'NAVIGATION_AGENT', execution: navigationExec },
    { type: 'ONBOARDING_AGENT', execution: onboardingExec },
    { type: 'COGNITIVE_AGENT', execution: cognitiveExec },
    { type: 'WORKFLOW_AGENT', execution: workflowExec },
    { type: 'UX_ORCHESTRATOR', execution: orchestratorExec }
  ];

  // Scoped views for inspector panel
  const selectedAgentDef = agentDefinitions[selectedAgentType];
  const selectedAgentExec = agents.find(a => a.agentType === selectedAgentType);
  const selectedAgentSignals = signals.filter(s => s.agentType === selectedAgentType);
  const selectedAgentTraces = reasoning.filter(r => r.agentType === selectedAgentType);
  
  // Flat findings list filtered locally by Severity
  const allFindingsFlat: StructuredFinding[] = Object.values(findings).flatMap(f => f);
  const filteredFindings = allFindingsFlat.filter(f => {
    if (findingSeverityFilter === 'ALL') return true;
    return f.severity === findingSeverityFilter;
  });

  // Flat timeline logs filtered locally by Log Level
  const filteredConsoleLogs = timeline.filter(event => {
    if (terminalFilter === 'ALL') return true;
    if (terminalFilter === 'INFO') {
      return event.type.includes('COMPLETED') || event.type.includes('SUCCESS') || event.type.includes('SPAWNED') || event.type.includes('COMPLETE');
    }
    if (terminalFilter === 'SIGNALS') {
      return event.type.includes('SIGNAL') || event.type.includes('TRIGGER') || event.type.includes('METRIC');
    }
    if (terminalFilter === 'DELEGATION') {
      return event.type.includes('DELEGATED') || event.type.includes('TASK') || event.type.includes('ASSIGN');
    }
    if (terminalFilter === 'RECOVERY') {
      return event.type.includes('FAIL') || event.type.includes('ERROR') || event.type.includes('RECOVERY') || event.type.includes('RETRY');
    }
    return true;
  });

  const hasFailuresOrRetries = agents.some(a => a.status === 'FAILED' || (a.metadata && (a.metadata.error || a.metadata.retryCount > 0)));
  const totalFindings = allFindingsFlat.length;

  // Topology node coords
  const nodeCoords: Record<string, { x: number; y: number }> = {
    VISUAL_AGENT: { x: 120, y: 65 },
    DISCOVERABILITY_AGENT: { x: 280, y: 65 },
    NAVIGATION_AGENT: { x: 440, y: 65 },
    ONBOARDING_AGENT: { x: 120, y: 195 },
    COGNITIVE_AGENT: { x: 280, y: 195 },
    WORKFLOW_AGENT: { x: 440, y: 195 },
    UX_ORCHESTRATOR: { x: 670, y: 130 }
  };

  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    if (x2 < x1) {
      const cx1 = x1 - dx * 0.45;
      const cy1 = y1 + dy * 0.15;
      const cx2 = x2 + dx * 0.45;
      const cy2 = y2 - dy * 0.15;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
    const cx1 = x1 + dx * 0.45;
    const cy1 = y1;
    const cx2 = x2 - dx * 0.45;
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  const getPathClass = (fromType: string, toType: string) => {
    const fromExec = agents.find(a => a.agentType === fromType);
    const toExec = agents.find(a => a.agentType === toType);
    const fromStatus = fromExec ? fromExec.status : 'IDLE';
    const toStatus = toExec ? toExec.status : 'IDLE';

    if (toStatus === 'RUNNING' || fromStatus === 'RUNNING') {
      return 'stroke-[#6366f1] stroke-[2px] flow-line-active opacity-100 filter drop-shadow-[0_0_5px_rgba(99, 102, 241,0.6)]';
    }
    if (fromStatus === 'COMPLETED' && toStatus === 'COMPLETED') {
      return 'stroke-zinc-700/80 stroke-[1.5px] opacity-70';
    }
    if (toStatus === 'QUEUED') {
      return 'stroke-zinc-800 stroke-[1px] opacity-40';
    }
    return 'stroke-zinc-900/60 stroke-[1px] opacity-25';
  };

  const getOrchestratorPathClass = (agentType: string) => {
    const exec = agents.find(a => a.agentType === agentType);
    const status = exec ? exec.status : 'IDLE';

    if (status === 'RUNNING') {
      return 'stroke-[#6366f1] stroke-[1.5px] flow-line-active opacity-100 filter drop-shadow-[0_0_5px_rgba(99, 102, 241,0.5)]';
    }
    if (status === 'COMPLETED') {
      return 'stroke-zinc-800 stroke-[1px] opacity-35';
    }
    return 'stroke-zinc-900/20 stroke-[0.5px] opacity-10';
  };

  return (
    <div className="flex flex-col gap-6 text-zinc-100 font-sans relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flow-line-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flow-line-active {
          stroke-dasharray: 6, 4;
          animation: flow-line-dash 1.2s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .glow-indigo-strong {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
        }
      `}} />

      {/* Background decoration */}
      <div className="absolute top-[-5%] left-[15%] w-[450px] h-[450px] rounded-full bg-[#6366f1]/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-emerald-500/3 blur-[100px] pointer-events-none" />
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#0d0d11]/80 border border-zinc-900/80 rounded-2xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/40 to-transparent" />
        
        <div className="flex flex-col gap-1 pl-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#6366f1] bg-[#6366f1]/10 px-2.5 py-0.5 rounded-full border border-[#6366f1]/20 uppercase tracking-widest font-mono">
              Intelligence Operations Console
            </span>
            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider ${
              orchestrationSession.status === 'COMPLETED' ? 'bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20' :
              orchestrationSession.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' :
              orchestrationSession.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {orchestrationSession.status}
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2 mt-1">
            Fricta Unified Investigative Core
          </h2>
          <span className="text-zinc-500 font-mono text-[9px]">Session Identifier: {orchestrationSession.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-[#08080a] px-5 py-3 rounded-xl border border-zinc-900/90 shadow-inner">
          <div className="flex flex-col pr-5 border-r border-zinc-800/80 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Elapsed Time</span>
            <span className="text-xs font-mono text-zinc-300 mt-1 font-semibold">
              {orchestrationSession.completedAt && orchestrationSession.startedAt
                ? `${Math.round((new Date(orchestrationSession.completedAt).getTime() - new Date(orchestrationSession.startedAt).getTime()) / 1000)}s`
                : orchestrationSession.startedAt
                ? 'Running...'
                : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col pr-5 border-r border-zinc-800/80 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Telemetry Events</span>
            <span className="text-xs font-mono text-zinc-300 mt-1 font-semibold">{timeline.length + memoryEvents.length} logs</span>
          </div>
          <div className="flex flex-col pr-5 border-r border-zinc-800/80 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Findings Compiled</span>
            <span className="text-xs font-mono text-zinc-300 mt-1 font-semibold">{totalFindings} nodes</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleStartOrchestration}
              disabled={starting || orchestrationSession.status === 'RUNNING'}
              className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-[10px] font-bold text-[#070b0a] uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99, 102, 241,0.15)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${starting || orchestrationSession.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              <span>RE-RUN AUDIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Failures & Recovery Diagnostics Panel */}
      {hasFailuresOrRetries && (
        <div className="bg-gradient-to-r from-rose-950/10 to-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4 items-start shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500" />
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Self-Healing Diagnostics Active</h4>
            <p className="text-zinc-400 leading-relaxed">
              Execution anomalies were captured and handled by the recovery coordinator. Automatic retries or containment strategies succeeded in saving the pipeline state.
            </p>
            <div className="flex flex-col gap-2 mt-3 font-mono text-[9px]">
              {agents.map((agent) => {
                const hasError = agent.metadata && agent.metadata.error;
                const retryCount = agent.metadata?.retryCount || 0;
                if (!hasError && retryCount === 0) return null;
                return (
                  <div key={agent.id} className="p-2 rounded-lg bg-black/40 border border-amber-500/10 flex justify-between items-center">
                    <span>
                      <strong className="text-zinc-200">{formatAgentName(agent.agentType)}</strong>: {hasError ? `"${agent.metadata.error}"` : 'Resolved on retry'}
                    </span>
                    <span className="text-amber-400 font-semibold flex-shrink-0 ml-4 font-mono animate-pulse">
                      RETRIES: {retryCount}/2
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collaborative Insight Synthesis & Recommendations Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synthesis Insights */}
        <div className="lg:col-span-2 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent" />
          <div className="flex justify-between items-center mb-5">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#6366f1]" /> Multi-Agent Investigation Synthesis
            </span>
            <span className="text-[8px] text-[#6366f1] font-mono bg-[#6366f1]/10 px-2 py-0.5 rounded border border-[#6366f1]/20 font-bold uppercase tracking-widest">
              Synthesized Summary
            </span>
          </div>

          {memoryInsights.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic">
              No collaborative synthesis insights computed yet. Complete execution to trigger synthesis.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {memoryInsights.map((insight) => (
                <div key={insight.id} className="bg-zinc-950/60 rounded-xl p-4.5 border border-zinc-900 hover:border-zinc-800/80 transition-colors shadow-sm">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6366f1]" />
                      {insight.title}
                    </h3>
                    <div className="flex gap-2">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full border font-bold font-mono tracking-wider ${getSeverityColor(insight.severity)}`}>
                        {insight.severity}
                      </span>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                        CONFIDENCE: {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{insight.summary}</p>
                  <div className="mt-3 text-[10px] text-zinc-500 font-sans border-t border-zinc-900/60 pt-2 flex items-center gap-1">
                    <span className="font-bold text-zinc-400">Supporting Evidence:</span> {insight.supportingEvidence}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cooperative Recommendations */}
        <div className="lg:col-span-1 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent" />
          <div className="flex justify-between items-center mb-5">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Cooperative Recommendations</span>
            <span className="text-[8px] text-zinc-500 font-mono">Remediation Steps</span>
          </div>

          {memoryRecommendations.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic font-mono">
              Waiting for analysis...
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-1">
              {memoryRecommendations.map((rec) => (
                <div key={rec.id} className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-white leading-snug">{rec.title}</h4>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold ${getSeverityColor(rec.severity)}`}>
                      {rec.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{rec.summary}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {rec.collaboratingAgents.map(ag => {
                      const colors = getAgentAccentColor(ag);
                      return (
                        <span key={ag} className={`text-[8px] font-mono px-2 py-0.5 rounded border ${colors.border} ${colors.text} ${colors.bg} font-bold`}>
                          {formatAgentName(ag)}
                        </span>
                      );
                    })}
                  </div>

                  <div className="border-t border-zinc-900/60 pt-2.5 mt-1 flex flex-col gap-1.5">
                    {rec.remediationSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[10px]">
                        <input type="checkbox" readOnly checked className="mt-0.5 h-3 w-3 accent-[#6366f1] rounded border-zinc-800 bg-[#09090b] text-[#6366f1]" />
                        <span className="text-zinc-300 leading-normal">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topology Map & Graph Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): SVG Topology Map */}
        <div className="lg:col-span-2 relative w-full overflow-hidden bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/10 to-transparent" />
          <div className="mb-4 flex justify-between items-center">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider font-mono">Agent Mesh Topology & Coordination Flow</span>
            <span className="text-[8px] text-zinc-600 font-mono">Click any agent node to inspect its execution metrics</span>
          </div>

          <div className="overflow-x-auto w-full">
            <svg viewBox="0 0 800 260" className="w-full h-auto overflow-visible select-none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" rx="8" />

              {/* Orchestrator Control Lines (Background) */}
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.VISUAL_AGENT.x, nodeCoords.VISUAL_AGENT.y)} fill="none" className={getOrchestratorPathClass('VISUAL_AGENT')} />
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.DISCOVERABILITY_AGENT.x, nodeCoords.DISCOVERABILITY_AGENT.y)} fill="none" className={getOrchestratorPathClass('DISCOVERABILITY_AGENT')} />
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.NAVIGATION_AGENT.x, nodeCoords.NAVIGATION_AGENT.y)} fill="none" className={getOrchestratorPathClass('NAVIGATION_AGENT')} />
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.ONBOARDING_AGENT.x, nodeCoords.ONBOARDING_AGENT.y)} fill="none" className={getOrchestratorPathClass('ONBOARDING_AGENT')} />
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.COGNITIVE_AGENT.x, nodeCoords.COGNITIVE_AGENT.y)} fill="none" className={getOrchestratorPathClass('COGNITIVE_AGENT')} />
              <path d={getBezierPath(nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y, nodeCoords.WORKFLOW_AGENT.x, nodeCoords.WORKFLOW_AGENT.y)} fill="none" className={getOrchestratorPathClass('WORKFLOW_AGENT')} />

              {/* Sequential Flow Lines */}
              <path d={getBezierPath(nodeCoords.VISUAL_AGENT.x, nodeCoords.VISUAL_AGENT.y, nodeCoords.DISCOVERABILITY_AGENT.x, nodeCoords.DISCOVERABILITY_AGENT.y)} fill="none" className={getPathClass('VISUAL_AGENT', 'DISCOVERABILITY_AGENT')} />
              <path d={getBezierPath(nodeCoords.DISCOVERABILITY_AGENT.x, nodeCoords.DISCOVERABILITY_AGENT.y, nodeCoords.NAVIGATION_AGENT.x, nodeCoords.NAVIGATION_AGENT.y)} fill="none" className={getPathClass('DISCOVERABILITY_AGENT', 'NAVIGATION_AGENT')} />
              <path d={getBezierPath(nodeCoords.NAVIGATION_AGENT.x, nodeCoords.NAVIGATION_AGENT.y, nodeCoords.ONBOARDING_AGENT.x, nodeCoords.ONBOARDING_AGENT.y)} fill="none" className={getPathClass('NAVIGATION_AGENT', 'ONBOARDING_AGENT')} />
              <path d={getBezierPath(nodeCoords.ONBOARDING_AGENT.x, nodeCoords.ONBOARDING_AGENT.y, nodeCoords.COGNITIVE_AGENT.x, nodeCoords.COGNITIVE_AGENT.y)} fill="none" className={getPathClass('ONBOARDING_AGENT', 'COGNITIVE_AGENT')} />
              <path d={getBezierPath(nodeCoords.COGNITIVE_AGENT.x, nodeCoords.COGNITIVE_AGENT.y, nodeCoords.WORKFLOW_AGENT.x, nodeCoords.WORKFLOW_AGENT.y)} fill="none" className={getPathClass('COGNITIVE_AGENT', 'WORKFLOW_AGENT')} />
              <path d={getBezierPath(nodeCoords.WORKFLOW_AGENT.x, nodeCoords.WORKFLOW_AGENT.y, nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y)} fill="none" className={getPathClass('WORKFLOW_AGENT', 'UX_ORCHESTRATOR')} />

              {/* Render Nodes */}
              {orderedAgents.map((ag) => {
                const hasExec = ag.execution;
                const status = hasExec ? hasExec.status : 'IDLE';
                const isSelected = selectedAgentType === ag.type;
                const def = agentDefinitions[ag.type];
                const coord = nodeCoords[ag.type];
                const accent = getAgentAccentColor(ag.type);

                if (ag.type === 'UX_ORCHESTRATOR') {
                  return (
                    <foreignObject 
                      key={ag.type}
                      x={coord.x - 80} 
                      y={coord.y - 45} 
                      width={160} 
                      height={95}
                      className="overflow-visible"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAgentType('UX_ORCHESTRATOR')}
                        className={`w-[160px] h-[90px] cursor-pointer rounded-2xl border flex flex-col justify-between p-3.5 transition-all duration-300 relative select-none ${
                          selectedAgentType === 'UX_ORCHESTRATOR'
                            ? 'border-[#6366f1] bg-[#6366f1]/10 text-white shadow-[0_0_20px_rgba(99, 102, 241,0.25)] glow-indigo-strong' 
                            : status === 'RUNNING'
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse'
                            : status === 'COMPLETED'
                            ? 'border-zinc-800 bg-[#0d0d10] text-[#6366f1]/80 hover:border-[#6366f1]/40'
                            : 'border-zinc-900 bg-zinc-950 text-zinc-650'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className={`p-2 rounded-xl border ${
                            selectedAgentType === 'UX_ORCHESTRATOR' 
                              ? 'bg-[#6366f1]/20 border-[#6366f1]/30 text-[#6366f1]' 
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                          }`}>
                            <Brain className="w-4 h-4" />
                          </div>
                          <span className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-emerald-400 animate-ping' : status === 'COMPLETED' ? 'bg-[#6366f1]' : 'bg-zinc-700'}`} />
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider">UX ORCHESTRATOR</div>
                          <div className="text-[8px] font-mono text-zinc-500 mt-0.5">SYNTHESIS CORE</div>
                        </div>
                      </motion.div>
                    </foreignObject>
                  );
                }

                return (
                  <foreignObject 
                    key={ag.type} 
                    x={coord.x - 70} 
                    y={coord.y - 40} 
                    width={140} 
                    height={85}
                    className="overflow-visible"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAgentType(ag.type)}
                      className={`w-[140px] h-[80px] cursor-pointer rounded-xl border flex flex-col justify-between p-2.5 transition-all duration-300 relative select-none ${
                        isSelected 
                          ? `bg-[#0d0d10] text-white border-zinc-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]` 
                          : status === 'RUNNING'
                          ? 'border-[#6366f1] bg-emerald-950/10 text-emerald-100 shadow-[0_0_15px_rgba(99, 102, 241,0.15)] animate-pulse'
                          : status === 'COMPLETED'
                          ? 'border-zinc-900 bg-[#070709] hover:border-zinc-800 hover:bg-[#0c0c0e] text-zinc-300'
                          : status === 'FAILED'
                          ? 'border-rose-500/50 bg-rose-950/10 text-rose-200'
                          : 'border-zinc-950 bg-[#08080a] opacity-50 text-zinc-600 hover:opacity-85'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        {/* Role icon colored with role specific accent */}
                        <div className={`p-1.5 rounded-lg border text-[10px] bg-zinc-950 ${accent.border} ${accent.text}`}>
                          {def?.icon || <Cpu className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{
                            backgroundColor: status === 'COMPLETED' ? accent.hex : status === 'RUNNING' ? '#10b981' : status === 'FAILED' ? '#ef4444' : '#52525b'
                          }} />
                        </div>
                      </div>

                      <div className="mt-1">
                        <div className="text-[10px] font-extrabold truncate tracking-tight">{def?.name || formatAgentName(ag.type)}</div>
                        <div className="text-[8px] font-bold font-mono uppercase tracking-wider text-zinc-550 mt-0.5">{status}</div>
                      </div>
                    </motion.div>
                  </foreignObject>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column (1/3): Scope Inspector Panel */}
        <div className="lg:col-span-1 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/10 to-transparent" />
          <div className="flex justify-between items-center mb-5">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Agent Scope Inspector</span>
            <span className="text-[8px] text-[#6366f1] font-mono bg-[#6366f1]/10 px-2.5 py-0.5 rounded border border-[#6366f1]/20 font-bold uppercase tracking-widest animate-pulse">Telemetry</span>
          </div>

          <div className="flex flex-col gap-5">
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center bg-zinc-900/60 ${getAgentAccentColor(selectedAgentType).border} ${getAgentAccentColor(selectedAgentType).text}`}>
                {selectedAgentDef?.icon || <Cpu className="w-5 h-5" />}
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-white leading-snug uppercase tracking-tight">{selectedAgentDef?.name || formatAgentName(selectedAgentType)}</h3>
                <span className="text-[8px] font-bold font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                  STATUS: {selectedAgentExec ? selectedAgentExec.status : 'IDLE'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans bg-black/40 p-3.5 rounded-xl border border-zinc-900/60 shadow-inner">
              {selectedAgentDef?.description || 'Scoped heuristics worker analyzing telemetries.'}
            </p>

            {/* Scope Heuristics */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Scoped Heuristics Applied</span>
              <div className="flex flex-col gap-2">
                {(selectedAgentDef?.heuristics || []).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60 hover:border-zinc-800 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full ${getAgentAccentColor(selectedAgentType).text} bg-current opacity-70`} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emitted Signals */}
            <div className="flex flex-col gap-2.5 mt-1">
              <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Emitted Friction Signals</span>
              {selectedAgentSignals.length === 0 ? (
                <div className="text-[10px] text-zinc-650 italic bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-center font-mono">
                  No signals emitted.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedAgentSignals.map((sig) => (
                    <div key={sig.id} className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col gap-2 font-mono text-[9px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300 font-bold truncate pr-2 tracking-tight">{sig.signalType}</span>
                        <span className={`font-bold bg-[#09090b] px-2 py-0.5 rounded border ${
                          sig.intensity > 0.7 ? 'text-rose-400 border-rose-500/20' :
                          sig.intensity > 0.4 ? 'text-orange-400 border-orange-500/20' :
                          'text-[#6366f1] border-[#6366f1]/20'
                        }`}>
                          {sig.intensity.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#09090b] rounded-full overflow-hidden border border-zinc-900">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-[#6366f1] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${sig.intensity * 100}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scope reasoning traces */}
            <div className="flex flex-col gap-2.5 mt-1">
              <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Scoped Reasoning Timeline</span>
              {selectedAgentTraces.length === 0 ? (
                <div className="text-[10px] text-zinc-650 italic bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-center font-mono">
                  No trace events computed.
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 border-l border-zinc-900 pl-4 ml-1.5">
                  {selectedAgentTraces.map((trace) => (
                    <div key={trace.id} className="relative py-0.5 flex flex-col gap-1">
                      <div className="absolute left-[-20px] top-1.5 w-2 h-2 rounded-full border-2 border-zinc-950 shadow-sm" style={{
                        backgroundColor: getAgentAccentColor(selectedAgentType).hex
                      }} />
                      <span className="text-[8px] font-black font-mono uppercase tracking-widest" style={{
                        color: getAgentAccentColor(selectedAgentType).hex
                      }}>{trace.stepType}</span>
                      <p className="text-[10px] text-zinc-300 leading-relaxed font-sans">{trace.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Cross-Agent Correlations Map & Findings Viewer with Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Findings Viewer (2/3 Column) */}
        <div className="lg:col-span-2 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#6366f1]" /> Local Usability Finding Filters
            </span>
            
            {/* Severity Filters */}
            <div className="flex flex-wrap gap-1 bg-[#050507] p-1 rounded-lg border border-zinc-900">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                const active = findingSeverityFilter === sev;
                const count = sev === 'ALL' ? allFindingsFlat.length : allFindingsFlat.filter(f => f.severity === sev).length;
                
                return (
                  <button
                    key={sev}
                    onClick={() => setFindingSeverityFilter(sev)}
                    className={`px-3 py-1 rounded text-[8px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                      active 
                        ? 'bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/20' 
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    <span>{sev}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[7px] font-bold ${
                      active ? 'bg-[#6366f1]/20 text-[#6366f1]' : 'bg-zinc-900 text-zinc-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredFindings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic font-mono">
              No findings matched the selected severity filter.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedFindings[finding.id];
                const def = agentDefinitions[finding.agentType];
                const accent = getAgentAccentColor(finding.agentType);
                
                return (
                  <div key={finding.id} className="border border-zinc-900 bg-zinc-950/40 rounded-xl overflow-hidden hover:border-zinc-800 transition-colors">
                    <div 
                      className="p-4 flex justify-between items-start gap-4 cursor-pointer"
                      onClick={() => toggleFinding(finding.id)}
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[8px] px-2 py-0.5 rounded-full border font-bold font-mono tracking-wider ${getSeverityColor(finding.severity)}`}>
                            {finding.severity}
                          </span>
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${accent.border} ${accent.text} ${accent.bg} font-bold flex items-center gap-1`}>
                            {def?.icon} {def?.name || formatAgentName(finding.agentType)}
                          </span>
                          <span className="text-xs font-bold text-white leading-snug ml-1">{finding.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{finding.description}</p>
                      </div>
                      <span className="text-zinc-500 mt-1 flex-shrink-0 bg-zinc-900/60 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#070709]/70 border-t border-zinc-900"
                        >
                          <div className="p-4 flex flex-col gap-3 font-mono text-[9px] text-zinc-400">
                            <div>
                              <span className="text-zinc-500 font-bold font-sans">Observation Scope:</span>{' '}
                              <span className="bg-[#09090b] px-2 py-0.5 rounded border border-zinc-800/60 text-[#6366f1]">{finding.findingType}</span>
                            </div>
                            <div className="leading-relaxed">
                              <span className="text-zinc-500 font-bold font-sans block mb-1">Evidence Context Summary:</span>
                              <pre className="whitespace-pre-wrap font-mono text-zinc-300 leading-relaxed bg-[#050507] p-3 rounded-lg border border-zinc-900 text-[9px]">
                                {finding.evidence}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cross-Agent Finding Correlation Graph Links (1/3 Column) */}
        <div className="lg:col-span-1 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/10 to-transparent" />
          
          <div>
            <div className="flex justify-between items-center mb-5">
              <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Cross-Agent Findings Correlations</span>
              <span className="text-[8px] text-[#6366f1] font-mono bg-[#6366f1]/10 px-2 py-0.5 rounded border border-[#6366f1]/20 font-bold">{memoryCorrelations.length} LINKS</span>
            </div>

            {memoryCorrelations.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic">
                No linkages detected. Finish audit loop to map.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {memoryCorrelations.map((corr) => (
                  <div key={corr.id} className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col gap-2.5 relative">
                    <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-[#6366f1]" />
                    <div className="flex justify-between items-start font-mono text-[8px] text-zinc-500">
                      <span className="font-bold text-[#6366f1] bg-[#6366f1]/5 border border-[#6366f1]/10 px-1.5 py-0.2 rounded uppercase">
                        {corr.correlationType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {Math.round(corr.confidence * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-300 leading-normal">{corr.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-zinc-900/60 pt-3 mt-4 text-[9px] text-zinc-500 font-mono leading-relaxed">
            The correlation engine evaluates overlapping triggers chronologically to compile these linked diagnostics.
          </div>
        </div>
      </div>

      {/* Bottom Section: Memory Snapshots Explorer vs Telemetry Trace Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Shared Memory Snapshots (1/3 Column) */}
        <div className="lg:col-span-1 bg-[#09090b]/80 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#6366f1]/15 to-transparent" />
          
          <div className="flex justify-between items-center mb-5 border-b border-zinc-900/80 pb-3">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#6366f1]" /> Memory Snapshots Feed
            </span>
            <span className="text-[8px] text-zinc-500 font-mono">{memorySnapshots.length} Milestones</span>
          </div>

          {memorySnapshots.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic font-mono flex-grow flex items-center justify-center">
              No snapshots compiled yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-1 flex-grow">
              {memorySnapshots.map((snap) => {
                const dateStr = new Date(snap.createdAt).toLocaleTimeString();
                
                return (
                  <div key={snap.id} className="bg-zinc-950/60 border border-zinc-900/60 p-3.5 rounded-xl flex flex-col gap-2 hover:border-zinc-800 transition-colors shadow-sm">
                    <div className="flex justify-between items-center font-mono text-[9px] border-b border-zinc-900/40 pb-2">
                      <span className="font-extrabold text-[#6366f1] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#6366f1]" /> {snap.snapshotType}
                      </span>
                      <span className="text-zinc-600 font-mono">{dateStr}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-[9px] font-mono text-zinc-400">
                      {snap.payload?.agentExecutions ? (
                        snap.payload.agentExecutions.map((exec: any) => {
                          const accent = getAgentAccentColor(exec.agentType);
                          return (
                            <div key={exec.id} className="flex justify-between items-center">
                              <span className={accent.text}>{formatAgentName(exec.agentType)}</span>
                              <span className="text-zinc-500">
                                {exec.status} ({exec.findingsCount} findings)
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <pre className="text-[8px] text-zinc-500 whitespace-pre-wrap max-w-full overflow-x-auto">
                          {JSON.stringify(snap.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Telemetry and Trace Streams with Filters (2/3 Column) */}
        <div className="lg:col-span-2 bg-[#050507]/90 border border-zinc-900 rounded-2xl overflow-hidden flex flex-col min-h-[360px] shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/15 to-transparent" />
          
          {/* Header */}
          <div className="bg-zinc-950/80 border-b border-zinc-900 px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#6366f1] animate-pulse" />
              <span className="text-xs font-black text-white tracking-wider font-mono uppercase">Telemetry & Trace Streams</span>
            </div>

            {/* Local log level filters */}
            <div className="flex flex-wrap gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-900">
              {(['ALL', 'INFO', 'SIGNALS', 'DELEGATION', 'RECOVERY'] as const).map((level) => {
                const active = terminalFilter === level;
                return (
                  <button
                    key={level}
                    onClick={() => setTerminalFilter(level)}
                    className={`px-3 py-1 text-[8px] font-mono font-bold rounded transition-all uppercase tracking-wider ${
                      active 
                        ? 'bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20' 
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            
            {/* View selectors */}
            <div className="flex gap-1">
              {(['timeline', 'memory', 'traces'] as const).map((tab) => {
                const active = activeConsoleTab === tab;
                const label = tab === 'timeline' ? 'Audit Log' : tab === 'memory' ? 'Memory Stream' : 'Traces';
                
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveConsoleTab(tab)}
                    className={`px-2.5 py-1 rounded text-[8px] font-mono font-bold ${
                      active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 font-mono text-[9px] leading-relaxed overflow-y-auto max-h-[350px] flex-grow flex flex-col gap-3 bg-black/10 select-text">
            
            {activeConsoleTab === 'timeline' && filteredConsoleLogs.length === 0 && (
              <div className="text-zinc-650 italic p-6 text-center font-mono">
                No telemetry events match current level filter.
              </div>
            )}

            {activeConsoleTab === 'memory' && memoryEvents.length === 0 && (
              <div className="text-zinc-650 italic p-6 text-center font-mono font-sans">
                Shared memory stream is empty. Execute audit mesh to populate chronologies.
              </div>
            )}

            {activeConsoleTab === 'traces' && reasoning.length === 0 && (
              <div className="text-zinc-650 italic p-6 text-center font-mono">
                No reasoning traces recorded.
              </div>
            )}

            {/* Render legacy / standard timeline events */}
            {activeConsoleTab === 'timeline' && filteredConsoleLogs.map((event) => {
              const dateStr = new Date(event.timestamp).toLocaleTimeString();
              const colors = getAgentAccentColor(event.fromAgent || '');
              
              return (
                <div key={event.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1 hover:bg-white/[0.01] transition-colors rounded-r-lg">
                  <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                  <span className="flex-shrink-0 mt-0.5 bg-zinc-950 p-1 rounded border border-zinc-900">{getEventIcon(event.type)}</span>
                  <div className="flex flex-col gap-1 w-full font-sans">
                    <div>
                      {event.source === 'shared_context' ? (
                        <span className="text-[#6366f1] font-black font-mono text-[9px] tracking-wider bg-[#6366f1]/5 px-2 py-0.5 rounded border border-[#6366f1]/10">SHARED_CONTEXT</span>
                      ) : (
                        <span className={`font-black font-mono text-[9px] tracking-wider px-2 py-0.5 rounded border ${colors.border} ${colors.text} ${colors.bg}`}>
                          {event.fromAgent} ➜ {event.toAgent}
                        </span>
                      )}
                      <span className="text-zinc-200 font-extrabold font-mono text-[9px] ml-2.5">[{event.type}]</span>
                    </div>
                    <RenderPayload payload={event.payload} />
                  </div>
                </div>
              );
            })}

            {/* Render memory timeline chronologies */}
            {activeConsoleTab === 'memory' && memoryTimeline.map((item) => {
              const dateStr = new Date(item.timestamp).toLocaleTimeString();
              const isEvent = item.type === 'EVENT';
              const isSnapshot = item.type === 'SNAPSHOT';
              const colors = getAgentAccentColor(item.source);

              return (
                <div key={item.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1 hover:bg-white/[0.01] transition-colors rounded-r-lg">
                  <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                  <span className="flex-shrink-0 mt-0.5 bg-zinc-950 p-1 rounded border border-zinc-900">
                    {isSnapshot ? <Database className="w-3.5 h-3.5 text-[#6366f1]" /> : getEventIcon(item.title)}
                  </span>
                  
                  <div className="flex flex-col gap-1 w-full font-sans">
                    <div>
                      <span className={`font-black font-mono text-[9px] tracking-wider px-2 py-0.5 rounded border ${
                        isSnapshot ? 'bg-[#6366f1]/10 border-[#6366f1]/20 text-[#6366f1]' : `${colors.border} ${colors.text} ${colors.bg}`
                      }`}>
                        {isSnapshot ? 'SYSTEM SNAPSHOT' : item.source}
                      </span>
                      <span className="text-zinc-200 font-extrabold font-mono text-[9px] ml-2.5">{item.title}</span>
                    </div>
                    <p className="text-zinc-400 text-xs bg-zinc-950/80 p-2.5 rounded border border-zinc-900/60 leading-relaxed shadow-sm mt-0.5">
                      {item.description}
                    </p>
                    {item.payload && Object.keys(item.payload).length > 0 && (
                      <RenderPayload payload={item.payload} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Render detailed reasoning traces */}
            {activeConsoleTab === 'traces' && reasoning.map((trace) => {
              const dateStr = new Date(trace.timestamp).toLocaleTimeString();
              const def = agentDefinitions[trace.agentType];
              const accent = getAgentAccentColor(trace.agentType);

              return (
                <div key={trace.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1 hover:bg-white/[0.01] transition-colors rounded-r-lg font-sans">
                  <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                  <span className={`flex-shrink-0 mt-0.5 p-1 rounded border ${accent.border} ${accent.text} bg-zinc-950`}>
                    {def?.icon || <Cpu className="w-3.5 h-3.5" />}
                  </span>
                  <div className="flex flex-col gap-1 w-full text-xs">
                    <div>
                      <span className={`font-black font-mono uppercase tracking-widest text-[9px] px-2 py-0.5 rounded border ${accent.border} ${accent.text} ${accent.bg}`}>
                        {def?.name || formatAgentName(trace.agentType)}
                      </span>
                      <span className="text-zinc-650 font-mono ml-2">➜</span>
                      <span className="text-zinc-200 font-black font-mono text-[9px] ml-2 tracking-wide">{trace.stepType}</span>
                    </div>
                    <div className="text-zinc-300 text-xs bg-zinc-950 p-3 rounded-xl border border-zinc-900/60 leading-relaxed shadow-sm mt-1">
                      {trace.summary}
                    </div>
                    {trace.evidence && (
                      <pre className="text-zinc-400 text-[8px] bg-black/60 p-3 rounded-xl border border-zinc-900 overflow-x-auto max-w-full font-mono mt-1 leading-normal">
                        {trace.evidence}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
