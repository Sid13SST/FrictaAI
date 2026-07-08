import React from 'react';
import { Cpu, Activity, Clock, ShieldAlert, CpuIcon, Sparkles, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AgentOverview {
  id: string;
  agentType: string;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  task: string;
  startedAt?: string;
  completedAt?: string;
}

interface OrchestrationOverviewProps {
  overviewData: {
    session: {
      id: string;
      status: string;
      startedAt: string;
      completedAt: string | null;
      metadata: any;
      goal: string;
    };
    workflowSession: {
      status: string;
      stepCount: number;
    };
    agents: AgentOverview[];
    health: {
      duration: number;
      tokenUsage: number;
      retryCount: number;
      completionStatus: string;
    };
    severity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    insightsCount: number;
  };
  onAgentSelect: (agentType: string) => void;
}

export const OrchestrationOverview: React.FC<OrchestrationOverviewProps> = ({
  overviewData,
  onAgentSelect,
}) => {
  const { session, agents, health, severity, insightsCount } = overviewData;

  // Map severity for recharts
  const severityChartData = [
    { name: 'Critical', value: severity.CRITICAL || 0, color: '#ef4444' },
    { name: 'High', value: severity.HIGH || 0, color: '#f97316' },
    { name: 'Medium', value: severity.MEDIUM || 0, color: '#eab308' },
    { name: 'Low', value: severity.LOW || 0, color: '#7342e2' },
  ].filter(item => item.value > 0);

  const totalFindings = (severity.CRITICAL || 0) + (severity.HIGH || 0) + (severity.MEDIUM || 0) + (severity.LOW || 0);

  const getAgentStatusStyles = (status: string) => {
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

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* ── Goal & Executive Status Panel ─────────────────────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7342e2]/30 to-transparent" />
        <span className="text-[9px] font-mono text-zinc-500 font-black uppercase tracking-widest">Orchestration Target Goal</span>
        <h3 className="text-base font-bold text-white mt-1 leading-snug">"{session.goal || 'UX Scenario Audit'}"</h3>
        <p className="text-[11px] text-zinc-400 mt-1">Session status: <span className="font-mono text-[#7342e2] font-bold">{session.status}</span></p>
      </div>

      {/* ── Key Metrics Metrics Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Orchestrator Run Time', value: `${health.duration || 0}s`, desc: 'Active execution duration', icon: Clock },
          { label: 'Total Model Cost', value: `${health.tokenUsage.toLocaleString()} tokens`, desc: 'Token usage metrics', icon: Cpu },
          { label: 'Agent Recoveries', value: `${health.retryCount || 0} retries`, desc: 'Automated error fallbacks', icon: RefreshCw },
          { label: 'Cooperative Insights', value: `${insightsCount || 0} alerts`, desc: 'Cross-agent correlations', icon: Sparkles },
        ].map((item, i) => (
          <div key={i} className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7342e2]/5 border border-[#7342e2]/10 flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-[#7342e2]" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black block">{item.label}</span>
              <span className="text-sm font-black text-white mt-0.5 block">{item.value}</span>
              <span className="text-[9.5px] text-zinc-600 block leading-none mt-0.5">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Specialist Grid & Severity Distribution ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Agents grid */}
        <div className="lg:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Active Specialist Mesh Grid</h4>
            <span className="text-[9.5px] font-mono text-zinc-500">
              {agents.filter(a => a.status === 'COMPLETED').length} / {agents.length} COMPLETED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onAgentSelect(agent.agentType)}
                className="p-3 bg-[#0d0d0f] border border-[#222226] hover:border-zinc-700 rounded-lg flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-[#16161a] border border-[#222226] flex items-center justify-center shrink-0">
                    <CpuIcon className="w-4 h-4 text-[#7342e2] group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block group-hover:text-[#7342e2] transition-colors truncate">
                      {agent.agentType.replace(/_AGENT/g, '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9.5px] text-zinc-500 block truncate max-w-[160px] leading-tight">
                      {agent.task || 'Active investigator'}
                    </span>
                  </div>
                </div>
                <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border ${getAgentStatusStyles(agent.status)}`}>
                  {agent.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Metrics Distribution Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Severity Metrics</h4>
            <span className="text-[9.5px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">
              {severity.CRITICAL || 0} CRITICAL
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative min-h-[160px]">
            {totalFindings === 0 ? (
              <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
                No usability defects flagged by intelligence agents
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                {/* Visual Circle chart */}
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={48}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend checklist */}
                <div className="flex-1 flex flex-col gap-2 pl-4">
                  {[
                    { label: 'Critical', val: severity.CRITICAL || 0, color: 'text-red-400' },
                    { label: 'High', val: severity.HIGH || 0, color: 'text-orange-400' },
                    { label: 'Medium', val: severity.MEDIUM || 0, color: 'text-yellow-400' },
                    { label: 'Low', val: severity.LOW || 0, color: 'text-[#7342e2]' },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: s.color.replace('text-', '') }} />
                        {s.label}
                      </span>
                      <span className={`font-black ${s.color}`}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
