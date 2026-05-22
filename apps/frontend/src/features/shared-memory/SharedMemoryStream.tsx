import React from 'react';
import { Layers, Database, ArrowRight, Activity, Clock } from 'lucide-react';

interface MemoryEvent {
  id: string;
  eventType: string;
  sourceAgent: string;
  payload: any;
  timestamp: string;
}

interface SharedMemoryStreamProps {
  memoryEvents: MemoryEvent[];
}

export const SharedMemoryStream: React.FC<SharedMemoryStreamProps> = ({
  memoryEvents,
}) => {
  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Shared Memory Context Event Stream</h4>
          <span className="text-[9.5px] font-mono text-zinc-500">
            {memoryEvents.length} EVENT SYNC LOGS
          </span>
        </div>

        {memoryEvents.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
            No shared memory synchronization events recorded.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {memoryEvents.map((event, idx) => {
              const keys = event.payload && typeof event.payload === 'object' ? Object.keys(event.payload) : [];
              return (
                <div
                  key={event.id || idx}
                  className="p-3 bg-[#0d0d0f]/60 border border-[#222226] rounded-lg flex flex-col gap-2 transition-all hover:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#5ed29c]/5 border border-[#5ed29c]/20 flex items-center justify-center">
                        <Database className="w-3 h-3 text-[#5ed29c]" />
                      </div>
                      <span className="text-[10px] font-mono text-[#5ed29c] font-black uppercase tracking-wider">
                        {event.eventType}
                      </span>
                      <span className="text-[9.5px] font-mono text-zinc-500">
                        BY: {event.sourceAgent.replace(/_AGENT/g, '')}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {keys.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {keys.map(k => (
                        <span key={k} className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-[#16161a] border border-zinc-900 text-zinc-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.payload && typeof event.payload === 'object' && (
                    <pre className="text-zinc-500 text-[9px] bg-black/40 p-2.5 rounded border border-zinc-950/60 overflow-x-auto font-mono max-h-24">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
