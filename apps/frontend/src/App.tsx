import { Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bGlrZWQtbW91c2UtOTUuY2xlcmsuYWNjb3VudHMuZGV2JA';

import { Landing } from './pages/Landing';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { WorkflowRunner } from './pages/WorkflowRunner';
import { Reports } from './pages/Reports';
import { Personas } from './pages/Personas';
import { Settings } from './pages/Settings';
import ReportDetails from './pages/ReportDetails';
function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={
          <>
            <SignedIn>
              <DashboardLayout />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }>
          <Route index element={<Dashboard />} />
          <Route path="workflow" element={<WorkflowRunner />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetails />} />
          <Route path="personas" element={<Personas />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ClerkProvider>
  );
}

export default App;
