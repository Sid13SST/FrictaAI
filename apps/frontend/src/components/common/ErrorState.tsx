import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, RefreshCw, SearchX, WifiOff, Loader2 } from 'lucide-react';
import { describeError, type ErrorKind } from '../../lib/errors';

interface ErrorStateProps {
  /** Anything thrown from a fetch path; run through `describeError`. */
  error: unknown;
  /** What was being loaded, e.g. "load your projects". */
  action?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /**
   * `panel` — centred block that replaces a page/section that failed to load.
   * `banner` — slim strip shown above content that is still on screen (stale data).
   */
  variant?: 'panel' | 'banner';
  /** Extra line under the message, e.g. "Retrying automatically every 3s." */
  hint?: string;
  className?: string;
}

const iconFor = (kind: ErrorKind) => {
  if (kind === 'NETWORK' || kind === 'TIMEOUT') return WifiOff;
  if (kind === 'AUTH' || kind === 'FORBIDDEN') return Lock;
  if (kind === 'NOT_FOUND') return SearchX;
  return AlertTriangle;
};

const RetryButton = ({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) => (
  <button
    type="button"
    onClick={onRetry}
    disabled={retrying}
    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-300 transition-colors hover:text-white disabled:opacity-60 flex-shrink-0"
    style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}
  >
    {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
    {retrying ? 'Retrying…' : 'Try again'}
  </button>
);

/** Shared error surface. Copy always comes from `describeError`. */
export const ErrorState = ({
  error, action, onRetry, retrying, variant = 'panel', hint, className = '',
}: ErrorStateProps) => {
  const { title, message, kind, retryable } = describeError(error, action);
  const Icon = iconFor(kind);
  const showRetry = !!onRetry && retryable;
  const signIn = kind === 'AUTH' && (
    <Link
      to="/login"
      className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)' }}
    >
      Sign in again
    </Link>
  );

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl px-4 py-3 ${className}`}
        style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className="w-4 h-4 mt-0.5 text-rose-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {message}{hint ? ` ${hint}` : ''}
            </p>
          </div>
        </div>
        {signIn}
        {showRetry && <RetryButton onRetry={onRetry!} retrying={retrying} />}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center min-h-[320px] ${className}`}>
      <div
        role="alert"
        className="text-center px-6 sm:px-8 py-10 rounded-3xl max-w-sm w-full"
        style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.18)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}
        >
          <Icon className="w-5 h-5 text-rose-400" />
        </div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{message}</p>
        {hint && <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{hint}</p>}
        {(showRetry || signIn) && (
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {signIn}
            {showRetry && <RetryButton onRetry={onRetry!} retrying={retrying} />}
          </div>
        )}
      </div>
    </div>
  );
};
