import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Monitor, Maximize2, ZoomIn, ZoomOut, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if ctrl/cmd is pressed or if already zoomed in, to avoid trapping normal scroll
    if (e.metaKey || e.ctrlKey || scale > 1) {
      e.preventDefault();
      setScale(s => Math.min(Math.max(1, s - e.deltaY * 0.005), 5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-4 justify-center bg-[#0F1014] p-5 rounded-[12px] border border-[#222226] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play / Pause (Large) */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-full bg-[#7342e2] hover:bg-[#9064f5] text-black shadow-[0_0_15px_rgba(115,66,226,0.3)] transition-all active:scale-95 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex items-center gap-1.5">
              {/* Back */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.max(activeStep - 1, 0)); }}
                disabled={activeStep === 0}
                className="p-2 rounded-lg border border-[#222226] bg-[#151518] hover:bg-[#1f1f23] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next */}
              <button
                onClick={() => { setIsPlaying(false); setActiveStep(Math.min(activeStep + 1, totalSteps - 1)); }}
                disabled={activeStep === totalSteps - 1}
                className="p-2 rounded-lg border border-[#222226] bg-[#151518] hover:bg-[#1f1f23] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-[10px] font-mono text-zinc-500 ml-2">
              FRAME <span className="text-zinc-200 font-black">{activeStep + 1}</span> <span className="mx-1">/</span> {totalSteps}
            </span>

            {liveStepCount > 0 && (
              <button
                onClick={onResetLiveStep}
                className="ml-3 px-2 py-1 rounded bg-[#7342e2]/10 hover:bg-[#7342e2]/20 border border-[#7342e2]/20 text-[#7342e2] text-[9px] font-mono flex items-center gap-1.5 cursor-pointer transition-all animate-pulse shadow-[0_0_8px_rgba(115,66,226,0.15)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7342e2] inline-block" />
                SYNC TO LIVE ({liveStepCount})
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
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black">START</span>
          <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
            {/* Custom slider track */}
            <div className="absolute left-0 right-0 h-1.5 bg-[#222226] rounded-full overflow-hidden pointer-events-none">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-[#7342e2] transition-all duration-100" 
                style={{ width: `${(activeStep / Math.max(1, totalSteps - 1)) * 100}%` }} 
              />
            </div>
            {/* Invisible native input for behavior */}
            <input
              type="range"
              min={0}
              max={totalSteps - 1}
              value={activeStep}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveStep(parseInt(e.target.value, 10));
              }}
              className="w-full absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {/* Custom Thumb (visible on hover) */}
            <div 
              className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transform -translate-x-1/2 pointer-events-none transition-all duration-100 opacity-0 group-hover:opacity-100"
              style={{ left: `${(activeStep / Math.max(1, totalSteps - 1)) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black">END</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full min-h-0">
      {/* ── Visual Screenshot Area ────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
        className="w-full lg:w-[60%] flex flex-col gap-3 min-w-0"
      >
        <div className="relative border border-[#222226] rounded-[12px] overflow-hidden bg-[#0F1014] flex-1 flex flex-col shadow-[inset_0_1px_4px_rgba(255,255,255,0.02)]">
          {/* Virtual Browser Top Address Bar */}
          <div className="w-full bg-[#151518] px-4 py-2.5 border-b border-[#222226] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2 max-w-[60%]">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/50" />
              <span className="text-zinc-600 px-2">|</span>
              <span className="truncate text-zinc-300 font-semibold">{currentFrame.screenshot.pageUrl}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-500 shrink-0 text-[10px]">
              <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> 1280 x 720</span>
              <span className="text-zinc-700">|</span>
              <div className="flex items-center gap-1.5 bg-[#0a0a0c] px-1.5 py-1 rounded border border-[#222226]">
                <button onClick={() => setScale(s => Math.max(1, s - 0.2))} className="hover:text-white transition-colors"><ZoomOut className="w-3 h-3" /></button>
                <span className="w-8 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="hover:text-white transition-colors"><ZoomIn className="w-3 h-3" /></button>
                {scale > 1 && <button onClick={resetZoom} className="ml-1 text-[#7342e2] hover:text-[#9064f5]"><MousePointer2 className="w-3 h-3" /></button>}
              </div>
              <button onClick={() => setIsFullscreen(true)} className="hover:text-white ml-1 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Interactive Bounding Canvas */}
          <div 
            className="relative flex-1 flex flex-col bg-[#0F1014] min-h-[350px] overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
              <div 
                className="relative flex items-center justify-center transition-transform duration-75 origin-center max-w-full max-h-full"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
              >
                {/* Tightly hugging container */}
                <div className="relative inline-block max-w-full shadow-lg" style={{ maxHeight: '65vh' }}>
                  <img
                    src={imageUrl}
                    alt={`Investigation step ${activeStep}`}
                    className="max-w-full block pointer-events-none rounded-md"
                    style={{ maxHeight: '65vh' }}
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
                </div>
              </div>
            </div>

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
      </motion.div>

      {/* ── Cognitive Insights & Terminal Action Streams Sidebar ───────────── */}
      <motion.div 
        initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        className="w-full lg:w-[40%] flex flex-col gap-5 shrink-0 lg:h-full overflow-y-auto pr-1"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
          <h4 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest font-mono">STEP INSIGHTS</h4>
          <span className="text-[9px] font-mono text-[#7342e2] bg-[#7342e2]/10 border border-[#7342e2]/20 px-2 py-0.5 rounded-md font-bold">
            ACTIVE STEP
          </span>
        </div>

        {/* Interaction action detail */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-2.5">
          <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Interaction</span>
          {currentFrame.action ? (
            <div className="p-3 bg-[#0F1014] border border-[#222226] rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-[#7342e2] uppercase">{currentFrame.action.type}</span>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#222226] rounded uppercase text-zinc-400">
                  {currentFrame.action.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 break-all">{currentFrame.action.target || 'N/A'}</p>
              {currentFrame.action.value && (
                <p className="text-[10px] font-mono text-zinc-500 mt-2 bg-[#0a0a0c] px-2 py-1.5 rounded italic">Input: "{currentFrame.action.value}"</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full border border-zinc-600"></span>
              No interaction recorded
            </div>
          )}
        </motion.div>

        {/* Active step thoughts */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-2.5">
          <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Agent Reasoning</span>
          {currentFrame.thoughts && currentFrame.thoughts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {currentFrame.thoughts.map((thought, i) => (
                <div key={i} className="p-3 bg-[#0F1014] border border-[#222226] rounded-xl text-[11px] text-zinc-300 leading-relaxed font-sans shadow-sm relative">
                  <div className="absolute top-2 right-3 text-[9px] font-mono text-zinc-600">#{i + 1}</div>
                  <span className="italic">"{thought}"</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full border border-zinc-600"></span>
              No reasoning available
            </div>
          )}
        </motion.div>

        {/* Findings triggered around this frame */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-2.5">
          <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">UX Findings</span>
          {currentFrame.findings && currentFrame.findings.length > 0 ? (
            <div className="flex flex-col gap-2">
              {currentFrame.findings.map((f, i) => (
                <div key={i} className="p-3 bg-[#181111] border border-red-500/20 rounded-xl text-[11px] flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-100 leading-tight font-sans flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                      {f.title}
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase shrink-0">
                      {f.severity}
                    </span>
                  </div>
                  {f.recommendation && (
                    <p className="text-[10px] font-mono text-red-300/80 mt-1.5 border-t border-red-500/10 pt-1.5 leading-snug">
                      → {f.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-500/70 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full border border-green-500/50"></span>
              ✓ No UX defects detected
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0F1014]/95 backdrop-blur-xl flex items-center justify-center p-8"
            onClick={() => setIsFullscreen(false)}
          >
            <button className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 rounded-full bg-[#151518] border border-[#222226]">
              <Maximize2 className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={imageUrl}
              className="w-full h-full object-contain cursor-zoom-out"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
