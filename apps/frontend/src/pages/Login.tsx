import { SignIn } from '@clerk/clerk-react';
import { AuthShell } from '../components/auth/AuthShell';
import { clerkAppearance } from '../lib/clerkAppearance';

export default function Login() {
  return (
    <AuthShell mode="sign-in">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        forceRedirectUrl="/app"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
