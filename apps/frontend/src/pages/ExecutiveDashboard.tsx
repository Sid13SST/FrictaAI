import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Compass, ShieldCheck, Target, Award, Sparkles, Plus, RefreshCcw,
  GitBranch, GitCommit, GitMerge, AlertTriangle, ChevronRight, Eye,
  Info, ShieldAlert, BarChart2, DollarSign, Calendar, User, Database,
  Activity, ExternalLink, ShieldAlert as BadgeAlert, CheckCircle2,
  FileSpreadsheet, FileClock, Scale, HelpCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ExecutiveRecommendation {
  id: string;
  title: string;
  description: string;
  recommendationType: 'INITIATIVE' | 'STRATEGIC' | 'RISK' | 'CAPACITY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  evidenceCount: number;
  createdAt: string;
  evidence?: Array<{ id: string; evidenceType: string; description: string; referenceId: string }>;
  decisions?: Array<{ id: string; action: string; notes: string; createdAt: string; user: { name: string } }>;
}

interface GovernancePolicyReview {
  id: string;
  policyName: string;
  complianceRate: number;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  checkedAt: string;
}

interface GovernanceReview {
  id: string;
  reviewType: string;
  targetId: string;
  verdict: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
  details: string;
  reviewedBy: string;
  reviewedAt: string;
}

interface StrategicRiskRecord {
  id: string;
  riskSource: 'INITIATIVE' | 'KPI' | 'GOVERNANCE' | 'UX';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  impact: number;
  compositeScore: number;
  status: 'MONITORED' | 'ESCALATED' | 'RESOLVED';
  createdAt: string;
}

interface DecisionOutcome {
  id: string;
  metricKey: string;
  expectedDelta: number;
  actualDelta: number | null;
  status: 'PENDING' | 'TARGET_ACHIEVED' | 'TARGET_MISSED';
  decision: { recommendation: { title: string } };
}

export function ExecutiveDashboard() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'briefing' | 'decisions' | 'governance' | 'risks' | 'timeline'>('briefing');

  // Page States
  const [briefingText, setBriefingText] = useState<string>('');
  const [compositeScore, setCompositeScore] = useState<number>(82.5);
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [healthAverages, setHealthAverages] = useState<any>({ compositeHealth: 82.5, productHealth: 84.0, strategicHealth: 78.0, portfolioHealth: 80.0, uxHealth: 85.0, kpiHealth: 86.0 });
  const [recommendations, setRecommendations] = useState<ExecutiveRecommendation[]>([]);
  const [policyReviews, setPolicyReviews] = useState<GovernancePolicyReview[]>([]);
  const [initiativeReviews, setInitiativeReviews] = useState<GovernanceReview[]>([]);
  const [risks, setRisks] = useState<StrategicRiskRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<DecisionOutcome[]>([]);

  // Selected Recommendation detail modal
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Form states for Recording decisions
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionRec, setDecisionRec] = useState<ExecutiveRecommendation | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    action: 'APPROVE',
    notes: ''
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
      // 1. Fetch Health Metrics & Briefings
      const healthR = await fetch(`${API}/api/executive/health?projectId=${projectId}`).then(r => r.json());
      setBriefingText(healthR.briefing.summaryBriefing || '');
      setCompositeScore(healthR.briefing.compositeHealth || 82.5);
      setHealthHistory(healthR.health.history || []);
      setHealthAverages(healthR.health.averages || { compositeHealth: 82.5, productHealth: 84.0, strategicHealth: 78.0, portfolioHealth: 80.0, uxHealth: 85.0, kpiHealth: 86.0 });

      // 2. Fetch Recommendations
      const recsR = await fetch(`${API}/api/executive/recommendations?projectId=${projectId}`).then(r => r.json());
      setRecommendations(recsR.recommendations || []);

      // 3. Fetch Governance Reviews
      const govR = await fetch(`${API}/api/executive/governance?projectId=${projectId}`).then(r => r.json());
      setPolicyReviews(govR.policyReviews || []);
      setInitiativeReviews(govR.initiativeReviews || []);

      // 4. Fetch Organizational Risks
      const risksR = await fetch(`${API}/api/executive/risks?projectId=${projectId}`).then(r => r.json());
      setRisks(risksR.risks || []);

      // 5. Fetch Decision timeline & outcomes
      const decsR = await fetch(`${API}/api/executive/decisions?projectId=${projectId}`).then(r => r.json());
      setTimelineEvents(decsR.timeline || []);
      setOutcomes(decsR.outcomes || []);

    } catch (err) {
      console.error('Failed to load executive decision intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Evidence details
  const handleInspectEvidence = async (recId: string) => {
    setSelectedRecId(recId);
    setLoadingEvidence(true);
    try {
      const res = await fetch(`${API}/api/executive/evidence/${recId}?projectId=${projectId}`);
      const data = await res.json();
      setEvidenceList(data.evidence || []);
    } catch (err) {
      console.error('Failed to load evidence trail:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Submit Decision
  const handleOpenDecisionModal = (rec: ExecutiveRecommendation) => {
    setDecisionRec(rec);
    setDecisionForm({ action: 'APPROVE', notes: '' });
    setShowDecisionModal(true);
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionRec) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/executive/recommendations/${decisionRec.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          action: decisionForm.action,
          notes: decisionForm.notes
        })
      });
      if (!res.ok) throw new Error('Decision request failed.');
      alert(`Decision recorded successfully! Re-routing recommendation status.`);
      setShowDecisionModal(false);
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#050707', padding: '32px 36px', fontFamily: 'Inter, sans-serif', color: '#e5e7eb' }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .exec-tab-container {
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
        .exec-tab-btn {
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
        .exec-tab-btn:hover {
          color: #d1d5db;
          background: rgba(255, 255, 255, 0.02);
        }
        .exec-tab-btn.active {
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
        }
        .exec-card {
          background: rgba(15, 23, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          transition: transform 0.2s, border-color 0.2s;
        }
        .exec-card:hover {
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-1px);
        }
        .exec-btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #ffffff;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
          transition: opacity 0.2s;
        }
        .exec-btn-primary:hover {
          opacity: 0.9;
        }
        .exec-btn-secondary {
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
        .exec-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #f3f4f6;
        }
        .exec-badge {
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
        .sev-critical {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .sev-high {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .sev-medium {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .gov-compliant {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .gov-warning {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .gov-noncompliant {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      ` }} />

      {/* Header Panel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <ShieldCheck size={22} color="#10b981" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>Executive Decision Intelligence</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>Advisory strategic recommendations, compliance audit verifications, and risk governance</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadAll} disabled={loading} className="exec-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />Sync Intelligence
            </button>
          </div>
        </div>
      </div>

      {/* Governance Mandate Banner */}
      <div className="exec-card" style={{ background: 'rgba(16, 185, 129, 0.02)', borderColor: 'rgba(16, 185, 129, 0.15)', marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Scale size={20} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a7f3d0', display: 'block' }}>Advisory Strategic Support & Governance Invariant</span>
            <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: '1.5', marginTop: 3, display: 'block' }}>
              All Fricta executive briefings, policy reviews, and risk indicators are strictly advisory. System recommendations are generated to support executive decision-making. No automated adjustments to roadmap priorities, initiative allocations, or workspace configurations occur without human review and authorization.
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="exec-tab-container">
        <button onClick={() => setActiveTab('briefing')} className={`exec-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}>
          <BarChart2 size={14} />Executive Command Briefings
        </button>
        <button onClick={() => setActiveTab('decisions')} className={`exec-tab-btn ${activeTab === 'decisions' ? 'active' : ''}`}>
          <Target size={14} />Decision Support Console
        </button>
        <button onClick={() => setActiveTab('governance')} className={`exec-tab-btn ${activeTab === 'governance' ? 'active' : ''}`}>
          <Scale size={14} />Governance & Compliance
        </button>
        <button onClick={() => setActiveTab('risks')} className={`exec-tab-btn ${activeTab === 'risks' ? 'active' : ''}`}>
          <ShieldAlert size={14} />Strategic Risk Center
        </button>
        <button onClick={() => setActiveTab('timeline')} className={`exec-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}>
          <FileClock size={14} />Audit Trails & Timelines
        </button>
      </div>

      {/* ── Tab: Executive Command Briefings ────────────────────────────────────── */}
      {activeTab === 'briefing' && (
        <div>
          {/* Health Index KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
            <div className="exec-card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Composite Health Rating</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.compositeHealth.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Weighted index average</p>
            </div>
            <div className="exec-card" style={{ borderLeft: '4px solid #a855f7' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Product KPI Health</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.kpiHealth.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Active metrics accuracy</p>
            </div>
            <div className="exec-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Strategic Progress</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.strategicHealth.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Objective coverage rate</p>
            </div>
            <div className="exec-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Portfolio Alignment</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.portfolioHealth.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Roadmap alignment score</p>
            </div>
            <div className="exec-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>UX Survivability Index</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.uxHealth.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Error-free session ratios</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
            {/* Health Snapshot Graph */}
            <div className="exec-card" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700 }}>Executive Health Index Trends</h3>
              <div style={{ flex: 1, width: '100%', height: '100%' }}>
                {healthHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="95%">
                    <LineChart
                      data={healthHistory.map(snap => ({
                        ...snap,
                        recordedAt: new Date(snap.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      })).reverse()}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <XAxis dataKey="recordedAt" stroke="#4b5563" fontSize={9} />
                      <YAxis domain={[50, 100]} stroke="#4b5563" fontSize={9} />
                      <Tooltip contentStyle={{ background: '#090d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" name="Composite Health" dataKey="compositeHealth" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" name="Strategic Health" dataKey="strategicHealth" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" name="UX Health" dataKey="uxHealth" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>
                    Not enough trend snapshots recorded. Run evaluations to log snapshots.
                  </div>
                )}
              </div>
            </div>

            {/* Strategic Summary Briefing Text */}
            <div className="exec-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileSpreadsheet size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Executive Command Briefing</h3>
              </div>
              <div style={{ flex: 1, padding: '14px 16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: 10, fontSize: 12, lineHeight: 1.6, color: '#9ca3af' }}>
                {briefingText || 'No briefings compiled for the current period.'}
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: 9, color: '#6b7280', textAlign: 'right' }}>Generated by Strategic Briefing Engine</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Decision Support Console ──────────────────────────────────────── */}
      {activeTab === 'decisions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recommendations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800 }}>Awaiting Human-in-the-Loop Override</h3>
            {recommendations.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 12 }}>
                No active strategic recommendations surfaced at this time.
              </div>
            ) : (
              recommendations.map(rec => (
                <div key={rec.id} className="exec-card" style={{ borderLeft: `4px solid ${rec.priority === 'CRITICAL' ? '#ef4444' : rec.priority === 'HIGH' ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className={`exec-badge ${rec.priority === 'CRITICAL' ? 'sev-critical' : rec.priority === 'HIGH' ? 'sev-high' : 'sev-medium'}`}>
                      {rec.recommendationType} | {rec.priority}
                    </span>
                    <span className="exec-badge" style={{ background: rec.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : rec.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', color: rec.status === 'APPROVED' ? '#34d399' : rec.status === 'REJECTED' ? '#f87171' : '#9ca3af' }}>
                      {rec.status}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700 }}>{rec.title}</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{rec.description}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 12 }}>
                    <button onClick={() => handleInspectEvidence(rec.id)} className="exec-btn-secondary" style={{ padding: '6px 12px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Eye size={12} />Trace Evidence Chain ({rec.evidenceCount})
                    </button>
                    {rec.status === 'ACTIVE' && (
                      <button onClick={() => handleOpenDecisionModal(rec)} className="exec-btn-primary" style={{ padding: '6px 12px', fontSize: 10 }}>
                        Apply Action Override
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Traceability Explorer */}
          <div className="exec-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content', minHeight: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Compass size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Evidence-Linked Traceability Explorer</h3>
            </div>

            {!selectedRecId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', padding: 32, textAlign: 'center' }}>
                <Info size={28} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 12 }}>Select a recommendation to inspect its supporting evidence trace path.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 10 }}>Fricta enforces explainability; no recommendations exist without full database paths.</p>
              </div>
            ) : loadingEvidence ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>
                <RefreshCcw className="animate-spin" size={16} style={{ marginRight: 6 }} /> Resolving trace references...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                  Trace path mapping for selected recommendation:
                </div>
                {evidenceList.map((ev, index) => (
                  <div key={ev.evidenceId} style={{ display: 'flex', gap: 12 }}>
                    {/* Visual Connector Node */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#10b981' }}>
                        {index + 1}
                      </div>
                      {index < evidenceList.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#e5e7eb', fontSize: 10 }}>Node Type: {ev.evidenceType}</span>
                        <span style={{ fontSize: 8, color: '#6b7280' }}>Ref ID: {ev.referenceId.substring(0, 8)}...</span>
                      </div>
                      <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>{ev.description}</p>
                      {ev.entityDetails && (
                        <div style={{ marginTop: 6, padding: 6, background: '#090d0d', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: 4, fontSize: 9, fontFamily: 'monospace', color: '#34d399' }}>
                          Status: {ev.entityDetails.status || ev.entityDetails.severity || 'ACTIVE'} | {ev.entityDetails.title || ev.entityDetails.name || ev.entityDetails.metricKey || 'Session Logged'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Governance & Compliance ───────────────────────────────────────── */}
      {activeTab === 'governance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20 }}>
          {/* Policy Compliance Checks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800 }}>Workspace Policy Compliance</h3>
            {policyReviews.map(pol => (
              <div key={pol.id} className="exec-card" style={{ borderLeft: `4px solid ${pol.status === 'PASSED' ? '#10b981' : pol.status === 'WARNING' ? '#f59e0b' : '#ef4444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{pol.policyName}</h4>
                  <span className={`exec-badge ${pol.status === 'PASSED' ? 'gov-compliant' : pol.status === 'WARNING' ? 'gov-warning' : 'gov-noncompliant'}`}>
                    {pol.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Compliance Rate:</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: pol.status === 'PASSED' ? '#34d399' : '#fbbf24' }}>
                    {pol.complianceRate.toFixed(0)}%
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: 8, color: '#6b7280', textAlign: 'right' }}>Audit verified: {new Date(pol.checkedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          {/* Initiative Compliance Audits */}
          <div className="exec-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800 }}>Roadmap Initiative Governance Compliance Reviews</h3>
            {initiativeReviews.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No active initiative reviews logged in this workspace.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {initiativeReviews.map(rev => (
                  <div key={rev.id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className={`exec-badge ${rev.verdict === 'COMPLIANT' ? 'gov-compliant' : 'gov-warning'}`} style={{ fontSize: 9 }}>
                        {rev.verdict}
                      </span>
                      <span style={{ fontSize: 9, color: '#6b7280' }}>Reviewed at {new Date(rev.reviewedAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                      Initiative ID: {rev.targetId.substring(0, 8)}...
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{rev.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Strategic Risk Center ─────────────────────────────────────────── */}
      {activeTab === 'risks' && (
        <div>
          <div className="exec-card" style={{ background: 'rgba(239, 68, 68, 0.01)', borderColor: 'rgba(239, 68, 68, 0.12)', marginBottom: 24, padding: 18 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>Strategic Risk Assessment</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: '1.5' }}>
              Strategic Risk Center maps and aggregates risks across active initiatives, portfolio alignment gaps, KPI metrics, and UX friction signals. Fricta highlights these organizational risks to support decision overrides, but does not autonomously resolve them.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {risks.length === 0 ? (
              <div style={{ padding: 48, gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No active strategic risk items found.
              </div>
            ) : (
              risks.map(risk => (
                <div key={risk.id} className="exec-card" style={{ borderLeft: `4px solid ${risk.severity === 'CRITICAL' ? '#ef4444' : risk.severity === 'HIGH' ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="exec-badge status-misaligned" style={{ color: risk.severity === 'CRITICAL' ? '#f87171' : '#fbbf24', borderColor: 'currentColor', border: '1px solid', background: 'transparent' }}>
                      {risk.riskSource} Risk | {risk.severity}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: risk.compositeScore > 60 ? '#f87171' : '#fbbf24' }}>
                      {risk.compositeScore.toFixed(0)}%
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700 }}>{risk.title}</h4>
                  <p style={{ margin: '0 0 14px 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{risk.description}</p>

                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 10 }}>
                    <span>Probability: {(risk.probability * 100).toFixed(0)}%</span>
                    <span>Impact: {(risk.impact * 100).toFixed(0)}%</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{risk.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Audit Trails & Timelines ──────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          {/* Decision Timeline Events */}
          <div className="exec-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileClock size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Strategic Audit Trail & Timeline</h3>
            </div>

            {timelineEvents.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No timeline events logged in this workspace yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {timelineEvents.map((evt, index) => (
                  <div key={evt.id} style={{ display: 'flex', gap: 14 }}>
                    {/* Visual Connector node */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: evt.eventType === 'DECISION' ? 'rgba(16, 185, 129, 0.15)' : evt.eventType === 'RECOMMENDATION' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${evt.eventType === 'DECISION' ? '#10b981' : evt.eventType === 'RECOMMENDATION' ? '#3b82f6' : '#f59e0b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                      {index < timelineEvents.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{evt.title}</span>
                        <span style={{ fontSize: 9, color: '#6b7280' }}>{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, color: '#9ca3af' }}>{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision Outcomes Trackers */}
          <div className="exec-card" style={{ height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800 }}>Decision Impact Outcomes</h3>
            {outcomes.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                No active decision outcomes monitored.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {outcomes.map(out => (
                  <div key={out.id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="exec-badge status-gapped" style={{ fontSize: 9, color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)', borderColor: 'rgba(129, 140, 248, 0.2)' }}>
                        Target Metric: {out.metricKey}
                      </span>
                      <span className="exec-badge" style={{ background: out.status === 'TARGET_ACHIEVED' ? 'rgba(16, 185, 129, 0.1)' : out.status === 'PENDING' ? 'rgba(255,255,255,0.03)' : 'rgba(239, 68, 68, 0.1)', color: out.status === 'TARGET_ACHIEVED' ? '#34d399' : out.status === 'PENDING' ? '#9ca3af' : '#f87171' }}>
                        {out.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb', marginBottom: 8 }}>
                      Rec: "{out.decision.recommendation.title}"
                    </div>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 10 }}>
                      <span style={{ color: '#9ca3af' }}>Expected Delta:</span>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>+{out.expectedDelta}%</span>
                    </div>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
                      <span style={{ color: '#9ca3af' }}>Actual Measured Delta:</span>
                      <span style={{ color: out.actualDelta !== null ? (out.actualDelta >= out.expectedDelta ? '#34d399' : '#fbbf24') : '#6b7280', fontWeight: 700 }}>
                        {out.actualDelta !== null ? `+${out.actualDelta.toFixed(1)}%` : 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Record Decision ───────────────────────────────────────────── */}
      {showDecisionModal && decisionRec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="exec-card" style={{ width: '100%', maxWidth: 450, background: '#0a0d0d', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: '#fff' }}>Apply Governance Override Decision</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 11, color: '#6b7280' }}>
              Authorize action override on strategic proposal: "{decisionRec.title}". Action logs will be recorded in audit trails.
            </p>

            <form onSubmit={handleSubmitDecision}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>Decision Action Override</label>
                <select
                  value={decisionForm.action}
                  onChange={(e) => setDecisionForm(prev => ({ ...prev, action: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#070b0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                >
                  <option value="APPROVE">Approve Recommendation</option>
                  <option value="REJECT">Reject Recommendation</option>
                  <option value="ARCHIVE">Archive Recommendation</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>Decision Rationale & Comments</label>
                <textarea
                  value={decisionForm.notes}
                  onChange={(e) => setDecisionForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  required
                  placeholder="Enter the strategic justification or review comments supporting this action override..."
                  style={{ width: '100%', padding: '9px 12px', background: '#070b0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowDecisionModal(false)} className="exec-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="exec-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {submitting && <RefreshCcw size={12} className="animate-spin" />}Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
