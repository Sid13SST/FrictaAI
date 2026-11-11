import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClerkLoaded, ClerkLoading } from '@clerk/clerk-react';
import { ArrowLeft, Info, RefreshCw } from 'lucide-react';
import { CinematicBackground } from '../CinematicBackground';
import { Skeleton } from '../common/Skeleton';

interface AuthShellProps {
  mode: 'sign-in' | 'sign-up';
  children: ReactNode;
}

const COPY = {
  'sign-in': {
    loading: 'Loading secure sign-in…',
    redirect: 'Sign in to continue. You’ll go straight to your dashboard afterwards.',
    after: 'After signing in you’ll land on your dashboard.',
    switchPrompt: 'New to Fricta?',
    switchLabel: 'Create an account',
    switchTo: '/register',
  },
  'sign-up': {
    loading: 'Loading secure sign-up…',
    redirect: 'Create an account to continue. You’ll go straight to your dashboard afterwards.',
    after: 'After signing up you’ll land on your dashboard, ready to create your first project.',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchTo: '/login',
  },
} as const;

/** How long to wait on the auth widget before telling the user something is off. */
const SLOW_LOAD_MS = 8000;

/**
 * Placeholder with the same footprint as the Clerk card, shown until the
 * widget script has loaded — otherwise the page is an empty background for a
 * second or more on a cold visit.
 */
const AuthCardSkeleton = ({ label }: { label: string }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="liquid-glass w-full max-w-[420px] rounded-2xl p-6 sm:p-8"
    >
      <Skeleton className="h-5 w-40 mx-auto rounded-full" />
      <Skeleton className="h-3 w-56 max-w-full mx-auto rounded-full mt-3" />
      <Skeleton className="h-10 w-full rounded-xl mt-8" />
      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/10" />
        <Skeleton className="h-2.5 w-6 rounded-full" />
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="h-10 w-full rounded-xl mt-2.5" />
      <Skeleton className="h-10 w-full rounded-xl mt-5" />
      <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>

      {slow && (
        <div
          className="mt-5 rounded-xl px-3.5 py-3 text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(255,255,255,0.7)' }}
        >
          <p>This is taking longer than usual. Check your connection, or disable any extension that blocks third-party scripts, then reload.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-amber-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reload page
          </button>
        </div>
      )}
    </div>
  );
};

/** Shared frame for the Login and Register pages. */
export const AuthShell = ({ mode, children }: AuthShellProps) => {
  const copy = COPY[mode];
  const [params] = useSearchParams();
  // Clerk appends `redirect_url` when it bounces a signed-out visitor away
  // from a protected route. It is only used here to choose which sentence to
  // show — never as a navigation target.
  const wasRedirected = params.has('redirect_url');

  return (
    <CinematicBackground>
      <header className="flex items-center justify-between gap-4 px-4 sm:px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 group min-w-0">
          <span className="w-8 h-8 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="" className="w-full h-full object-cover" />
          </span>
          <span className="text-white font-display font-semibold text-lg tracking-tight">Fricta</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 pb-12 gap-5">
        {wasRedirected && (
          <div
            role="status"
            className="w-full max-w-[420px] flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed"
            style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.3)', color: 'rgba(255,255,255,0.8)' }}
          >
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#9B72FA' }} />
            <span>{copy.redirect}</span>
          </div>
        )}

        <ClerkLoading>
          <AuthCardSkeleton label={copy.loading} />
        </ClerkLoading>
        <ClerkLoaded>{children}</ClerkLoaded>

        <div className="w-full max-w-[420px] text-center text-xs leading-relaxed space-y-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {!wasRedirected && <p>{copy.after}</p>}
          <p>
            {copy.switchPrompt}{' '}
            <Link to={copy.switchTo} className="font-semibold text-[#9B72FA] hover:text-white transition-colors">
              {copy.switchLabel}
            </Link>
          </p>
        </div>
      </main>
    </CinematicBackground>
  );
};
