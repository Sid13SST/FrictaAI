import React, { useState } from 'react';
import { Eye, ShieldAlert, Layers, Activity } from 'lucide-react';
import { apiFetch, API_BASE } from '../../lib/api';

interface Screenshot {
  id: string;
  stepIndex: number;
  filePath: string;
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  actionContext?: string;
  timestamp: string;
}

interface FindingCorrelation {
  id: string;
  correlationType: string;
  summary: string;
  confidence: number;
  metadata?: any;
  timestamp: string;
}

interface VisualFinding {
  id: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  boundingBoxes: any;
}

interface CognitiveSignal {
  id: string;
  signalType: string;
  intensity: number;
  timestamp: string;
  metadata?: any;
}

interface FindingCorrelationInspectorProps {
  screenshots: Screenshot[];
  visualFindings: VisualFinding[];
  cognitiveSignals: CognitiveSignal[];
  correlations: FindingCorrelation[];
  onSelectStep: (step: number) => void;
}

export const FindingCorrelationInspector: React.FC<FindingCorrelationInspectorProps> = ({
  screenshots,
  visualFindings,
  cognitiveSignals,
  correlations,
  onSelectStep,
}) => {
  const [selectedCorrelation, setSelectedCorrelation] = useState<FindingCorrelation | null>(null);

  // Group cognitive signals by URL or type to find hotspots
  const hotspots: Record<string, { intensitySum: number; count: number; signals: CognitiveSignal[] }> = {};
  cognitiveSignals.forEach(sig => {
    const key = sig.signalType || 'General Overhead';
    if (!hotspots[key]) hotspots[key] = { intensitySum: 0, count: 0, signals: [] };
    hotspots[key].intensitySum += sig.intensity || 0;
    hotspots[key].count += 1;
    hotspots[key].signals.push(sig);
  });

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* ── Correlation Clusters ────────────────────────────────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Cross-Agent Findings Correlations</h4>
          <span className="text-[9.5px] font-mono text-zinc-500">
            {correlations.length} CLUSTERS
          </span>
        </div>

        {correlations.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
            No active multi-agent cross-correlations identified.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {correlations.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedCorrelation(c)}
                className={`p-4 bg-[#0d0d0f]/60 hover:bg-[#0d0d0f]/90 border border-[#222226] hover:border-zinc-800 rounded-lg text-left transition-all relative overflow-hidden flex flex-col gap-1.5 ${
                  selectedCorrelation?.id === c.id ? 'border-[#5ed29c]/40 bg-[#0d0d0f]/90' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-bold text-[#5ed29c] bg-[#5ed29c]/10 border border-[#5ed29c]/20 px-1.5 py-0.5 rounded uppercase">
                    {c.correlationType}
                  </span>
                  <span className="text-[9.5px] font-mono text-zinc-500">
                    Confidence: <span className="font-bold text-[#5ed29c]">{Math.round(c.confidence * 100)}%</span>
                  </span>
                </div>
                <p className="text-xs text-white font-bold leading-tight font-mono">{c.summary}</p>
                <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                  Mapped across: {c.metadata?.agentTypes?.join(' + ') || 'Specialist Network'}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Selected Correlation details popup */}
        {selectedCorrelation && (
          <div className="mt-2 p-4 bg-[#09090b] border border-[#222226] rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-[#222226] pb-2">
              <span className="text-xs font-bold text-white font-mono">Cluster Metadata Analysis</span>
              <button 
                onClick={() => setSelectedCorrelation(null)} 
                className="text-[10px] font-mono text-zinc-500 hover:text-white"
              >
                [CLOSE]
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{selectedCorrelation.summary}</p>
            {selectedCorrelation.metadata && (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-1">
                <div className="flex flex-col gap-0.5 bg-[#121214] p-2 rounded border border-zinc-900">
                  <span className="text-zinc-500">Correlation Type</span>
                  <span className="text-[#5ed29c] font-black">{selectedCorrelation.correlationType}</span>
                </div>
                <div className="flex flex-col gap-0.5 bg-[#121214] p-2 rounded border border-zinc-900">
                  <span className="text-zinc-500">Session Step Range</span>
                  <span className="text-white font-black">{selectedCorrelation.metadata.stepRange || 'Full Sequence'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Evidence Visualizer (Grid list of screenshots) ──────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Visual Screenshot Evidence</h4>
          <span className="text-[9.5px] font-mono text-zinc-500">
            {screenshots.length} FRAMES
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {screenshots.map((s, idx) => {
            const hasVisualFinding = visualFindings.some(vf => vf.id === s.id);
            const imageUrl = s.filePath.startsWith('http')
              ? s.filePath
              : `${API_BASE}/workflows/screenshots/raw/${s.filePath}`;

            return (
              <div
                key={s.id}
                onClick={() => onSelectStep(s.stepIndex)}
                className="bg-[#0d0d0f] border border-[#222226] hover:border-[#5ed29c]/40 rounded-xl overflow-hidden cursor-pointer group transition-all"
              >
                <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={`Screenshot ${s.stepIndex}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {hasVisualFinding && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white rounded p-1 shadow-lg shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-400">
                    STEP {s.stepIndex + 1}
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-1 min-w-0">
                  <span className="text-[9.5px] font-mono text-zinc-500 truncate leading-none">
                    {s.pageUrl.split('/').pop() || 'index'}
                  </span>
                  <span className="text-[9px] font-sans text-zinc-400 truncate leading-none">
                    {s.actionContext || 'Static display'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cognitive Signal Hotspots ──────────────────────────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Cognitive Signal Hotspots</h4>
          <span className="text-[9.5px] font-mono text-zinc-500">
            {cognitiveSignals.length} CAPTURES
          </span>
        </div>

        {cognitiveSignals.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 font-mono text-[11px] italic">
            No usability or cognitive overhead signals captured.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(hotspots).map(([type, stats], i) => {
              const avgIntensity = Math.round(stats.intensitySum / stats.count);
              return (
                <div key={i} className="p-3 bg-[#0d0d0f]/60 border border-[#222226] rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono leading-none truncate max-w-[70%]">{type}</span>
                    <span className="text-[9.5px] font-mono text-[#5ed29c] bg-[#5ed29c]/10 px-1.5 py-0.5 rounded border border-[#5ed29c]/20 font-bold shrink-0">
                      INT: {avgIntensity}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Active samples:</span>
                    <span className="font-bold text-zinc-300">{stats.count} counts</span>
                  </div>
                  <div className="w-full bg-[#16161a] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#5ed29c] rounded-full transition-all duration-300"
                      style={{ width: `${avgIntensity}%` }}
                    />
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
