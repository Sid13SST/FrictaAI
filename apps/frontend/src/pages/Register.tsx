import { SignUp } from '@clerk/clerk-react';
import { AuthShell } from '../components/auth/AuthShell';
import { clerkAppearance } from '../lib/clerkAppearance';

export default function Register() {
  return (
    <AuthShell mode="sign-up">
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/app"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
