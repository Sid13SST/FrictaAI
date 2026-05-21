import React, { useState, useEffect, useRef } from 'react';
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
  Settings
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

const RenderPayload: React.FC<{ payload: any }> = ({ payload }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return null;
  }

  // If there's a description, we want to show it as the main text
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

                // Format camelCase or snake_case keys beautifully, e.g. "findingsCount" -> "Findings Count"
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
  const [activeConsoleTab, setActiveConsoleTab] = useState<'timeline' | 'context' | 'messages'>('timeline');
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
          // No session exists yet
          setOrchestrationSession(null);
          setAgents([]);
          setTimeline([]);
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

  // Poll orchestration session if running
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
        
        // Notify parent if completed successfully
        if (orchestrationSession?.status === 'COMPLETED' && onOrchestrationComplete) {
          onOrchestrationComplete();
        }
      }
    }
  }, [orchestrationSession]);

  // Scroll to bottom of terminal/timeline logs when new events arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline, activeConsoleTab]);

  const getAgentStatusBadge = (status: AgentExecution['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">COMPLETED</span>;
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RUNNING
          </span>
        );
      case 'QUEUED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">QUEUED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">IDLE</span>;
    }
  };

  const formatAgentName = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const getEventIcon = (type: string) => {
    if (type.includes('FAIL') || type.includes('ERROR')) return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    if (type.includes('COMPLETED') || type.includes('SUCCESS') || type.includes('SYNC_COMPLETED')) return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    if (type.includes('SPAWNED')) return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
    if (type.includes('DELEGATED') || type.includes('ASSIGN')) return <Layers className="w-3.5 h-3.5 text-purple-400" />;
    if (type.includes('RECOVERY') || type.includes('RETRY')) return <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
    return <Activity className="w-3.5 h-3.5 text-[#a1a1aa]" />;
  };

  if (loading) {
    return (
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] text-[#a1a1aa]">
        <RefreshCw className="w-8 h-8 text-[#f43f5e] animate-spin mb-4" />
        <span className="text-xs font-mono">Loading Orchestration Telemetry...</span>
      </div>
    );
  }

  // If no orchestration session exists, show landing screen to spawn one
  if (!orchestrationSession) {
    return (
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500/10 to-purple-500/30 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 shadow-[0_0_24px_rgba(168,85,247,0.15)] animate-pulse">
          <Brain className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Agent Orchestration Console</h3>
        <p className="text-xs text-[#a1a1aa] max-w-[480px] leading-relaxed mb-8">
          Fricta's Multi-Agent Orchestrator coordinates specialized investigatory agents to audit page layouts, simulate cognitive friction models, and synthesize unified grade sheets.
        </p>

        <button
          onClick={handleStartOrchestration}
          disabled={starting}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
        >
          {starting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Deploying Agent Mesh...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Deploy UX Investigative Agent Mesh</span>
            </>
          )}
        </button>
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono max-w-[400px]">
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  // Find agent executions
  const visualAgent = agents.find(a => a.agentType === 'VISUAL_AUDITOR');
  const cognitiveAgent = agents.find(a => a.agentType === 'COGNITIVE_SIMULATOR');
  const orchestratorAgent = agents.find(a => a.agentType === 'UX_ORCHESTRATOR');

  // Filter console data based on selected tab
  const filteredTimeline = timeline.filter(event => {
    if (activeConsoleTab === 'timeline') return true;
    if (activeConsoleTab === 'context') return event.source === 'shared_context';
    if (activeConsoleTab === 'messages') return event.source === 'delegation';
    return true;
  });

  // Check if any agent has a retry count or error in metadata
  const hasFailuresOrRetries = agents.some(a => a.status === 'FAILED' || (a.metadata && (a.metadata.error || a.metadata.retryCount > 0)));

  return (
    <div className="flex flex-col gap-6">
      {/* Telemetry Overview & Mesh Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Session Status Card */}
        <div className="lg:col-span-1 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          {orchestrationSession.status === 'RUNNING' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          )}
          {orchestrationSession.status === 'COMPLETED' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          )}
          {orchestrationSession.status === 'FAILED' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Session Coordination</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                orchestrationSession.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                orchestrationSession.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' :
                orchestrationSession.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {orchestrationSession.status}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 my-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#71717a]">Session ID</span>
                <span className="font-mono text-white text-[11px] select-all">{orchestrationSession.id.slice(0, 18)}...</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#71717a]">Triggered At</span>
                <span className="text-white font-mono text-[11px]">
                  {orchestrationSession.startedAt ? new Date(orchestrationSession.startedAt).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#71717a]">Duration</span>
                <span className="text-white font-mono text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                  {orchestrationSession.completedAt && orchestrationSession.startedAt
                    ? `${Math.round((new Date(orchestrationSession.completedAt).getTime() - new Date(orchestrationSession.startedAt).getTime()) / 1000)}s`
                    : orchestrationSession.startedAt
                    ? 'Running...'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleStartOrchestration}
              disabled={starting || orchestrationSession.status === 'RUNNING'}
              className="w-full py-2 px-3 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#222226] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${starting || orchestrationSession.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              <span>{orchestrationSession.status === 'RUNNING' ? 'Running Investigation...' : 'Re-Run Multi-Agent Audit'}</span>
            </button>
          </div>
        </div>

        {/* Agent Node Topology Graph */}
        <div className="lg:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Collaborative Agent Topology</span>
          </div>

          {/* Workflow nodes diagram */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 my-2 py-4 relative">
            
            {/* Visual background bridge lines for desktop */}
            <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-[#f43f5e]/20 z-0" />

            {/* Node 1: Visual Auditor */}
            <div className="flex flex-col items-center gap-2 z-10 w-full md:w-1/3">
              <div className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 ${
                visualAgent?.status === 'RUNNING' 
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)] animate-pulse' 
                  : visualAgent?.status === 'COMPLETED'
                  ? 'border-purple-500/50 bg-purple-950/10 text-purple-400'
                  : visualAgent?.status === 'FAILED'
                  ? 'border-red-500 bg-red-950/20 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
                  : 'border-[#222226] bg-[#0d0d0f] text-[#71717a]'
              }`}>
                <Eye className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white">Visual Auditor</p>
                <div className="mt-1">{visualAgent ? getAgentStatusBadge(visualAgent.status) : <span className="text-[10px] text-zinc-600 font-semibold uppercase">NOT SPAWNED</span>}</div>
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="md:block hidden z-10 text-[#71717a]">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Node 2: Cognitive Simulator */}
            <div className="flex flex-col items-center gap-2 z-10 w-full md:w-1/3">
              <div className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 ${
                cognitiveAgent?.status === 'RUNNING' 
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)] animate-pulse' 
                  : cognitiveAgent?.status === 'COMPLETED'
                  ? 'border-purple-500/50 bg-purple-950/10 text-purple-400'
                  : cognitiveAgent?.status === 'FAILED'
                  ? 'border-red-500 bg-red-950/20 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
                  : 'border-[#222226] bg-[#0d0d0f] text-[#71717a]'
              }`}>
                <Cpu className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white">Cognitive Simulator</p>
                <div className="mt-1">{cognitiveAgent ? getAgentStatusBadge(cognitiveAgent.status) : <span className="text-[10px] text-zinc-600 font-semibold uppercase">NOT SPAWNED</span>}</div>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="md:block hidden z-10 text-[#71717a]">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Node 3: UX Orchestrator */}
            <div className="flex flex-col items-center gap-2 z-10 w-full md:w-1/3">
              <div className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 ${
                orchestratorAgent?.status === 'RUNNING' 
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)] animate-pulse' 
                  : orchestratorAgent?.status === 'COMPLETED'
                  ? 'border-purple-500/50 bg-purple-950/10 text-purple-400'
                  : orchestratorAgent?.status === 'FAILED'
                  ? 'border-red-500 bg-red-950/20 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
                  : 'border-[#222226] bg-[#0d0d0f] text-[#71717a]'
              }`}>
                <Brain className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white">UX Orchestrator</p>
                <div className="mt-1">{orchestratorAgent ? getAgentStatusBadge(orchestratorAgent.status) : <span className="text-[10px] text-zinc-600 font-semibold uppercase">NOT SPAWNED</span>}</div>
              </div>
            </div>
            
          </div>
          
          <div className="mt-2 text-[10px] text-[#71717a] font-mono text-center">
            {orchestrationSession.status === 'RUNNING' 
              ? '✦ Deterministic investigation executing sequentially...' 
              : '✔ Pipeline execution complete. All intelligence outputs synchronized.'}
          </div>
        </div>

      </div>

      {/* Failures & Recovery Diagnostics Panel */}
      {hasFailuresOrRetries && (
        <div className="bg-gradient-to-r from-red-950/20 to-amber-950/10 border border-red-500/20 rounded-xl p-5 flex gap-4 items-start">
          <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h4 className="font-bold text-white">Observability Warning — Failure Recovery Triggered</h4>
            <p className="text-[#a1a1aa] leading-relaxed">
              The orchestrator intercepted execution abnormalities during agent cycles. Retries were initialized, and <strong>Partial Workflow Continuation safeguards</strong> were successfully applied to preserve overall system operation.
            </p>
            <div className="flex flex-col gap-2 mt-3 font-mono text-[11px]">
              {agents.map((agent) => {
                const hasError = agent.metadata && agent.metadata.error;
                const retryCount = agent.metadata?.retryCount || 0;
                if (!hasError && retryCount === 0) return null;
                return (
                  <div key={agent.id} className="p-2 rounded bg-black/40 border border-red-500/10 flex justify-between items-center">
                    <span>
                      <strong className="text-white">{formatAgentName(agent.agentType)}</strong>: {hasError ? `"${agent.metadata.error}"` : 'Success with retries'}
                    </span>
                    <span className="text-amber-400 font-semibold flex-shrink-0 ml-4">
                      Retry Attempts: {retryCount}/2
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Terminal Telemetry / Shared Context Console */}
      <div className="bg-[#0c0c0e] border border-[#222226] rounded-xl overflow-hidden flex flex-col min-h-[350px]">
        {/* Terminal Header */}
        <div className="bg-[#121214] border-b border-[#222226] px-5 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-[#f4f4f5] tracking-wide font-mono">Telemetry Streams</span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveConsoleTab('timeline')}
              className={`px-3 py-1 text-[11px] font-mono rounded transition-colors ${
                activeConsoleTab === 'timeline' 
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' 
                  : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              Chronological Audit Logs
            </button>
            <button
              onClick={() => setActiveConsoleTab('context')}
              className={`px-3 py-1 text-[11px] font-mono rounded transition-colors ${
                activeConsoleTab === 'context' 
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' 
                  : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              Shared Context Updates
            </button>
            <button
              onClick={() => setActiveConsoleTab('messages')}
              className={`px-3 py-1 text-[11px] font-mono rounded transition-colors ${
                activeConsoleTab === 'messages' 
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' 
                  : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              Agent Exchange Messaging
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[350px] flex-grow flex flex-col gap-3 select-text bg-[#070708]">
          {filteredTimeline.length === 0 ? (
            <div className="text-zinc-600 italic p-4 text-center">
              No telemetry events recorded for this session tab.
            </div>
          ) : (
            filteredTimeline.map((event, idx) => {
              const dateStr = new Date(event.timestamp).toLocaleTimeString();
              
              if (event.source === 'shared_context') {
                return (
                  <div key={event.id} className="flex gap-2 items-start border-l border-zinc-800 pl-4 py-1 hover:bg-white/[0.01] transition-colors rounded">
                    <span className="text-[#52525b] flex-shrink-0">{dateStr}</span>
                    <span className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</span>
                    <div className="flex flex-col gap-1 w-full font-sans">
                      <div>
                        <span className="text-purple-400 font-bold">SHARED_CONTEXT_UPDATE</span>
                        <span className="text-[#a1a1aa]"> — Event: </span>
                        <span className="text-purple-300 font-semibold">{event.type}</span>
                      </div>
                      <RenderPayload payload={event.payload} />
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={event.id} className="flex gap-2 items-start border-l border-zinc-800 pl-4 py-1 hover:bg-white/[0.01] transition-colors rounded">
                    <span className="text-[#52525b] flex-shrink-0">{dateStr}</span>
                    <span className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</span>
                    <div className="flex flex-col gap-1 w-full font-sans">
                      <div>
                        <span className="text-blue-400 font-bold">{event.fromAgent}</span>
                        <span className="text-zinc-500"> ➜ </span>
                        <span className="text-indigo-400 font-bold">{event.toAgent}</span>
                        <span className="text-[#a1a1aa]"> [</span>
                        <span className="text-emerald-400 font-semibold">{event.type}</span>
                        <span className="text-[#a1a1aa]">]</span>
                      </div>
                      <RenderPayload payload={event.payload} />
                    </div>
                  </div>
                );
              }
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
