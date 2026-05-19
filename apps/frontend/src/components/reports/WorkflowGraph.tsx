import React from 'react';
import { ArrowDown, LogIn } from 'lucide-react';

interface Action {
  action: string;
  target: string;
  status: string;
}

export function WorkflowGraph({ actions }: { actions: Action[] }) {
  if (!actions || actions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        No actions recorded to visualize.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-medium text-white mb-6">Execution Flow</h3>
      <div className="flex flex-col items-center">
        {actions.map((act, idx) => (
          <React.Fragment key={idx}>
            <div className={`flex flex-col items-center justify-center p-3 px-6 rounded-lg border ${act.status === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'} shadow-sm`}>
              <span className="text-sm font-medium">{act.action}</span>
              <span className="text-xs opacity-70 mt-1 max-w-[200px] truncate">{act.target}</span>
            </div>
            {idx < actions.length - 1 && (
              <ArrowDown className="w-4 h-4 text-slate-600 my-2" />
            )}
          </React.Fragment>
        ))}
        <div className="mt-4 flex items-center text-emerald-500 text-sm font-medium">
          <LogIn className="w-4 h-4 mr-1" /> End of Session
        </div>
      </div>
    </div>
  );
}
