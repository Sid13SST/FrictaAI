import React from 'react';
import { Activity, Gauge, MousePointer2, Zap } from 'lucide-react';

interface ScoreProps {
  scores: {
    clarityScore: number;
    efficiencyScore: number;
    smoothnessScore: number;
    overallScore: number;
  };
}

export function UXScoreCards({ scores }: ScoreProps) {
  const cards = [
    { title: 'Overall UX Score', score: scores.overallScore, icon: <Activity className="w-5 h-5" /> },
    { title: 'Clarity Score', score: scores.clarityScore, icon: <Gauge className="w-5 h-5" /> },
    { title: 'Efficiency Score', score: scores.efficiencyScore, icon: <Zap className="w-5 h-5" /> },
    { title: 'Smoothness Score', score: scores.smoothnessScore, icon: <MousePointer2 className="w-5 h-5" /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-start shadow-sm">
          <div className="flex items-center space-x-3 mb-4 text-slate-400">
            {card.icon}
            <h3 className="text-sm font-medium">{card.title}</h3>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-semibold text-white">{card.score}</span>
            <span className="text-sm text-slate-500">/ 100</span>
          </div>
          {/* Simple progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4">
            <div
              className={`h-1.5 rounded-full ${card.score >= 80 ? 'bg-emerald-500' : card.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${card.score}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
