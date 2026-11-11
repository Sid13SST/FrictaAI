import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/clerk-react';

type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

/**
 * Shared look for Clerk's prebuilt <SignIn /> and <SignUp /> so the two pages
 * can't drift apart. Presentation only — no Clerk instance configuration
 * lives here.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#7342E2',
    colorBackground: '#070b0a',
    colorText: '#fafafa',
    colorTextSecondary: '#a0a0a0',
    colorInputBackground: '#0d1312',
    colorInputText: '#fafafa',
    colorDanger: '#fb7185',
    colorSuccess: '#34d399',
    colorBorder: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'w-full max-w-[420px]',
    card: 'liquid-glass border-none shadow-2xl relative z-10 before:rounded-2xl',
    headerTitle: 'font-jakarta text-white font-semibold',
    headerSubtitle: 'font-inter text-white/50 text-xs',
    socialButtonsBlockButton: 'bg-white/5 hover:bg-white/10 border-white/10 text-white transition-colors duration-200',
    // Clerk swaps the label for a spinner and disables the button while a
    // submission is in flight; make that state visibly different.
    formButtonPrimary:
      'btn-primary-cta hover:bg-[#5C2FC2] border-none text-white font-bold text-sm uppercase disabled:opacity-60 disabled:cursor-not-allowed',
    spinner: 'text-white',
    footerActionText: 'text-white/40',
    footerActionLink: 'text-accent hover:text-[#9B72FA] transition-colors',
    formFieldInput:
      'bg-white/[0.03] border-white/10 text-white placeholder-white/30 focus:border-accent/40 focus:ring-accent/10 focus:ring-4',
    formFieldLabel: 'text-white/60 text-xs uppercase tracking-wider font-semibold',
    formFieldAction: 'text-accent hover:text-[#9B72FA] text-xs transition-colors',
    // Field-level and form-level errors returned by Clerk (wrong password,
    // unknown account, breached password, rate limit...).
    formFieldErrorText: 'text-rose-400 text-xs leading-relaxed mt-1.5',
    formFieldWarningText: 'text-amber-300 text-xs leading-relaxed mt-1.5',
    formFieldSuccessText: 'text-emerald-400 text-xs leading-relaxed mt-1.5',
    alert: 'rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3',
    alertText: 'text-rose-100 text-xs leading-relaxed',
    dividerLine: 'bg-white/10',
    dividerText: 'text-white/30',
    identityPreviewText: 'text-white',
    identityPreviewEditButtonIcon: 'text-accent',
    otpCodeFieldInput: 'border-white/15 text-white',
    formResendCodeLink: 'text-accent hover:text-[#9B72FA]',
  },
};
