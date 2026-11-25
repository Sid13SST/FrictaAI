import { Compass, Users, Brain, Sparkles, GitMerge, AlertOctagon, Lightbulb } from 'lucide-react';

export type AICapabilityId =
  | 'navigation'
  | 'persona'
  | 'reasoning'
  | 'intelligence'
  | 'correlation'
  | 'severity'
  | 'recommendations';

interface AIPipelineRibbonProps {
  /** Capability ids to visually highlight as "currently active" given real page state. */
  active?: AICapabilityId[];
  /** Optional persona label to substitute into the Persona Simulation description. */
  persona?: string | null;
  className?: string;
}

const STAGES: { id: AICapabilityId; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  { id: 'navigation',      icon: Compass,      label: 'Autonomous Navigation', desc: 'The agent clicks, scrolls, and fills forms on its own — no scripted steps.' },
  { id: 'persona',         icon: Users,        label: 'Persona Simulation',    desc: 'Behavior is shaped by a simulated user profile (patience, IA comfort, guidance needs).' },
  { id: 'reasoning',       icon: Brain,        label: 'AI Reasoning',          desc: 'Every action is preceded by a recorded thought explaining why.' },
  { id: 'intelligence',    icon: Sparkles,     label: 'UX Intelligence',       desc: 'Cognitive load, friction, and onboarding signals are scored as the run happens.' },
  { id: 'correlation',     icon: GitMerge,     label: 'Evidence Correlation',  desc: 'Screenshots, thoughts, and signals are linked to the exact step that produced them.' },
  { id: 'severity',        icon: AlertOctagon, label: 'Severity Classification', desc: 'Findings are ranked Critical → Low by real UX impact, not just detection order.' },
  { id: 'recommendations', icon: Lightbulb,    label: 'Recommendations',       desc: 'Each finding ships with a concrete, actionable fix — not just a description.' },
];

/**
 * Compact legend that names Fricta's AI pipeline stages in-product using the
 * same vocabulary as the landing page, so the "AI is doing real work" story
 * doesn't stop at the marketing site. Highlights whichever stages are live
 * given the host page's actual state (see `active`).
 */
export const AIPipelineRibbon = ({ active = [], persona, className = '' }: AIPipelineRibbonProps) => {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          How Fricta's AI is working
        </span>
      </div>
      {/* Phones get a wrapping row of compact chips; a 2-column grid of full
          tiles pushed the page's real content a full screen down. */}
      <div className="flex flex-wrap sm:grid sm:grid-cols-3 lg:grid-cols-7 gap-1.5 sm:gap-2">
        {STAGES.map((stage) => {
          const isActive = active.includes(stage.id);
          const Icon = stage.icon;
          const desc = stage.id === 'persona' && persona ? `Simulating: ${persona}` : stage.desc;
          return (
            <div
              key={stage.id}
              className="group relative flex flex-row sm:flex-col items-center sm:text-center gap-1.5 pl-1.5 pr-2.5 py-1.5 sm:px-2 sm:py-3 rounded-xl transition-all duration-300"
              style={{
                background: isActive ? 'rgba(115,66,226,0.1)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${isActive ? 'rgba(115,66,226,0.35)' : 'rgba(255,255,255,0.04)'}`,
              }}
            >
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${isActive ? 'sm:scale-110' : ''}`}
                style={{
                  background: isActive ? 'rgba(115,66,226,0.18)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#9B72FA' : 'rgba(255,255,255,0.4)',
                }}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                {stage.label}
              </span>

              {/* Tooltip on hover */}
              <div
                className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 w-44 p-2.5 rounded-lg text-[10px] leading-snug text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                style={{ background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              >
                {desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
