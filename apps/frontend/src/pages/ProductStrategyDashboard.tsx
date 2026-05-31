import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Compass, ShieldAlert, BarChart3, Activity, Briefcase, Plus,
  Calendar, CheckCircle2, User, HelpCircle, RefreshCcw, Sparkles,
  Link as LinkIcon, AlertTriangle, ArrowRight, ShieldCheck, Check,
  ChevronRight, Play, BookOpen, Clock, Users, Database
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  targetMetric?: string;
  targetValue?: number;
  createdAt: string;
  initiatives?: ProductInitiative[];
}

interface ProductInitiative {
  id: string;
  title: string;
  description: string;
  owner?: string;
  status: 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  strategicScore: number;
  userImpactScore: number;
  survivabilityScore: number;
  riskScore: number;
  effortScore: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  targetQuarter: string;
  objective?: StrategicObjective;
  evidence?: InitiativeEvidence[];
  risks?: StrategicRisk[];
  createdAt: string;
}

interface InitiativeEvidence {
  id: string;
  evidenceType: 'REPLAY' | 'INVESTIGATION' | 'ANOMALY' | 'SIGNAL' | 'HISTORY';
  referenceId: string;
  description: string;
  createdAt: string;
}

interface StrategicRisk {
  id: string;
  riskType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationPlan: string;
}

interface OpportunityScore {
  id: string;
  title: string;
  reachScore: number;
  impactScore: number;
  confidenceScore: number;
  effortScore: number;
  overallScore: number;
}

interface ProductRoadmap {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: string;
  initiatives?: ProductInitiative[];
}

interface StrategyTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface ExecutiveSnapshot {
  productHealthScore: number;
  strategicRiskScore: number;
  uxHealthScore: number;
  opportunityPipelineCount: number;
  activeInitiativesCount: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductStrategyDashboard() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'executive' | 'opportunities' | 'initiatives' | 'roadmaps' | 'health'>('executive');

  // Page States
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [initiatives, setInitiatives] = useState<ProductInitiative[]>([]);
  const [roadmaps, setRoadmaps] = useState<ProductRoadmap[]>([]);
  const [priorities, setPriorities] = useState<OpportunityScore[]>([]);
  const [executiveMetrics, setExecutiveMetrics] = useState<ExecutiveSnapshot | null>(null);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<StrategyTimelineEvent[]>([]);
  const [capacityPlanner, setCapacityPlanner] = useState<any>(null);

  // Dynamic selector values to link evidence/objectives
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Modals & Form States
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showInitiativeModal, setShowInitiativeModal] = useState(false);
  
  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    description: '',
    targetMetric: '',
    targetValue: ''
  });

  const [initiativeForm, setInitiativeForm] = useState({
    objectiveId: '',
    title: '',
    description: '',
    owner: '',
    complexity: 'MEDIUM' as any,
    effortScore: 5,
    targetQuarter: '2026-Q3',
    selectedEvidence: [] as { type: string; id: string; desc: string }[],
    selectedRisks: [] as { type: string; desc: string; severity: string; mitigation: string }[]
  });

  // Adding single risk item in dialog
  const [newRisk, setNewRisk] = useState({
    riskType: 'DEPENDENCY' as any,
    description: '',
    severity: 'MEDIUM' as any,
    mitigationPlan: ''
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
    loadEvidenceSelectors();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [objR, initR, roadR, priR, execR, healthR] = await Promise.all([
        fetch(`${API}/api/strategy/objectives?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/initiatives?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/roadmaps?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/priorities?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/executive?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/strategy/health?projectId=${projectId}`).then(r => r.json())
      ]);

      setObjectives(objR.objectives || []);
      setInitiatives(initR.initiatives || []);
      setRoadmaps(roadR.roadmaps || []);
      setPriorities(priR.priorities || []);
      setExecutiveMetrics(execR.metrics || null);
      setSnapshotsList(execR.snapshots || []);
      setTimeline(healthR.timeline || []);
      setCapacityPlanner(healthR.capacityPlanner || null);
    } catch (err) {
      console.error('Failed to load strategic intelligence layers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvidenceSelectors = async () => {
    try {
      const [anomRes, invRes, sessRes] = await Promise.all([
        fetch(`${API}/api/live/anomalies?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/workspace/threads?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/telemetry/events?projectId=${projectId}`).then(r => r.json())
      ]);

      setAnomalies(anomRes.anomalies || anomRes.events || []);
      setInvestigations(invRes.threads || invRes.investigations || []);
      setSessions(sessRes.events || sessRes.sessions || []);
    } catch (err) {
      console.error('Failed to load evidence selectors:', err);
    }
  };

  // Strategic Objective Creation
  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/strategy/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          title: objectiveForm.title,
          description: objectiveForm.description,
          targetMetric: objectiveForm.targetMetric || undefined,
          targetValue: objectiveForm.targetValue ? parseFloat(objectiveForm.targetValue) : undefined
        })
      });
      if (!res.ok) throw new Error('Failed to create strategic objective.');
      alert('Strategic Objective successfully registered!');
      setShowObjectiveModal(false);
      setObjectiveForm({ title: '', description: '', targetMetric: '', targetValue: '' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Strategic Initiative Creation
  const handleCreateInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/strategy/initiatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          objectiveId: initiativeForm.objectiveId || undefined,
          title: initiativeForm.title,
          description: initiativeForm.description,
          owner: initiativeForm.owner || 'unassigned',
          complexity: initiativeForm.complexity,
          effortScore: initiativeForm.effortScore,
          targetQuarter: initiativeForm.targetQuarter,
          evidenceList: initiativeForm.selectedEvidence.map(ev => ({
            evidenceType: ev.type,
            referenceId: ev.id,
            description: ev.desc
          })),
          riskList: initiativeForm.selectedRisks.map(r => ({
            riskType: r.type,
            description: r.desc,
            severity: r.severity,
            mitigationPlan: r.mitigation
          }))
        })
      });

      if (!res.ok) throw new Error('Failed to submit initiative proposal.');
      alert('Product Initiative submitted and prioritized successfully!');
      setShowInitiativeModal(false);
      // Reset form
      setInitiativeForm({
        objectiveId: '',
        title: '',
        description: '',
        owner: '',
        complexity: 'MEDIUM',
        effortScore: 5,
        targetQuarter: '2026-Q3',
        selectedEvidence: [],
        selectedRisks: []
      });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate Roadmap Proposals
  const handleGenerateRoadmaps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/strategy/roadmaps/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error('Roadmap sequencing calculation failed.');
      alert('Roadmap sequencing optimized and synchronized!');
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Status transitions
  const handleInitiativeDecision = async (initId: string, status: string, details?: any) => {
    try {
      const res = await fetch(`${API}/api/strategy/initiatives/${initId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          status,
          ...details
        })
      });
      if (!res.ok) throw new Error('Failed to update initiative state.');
      alert(`Initiative status updated to ${status}.`);
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Quick risk adding helper
  const addRiskToForm = () => {
    if (!newRisk.description || !newRisk.mitigationPlan) {
      alert('Fill in risk description and mitigation details.');
      return;
    }
    setInitiativeForm(prev => ({
      ...prev,
      selectedRisks: [
        ...prev.selectedRisks,
        {
          type: newRisk.riskType,
          desc: newRisk.description,
          severity: newRisk.severity,
          mitigation: newRisk.mitigationPlan
        }
      ]
    }));
    setNewRisk({ riskType: 'DEPENDENCY', description: '', severity: 'MEDIUM', mitigationPlan: '' });
  };

  return (
    <div style={{ height:'100%',overflowY:'auto',background:'#060909',padding:'32px 36px',fontFamily:'Inter,sans-serif' }}>
      
      {/* Premium Glassmorphic Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .strat-tab-container {
          display: flex;
          gap: 6px;
          margin-bottom: 28px;
          background: rgba(10, 15, 15, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 14px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          width: fit-content;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.03);
        }
        .strat-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          color: #4b5563;
          outline: none;
          user-select: none;
        }
        .strat-tab-btn:hover {
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.02);
        }
        .strat-tab-btn.active {
          background: rgba(6, 182, 212, 0.12);
          color: #67e8f9;
          border-color: rgba(6, 182, 212, 0.35);
          box-shadow: 0 0 16px rgba(6, 182, 212, 0.15);
        }
        .strat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 22px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .strat-card:hover {
          border-color: rgba(6, 182, 212, 0.25);
          transform: translateY(-2px);
        }
      ` }} />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(6,182,212,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.25)' }}>
              <Compass size={22} color="#06b6d4" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>Product Strategy Intelligence</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#4b5563', marginTop: 2 }}>Evidence-backed prioritization, initiatives, and executive visibility consoles</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#9ca3af', cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
              <RefreshCcw size={13} />Sync Data
            </button>
            <button onClick={() => setShowObjectiveModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,182,212,0.06)', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <Plus size={14} />Add Objective
            </button>
            <button onClick={() => setShowInitiativeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)' }}>
              <Sparkles size={14} />Create Initiative
            </button>
          </div>
        </div>
      </div>

      {/* Scorecard KPIs */}
      {executiveMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Product Health', val: `${executiveMetrics.productHealthScore}%`, sub: 'UX Health & Risk index', color: '#06b6d4' },
            { label: 'Strategic Risk', val: `${executiveMetrics.strategicRiskScore}%`, sub: 'Active risk blockers', color: '#f59e0b' },
            { label: 'UX Health Score', val: `${executiveMetrics.uxHealthScore}%`, sub: 'Telemetry survivability mean', color: '#10b981' },
            { label: 'Pipeline Backlog', val: executiveMetrics.opportunityPipelineCount, sub: 'Active opportunities', color: '#818cf8' },
            { label: 'Active Initiatives', val: executiveMetrics.activeInitiativesCount, sub: 'In development quarters', color: '#ec4899' }
          ].map((kpi, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 9, color: '#4b5563', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.val}</div>
              <div style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="strat-tab-container">
        {[
          { key: 'executive', label: 'Executive Command', icon: BarChart3 },
          { key: 'opportunities', label: 'Priority Board', icon: Activity },
          { key: 'initiatives', label: 'Initiative Explorer', icon: Briefcase },
          { key: 'roadmaps', label: 'Roadmap Center', icon: Calendar },
          { key: 'health', label: 'UX Health Console', icon: Activity }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`strat-tab-btn ${activeTab === t.key ? 'active' : ''}`}
          >
            <t.icon size={13} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563', fontSize: 13 }}>Compiling strategy intelligence scorecards…</div>}

      {/* Tab Panels */}
      {!loading && (
        <>
          {/* Executive Command */}
          {activeTab === 'executive' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              {/* Snapshot List & Objectives */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Strategic Objectives List */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>Strategic Objectives</h3>
                  {objectives.length === 0 ? (
                    <div style={{ color: '#4b5563', fontSize: 12, padding: '20px 0' }}>No active business objectives defined. Click "Add Objective" to start.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {objectives.map(obj => (
                        <div key={obj.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 16 }}>
                          <h4 style={{ margin: 0, fontSize: 13, color: '#06b6d4', fontWeight: 700 }}>{obj.title}</h4>
                          <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{obj.description}</p>
                          {obj.targetMetric && (
                            <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 10, color: '#4b5563' }}>
                              <span>📊 Metric: {obj.targetMetric}</span>
                              <span>🎯 Target: {obj.targetValue ?? 'none'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History Snapshots */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>Product Health Trend snapshots</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {snapshotsList.map((sn, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: 11, color: '#4b5563' }}>⏱ {new Date(sn.recordedAt).toLocaleString()}</span>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700 }}>
                          <span style={{ color: '#06b6d4' }}>Health: {sn.productHealthScore}%</span>
                          <span style={{ color: '#f59e0b' }}>Risk: {sn.strategicRiskScore}%</span>
                          <span style={{ color: '#10b981' }}>UX: {sn.uxHealthScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Risks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={16} color="#f59e0b" />Active Strategic Risks
                  </h3>
                  {initiatives.every(i => !i.risks || i.risks.length === 0) ? (
                    <div style={{ color: '#4b5563', fontSize: 12, padding: '20px 0' }}>No strategic risks or blocks flagged in current roadmap.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {initiatives.flatMap(i => (i.risks || []).map(r => ({ ...r, initTitle: i.title }))).map((risk, idx) => {
                        const colors = risk.severity === 'CRITICAL' ? '#ef4444' : risk.severity === 'HIGH' ? '#f97316' : '#eab308';
                        return (
                          <div key={idx} style={{ background: 'rgba(239,68,68,0.02)', border: `1px solid rgba(245,158,11,0.12)`, borderRadius: 10, padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: colors, letterSpacing: '0.04em' }}>⚠️ {risk.severity} RISK</span>
                              <span style={{ fontSize: 9, color: '#4b5563' }}>{risk.riskType}</span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>{risk.description}</h4>
                            <p style={{ margin: '6px 0 0 0', fontSize: 10, color: '#4b5563' }}>Target Initiative: {risk.initTitle}</p>
                            <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, fontSize: 10, color: '#9ca3af' }}>
                              <strong>Mitigation:</strong> {risk.mitigationPlan}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Opportunity Prioritization Board */}
          {activeTab === 'opportunities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {priorities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5563', fontSize: 13 }}>No priorities calculated yet. Run synthesis or sync data.</div>
              ) : priorities.map(pri => (
                <div key={pri.id} className="strat-card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>{pri.title}</h3>
                    <span style={{ fontSize: 9, color: '#4b5563', display: 'block', marginTop: 4 }}>RICE SCORE MATRIX CALCULATOR</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>REACH</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>{pri.reachScore.toFixed(0)}% users</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>IMPACT</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>+{pri.impactScore.toFixed(0)}% survivability</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>CONFIDENCE</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>{pri.confidenceScore.toFixed(0)}% engine rating</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>PRIORITY SCORE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4' }}>{pri.overallScore.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Initiative Explorer */}
          {activeTab === 'initiatives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {initiatives.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5563', fontSize: 13 }}>No product initiatives proposed yet. Propose a new initiative above.</div>
              ) : initiatives.map(init => (
                <div key={init.id} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{init.status}</span>
                        <span style={{ fontSize: 11, color: '#4b5563' }}>Owner: {init.owner}</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 14, color: '#f3f4f6', fontWeight: 700 }}>{init.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>STRATEGIC SCORE</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>{init.strategicScore.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{init.description}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {[
                      { label: 'User Impact', val: `${init.userImpactScore}/100` },
                      { label: 'Survivability Gain', val: `${init.survivabilityScore}/100` },
                      { label: 'Confidence Score', val: `${init.riskScore}%` },
                      { label: 'Complexity Rating', val: init.complexity },
                      { label: 'Quarter Target', val: init.targetQuarter }
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div style={{ fontSize: 8, color: '#4b5563', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Linked Evidence Section */}
                  {init.evidence && init.evidence.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 14, marginTop: 14 }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 10, color: '#4b5563', letterSpacing: '0.04em', fontWeight: 800 }}>SUPPORTING UX EVIDENCE:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {init.evidence.map(ev => (
                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
                            <LinkIcon size={12} color="#06b6d4" />
                            <span style={{ color: '#06b6d4', fontWeight: 600 }}>[{ev.evidenceType}]</span>
                            <span>{ev.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons (governance transition) */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 14 }}>
                    {['PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'].map(st => (
                      <button
                        key={st}
                        onClick={() => handleInitiativeDecision(init.id, st)}
                        disabled={init.status === st}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)',
                          background: init.status === st ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                          color: init.status === st ? '#06b6d4' : '#4b5563',
                          fontSize: 10, fontWeight: 700, cursor: init.status === st ? 'default' : 'pointer'
                        }}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strategic Roadmap Center */}
          {activeTab === 'roadmaps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, color: '#f1f5f9' }}>Roadmap Sequencing Recommendations</h3>
                  <p style={{ margin: 0, fontSize: 11, color: '#4b5563', marginTop: 2 }}>Auto-sequenced roadmap buckets matching relative effort constraints and RICE scores.</p>
                </div>
                <button
                  onClick={handleGenerateRoadmaps}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.05)', color: '#06b6d4', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  Optimize Sequencing
                </button>
              </div>

              {roadmaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5563', fontSize: 13 }}>No roadmaps populated yet. Click "Optimize Sequencing" to build proposals.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {roadmaps.map(rm => (
                    <div key={rm.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#06b6d4' }}>{rm.quarter}</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: 13, color: '#cbd5e1' }}>{rm.title}</h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {!rm.initiatives || rm.initiatives.length === 0 ? (
                          <span style={{ fontSize: 11, color: '#4b5563' }}>No initiatives scheduled.</span>
                        ) : rm.initiatives.map(init => (
                          <div key={init.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{init.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#4b5563' }}>
                              <span>Score: {init.strategicScore.toFixed(0)}</span>
                              <span>{init.complexity} Effort ({init.effortScore} pts)</span>
                            </div>
                            {init.risks && init.risks.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {init.risks.map(r => (
                                  <span key={r.id} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 2, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                    ⚠️ {r.riskType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UX Health Console */}
          {activeTab === 'health' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              {/* Timeline Events */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 14, padding: 22 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>Strategic Decision Trace Log</h3>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 20, marginLeft: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {timeline.length === 0 ? (
                    <div style={{ color: '#4b5563', fontSize: 12, padding: '20px 0' }}>No timeline trace logs recorded. Add strategic initiatives to populate.</div>
                  ) : timeline.map(e => (
                    <div key={e.id} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -26, top: 4, width: 8, height: 8, borderRadius: '50%', background: e.type === 'OBJECTIVE_CREATED' ? '#06b6d4' : e.type === 'EVIDENCE_LINKED' ? '#10b981' : '#f59e0b', border: '2px solid #060909' }} />
                      <div style={{ fontSize: 10, color: '#4b5563' }}>{new Date(e.timestamp).toLocaleString()}</div>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>{e.title}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>{e.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capacity breakdowns */}
              {capacityPlanner && (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 14, padding: 22, height: 'fit-content' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#f3f4f6' }}>Quarterly capacity analysis</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {Object.keys(capacityPlanner.capacity).map(q => {
                      const limit = 20;
                      const val = capacityPlanner.capacity[q];
                      const pct = Math.min((val / limit) * 100, 100);
                      return (
                        <div key={q}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 4 }}>
                            <span>{q} Capacity</span>
                            <span>{val} / {limit} effort points</span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#06b6d4', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Strategic Objective Modal */}
      {showObjectiveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0a0f0f', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: 24, maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>Register Strategic Objective</h3>
              <button onClick={() => setShowObjectiveModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <form onSubmit={handleCreateObjective} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Title</label>
                <input required value={objectiveForm.title} onChange={e => setObjectiveForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Expand Checkout Stability" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                <textarea required rows={3} value={objectiveForm.description} onChange={e => setObjectiveForm(p => ({ ...p, description: e.target.value }))} placeholder="State business goal and context..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Target Metric (Optional)</label>
                <input value={objectiveForm.targetMetric} onChange={e => setObjectiveForm(p => ({ ...p, targetMetric: e.target.value }))} placeholder="e.g. checkout_rage_click_rate" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Target Value Threshold (Optional)</label>
                <input type="number" step="0.01" value={objectiveForm.targetValue} onChange={e => setObjectiveForm(p => ({ ...p, targetValue: e.target.value }))} placeholder="e.g. 0.10" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Submitting objective...' : 'Register Objective'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Strategic Initiative Modal */}
      {showInitiativeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0a0f0f', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: 24, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>Propose Product Initiative</h3>
              <button onClick={() => setShowInitiativeModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <form onSubmit={handleCreateInitiative} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Linked Strategic Objective</label>
                <select value={initiativeForm.objectiveId} onChange={e => setInitiativeForm(p => ({ ...p, objectiveId: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none' }}>
                  <option value="" style={{ background: '#0a0f0f' }}>-- Select Objective (Optional) --</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id} style={{ background: '#0a0f0f' }}>{obj.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Title</label>
                <input required value={initiativeForm.title} onChange={e => setInitiativeForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Implement inline payment verification checks" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                <textarea required rows={3} value={initiativeForm.description} onChange={e => setInitiativeForm(p => ({ ...p, description: e.target.value }))} placeholder="State what should be built and how it addresses UX blocks..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Owner</label>
                  <input value={initiativeForm.owner} onChange={e => setInitiativeForm(p => ({ ...p, owner: e.target.value }))} placeholder="e.g. Siddhant" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Target Quarter</label>
                  <select value={initiativeForm.targetQuarter} onChange={e => setInitiativeForm(p => ({ ...p, targetQuarter: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none' }}>
                    <option value="2026-Q3" style={{ background: '#0a0f0f' }}>2026-Q3</option>
                    <option value="2026-Q4" style={{ background: '#0a0f0f' }}>2026-Q4</option>
                    <option value="2027-Q1" style={{ background: '#0a0f0f' }}>2027-Q1</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Complexity</label>
                  <select value={initiativeForm.complexity} onChange={e => setInitiativeForm(p => ({ ...p, complexity: e.target.value as any }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none' }}>
                    <option value="LOW" style={{ background: '#0a0f0f' }}>LOW</option>
                    <option value="MEDIUM" style={{ background: '#0a0f0f' }}>MEDIUM</option>
                    <option value="HIGH" style={{ background: '#0a0f0f' }}>HIGH</option>
                    <option value="VERY_HIGH" style={{ background: '#0a0f0f' }}>VERY_HIGH</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Effort Score Points (1-10)</label>
                  <input type="number" min="1" max="10" value={initiativeForm.effortScore} onChange={e => setInitiativeForm(p => ({ ...p, effortScore: parseInt(e.target.value) || 5 }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Link Evidence Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Link UX Evidence (Anomalies & Investigations)</label>
                <div style={{ maxHeight: 120, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {anomalies.map((an: any) => {
                    const isSel = initiativeForm.selectedEvidence.some(e => e.id === an.id && e.type === 'ANOMALY');
                    return (
                      <label key={an.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={e => {
                            if (e.target.checked) {
                              setInitiativeForm(prev => ({
                                ...prev,
                                selectedEvidence: [...prev.selectedEvidence, { type: 'ANOMALY', id: an.id, desc: an.description }]
                              }));
                            } else {
                              setInitiativeForm(prev => ({
                                ...prev,
                                selectedEvidence: prev.selectedEvidence.filter(item => !(item.id === an.id && item.type === 'ANOMALY'))
                              }));
                            }
                          }}
                        />
                        <span>[Anomaly] {an.description} ({an.severity})</span>
                      </label>
                    );
                  })}
                  {investigations.map((inv: any) => {
                    const isSel = initiativeForm.selectedEvidence.some(e => e.id === inv.id && e.type === 'INVESTIGATION');
                    return (
                      <label key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={e => {
                            if (e.target.checked) {
                              setInitiativeForm(prev => ({
                                ...prev,
                                selectedEvidence: [...prev.selectedEvidence, { type: 'INVESTIGATION', id: inv.id, desc: inv.title }]
                              }));
                            } else {
                              setInitiativeForm(prev => ({
                                ...prev,
                                selectedEvidence: prev.selectedEvidence.filter(item => !(item.id === inv.id && item.type === 'INVESTIGATION'))
                              }));
                            }
                          }}
                        />
                        <span>[Investigation] {inv.title}</span>
                      </label>
                    );
                  })}
                  {anomalies.length === 0 && investigations.length === 0 && (
                    <span style={{ fontSize: 11, color: '#4b5563' }}>No active UX evidence detected to link.</span>
                  )}
                </div>
              </div>

              {/* Add Risk Section */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 14 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Identify Strategic Risks</label>
                {initiativeForm.selectedRisks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {initiativeForm.selectedRisks.map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#cbd5e1' }}>
                        <span>[{r.type}] {r.desc} (Severity: {r.severity})</span>
                        <button type="button" onClick={() => setInitiativeForm(prev => ({ ...prev, selectedRisks: prev.selectedRisks.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <select value={newRisk.riskType} onChange={e => setNewRisk(p => ({ ...p, riskType: e.target.value as any }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, color: '#cbd5e1', fontSize: 11, outline: 'none' }}>
                    <option value="DEPENDENCY" style={{ background: '#0a0f0f' }}>DEPENDENCY</option>
                    <option value="COMPLEXITY" style={{ background: '#0a0f0f' }}>COMPLEXITY</option>
                    <option value="RESOURCE" style={{ background: '#0a0f0f' }}>RESOURCE</option>
                    <option value="UX_REGRESSION" style={{ background: '#0a0f0f' }}>UX_REGRESSION</option>
                  </select>
                  <select value={newRisk.severity} onChange={e => setNewRisk(p => ({ ...p, severity: e.target.value as any }))} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, color: '#cbd5e1', fontSize: 11, outline: 'none' }}>
                    <option value="LOW" style={{ background: '#0a0f0f' }}>LOW</option>
                    <option value="MEDIUM" style={{ background: '#0a0f0f' }}>MEDIUM</option>
                    <option value="HIGH" style={{ background: '#0a0f0f' }}>HIGH</option>
                    <option value="CRITICAL" style={{ background: '#0a0f0f' }}>CRITICAL</option>
                  </select>
                </div>
                <input value={newRisk.description} onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))} placeholder="Risk description (e.g. Depends on initiative uuid...)" style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, color: '#cbd5e1', fontSize: 11, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <input value={newRisk.mitigationPlan} onChange={e => setNewRisk(p => ({ ...p, mitigationPlan: e.target.value }))} placeholder="Mitigation plan details..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, color: '#cbd5e1', fontSize: 11, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <button type="button" onClick={addRiskToForm} style={{ padding: '6px 12px', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.05)', color: '#06b6d4', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Add Risk to Proposal</button>
              </div>

              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: submitting ? 0.6 : 1, marginTop: 10 }}>
                {submitting ? 'Submitting proposal...' : 'Submit Initiative'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
