/**
 * DEV-ONLY — stand-in for `@clerk/clerk-react`, aliased in by
 * vite.fixtures.config.ts. The real Clerk SDK is never loaded by the fixture
 * harness, so no request reaches any Clerk instance and no session exists.
 *
 * Everything "signed in" here is fake. The <SignIn>/<SignUp> stand-ins are
 * static placeholders with roughly the footprint of Clerk's card; they do not
 * reproduce Clerk's markup, validation, or error rendering.
 */
import type { ReactNode } from 'react';
import { authLoading } from './scenario';

const FIXTURE_USER = {
  id: 'fx-user',
  firstName: 'Fixture',
  fullName: 'Fixture User',
  primaryEmailAddress: { emailAddress: 'fixture.user@fricta-fixture.example' },
};

type WithChildren = { children?: ReactNode };

export const ClerkProvider = ({ children }: WithChildren) => <>{children}</>;
export const ClerkLoading = ({ children }: WithChildren) => (authLoading ? <>{children}</> : null);
export const ClerkLoaded = ({ children }: WithChildren) => (authLoading ? null : <>{children}</>);
export const SignedIn = ({ children }: WithChildren) => (authLoading ? null : <>{children}</>);
export const SignedOut = (_props: WithChildren) => null;
export const RedirectToSignIn = () => null;

export const useUser = () => ({ isLoaded: !authLoading, isSignedIn: !authLoading, user: authLoading ? null : FIXTURE_USER });
export const useAuth = () => ({ isLoaded: !authLoading, isSignedIn: !authLoading, userId: FIXTURE_USER.id, getToken: async () => null });
export const useClerk = () => ({ loaded: !authLoading, signOut: async () => undefined });

export const UserButton = () => (
  <div
    title="Fixture user (not a real session)"
    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
    style={{ background: 'linear-gradient(135deg, #7342E2, #9B72FA)' }}
  >
    FX
  </div>
);

const WidgetPlaceholder = ({ title, subtitle, cta, altPrompt, altLabel }: { title: string; subtitle: string; cta: string; altPrompt: string; altLabel: string }) => (
  <div className="liquid-glass w-full max-w-[420px] rounded-2xl p-6 sm:p-8 relative z-10">
    <p
      className="text-[9px] font-mono font-bold uppercase tracking-widest text-center mb-4 px-2 py-1 rounded"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px dashed rgba(245,158,11,0.5)', color: '#fbbf24' }}
    >
      Fixture placeholder — not the real Clerk widget
    </p>
    <h1 className="font-jakarta text-white font-semibold text-lg text-center">{title}</h1>
    <p className="font-inter text-white/50 text-xs text-center mt-1.5">{subtitle}</p>
    <div className="mt-6 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm text-white">Continue with Google</div>
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-white/10" /><span className="text-white/30 text-xs">or</span><div className="h-px flex-1 bg-white/10" />
    </div>
    <label className="text-white/60 text-xs uppercase tracking-wider font-semibold">Email address</label>
    <div className="mt-2 h-10 rounded-xl bg-white/[0.03] border border-white/10" />
    <div className="btn-primary-cta mt-5 h-10 rounded-xl flex items-center justify-center text-sm">{cta}</div>
    <p className="text-center text-xs text-white/40 mt-6">{altPrompt} <span className="text-accent">{altLabel}</span></p>
  </div>
);

export const SignIn = (_props: Record<string, unknown>) => (
  <WidgetPlaceholder title="Sign in to Fricta" subtitle="Welcome back! Please sign in to continue" cta="Continue" altPrompt="Don’t have an account?" altLabel="Sign up" />
);
export const SignUp = (_props: Record<string, unknown>) => (
  <WidgetPlaceholder title="Create your account" subtitle="Welcome! Please fill in the details to get started" cta="Continue" altPrompt="Already have an account?" altLabel="Sign in" />
);
