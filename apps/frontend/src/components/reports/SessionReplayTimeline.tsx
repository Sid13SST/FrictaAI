import React from 'react';
import { Play, MousePointer2, BrainCircuit } from 'lucide-react';

interface TimelineEvent {
  type: 'action' | 'thought';
  content: string;
  target?: string;
  timestamp: string;
  status?: string;
}

export function SessionReplayTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        No events available for replay.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-96 overflow-y-auto">
      <div className="flex items-center space-x-2 mb-6 text-white">
        <Play className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-medium">Session Replay Timeline</h3>
      </div>
      <div className="space-y-4">
        {events.map((ev, i) => (
          <div key={i} className="flex space-x-3">
            <div className="mt-1">
              {ev.type === 'action' ? (
                <div className={`p-1.5 rounded-md ${ev.status === 'failed' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  <MousePointer2 className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-500">
                  <BrainCircuit className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-lg">
                <div className="text-sm font-medium text-slate-200">{ev.content}</div>
                {ev.target && <div className="text-xs text-slate-500 mt-1 truncate">{ev.target}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
