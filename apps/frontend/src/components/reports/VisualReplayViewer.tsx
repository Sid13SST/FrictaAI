import React, { useEffect, useState, useRef } from 'react';
import { 
  Play, Pause, Info, Globe, Cpu, AlertTriangle, 
  Sparkles, Layers, ChevronRight, ChevronLeft, Eye, 
  Activity, ShieldAlert, CheckCircle, TrendingUp, Settings, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, API_BASE } from '../../lib/api';

interface VisualReplayViewerProps {
  sessionId: string;
}

export function VisualReplayViewer({ sessionId }: VisualReplayViewerProps) {
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Visual intelligence states
  const [visualFindings, setVisualFindings] = useState<any[]>([]);
  const [visualScores, setVisualScores] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);
  const [useAIVision, setUseAIVision] = useState(false);
  
  // View toggle states
  const [findingsScope, setFindingsScope] = useState<'step' | 'session'>('step');
  const [showRegions, setShowRegions] = useState(false);
  const [showElements, setShowElements] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'findings' | 'timeline'>('console');

  // Fetch both replay data and visual intelligence data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch main replay data
      const replayRes = await apiFetch(`/workflows/${sessionId}/visual-replay`);
      if (!replayRes.ok) throw new Error('Failed to load visual replay data');
      const replayData = await replayRes.json();
      
      if (!replayData.screenshots || replayData.screenshots.length === 0) {
        setError('No screenshots available for this session.');
      } else {
        setTimelineData(replayData);
      }

      // 2. Fetch visual findings
      const findingsRes = await apiFetch(`/visual/findings/${sessionId}`);
      if (findingsRes.ok) {
        const findingsData = await findingsRes.json();
        setVisualFindings(findingsData.findings || []);
      }

      // 3. Fetch visual scores
      const scoresRes = await apiFetch(`/visual/scores/${sessionId}`);
      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        setVisualScores(scoresData.score || null);
      }

    } catch (err: any) {
      setError(err.message || 'Error fetching visual timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying && timelineData?.screenshots) {
      const baseInterval = 3000; // 3 seconds per step at 1x
      const interval = baseInterval / playbackSpeed;
      
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= timelineData.screenshots.length - 1) {
            setIsPlaying(false);
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

  const { screenshots, actions, thoughts } = timelineData;
  const currentScreenshot = screenshots[currentStepIndex];

  // Match corresponding action & thought for the current step index
  const currentAction = actions.find((a: any) => a.stepNumber === currentScreenshot.stepIndex);
  const currentThought = thoughts.find((t: any) => t.stepNumber === currentScreenshot.stepIndex);
  const currentMetadata = currentScreenshot.metadata || {};
  const currentLayout = currentMetadata.layout || { regions: [], elements: [] };

  // Filter findings for the current step
  const currentStepFindings = visualFindings.filter(
    (f) => f.screenshotId === currentScreenshot.id
  );

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(screenshots.length - 1, prev + 1));
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      const res = await apiFetch(`/visual/analyze/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceAIVision: useAIVision })
      });

      if (!res.ok) throw new Error('Visual intelligence scan failed');
      
      // Refresh findings and scores after completion
      const findingsRes = await apiFetch(`/visual/findings/${sessionId}`);
      if (findingsRes.ok) {
        const findingsData = await findingsRes.json();
        setVisualFindings(findingsData.findings || []);
      }

      const scoresRes = await apiFetch(`/visual/scores/${sessionId}`);
      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        setVisualScores(scoresData.score || null);
      }

      setActiveTab('findings');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to complete visual scan.');
    } finally {
      setScanning(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  // Helper to color codes based on score values
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/5';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-950/40 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-950/40 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30';
      default: return 'text-blue-400 bg-blue-950/40 border-blue-500/20';
    }
  };

  // Viewport metrics
  const vw = currentScreenshot.viewportWidth || 1280;
  const vh = currentScreenshot.viewportHeight || 720;

  return (
    <div className="bg-slate-950 border border-slate-900/60 rounded-xl overflow-hidden shadow-2xl relative">
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">Visual Intelligence Console</h3>
            <p className="text-xs text-slate-500 font-mono">Session: {sessionId.slice(0, 8)}</p>
          </div>
        </div>

        {/* Console View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowRegions(!showRegions)}
            className={`px-3 py-1 rounded text-xs border font-medium transition-colors flex items-center gap-1.5 ${
              showRegions 
                ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400' 
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded bg-emerald-500" />
            Regions
          </button>
          <button 
            onClick={() => setShowElements(!showElements)}
            className={`px-3 py-1 rounded text-xs border font-medium transition-colors flex items-center gap-1.5 ${
              showElements 
                ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' 
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded bg-blue-500" />
            Interactive Elements
          </button>
          <button 
            onClick={() => setShowFindings(!showFindings)}
            className={`px-3 py-1 rounded text-xs border font-medium transition-colors flex items-center gap-1.5 ${
              showFindings 
                ? 'bg-rose-600/10 border-rose-500/40 text-rose-400' 
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded bg-rose-500 animate-pulse" />
            UX Findings
          </button>
          <div className="h-5 w-px bg-slate-800 mx-1" />
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            {currentStepIndex + 1} / {screenshots.length} Steps
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Playback & Screenshot Viewer Pane */}
        <div className="lg:col-span-3 p-6 border-r border-slate-900/60 flex flex-col justify-between bg-black/20">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-900 bg-slate-950 flex items-center justify-center shadow-inner group">
            {/* The actual screenshot image */}
            <img 
              src={`${API_BASE}/workflows/screenshots/raw/${currentScreenshot.filePath}`}
              alt={`Replay step ${currentScreenshot.stepIndex}`}
              className="max-h-full max-w-full object-contain transition-all duration-300 select-none"
            />

            {/* Bounding Box Overlays Container */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Layout Regions Overlays */}
              {showRegions && currentLayout.regions?.map((region: any, i: number) => {
                const box = region.box;
                return (
                  <div
                    key={`region-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${(box.x / vw) * 100}%`,
                      top: `${(box.y / vh) * 100}%`,
                      width: `${(box.w / vw) * 100}%`,
                      height: `${(box.h / vh) * 100}%`,
                    }}
                    className="border border-emerald-500/40 bg-emerald-500/2 pointer-events-auto group/region flex items-start p-1"
                  >
                    <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-400 font-mono uppercase opacity-40 group-hover/region:opacity-100 transition-opacity">
                      {region.type}
                    </span>
                  </div>
                );
              })}

              {/* Layout Elements Overlays */}
              {showElements && currentLayout.elements?.map((el: any, i: number) => {
                const box = el.box;
                const getRoleColor = (role: string) => {
                  if (role === 'button') return 'border-blue-400/50 bg-blue-500/5';
                  if (role === 'input') return 'border-violet-400/50 bg-violet-500/5';
                  if (role === 'link') return 'border-cyan-400/40 bg-cyan-500/2';
                  return 'border-amber-400/40 bg-amber-500/2';
                };
                const getRoleText = (role: string) => {
                  if (role === 'button') return 'text-blue-300 bg-blue-950';
                  if (role === 'input') return 'text-violet-300 bg-violet-950';
                  if (role === 'link') return 'text-cyan-300 bg-cyan-950';
                  return 'text-amber-300 bg-amber-950';
                };

                return (
                  <div
                    key={`el-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${(box.x / vw) * 100}%`,
                      top: `${(box.y / vh) * 100}%`,
                      width: `${(box.w / vw) * 100}%`,
                      height: `${(box.h / vh) * 100}%`,
                    }}
                    className={`border pointer-events-auto group/el flex items-start justify-end p-0.5 ${getRoleColor(el.role)}`}
                  >
                    <span className={`px-1 py-0.2 rounded text-[7px] font-mono tracking-tight opacity-0 group-hover/el:opacity-100 transition-opacity pointer-events-none border ${
                      el.intent === 'primary' ? 'text-emerald-300 bg-emerald-950 border-emerald-500/30' : getRoleText(el.role) + ' border-slate-800'
                    }`}>
                      {el.role} {el.text ? `("${el.text.substring(0, 15)}")` : ''}
                    </span>
                  </div>
                );
              })}

              {/* Visual Findings Overlays */}
              {showFindings && currentStepFindings.map((finding: any) => {
                return (
                  <React.Fragment key={finding.id}>
                    {finding.boundingBoxes?.map((box: any, index: number) => {
                      const w = box.w !== undefined ? box.w : box.width;
                      const h = box.h !== undefined ? box.h : box.height;
                      const isHovered = hoveredFindingId === finding.id;
                      const isSelected = selectedFindingId === finding.id;

                      return (
                        <div
                          key={`${finding.id}-box-${index}`}
                          style={{
                            position: 'absolute',
                            left: `${(box.x / vw) * 100}%`,
                            top: `${(box.y / vh) * 100}%`,
                            width: `${(w / vw) * 100}%`,
                            height: `${(h / vh) * 100}%`,
                          }}
                          className={`border-2 border-dashed pointer-events-auto transition-all flex items-start justify-between p-1 bg-rose-500/5 ${
                            isHovered || isSelected
                              ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse z-10 scale-[1.01]'
                              : 'border-red-500/40'
                          }`}
                          onMouseEnter={() => setHoveredFindingId(finding.id)}
                          onMouseLeave={() => setHoveredFindingId(null)}
                          onClick={() => setSelectedFindingId(finding.id === selectedFindingId ? null : finding.id)}
                        >
                          <span className="px-1.5 py-0.5 bg-red-950 border border-red-500/40 rounded text-[9px] font-bold text-red-400 flex items-center gap-1 shadow-md shadow-black/45">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {finding.title}
                          </span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Scan Sweep pulse animation overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-blue-500/5 overflow-hidden pointer-events-none">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_#3b82f6] animate-scan" style={{ position: 'absolute', top: 0 }} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                  <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-lg shadow-xl backdrop-blur">
                    <Activity className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-slate-200 font-semibold tracking-wide">Executing Computer Vision & Heuristics scan...</span>
                  </div>
                </div>
              </div>
            )}

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
              Aspect: {vw} × {vh}
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="mt-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0 || scanning}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={scanning}
                  className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all flex items-center justify-center min-w-[70px]"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button 
                  onClick={handleNext}
                  disabled={currentStepIndex === screenshots.length - 1 || scanning}
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
                  disabled={scanning}
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
                    disabled={scanning}
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
        <div className="p-6 bg-slate-950 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-900">
          <div className="space-y-5">
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-900 pb-px">
              {(['console', 'findings', 'timeline'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 pb-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b ${
                    activeTab === tab
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: CONSOLE (Scores & metadata) */}
            {activeTab === 'console' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Scores visual card */}
                {visualScores ? (
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">UX Scoring System</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getScoreColorClass(visualScores.overallScore)}`}>
                        {visualScores.overallScore}% Overall
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Clarity</span>
                        <span className="text-sm font-bold font-mono text-slate-200">{visualScores.clarityScore}%</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Discoverability</span>
                        <span className="text-sm font-bold font-mono text-slate-200">{visualScores.discoverabilityScore}%</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Layout Balance</span>
                        <span className="text-sm font-bold font-mono text-slate-200">{visualScores.layoutBalanceScore}%</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Navigation</span>
                        <span className="text-sm font-bold font-mono text-slate-200">{visualScores.navigationScore}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 text-center">
                    <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No Visual UX score calculated yet.</p>
                  </div>
                )}

                {/* Scan controller */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center space-x-1.5">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Analysis Panel</span>
                  </div>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useAIVision}
                      onChange={(e) => setUseAIVision(e.target.checked)}
                      disabled={scanning}
                      className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-400 font-medium">Use OpenRouter Vision AI (Multimodal)</span>
                  </label>

                  <button
                    onClick={handleRunScan}
                    disabled={scanning}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Activity className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Running UX Scan...' : 'Scan Visual UX'}
                  </button>
                </div>

                {/* DOM & Browser Metadata section */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">DOM Metadata</h4>
                  </div>
                  <div className="bg-slate-900/20 border border-slate-900/60 rounded-lg p-3.5 text-xs space-y-2">
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
                      <span className="text-white font-semibold truncate max-w-[120px]" title={currentMetadata.pageTitle || 'N/A'}>
                        {currentMetadata.pageTitle || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FINDINGS */}
            {activeTab === 'findings' && (() => {
              const displayedFindings = findingsScope === 'step' ? currentStepFindings : visualFindings;
              
              const getStepNumber = (findingScreenshotId: string) => {
                const s = screenshots.find((sc: any) => sc.id === findingScreenshotId);
                return s ? s.stepIndex : null;
              };

              const handleFindingClick = (finding: any) => {
                const isSelected = selectedFindingId === finding.id;
                setSelectedFindingId(isSelected ? null : finding.id);

                // Jump to the screenshot step in the scrubber
                const targetIndex = screenshots.findIndex((s: any) => s.id === finding.screenshotId);
                if (targetIndex !== -1) {
                  setCurrentStepIndex(targetIndex);
                }
              };

              return (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Scope Switcher Toggle */}
                  <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg w-full">
                    <button
                      onClick={() => setFindingsScope('step')}
                      className={`flex-1 py-1 px-3 text-xs font-medium rounded-md transition-all ${
                        findingsScope === 'step'
                          ? 'bg-blue-600/20 border border-blue-500/35 text-blue-400'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      This Step
                    </button>
                    <button
                      onClick={() => setFindingsScope('session')}
                      className={`flex-1 py-1 px-3 text-xs font-medium rounded-md transition-all ${
                        findingsScope === 'session'
                          ? 'bg-blue-600/20 border border-blue-500/35 text-blue-400'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      All Steps
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {findingsScope === 'step' ? (
                        `${currentStepFindings.length} findings on step ${currentScreenshot.stepIndex}`
                      ) : (
                        `${visualFindings.length} session findings`
                      )}
                    </span>
                  </div>

                  {displayedFindings.length > 0 ? (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {displayedFindings.map((finding) => {
                        const stepNumber = getStepNumber(finding.screenshotId);
                        return (
                          <div
                            key={finding.id}
                            onMouseEnter={() => setHoveredFindingId(finding.id)}
                            onMouseLeave={() => setHoveredFindingId(null)}
                            onClick={() => handleFindingClick(finding)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              selectedFindingId === finding.id
                                ? 'bg-slate-900 border-red-500/50 shadow-md shadow-red-500/5'
                                : hoveredFindingId === finding.id
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-slate-900/40 border-slate-900/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getSeverityColor(finding.severity)}`}>
                                {finding.severity}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {findingsScope === 'session' && stepNumber !== null && (
                                  <span className="text-[9px] text-blue-400 bg-blue-950/40 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                                    Step {stepNumber}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {finding.findingType}
                                </span>
                              </div>
                            </div>
                            <h5 className="text-xs font-bold text-white mb-1">{finding.title}</h5>
                            <p className="text-[11px] text-slate-400 leading-normal">{finding.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-6 text-center text-slate-500 italic text-xs">
                      {findingsScope === 'step' 
                        ? 'No visual findings detected for this frame. Run Visual UX Scan or check toggles.' 
                        : 'No visual findings detected for this session. Run Visual UX Scan or check toggles.'}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Agent Thought stream */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Agent Thoughts</h4>
                  </div>
                  <div className="bg-purple-950/10 border border-purple-500/10 rounded-lg p-3 text-xs text-purple-300 leading-relaxed shadow-sm max-h-[140px] overflow-y-auto">
                    {currentThought ? currentThought.thought : 'Synthesizing DOM state and analyzing objective...'}
                  </div>
                </div>

                {/* Agent Action details */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Execution Action</h4>
                  </div>
                  {currentAction ? (
                    <div className="bg-slate-900/50 border border-slate-900 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Type</span>
                        <span className="text-xs font-semibold text-white px-2 py-0.5 bg-slate-950 border border-slate-850 rounded">
                          {currentAction.action}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Target</span>
                        <span className="text-xs font-semibold text-blue-400 truncate max-w-[120px]" title={currentAction.target || 'N/A'}>
                          {currentAction.target || 'N/A'}
                        </span>
                      </div>
                      {currentAction.value && (
                        <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 mt-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Value</span>
                          <span className="text-xs font-semibold text-slate-300 font-mono truncate max-w-[120px]" title={currentAction.value}>
                            {currentAction.value}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 mt-1.5">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Status</span>
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          currentAction.status === 'completed' 
                            ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-950/30 text-red-400 border border-red-500/20'
                        }`}>
                          {currentAction.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 border border-slate-900 rounded-lg p-3 text-xs text-slate-500 italic">
                      No action dispatched for this frame.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Agent Footer */}
          <div className="mt-6 pt-4 border-t border-slate-900 flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate" title={currentMetadata.userAgent || 'Mozilla/5.0...'}>
              {currentMetadata.userAgent || 'Mozilla/5.0...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
