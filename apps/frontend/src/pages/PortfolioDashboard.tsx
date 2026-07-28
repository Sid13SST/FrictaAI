import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Compass, ShieldCheck, Target, Award, Sparkles, Plus, RefreshCcw,
  GitBranch, GitCommit, GitMerge, AlertTriangle, ChevronRight, Eye,
  Info, ShieldAlert, BarChart2, DollarSign, Calendar, User, Database,
  Activity, ExternalLink, Award as BadgeCheck, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Legend
} from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AlignmentResult {
  initiativeId: string;
  initiativeTitle: string;
  objectiveId?: string;
  objectiveTitle?: string;
  kpiId?: string;
  kpiName?: string;
  outcomeId?: string;
  outcomeVerdict?: string;
  alignmentScore: number;
  status: 'ALIGNED' | 'MISALIGNED' | 'GAPPED';
  comments: string;
  evidenceCount: number;
}

interface StrategicGap {
  id: string;
  gapType: 'UNCOVERED_OBJECTIVE' | 'UNSUPPORTED_KPI' | 'NEGLECTED_COHORT' | 'HIGH_RISK_AREA';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  createdAt: string;
}

interface DependencyRecord {
  id: string;
  sourceInitiativeId: string;
  sourceInitiative: { id: string; title: string; riskScore: number; status: string; targetQuarter: string };
  targetInitiativeId: string;
  targetInitiative: { id: string; title: string; riskScore: number; status: string; targetQuarter: string };
  dependencyType: 'BLOCKING' | 'CONCURRENT' | 'SEQUENTIAL';
  status: 'ACTIVE' | 'RESOLVED' | 'RISK';
  riskScore: number;
}

interface InvestmentAllocation {
  id: string;
  category: 'R_D' | 'GROWTH' | 'MAINTAIN' | 'RISK_REDUCTION' | 'SECURITY';
  percentage: number;
  budgetAmount: number | null;
}

export function PortfolioDashboard() {
  const { user } = useUser();
  const [projectId, setProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'executive' | 'explorer' | 'gaps' | 'dependencies' | 'config'>('executive');

  // Page States
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [healthAverages, setHealthAverages] = useState<any>({ alignmentScore: 80, riskIndex: 15, coverageScore: 75, healthRating: 80 });
  const [alignments, setAlignments] = useState<AlignmentResult[]>([]);
  const [gaps, setGaps] = useState<StrategicGap[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRecord[]>([]);
  const [allocations, setAllocations] = useState<InvestmentAllocation[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('');

  // Dropdown selector helpers
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);

  // Modals & Form States
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [showLinkObjectiveModal, setShowLinkObjectiveModal] = useState(false);

  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: '',
    allocations: [
      { category: 'R_D', percentage: 35, budgetAmount: 140000 },
      { category: 'GROWTH', percentage: 40, budgetAmount: 160000 },
      { category: 'MAINTAIN', percentage: 10, budgetAmount: 40000 },
      { category: 'RISK_REDUCTION', percentage: 10, budgetAmount: 40000 },
      { category: 'SECURITY', percentage: 5, budgetAmount: 20000 }
    ] as any[]
  });

  const [dependencyForm, setDependencyForm] = useState({
    sourceInitiativeId: '',
    targetInitiativeId: '',
    dependencyType: 'BLOCKING'
  });

  const [linkObjForm, setLinkObjForm] = useState({
    portfolioId: '',
    objectiveId: ''
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
      // 1. Fetch evaluated portfolios first
      const portfoliosR = await fetch(`${API}/api/strategy/health?projectId=${projectId}`).then(r => r.json()).catch(() => ({ timeline: [] }));
      
      // Let's query portfolios from outcomes or strategy logs
      const kpisR = await fetch(`${API}/api/outcomes/kpis?projectId=${projectId}`).then(r => r.json()).catch(() => ({ kpis: [] }));
      
      // Load initiatives & objectives to choose in selectors
      const [initR, objR] = await Promise.all([
        fetch(`${API}/api/strategy/initiatives?projectId=${projectId}`).then(r => r.json()).catch(() => ({ initiatives: [] })),
        fetch(`${API}/api/strategy/objectives?projectId=${projectId}`).then(r => r.json()).catch(() => ({ objectives: [] }))
      ]);
      setInitiatives(initR.initiatives || []);
      setObjectives(objR.objectives || []);

      // Fetch Portfolio Intelligence API
      const [healthR, alignmentsR, dependenciesR, risksR, execR] = await Promise.all([
        fetch(`${API}/api/portfolio/health?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/portfolio/alignment?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/portfolio/dependencies?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/portfolio/risks?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/portfolio/executive?projectId=${projectId}`).then(r => r.json())
      ]);

      setHealthHistory(healthR.history || []);
      setHealthAverages(healthR.averages || { alignmentScore: 80, riskIndex: 15, coverageScore: 75, healthRating: 80 });
      setAlignments(alignmentsR.alignments || []);
      setDependencies(dependenciesR.dependencies || []);
      setGaps(risksR.gaps || []);
      setAllocations(execR.allocations || []);

      // Determine active portfolio id from allocations
      if (execR.allocations && execR.allocations.length > 0) {
        const portId = execR.allocations[0].portfolioId;
        setActivePortfolioId(portId);
        setLinkObjForm(prev => ({ ...prev, portfolioId: portId }));
      }
    } catch (err) {
      console.error('Failed to load portfolio intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Portfolio
  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          name: portfolioForm.name,
          description: portfolioForm.description,
          allocations: portfolioForm.allocations
        })
      });
      if (!res.ok) throw new Error('Failed to create portfolio definition.');
      alert('Product Portfolio created successfully!');
      setShowPortfolioModal(false);
      setPortfolioForm({
        name: '',
        description: '',
        allocations: [
          { category: 'R_D', percentage: 35, budgetAmount: 140000 },
          { category: 'GROWTH', percentage: 40, budgetAmount: 160000 },
          { category: 'MAINTAIN', percentage: 10, budgetAmount: 40000 },
          { category: 'RISK_REDUCTION', percentage: 10, budgetAmount: 40000 },
          { category: 'SECURITY', percentage: 5, budgetAmount: 20000 }
        ]
      });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Dependency Link
  const handleCreateDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dependencyForm.sourceInitiativeId === dependencyForm.targetInitiativeId) {
      alert('Source and target initiatives cannot be the same.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/portfolio/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          ...dependencyForm
        })
      });
      if (!res.ok) throw new Error('Failed to save dependency.');
      alert('Roadmap dependency link created!');
      setShowDependencyModal(false);
      setDependencyForm({ sourceInitiativeId: '', targetInitiativeId: '', dependencyType: 'BLOCKING' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Link Strategic Objective
  const handleLinkObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkObjForm.portfolioId || !linkObjForm.objectiveId) {
      alert('Select both portfolio and objective.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/portfolio/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          ...linkObjForm
        })
      });
      if (!res.ok) throw new Error('Failed to link objective.');
      alert('Objective successfully mapped to portfolio!');
      setShowLinkObjectiveModal(false);
      setLinkObjForm({ portfolioId: activePortfolioId, objectiveId: '' });
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger evaluation audit
  const handleTriggerEvaluation = async () => {
    if (!activePortfolioId) {
      alert('Create a portfolio first before executing evaluations.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/portfolio/alignment/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo_user' },
        body: JSON.stringify({
          projectId,
          portfolioId: activePortfolioId
        })
      });
      if (!res.ok) throw new Error('Evaluation audit failed.');
      alert('Portfolio alignment audit successfully completed!');
      await loadAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chart Color maps
  const ALLOCATION_COLORS: Record<string, string> = {
    R_D: '#a855f7',
    GROWTH: '#3b82f6',
    MAINTAIN: '#10b981',
    RISK_REDUCTION: '#f59e0b',
    SECURITY: '#ef4444'
  };

  const formattedAllocations = allocations.map(a => ({
    name: a.category.replace('_', ' '),
    value: a.percentage,
    amount: a.budgetAmount,
    color: ALLOCATION_COLORS[a.category] || '#6b7280'
  }));

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#050707', padding: '32px 36px', fontFamily: 'Inter, sans-serif', color: '#e5e7eb' }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .port-tab-container {
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
        .port-tab-btn {
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
        .port-tab-btn:hover {
          color: #d1d5db;
          background: rgba(255, 255, 255, 0.02);
        }
        .port-tab-btn.active {
          background: rgba(115, 66, 226, 0.12);
          color: #D9C6FB;
          border-color: rgba(115, 66, 226, 0.35);
          box-shadow: 0 0 12px rgba(115, 66, 226, 0.15);
        }
        .port-card {
          background: rgba(15, 23, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          transition: transform 0.2s, border-color 0.2s;
        }
        .port-card:hover {
          border-color: rgba(115, 66, 226, 0.3);
          transform: translateY(-2px);
        }
        .port-glass-panel {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 18px;
        }
        .port-btn-primary {
          background: linear-gradient(135deg, #7342E2 0%, #5C2FC2 100%);
          border: none;
          color: #ffffff;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(115, 66, 226, 0.3);
          transition: opacity 0.2s;
        }
        .port-btn-primary:hover {
          opacity: 0.9;
        }
        .port-btn-secondary {
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
        .port-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #f3f4f6;
        }
        .port-badge {
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
        .status-aligned {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-misaligned {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .status-gapped {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .custom-tooltip {
          background: #0d0f0f;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 10px 12px;
          border-radius: 8px;
        }
      ` }} />

      {/* Header Panel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(115, 66, 226, 0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(115, 66, 226, 0.25)' }}>
              <GitMerge size={22} color="#7342E2" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>Portfolio Intelligence Center</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>Map and monitor strategic alignment, roadmap dependencies, risks, and allocations</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadAll} disabled={loading} className="port-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />Sync Dashboard
            </button>
            <button onClick={() => setShowPortfolioModal(true)} className="port-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />Define Portfolio
            </button>
            <button onClick={handleTriggerEvaluation} className="port-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} />Run Alignment Audit
            </button>
          </div>
        </div>
      </div>

      {/* Governance Banner */}
      <div className="port-glass-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(115, 66, 226, 0.03)', borderColor: 'rgba(115, 66, 226, 0.15)', marginBottom: 24 }}>
        <ShieldCheck size={20} color="#7342E2" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#D9C6FB', display: 'block' }}>Advisory Strategic Radar & Alignment Boundary</span>
          <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: '1.5', marginTop: 3, display: 'block' }}>
            Fricta highlights strategic gaps, dependency risks, and concentration metrics, but does not perform autonomous mutations to priority sequences or resource staffing. All organizational decisions and roadmap alterations remain under direct human supervision.
          </span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="port-tab-container">
        <button onClick={() => setActiveTab('executive')} className={`port-tab-btn ${activeTab === 'executive' ? 'active' : ''}`}>
          <BarChart2 size={14} />Executive Portfolio Console
        </button>
        <button onClick={() => setActiveTab('explorer')} className={`port-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}>
          <Compass size={14} />Alignment Explorer
        </button>
        <button onClick={() => setActiveTab('gaps')} className={`port-tab-btn ${activeTab === 'gaps' ? 'active' : ''}`}>
          <ShieldAlert size={14} />Strategic Gap Viewer
        </button>
        <button onClick={() => setActiveTab('dependencies')} className={`port-tab-btn ${activeTab === 'dependencies' ? 'active' : ''}`}>
          <GitBranch size={14} />Dependency Graph Center
        </button>
        <button onClick={() => setActiveTab('config')} className={`port-tab-btn ${activeTab === 'config' ? 'active' : ''}`}>
          <Target size={14} />Executive Config
        </button>
      </div>

      {/* ── Tab: Executive Portfolio Console ────────────────────────────────────── */}
      {activeTab === 'executive' && (
        <div>
          {/* Health index card rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <div className="port-card" style={{ borderLeft: '4px solid #7342E2' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Portfolio Health Rating</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.healthRating.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Composite index rating</p>
            </div>
            <div className="port-card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Alignment Score</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.alignmentScore.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Aligned initiatives percentage</p>
            </div>
            <div className="port-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Objective Coverage</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.coverageScore.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Mapped strategic objectives</p>
            </div>
            <div className="port-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Propagated Risk Index</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', margin: '6px 0 2px 0' }}>{healthAverages.riskIndex.toFixed(1)}%</div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Roadmap blocking probability</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 28 }}>
            {/* Health Snapshot Graph */}
            <div className="port-card" style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700 }}>Portfolio Alignment & Coverage Trends</h3>
              <div style={{ flex: 1, width: '100%', height: '100%' }}>
                {healthHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="95%">
                    <BarChart
                      data={healthHistory.map(snap => ({
                        ...snap,
                        recordedAt: new Date(snap.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      })).reverse()}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <XAxis dataKey="recordedAt" stroke="#4b5563" fontSize={9} />
                      <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={9} />
                      <Tooltip contentStyle={{ background: '#090d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                      <Bar name="Health Rating" dataKey="healthRating" fill="#7342E2" radius={[4, 4, 0, 0]} />
                      <Bar name="Coverage Score" dataKey="coverageScore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Alignment Score" dataKey="alignmentScore" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>
                    Not enough trend snapshots recorded. Run alignment audits to log snapshots.
                  </div>
                )}
              </div>
            </div>

            {/* Allocation pie chart */}
            <div className="port-card" style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>Investment Allocation Distribution</h3>
              <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {formattedAllocations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="95%">
                    <PieChart>
                      <Pie
                        data={formattedAllocations}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {formattedAllocations.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="custom-tooltip">
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff' }}>{data.name}</p>
                              <p style={{ margin: '4px 0 0 0', fontSize: 10, color: '#9ca3af' }}>Allocation: {data.value}%</p>
                              {data.amount && <p style={{ margin: '2px 0 0 0', fontSize: 10, color: '#7342E2' }}>Budget: ${data.amount.toLocaleString()}</p>}
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>
                    No budget allocations configured. Define allocations in Executive Config.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Alignment Explorer ────────────────────────────────────────────── */}
      {activeTab === 'explorer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="port-glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700 }}>Evidence-Backed Priority Alignment Mappings</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Verify that product roadmaps map cleanly to active outcomes, target KPIs, and inspectable telemetry session logs.</p>
            </div>
            <button onClick={handleTriggerEvaluation} className="port-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCcw size={12} />Re-audit Alignment
            </button>
          </div>

          {alignments.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)' }}>
              <Compass size={32} color="#6b7280" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>No alignment mapping records found.</p>
              <button onClick={handleTriggerEvaluation} className="port-btn-primary" style={{ marginTop: 12 }}>Calculate Alignment Map</button>
            </div>
          ) : (
            alignments.map((align, idx) => (
              <div key={idx} className="port-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <span className={`port-badge ${align.status === 'ALIGNED' ? 'status-aligned' : align.status === 'GAPPED' ? 'status-gapped' : 'status-misaligned'}`}>
                      {align.status}
                    </span>
                    <h3 style={{ margin: '8px 0 2px 0', fontSize: 15, fontWeight: 800, color: '#f3f4f6' }}>{align.initiativeTitle}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#f3f4f6' }}>{align.alignmentScore}%</span>
                    <p style={{ margin: 0, fontSize: 9, color: '#6b7280' }}>Alignment Score</p>
                  </div>
                </div>

                {/* Alignment trace map */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 12, fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <GitCommit size={12} color="#7342E2" />
                    <span style={{ color: '#9ca3af' }}>Initiative:</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{align.initiativeTitle}</span>
                  </div>
                  <ChevronRight size={10} color="#4b5563" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Target size={12} color="#ef4444" />
                    <span style={{ color: '#9ca3af' }}>Objective:</span>
                    <span style={{ color: align.objectiveTitle ? '#fff' : '#ef4444', fontWeight: 600 }}>{align.objectiveTitle || 'MISSING'}</span>
                  </div>
                  <ChevronRight size={10} color="#4b5563" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Activity size={12} color="#3b82f6" />
                    <span style={{ color: '#9ca3af' }}>KPI key:</span>
                    <span style={{ color: align.kpiName ? '#fff' : '#f59e0b', fontWeight: 600 }}>{align.kpiName || 'UNLINKED'}</span>
                  </div>
                  <ChevronRight size={10} color="#4b5563" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Award size={12} color="#10b981" />
                    <span style={{ color: '#9ca3af' }}>Outcome:</span>
                    <span style={{ color: align.outcomeId ? '#10b981' : '#6b7280', fontWeight: 600 }}>{align.outcomeVerdict || 'PENDING'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 12, fontSize: 11 }}>
                  <span style={{ color: '#9ca3af' }}>{align.comments}</span>
                  {align.evidenceCount > 0 && (
                    <a href={`/app/outcome-intelligence`} className="port-btn-secondary" style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Inspect Outcome Trace <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Strategic Gap Viewer ─────────────────────────────────────────── */}
      {activeTab === 'gaps' && (
        <div>
          <div className="port-glass-panel" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: 18, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#f3f4f6' }}>Strategic Gap Analysis</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: '1.5' }}>
              Strategic Radar automatically scans objectives and telemetry, highlighting uncovered target goals or unmitigated risk areas. This visibility helps align investments with user priorities.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {gaps.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 12 }}>
                No active strategic gaps detected. The portfolio currently covers all active goals.
              </div>
            ) : (
              gaps.map(gap => (
                <div key={gap.id} className="port-card" style={{ borderLeft: `4px solid ${gap.severity === 'CRITICAL' ? '#ef4444' : gap.severity === 'HIGH' ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="port-badge status-misaligned" style={{ background: gap.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: gap.severity === 'CRITICAL' ? '#f87171' : '#fbbf24', border: '1px solid currentColor' }}>
                        {gap.gapType.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: 10, color: '#6b7280' }}>Logged at {new Date(gap.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: gap.severity === 'CRITICAL' ? '#f87171' : '#fbbf24' }}>{gap.severity} Priority</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>{gap.title}</h4>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', lineHeight: '1.4' }}>{gap.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Dependency Graph Center ──────────────────────────────────────── */}
      {activeTab === 'dependencies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="port-glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700 }}>Initiative Dependency & Propagated Risks</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Analyze blocking dependencies and map risk scores propagated across active quarterly sequences.</p>
            </div>
            <button onClick={() => setShowDependencyModal(true)} className="port-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />Add Dependency Link
            </button>
          </div>

          {dependencies.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 12 }}>
              No roadmap dependencies linked.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {dependencies.map(dep => (
                <div key={dep.id} className="port-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span className="port-badge status-gapped" style={{ fontSize: 9, padding: '2px 6px', color: '#9B72FA', background: 'rgba(155, 114, 250, 0.1)', borderColor: 'rgba(155,114,250,0.2)' }}>
                        {dep.dependencyType}
                      </span>
                      <h4 style={{ margin: '8px 0 2px 0', fontSize: 13, fontWeight: 700 }}>Blocking Trace Mapped</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: dep.riskScore > 50 ? '#f87171' : '#34d399' }}>
                        {dep.riskScore.toFixed(0)}%
                      </span>
                      <p style={{ margin: 0, fontSize: 8, color: '#6b7280' }}>Risk Index</p>
                    </div>
                  </div>

                  {/* Flow card trace */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, fontSize: 10, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Source Blocker:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{dep.sourceInitiative.title} ({dep.sourceInitiative.targetQuarter})</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Blocked Target:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{dep.targetInitiative.title} ({dep.targetInitiative.targetQuarter})</span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                    {dep.riskScore > 50 
                      ? '⚠️ High risk propagation. Delay in the source blocker initiative blocks target roadmap sequence.'
                      : '✓ Low risk path. Source initiative scheduling matches target sequence limits.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Executive Config ────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="port-glass-panel" style={{ height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800 }}>Portfolio Management</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: 11, color: '#6b7280' }}>Create high-level portfolios grouping organizational objectives and budget allocations.</p>
            <button onClick={() => setShowPortfolioModal(true)} className="port-btn-primary" style={{ width: '100%', marginBottom: 12 }}>Define New Portfolio</button>
            <button onClick={() => setShowLinkObjectiveModal(true)} className="port-btn-secondary" style={{ width: '100%' }}>Link Objective to Portfolio</button>
          </div>

          <div className="port-glass-panel" style={{ height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800 }}>Roadmap Sequence Mapping</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: 11, color: '#6b7280' }}>Configure dependencies between initiatives to compute propagated risk indices across quarters.</p>
            <button onClick={() => setShowDependencyModal(true)} className="port-btn-primary" style={{ width: '100%' }}>Map Roadmap Dependency</button>
          </div>
        </div>
      )}

      {/* ── Modal: Define Portfolio ───────────────────────────────────────────── */}
      {showPortfolioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="port-card" style={{ width: '100%', maxWidth: 500, background: '#0a0d0d', border: '1px solid rgba(115, 66, 226, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Define New Portfolio</h3>
            
            <form onSubmit={handleCreatePortfolio} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Portfolio Name</label>
                <input required type="text" value={portfolioForm.name} onChange={e => setPortfolioForm({...portfolioForm, name: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }} placeholder="e.g. Core Experience Portfolio" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Description</label>
                <textarea required value={portfolioForm.description} onChange={e => setPortfolioForm({...portfolioForm, description: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, height: 60 }} placeholder="Strategic scope of this portfolio grouping..." />
              </div>

              {/* Investment allocation form rows */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>Budget allocations (%)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {portfolioForm.allocations.map((alloc, idx) => (
                    <div key={alloc.category} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 600 }}>{alloc.category.replace('_', ' ')}</span>
                      <input type="number" value={alloc.percentage} onChange={e => {
                        const next = [...portfolioForm.allocations];
                        next[idx].percentage = parseFloat(e.target.value) || 0;
                        setPortfolioForm({ ...portfolioForm, allocations: next });
                      }} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 11 }} placeholder="%" />
                      <input type="number" value={alloc.budgetAmount} onChange={e => {
                        const next = [...portfolioForm.allocations];
                        next[idx].budgetAmount = parseFloat(e.target.value) || 0;
                        setPortfolioForm({ ...portfolioForm, allocations: next });
                      }} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 11 }} placeholder="Budget ($)" />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowPortfolioModal(false)} className="port-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="port-btn-primary">Create Portfolio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Link Strategic Objective ──────────────────────────────────── */}
      {showLinkObjectiveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="port-card" style={{ width: '100%', maxWidth: 450, background: '#0a0d0d', border: '1px solid rgba(115, 66, 226, 0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Link Strategic Objective</h3>
            
            <form onSubmit={handleLinkObjective} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Strategic Objective</label>
                <select required value={linkObjForm.objectiveId} onChange={e => setLinkObjForm({...linkObjForm, objectiveId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose Objective --</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowLinkObjectiveModal(false)} className="port-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="port-btn-primary">Link Objective</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Link Dependency ───────────────────────────────────────────── */}
      {showDependencyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="port-card" style={{ width: '100%', maxWidth: 460, background: '#0a0d0d', border: '1px solid rgba(115, 66, 226, 0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Link Roadmap Dependency</h3>
            
            <form onSubmit={handleCreateDependency} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Source Blocker Initiative</label>
                <select required value={dependencyForm.sourceInitiativeId} onChange={e => setDependencyForm({...dependencyForm, sourceInitiativeId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose Initiative --</option>
                  {initiatives.map(init => (
                    <option key={init.id} value={init.id}>{init.title} ({init.targetQuarter})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Target Blocked Initiative</label>
                <select required value={dependencyForm.targetInitiativeId} onChange={e => setDependencyForm({...dependencyForm, targetInitiativeId: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="">-- Choose Initiative --</option>
                  {initiatives.map(init => (
                    <option key={init.id} value={init.id}>{init.title} ({init.targetQuarter})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>Link Relation Type</label>
                <select required value={dependencyForm.dependencyType} onChange={e => setDependencyForm({...dependencyForm, dependencyType: e.target.value})} style={{ width: '100%', background: '#0a0d0d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                  <option value="BLOCKING">BLOCKING</option>
                  <option value="SEQUENTIAL">SEQUENTIAL</option>
                  <option value="CONCURRENT">CONCURRENT</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowDependencyModal(false)} className="port-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="port-btn-primary">Register Dependency</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Obsidian HSL premium theme and responsive tabs styling config.
