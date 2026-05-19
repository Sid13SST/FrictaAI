import React from 'react';
import { Lightbulb, ShieldAlert } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  evidence: string;
  severity: string;
}

export function RecommendationCards({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        No recommendations generated for this session.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recommendations.map((rec, i) => (
        <div key={rec.id || i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-white">{rec.title}</h3>
            </div>
            {rec.severity === 'HIGH' && (
              <span className="flex items-center px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded border border-red-500/20">
                <ShieldAlert className="w-3 h-3 mr-1" /> Critical
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">{rec.description}</p>
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
            <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Evidence</div>
            <p className="text-sm text-slate-300 italic">"{rec.evidence}"</p>
          </div>
        </div>
      ))}
    </div>
  );
}
