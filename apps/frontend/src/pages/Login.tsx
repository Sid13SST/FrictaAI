import { SignIn } from '@clerk/clerk-react';
import { CinematicBackground } from '../components/CinematicBackground';

export default function Login() {
  return (
    <CinematicBackground>
      <div className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          forceRedirectUrl="/app"
          appearance={{
            variables: {
              colorPrimary: '#6366f1',
              colorBackground: '#070b0a',
              colorText: '#fafafa',
              colorTextSecondary: '#a0a0a0',
              colorInputBackground: '#0d1312',
              colorInputText: '#fafafa',
              colorBorder: 'rgba(255,255,255,0.08)',
              borderRadius: '16px',
              fontFamily: 'Inter, sans-serif',
            },
            elements: {
              card: 'liquid-glass border-none shadow-2xl relative z-10 before:rounded-2xl',
              headerTitle: 'font-jakarta text-white font-semibold',
              headerSubtitle: 'font-inter text-white/50 text-xs',
              socialButtonsBlockButton: 'bg-white/5 hover:bg-white/10 border-white/10 text-white transition-colors duration-200',
              formButtonPrimary: 'btn-primary-cta hover:bg-[#4f46e5] border-none text-[#070b0a] font-bold text-sm uppercase',
              footerActionText: 'text-white/40',
              footerActionLink: 'text-accent hover:text-[#4f46e5] transition-colors',
              formFieldInput: 'bg-white/[0.03] border-white/10 text-white placeholder-white/30 focus:border-accent/40 focus:ring-accent/10 focus:ring-4',
              dividerLine: 'bg-white/10',
              dividerText: 'text-white/30',
              formFieldLabel: 'text-white/60 text-xs uppercase tracking-wider font-semibold',
              identityPreviewText: 'text-white',
              identityPreviewEditButtonIcon: 'text-accent',
            }
          }}
        />
      </div>
    </CinematicBackground>
  );
}
