import { Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bGlrZWQtbW91c2UtOTUuY2xlcmsuYWNjb3VudHMuZGV2JA';

import { Landing } from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { WorkflowRunner } from './pages/WorkflowRunner';
import { Reports } from './pages/Reports';
import { Personas } from './pages/Personas';
import { Settings } from './pages/Settings';
import ReportDetails from './pages/ReportDetails';
import { InvestigationConsole } from './pages/InvestigationConsole';
import { HistoricalDashboard } from './pages/HistoricalDashboard';
import { WorkspaceConsole } from './pages/WorkspaceConsole';
import { SimulationConsole } from './pages/SimulationConsole';
import LongitudinalDashboard from './pages/LongitudinalDashboard';
import { PredictiveDashboard } from './pages/PredictiveDashboard';
import { RedesignDashboard } from './pages/RedesignDashboard';
import { AutonomousDashboard } from './pages/AutonomousDashboard';
import { IntegrationDashboard } from './pages/IntegrationDashboard';
import { EngineeringDashboard } from './pages/EngineeringDashboard';
import { CollaborationDashboard } from './pages/CollaborationDashboard';
import { DeveloperPortal } from './pages/DeveloperPortal';
import { LiveTelemetry } from './pages/LiveTelemetry';
import { LiveIntelligence } from './pages/LiveIntelligence';
import { OptimizationLab } from './pages/OptimizationLab';
import { OptimizationCommandCenter } from './pages/OptimizationCommandCenter';
import { ProductStrategyDashboard } from './pages/ProductStrategyDashboard';
import { OutcomeDashboard } from './pages/OutcomeDashboard';
import { PortfolioDashboard } from './pages/PortfolioDashboard';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { KnowledgeExplorer } from './pages/KnowledgeExplorer';
import { LearningCenter } from './pages/LearningCenter';
import { ForecastCenter } from './pages/ForecastCenter';


function App() {
  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/register"
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="/register/*" element={<Register />} />
        <Route path="/app/console/:id" element={
          <>
            <SignedIn>
              <InvestigationConsole />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn signInForceRedirectUrl="/app" />
            </SignedOut>
          </>
        } />
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
          <Route index element={<Dashboard />} />
          <Route path="workflow" element={<WorkflowRunner />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetails />} />
          <Route path="historical" element={<HistoricalDashboard />} />
          <Route path="longitudinal" element={<LongitudinalDashboard />} />
          <Route path="predictive" element={<PredictiveDashboard />} />
          <Route path="redesign" element={<RedesignDashboard />} />
          <Route path="autonomous" element={<AutonomousDashboard />} />
          <Route path="autonomous-strategy" element={<OptimizationCommandCenter />} />
          <Route path="product-strategy" element={<ProductStrategyDashboard />} />
          <Route path="outcome-intelligence" element={<OutcomeDashboard />} />
          <Route path="portfolio-intelligence" element={<PortfolioDashboard />} />
          <Route path="executive-governance" element={<ExecutiveDashboard />} />
          <Route path="knowledge-network" element={<KnowledgeExplorer />} />
          <Route path="organizational-learning" element={<LearningCenter />} />
          <Route path="forecasting-intelligence" element={<ForecastCenter />} />
          <Route path="integrations" element={<IntegrationDashboard />} />
          <Route path="engineering" element={<EngineeringDashboard />} />
          <Route path="collaboration" element={<CollaborationDashboard />} />
          <Route path="developer" element={<DeveloperPortal />} />
          <Route path="telemetry" element={<LiveTelemetry />} />
          <Route path="live-intelligence" element={<LiveIntelligence />} />
          <Route path="optimization" element={<OptimizationLab />} />
          <Route path="workspace" element={<WorkspaceConsole />} />
          <Route path="simulation" element={<SimulationConsole />} />
          <Route path="personas" element={<Personas />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ClerkProvider>
  );
}

export default App;
