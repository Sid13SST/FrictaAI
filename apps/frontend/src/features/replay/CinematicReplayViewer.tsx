import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, FastForward, PlayCircle } from 'lucide-react';
import { AnnotatedScreenshotViewer } from '../findings/AnnotatedScreenshotViewer';

interface CinematicReplayViewerProps {
  screenshots: any[];
  timeline: any[];
  visualFindings: any[];
  activeStep: number;
  setActiveStep: (step: number) => void;
}

export const CinematicReplayViewer: React.FC<CinematicReplayViewerProps> = ({
  screenshots,
  timeline,
  visualFindings,
  activeStep,
  setActiveStep,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = 2000ms per step
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  const stepCount = screenshots.length;
  const currentScreenshot = screenshots.find(s => s.stepIndex === activeStep) || screenshots[0];

  // Actions for the current step
  const currentStepActions = timeline.filter(
    e => e.stepIndex === activeStep && (e.eventType === 'ACTION' || e.eventType === 'ERROR')
  );
  // Thoughts for the current step
  const currentStepThoughts = timeline.filter(
    e => e.stepIndex === activeStep && e.eventType === 'THOUGHT'
  );
  // Visual findings for the current step
  const stepVisualFindings = visualFindings.filter(vf => {
    let vfStep = -1;
    if (vf.metadata && typeof vf.metadata === 'object' && vf.metadata.stepIndex !== undefined) {
      vfStep = Number(vf.metadata.stepIndex);
    } else if (vf.description) {
      const match = vf.description.match(/step (\d+)/i);
      if (match) vfStep = parseInt(match[1], 10);
    }
    return vfStep === activeStep || vf.screenshotId === currentScreenshot?.id;
  });

  // Handle Play/Pause timer
  useEffect(() => {
    if (isPlaying) {
      const duration = 2500 / playbackSpeed;
      playbackInterval.current = setInterval(() => {
        setActiveStep((activeStep + 1) % stepCount);
      }, duration);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, activeStep, stepCount, playbackSpeed, setActiveStep]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isTyping) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveStep(Math.min(activeStep + 1, stepCount - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveStep(Math.max(activeStep - 0, 0) ? activeStep - 1 : 0);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStep, stepCount, setActiveStep]);

  if (!currentScreenshot) {
    return (
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-12 text-center text-[#a1a1aa]">
        <PlayCircle className="w-12 h-12 text-[#71717a] mx-auto mb-4 animate-pulse" />
        <p className="text-sm">No workflow screenshots recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Playback & Screenshot Area */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Scraped Viewport Screen */}
        <AnnotatedScreenshotViewer 
          screenshot={currentScreenshot} 
          visualFindings={stepVisualFindings}
        />

        {/* Player Controls Card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Prev */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.max(activeStep - 1, 0)); }}
                disabled={activeStep === 0}
                className="p-1.5 rounded-lg border border-[#222226] hover:bg-[#222226] disabled:opacity-40 disabled:hover:bg-transparent text-[#a1a1aa] hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              {/* Next */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.min(activeStep + 1, stepCount - 1)); }}
                disabled={activeStep === stepCount - 1}
                className="p-1.5 rounded-lg border border-[#222226] hover:bg-[#222226] disabled:opacity-40 disabled:hover:bg-transparent text-[#a1a1aa] hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono text-[#71717a] ml-2">
                Step {activeStep + 1} of {stepCount}
              </span>
            </div>

            {/* Playback speed selector */}
            <div className="flex gap-1.5 bg-[#0d0d0f] p-1 border border-[#222226] rounded-lg">
              {([0.5, 1, 2] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                    playbackSpeed === speed 
                      ? 'bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30' 
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber timeline */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#71717a]">S0</span>
            <input
              type="range"
              min={0}
              max={stepCount - 1}
              value={activeStep}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveStep(parseInt(e.target.value, 10));
              }}
              className="flex-1 accent-[#f43f5e] bg-[#222226] h-1 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono text-[#71717a]">{`S${stepCount - 1}`}</span>
          </div>
        </div>
      </div>

      {/* Action & Thought Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-4 max-h-[580px] overflow-y-auto pr-1">
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase">Active Step Context</h4>
          
          {/* Actions List */}
          <div>
            <h5 className="text-[10px] text-[#71717a] font-bold tracking-wider uppercase mb-2">Executed Actions</h5>
            {currentStepActions.length === 0 ? (
              <p className="text-xs text-[#71717a] italic">No active inputs at this step.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {currentStepActions.map((act, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#0d0d0f] border border-[#222226] text-xs">
                    <span className={`font-semibold ${act.eventType === 'ERROR' ? 'text-red-400' : 'text-[#f43f5e]'}`}>
                      {act.eventType === 'ERROR' ? 'ERROR' : act.title}
                    </span>
                    <p className="text-[#a1a1aa] mt-1 font-mono text-[11px] leading-relaxed">{act.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-[#222226]" />

          {/* Thoughts List */}
          <div>
            <h5 className="text-[10px] text-[#71717a] font-bold tracking-wider uppercase mb-2">Agent Thought Stream</h5>
            {currentStepThoughts.length === 0 ? (
              <p className="text-xs text-[#71717a] italic">Neutral cognitive response.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {currentStepThoughts.map((th, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#0d0d0f] border border-[#222226] text-xs text-[#a1a1aa] leading-relaxed italic">
                    "{th.description}"
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Step Checklist */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4">
          <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase mb-3">Replay Checklist</h4>
          <div className="flex flex-col gap-1.5">
            {screenshots.map((s, idx) => {
              const isActive = activeStep === idx;
              const hasStepError = timeline.some(e => e.stepIndex === idx && e.eventType === 'ERROR');

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveStep(idx);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-all ${
                    isActive 
                      ? 'bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-white font-medium' 
                      : 'border border-transparent text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[80%]">{`Step ${idx + 1}: ${s.pageUrl ? s.pageUrl.split('/').pop() || 'index' : 'View'}`}</span>
                  {hasStepError && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
