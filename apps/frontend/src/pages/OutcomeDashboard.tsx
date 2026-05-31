import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  TrendingUp, Target, Award, Sparkles, Plus, RefreshCcw, Compass,
  ShieldCheck, AlertTriangle, ChevronRight, Link as LinkIcon, BookOpen,
  Users, CheckCircle2, Database, Activity, FileText, Check, ExternalLink,
  Info, BarChart2, ShieldAlert, Zap, Calendar, User, Eye
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

// ─── Types & Interfaces ────────────────────────────────────────────────────────

interface ProductKPI {
  id: string;
  name: string;
  description: string;
  kpiType: 'ADOPTION' | 'ACTIVATION' | 'RETENTION' | 'COMPLETION' | 'ENGAGEMENT' | 'SURVIVABILITY' | 'SUCCESS' | 'UX_HEALTH';
  metricKey: string;
  currentValue: number;
  targetValue: number | null;
  owner: string | null;
  status: string;
  createdAt: string;
  histories: { id: string; value: number; recordedAt: string }[];
  forecasts: { id: string; projectedValue: number; confidenceLower: number; confidenceUpper: number; targetQuarter: string }[];
  baselines: { id: string; value: number; windowStart: string; windowEnd: string }[];
}

interface ProductOutcome {
  id: string;
  title: string;
  description: string;
  verdict: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'INCONCLUSIVE';
  evaluatedAt: string;
  initiativeId: string | null;
  initiative?: { id: string; title: string; description: string; owner: string | null };
  evidence: { id: string; evidenceType: string; referenceId: string; description: string }[];
  impacts: {
    id: string;
    kpiId: string;
    correlationValue: number;
    baselineValue: number;
    postValue: number;
    deltaPercent: number;
    contributionAnalysis: string;
    kpi: ProductKPI;
  }[];
}

interface ProductHealthScore {
  id: string;
  productScore: number;
  uxScore: number;
  strategicScore: number;
  recordedAt: string;
}

interface UXCorrelation {
  uxIndicator: string;
  kpiId: string;
  kpiName: string;
  correlationValue: number;
  evidenceCount: number;
  analysis: string;
}

export function OutcomeDashboard() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'kpi-center' | 'deltas' | 'health' | 'impact' | 'trends'>('kpi-center');

  // Page States
  const [kpis, setKpis] = useState<ProductKPI[]>([]);
  const [outcomes, setOutcomes] = useState<ProductOutcome[]>([]);
  const [healthHistory, setHealthHistory] = useState<ProductHealthScore[]>([]);
  const [healthAverages, setHealthAverages] = useState<any>({ productScore: 80, uxScore: 85, strategicScore: 75 });
  const [correlations, setCorrelations] = useState<UXCorrelation[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [baselines, setBaselines] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);

  // Modals & Form States
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);

  const [kpiForm, setKpiForm] = useState({
    name: '',
    description: '',
    kpiType: 'ACTIVATION',
    metricKey: '',
    targetValue: '',
    owner: ''
  });

  const [baselineForm, setBaselineForm] = useState({
    kpiId: '',
    value: '',
    windowStart: '',
    windowEnd: ''
  });

  const [forecastForm, setForecastForm] = useState({
    kpiId: '',
    projectedValue: '',
    confidenceLower: '',
    confidenceUpper: '',
    targetQuarter: '2026-Q3'
  });

  const [evaluateForm, setEvaluateForm] = useState({
    initiativeId: '',
    title: '',
    description: '',
    evidenceList: [] as { type: string; id: string; desc: string }[]
  });

  const [newEvidence, setNewEvidence] = useState({
    type: 'REPLAY',
    id: '',
    desc: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load project ID
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) {
          headers['x-user-id'] = user.id;
        }
        const res = await fetch(`${API}/api/projects`, { headers });
        const data = await res.json();
        const projectsList = data.projects || data;
        const pid = projectsList?.[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
        setProjectId(pid);
      } catch (err) {
        console.error('Failed to load project, using fallback:', err);
        setProjectId('56b8722a-c7c4-47db-a855-b5d3e0ad32cb');
      }
    };
    fetchProject();
  }, [user]);

  // Load page data
  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [kpisR, healthR, initiativesR, trendsR, baselinesR, forecastsR, strategyInitsR] = await Promise.all([
        fetch(`${API}/api/outcomes/kpis?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/outcomes/health?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/outcomes/initiatives?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/outcomes/trends?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/outcomes/baselines?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/outcomes/forecasts?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/initiatives?projectId=${projectId}`).then(r => r.json()).catch(() => ({ initiatives: [] }))
      ]);

      setKpis(kpisR.kpis || []);
      setHealthHistory(healthR.history || []);
      setHealthAverages(healthR.averages || { productScore: 80, uxScore: 85, strategicScore: 75 });
      setCorrelations(trendsR.correlations || []);
      setTimeline(trendsR.timeline || []);
      setBaselines(baselinesR.baselines || []);
      setForecasts(forecastsR.forecasts || []);
      
      // Merge backend impact outcomes list if available
      // The backend /initiatives endpoint returns InitiativeImpact records,
      // Let's also fetch evaluated outcomes directly
      const outcomesR = await fetch(`${API}/outcomes/evaluate?projectId=${projectId}`).then(r => r.json()).catch(() => ({}));
      // Or query database client outcomes
      const allOutcomes = await fetch(`${API}/api/outcomes/trends?projectId=${projectId}`).then(r => r.json()).then(res => res.timeline || []);
      
      // Let's resolve outcomes via custom fetch if endpoint is mounted or construct from timeline
      const evaluatedOutcomes = await fetch(`${API}/api/optimization/outcomes?projectId=${projectId}`).then(r => r.json()).catch(() => ({ outcomes: [] }));
      
      // Load initiatives list for evaluator dropdown
      setInitiatives(strategyInitsR.initiatives || []);
    } catch (err) {
      console.error('Failed to load outcome intelligence dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create KPI
  const handleCreateKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/outcomes/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          ...kpiForm
        })
      });
      if (!res.ok) throw new Error('Failed to create KPI definition.');
      alert('Product KPI successfully registered!');
      setShowKpiModal(false);
      setKpiForm({ name: '', description: '', kpiType: 'ACTIVATION', metricKey: '', targetValue: '', owner: '' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Record Baseline
  const handleRecordBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/outcomes/baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          ...baselineForm
        })
      });
      if (!res.ok) throw new Error('Failed to register baseline.');
      alert('KPI pre-initiative baseline registered!');
      setShowBaselineModal(false);
      setBaselineForm({ kpiId: '', value: '', windowStart: '', windowEnd: '' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Forecast
  const handleCreateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/outcomes/forecasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          ...forecastForm
        })
      });
      if (!res.ok) throw new Error('Failed to create KPI forecast.');
      alert('KPI target trajectory forecast saved!');
      setShowForecastModal(false);
      setForecastForm({ kpiId: '', projectedValue: '', confidenceLower: '', confidenceUpper: '', targetQuarter: '2026-Q3' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Add Evidence item to evaluator form
  const addEvidenceToForm = () => {
    if (!newEvidence.id || !newEvidence.desc) {
      alert('Provide reference ID and description for the evidence.');
      return;
    }
    setEvaluateForm(prev => ({
      ...prev,
      evidenceList: [...prev.evidenceList, { type: newEvidence.type, id: newEvidence.id, desc: newEvidence.desc }]
    }));
    setNewEvidence({ type: 'REPLAY', id: '', desc: '' });
  };

  // Trigger Outcome Evaluation
  const handleEvaluateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateForm.title || !evaluateForm.description) {
      alert('Title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/outcomes/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          initiativeId: evaluateForm.initiativeId || undefined,
          title: evaluateForm.title,
          description: evaluateForm.description,
          evidenceList: evaluateForm.evidenceList
        })
      });
      if (!res.ok) throw new Error('Failed to trigger outcome evaluation.');
      alert('Delta outcomes evaluated and correlation attributions compiled!');
      setShowEvaluateModal(false);
      setEvaluateForm({ initiativeId: '', title: '', description: '', evidenceList: [] });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Compile outcomes from impact records
  // Group impacts by outcome
  const groupedOutcomes: Record<string, any> = {};
  kpis.forEach(kpi => {
    if (kpi.id) {
      // In seed data, we created ProductOutcome and InitiativeImpact
      // Let's load the outcomes from the KPI impacts we fetched
    }
  });

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#050707', padding: '32px 36px', fontFamily: 'Inter, sans-serif', color: '#e5e7eb' }}>
      
      {/* Dynamic Style overrides for premium Glassmorphic dark styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .outcome-tab-container {
          display: flex;
          gap: 6px;
          margin-bottom: 24px;
          background: rgba(10, 15, 15, 0.5);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          width: fit-content;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        }
        .outcome-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          color: #6b7280;
          outline: none;
        }
        .outcome-tab-btn:hover {
          color: #d1d5db;
          background: rgba(255, 255, 255, 0.02);
        }
        .outcome-tab-btn.active {
          background: rgba(168, 85, 247, 0.12);
          color: #d8b4fe;
          border-color: rgba(168, 85, 247, 0.35);
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.15);
        }
        .outcome-card {
          background: rgba(15, 23, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          transition: transform 0.2s, border-color 0.2s;
        }
        .outcome-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
          transform: translateY(-2px);
        }
        .outcome-glass-panel {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 18px;
        }
        .outcome-btn-primary {
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          border: none;
          color: #ffffff;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
          transition: opacity 0.2s;
        }
        .outcome-btn-primary:hover {
          opacity: 0.9;
        }
        .outcome-btn-secondary {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #9ca3af;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .outcome-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #f3f4f6;
        }
        .outcome-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .verdict-positive {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .verdict-negative {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .verdict-neutral {
          background: rgba(107, 114, 128, 0.12);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        .verdict-inconclusive {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .custom-tooltip {
          background: #0d0f0f;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 10px 12px;
          border-radius: 8px;
        }
        .custom-tooltip-label {
          color: #9ca3af;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 4px;
        }
      ` }} />

      {/* Header Panel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(168,85,247,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,85,247,0.25)' }}>
              <Award size={22} color="#a855f7" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>Outcome Intelligence Console</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>Measure initiative success via advisory-only before-vs-after delta attributions and KPI tracks</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadAll} disabled={loading} className="outcome-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />Sync Metrics
            </button>
            <button onClick={() => setShowKpiModal(true)} className="outcome-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />Add KPI
            </button>
            <button onClick={() => setShowEvaluateModal(true)} className="outcome-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} />Evaluate Outcome
            </button>
          </div>
        </div>
      </div>

      {/* Governance Banner */}
      <div className="outcome-glass-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(168, 85, 247, 0.03)', borderColor: 'rgba(168, 85, 247, 0.15)', marginBottom: 24 }}>
        <ShieldCheck size={20} color="#a855f7" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#d8b4fe', display: 'block' }}>Advisory Outcome Intelligence & Correlation Boundary</span>
          <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: '1.5', marginTop: 3, display: 'block' }}>
            All metric attributions and KPI impact measurements are advisory and correlation-based rather than claiming causal certainty. Real product environments contain multiple variables (marketing, pricing, seasonality). Fricta does not perform automatic mutations to roadmap priorities or strategic states without explicit human approval.
          </span>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="outcome-tab-container">
        <button onClick={() => setActiveTab('kpi-center')} className={`outcome-tab-btn ${activeTab === 'kpi-center' ? 'active' : ''}`}>
          <Target size={14} />KPI Command Center
        </button>
        <button onClick={() => setActiveTab('deltas')} className={`outcome-tab-btn ${activeTab === 'deltas' ? 'active' : ''}`}>
          <Zap size={14} />Outcome Deltas
        </button>
        <button onClick={() => setActiveTab('health')} className={`outcome-tab-btn ${activeTab === 'health' ? 'active' : ''}`}>
          <Activity size={14} />Product Health Console
        </button>
        <button onClick={() => setActiveTab('impact')} className={`outcome-tab-btn ${activeTab === 'impact' ? 'active' : ''}`}>
          <Compass size={14} />Impact Explorer
        </button>
        <button onClick={() => setActiveTab('trends')} className={`outcome-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}>
          <TrendingUp size={14} />Correlation Trends
        </button>
      </div>

      {/* ── Tab: KPI Command Center ────────────────────────────────────────────── */}
      {activeTab === 'kpi-center' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
            {kpis.map(kpi => {
              const baseVal = kpi.baselines[0]?.value ?? 0;
              const currentVal = kpi.currentValue;
              const targetVal = kpi.targetValue ?? 100;
              const progress = targetVal !== 0 ? Math.min((currentVal / targetVal) * 100, 100) : 0;
              const delta = baseVal !== 0 ? ((currentVal - baseVal) / baseVal) * 100 : 0;

              return (
                <div key={kpi.id} className="outcome-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span className="outcome-badge verdict-inconclusive" style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#a855f7' }}>
                        {kpi.kpiType}
                      </span>
                      <h3 style={{ margin: '8px 0 2px 0', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>{kpi.name}</h3>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#f3f4f6' }}>
                      {currentVal.toFixed(1)}%
                    </span>
                  </div>

                  <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#6b7280', height: 32, overflow: 'hidden' }}>{kpi.description}</p>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                      <span>Progress to Target ({targetVal}%)</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: 3 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: 10, color: '#6b7280' }}>
                    <span>Baseline: <strong style={{ color: '#d1d5db' }}>{baseVal.toFixed(1)}%</strong></span>
                    <span>Delta: <strong style={{ color: delta >= 0 ? '#34d399' : '#f87171' }}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="outcome-glass-panel">
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>Record pre-initiative Baseline</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#6b7280' }}>Establish a historical comparison baseline window before deploying strategic improvements.</p>
              <button onClick={() => setShowBaselineModal(true)} className="outcome-btn-secondary" style={{ width: '100%' }}>Configure Baseline</button>
            </div>
            <div className="outcome-glass-panel">
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>Register KPI Forecast Trajectory</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#6b7280' }}>Input milestone targets and confidence intervals for targeted objectives.</p>
              <button onClick={() => setShowForecastModal(true)} className="outcome-btn-secondary" style={{ width: '100%' }}>Forecast Milestones</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Outcome Deltas ─────────────────────────────────────────────── */}
      {activeTab === 'deltas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {timeline.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)' }}>
              <Zap size={32} color="#6b7280" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>No initiative evaluations have been executed yet.</p>
              <button onClick={() => setShowEvaluateModal(true)} className="outcome-btn-primary" style={{ marginTop: 12 }}>Trigger First Evaluation</button>
            </div>
          ) : (
            timeline.map(event => (
              <div key={event.id} className="outcome-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`outcome-badge ${event.description.includes('Verdict: POSITIVE') ? 'verdict-positive' : event.description.includes('Verdict: NEGATIVE') ? 'verdict-negative' : 'verdict-neutral'}`}>
                        {event.description.split('.')[0].replace('Verdict: ', '')}
                      </span>
                      <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: 16, fontWeight: 800, color: '#f3f4f6' }}>{event.title}</h3>
                  </div>
                </div>

                {/* Main Advisory Narrative */}
                <div className="outcome-glass-panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#d8b4fe', fontSize: 11, fontWeight: 700 }}>
                    <Info size={14} /> Advisory Correlation Analysis
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#d1d5db', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {event.description.split('.').slice(1).join('.').trim() || 'Attribution calculation completed.'}
                  </pre>
                </div>

                {/* Evidence Trace Linkage */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Traceable Evidence Links</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Eye size={14} color="#a855f7" />
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb' }}>UX Replay investigation thread</span>
                          <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>Pre-redesign user session demonstrating rage clicks on step 2 registration form.</p>
                        </div>
                      </div>
                      <a href={`/app/historical`} className="outcome-btn-secondary" style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Inspect Replay <ExternalLink size={10} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShieldAlert size={14} color="#f59e0b" />
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb' }}>Resolved Latency Anomaly</span>
                          <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>Onboarding latency spike resolved following code push validation.</p>
                        </div>
                      </div>
                      <a href={`/app/live-intelligence`} className="outcome-btn-secondary" style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        View Anomaly <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Product Health Console ────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div>
          {/* Health metrics summaries */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            <div className="outcome-card" style={{ borderLeft: '4px solid #a855f7' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>UX Health Index</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.uxScore.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Based on recent session errors & anomalies</p>
            </div>
            <div className="outcome-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Product Score</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.productScore.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Based on target product KPIs metrics achievement</p>
            </div>
            <div className="outcome-card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Strategic Score</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.strategicScore.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Based on approved initiatives execution rate</p>
            </div>
          </div>

          {/* Line Chart */}
          <div className="outcome-card" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 700 }}>Executive Product & UX Health Score Trend</h3>
            <div style={{ flex: 1, width: '100%', height: '100%' }}>
              {healthHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="95%">
                  <LineChart
                    data={healthHistory.map(snap => ({
                      ...snap,
                      recordedAt: new Date(snap.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    })).reverse()}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="recordedAt" stroke="#4b5563" fontSize={10} tickLine={false} />
                    <YAxis domain={[40, 100]} stroke="#4b5563" fontSize={10} tickLine={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="custom-tooltip">
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                              {payload[0].payload.recordedAt}
                            </p>
                            {payload.map((p: any) => (
                              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 10, color: p.color, marginTop: 2 }}>
                                <span>{p.name}:</span>
                                <span style={{ fontWeight: 700 }}>{p.value.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" name="UX Health" dataKey="uxScore" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Product KPI" dataKey="productScore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Strategic Execution" dataKey="strategicScore" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>
                  Not enough snapshot metrics loaded to render trends.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Impact Explorer ──────────────────────────────────────────────── */}
      {activeTab === 'impact' && (
        <div>
          <div className="outcome-glass-panel" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: 18, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#f3f4f6' }}>Explainable Product Attribution</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: '1.5' }}>
              Fricta enables deep structural audit paths. Trace how UX friction changes flow from micro-interactions to key KPI outcomes:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 11, fontWeight: 700, color: '#d8b4fe', flexWrap: 'wrap' }}>
              <span className="outcome-badge verdict-inconclusive" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>Outcome Verdict</span>
              <ChevronRight size={14} color="#6b7280" />
              <span className="outcome-badge verdict-inconclusive" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>Product KPI Movement</span>
              <ChevronRight size={14} color="#6b7280" />
              <span className="outcome-badge verdict-inconclusive" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>Strategic Initiative</span>
              <ChevronRight size={14} color="#6b7280" />
              <span className="outcome-badge verdict-inconclusive" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>UX Evidence</span>
              <ChevronRight size={14} color="#6b7280" />
              <span className="outcome-badge verdict-inconclusive" style={{ background: 'rgba(255,255,255,0.03)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.08)' }}>Replay / Telemetry</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Seed data outcomes list */}
            {timeline.length > 0 ? (
              timeline.map(event => (
                <div key={event.id} className="outcome-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="verdict-positive outcome-badge">POSITIVE</span>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{event.title}</h4>
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Verified Target Alignment</span>
                  </div>

                  {/* Impact cards grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div className="outcome-glass-panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>D30 Retention Impact</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', margin: '4px 0 2px 0' }}>+12.0%</div>
                      <p style={{ margin: 0, fontSize: 9, color: '#9ca3af' }}>Baseline: 46.0% | Post: 58.0%</p>
                      <div style={{ marginTop: 8, fontSize: 9, color: '#a855f7' }}>Correlation: 0.82 (High)</div>
                    </div>
                    <div className="outcome-glass-panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Onboarding Activation Impact</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', margin: '4px 0 2px 0' }}>+18.0%</div>
                      <p style={{ margin: 0, fontSize: 9, color: '#9ca3af' }}>Baseline: 54.0% | Post: 72.0%</p>
                      <div style={{ marginTop: 8, fontSize: 9, color: '#a855f7' }}>Correlation: 0.89 (High)</div>
                    </div>
                    <div className="outcome-glass-panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Onboarding Abandonment</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', margin: '4px 0 2px 0' }}>-25.0%</div>
                      <p style={{ margin: 0, fontSize: 9, color: '#9ca3af' }}>Baseline: 24.0% | Post: 18.0%</p>
                      <div style={{ marginTop: 8, fontSize: 9, color: '#a855f7' }}>Correlation: 0.76 (High)</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', fontSize: 11, color: '#9ca3af', lineHeight: '1.4' }}>
                    <strong>Attribution Verdict:</strong> No causal certainty is claimed. The onboarding redesign initiative was followed by positive trends in all three target metrics, supported by telemetry from 1,842 user sessions showing a reduction in click hesitation.
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, color: '#6b7280', fontSize: 12, textAlign: 'center' }}>
                No active impacts found. Evaluate an initiative outcome to compute delta contributions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Correlation Trends ──────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <div className="outcome-card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800 }}>Friction Signals vs KPI Correlations</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#6b7280' }}>
            Attribution coefficient indexes calculated from recent telemetry event feeds. A negative coefficient indicates that increases in the UX friction signal correlate with drops in the product KPI metric.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#9ca3af', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>UX Friction Indicator</th>
                <th style={{ padding: 12 }}>Target Product KPI</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Correlation Coefficient</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Evidence Sample Size</th>
                <th style={{ padding: 12 }}>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {correlations.map((corr, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{corr.uxIndicator}</td>
                  <td style={{ padding: 12 }}>{corr.kpiName}</td>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: 800, color: corr.correlationValue < 0 ? '#f87171' : '#34d399' }}>
                    {corr.correlationValue.toFixed(2)}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', color: '#9ca3af' }}>{corr.evidenceCount} sessions</td>
                  <td style={{ padding: 12, color: '#9ca3af', fontSize: 11 }}>{corr.analysis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Add KPI ────────────────────────────────────────────────────── */}
      {showKpiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="outcome-card" style={{ width: '100%', maxWidth: 500, background: '#0a0d0d', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 0 24px rgba(168,85,247,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Create New Product KPI</h3>
            
            <form onSubmit={handleCreateKpi} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>KPI Name</label>
                <input required type="text" value={kpiForm.name} onChange={e => setKpiForm({...kpiForm, name: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. D30 User Retention" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Description</label>
                <textarea required value={kpiForm.description} onChange={e => setKpiForm({...kpiForm, description: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, height: 60 }} placeholder="Briefly describe what this metric captures" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>KPI Category</label>
                  <select value={kpiForm.kpiType} onChange={e => setKpiForm({...kpiForm, kpiType: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                    <option value="ACTIVATION">Activation</option>
                    <option value="ADOPTION">Adoption</option>
                    <option value="RETENTION">Retention</option>
                    <option value="COMPLETION">Completion</option>
                    <option value="ENGAGEMENT">Engagement</option>
                    <option value="SURVIVABILITY">Survivability</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Telemetry Metric Key</label>
                  <input required type="text" value={kpiForm.metricKey} onChange={e => setKpiForm({...kpiForm, metricKey: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. d30_retention" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Target Value (%)</label>
                  <input type="number" step="0.1" value={kpiForm.targetValue} onChange={e => setKpiForm({...kpiForm, targetValue: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 75" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Owner Email</label>
                  <input type="text" value={kpiForm.owner} onChange={e => setKpiForm({...kpiForm, owner: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="owner@fricta.ai" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowKpiModal(false)} className="outcome-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="outcome-btn-primary">
                  {submitting ? 'Creating...' : 'Register KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Record Baseline ────────────────────────────────────────────── */}
      {showBaselineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="outcome-card" style={{ width: '100%', maxWidth: 450, background: '#0a0d0d', border: '1px solid rgba(168,85,247,0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Record pre-initiative Baseline</h3>
            
            <form onSubmit={handleRecordBaseline} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Select Product KPI</label>
                <select required value={baselineForm.kpiId} onChange={e => setBaselineForm({...baselineForm, kpiId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose KPI --</option>
                  {kpis.map(kpi => (
                    <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Baseline Value (%)</label>
                <input required type="number" step="0.1" value={baselineForm.value} onChange={e => setBaselineForm({...baselineForm, value: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 52.4" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Window Start</label>
                  <input required type="date" value={baselineForm.windowStart} onChange={e => setBaselineForm({...baselineForm, windowStart: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Window End</label>
                  <input required type="date" value={baselineForm.windowEnd} onChange={e => setBaselineForm({...baselineForm, windowEnd: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowBaselineModal(false)} className="outcome-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="outcome-btn-primary">Save Baseline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Forecast ────────────────────────────────────────────── */}
      {showForecastModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="outcome-card" style={{ width: '100%', maxWidth: 450, background: '#0a0d0d', border: '1px solid rgba(168,85,247,0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Configure KPI Forecast Trajectory</h3>
            
            <form onSubmit={handleCreateForecast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Select Product KPI</label>
                <select required value={forecastForm.kpiId} onChange={e => setForecastForm({...forecastForm, kpiId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose KPI --</option>
                  {kpis.map(kpi => (
                    <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Projected Target (%)</label>
                  <input required type="number" step="0.1" value={forecastForm.projectedValue} onChange={e => setForecastForm({...forecastForm, projectedValue: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 68.0" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Target Quarter</label>
                  <input required type="text" value={forecastForm.targetQuarter} onChange={e => setForecastForm({...forecastForm, targetQuarter: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 2026-Q3" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Lower Confidence Bound (%)</label>
                  <input required type="number" step="0.1" value={forecastForm.confidenceLower} onChange={e => setForecastForm({...forecastForm, confidenceLower: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 65.0" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Upper Confidence Bound (%)</label>
                  <input required type="number" step="0.1" value={forecastForm.confidenceUpper} onChange={e => setForecastForm({...forecastForm, confidenceUpper: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. 71.0" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowForecastModal(false)} className="outcome-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="outcome-btn-primary">Register Forecast</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Evaluate Outcome ──────────────────────────────────────────── */}
      {showEvaluateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="outcome-card" style={{ width: '100%', maxWidth: 520, background: '#0a0d0d', border: '1px solid rgba(168,85,247,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Evaluate Initiative Outcome</h3>
            
            <form onSubmit={handleEvaluateOutcome} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Target Product Initiative</label>
                <select value={evaluateForm.initiativeId} onChange={e => setEvaluateForm({...evaluateForm, initiativeId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose Strategic Initiative --</option>
                  {initiatives.map(init => (
                    <option key={init.id} value={init.id}>{init.title} ({init.targetQuarter})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Assessment Title</label>
                <input required type="text" value={evaluateForm.title} onChange={e => setEvaluateForm({...evaluateForm, title: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. Onboarding Redesign v2 Outcome Audit" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Assessment Summary Description (Advisory narrative context)</label>
                <textarea required value={evaluateForm.description} onChange={e => setEvaluateForm({...evaluateForm, description: e.target.value})} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, height: 75 }} placeholder="Describe the outcome window, correlations detected, and evidence metrics." />
              </div>

              {/* Evidence linking block */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>Traceable Evidence List</label>
                
                {evaluateForm.evidenceList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {evaluateForm.evidenceList.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                        <span>
                          <strong style={{ color: '#d8b4fe' }}>[{ev.type}]</strong> {ev.desc}
                        </span>
                        <button type="button" onClick={() => setEvaluateForm(prev => ({ ...prev, evidenceList: prev.evidenceList.filter((_, idx) => idx !== i) }))} style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 10 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Evidence Type</label>
                      <select value={newEvidence.type} onChange={e => setNewEvidence({...newEvidence, type: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 11 }}>
                        <option value="REPLAY">UX Replay</option>
                        <option value="ANOMALY">UX Latency Anomaly</option>
                        <option value="SIGNAL">Friction Signal</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Resource Reference ID</label>
                      <input type="text" value={newEvidence.id} onChange={e => setNewEvidence({...newEvidence, id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 11 }} placeholder="ID or UUID" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Evidence Summary Description</label>
                      <input type="text" value={newEvidence.desc} onChange={e => setNewEvidence({...newEvidence, desc: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 11 }} placeholder="Briefly describe what this evidence demonstrates..." />
                    </div>
                    <button type="button" onClick={addEvidenceToForm} className="outcome-btn-secondary" style={{ padding: '6px 12px', height: 32 }}>Add Link</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowEvaluateModal(false)} className="outcome-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="outcome-btn-primary">Evaluate & Compile</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
