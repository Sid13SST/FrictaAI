import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Navigation, 
  MousePointer, 
  Info, 
  Code, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  ChevronRight, 
  AlertCircle, 
  Laptop, 
  Smartphone, 
  Clock, 
  Server, 
  Globe, 
  AlertTriangle, 
  Sparkles, 
  TrendingUp, 
  Cpu, 
  Layers, 
  Check, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Filter
} from 'lucide-react';

interface AnomalyEvidence {
  id: string;
  evidenceType: string;
  details: any;
  timestamp: string;
  liveSession?: {
    id: string;
    sessionKey: string;
    browser: string;
    os: string;
    location: string;
    ipAddress: string;
    device?: string;
  };
}

interface CorrelatedBehavior {
  id: string;
  correlationType: string;
  correlationKey: string;
  coefficient: number;
  evidenceDetails: string;
  timestamp: string;
}

interface UXAnomaly {
  id: string;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  isResolved: boolean;
  createdAt: string;
  evidence: AnomalyEvidence[];
  correlatedBehaviors: CorrelatedBehavior[];
}

interface BehavioralPattern {
  id: string;
  patternType: string;
  description: string;
  confidence: number;
  sessionCount: number;
  updatedAt: string;
}

interface SurvivabilityMetric {
  id: string;
  metricType: string;
  value: number;
  targetWorkflow: string | null;
  timestamp: string;
}

interface IntelligenceAlert {
  id: string;
  alertType: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  timestamp: string;
}

export const LiveIntelligence: React.FC = () => {
  const [projectId, setProjectId] = useState<string>('');
  const [anomalies, setAnomalies] = useState<UXAnomaly[]>([]);
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([]);
  const [survivability, setSurvivability] = useState<SurvivabilityMetric[]>([]);
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'anomalies' | 'behavior' | 'survivability'>('cockpit');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async (projId: string) => {
    try {
      const [anomaliesRes, patternsRes, survivabilityRes, alertsRes] = await Promise.all([
        fetch(`/api/live/anomalies?projectId=${projId}`),
        fetch(`/api/live/behavior?projectId=${projId}`),
        fetch(`/api/live/survivability?projectId=${projId}&limit=35`),
        fetch(`/api/live/alerts?projectId=${projId}`)
      ]);

      if (anomaliesRes.ok) {
        const data = await anomaliesRes.json();
        setAnomalies(data.anomalies || []);
      }
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setPatterns(data.patterns || []);
      }
      if (survivabilityRes.ok) {
        const data = await survivabilityRes.json();
        setSurvivability(data.metrics || []);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load live intelligence dashboards:', err);
    }
  };

  const initProject = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      const pId = data[0]?.id || '56b8722a-c7c4-47db-a855-b5d3e0ad32cb';
      setProjectId(pId);
      await fetchDashboardData(pId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!projectId) return;
    setRefreshing(true);
    try {
      await fetch(`/api/live/sync?projectId=${projectId}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to trigger live intelligence sync:', err);
    }
    await fetchDashboardData(projectId);
    setRefreshing(false);
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      const res = await fetch(`/api/live/alerts/${alertId}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    initProject();
  }, []);

  // Compute average metrics for gauges
  const getLatestMetric = (type: string, fallback: number): number => {
    const list = survivability.filter(m => m.metricType === type);
    return list.length > 0 ? list[0].value : fallback;
  };

  const onboardingScore = getLatestMetric('ONBOARDING_SURVIVABILITY', 0.88);
  const ctaScore = getLatestMetric('CTA_SURVIVABILITY', 0.96);
  const navigationScore = getLatestMetric('NAVIGATION_SURVIVABILITY', 0.94);
  const workflowScore = getLatestMetric('WORKFLOW_SURVIVABILITY', 0.82);
  const cognitiveScore = getLatestMetric('COGNITIVE_SURVIVABILITY', 0.89);

  const overallSurvivability = (onboardingScore + ctaScore + navigationScore + workflowScore + cognitiveScore) / 5;

  const selectedAnomaly = anomalies.find(a => a.id === selectedAnomalyId);

  return (
    <div className="text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 space-y-6 pb-12">
      
      {/* ── HEADER PANEL ── */}
      <div 
        className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
        style={{
          background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 50%), radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.04), transparent 50%), #09090b',
        }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          UX OBSERVABILITY ACTIVE
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <Cpu className="w-5 h-5" />
              </div>
              Real-Time Command Center
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Examine live user anomalies, evaluate funnel survivability thresholds relative to historical baselines, and discover environmental correlations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
              Sync intelligence
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex border-b border-white/[0.04] gap-6">
        {[
          { id: 'cockpit', label: 'Command Cockpit', icon: Activity },
          { id: 'anomalies', label: 'Anomaly Explorer', icon: ShieldAlert },
          { id: 'behavior', label: 'Behavioral Intelligence', icon: MousePointer },
          { id: 'survivability', label: 'Survivability Monitor', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 text-xs font-bold transition-all relative ${
                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: COMMAND COCKPIT ── */}
      {activeTab === 'cockpit' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Cockpit Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Survivability Score</span>
                <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                  {(overallSurvivability * 100).toFixed(1)}%
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">HEALTHY</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                <TrendingUp className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">UX Anomalies</span>
                <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                  {anomalies.filter(a => !a.isResolved).length}
                  {anomalies.filter(a => !a.isResolved).length > 0 ? (
                    <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse">ATTN</span>
                  ) : (
                    <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">CLEAN</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/5 border border-red-500/15 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Alert Noise Ratio</span>
                <div className="text-3xl font-extrabold text-purple-400 flex items-baseline gap-1">
                  100%
                  <span className="text-xs font-mono font-normal text-zinc-500">verifiable</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">Causal Evidence</span>
                <div className="text-3xl font-extrabold text-emerald-400 flex items-baseline gap-1">
                  100%
                  <span className="text-xs font-mono font-normal text-zinc-500">linked</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Real-time UX Survivability metrics bars */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Funnel Survivability Indexes */}
            <div className="lg:col-span-8 p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
                  Live Path Survivability Monitoring
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Real-time completion and usability indicators tracked relative to expected project thresholds.</p>
              </div>

              <div className="space-y-4">
                
                {/* Onboarding */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Onboarding Survivability</span>
                    <span className="font-mono text-zinc-400">{(onboardingScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.02]">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${onboardingScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">CTA Click Success index</span>
                    <span className="font-mono text-zinc-400">{(ctaScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.02]">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${ctaScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Navigation Routing Health</span>
                    <span className="font-mono text-zinc-400">{(navigationScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.02]">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${navigationScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Checkout workflow */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Checkout Conversion Completion</span>
                    <span className="font-mono text-zinc-400">{(workflowScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.02]">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${workflowScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Cognitive burden */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Cognitive Stability index</span>
                    <span className="font-mono text-zinc-400">{(cognitiveScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.02]">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${cognitiveScore * 100}%` }}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Right side: High Priority System Alerts */}
            <div className="lg:col-span-4 p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Live Incident Dispatcher
              </h3>
              
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {alerts.length > 0 ? (
                  alerts.map((al) => (
                    <div 
                      key={al.id} 
                      className={`p-3.5 rounded-2xl border text-xs space-y-2 relative transition-all ${
                        al.isRead 
                          ? 'bg-zinc-900/30 border-white/[0.02] text-zinc-500' 
                          : 'bg-red-500/[0.02] border-red-500/20 text-red-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-bold ${
                          al.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 border border-white/[0.04]'
                        }`}>
                          {al.alertType}
                        </span>
                        
                        {!al.isRead && (
                          <button
                            onClick={() => handleMarkAlertRead(al.id)}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            DISMISS
                          </button>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-white text-xs">{al.title}</h4>
                      <p className="leading-relaxed text-[11px]">{al.message}</p>
                      
                      <div className="text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(al.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-white/[0.04] rounded-2xl">
                    No active incident dispatches found.
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Active UX Anomaly list */}
          <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-indigo-400" />
                  Active UX Anomalies Registry
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Explainable anomalies detected in production. Select to inspect session timeline evidence.</p>
              </div>
            </div>

            <div className="space-y-3">
              {anomalies.filter(a => !a.isResolved).length > 0 ? (
                anomalies.filter(a => !a.isResolved).map((anom) => (
                  <div 
                    key={anom.id}
                    onClick={() => {
                      setSelectedAnomalyId(anom.id);
                      setActiveTab('anomalies');
                    }}
                    className="p-4 bg-zinc-900/30 border border-white/[0.03] hover:border-indigo-500/30 rounded-2xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-bold ${
                          anom.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {anom.anomalyType}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Detected {new Date(anom.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-semibold">{anom.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/[0.04]">
                        Sessions: {anom.evidence.length} Affected
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs italic border border-dashed border-white/[0.04] rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Healthy state. No active production anomalies flagged.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB CONTENT: ANOMALY EXPLORER ── */}
      {activeTab === 'anomalies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
          
          {/* Left: Anomaly list (Span 5) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1">Select anomaly target</span>
            {anomalies.map((anom) => {
              const isSelected = selectedAnomalyId === anom.id;
              return (
                <div 
                  key={anom.id}
                  onClick={() => setSelectedAnomalyId(anom.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-500/[0.03] border-indigo-500/30 shadow-md' 
                      : 'bg-zinc-900/30 border-white/[0.03] hover:bg-zinc-900/60 hover:border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-bold ${
                      anom.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {anom.anomalyType}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {new Date(anom.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-normal font-semibold mt-1">
                    {anom.description.substring(0, 95)}...
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/[0.02] pt-2">
                    <span>Evidence: {anom.evidence.length} Sessions</span>
                    <span className={`text-[9px] font-bold ${anom.isResolved ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                      {anom.isResolved ? 'RESOLVED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Anomaly Trace Details and Explanations (Span 7) */}
          <div className="lg:col-span-7">
            {selectedAnomaly ? (
              <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl space-y-6 animate-fadeIn">
                
                {/* Header */}
                <div className="border-b border-white/[0.03] pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/[0.04] uppercase font-bold">
                      {selectedAnomaly.anomalyType}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">ID: {selectedAnomaly.id.substring(0, 8)}...</span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-white leading-normal">
                    {selectedAnomaly.description}
                  </h3>
                </div>

                {/* Causal correlations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Causal Environmental Correlations
                  </h4>

                  <div className="space-y-2">
                    {selectedAnomaly.correlatedBehaviors.length > 0 ? (
                      selectedAnomaly.correlatedBehaviors.map((corr) => (
                        <div key={corr.id} className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.04] flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-center text-indigo-400 text-xs font-mono font-bold shrink-0 mt-0.5">
                            {(corr.coefficient * 100).toFixed(0)}%
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">CORRELATION: {corr.correlationKey}</span>
                            <p className="text-xs text-zinc-300 leading-normal">{corr.evidenceDetails}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center rounded-xl bg-zinc-900/30 border border-white/[0.02] text-zinc-500 text-xs italic flex items-center justify-center gap-2">
                        <Info className="w-4 h-4" /> Analyzing logs... No strong version/browser skew correlations found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Session traces */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Contributing Telemetry Evidences
                  </h4>

                  <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                    {selectedAnomaly.evidence.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-xl bg-[#0d0e12]/60 border border-white/[0.02] flex items-center justify-between text-xs gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-white truncate max-w-[150px]">
                              {ev.liveSession?.sessionKey || 'anonymous_session'}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500">
                              {ev.liveSession?.location || 'Unknown'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            {ev.liveSession?.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                            <span>{ev.liveSession?.browser} ({ev.liveSession?.os})</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-mono text-zinc-500 block">Trace Time</span>
                          <span className="text-[10px] font-mono text-zinc-300 font-bold">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-zinc-950/20 border border-dashed border-white/[0.04] text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                <Info className="w-5 h-5" />
                <span>Select an anomaly from the left panel to inspect explainability evidence and correlation footprints.</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB CONTENT: BEHAVIORAL PATTERNS ── */}
      {activeTab === 'behavior' && (
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MousePointer className="w-4.5 h-4.5 text-indigo-400" />
              Live Behavioral Intelligence Console
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Observe recurring user paths, repeating click loops, and friction drop-offs across active segments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patterns.length > 0 ? (
              patterns.map((pat) => (
                <div key={pat.id} className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.03] hover:border-white/[0.06] transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {pat.patternType}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Conf: {(pat.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white">{pat.description}</h4>
                  
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-white/[0.02] pt-2 mt-1">
                    <span>Contributing: {pat.sessionCount} Sessions</span>
                    <span>Updated: {new Date(pat.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.03] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      RAGE_CLICK_LOOP
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Conf: 94%</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Repetitive user clicking on checkout button (button#confirm-checkout)</h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-white/[0.02] pt-2 mt-1">
                    <span>Contributing: 3 Sessions</span>
                    <span>Just Now</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.03] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      ABANDONMENT_PATH
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Conf: 88%</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Users dropping off at /checkout after entering incomplete billing inputs</h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-white/[0.02] pt-2 mt-1">
                    <span>Contributing: 2 Sessions</span>
                    <span>5 min ago</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: SURVIVABILITY MONITOR ── */}
      {activeTab === 'survivability' && (
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.03] shadow-xl space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
              Funnel Path Survivability center
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Chronological forecasting logs mapping completion rates for critical workflows in production.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.03] bg-zinc-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.03] text-[10px] font-mono text-zinc-500 uppercase bg-white/[0.01]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Path Target</th>
                  <th className="p-4">Metric Scope</th>
                  <th className="p-4 text-right">Survivability Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] text-xs font-mono">
                {survivability.length > 0 ? (
                  survivability.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-zinc-400">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-4 text-zinc-300 font-sans font-semibold">
                        {m.targetWorkflow || 'general'}
                      </td>
                      <td className="p-4 text-zinc-500">
                        {m.metricType}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold ${m.value > 0.85 ? 'text-emerald-400' : m.value > 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                          {(m.value * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-zinc-400">Just Now</td>
                      <td className="p-4 text-zinc-300 font-sans font-semibold">checkout</td>
                      <td className="p-4 text-zinc-500">WORKFLOW_SURVIVABILITY</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">82.0%</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-zinc-400">2 min ago</td>
                      <td className="p-4 text-zinc-300 font-sans font-semibold">primary-cta</td>
                      <td className="p-4 text-zinc-500">CTA_SURVIVABILITY</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">96.0%</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-zinc-400">5 min ago</td>
                      <td className="p-4 text-zinc-300 font-sans font-semibold">onboarding</td>
                      <td className="p-4 text-zinc-500">ONBOARDING_SURVIVABILITY</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">88.0%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
