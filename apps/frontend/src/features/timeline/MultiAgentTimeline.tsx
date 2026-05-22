import React, { useState } from 'react';
import { GitBranch, Eye, ShieldAlert, Sparkles, RefreshCw, Layers, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'DELEGATION' | 'CORRELATION' | 'FINDING' | 'SCREENSHOT' | 'RECOVERY' | 'REASONING';
  timestamp: string;
  source: string;
  target?: string;
  title: string;
  description: string;
  metadata?: any;
}

interface MultiAgentTimelineProps {
  timelineEvents: TimelineEvent[];
  activeStep: number;
  onStepSelect: (step: number) => void;
}

export const MultiAgentTimeline: React.FC<MultiAgentTimelineProps> = ({
  timelineEvents,
  activeStep,
  onStepSelect,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  // Multi-event filter logic
  // Event filters: Signals (Reasoning), Delegation, Recovery, Findings, Correlations, Replay (Screenshot)
  const filters = [
    { label: 'All Events', key: 'ALL' },
    { label: 'Delegations', key: 'DELEGATION' },
    { label: 'Findings', key: 'FINDING' },
    { label: 'Replay Screens', key: 'SCREENSHOT' },
    { label: 'Recoveries', key: 'RECOVERY' },
    { label: 'Memory Correlations', key: 'CORRELATION' },
    { label: 'Reasoning Signals', key: 'REASONING' },
  ];

  const filteredEvents = timelineEvents.filter(e => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'DELEGATION':
        return {
          icon: GitBranch,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          label: 'Delegation Path'
        };
      case 'FINDING':
        return {
          icon: ShieldAlert,
          color: 'text-red-400 bg-red-500/10 border-red-500/20',
          label: 'UX Finding'
        };
      case 'SCREENSHOT':
        return {
          icon: Eye,
          color: 'text-[#5ed29c] bg-[#5ed29c]/10 border-[#5ed29c]/20',
          label: 'Screenshot Capture'
        };
      case 'RECOVERY':
        return {
          icon: RefreshCw,
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
          label: 'Automated Recovery'
        };
      case 'CORRELATION':
        return {
          icon: Layers,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          label: 'Memory Correlation'
        };
      case 'REASONING':
      default:
        return {
          icon: Sparkles,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          label: 'Specialist Reasoning'
        };
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    // If the event has a stepIndex in its metadata, scrub to it.
    if (event.metadata && typeof event.metadata.stepIndex === 'number') {
      onStepSelect(event.metadata.stepIndex);
    } else if (event.metadata && typeof event.metadata.stepNumber === 'number') {
      onStepSelect(event.metadata.stepNumber);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* ── Filter Rail ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0d0d0f] border border-[#222226] rounded-xl w-fit">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              filterType === f.key
                ? 'bg-[#5ed29c]/15 text-[#5ed29c] border border-[#5ed29c]/20'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Chronological Event Stream ───────────────────────────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
        {timelineEvents.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
            No events logged in the investigation timeline.
          </div>
        ) : (
          <div className="relative border-l border-zinc-800/80 ml-3 pl-6 flex flex-col gap-6 py-2">
            {filteredEvents.map((event, idx) => {
              const styles = getEventStyles(event.type);
              const Icon = styles.icon;
              const hasScrubbableStep = event.metadata && (typeof event.metadata.stepIndex === 'number' || typeof event.metadata.stepNumber === 'number');

              return (
                <div
                  key={event.id || idx}
                  className="relative group transition-all"
                >
                  {/* Outer Timeline Dot */}
                  <div className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center p-0.5 ${styles.color} shrink-0`}>
                    <Icon className="w-2.5 h-2.5" />
                  </div>

                  {/* Context Block Card */}
                  <div 
                    onClick={() => handleEventClick(event)}
                    className={`p-3.5 bg-[#0d0d0f]/60 hover:bg-[#0d0d0f]/90 border border-[#222226] hover:border-zinc-800 rounded-lg flex flex-col sm:flex-row justify-between gap-3 transition-all cursor-pointer ${
                      hasScrubbableStep ? 'hover:border-[#5ed29c]/30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${styles.color}`}>
                          {styles.label}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                          SOURCE: {event.source.replace(/_AGENT/g, '')}
                        </span>
                        {event.target && (
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                            → {event.target.replace(/_AGENT/g, '')}
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-white leading-tight font-mono">{event.title}</h5>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">{event.description}</p>
                    </div>

                    {/* Right timestamp & scrubber link indicator */}
                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      <span className="text-[9.5px] font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {hasScrubbableStep && (
                        <span className="text-[8px] font-mono text-zinc-500 bg-[#16161a] border border-[#222226] px-1.5 py-0.5 rounded group-hover:text-[#5ed29c] group-hover:border-[#5ed29c]/30 transition-all font-bold uppercase">
                          SCRUB TO STEP {event.metadata.stepIndex !== undefined ? event.metadata.stepIndex + 1 : event.metadata.stepNumber + 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
