import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Monitor } from 'lucide-react';
import { apiFetch, API_BASE } from '../../lib/api';

interface VisualFinding {
  id: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  boundingBoxes: any;
}

interface ReplayFrame {
  stepIndex: number;
  timestamp: string;
  screenshot: {
    id: string;
    filePath: string;
    pageUrl: string;
    actionContext?: string;
  } | null;
  action: {
    type: string;
    target?: string;
    value?: string;
    status: string;
  } | null;
  thoughts: string[];
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    recommendation?: string;
  }>;
}

interface SynchronizedReplayPlayerProps {
  frames: ReplayFrame[];
  activeStep: number;
  setActiveStep: (step: number) => void;
  visualFindings: VisualFinding[];
  mode?: 'full' | 'minimal';
  liveStepCount?: number;
  onResetLiveStep?: () => void;
}

export const SynchronizedReplayPlayer: React.FC<SynchronizedReplayPlayerProps> = ({
  frames,
  activeStep,
  setActiveStep,
  visualFindings,
  mode = 'full',
  liveStepCount = 0,
  onResetLiveStep,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hoveredBox, setHoveredBox] = useState<any | null>(null);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = frames.length;
  const currentFrame = frames[activeStep] || null;

  // Autoplay handler
  useEffect(() => {
    if (isPlaying && totalSteps > 1) {
      const delay = 2000 / playbackSpeed;
      playbackInterval.current = setInterval(() => {
        setActiveStep((activeStep + 1) % totalSteps);
      }, delay);
    } else {
      if (playbackInterval.current) clearInterval(playbackInterval.current);
    }

    return () => {
      if (playbackInterval.current) clearInterval(playbackInterval.current);
    };
  }, [isPlaying, activeStep, totalSteps, playbackSpeed, setActiveStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveStep(Math.min(activeStep + 1, totalSteps - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveStep(Math.max(activeStep - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, totalSteps, setActiveStep]);

  if (!currentFrame || !currentFrame.screenshot) {
    return (
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-8 text-center text-zinc-500 font-mono text-xs">
        NO REPLAY TELEMETRY CAPTURED FOR THIS ACTIVE WORKFLOW SESSION
      </div>
    );
  }

  const imageUrl = currentFrame.screenshot.filePath.startsWith('http')
    ? currentFrame.screenshot.filePath
    : `${API_BASE}/workflows/screenshots/raw/${currentFrame.screenshot.filePath}`;

  // Find visual findings bounding boxes to display
  const stepVisualFindings = visualFindings.filter(vf => vf.id === currentFrame.screenshot?.id || 
    (vf.description && vf.description.toLowerCase().includes(`step ${activeStep}`))
  );

  const boxes: any[] = [];
  stepVisualFindings.forEach(vf => {
    let bboxList: any[] = [];
    if (Array.isArray(vf.boundingBoxes)) {
      bboxList = vf.boundingBoxes;
    } else if (vf.boundingBoxes && typeof vf.boundingBoxes === 'string') {
      try {
        bboxList = JSON.parse(vf.boundingBoxes);
      } catch (e) {}
    } else if (vf.boundingBoxes && typeof vf.boundingBoxes === 'object') {
      bboxList = [vf.boundingBoxes];
    }
    bboxList.forEach(box => {
      boxes.push({
        x: box.x,
        y: box.y,
        w: box.w || box.width || 80,
        h: box.h || box.height || 40,
        label: box.label || vf.title,
        parent: vf
      });
    });
  });

  if (mode === 'minimal') {
    return (
      <div className="w-full flex flex-col gap-3 justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back */}
            <button
              onClick={() => { setIsPlaying(false); setActiveStep(Math.max(activeStep - 1, 0)); }}
              disabled={activeStep === 0}
              className="p-1.5 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#1a1a1e] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-[#7342e2] hover:bg-[#4bc089] text-black shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Next */}
            <button
              onClick={() => { setIsPlaying(false); setActiveStep(Math.min(activeStep + 1, totalSteps - 1)); }}
              disabled={activeStep === totalSteps - 1}
              className="p-1.5 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#1a1a1e] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] font-mono text-zinc-400 ml-2">
              STEP <span className="text-[#7342e2] font-black">{activeStep + 1}</span> / {totalSteps}
            </span>

            {liveStepCount > 0 && (
              <button
                onClick={onResetLiveStep}
                className="ml-2 px-1.5 py-0.5 rounded bg-[#7342e2]/10 hover:bg-[#7342e2]/20 border border-[#7342e2]/20 text-[#7342e2] text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all animate-pulse"
              >
                <span className="w-1 h-1 rounded-full bg-[#7342e2] inline-block" />
                +{liveStepCount} Live Step{liveStepCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {currentFrame.screenshot && (
            <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[40%] hidden md:inline-block">
              {currentFrame.screenshot.pageUrl}
            </span>
          )}

          {/* Playback Speed Toggles */}
          <div className="flex gap-1 bg-[#0a0a0c] p-0.5 border border-[#222226] rounded-lg">
            {([0.5, 1, 2] as const).map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                  playbackSpeed === speed 
                    ? 'bg-[#7342e2]/15 text-[#7342e2] border border-[#7342e2]/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Scrubbing slider */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black">START</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={totalSteps - 1}
              value={activeStep}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveStep(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[#7342e2] bg-[#222226] h-1 rounded appearance-none cursor-pointer"
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black">END</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full lg:h-[580px] min-h-0">
      {/* ── Visual Screenshot Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="relative border border-[#222226] rounded-xl overflow-hidden bg-[#0a0a0c] flex-1 flex flex-col">
          {/* Virtual Browser Top Address Bar */}
          <div className="w-full bg-[#0d0d10] px-4 py-2 border-b border-[#222226] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2 max-w-[70%]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              <span className="text-zinc-600 px-1">|</span>
              <span className="truncate text-zinc-300 font-semibold">{currentFrame.screenshot.pageUrl}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 shrink-0 text-[10px]">
              <Monitor className="w-3.5 h-3.5" />
              <span>1280 x 720 (Scanned Viewport)</span>
            </div>
          </div>

          {/* Interactive Bounding Canvas */}
          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[350px]">
            <img
              src={imageUrl}
              alt={`Investigation step ${activeStep}`}
              className="max-h-[500px] w-full object-contain pointer-events-none"
            />

            {/* Bounding box annotations */}
            {boxes.map((box, idx) => {
              const leftPercent = (box.x / 1280) * 100;
              const topPercent = (box.y / 720) * 100;
              const widthPercent = (box.w / 1280) * 100;
              const heightPercent = (box.h / 720) * 100;

              const isCritical = box.parent.severity.toLowerCase() === 'critical';
              const isHigh = box.parent.severity.toLowerCase() === 'high';

              const boxBorderColor = isCritical 
                ? 'border-red-500 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                : isHigh 
                  ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                  : 'border-[#7342e2] bg-[#7342e2]/5 shadow-[0_0_8px_rgba(115, 66, 226,0.3)]';

              const badgeColor = isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-[#7342e2] text-black';

              return (
                <div
                  key={idx}
                  className={`absolute border-2 rounded transition-all cursor-help ${boxBorderColor}`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  onMouseEnter={() => setHoveredBox(box)}
                  onMouseLeave={() => setHoveredBox(null)}
                >
                  <div className={`absolute -top-5 left-0 px-1 py-0.5 rounded text-[8px] font-mono font-bold text-white pointer-events-none truncate ${badgeColor}`}>
                    {box.label}
                  </div>
                </div>
              );
            })}

            {/* Tooltip Overlay */}
            {hoveredBox && (
              <div className="absolute bottom-4 left-4 right-4 bg-[#121214]/95 border border-[#222226] rounded-xl p-3 z-30 shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white font-mono">{hoveredBox.label}</span>
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black font-mono tracking-wider ${
                    hoveredBox.parent.severity.toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    hoveredBox.parent.severity.toLowerCase() === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-[#7342e2]/10 text-[#7342e2] border border-[#7342e2]/20'
                  }`}>
                    {hoveredBox.parent.severity}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{hoveredBox.parent.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Playback Navigation Scrubbing Dock ───────────────────────────── */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.max(activeStep - 1, 0)); }}
                disabled={activeStep === 0}
                className="p-2 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#1a1a1e] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-[#7342e2] hover:bg-[#4bc089] text-black shadow-lg transition-transform active:scale-95 flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Next */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.min(activeStep + 1, totalSteps - 1)); }}
                disabled={activeStep === totalSteps - 1}
                className="p-2 rounded-lg border border-[#222226] bg-[#0d0d0f] hover:bg-[#1a1a1e] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-[11px] font-mono text-zinc-400 ml-2">
                STEP <span className="text-[#7342e2] font-black">{activeStep + 1}</span> / {totalSteps}
              </span>

              {liveStepCount > 0 && (
                <button
                  onClick={onResetLiveStep}
                  className="ml-2 px-1.5 py-0.5 rounded bg-[#7342e2]/10 hover:bg-[#7342e2]/20 border border-[#7342e2]/20 text-[#7342e2] text-[9.5px] font-mono flex items-center gap-1 cursor-pointer transition-all animate-pulse"
                >
                  <span className="w-1 h-1 rounded-full bg-[#7342e2] inline-block" />
                  +{liveStepCount} Live Step{liveStepCount > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Playback Speed Toggles */}
            <div className="flex gap-1 bg-[#0a0a0c] p-1 border border-[#222226] rounded-lg">
              {([0.5, 1, 2] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    playbackSpeed === speed 
                      ? 'bg-[#7342e2]/15 text-[#7342e2] border border-[#7342e2]/20' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubbing slider */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">START</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={totalSteps - 1}
                value={activeStep}
                onChange={(e) => {
                  setIsPlaying(false);
                  setActiveStep(parseInt(e.target.value, 10));
                }}
                className="w-full accent-[#7342e2] bg-[#222226] h-1 rounded appearance-none cursor-pointer"
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">END</span>
          </div>
        </div>
      </div>

      {/* ── Cognitive Insights & Terminal Action Streams Sidebar ───────────── */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 lg:h-full overflow-y-auto pr-1">
        {/* Step context details card */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222226] pb-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">Step Diagnostics</h4>
            <span className="text-[9px] font-mono text-[#7342e2] bg-[#7342e2]/10 border border-[#7342e2]/20 px-2 py-0.5 rounded-md font-bold">
              ACTIVE STEP
            </span>
          </div>

          {/* Interaction action detail */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Active Action Target</span>
            {currentFrame.action ? (
              <div className="p-3 bg-[#0d0d10] border border-[#222226] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold text-[#7342e2] uppercase">{currentFrame.action.type}</span>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#222226] rounded uppercase text-zinc-400">
                    {currentFrame.action.status}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-300 break-all">{currentFrame.action.target || 'N/A'}</p>
                {currentFrame.action.value && (
                  <p className="text-[10px] font-mono text-zinc-500 mt-1 italic">Input: "{currentFrame.action.value}"</p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#0d0d10] border border-dashed border-[#222226] rounded-lg text-center">
                <span className="text-[11px] font-sans italic text-zinc-600">No active interactions on this view</span>
              </div>
            )}
          </div>

          {/* Active step thoughts */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Agent Reasoning thought</span>
            {currentFrame.thoughts && currentFrame.thoughts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {currentFrame.thoughts.map((thought, i) => (
                  <div key={i} className="p-3 bg-[#0d0d10] border border-[#222226] rounded-lg text-[11px] text-zinc-400 leading-relaxed font-sans italic relative">
                    <div className="absolute top-1 right-2 text-[9px] font-mono text-zinc-700">#{i + 1}</div>
                    "{thought}"
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-[#0d0d10] border border-dashed border-[#222226] rounded-lg text-center">
                <span className="text-[11px] font-sans italic text-zinc-600">No telemetry traces logged for this frame</span>
              </div>
            )}
          </div>

          {/* Findings triggered around this frame */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Flagged UX defects</span>
            {currentFrame.findings && currentFrame.findings.length > 0 ? (
              <div className="flex flex-col gap-2">
                {currentFrame.findings.map((f, i) => (
                  <div key={i} className="p-3 bg-[#0d0d10] border border-red-500/10 rounded-lg text-[11px] flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white leading-tight font-sans">{f.title}</span>
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold uppercase shrink-0">
                        {f.severity}
                      </span>
                    </div>
                    {f.recommendation && (
                      <p className="text-[9.5px] font-mono text-[#7342e2] mt-1 border-t border-[#222226] pt-1 leading-snug">
                        → Rec: {f.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-[#0d0d10] border border-dashed border-[#222226] rounded-lg text-center">
                <span className="text-[11px] font-sans italic text-zinc-600">No active defects triggered on this step</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
