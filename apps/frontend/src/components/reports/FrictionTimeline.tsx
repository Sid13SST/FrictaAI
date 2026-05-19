import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface Signal {
  id: string;
  signalType: string;
  severity: string;
  timestamp: string;
  metadata?: any;
}

export function FrictionTimeline({ signals }: { signals: Signal[] }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        No significant friction signals detected in this session.
      </div>
    );
  }

  const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-medium text-white mb-6">Friction Signals</h3>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
        {sortedSignals.map((signal, index) => (
          <div key={signal.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${
              signal.severity === 'HIGH' ? 'bg-red-500 text-white' : signal.severity === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
            
            {/* Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-800/50 shadow">
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-slate-200">{signal.signalType.replace(/_/g, ' ')}</div>
                <time className="text-xs font-medium text-slate-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(signal.timestamp).toLocaleTimeString()}
                </time>
              </div>
              <div className="text-sm text-slate-400">
                Severity: <span className="font-medium text-slate-300">{signal.severity}</span>
                {signal.metadata && (
                  <div className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(signal.metadata)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
