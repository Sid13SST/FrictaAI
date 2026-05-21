import React from 'react';
import { Lightbulb, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface ExecutiveSummary {
  overallUXGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  onboardingFrictionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  discoverabilityRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  majorFrictionStepIndices: number[];
  synthesizedInsights: string[];
}

interface GlobalInsightEngineProps {
  executiveSummary: ExecutiveSummary;
}

export const GlobalInsightEngine: React.FC<GlobalInsightEngineProps> = ({
  executiveSummary,
}) => {
  const getFrictionIcon = (level: string) => {
    if (level === 'CRITICAL') return <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />;
    if (level === 'HIGH') return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
    if (level === 'MEDIUM') return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />;
    return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
  };

  const getFrictionBadgeColor = (level: string) => {
    if (level === 'CRITICAL') return 'bg-red-500/10 border border-red-500/20 text-red-400';
    if (level === 'HIGH') return 'bg-orange-500/10 border border-orange-500/20 text-orange-400';
    if (level === 'MEDIUM') return 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400';
    return 'bg-green-500/10 border border-green-500/20 text-green-400';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* UX Grade */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
          <div>
            <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Overall Grade</span>
            <div className="text-xl font-bold text-white mt-1">UX Score: {executiveSummary.overallScore}</div>
          </div>
          <div className="w-12 h-12 rounded-lg bg-[#f43f5e]/10 border border-[#f43f5e]/25 flex items-center justify-center text-xl font-extrabold text-[#f43f5e]">
            {executiveSummary.overallUXGrade}
          </div>
        </div>

        {/* Onboarding Friction */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Onboarding Friction</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {getFrictionIcon(executiveSummary.onboardingFrictionLevel)}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${getFrictionBadgeColor(executiveSummary.onboardingFrictionLevel)}`}>
                {executiveSummary.onboardingFrictionLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Discoverability Risk */}
        <div className="bg-[#121214] border border-[#222226] rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Discoverability Risk</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {getFrictionIcon(executiveSummary.discoverabilityRiskLevel)}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${getFrictionBadgeColor(executiveSummary.discoverabilityRiskLevel)}`}>
                {executiveSummary.discoverabilityRiskLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Synthesis Section */}
      <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
        <h4 className="text-xs font-bold text-[#f4f4f5] tracking-wider uppercase flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-yellow-400" /> Executive Insights Synthesis
        </h4>
        <div className="flex flex-col gap-3">
          {executiveSummary.synthesizedInsights.map((insight, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-lg bg-[#0d0d0f] border border-[#222226] text-xs text-[#a1a1aa] leading-relaxed flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-semibold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
