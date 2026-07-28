import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  FlaskConical, TrendingUp, Brain, Target, CheckCircle2, XCircle,
  AlertTriangle, Clock, ChevronRight, Plus, Play, BarChart3,
  BookOpen, Lightbulb, Shield, Activity, Minus, RotateCcw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: string;
  targetMetric: string;
  targetWorkflow?: string;
  evaluationWindow: number;
  startedAt?: string;
  concludedAt?: string;
  createdAt: string;
  hypothesis?: Hypothesis;
  variants?: Variant[];
  outcomes?: Outcome[];
  baselines?: Baseline[];
}

interface Hypothesis {
  id: string;
  problemStatement: string;
  expectedImprovement: string;
  measurementStrategy: string;
  riskAssessment: string;
  successThreshold: number;
}

interface Variant {
  id: string;
  name: string;
  isControl: boolean;
  description: string;
  changeType: string;
}

interface Outcome {
  id: string;
  conclusion: string;
  confidenceScore: number;
  baselineMetricValue: number;
  outcomeMetricValue: number;
  deltaPercent: number;
  unexpectedEffects?: string;
}

interface Baseline {
  id: string;
  metricName: string;
  baselineValue: number;
  capturedAt: string;
  scopeKey?: string;
}

interface Impact {
  id: string;
  title: string;
  description: string;
  recommendationType: string;
  adoptionStatus: string;
  verificationStatus: string;
  survivabilityDelta?: number;
  frictionDelta?: number;
  adoptedAt?: string;
}

interface MemoryEntry {
  id: string;
  patternKey: string;
  patternSummary: string;
  memoryType: string;
  outcomeType: string;
  metricImpacted: string;
  deltaAchieved?: number;
  createdAt: string;
}

interface MemorySummary {
  total: number;
  successes: number;
  failures: number;
  partial: number;
  successRate: number;
  averageDeltaAchieved: number;
  topImpactedMetrics: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  DRAFT:     'rgba(100,116,139,0.2)',
  ACTIVE:    'rgba(16,185,129,0.15)',
  PAUSED:    'rgba(234,179,8,0.15)',
  COMPLETED: 'rgba(115,66,226,0.15)',
  ABANDONED: 'rgba(239,68,68,0.1)',
};
const statusText: Record<string, string> = {
  DRAFT: '#94a3b8', ACTIVE: '#10b981', PAUSED: '#eab308', COMPLETED: '#9B72FA', ABANDONED: '#ef4444',
};

const conclusionIcon = (c: string) => {
  if (c === 'IMPROVED')   return <CheckCircle2 size={14} color="#10b981" />;
  if (c === 'REGRESSED')  return <XCircle size={14} color="#ef4444" />;
  if (c === 'NEUTRAL')    return <Minus size={14} color="#94a3b8" />;
  return <AlertTriangle size={14} color="#eab308" />;
};

const deltaColor = (d: number) => d > 0 ? '#10b981' : d < 0 ? '#ef4444' : '#94a3b8';

// ─── New Experiment Modal ─────────────────────────────────────────────────────

function NewExperimentModal({ projectId, onClose, onCreated }: {
  projectId: string; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', description: '', targetMetric: 'rage_click_rate', targetWorkflow: '', evaluationWindowDays: 14,
  });
  const [loading, setLoading] = useState(false);

  const metrics = [
    'rage_click_rate', 'abandonment_rate', 'form_completion_rate',
    'onboarding_survivability', 'checkout_survivability', 'workflow_survivability',
    'friction_score', 'hesitation_score',
  ];

  const handleSubmit = async () => {
    // Ensure we have a projectId before attempting to create
    if (!projectId) {
      alert('Project not loaded yet – please wait for the workspace to initialise.');
      return;
    }
    if (!form.name.trim()) {
      alert('Please enter an experiment name.');
      return;
    }
    if (!form.description.trim()) {
      alert('Please enter a description.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/optimization/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${response.status}`);
      }
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create experiment:', err);
      alert(`Failed to create experiment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#0f1117',border:'1px solid rgba(115,66,226,0.25)',borderRadius:16,padding:32,width:520,maxHeight:'85vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:24 }}>
          <FlaskConical size={20} color="#9B72FA" />
          <span style={{ color:'#e2e8f0',fontWeight:700,fontSize:16 }}>New UX Experiment</span>
        </div>

        {[
          { label:'Experiment Name', key:'name', type:'text', placeholder:'e.g. Reduce checkout rage clicks' },
          { label:'Description', key:'description', type:'text', placeholder:'What are you testing and why?' },
          { label:'Target Workflow', key:'targetWorkflow', type:'text', placeholder:'e.g. checkout_flow (optional)' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:16 }}>
            <label style={{ display:'block',fontSize:11,color:'#64748b',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase' }}>{f.label}</label>
            <input
              value={(form as any)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 14px',color:'#e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block',fontSize:11,color:'#64748b',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase' }}>Target Metric</label>
          <select
            value={form.targetMetric}
            onChange={e => setForm(p => ({ ...p, targetMetric: e.target.value }))}
            style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 14px',color:'#e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box' }}
          >
            {metrics.map(m => <option key={m} value={m} style={{ background:'#0f1117' }}>{m}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block',fontSize:11,color:'#64748b',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase' }}>Evaluation Window (days)</label>
          <input
            type="number" min={1} max={90}
            value={form.evaluationWindowDays}
            onChange={e => setForm(p => ({ ...p, evaluationWindowDays: parseInt(e.target.value) || 14 }))}
            style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 14px',color:'#e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box' }}
          />
        </div>

        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px 0',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex:2,padding:'10px 0',borderRadius:8,border:'none',background:'rgba(115,66,226,0.85)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,opacity:loading?0.6:1 }}>
            {loading ? 'Creating…' : 'Create Experiment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Experiment Card ──────────────────────────────────────────────────────────

function ExperimentCard({ exp, onClick }: { exp: Experiment; onClick: () => void }) {
  const latestOutcome = exp.outcomes?.[0];
  return (
    <button onClick={onClick} style={{
      width:'100%',textAlign:'left',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',
      borderRadius:12,padding:20,cursor:'pointer',transition:'all 0.2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(115,66,226,0.3)'; (e.currentTarget as HTMLElement).style.background='rgba(115,66,226,0.04)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'; }}
    >
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
        <span style={{ color:'#e2e8f0',fontWeight:600,fontSize:13 }}>{exp.name}</span>
        <span style={{ padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:'0.06em',background:statusColor[exp.status],color:statusText[exp.status] }}>
          {exp.status}
        </span>
      </div>
      <p style={{ color:'#64748b',fontSize:11,marginBottom:12,lineHeight:1.5 }}>{exp.description}</p>
      <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
        <span style={{ fontSize:10,color:'#475569' }}>📊 {exp.targetMetric}</span>
        <span style={{ fontSize:10,color:'#475569' }}>⏱ {exp.evaluationWindow}d window</span>
        {exp.variants && <span style={{ fontSize:10,color:'#475569' }}>🧪 {exp.variants.length} variant{exp.variants.length !== 1 ? 's' : ''}</span>}
        {latestOutcome && (
          <span style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:deltaColor(latestOutcome.deltaPercent) }}>
            {conclusionIcon(latestOutcome.conclusion)} {latestOutcome.deltaPercent > 0 ? '+' : ''}{latestOutcome.deltaPercent.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Experiment Detail Panel ──────────────────────────────────────────────────

function ExperimentDetail({ exp, onClose }: { exp: Experiment; onClose: () => void }) {
  const latestOutcome = exp.outcomes?.[0];

  return (
    <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(115,66,226,0.2)',borderRadius:12,padding:24 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <FlaskConical size={16} color="#9B72FA" />
          <span style={{ color:'#e2e8f0',fontWeight:700,fontSize:14 }}>{exp.name}</span>
        </div>
        <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#475569',cursor:'pointer',fontSize:18,lineHeight:1 }}>×</button>
      </div>

      {/* Hypothesis */}
      {exp.hypothesis && (
        <div style={{ background:'rgba(115,66,226,0.06)',borderRadius:10,padding:16,marginBottom:16,border:'1px solid rgba(115,66,226,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10 }}>
            <Lightbulb size={13} color="#9B72FA" />
            <span style={{ fontSize:11,color:'#9B72FA',fontWeight:700,letterSpacing:'0.06em' }}>HYPOTHESIS</span>
          </div>
          <p style={{ fontSize:12,color:'#cbd5e1',marginBottom:8,lineHeight:1.6 }}><strong style={{ color:'#94a3b8' }}>Problem:</strong> {exp.hypothesis.problemStatement}</p>
          <p style={{ fontSize:12,color:'#cbd5e1',marginBottom:8,lineHeight:1.6 }}><strong style={{ color:'#94a3b8' }}>Expected:</strong> {exp.hypothesis.expectedImprovement}</p>
          <p style={{ fontSize:12,color:'#cbd5e1',marginBottom:8,lineHeight:1.6 }}><strong style={{ color:'#94a3b8' }}>Measurement:</strong> {exp.hypothesis.measurementStrategy}</p>
          <p style={{ fontSize:12,color:'#cbd5e1',lineHeight:1.6 }}><strong style={{ color:'#f87171' }}>Risk:</strong> {exp.hypothesis.riskAssessment}</p>
        </div>
      )}

      {/* Variants */}
      {exp.variants && exp.variants.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <span style={{ fontSize:11,color:'#64748b',letterSpacing:'0.06em',fontWeight:700 }}>VARIANTS</span>
          <div style={{ display:'flex',flexDirection:'column',gap:6,marginTop:8 }}>
            {exp.variants.map(v => (
              <div key={v.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:10,padding:'2px 6px',borderRadius:4,background:v.isControl?'rgba(100,116,139,0.2)':'rgba(16,185,129,0.15)',color:v.isControl?'#94a3b8':'#10b981',fontWeight:700 }}>
                  {v.isControl ? 'CONTROL' : 'VARIANT'}
                </span>
                <span style={{ fontSize:12,color:'#cbd5e1',fontWeight:600 }}>{v.name}</span>
                <span style={{ fontSize:11,color:'#64748b' }}>{v.description}</span>
                <span style={{ marginLeft:'auto',fontSize:10,color:'#475569' }}>{v.changeType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Outcome */}
      {latestOutcome && (
        <div style={{ background:'rgba(16,185,129,0.05)',borderRadius:10,padding:16,border:'1px solid rgba(16,185,129,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10 }}>
            <BarChart3 size={13} color="#10b981" />
            <span style={{ fontSize:11,color:'#10b981',fontWeight:700,letterSpacing:'0.06em' }}>LATEST OUTCOME</span>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
            {[
              { label:'Conclusion', value: <span style={{ display:'flex',alignItems:'center',gap:4 }}>{conclusionIcon(latestOutcome.conclusion)}<span>{latestOutcome.conclusion}</span></span> },
              { label:'Confidence', value: `${(latestOutcome.confidenceScore*100).toFixed(0)}%` },
              { label:'Baseline', value: latestOutcome.baselineMetricValue.toFixed(3) },
              { label:'Delta', value: <span style={{ color:deltaColor(latestOutcome.deltaPercent) }}>{latestOutcome.deltaPercent > 0 ? '+' : ''}{latestOutcome.deltaPercent.toFixed(1)}%</span> },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize:10,color:'#475569',marginBottom:4,letterSpacing:'0.06em' }}>{m.label}</div>
                <div style={{ fontSize:13,color:'#e2e8f0',fontWeight:600 }}>{m.value}</div>
              </div>
            ))}
          </div>
          {latestOutcome.unexpectedEffects && (
            <div style={{ marginTop:12,padding:'8px 12px',background:'rgba(234,179,8,0.1)',borderRadius:8,fontSize:11,color:'#eab308' }}>
              ⚠ Unexpected effects: {latestOutcome.unexpectedEffects}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Optimization Memory Explorer ─────────────────────────────────────────────

function MemoryExplorer({ memory, summary }: { memory: MemoryEntry[]; summary?: MemorySummary }) {
  if (!summary) return null;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24 }}>
        {[
          { label:'Total Patterns', value: summary.total, color:'#9B72FA' },
          { label:'Successful', value: summary.successes, color:'#10b981' },
          { label:'Failed', value: summary.failures, color:'#ef4444' },
          { label:'Success Rate', value: `${summary.successRate.toFixed(0)}%`, color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,color:'#475569',marginBottom:6,letterSpacing:'0.06em' }}>{s.label}</div>
            <div style={{ fontSize:22,fontWeight:700,color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Memory entries */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {memory.length === 0 ? (
          <div style={{ textAlign:'center',padding:40,color:'#475569',fontSize:13 }}>No optimization memory yet. Complete experiments to build organizational learning.</div>
        ) : memory.map(m => (
          <div key={m.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:14 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
              <span style={{ fontSize:12,color:'#e2e8f0',fontWeight:600 }}>{m.patternSummary}</span>
              <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:m.outcomeType==='SUCCESS'?'rgba(16,185,129,0.15)':m.outcomeType==='FAILURE'?'rgba(239,68,68,0.1)':'rgba(234,179,8,0.1)',color:m.outcomeType==='SUCCESS'?'#10b981':m.outcomeType==='FAILURE'?'#ef4444':'#eab308',fontWeight:700 }}>
                {m.outcomeType}
              </span>
            </div>
            <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
              <span style={{ fontSize:10,color:'#475569' }}>📊 {m.metricImpacted}</span>
              <span style={{ fontSize:10,color:'#475569' }}>🔑 {m.patternKey}</span>
              {m.deltaAchieved !== null && m.deltaAchieved !== undefined && (
                <span style={{ fontSize:10,color:deltaColor(m.deltaAchieved) }}>Δ {m.deltaAchieved > 0 ? '+' : ''}{m.deltaAchieved.toFixed(1)}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Impact Tracker ───────────────────────────────────────────────────────────

function ImpactTracker({ impacts }: { impacts: Impact[] }) {
  const vStatusColor: Record<string, string> = {
    UNVERIFIED: '#94a3b8',
    VERIFIED_IMPROVED: '#10b981',
    VERIFIED_NEUTRAL: '#64748b',
    VERIFIED_REGRESSED: '#ef4444',
  };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      {impacts.length === 0 ? (
        <div style={{ textAlign:'center',padding:40,color:'#475569',fontSize:13 }}>No recommendation impacts tracked yet. Start by marking a recommendation as adopted.</div>
      ) : impacts.map(imp => (
        <div key={imp.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:16 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8 }}>
            <div>
              <span style={{ fontSize:13,color:'#e2e8f0',fontWeight:600,display:'block',marginBottom:4 }}>{imp.title}</span>
              <span style={{ fontSize:11,color:'#64748b' }}>{imp.description}</span>
            </div>
            <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4 }}>
              <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(115,66,226,0.15)',color:'#9B72FA',fontWeight:700 }}>{imp.adoptionStatus}</span>
              <span style={{ fontSize:10,color:vStatusColor[imp.verificationStatus] }}>{imp.verificationStatus.replace('VERIFIED_','')}</span>
            </div>
          </div>
          <div style={{ display:'flex',gap:16 }}>
            {imp.survivabilityDelta !== null && imp.survivabilityDelta !== undefined && (
              <span style={{ fontSize:11,color:deltaColor(imp.survivabilityDelta) }}>Survivability Δ {imp.survivabilityDelta > 0 ? '+' : ''}{(imp.survivabilityDelta * 100).toFixed(1)}%</span>
            )}
            {imp.frictionDelta !== null && imp.frictionDelta !== undefined && (
              <span style={{ fontSize:11,color:deltaColor(-imp.frictionDelta) }}>Friction Δ {imp.frictionDelta > 0 ? '+' : ''}{(imp.frictionDelta * 100).toFixed(1)}%</span>
            )}
            <span style={{ fontSize:10,color:'#475569',marginLeft:'auto' }}>{imp.recommendationType}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OptimizationLab() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'experiments' | 'hypotheses' | 'outcomes' | 'impact' | 'memory'>('experiments');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | undefined>();
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
  const [showNewExp, setShowNewExp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string>('');

  // Load project and data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) {
          headers['x-user-id'] = user.id;
        }
        const res = await fetch(`${API}/api/projects`, { headers });
        const data = await res.json();
        // Support both { projects: [...] } and raw array formats
        const projectsList = data.projects || data;
        const pid = projectsList?.[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
        setProjectId(pid);
      } catch (err) {
        console.error('Failed to fetch projects, falling back to default:', err);
        setProjectId('56b8722a-c7c4-47db-a855-b5d3e0ad32cb');
      }
    };
    fetchProject();
  }, [user]);

  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [expR, hypR, outR, impR, memR] = await Promise.all([
        fetch(`${API}/api/optimization/experiments?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/optimization/hypotheses?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/optimization/outcomes?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/optimization/impact?projectId=${projectId}`).then(r => r.json()),
        fetch(`${API}/api/optimization/memory?projectId=${projectId}`).then(r => r.json()),
      ]);
      setExperiments(expR.experiments ?? []);
      setHypotheses(hypR.hypotheses ?? []);
      setOutcomes(outR.outcomes ?? []);
      setImpacts(impR.impacts ?? []);
      setMemory(memR.memory ?? []);
      setMemorySummary(memR.summary);
    } catch {
      // handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label:'Active Experiments', value: experiments.filter(e => e.status === 'ACTIVE').length, icon: FlaskConical, color:'#10b981' },
    { label:'Completed', value: experiments.filter(e => e.status === 'COMPLETED').length, icon: CheckCircle2, color:'#9B72FA' },
    { label:'Hypotheses Built', value: hypotheses.length, icon: Lightbulb, color:'#f59e0b' },
    { label:'Outcomes Recorded', value: outcomes.length, icon: BarChart3, color:'#06b6d4' },
    { label:'Impacts Tracked', value: impacts.length, icon: Target, color:'#a78bfa' },
    { label:'Memory Patterns', value: memory.length, icon: Brain, color:'#34d399' },
  ];

  const tabs = [
    { key: 'experiments', label: 'Experiment Lab', icon: FlaskConical },
    { key: 'hypotheses', label: 'Hypotheses', icon: Lightbulb },
    { key: 'outcomes', label: 'Outcome Center', icon: BarChart3 },
    { key: 'impact', label: 'Impact Tracker', icon: Target },
    { key: 'memory', label: 'Optimization Memory', icon: Brain },
  ] as const;

  return (
    <div style={{ height:'100%',overflowY:'auto',background:'#070b0a',padding:'32px 36px',fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:36,height:36,background:'rgba(115,66,226,0.12)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(115,66,226,0.25)' }}>
              <FlaskConical size={18} color="#9B72FA" />
            </div>
            <div>
              <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:'#f1f5f9',letterSpacing:'-0.02em' }}>Optimization Lab</h1>
              <p style={{ margin:0,fontSize:12,color:'#475569',marginTop:2 }}>Continuous UX Experimentation & Optimization Intelligence</p>
            </div>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={loadAll} disabled={loading} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)',color:'#64748b',cursor:'pointer',fontSize:12 }}>
              <RotateCcw size={12} />Refresh
            </button>
            <button onClick={() => setShowNewExp(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'none',background:'rgba(115,66,226,0.85)',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600 }}>
              <Plus size={13} />New Experiment
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:14 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
              <s.icon size={12} color={s.color} />
              <span style={{ fontSize:9,color:'#475569',letterSpacing:'0.06em',fontWeight:700,textTransform:'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scoped CSS for premium tab switching transitions */}
      <style dangerouslySetInnerHTML={{ __html: `
        .opt-tab-container {
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
        .opt-tab-btn {
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
        .opt-tab-btn:hover {
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.03);
        }
        .opt-tab-btn:active {
          transform: scale(0.97);
        }
        .opt-tab-btn.active {
          background: rgba(115, 66, 226, 0.12);
          color: #D9C6FB;
          border-color: rgba(115, 66, 226, 0.35);
          box-shadow: 0 0 16px rgba(115, 66, 226, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .opt-tab-icon {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .opt-tab-btn.active .opt-tab-icon {
          transform: scale(1.18);
        }
      ` }} />

      {/* Tabs */}
      <div className="opt-tab-container">
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          const activeColors: Record<string, string> = {
            experiments: '#9B72FA',
            hypotheses: '#fbbf24',
            outcomes: '#22d3ee',
            impact: '#f472b6',
            memory: '#34d399',
          };
          const iconColor = isActive ? activeColors[t.key] : '#475569';
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`opt-tab-btn ${isActive ? 'active' : ''}`}
            >
              <t.icon size={13} color={iconColor} className="opt-tab-icon" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'experiments' && (
        <div style={{ display:'grid',gridTemplateColumns: selectedExp ? '1fr 1fr' : '1fr',gap:16 }}>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {loading && <div style={{ textAlign:'center',padding:40,color:'#475569' }}>Loading experiments…</div>}
            {!loading && experiments.length === 0 && (
              <div style={{ textAlign:'center',padding:60,color:'#475569',fontSize:13 }}>
                No experiments yet. Start by creating your first UX experiment.
              </div>
            )}
            {experiments.map(exp => (
              <ExperimentCard
                key={exp.id}
                exp={exp}
                onClick={() => setSelectedExp(exp === selectedExp ? null : exp)}
              />
            ))}
          </div>
          {selectedExp && <ExperimentDetail exp={selectedExp} onClose={() => setSelectedExp(null)} />}
        </div>
      )}

      {activeTab === 'hypotheses' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {hypotheses.length === 0 ? (
            <div style={{ textAlign:'center',padding:60,color:'#475569',fontSize:13 }}>
              No hypotheses built yet. Create an experiment to begin hypothesis tracking.
            </div>
          ) : hypotheses.map((h: any) => (
            <div key={h.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:20 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                <Lightbulb size={14} color="#f59e0b" />
                <span style={{ fontSize:13,color:'#e2e8f0',fontWeight:700 }}>{h.experiment?.name ?? 'Unlinked Hypothesis'}</span>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                {[
                  { label:'Problem', text: h.problemStatement, color:'#94a3b8' },
                  { label:'Expected', text: h.expectedImprovement, color:'#10b981' },
                  { label:'Measurement', text: h.measurementStrategy, color:'#9B72FA' },
                  { label:'Risk', text: h.riskAssessment, color:'#ef4444' },
                ].map(f => (
                  <div key={f.label} style={{ background:'rgba(255,255,255,0.02)',borderRadius:8,padding:12 }}>
                    <div style={{ fontSize:10,color:'#475569',letterSpacing:'0.06em',fontWeight:700,marginBottom:4 }}>{f.label}</div>
                    <div style={{ fontSize:12,color:f.color,lineHeight:1.5 }}>{f.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10,display:'flex',gap:16 }}>
                <span style={{ fontSize:10,color:'#475569' }}>🎯 Threshold: {(h.successThreshold * 100).toFixed(0)}% improvement</span>
                <span style={{ fontSize:10,color:'#475569' }}>⏱ {h.evaluationWindow}d window</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'outcomes' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {outcomes.length === 0 ? (
            <div style={{ textAlign:'center',padding:60,color:'#475569',fontSize:13 }}>No outcomes recorded yet. Evaluate an active experiment to see results here.</div>
          ) : (outcomes as any[]).map((o: any) => (
            <div key={o.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  {conclusionIcon(o.conclusion)}
                  <span style={{ fontSize:13,color:'#e2e8f0',fontWeight:700 }}>{o.experiment?.name ?? 'Experiment'}</span>
                </div>
                <span style={{ fontSize:10,color:'#475569' }}>{new Date(o.evaluatedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10 }}>
                {[
                  { label:'Conclusion', value: o.conclusion, style: { color: o.conclusion==='IMPROVED'?'#10b981':o.conclusion==='REGRESSED'?'#ef4444':'#94a3b8' } },
                  { label:'Confidence', value: `${(o.confidenceScore * 100).toFixed(0)}%`, style: { color:'#9B72FA' } },
                  { label:'Baseline', value: o.baselineMetricValue.toFixed(3), style: { color:'#94a3b8' } },
                  { label:'Outcome', value: o.outcomeMetricValue.toFixed(3), style: { color:'#e2e8f0' } },
                  { label:'Delta', value: `${o.deltaPercent > 0 ? '+' : ''}${o.deltaPercent.toFixed(1)}%`, style: { color: deltaColor(o.deltaPercent) } },
                ].map(m => (
                  <div key={m.label} style={{ background:'rgba(255,255,255,0.02)',borderRadius:8,padding:10 }}>
                    <div style={{ fontSize:9,color:'#475569',letterSpacing:'0.06em',marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:14,fontWeight:700,...m.style }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {o.unexpectedEffects && (
                <div style={{ marginTop:12,padding:'8px 12px',background:'rgba(234,179,8,0.08)',borderRadius:8,fontSize:11,color:'#eab308',border:'1px solid rgba(234,179,8,0.15)' }}>
                  ⚠ {o.unexpectedEffects}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'impact' && <ImpactTracker impacts={impacts} />}

      {activeTab === 'memory' && <MemoryExplorer memory={memory} summary={memorySummary} />}

      {/* New Experiment Modal */}
      {showNewExp && (
        <NewExperimentModal
          projectId={projectId}
          onClose={() => setShowNewExp(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  );
}
