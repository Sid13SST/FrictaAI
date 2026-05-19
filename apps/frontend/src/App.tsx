import { Routes, Route } from 'react-router-dom';
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
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="workflow" element={<WorkflowRunner />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportDetails />} />
        <Route path="personas" element={<Personas />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
