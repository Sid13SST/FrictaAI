import React, { useEffect, useState, useRef } from 'react';
import { 
  Play, Pause, FastForward, Info, Globe, Cpu, AlertTriangle, 
  Sparkles, Layers, ChevronRight, ChevronLeft, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VisualReplayViewerProps {
  sessionId: string;
}

export function VisualReplayViewer({ sessionId }: VisualReplayViewerProps) {
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // multiplier (e.g. 1x, 2x, 4x)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchReplayData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:3001/api/workflows/${sessionId}/visual-replay`);
        if (!res.ok) throw new Error('Failed to load visual replay data');
        const data = await res.json();
        
        // Ensure screenshots are present
        if (!data.screenshots || data.screenshots.length === 0) {
          setError('No screenshots available for this session.');
        } else {
          setTimelineData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching visual timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchReplayData();
  }, [sessionId]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying && timelineData?.screenshots) {
      const baseInterval = 3000; // 3 seconds per step at 1x
      const interval = baseInterval / playbackSpeed;
      
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= timelineData.screenshots.length - 1) {
            setIsPlaying(false); // Stop when reaching the end
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timelineData, playbackSpeed]);

  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-12 text-center h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-blue-500/10 via-transparent to-transparent opacity-50" />
        <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium tracking-wide">Compiling Cinematic Visual Replay...</p>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-12 text-center h-[350px] flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-amber-500/80 mb-4" />
        <p className="text-slate-400 font-medium">{error || 'No visual replay data'}</p>
      </div>
    );
  }

  const { screenshots, actions, thoughts, signals, events } = timelineData;
  const currentScreenshot = screenshots[currentStepIndex];

  // Match corresponding action & thought for the current step index
  const currentAction = actions.find((a: any) => a.stepNumber === currentScreenshot.stepIndex);
  const currentThought = thoughts.find((t: any) => t.stepNumber === currentScreenshot.stepIndex);
  const currentMetadata = currentScreenshot.metadata || {};

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(screenshots.length - 1, prev + 1));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="bg-slate-950 border border-slate-900/60 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">Visual Timeline Replay</h3>
            <p className="text-xs text-slate-500 font-mono">Session: {sessionId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            {currentStepIndex + 1} / {screenshots.length} Steps
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            FPS: {playbackSpeed}x
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Playback & Screenshot Viewer Pane */}
        <div className="lg:col-span-3 p-6 border-r border-slate-900/60 flex flex-col justify-between bg-black/20">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-900 bg-slate-950 flex items-center justify-center shadow-inner group">
            <img 
              src={`http://127.0.0.1:3001/api/workflows/screenshots/raw/${currentScreenshot.filePath}`}
              alt={`Replay step ${currentScreenshot.stepIndex}`}
              className="max-h-full max-w-full object-contain transition-all duration-300"
            />

            {/* Error Overlay */}
            {currentScreenshot.screenshotType === 'error' && (
              <div className="absolute inset-0 bg-red-950/20 border border-red-500/30 pointer-events-none flex items-start p-4">
                <span className="px-2.5 py-1 bg-red-950/80 border border-red-500/50 rounded-full text-xs font-semibold text-red-400 flex items-center shadow-lg backdrop-blur-sm animate-pulse">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  FAIL STATE CAPTURE
                </span>
              </div>
            )}

            {/* Hover timeline tooltip info */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded px-2.5 py-1 text-[10px] text-slate-400 font-mono shadow-xl">
              Aspect: {currentScreenshot.viewportWidth} × {currentScreenshot.viewportHeight}
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="mt-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all flex items-center justify-center min-w-[70px]"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button 
                  onClick={handleNext}
                  disabled={currentStepIndex === screenshots.length - 1}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scrubber track */}
              <div className="flex-1 px-4">
                <input 
                  type="range"
                  min="0"
                  max={screenshots.length - 1}
                  value={currentStepIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStepIndex(parseInt(e.target.value));
                  }}
                  className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Speed toggle */}
              <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg">
                {[1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                      playbackSpeed === speed 
                        ? 'bg-blue-600/20 border border-blue-500/35 text-blue-400' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Side Panel */}
        <div className="p-6 bg-slate-950 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Thought Stream section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Agent Thoughts</h4>
              </div>
              <div className="bg-purple-950/10 border border-purple-500/10 rounded-lg p-3.5 text-xs text-purple-300 leading-relaxed shadow-sm max-h-[140px] overflow-y-auto">
                {currentThought ? currentThought.thought : 'Synthesizing DOM state and analyzing objective...'}
              </div>
            </div>

            {/* Action Context section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Execution Action</h4>
              </div>
              {currentAction ? (
                <div className="bg-slate-900/50 border border-slate-900 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Type</span>
                    <span className="text-xs font-semibold text-white px-2 py-0.5 bg-slate-950 border border-slate-850 rounded">
                      {currentAction.action}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target</span>
                    <span className="text-xs font-semibold text-blue-400 truncate max-w-[120px]">
                      {currentAction.target || 'N/A'}
                    </span>
                  </div>
                  {currentAction.value && (
                    <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Value</span>
                      <span className="text-xs font-semibold text-slate-300 font-mono truncate max-w-[120px]">
                        {currentAction.value}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      currentAction.status === 'completed' 
                        ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-950/30 text-red-400 border border-red-500/20'
                    }`}>
                      {currentAction.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-900 rounded-lg p-3.5 text-xs text-slate-500 italic">
                  No action dispatched for this frame.
                </div>
              )}
            </div>

            {/* DOM & Browser Metadata section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Globe className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">DOM Metadata</h4>
              </div>
              <div className="bg-slate-900/20 border border-slate-900/60 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Interactive Elements</span>
                  <span className="text-white font-semibold font-mono">{currentMetadata.interactiveElementsCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Pixel Ratio</span>
                  <span className="text-white font-mono">{currentMetadata.devicePixelRatio ?? 1}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>WebP Payload</span>
                  <span className="text-white font-mono">{formatFileSize(currentScreenshot.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Page Title</span>
                  <span className="text-white font-semibold truncate max-w-[120px]">{currentMetadata.pageTitle || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Agent Footer */}
          <div className="mt-6 pt-4 border-t border-slate-900 flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{currentMetadata.userAgent || 'Mozilla/5.0...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
