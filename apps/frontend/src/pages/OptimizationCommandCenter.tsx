import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Compass, Target, TrendingUp, Brain, CheckCircle2, XCircle,
  AlertTriangle, Clock, RefreshCcw, ExternalLink, HelpCircle,
  Play, BookOpen, Layers, UserCheck, Send, Check, AlertCircle, Sparkles,
  FlaskConical, KanbanSquare
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  opportunityType: 'HIGH_FRICTION' | 'ONBOARDING' | 'CTA' | 'NAVIGATION' | 'COGNITIVE' | 'WORKFLOW' | 'SURVIVABILITY';
  title: string;
  description: string;
  evidence: string[] | any;
  score: number;
  impactPotential: number;
  userReach: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  survivabilityGain: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  createdAt: string;
}

interface Forecast {
  id: string;
  metricName: string;
  currentValue: number;
  forecastedValue: number;
  confidenceIntervalLower: number;
  confidenceIntervalUpper: number;
  uncertaintyDetails: string;
  opportunity?: Opportunity;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impactArea: string;
  score: number;
  complexity: string;
  status: 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'CONVERTED_TO_EXPERIMENT' | 'CONVERTED_TO_INVESTIGATION' | 'CONVERTED_TO_JIRA';
  createdAt: string;
  opportunity?: Opportunity;
  decisions?: Decision[];
}

interface Decision {
  id: string;
  action: string;
  comments?: string;
  externalReference?: string;
  decidedAt: string;
}

interface Roadmap {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: string;
  recommendations?: Recommendation[];
}

interface TimelineEvent {
  id: string;
  type: 'DECISION' | 'CREATION' | 'OUTCOME';
  title: string;
  description: string;
  timestamp: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OptimizationCommandCenter() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'opportunities' | 'recommendations' | 'roadmaps' | 'forecasts' | 'timeline'>('opportunities');

  // Page States
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // Selection & Form States
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    action: 'APPROVED' as any,
    comments: '',
    externalReference: ''
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
      const [oppR, recR, roadR, foreR, timeR] = await Promise.all([
        fetch(`${API}/api/autonomous/opportunities?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/autonomous/recommendations?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/autonomous/roadmaps?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/autonomous/forecasts?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/autonomous/timeline?projectId=${projectId}`).then(r => r.json())
      ]);
      setOpportunities(oppR.opportunities || []);
      setRecommendations(recR.recommendations || []);
      setRoadmaps(roadR.roadmaps || []);
      setForecasts(foreR.forecasts || []);
      setTimeline(timeR.timeline || []);
    } catch (err) {
      console.error('Failed to load optimization planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual synthesis
  const handleSynthesize = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/autonomous/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (!res.ok) {
        throw new Error(`Synthesis returned status ${res.status}`);
      }
      alert('Cross-intelligence synthesis completed successfully! Generated new opportunities and forecasts.');
      await loadAll();
    } catch (err: any) {
      alert(`Synthesis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply human-supervised decision
  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/autonomous/recommendations/${selectedRec.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'demo_user',
          action: decisionForm.action,
          comments: decisionForm.comments,
          externalReference: decisionForm.externalReference
        })
      });
      if (!res.ok) throw new Error(`Decision action failed with status ${res.status}`);
      alert(`Recommendation successfully converted/logged as ${decisionForm.action}.`);
      setDecisionForm({ action: 'APPROVED', comments: '', externalReference: '' });
      setSelectedRec(null);
      await loadAll();
    } catch (err: any) {
      alert(`Failed to apply decision: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate roadmap quarters
  const handleGenerateRoadmap = async () => {
    const proposedRecs = recommendations.filter(r => r.status === 'PROPOSED' || r.status === 'UNDER_REVIEW');
    if (proposedRecs.length === 0) {
      alert('No proposed or under-review recommendations found to sequence.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/autonomous/roadmaps/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          initiativeIds: proposedRecs.map(r => r.id)
        })
      });
      if (!res.ok) throw new Error(`Roadmap generation failed with status ${res.status}`);
      alert('Quarterly Roadmap proposal generated successfully!');
      await loadAll();
    } catch (err: any) {
      alert(`Roadmap generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Color mapping
  const severityColors = {
    LOW: { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
    MEDIUM: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
    HIGH: { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
  };

  const statusColors = {
    PROPOSED: { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
    UNDER_REVIEW: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
    APPROVED: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    REJECTED: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    ARCHIVED: { bg: 'rgba(71,85,105,0.2)', text: '#64748b' },
    CONVERTED_TO_EXPERIMENT: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
    CONVERTED_TO_INVESTIGATION: { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
    CONVERTED_TO_JIRA: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' }
  };

  return (
    <div style={{ height:'100%',overflowY:'auto',background:'#070b0a',padding:'32px 36px',fontFamily:'Inter,sans-serif' }}>
      
      {/* Scoped CSS styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cc-tab-container {
          display: flex;
          gap: 6px;
          margin-bottom: 28px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 14px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          width: fit-content;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .cc-tab-btn {
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
          color: #64748b;
          outline: none;
          user-select: none;
        }
        .cc-tab-btn:hover {
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.03);
        }
        .cc-tab-btn:active {
          transform: scale(0.97);
        }
        .cc-tab-btn.active {
          background: rgba(16, 185, 129, 0.12);
          color: #a7f3d0;
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .cc-tab-icon {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cc-tab-btn.active .cc-tab-icon {
          transform: scale(1.18);
        }
      ` }} />

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(16,185,129,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Compass size={20} color="#10b981" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Strategy Operating System</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', marginTop: 2 }}>Human-Supervised Autonomous Optimization Command Center</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#64748b', cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
              <RefreshCcw size={12} />Refresh
            </button>
            <button onClick={handleSynthesize} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
              <Sparkles size={13} />Run Synthesis
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Active Opportunities', value: opportunities.length, icon: AlertCircle, color: '#f59e0b' },
          { label: 'Pending Approvals', value: recommendations.filter(r => r.status === 'PROPOSED').length, icon: Clock, color: '#818cf8' },
          { label: 'Avg Confidence', value: opportunities.length > 0 ? `${(opportunities.reduce((acc, o) => acc + o.confidence, 0) / opportunities.length * 100).toFixed(0)}%` : '0%', icon: Brain, color: '#10b981' },
          { label: 'Forecasted Gain', value: opportunities.length > 0 ? `+${(opportunities.reduce((acc, o) => acc + o.survivabilityGain, 0) / opportunities.length * 100).toFixed(1)}%` : '+0%', icon: TrendingUp, color: '#06b6d4' }
        ].map((s, idx) => (
          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <s.icon size={13} color={s.color} />
              <span style={{ fontSize: 9, color: '#475569', letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Switch Tab Bar */}
      <div className="cc-tab-container">
        {[
          { key: 'opportunities', label: 'Opportunity Explorer', icon: AlertCircle },
          { key: 'recommendations', label: 'Review Center', icon: UserCheck },
          { key: 'roadmaps', label: 'Roadmap Builder', icon: KanbanSquare },
          { key: 'forecasts', label: 'Impact Forecasts', icon: TrendingUp },
          { key: 'timeline', label: 'Optimization Timeline', icon: Clock }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`cc-tab-btn ${activeTab === t.key ? 'active' : ''}`}
          >
            <t.icon size={13} className="cc-tab-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: 13 }}>Loading engine intelligence layers…</div>}

      {/* Tab Views */}
      {!loading && (
        <>
          {/* Opportunity Explorer */}
          {activeTab === 'opportunities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {opportunities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: 13 }}>
                  No active opportunities detected. Click "Run Synthesis" to process system intelligence logs.
                </div>
              ) : opportunities.map(op => {
                const sev = severityColors[op.severity] || { bg: 'rgba(0,0,0,0.2)', text: '#fff' };
                const evidenceList = Array.isArray(op.evidence) ? op.evidence : JSON.parse(op.evidence || '[]');
                return (
                  <div key={op.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: sev.bg, color: sev.text }}>{op.severity}</span>
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{op.opportunityType}</span>
                        </div>
                        <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{op.title}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>PRIORITY SCORE</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{op.score.toFixed(0)}</div>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>{op.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                      {[
                        { label: 'Reach', val: `${(op.userReach * 100).toFixed(0)}% users` },
                        { label: 'Survivability Gain', val: `+${(op.survivabilityGain * 100).toFixed(1)}%` },
                        { label: 'Confidence', val: `${(op.confidence * 100).toFixed(0)}%` },
                        { label: 'Complexity', val: op.implementationComplexity }
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div style={{ fontSize: 9, color: '#475569', marginBottom: 3 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>{item.val}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.04em' }}>SUPPORTING TELEMETRY EVIDENCE:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {evidenceList.map((ev: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                            <span style={{ width: 4, height: 4, background: '#10b981', borderRadius: '50%' }} />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendation Review Center */}
          {activeTab === 'recommendations' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedRec ? '1fr 1fr' : '1fr', gap: 16 }}>
              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recommendations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: 13 }}>
                    No pending optimization recommendations. Click "Run Synthesis" above to build plans.
                  </div>
                ) : recommendations.map(rec => {
                  const isSel = selectedRec?.id === rec.id;
                  const stat = statusColors[rec.status] || { bg: 'rgba(0,0,0,0.1)', text: '#fff' };
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRec(rec)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: isSel ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isSel ? '0 0 12px rgba(16,185,129,0.08)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: stat.bg, color: stat.text, fontWeight: 700 }}>{rec.status}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Score: {rec.score.toFixed(0)}</span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{rec.title}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{rec.description}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10, color: '#475569' }}>
                        <span>📂 {rec.impactArea}</span>
                        <span>⏱ {rec.complexity} effort</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Panel */}
              {selectedRec && (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: 24, height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={16} color="#10b981" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>HUMAN DECISION PORTAL</span>
                    </div>
                    <button onClick={() => setSelectedRec(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#cbd5e1' }}>{selectedRec.title}</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{selectedRec.description}</p>

                  <form onSubmit={handleDecision} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>Choose Action</label>
                      <select
                        value={decisionForm.action}
                        onChange={e => setDecisionForm(p => ({ ...p, action: e.target.value as any }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12, outline: 'none' }}
                      >
                        <option value="APPROVED" style={{ background: '#070b0a' }}>Approve Recommendation</option>
                        <option value="REJECTED" style={{ background: '#070b0a' }}>Reject Recommendation</option>
                        <option value="ARCHIVED" style={{ background: '#070b0a' }}>Archive</option>
                        <option value="CONVERT_TO_EXPERIMENT" style={{ background: '#070b0a' }}>Convert to A/B Experiment</option>
                        <option value="CONVERT_TO_INVESTIGATION" style={{ background: '#070b0a' }}>Convert to Investigation</option>
                        <option value="CONVERT_TO_JIRA" style={{ background: '#070b0a' }}>Export to Jira/Linear Issue</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>Rationale Comments</label>
                      <textarea
                        rows={3}
                        value={decisionForm.comments}
                        onChange={e => setDecisionForm(p => ({ ...p, comments: e.target.value }))}
                        placeholder="State why this recommendation is approved, rejected, or exported..."
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>External Reference URL/ID (Optional)</label>
                      <input
                        value={decisionForm.externalReference}
                        onChange={e => setDecisionForm(p => ({ ...p, externalReference: e.target.value }))}
                        placeholder="e.g. https://jira.company.com/browse/UX-101"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        opacity: submitting ? 0.6 : 1, transition: 'all 0.2s', marginTop: 8
                      }}
                    >
                      {submitting ? 'Applying decision...' : 'Execute Decision'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Roadmap Builder */}
          {activeTab === 'roadmaps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, color: '#f1f5f9' }}>Quarterly Sequences</h3>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', marginTop: 2 }}>Roadmap sequences built from reach complexity prioritization matrices.</p>
                </div>
                <button
                  onClick={handleGenerateRoadmap}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  Generate Roadmap Proposal
                </button>
              </div>

              {roadmaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: 13 }}>
                  No roadmaps proposed yet. Click "Generate Roadmap Proposal" to sequence initiatives.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {roadmaps.map(rm => (
                    <div key={rm.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{rm.quarter}</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: 13, color: '#cbd5e1' }}>{rm.title}</h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {!rm.recommendations || rm.recommendations.length === 0 ? (
                          <span style={{ fontSize: 11, color: '#475569' }}>No initiatives scheduled.</span>
                        ) : rm.recommendations.map(rec => (
                          <div key={rec.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{rec.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569' }}>
                              <span>Score: {rec.score.toFixed(0)}</span>
                              <span>{rec.complexity} Effort</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Forecast Viewer */}
          {activeTab === 'forecasts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {forecasts.length === 0 ? (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: 13 }}>
                  No active forecast records. Run synthesis to project improvement indicators.
                </div>
              ) : forecasts.map(fc => (
                <div key={fc.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>📊 {fc.metricName.replace(/_/g, ' ').toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>FORECAST</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>CURRENT</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#94a3b8' }}>{fc.currentValue.toFixed(2)}</div>
                    </div>
                    <div style={{ color: '#64748b', paddingBottom: 2, fontSize: 14 }}>➔</div>
                    <div>
                      <div style={{ fontSize: 10, color: '#10b981', marginBottom: 4 }}>PROJECTED</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{fc.forecastedValue.toFixed(2)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>ESTIMATED GAIN</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>
                        {((fc.forecastedValue - fc.currentValue) / (fc.currentValue || 1) * 100) > 0 ? '+' : ''}
                        {((fc.forecastedValue - fc.currentValue) / (fc.currentValue || 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Visual Confidence Bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 6 }}>
                      <span>Confidence Range</span>
                      <span>Lower: {fc.confidenceIntervalLower.toFixed(2)} | Upper: {fc.confidenceIntervalUpper.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: `${fc.confidenceIntervalLower * 100}%`,
                        right: `${(1 - fc.confidenceIntervalUpper) * 100}%`,
                        height: '100%',
                        background: 'rgba(16, 185, 129, 0.45)',
                        borderRadius: 3
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: `${fc.forecastedValue * 100}%`,
                        width: 4,
                        height: 10,
                        top: -2,
                        background: '#10b981',
                        borderRadius: 2
                      }} />
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <HelpCircle size={12} color="#475569" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{fc.uncertaintyDetails}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Timeline & Memory */}
          {activeTab === 'timeline' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 24, marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {timeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: 13 }}>No timeline history events recorded. Apply decisions to populate logs.</div>
                ) : timeline.map(e => (
                  <div key={e.id} style={{ position: 'relative' }}>
                    {/* Bullet marker */}
                    <div style={{
                      position: 'absolute', left: -30, top: 4, width: 10, height: 10, borderRadius: '50%',
                      background: e.type === 'DECISION' ? '#818cf8' : e.type === 'OUTCOME' ? '#10b981' : '#f59e0b',
                      border: '3px solid #070b0a'
                    }} />

                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{new Date(e.timestamp).toLocaleString()}</div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>{e.title}</h4>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{e.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
