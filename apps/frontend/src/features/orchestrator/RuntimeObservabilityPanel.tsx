import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Server,
  Chrome,
  AlertCircle,
  RefreshCw,
  Clock,
  Lock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface RuntimeObservabilityPanelProps {
  sessionId: string;
}

export const RuntimeObservabilityPanel: React.FC<RuntimeObservabilityPanelProps> = ({ sessionId }) => {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [sessionRuntime, setSessionRuntime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuntimeTelemetry = async () => {
    try {
      console.log(`[RuntimeObservabilityPanel] Fetching telemetry...`);
      
      const [telemetryRes, sessionRes] = await Promise.all([
        apiFetch(`/runtime/telemetry`),
        apiFetch(`/runtime/telemetry/${sessionId}`)
      ]);

      if (!telemetryRes.ok) {
        let errMsg = `Telemetry request failed (${telemetryRes.status})`;
        try {
          const json = await telemetryRes.clone().json();
          if (json.error) errMsg += `: ${json.error}`;
        } catch {}
        throw new Error(errMsg);
      }

      if (!sessionRes.ok) {
        let errMsg = `Session metrics request failed (${sessionRes.status})`;
        try {
          const json = await sessionRes.clone().json();
          if (json.error) errMsg += `: ${json.error}`;
        } catch {}
        throw new Error(errMsg);
      }

      const telemetryData = await telemetryRes.json();
      const sessionData = await sessionRes.json();

      console.log('[RuntimeObservabilityPanel] Data received:', { telemetryData, sessionData });

      if (telemetryData.success) {
        setTelemetry(telemetryData.telemetry);
      }
      if (sessionData.success) {
        setSessionRuntime(sessionData);
      }
      setError(null);
    } catch (err: any) {
      console.error('[RuntimeObservabilityPanel] Error during fetch:', err);
      setError(err.message || 'Failed to sync runtime metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuntimeTelemetry();
    const interval = setInterval(fetchRuntimeTelemetry, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500 font-mono gap-3">
        <div className="w-6 h-6 border-2 border-t-transparent border-emerald-400 rounded-full animate-spin" />
        <span className="text-[10px] tracking-widest uppercase">Connecting to runtime infrastructure...</span>
      </div>
    );
  }

  if (error || !telemetry) {
    return (
      <div className="bg-[#121214] border border-red-500/20 p-6 rounded-xl flex items-center gap-4 text-red-400">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="text-sm font-bold font-mono">Infrastructure Synchronization Error</h4>
          <p className="text-xs text-zinc-400 mt-1">{error || 'Unable to connect to Redis/BullMQ supervisor.'}</p>
        </div>
      </div>
    );
  }

  const { queues = [], workers = [], browserPool = {}, activeSessions = 0, totalErrors = 0 } = telemetry;
  const { recoveryCount = 0, checkpoint = {} } = sessionRuntime || {};

  return (
    <div className="flex flex-col gap-6 w-full font-mono text-[11px] text-zinc-300">
      
      {/* ── Executive Telemetry Overview ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: activeSessions, desc: 'Parallel runs in flight', icon: Clock, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
          { label: 'Registered Workers', value: workers.length, desc: 'Horizontal cluster size', icon: Server, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
          { label: 'Browser Contexts', value: `${browserPool.activeContexts || 0} / ${browserPool.idleContexts + browserPool.activeContexts || 0}`, desc: 'Active / Total capacity', icon: Chrome, color: 'text-purple-400 bg-purple-500/5 border-purple-500/10' },
          { label: 'Recovery Events', value: recoveryCount, desc: 'Auto-heals in this session', icon: RefreshCw, color: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">{stat.label}</span>
              <span className="text-base font-bold text-white block mt-0.5">{stat.value}</span>
              <span className="text-[9.5px] text-zinc-600 block leading-none mt-0.5">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Queues & Workers Split View ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Queue Activity Dashboard */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Queue Activity Dashboard
            </h4>
            <span className="text-[9.5px] text-zinc-500">REALTIME THROUGHPUT</span>
          </div>

          <div className="flex flex-col gap-2">
            {queues.map((q: any) => (
              <div key={q.name} className="bg-[#0d0d0f] border border-[#222226] p-3 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white uppercase text-[10px]">{q.name.replace('-queue', '').replace(/-/g, ' ')}</span>
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      ACTIVE: {q.active}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">
                      WAITING: {q.waiting}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[9px] text-zinc-500">
                  <span>COMPLETED: <span className="text-zinc-300 font-bold">{q.completed}</span></span>
                  <span>FAILED: <span className="text-red-400 font-bold">{q.failed}</span></span>
                  <span>DELAYED: <span className="text-zinc-300 font-bold">{q.delayed}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Health Monitor */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Worker Cluster Health
            </h4>
            <span className="text-[9.5px] text-zinc-500">{workers.length} NODES REPORTING</span>
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 italic">No workers currently registered. Booting cluster...</div>
          ) : (
            <div className="flex flex-col gap-3">
              {workers.map((w: any) => (
                <div key={w.workerId} className="bg-[#0d0d0f] border border-[#222226] p-3 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-white">{w.workerId}</span>
                    </div>
                    <span className="text-[8px] bg-[#16161a] border border-[#222226] text-zinc-500 px-1.5 py-0.5 rounded">
                      PID: {w.pid || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[9.5px]">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-zinc-500" />
                      <span>CPU: <span className="text-white font-bold">{w.cpuUsage}%</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-zinc-500" />
                      <span>MEM: <span className="text-white font-bold">{w.memoryUsage} MB</span></span>
                    </div>
                    <span>JOBS: <span className="text-emerald-400 font-bold">{w.activeJobs}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Browser Pool & Session Locks split ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Browser Pool status */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Chrome className="w-3.5 h-3.5 text-emerald-400" />
              Parallel Browser Pool status
            </h4>
            <span className="text-[9.5px] text-zinc-500">PLAYWRIGHT ISOLATION</span>
          </div>

          <div className="bg-[#0d0d0f] border border-[#222226] p-4 rounded-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span>Active Leases</span>
              <span className="text-white font-bold">{browserPool.activeContexts || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Idle Pools</span>
              <span className="text-white font-bold">{browserPool.idleContexts || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Contexts Launched</span>
              <span className="text-white font-bold">{browserPool.totalLaunched || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Recycled Count</span>
              <span className="text-emerald-400 font-bold">{browserPool.recycledCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Avg Context Lease Duration</span>
              <span className="text-white font-bold">{(browserPool.contextLeaseAvgMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Session Locks Viewer & Checkpoint */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Execution Checkpoint & Locks
            </h4>
            <span className="text-[9.5px] text-zinc-500">MUTUAL EXCLUSION</span>
          </div>

          <div className="bg-[#0d0d0f] border border-[#222226] p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#222226]/50 pb-2">
              <span className="font-bold text-white">RECOVERY CHECKPOINT STATE</span>
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold">
                {checkpoint.lastMilestone || 'INITIAL'}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Completed Tasks:</span>
                <span className="text-emerald-400 font-bold">{checkpoint.completedTaskIds?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Failed Tasks:</span>
                <span className="text-red-400 font-bold">{checkpoint.failedTaskIds?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Session Lock status:</span>
                <span className="text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" /> Locked (Active Run)
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
