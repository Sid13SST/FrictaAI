import { Monitor } from 'lucide-react';

interface DesktopOnlyNoticeProps {
  feature: string;
  description?: string;
}

/**
 * Shown in place of power-user tooling (Session Replay, Evidence Explorer,
 * Investigation Console, etc.) below the `lg` breakpoint. These views assume
 * multi-column layouts and precise pointer interaction that don't translate
 * to phone/tablet screens — pair with a sibling wrapped in `hidden lg:...`
 * rather than trying to make the real UI responsive.
 */
export const DesktopOnlyNotice = ({ feature, description }: DesktopOnlyNoticeProps) => (
  <div className="lg:hidden flex flex-col items-center justify-center text-center py-20 px-6 gap-4 min-h-[50vh]">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)' }}
    >
      <Monitor className="w-6 h-6" style={{ color: '#9B72FA' }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white mb-1.5">{feature} is optimized for desktop</p>
      <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {description || 'Please continue on a larger screen for the full experience.'}
      </p>
    </div>
  </div>
);
