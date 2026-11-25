import { Activity, Folder, ArrowRight, Plus, Sparkles, Zap, TrendingUp, Globe, FileText, ShieldAlert, HelpCircle, Radio } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useProjects } from '../hooks/api/useProjects';
import { useAllWorkflows, isActiveWorkflow, type WorkflowWithProject } from '../hooks/api/useWorkflows';
import { useReports } from '../hooks/api/useReports';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { AuditStatusBadge } from '../components/common/AuditStatusBadge';
import { Skeleton, SkeletonGroup, SkeletonPageHeader, SkeletonRows, SkeletonStatCard } from '../components/common/Skeleton';

const surface = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' };
const divider = { borderBottom: '1px solid rgba(255,255,255,0.04)' };

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <SkeletonGroup label="Loading your dashboard" className="space-y-8">
    <SkeletonPageHeader />
    <div className="grid grid-cols-1 min-[340px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
    <div className="rounded-2xl overflow-hidden" style={surface}>
      <div className="px-5 py-4" style={divider}><Skeleton className="h-3.5 w-28 rounded-full" /></div>
      <SkeletonRows count={1} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={surface}>
        <div className="px-5 py-4" style={divider}><Skeleton className="h-3.5 w-32 rounded-full" /></div>
        <SkeletonRows count={4} />
      </div>
      <div className="rounded-2xl p-5 space-y-3" style={surface}>
        <Skeleton className="h-3.5 w-28 rounded-full mb-2" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    </div>
  </SkeletonGroup>
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
    className="relative rounded-2xl p-4 sm:p-6 overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 min-w-0"
    style={{
      background: `radial-gradient(circle at top right, ${glowColor}08, transparent 60%), rgba(255,255,255,0.02)`,
      border: `1px solid ${glowColor}15`,
    }}
  >
    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </p>
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25`, color: accentColor }}
      >
        {icon}
      </div>
    </div>
    <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1 h-9 sm:h-10 flex items-center">
      {loading ? <Skeleton className="h-8 w-12" /> : value}
    </div>
    {trend && (
      <p className="text-[11px] sm:text-xs mt-1 truncate" style={{ color: `${accentColor}80` }}>{trend}</p>
    )}
  </div>
);

// ─── First-run hero (no projects yet) ──────────────────────────────────────────────────────────────
const FirstRunHero = ({ onCreateProject }: { onCreateProject: () => void }) => (
  <div className="space-y-8">
    {/* Header */}
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Welcome to Fricta</h1>
      <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Your AI-powered UX intelligence center.
      </p>
    </div>

    {/* Hero empty card */}
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(115,66,226,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(168,85,247,0.06) 0%, transparent 50%), rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.06)',
        minHeight: '420px',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(115,66,226,0.4), transparent)',
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
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 30px rgba(115,66,226,0.3), 0 0 60px rgba(115,66,226,0.1); } 50% { box-shadow: 0 0 50px rgba(115,66,226,0.5), 0 0 100px rgba(115,66,226,0.2); } }
      `}</style>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-14 sm:py-20">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(115,66,226,0.2), rgba(168,85,247,0.1))',
            border: '1px solid rgba(115,66,226,0.3)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
        >
          <Sparkles className="w-10 h-10" style={{ color: '#9B72FA' }} />
          {/* Corner dots */}
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-60" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-purple-400 opacity-40" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Launch Your First Audit
        </h2>
        <p className="text-base max-w-md leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Connect a project and deploy AI agents to automatically discover UX friction, accessibility issues, and conversion blockers in minutes.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { icon: <Zap className="w-3 h-3" />, label: 'AI-Powered', color: '#f59e0b' },
            { icon: <Globe className="w-3 h-3" />, label: 'Any Website', color: '#7342E2' },
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
          className="group flex items-center gap-3 px-6 sm:px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-100"
          style={{
            background: 'linear-gradient(135deg, #7342E2, #8b5cf6)',
            boxShadow: '0 0 40px rgba(115,66,226,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 60px rgba(115,66,226,0.5), inset 0 1px 0 rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(115,66,226,0.35), inset 0 1px 0 rgba(255,255,255,0.15)')}
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
        { icon: <Activity className="w-5 h-5" />, title: 'Automated Audits', desc: 'AI agents crawl your site and surface UX issues automatically.', color: '#7342E2' },
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

// ─── Audit row ────────────────────────────────────────────────────────────────
const auditHref = (w: WorkflowWithProject) =>
  w.status === 'COMPLETED' ? `/app/reports/${w.id}` : `/app/monitor/${w.id}`;

const AuditRow = ({ audit }: { audit: WorkflowWithProject }) => (
  <Link
    to={auditHref(audit)}
    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors duration-200 group hover:bg-white/[0.015]"
    style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white truncate">{audit.goal || 'UX Audit'}</p>
      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {audit.projectName} · {new Date(audit.startedAt || audit.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <AuditStatusBadge status={audit.status} />
      <ArrowRight className="w-3.5 h-3.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9B72FA' }} />
    </div>
  </Link>
);

const CardHeader = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4" style={divider}>
    <h2 className="text-sm font-bold text-white">{title}</h2>
    {right}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const {
    data: projects, isLoading: projectsLoading, isError: projectsError,
    error: projectsErr, refetch: refetchProjects, isRefetching: projectsRefetching,
  } = useProjects();
  const audits = useAllWorkflows(projects);
  const reports = useReports();

  if (projectsLoading) return <DashboardSkeleton />;

  if (projectsError && !projects) {
    return (
      <ErrorState
        error={projectsErr}
        action="load your dashboard"
        onRetry={() => refetchProjects()}
        retrying={projectsRefetching}
      />
    );
  }

  if (!projects || projects.length === 0) {
    return <FirstRunHero onCreateProject={() => navigate('/app/workflow')} />;
  }

  const totalProjects = projects.length;
  const allAudits = audits.workflows;
  const activeAudits = allAudits.filter(isActiveWorkflow);
  const reportCount = reports.data?.length ?? 0;
  const findingsCount = (reports.data ?? []).reduce((sum, r) => sum + (r.uxFindingsCount ?? 0), 0);
  const hasFindingCounts = (reports.data ?? []).some(r => typeof r.uxFindingsCount === 'number');
  const firstName = user?.firstName?.trim();

  const stats = [
    { label: 'Projects', value: totalProjects,    icon: <Folder className="w-4 h-4" />,      accentColor: '#9B72FA', glowColor: '#7342E2', trend: 'Websites tracked',          loading: false },
    { label: 'Audits',   value: allAudits.length, icon: <Activity className="w-4 h-4" />,    accentColor: '#34d399', glowColor: '#10b981', trend: `${activeAudits.length} running now`, loading: audits.isLoading },
    { label: 'Reports',  value: reports.isError ? '—' : reportCount, icon: <FileText className="w-4 h-4" />, accentColor: '#60a5fa', glowColor: '#3b82f6', trend: 'Ready to review', loading: reports.isLoading },
    { label: 'Findings', value: reports.isError || (reportCount > 0 && !hasFindingCounts) ? '—' : findingsCount, icon: <ShieldAlert className="w-4 h-4" />, accentColor: '#fbbf24', glowColor: '#f59e0b', trend: 'Issues surfaced', loading: reports.isLoading },
  ];

  const quickActions = [
    { id: 'configure-run-btn',  to: '/app/workflow', title: 'New Audit',             desc: 'Deploy an AI agent on a URL',   icon: <Zap className="w-4 h-4 text-indigo-400" />,        tint: 'rgba(115,66,226,0.15)', primary: true },
    { id: 'view-reports-btn',   to: '/app/reports',  title: 'View Reports',          desc: 'Scores, findings and exports',  icon: <FileText className="w-4 h-4 text-emerald-400" />,  tint: 'rgba(16,185,129,0.1)',  primary: false },
    { id: 'view-runtime-btn',   to: '/app/runtime',  title: 'Runtime Observability', desc: 'Workers, queues, browser pool', icon: <Radio className="w-4 h-4 text-sky-400" />,         tint: 'rgba(56,189,248,0.1)',  primary: false },
    { id: 'help-center-btn',    to: '/app/help',     title: 'Help Center',           desc: 'Guides and FAQ',                icon: <HelpCircle className="w-4 h-4 text-amber-400" />,  tint: 'rgba(245,158,11,0.1)',  primary: false },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {activeAudits.length > 0
              ? `${activeAudits.length} audit${activeAudits.length !== 1 ? 's' : ''} in progress across ${totalProjects} project${totalProjects !== 1 ? 's' : ''}.`
              : `UX audit activity across ${totalProjects} project${totalProjects !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <button
          id="run-new-test-btn"
          onClick={() => navigate('/app/workflow')}
          className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300 hover:scale-105 self-start sm:self-auto flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7342E2, #8b5cf6)', boxShadow: '0 0 24px rgba(115,66,226,0.25)' }}
        >
          <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" />
          New Audit
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 min-[340px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Active audits */}
      <section className="rounded-2xl overflow-hidden" style={activeAudits.length > 0
        ? { background: 'radial-gradient(ellipse at top left, rgba(245,158,11,0.05), transparent 55%), rgba(255,255,255,0.02)', border: '1px solid rgba(245,158,11,0.18)' }
        : surface}
      >
        <CardHeader
          title="Active Audits"
          right={activeAudits.length > 0 ? (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              Live
            </span>
          ) : undefined}
        />
        {audits.isLoading ? (
          <SkeletonRows count={1} />
        ) : audits.isError ? (
          <div className="p-4"><ErrorState variant="banner" error={audits.error} action="load your audits" onRetry={audits.refetch} /></div>
        ) : activeAudits.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<Radio className="w-5 h-5" />}
            title="No audits running"
            description="When you launch an audit you can watch the AI agent work here in real time."
            action={{ label: 'Run an audit', to: '/app/workflow' }}
          />
        ) : (
          <div>{activeAudits.map(a => <AuditRow key={a.id} audit={a} />)}</div>
        )}
      </section>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent audits */}
        <section className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col min-w-0" style={surface}>
          <CardHeader
            title="Recent Audits"
            right={allAudits.length > 0 ? (
              <Link
                to="/app/reports"
                className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-white flex-shrink-0"
                style={{ color: 'rgba(155,114,250,0.9)' }}
              >
                View reports <ArrowRight className="w-3 h-3" />
              </Link>
            ) : undefined}
          />
          {audits.isLoading ? (
            <SkeletonRows count={4} />
          ) : audits.isError ? (
            <div className="p-4"><ErrorState variant="banner" error={audits.error} action="load your audits" onRetry={audits.refetch} /></div>
          ) : allAudits.length === 0 ? (
            <EmptyState
              variant="inline"
              className="flex-1"
              icon={<Activity className="w-6 h-6" />}
              title="No audits yet"
              description="Point an AI agent at one of your projects and it will explore the site, capture evidence, and report the friction it finds."
              action={{ label: 'Run your first audit', to: '/app/workflow' }}
            />
          ) : (
            <div className="flex-1">{allAudits.slice(0, 6).map(a => <AuditRow key={a.id} audit={a} />)}</div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-4 min-w-0">

          {/* Quick actions */}
          <section
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at top right, rgba(115,66,226,0.1), transparent 60%), rgba(255,255,255,0.02)',
              border: '1px solid rgba(115,66,226,0.15)',
            }}
          >
            <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {quickActions.map(a => (
                <Link
                  key={a.id}
                  id={a.id}
                  to={a.to}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group hover:scale-[1.01] min-w-0"
                  style={a.primary
                    ? { background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.2)' }
                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.tint }}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{a.title}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: '#9B72FA' }} />
                </Link>
              ))}
            </div>
          </section>

          {/* Recent projects */}
          <section className="rounded-2xl p-4 sm:p-5" style={surface}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Recent Projects</h2>
              <Link
                to="/app/projects"
                className="text-[11px] font-semibold px-2 py-1 rounded-full transition-colors hover:text-white"
                style={{ background: 'rgba(115,66,226,0.1)', color: '#9B72FA' }}
              >
                View all {totalProjects}
              </Link>
            </div>
            <div className="space-y-2">
                {projects.slice(0, 3).map(p => (
                  <Link
                    key={p.id}
                    to={`/app/projects/${p.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 hover:bg-white/[0.04] min-w-0"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(115,66,226,0.1)', border: '1px solid rgba(115,66,226,0.2)' }}
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.projectName}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.websiteUrl}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
