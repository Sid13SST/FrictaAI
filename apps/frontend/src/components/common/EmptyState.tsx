import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  /** Route to navigate to. Provide either `to` or `onClick`. */
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /**
   * `card` — standalone bordered panel for a whole page/section.
   * `inline` — borderless, for use inside an existing card.
   * `compact` — tight inline variant for narrow sidebars.
   */
  variant?: 'card' | 'inline' | 'compact';
  className?: string;
}

const ActionButton = ({ action, primary, small }: { action: EmptyStateAction; primary: boolean; small: boolean }) => {
  const className = `group inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-100 ${
    small ? 'px-3.5 py-2 text-xs' : 'px-5 py-2.5 text-sm'
  }`;
  const style = primary
    ? { background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 28px rgba(115,66,226,0.3)' }
    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' };
  const content = (
    <>
      {action.icon}
      {action.label}
      {primary && <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />}
    </>
  );
  return action.to ? (
    <Link to={action.to} className={className} style={style}>{content}</Link>
  ) : (
    <button type="button" onClick={action.onClick} className={className} style={style}>{content}</button>
  );
};

/**
 * Shared empty state: icon, one-line title, short explanation, and a CTA that
 * moves the user to the flow that fills the list.
 */
export const EmptyState = ({
  icon, title, description, action, secondaryAction, variant = 'card', className = '',
}: EmptyStateProps) => {
  const compact = variant === 'compact';
  const card = variant === 'card';

  return (
    <div
      className={`relative flex flex-col items-center justify-center text-center overflow-hidden ${
        card ? 'rounded-3xl px-6 py-16 sm:py-20' : compact ? 'px-4 py-8' : 'px-6 py-12 sm:py-14'
      } ${className}`}
      style={card ? {
        background: 'radial-gradient(ellipse at 50% 0%, rgba(115,66,226,0.07), transparent 60%), rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.06)',
      } : undefined}
    >
      {card && (
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(115,66,226,0.3), transparent)' }}
        />
      )}
      <div
        className={`rounded-2xl flex items-center justify-center flex-shrink-0 ${compact ? 'w-11 h-11 mb-3' : 'w-14 h-14 mb-5'}`}
        style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.25)', color: '#9B72FA' }}
      >
        {icon}
      </div>
      <h3 className={`font-bold text-white tracking-tight ${card ? 'text-lg sm:text-xl' : 'text-sm'}`}>{title}</h3>
      {description && (
        <p
          className={`leading-relaxed max-w-sm ${card ? 'text-sm mt-2' : 'text-xs mt-1.5'}`}
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className={`flex flex-wrap items-center justify-center gap-2.5 ${compact ? 'mt-4' : 'mt-6'}`}>
          {action && <ActionButton action={action} primary small={!card} />}
          {secondaryAction && <ActionButton action={secondaryAction} primary={false} small={!card} />}
        </div>
      )}
    </div>
  );
};
