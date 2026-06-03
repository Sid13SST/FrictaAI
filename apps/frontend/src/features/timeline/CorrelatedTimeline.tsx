import React from 'react';
import { MousePointer, Brain, Eye, Zap, AlertCircle } from 'lucide-react';
import { apiFetch, API_BASE } from '../../lib/api';

interface TimelineEvent {
  id: string;
  stepIndex: number;
  timestamp: string;
  eventType: 'ACTION' | 'THOUGHT' | 'ERROR' | 'VISUAL_FINDING' | 'COGNITIVE_SPIKE';
  title: string;
  description: string;
  metadata?: any;
}

interface CorrelatedTimelineProps {
  timeline: TimelineEvent[];
  screenshots: any[];
  activeStep: number;
  onStepSelect: (stepIndex: number) => void;
}

export const CorrelatedTimeline: React.FC<CorrelatedTimelineProps> = ({
  timeline,
  screenshots,
  activeStep,
  onStepSelect,
}) => {
  // Group events by stepIndex
  const steps: Record<number, TimelineEvent[]> = {};
  timeline.forEach(event => {
    if (!steps[event.stepIndex]) {
      steps[event.stepIndex] = [];
    }
    steps[event.stepIndex].push(event);
  });

  const sortedStepIndices = Object.keys(steps)
    .map(Number)
    .sort((a, b) => a - b);

  const getEventIcon = (type: string) => {
    if (type === 'ACTION') return <MousePointer className="w-3.5 h-3.5 text-[#3b82f6]" />;
    if (type === 'THOUGHT') return <Brain className="w-3.5 h-3.5 text-purple-400" />;
    if (type === 'VISUAL_FINDING') return <Eye className="w-3.5 h-3.5 text-blue-400" />;
    if (type === 'COGNITIVE_SPIKE') return <Zap className="w-3.5 h-3.5 text-[#f43f5e]" />;
    return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  };

  const getEventBgColor = (type: string) => {
    if (type === 'ACTION') return 'bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#a1a1aa]';
    if (type === 'THOUGHT') return 'bg-purple-500/10 border-purple-500/20 text-[#a1a1aa]';
    if (type === 'VISUAL_FINDING') return 'bg-blue-500/10 border-blue-500/20 text-[#a1a1aa]';
    if (type === 'COGNITIVE_SPIKE') return 'bg-[#f43f5e]/10 border-[#f43f5e]/20 text-[#a1a1aa]';
    return 'bg-red-500/10 border-red-500/20 text-red-300';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[#f4f4f5] tracking-wide">Correlated Event Stream</h3>
        <p className="text-xs text-[#a1a1aa]">Step-by-step chronological synthesis of actions, thoughts, and signals</p>
      </div>

      <div className="relative border-l border-[#222226] ml-4 pl-8 flex flex-col gap-8 py-2">
        {sortedStepIndices.map(stepIdx => {
          const stepEvents = steps[stepIdx];
          const isActive = activeStep === stepIdx;
          const screenshot = screenshots.find(s => s.stepIndex === stepIdx);
          const hasError = stepEvents.some(e => e.eventType === 'ERROR');

          const screenshotUrl = screenshot
            ? screenshot.filePath.startsWith('http')
              ? screenshot.filePath
              : `${API_BASE}/workflows/screenshots/raw/${screenshot.filePath}`
            : null;

          return (
            <div 
              key={stepIdx} 
              className={`relative group transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {/* Connector Bullet */}
              <button
                onClick={() => onStepSelect(stepIdx)}
                className={`absolute -left-[45px] top-1.5 w-[33px] h-[33px] rounded-full border flex items-center justify-center text-xs font-mono transition-all outline-none ${
                  isActive
                    ? 'bg-[#f43f5e] border-[#f43f5e] text-white shadow-[0_0_12px_rgba(244,63,94,0.4)] scale-110'
                    : hasError
                      ? 'bg-red-950 border-red-500 text-red-400'
                      : 'bg-[#121214] border-[#222226] text-[#71717a]'
                }`}
              >
                S{stepIdx}
              </button>

              {/* Step Card */}
              <div 
                className={`p-5 rounded-xl border transition-colors flex flex-col md:flex-row gap-5 ${
                  isActive 
                    ? 'bg-[#121214] border-[#f43f5e]/30' 
                    : 'bg-[#121214]/60 border-[#222226] hover:bg-[#121214]'
                }`}
              >
                {/* Text Context */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span 
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isActive ? 'text-[#f43f5e]' : 'text-[#71717a]'
                      }`}
                    >
                      Step {stepIdx + 1}
                    </span>
                    {screenshot && (
                      <span className="text-[10px] font-mono text-[#71717a] truncate max-w-[200px]">
                        {screenshot.pageUrl ? screenshot.pageUrl.split('/').pop() : 'index.html'}
                      </span>
                    )}
                  </div>

                  {/* Inner events flow */}
                  <div className="flex flex-col gap-2.5">
                    {stepEvents.map((event, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex gap-3 ${getEventBgColor(event.eventType)}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#f4f4f5]">{event.title}</span>
                          <p className="text-[11px] leading-relaxed text-[#a1a1aa] font-mono">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshot Thumb */}
                {screenshotUrl && (
                  <div 
                    onClick={() => onStepSelect(stepIdx)}
                    className="md:w-48 shrink-0 aspect-video rounded-lg overflow-hidden border border-[#222226] cursor-pointer hover:border-[#f43f5e]/40 relative group/thumb"
                  >
                    <img 
                      src={screenshotUrl} 
                      alt={`Step ${stepIdx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-[10px] text-white font-medium transition-opacity">
                      Click to Scrub Replay
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
