import { Activity, Folder, CheckCircle2, Clock, ArrowRight, Plus, Sparkles, Zap, TrendingUp, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/api/useProjects';
import { useWorkflows } from '../hooks/api/useWorkflows';

// ─── Skeleton shimmer card ────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div
    className="rounded-2xl p-6 relative overflow-hidden flex-1"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}
  >
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
          animation: 'shimmer 1.8s infinite',
        }}
      />
    </div>
    <div className="h-3 w-20 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
    <div className="h-8 w-12 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
    <div className="h-2 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
    <div className="flex-1">
      <div className="h-3 w-48 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="h-2 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
    <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
  </div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="space-y-8">
    <style>{`
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    `}</style>

    {/* Header skeleton */}
    <div>
      <div className="h-8 w-40 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 w-64 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>

    {/* Stat cards skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
    </div>

    {/* Content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="h-4 w-36 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="h-4 w-28 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-24 w-24 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-3 w-full rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 w-3/4 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    </div>
  </div>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  trend?: string;
  loading?: boolean;
}

const StatCard = ({ label, value, icon, accentColor, glowColor, trend, loading }: StatCardProps) => (
  <div
    className="relative rounded-2xl p-6 overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
    style={{
      background: `radial-gradient(circle at top right, ${glowColor}08, transparent 60%), rgba(255,255,255,0.02)`,
      border: `1px solid ${glowColor}15`,
      boxShadow: `0 0 0 0 ${glowColor}00`,
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px ${glowColor}12`)}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 ${glowColor}00`)}
  >
    {/* Background orb */}
    <div
      className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: `radial-gradient(circle, ${glowColor}12, transparent)`, transform: 'translate(30%, -30%)' }}
    />

    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25`, color: accentColor }}
        >
          {icon}
        </div>
      </div>

      <p className="text-4xl font-bold tracking-tight text-white mb-1">
        {loading ? (
          <span className="inline-block h-9 w-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ) : value}
      </p>

      {trend && (
        <p className="text-xs mt-1" style={{ color: `${accentColor}80` }}>
          {trend}
        </p>
      )}
    </div>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ onCreateProject }: { onCreateProject: () => void }) => (
  <div className="space-y-8">
    {/* Header */}
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-white">Overview</h1>
      <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Your AI-powered UX intelligence center.
      </p>
    </div>

    {/* Hero empty card */}
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(168,85,247,0.06) 0%, transparent 50%), rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.06)',
        minHeight: '420px',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)',
            top: '-10%', left: '-5%',
            animation: 'float1 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-72 h-72 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.4), transparent)',
            bottom: '-15%', right: '10%',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.4), transparent)',
            top: '30%', right: '30%',
            animation: 'float3 12s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, -20px) scale(1.05); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-15px, 15px) scale(0.97); } }
        @keyframes float3 { 0%, 100% { transform: translate(0, 0); } 33% { transform: translate(10px, -10px); } 66% { transform: translate(-10px, 10px); } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); } 50% { box-shadow: 0 0 50px rgba(99,102,241,0.5), 0 0 100px rgba(99,102,241,0.2); } }
      `}</style>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 py-20">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
        >
          <Sparkles className="w-10 h-10" style={{ color: '#818cf8' }} />
          {/* Corner dots */}
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-60" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-purple-400 opacity-40" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
          Launch Your First Audit
        </h2>
        <p className="text-base max-w-md leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Connect a project and deploy AI agents to automatically discover UX friction, accessibility issues, and conversion blockers in minutes.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { icon: <Zap className="w-3 h-3" />, label: 'AI-Powered', color: '#f59e0b' },
            { icon: <Globe className="w-3 h-3" />, label: 'Any Website', color: '#6366f1' },
            { icon: <TrendingUp className="w-3 h-3" />, label: 'UX Insights', color: '#10b981' },
          ].map(({ icon, label, color }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
            >
              {icon} {label}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <button
          id="create-first-project-btn"
          onClick={onCreateProject}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-100"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 40px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 60px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)')}
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Create Your First Project
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        <p className="mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Free to start · No card required
        </p>
      </div>
    </div>

    {/* Teaser cards row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { icon: <Activity className="w-5 h-5" />, title: 'Automated Audits', desc: 'AI agents crawl your site and surface UX issues automatically.', color: '#6366f1' },
        { icon: <TrendingUp className="w-5 h-5" />, title: 'Longitudinal Tracking', desc: 'Track UX quality over time across releases and experiments.', color: '#10b981' },
        { icon: <Sparkles className="w-5 h-5" />, title: 'Redesign Suggestions', desc: 'Get AI-powered fix recommendations with code snippets.', color: '#f59e0b' },
      ].map(({ icon, title, desc, color }) => (
        <div
          key={title}
          className="rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300"
          style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}
          >
            {icon}
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─── Workflow status badge ────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = {
    RUNNING:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', dot: '#f59e0b', label: 'Running'   },
    PENDING:   { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', dot: '#6366f1', label: 'Queued'    },
    COMPLETED: { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', dot: '#10b981', label: 'Done'      },
    FAILED:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', dot: '#ef4444', label: 'Failed'    },
  }[status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', dot: '#555', label: status };

  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80`, ...(status === 'RUNNING' ? { animation: 'pulse-dot 1.5s infinite' } : {}) }}
      />
      {cfg.label}
    </span>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const Dashboard = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useProjects();

  const activeProjectId = projects?.[0]?.id;
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(activeProjectId);

  if (projectsLoading) return <DashboardSkeleton />;

  if (projectsError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div
          className="text-center px-8 py-10 rounded-2xl max-w-sm"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Activity className="w-6 h-6 text-rose-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Connection Error</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Failed to load dashboard. Check your connection and try refreshing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 transition-colors hover:text-white"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return <EmptyState onCreateProject={() => navigate('/app/workflow')} />;
  }

  const totalProjects = projects.length;
  const totalWorkflows = workflows?.length || 0;
  const completedWorkflows = workflows?.filter(w => w.status === 'COMPLETED').length || 0;
  const runningWorkflows = workflows?.filter(w => w.status === 'RUNNING' || w.status === 'PENDING').length || 0;

  const stats = [
    { label: 'Total Projects',   value: totalProjects,       icon: <Folder className="w-4 h-4" />,       accentColor: '#818cf8', glowColor: '#6366f1', trend: 'Active projects' },
    { label: 'Total Runs',       value: totalWorkflows,      icon: <Activity className="w-4 h-4" />,      accentColor: '#34d399', glowColor: '#10b981', trend: 'Across all projects' },
    { label: 'Completed',        value: completedWorkflows,  icon: <CheckCircle2 className="w-4 h-4" />,  accentColor: '#34d399', glowColor: '#10b981', trend: 'Successful audits' },
    { label: 'Active Sessions',  value: runningWorkflows,    icon: <Clock className="w-4 h-4" />,         accentColor: '#fbbf24', glowColor: '#f59e0b', trend: 'Running now' },
  ];

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Monitor your UX audit activity across {totalProjects} project{totalProjects !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          id="run-new-test-btn"
          onClick={() => navigate('/app/workflow')}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 24px rgba(99,102,241,0.25)',
          }}
        >
          <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" />
          New Audit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            accentColor={s.accentColor}
            glowColor={s.glowColor}
            trend={s.trend}
            loading={workflowsLoading && s.label !== 'Total Projects'}
          />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Workflow Runs */}
        <div className="lg:col-span-2 flex flex-col">
          <div
            className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Table header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <h2 className="text-sm font-bold text-white">Recent Workflow Runs</h2>
              {totalWorkflows > 0 && (
                <Link
                  to="/app/reports"
                  className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: 'rgba(99,102,241,0.8)' }}
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {workflowsLoading ? (
              <div className="flex-1">
                {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !workflows || workflows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <Activity className="w-6 h-6" style={{ color: 'rgba(99,102,241,0.6)' }} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No runs yet</p>
                <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Start an audit to see results here.
                </p>
                <button
                  onClick={() => navigate('/app/workflow')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  Run First Audit
                </button>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-white/[0.03]">
                {workflows.slice(0, 6).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-200 group"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{w.goal || 'UX Audit'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(w.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={w.status} />
                      <Link
                        to="/app/reports"
                        className="flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'rgba(99,102,241,0.8)' }}
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick Actions card */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.1), transparent 60%), rgba(255,255,255,0.02)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', transform: 'translate(30%, -30%)' }} />
            <div className="relative">
              <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2.5">
                <button
                  id="configure-run-btn"
                  onClick={() => navigate('/app/workflow')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group hover:scale-[1.01]"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                    <Zap className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">Run New Audit</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Deploy AI agent on a URL</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  id="view-reports-btn"
                  onClick={() => navigate('/app/reports')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">View Reports</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>See all audit findings</p>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'rgba(255,255,255,0.6)' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Projects card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Projects</h2>
              <span
                className="text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
              >
                {totalProjects}
              </span>
            </div>
            <div className="space-y-2">
              {projects.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.projectName}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.websiteUrl}</p>
                  </div>
                </div>
              ))}
              {projects.length > 3 && (
                <p className="text-center text-[11px] pt-1" style={{ color: 'rgba(99,102,241,0.6)' }}>
                  +{projects.length - 3} more
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
