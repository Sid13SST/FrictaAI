import { Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RuntimeObservabilityPanel } from '../features/orchestrator/RuntimeObservabilityPanel';

export const RuntimeObservability = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Runtime Observability</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Live worker health, browser pool, and queue state across the execution infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#7342e2]/5 border border-[#7342e2]/20 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold text-[#7342e2] self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7342e2] animate-pulse" />
          LIVE · UPDATES EVERY 3S
        </div>
      </div>

      <RuntimeObservabilityPanel />

      <div className="flex items-center justify-between rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.2)' }}>
            <Activity className="w-4 h-4 text-[#9b72fa]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Looking for a specific audit's recovery checkpoint?</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Open that session's Investigation Console for per-run recovery and lock state.
            </p>
          </div>
        </div>
        <Link
          to="/app/reports"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: 'rgba(115,66,226,0.15)', border: '1px solid rgba(115,66,226,0.3)' }}
        >
          View Reports <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
