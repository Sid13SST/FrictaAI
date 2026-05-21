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
  FileText
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

interface CorrelationLink {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  evidence: string;
  sourceFindingId?: string;
  targetFindingId?: string;
}

const RenderPayload: React.FC<{ payload: any }> = ({ payload }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return null;
  }

  const { description, ...otherProps } = payload;
  const hasOtherProps = Object.keys(otherProps).length > 0;

  return (
    <div className="mt-1 flex flex-col gap-1.5 w-full font-sans">
      {description && (
        <div className="text-zinc-200 text-xs bg-zinc-950 p-2.5 rounded border border-zinc-900 leading-relaxed shadow-sm">
          {description}
        </div>
      )}
      
      {hasOtherProps && (
        <div className="flex flex-col gap-1">
          {!showRaw ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/20 p-2.5 rounded border border-zinc-900/60">
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
                    <span className="text-[#a1a1aa] font-semibold">{formattedKey}:</span>
                    <span className="text-zinc-300 font-mono bg-[#141417] px-1.5 py-0.5 rounded border border-zinc-800/40">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="text-zinc-400 text-[10px] bg-black/44 p-2.5 rounded border border-zinc-900 overflow-x-auto max-w-full font-mono">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[9px] text-purple-400 hover:text-purple-300 transition-colors font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-purple-500/10 hover:border-purple-500/20 bg-purple-500/5 mt-0.5"
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
  const [correlations, setCorrelations] = useState<CorrelationLink[]>([]);
  
  const [selectedAgentType, setSelectedAgentType] = useState<string>('VISUAL_AGENT');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'timeline' | 'context' | 'messages' | 'traces'>('timeline');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

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
          setCorrelations([]);
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

      // Fetch specialized telemetry (findings, signals, traces, correlations)
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

      const correlationsRes = await fetch(`${backendBase}/api/agents/${sessionId}/correlations`);
      if (correlationsRes.ok) {
        const data = await correlationsRes.json();
        setCorrelations(data.correlations || []);
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
  }, [timeline, reasoning, activeConsoleTab]);

  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getAgentStatusBadge = (status: AgentExecution['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">COMPLETED</span>;
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 animate-pulse">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            RUNNING
          </span>
        );
      case 'QUEUED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">QUEUED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">IDLE</span>;
    }
  };

  const getAgentCardColorClass = (type: string, status: AgentExecution['status']) => {
    const isSelected = selectedAgentType === type;
    const borderClass = isSelected ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-zinc-800/80 hover:border-zinc-700';
    
    switch (status) {
      case 'COMPLETED':
        return `${borderClass} bg-purple-950/5 text-purple-200`;
      case 'RUNNING':
        return `${borderClass} bg-emerald-950/10 border-emerald-500/40 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.06)]`;
      case 'FAILED':
        return `${borderClass} bg-red-950/10 border-red-500/40 text-red-200`;
      case 'QUEUED':
        return `${borderClass} bg-amber-950/5 text-amber-200`;
      default:
        return `${borderClass} bg-zinc-900/20 text-zinc-500`;
    }
  };

  const formatAgentName = (type: string) => {
    return type.replace(/_AGENT/g, '').replace(/_/g, ' ');
  };

  const getEventIcon = (type: string) => {
    if (type.includes('FAIL') || type.includes('ERROR')) return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    if (type.includes('COMPLETED') || type.includes('SUCCESS') || type.includes('SYNC_COMPLETED')) return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    if (type.includes('SPAWNED')) return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
    if (type.includes('DELEGATED') || type.includes('ASSIGN')) return <Layers className="w-3.5 h-3.5 text-purple-400" />;
    if (type.includes('RECOVERY') || type.includes('RETRY')) return <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
    return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  // Agent descriptions, heuristics, and icons helper definitions
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
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-zinc-400 shadow-md">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
        <span className="text-xs font-mono tracking-wider text-purple-400">LOADING COOPERATIVE INTEL CONSOLE...</span>
      </div>
    );
  }

  if (!orchestrationSession) {
    return (
      <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[450px] relative overflow-hidden shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 shadow-[0_0_24px_rgba(168,85,247,0.15)] animate-pulse">
          <Brain className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Distributed UX Research Organization</h3>
        <p className="text-xs text-zinc-400 max-w-[500px] leading-relaxed mb-8">
          Deploy Fricta's specialized investigative agents (Visual, Discoverability, Navigation, Onboarding, Cognitive, and Workflow) to analyze your session. The system runs scoped, explainable reasoning traces to diagnose friction.
        </p>

        <button
          onClick={handleStartOrchestration}
          disabled={starting}
          className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed uppercase tracking-wider font-mono"
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
          <div className="mt-5 p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono max-w-[420px]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Grouped executions list
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

  // Selected agent details for Inspector
  const selectedAgentDef = agentDefinitions[selectedAgentType];
  const selectedAgentExec = agents.find(a => a.agentType === selectedAgentType);
  const selectedAgentSignals = signals.filter(s => s.agentType === selectedAgentType);
  const selectedAgentTraces = reasoning.filter(r => r.agentType === selectedAgentType);
  const selectedAgentFindings = findings[selectedAgentType] || [];

  // Filter console data based on selected tab
  const filteredTimeline = timeline.filter(event => {
    if (activeConsoleTab === 'timeline') return true;
    if (activeConsoleTab === 'context') return event.source === 'shared_context';
    if (activeConsoleTab === 'messages') return event.source === 'delegation';
    return true;
  });

  const hasFailuresOrRetries = agents.some(a => a.status === 'FAILED' || (a.metadata && (a.metadata.error || a.metadata.retryCount > 0)));
  const totalFindings = Object.values(findings).reduce((acc, fList) => acc + fList.length, 0);

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
      return 'stroke-purple-500 stroke-[2px] flow-line-active opacity-100 filter drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]';
    }
    if (fromStatus === 'COMPLETED' && toStatus === 'COMPLETED') {
      return 'stroke-purple-500/40 stroke-[1.5px] opacity-70';
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
      return 'stroke-emerald-400 stroke-[1.5px] flow-line-active-fast opacity-100 filter drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]';
    }
    if (status === 'COMPLETED') {
      return 'stroke-purple-500/20 stroke-[1px] opacity-30';
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
        .flow-line-active-fast {
          stroke-dasharray: 4, 3;
          animation: flow-line-dash 0.8s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .glow-emerald-strong {
          filter: drop-shadow(0 0 8px rgba(94, 210, 156, 0.45));
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-radar {
          animation: radar-sweep 5s linear infinite;
          transform-origin: 50px 50px;
        }
      `}} />

      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#5ed29c]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />
      
      {/* Header and Quick Scorecard */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#5ed29c] to-transparent opacity-80" />
        
        <div className="flex flex-col gap-1 pl-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#5ed29c] bg-[#5ed29c]/10 px-2.5 py-0.5 rounded-full border border-[#5ed29c]/20 uppercase tracking-widest font-mono">
              Research Organization Online
            </span>
            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider ${
              orchestrationSession.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              orchestrationSession.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' :
              orchestrationSession.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {orchestrationSession.status}
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2 mt-1">
            Cooperative Agent Mesh Console
          </h2>
          <span className="text-zinc-500 font-mono text-[9px]">Session Ref: {orchestrationSession.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-zinc-950/80 px-5 py-3 rounded-xl border border-zinc-900">
          <div className="flex flex-col pr-5 border-r border-zinc-800 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Run Time</span>
            <span className="text-xs font-mono text-zinc-200 mt-1 font-semibold">
              {orchestrationSession.completedAt && orchestrationSession.startedAt
                ? `${Math.round((new Date(orchestrationSession.completedAt).getTime() - new Date(orchestrationSession.startedAt).getTime()) / 1000)}s`
                : orchestrationSession.startedAt
                ? 'Running...'
                : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col pr-5 border-r border-zinc-800 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Signals Emitted</span>
            <span className="text-xs font-mono text-zinc-200 mt-1 font-semibold">{signals.length} triggers</span>
          </div>
          <div className="flex flex-col pr-5 border-r border-zinc-800 text-center md:text-left">
            <span className="text-[8px] text-zinc-500 uppercase font-black font-mono tracking-wider">Findings Compiled</span>
            <span className="text-xs font-mono text-zinc-200 mt-1 font-semibold">{totalFindings} findings</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleStartOrchestration}
              disabled={starting || orchestrationSession.status === 'RUNNING'}
              className="px-4 py-2 rounded-lg bg-[#5ed29c] hover:bg-[#6edba8] disabled:opacity-50 text-[10px] font-bold text-[#070b0a] uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(94,210,156,0.2)] hover:shadow-[0_0_20px_rgba(94,210,156,0.3)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${starting || orchestrationSession.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              <span>RE-RUN AUDIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Failures & Recovery Diagnostics Panel */}
      {hasFailuresOrRetries && (
        <div className="bg-gradient-to-r from-red-950/20 to-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4 items-start shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500" />
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Self-Healing Diagnostics Event</h4>
            <p className="text-zinc-400 leading-relaxed">
              Execution anomalies were handled by the recovery coordinator. Automatic retries or containment strategies succeeded in saving the pipeline state.
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

      {/* Coordinated Agent Mesh SVG Graph */}
      <div className="relative w-full overflow-hidden bg-zinc-950/70 border border-zinc-900 rounded-2xl p-6 shadow-2xl flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider font-mono">Pipeline Delegation Topology & Status</span>
          <span className="text-[8px] text-zinc-600 font-mono">Click a node to inspect its scope</span>
        </div>

        <div className="overflow-x-auto w-full">
          <svg viewBox="0 0 800 260" className="w-full min-w-[760px] h-auto overflow-visible select-none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
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

            {/* Sequential Flow Lines (Foreground) */}
            <path d={getBezierPath(nodeCoords.VISUAL_AGENT.x, nodeCoords.VISUAL_AGENT.y, nodeCoords.DISCOVERABILITY_AGENT.x, nodeCoords.DISCOVERABILITY_AGENT.y)} fill="none" className={getPathClass('VISUAL_AGENT', 'DISCOVERABILITY_AGENT')} />
            <path d={getBezierPath(nodeCoords.DISCOVERABILITY_AGENT.x, nodeCoords.DISCOVERABILITY_AGENT.y, nodeCoords.NAVIGATION_AGENT.x, nodeCoords.NAVIGATION_AGENT.y)} fill="none" className={getPathClass('DISCOVERABILITY_AGENT', 'NAVIGATION_AGENT')} />
            <path d={getBezierPath(nodeCoords.NAVIGATION_AGENT.x, nodeCoords.NAVIGATION_AGENT.y, nodeCoords.ONBOARDING_AGENT.x, nodeCoords.ONBOARDING_AGENT.y)} fill="none" className={getPathClass('NAVIGATION_AGENT', 'ONBOARDING_AGENT')} />
            <path d={getBezierPath(nodeCoords.ONBOARDING_AGENT.x, nodeCoords.ONBOARDING_AGENT.y, nodeCoords.COGNITIVE_AGENT.x, nodeCoords.COGNITIVE_AGENT.y)} fill="none" className={getPathClass('ONBOARDING_AGENT', 'COGNITIVE_AGENT')} />
            <path d={getBezierPath(nodeCoords.COGNITIVE_AGENT.x, nodeCoords.COGNITIVE_AGENT.y, nodeCoords.WORKFLOW_AGENT.x, nodeCoords.WORKFLOW_AGENT.y)} fill="none" className={getPathClass('COGNITIVE_AGENT', 'WORKFLOW_AGENT')} />
            <path d={getBezierPath(nodeCoords.WORKFLOW_AGENT.x, nodeCoords.WORKFLOW_AGENT.y, nodeCoords.UX_ORCHESTRATOR.x, nodeCoords.UX_ORCHESTRATOR.y)} fill="none" className={getPathClass('WORKFLOW_AGENT', 'UX_ORCHESTRATOR')} />

            {/* Nodes */}
            {orderedAgents.map((ag) => {
              const hasExec = ag.execution;
              const status = hasExec ? hasExec.status : 'IDLE';
              const isSelected = selectedAgentType === ag.type;
              const def = agentDefinitions[ag.type];
              const coord = nodeCoords[ag.type];

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
                          ? 'border-purple-500 bg-purple-950/30 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.35)] glow-purple-strong' 
                          : status === 'RUNNING'
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse'
                          : status === 'COMPLETED'
                          ? 'border-purple-600/40 bg-zinc-900/80 text-purple-300 hover:border-purple-500/40'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-xl border ${
                          selectedAgentType === 'UX_ORCHESTRATOR' 
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                            : 'bg-zinc-950/80 border-zinc-850 text-zinc-400'
                        }`}>
                          <Brain className="w-4 h-4" />
                        </div>
                        <span className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-emerald-400 animate-ping' : status === 'COMPLETED' ? 'bg-purple-400' : 'bg-zinc-600'}`} />
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
                        ? 'border-purple-500 bg-purple-950/20 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.25)]' 
                        : status === 'RUNNING'
                        ? 'border-emerald-500 bg-emerald-950/20 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse'
                        : status === 'COMPLETED'
                        ? 'border-zinc-850 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80 text-zinc-300'
                        : status === 'FAILED'
                        ? 'border-rose-500/50 bg-rose-950/15 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                        : 'border-zinc-900/80 bg-zinc-950/40 opacity-60 text-zinc-500 hover:opacity-85 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`p-1.5 rounded-lg border text-[10px] ${
                        isSelected 
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
                          : status === 'RUNNING'
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 animate-spin-slow'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-400'
                      }`}>
                        {def?.icon || <Cpu className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          backgroundColor: status === 'COMPLETED' ? '#a855f7' : status === 'RUNNING' ? '#10b981' : status === 'FAILED' ? '#f43f5e' : '#52525b'
                        }} />
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className="text-[10px] font-extrabold truncate tracking-tight">{def?.name || formatAgentName(ag.type)}</div>
                      <div className="text-[8px] font-semibold font-mono uppercase tracking-wider text-zinc-500 mt-0.5">{status}</div>
                    </div>
                  </motion.div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Main Grid: Inspector vs. Grouped Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Findings, Correlations */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Specialized Findings Panels */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
            <div className="flex justify-between items-center mb-5">
              <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Specialized Observations & Evidence</span>
              <span className="text-[9px] text-purple-400 font-mono bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 font-bold">{totalFindings} findings</span>
            </div>

            {totalFindings === 0 ? (
              <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic">
                No observations compiled yet. Click "DEPLOY UX RESEARCH MESH" to analyze.
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(findings).map(([agentType, fList]) => {
                  if (fList.length === 0) return null;
                  const def = agentDefinitions[agentType];

                  return (
                    <div key={agentType} className="border border-zinc-900/80 bg-zinc-900/15 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-900 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">{def?.icon || <Cpu className="w-3.5 h-3.5" />}</span>
                          <span className="text-[10px] font-black text-zinc-300 font-mono uppercase tracking-wider">{def?.name || formatAgentName(agentType)}</span>
                        </div>
                        <span className="text-[8px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono font-bold">{fList.length} ITEMS</span>
                      </div>

                      <div className="divide-y divide-zinc-900/60">
                        {fList.map((finding) => {
                          const isExpanded = expandedFindings[finding.id];
                          return (
                            <div key={finding.id} className="p-4 hover:bg-zinc-900/10 transition-colors">
                              <div 
                                className="flex justify-between items-start gap-4 cursor-pointer"
                                onClick={() => toggleFinding(finding.id)}
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full border font-bold font-mono tracking-wider ${getSeverityColor(finding.severity)}`}>
                                      {finding.severity}
                                    </span>
                                    <span className="text-xs font-bold text-white leading-snug">{finding.title}</span>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{finding.description}</p>
                                </div>
                                <span className="text-zinc-500 mt-1 flex-shrink-0 bg-zinc-900/80 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </span>
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3.5 pt-3.5 border-t border-zinc-900/60 flex flex-col gap-2 font-mono text-[9px] text-zinc-400 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-900">
                                      <div>
                                        <span className="text-zinc-500 font-bold font-sans">Observation Scope:</span>{' '}
                                        <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/40 text-purple-400">{finding.findingType}</span>
                                      </div>
                                      <div className="leading-relaxed mt-1">
                                        <span className="text-zinc-500 font-bold font-sans block mb-1">Evidence Summary:</span>
                                        <pre className="whitespace-pre-wrap font-mono text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-zinc-900 text-[9px]">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cross-Agent Correlations map */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />
            <div className="flex justify-between items-center mb-5">
              <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Cross-Agent Evidentiary Correlations</span>
              <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20 font-bold">{correlations.length} relationships</span>
            </div>

            {correlations.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs italic">
                No cross-agent correlations detected. Compile agent findings to map links.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {correlations.map((corr) => {
                  const srcDef = agentDefinitions[corr.sourceAgent];
                  const tgtDef = agentDefinitions[corr.targetAgent];

                  return (
                    <motion.div 
                      whileHover={{ y: -2 }}
                      key={corr.id} 
                      className="bg-zinc-900/20 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 transition-colors shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-purple-500/20 to-indigo-500/20" />
                      <div>
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-2.5">
                          <span className="flex items-center gap-1 text-purple-400 font-bold bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                            {srcDef?.icon} {srcDef?.name || formatAgentName(corr.sourceAgent)}
                          </span>
                          <span className="text-zinc-600">➜</span>
                          <span className="flex items-center gap-1 text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                            {tgtDef?.icon} {tgtDef?.name || formatAgentName(corr.targetAgent)}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          {corr.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">{corr.description}</p>
                      </div>

                      <div className="border-t border-zinc-900/60 pt-3 mt-1 flex justify-between items-center text-[9px] font-mono">
                        <span className="text-zinc-500 font-bold">CONFIDENCE MATCH</span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {Math.round(corr.confidence * 100)}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Scope Inspector Panel */}
        <div className="lg:col-span-1 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
          <div className="flex justify-between items-center mb-5">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Investigation Scope Inspector</span>
            <span className="text-[8px] text-purple-400 font-mono bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-widest animate-pulse">Active Scan</span>
          </div>

          <div className="flex flex-col gap-5">
            <div className="p-3.5 bg-zinc-900/30 rounded-xl border border-zinc-900 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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
                  <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono bg-zinc-900/25 p-2.5 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Computed Intensity Signals */}
            <div className="flex flex-col gap-2.5 mt-1">
              <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Emitted Friction Signals</span>
              {selectedAgentSignals.length === 0 ? (
                <div className="text-[10px] text-zinc-600 italic bg-zinc-900/10 p-4 rounded-xl border border-zinc-900/60 text-center font-mono">
                  No intensity triggers emitted.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedAgentSignals.map((sig) => (
                    <div key={sig.id} className="bg-zinc-900/25 p-3.5 rounded-xl border border-zinc-900 flex flex-col gap-2 font-mono text-[9px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300 font-bold truncate pr-2 tracking-tight">{sig.signalType}</span>
                        <span className={`font-bold bg-zinc-950 px-2 py-0.5 rounded border ${
                          sig.intensity > 0.7 ? 'text-rose-400 border-rose-500/20' :
                          sig.intensity > 0.4 ? 'text-orange-400 border-orange-500/20' :
                          'text-emerald-400 border-emerald-500/20'
                        }`}>
                          {sig.intensity.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${sig.intensity * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Telemetry Metrics */}
            {selectedAgentDef?.metricsTemplate && selectedAgentDef.metricsTemplate.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Heuristic Engine Metrics</span>
                <div className="grid grid-cols-1 gap-2.5 bg-zinc-900/15 p-4 rounded-xl border border-zinc-900">
                  {selectedAgentDef.metricsTemplate.map((mt, i) => {
                    let matchedVal: any = null;
                    selectedAgentSignals.forEach((sig) => {
                      if (sig.metadata && sig.metadata[mt.key] !== undefined) {
                        matchedVal = sig.metadata[mt.key];
                      }
                    });

                    return (
                      <div key={i} className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-zinc-500 font-bold">{mt.label}</span>
                        <span className="text-zinc-200 font-black bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-900">{mt.format(matchedVal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Local Reasoning Traces */}
            <div className="flex flex-col gap-2.5 mt-1">
              <span className="text-[8px] uppercase font-black text-zinc-500 font-mono tracking-wider">Scoped Reasoning Timeline</span>
              {selectedAgentTraces.length === 0 ? (
                <div className="text-[10px] text-zinc-600 italic bg-zinc-900/10 p-4 rounded-xl border border-zinc-900/60 text-center font-mono">
                  No trace events computed.
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 border-l border-zinc-900/85 pl-4 ml-1.5">
                  {selectedAgentTraces.map((trace) => (
                    <div key={trace.id} className="relative py-0.5 flex flex-col gap-1">
                      <div className="absolute left-[-20px] top-1.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-zinc-950 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                      <span className="text-[8px] font-black text-purple-400 font-mono uppercase tracking-widest">{trace.stepType}</span>
                      <p className="text-[10px] text-zinc-300 leading-relaxed font-sans">{trace.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Console: Logs & Timelines */}
      <div className="bg-[#050507]/90 border border-zinc-900 rounded-2xl overflow-hidden flex flex-col min-h-[360px] shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
        {/* Terminal Header */}
        <div className="bg-zinc-950/80 border-b border-zinc-900 px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-black text-white tracking-wider font-mono uppercase">Telemetry & Trace Streams</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['timeline', 'context', 'messages', 'traces'].map((tab) => {
              const label = tab === 'timeline' ? 'Audit Timeline' : tab === 'context' ? 'Shared Context' : tab === 'messages' ? 'Exchange Logs' : 'Reasoning Traces';
              const active = activeConsoleTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveConsoleTab(tab as any)}
                  className={`px-3.5 py-1 text-[9px] font-mono font-bold rounded-lg transition-all uppercase tracking-wider ${
                    active 
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 font-mono text-[9px] leading-relaxed overflow-y-auto max-h-[350px] flex-grow flex flex-col gap-3.5 select-text bg-black/10">
          
          {activeConsoleTab !== 'traces' && filteredTimeline.length === 0 && (
            <div className="text-zinc-650 italic p-6 text-center font-mono">
              No telemetry events recorded for this session tab.
            </div>
          )}

          {activeConsoleTab === 'traces' && reasoning.length === 0 && (
            <div className="text-zinc-650 italic p-6 text-center font-mono">
              No reasoning traces recorded for this session.
            </div>
          )}

          {activeConsoleTab !== 'traces' && filteredTimeline.map((event, idx) => {
            const dateStr = new Date(event.timestamp).toLocaleTimeString();
            
            if (event.source === 'shared_context') {
              return (
                <div key={event.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1.5 hover:bg-white/[0.01] transition-colors rounded-r-lg">
                  <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                  <span className="flex-shrink-0 mt-0.5 bg-purple-500/10 p-1 rounded-md border border-purple-500/20">{getEventIcon(event.type)}</span>
                  <div className="flex flex-col gap-1 w-full font-sans">
                    <div>
                      <span className="text-purple-400 font-black font-mono text-[9px] tracking-wider bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">SHARED_CONTEXT</span>
                      <span className="text-zinc-600 font-mono ml-2">➜</span>
                      <span className="text-purple-300 font-extrabold font-mono text-[9px] ml-2">{event.type}</span>
                    </div>
                    <RenderPayload payload={event.payload} />
                  </div>
                </div>
              );
            } else {
              return (
                <div key={event.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1.5 hover:bg-white/[0.01] transition-colors rounded-r-lg">
                  <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                  <span className="flex-shrink-0 mt-0.5 bg-indigo-500/10 p-1 rounded-md border border-indigo-500/20">{getEventIcon(event.type)}</span>
                  <div className="flex flex-col gap-1 w-full font-sans">
                    <div>
                      <span className="text-blue-400 font-black font-mono text-[9px] tracking-wider bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">{event.fromAgent}</span>
                      <span className="text-zinc-600 font-mono ml-2">➜</span>
                      <span className="text-indigo-400 font-black font-mono text-[9px] ml-2 tracking-wider bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">{event.toAgent}</span>
                      <span className="text-zinc-550 font-mono text-[8px] ml-2">[{event.type}]</span>
                    </div>
                    <RenderPayload payload={event.payload} />
                  </div>
                </div>
              );
            }
          })}

          {activeConsoleTab === 'traces' && reasoning.map((trace) => {
            const dateStr = new Date(trace.timestamp).toLocaleTimeString();
            const def = agentDefinitions[trace.agentType];

            return (
              <div key={trace.id} className="flex gap-3 items-start border-l border-zinc-900 pl-4 py-1.5 hover:bg-white/[0.01] transition-colors rounded-r-lg font-sans">
                <span className="text-zinc-600 flex-shrink-0 font-mono text-[8px] mt-0.5">{dateStr}</span>
                <span className="flex-shrink-0 mt-0.5 text-purple-400 bg-purple-500/10 p-1 rounded-md border border-purple-500/20">{def?.icon || <Cpu className="w-3.5 h-3.5" />}</span>
                <div className="flex flex-col gap-1 w-full text-xs">
                  <div>
                    <span className="text-purple-400 font-black font-mono uppercase tracking-widest text-[9px] bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">{def?.name || formatAgentName(trace.agentType)}</span>
                    <span className="text-zinc-650 font-mono ml-2">➜</span>
                    <span className="text-zinc-200 font-black font-mono text-[9px] ml-2 tracking-wide">{trace.stepType}</span>
                  </div>
                  <div className="text-zinc-300 text-xs bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 leading-relaxed shadow-sm mt-1">
                    {trace.summary}
                  </div>
                  {trace.evidence && (
                    <pre className="text-zinc-400 text-[8px] bg-black/50 p-3 rounded-xl border border-zinc-900 overflow-x-auto max-w-full font-mono mt-1 leading-normal">
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
  );
};
