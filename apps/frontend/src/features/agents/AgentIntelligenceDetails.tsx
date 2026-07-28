import React from 'react';
import { Cpu, ShieldAlert, GitBranch, PlayCircle, RefreshCw, BarChart2, Star } from 'lucide-react';

interface AgentTrace {
  id: string;
  stepType: string;
  summary: string;
  evidence?: string;
  timestamp: string;
}

interface AgentFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  evidence: string;
}

interface DelegationLog {
  id: string;
  fromAgent: string;
  toAgent: string;
  eventType: string;
  timestamp: string;
}

interface AgentTelemetry {
  agentType: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  scopedResponsibilities: string;
  findings: AgentFinding[];
  reasoningTraces: AgentTrace[];
  delegationHistory: DelegationLog[];
  confidence: number;
}

interface AgentIntelligenceDetailsProps {
  agentsData: AgentTelemetry[];
  selectedAgentType: string;
  onSelectAgent: (type: string) => void;
}

export const AgentIntelligenceDetails: React.FC<AgentIntelligenceDetailsProps> = ({
  agentsData,
  selectedAgentType,
  onSelectAgent,
}) => {
  const currentAgent = agentsData.find(a => a.agentType === selectedAgentType) || agentsData[0];

  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-[#7342e2] border-[#7342e2]/20 bg-[#7342e2]/5';
      case 'RUNNING':
        return 'text-[#7342e2] border-[#7342e2]/40 bg-[#7342e2]/10 animate-pulse';
      case 'FAILED':
        return 'text-red-400 border-red-500/20 bg-red-500/5';
      case 'QUEUED':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      default:
        return 'text-zinc-500 border-[#222226] bg-[#0d0d0f]';
    }
  };

  if (!currentAgent) {
    return (
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-8 text-center text-zinc-500 font-mono text-xs">
        NO AGENT INTELLIGENCE TELEMETRY TO SHOW
      </div>
    );
  }

  const confidenceScore = Math.round(currentAgent.confidence * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans">
      {/* Left Column: Specialist Selector Sidebar */}
      <div className="w-full lg:w-60 flex flex-col gap-2 shrink-0">
        <span className="text-[9px] font-mono text-zinc-500 font-black uppercase tracking-widest px-2.5">Agent Mesh Roster</span>
        <div className="flex flex-col gap-1">
          {agentsData.map((agent) => {
            const isActive = agent.agentType === selectedAgentType;
            return (
              <button
                key={agent.agentType}
                onClick={() => onSelectAgent(agent.agentType)}
                className={`px-3 py-2.5 rounded-lg border text-left text-xs font-mono font-bold transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-[#7342e2]/10 text-white border-[#7342e2]/30'
                    : 'bg-[#0d0d0f]/40 text-zinc-400 border-transparent hover:bg-[#121214] hover:text-white'
                }`}
              >
                <span className="truncate">{agent.agentType.replace(/_AGENT/g, '').replace(/_/g, ' ')}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  agent.status === 'RUNNING' ? 'bg-[#7342e2] animate-ping' : 
                  agent.status === 'COMPLETED' ? 'bg-[#7342e2]' :
                  agent.status === 'FAILED' ? 'bg-red-500' : 'bg-zinc-700'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Focus Intelligence Dashboard */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {/* Core Agent Profile Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 relative overflow-hidden flex flex-col sm:flex-row justify-between gap-4">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7342e2]/30 to-transparent" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#7342e2]/5 border border-[#7342e2]/20 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-[#7342e2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white leading-tight font-mono">
                  {currentAgent.agentType.replace(/_/g, ' ')}
                </h3>
                <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getAgentStatusBadge(currentAgent.status)}`}>
                  {currentAgent.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed font-sans">
                {currentAgent.scopedResponsibilities}
              </p>
            </div>
          </div>

          {/* Confidence Indicator Widget */}
          <div className="flex flex-col items-start sm:items-end justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-zinc-800/80 pt-4 sm:pt-0 sm:pl-5 min-w-[120px]">
            <span className="text-[9px] font-mono text-zinc-500 font-black uppercase tracking-widest block">Agent Confidence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-black text-white">{confidenceScore}</span>
              <span className="text-[10px] font-mono text-zinc-500">%</span>
            </div>
            <div className="w-full sm:w-24 h-1.5 bg-[#222226] rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-[#7342e2] rounded-full transition-all duration-500" 
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Panels: Trace logs, Findings list, Delegation logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Active findings panel */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between border-b border-[#222226] pb-3">
              <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Generated Findings</h4>
              <span className="text-[9.5px] font-mono text-[#7342e2] bg-[#7342e2]/10 border border-[#7342e2]/20 px-2 py-0.5 rounded font-bold">
                {currentAgent.findings.length} DEFECTS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {currentAgent.findings.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
                  No layout or heuristic defects flagged.
                </div>
              ) : (
                currentAgent.findings.map((f, i) => (
                  <div key={i} className="p-3 bg-[#0d0d0f] border border-[#222226] rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-white leading-tight font-mono">{f.title}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                        f.severity.toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        f.severity.toLowerCase() === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-[#7342e2]/10 text-[#7342e2] border border-[#7342e2]/20'
                      }`}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{f.description}</p>
                    {f.evidence && (
                      <div className="text-[9px] font-mono text-zinc-500 bg-[#16161a] p-1.5 rounded border border-zinc-900 leading-normal">
                        Evidence: {f.evidence}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reasoning traces panel */}
          <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between border-b border-[#222226] pb-3">
              <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Reasoning Traces</h4>
              <span className="text-[9.5px] font-mono text-zinc-500">
                {currentAgent.reasoningTraces.length} LOGS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {currentAgent.reasoningTraces.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
                  No execution or reasoning logs captured.
                </div>
              ) : (
                currentAgent.reasoningTraces.map((trace, i) => (
                  <div key={i} className="p-3 bg-[#0d0d0f] border border-[#222226] rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-[#222226] text-zinc-300 uppercase">
                        {trace.stepType}
                      </span>
                      <span className="text-[9.5px] font-mono text-zinc-600">
                        {new Date(trace.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed italic">"{trace.summary}"</p>
                    {trace.evidence && (
                      <p className="text-[9px] font-mono text-zinc-500">Evidence: {trace.evidence}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Delegation history timeline card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Delegation History</h4>
            <span className="text-[9.5px] font-mono text-zinc-500">
              {currentAgent.delegationHistory.length} TRANSFERS
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {currentAgent.delegationHistory.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
                No delegation event transfers logged.
              </div>
            ) : (
              currentAgent.delegationHistory.map((d, i) => (
                <div key={i} className="p-2.5 bg-[#0d0d0f] border border-[#222226] rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 font-mono flex-wrap">
                    <span className="text-zinc-500 font-black uppercase">From:</span>
                    <span className="text-zinc-300 font-bold">{d.fromAgent.replace(/_AGENT/g, '')}</span>
                    <span className="text-zinc-500 font-black uppercase">To:</span>
                    <span className="text-white font-bold">{d.toAgent.replace(/_AGENT/g, '')}</span>
                    <span className="text-zinc-500 font-black px-1">|</span>
                    <span className="text-[#7342e2] font-semibold">{d.eventType}</span>
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-600 shrink-0">
                    {new Date(d.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
