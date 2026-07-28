import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bGlrZWQtbW91c2UtOTUuY2xlcmsuYWNjb3VudHMuZGV2JA';

// Landing/Login/Register are the first thing anonymous visitors see — keep eager
// so there's no extra network round-trip before anything renders.
import { Landing } from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Everything under /app is already gated behind Clerk's SignedIn check, so a
// lazy-load boundary there doesn't add a perceptible extra wait — but it keeps
// these ~30 dashboard pages out of the initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const WorkflowRunner = lazy(() => import('./pages/WorkflowRunner').then(m => ({ default: m.WorkflowRunner })));
const WorkflowMonitor = lazy(() => import('./pages/WorkflowMonitor').then(m => ({ default: m.WorkflowMonitor })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ReportDetails = lazy(() => import('./pages/ReportDetails'));
const InvestigationConsole = lazy(() => import('./pages/InvestigationConsole').then(m => ({ default: m.InvestigationConsole })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const LiveTelemetry = lazy(() => import('./pages/LiveTelemetry').then(m => ({ default: m.LiveTelemetry })));
const RuntimeObservability = lazy(() => import('./pages/RuntimeObservability').then(m => ({ default: m.RuntimeObservability })));
const HistoricalDashboard = lazy(() => import('./pages/HistoricalDashboard').then(m => ({ default: m.HistoricalDashboard })));
const HelpCenter = lazy(() => import('./pages/HelpCenter').then(m => ({ default: m.HelpCenter })));
const LearningCenter = lazy(() => import('./pages/LearningCenter').then(m => ({ default: m.LearningCenter })));

const RouteFallback = () => (
  <div className="min-h-[60vh] w-full flex items-center justify-center">
    <div
      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: 'rgba(115,66,226,0.35)', borderTopColor: '#7342E2' }}
    />
  </div>
);

// Safety net so a typo'd or stale link renders something actionable instead
// of a blank screen.
const NotFound = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#050505] text-center px-6">
    <span className="text-6xl font-black" style={{ color: '#7342E2' }}>404</span>
    <p className="text-white/60 text-sm max-w-xs">
      This page doesn't exist. It may have moved, or the link is out of date.
    </p>
    <Link
      to="/"
      className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105"
      style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)' }}
    >
      Back to Fricta
    </Link>
  </div>
);

function App() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/register"
    >
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login/*" element={<Login />} />
          <Route path="/register/*" element={<Register />} />
          <Route path="/app" element={
            <>
              <SignedIn>
                <DashboardLayout />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn signInForceRedirectUrl="/app" />
              </SignedOut>
            </>
          }>
            <Route index element={<Suspense fallback={<RouteFallback />}><Dashboard /></Suspense>} />
            <Route path="projects" element={<Suspense fallback={<RouteFallback />}><Projects /></Suspense>} />
            <Route path="projects/:id" element={<Suspense fallback={<RouteFallback />}><ProjectDetail /></Suspense>} />
            <Route path="workflow" element={<Suspense fallback={<RouteFallback />}><WorkflowRunner /></Suspense>} />
            <Route path="monitor/:id" element={<Suspense fallback={<RouteFallback />}><WorkflowMonitor /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<RouteFallback />}><Reports /></Suspense>} />
            <Route path="reports/:id" element={<Suspense fallback={<RouteFallback />}><ReportDetails /></Suspense>} />
            <Route path="console">
              <Route index element={<Suspense fallback={<RouteFallback />}><InvestigationConsole /></Suspense>} />
              <Route path=":id" element={<Suspense fallback={<RouteFallback />}><InvestigationConsole /></Suspense>} />
            </Route>
            <Route path="runtime" element={<Suspense fallback={<RouteFallback />}><RuntimeObservability /></Suspense>} />
            <Route path="telemetry" element={<Suspense fallback={<RouteFallback />}><LiveTelemetry /></Suspense>} />
            <Route path="history" element={<Suspense fallback={<RouteFallback />}><HistoricalDashboard /></Suspense>} />
            <Route path="help" element={<Suspense fallback={<RouteFallback />}><HelpCenter /></Suspense>} />
            <Route path="learning" element={<Suspense fallback={<RouteFallback />}><LearningCenter /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </ClerkProvider>
  );
}

export default App;
