import React from 'react';
import { Sparkles, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';

interface CollaborativeInsight {
  id: string;
  title: string;
  summary: string;
  supportingEvidence: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: string;
}

interface CollaborativeInsightCenterProps {
  insights: CollaborativeInsight[];
}

export const CollaborativeInsightCenter: React.FC<CollaborativeInsightCenterProps> = ({
  insights,
}) => {
  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-red-400 border-red-500/20 bg-red-500/5';
      case 'HIGH':
        return 'text-orange-400 border-orange-500/20 bg-orange-500/5';
      case 'MEDIUM':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      default:
        return 'text-[#7342e2] border-[#7342e2]/20 bg-[#7342e2]/5';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* ── Collaborative Insights Grid ───────────────────────────────────── */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <h4 className="text-xs font-black font-mono uppercase tracking-wider text-white">Cooperative UX Synthesis</h4>
          <span className="text-[9.5px] font-mono text-zinc-500">
            {insights.length} RECOMMENDATIONS
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic">
            No cooperative insight recommendations generated yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {insights.map((insight, idx) => (
              <div
                key={insight.id || idx}
                className="p-4 bg-[#0d0d0f]/60 border border-[#222226] rounded-xl flex flex-col gap-3 relative overflow-hidden"
              >
                {/* Visual Top Glow Edge */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7342e2]/20 to-transparent" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono text-zinc-500 font-black uppercase tracking-widest">
                      INSIGHT #{idx + 1}
                    </span>
                    <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityStyles(insight.severity)}`}>
                      {insight.severity}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-500">
                    Confidence Metric: <span className="font-bold text-[#7342e2]">{Math.round(insight.confidence * 100)}%</span>
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-[#7342e2]/5 border border-[#7342e2]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#7342e2]" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-white font-mono leading-tight">{insight.title}</h5>
                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed font-sans">{insight.summary}</p>
                  </div>
                </div>

                {insight.supportingEvidence && (
                  <div className="p-3 bg-[#0a0a0c] border border-zinc-900 rounded-lg text-[10px] font-mono text-zinc-500 leading-relaxed flex flex-col gap-1">
                    <span className="text-zinc-600 font-black uppercase">Supporting Evidence Logs:</span>
                    <span>{insight.supportingEvidence}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
