import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlaySquare, FileText, Users, Settings, Brain, ChevronRight, Share2, Compass, TrendingUp, Zap, Sparkles, Cpu, Link2, GitBranch, MessageSquare, Terminal, Activity, FlaskConical, Target, Award } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, isLoaded } = useUser();

  const navItems = [
    { name: 'Dashboard',  path: '/app',             icon: LayoutDashboard, desc: 'Overview' },
    { name: 'Run Test',   path: '/app/workflow',     icon: PlaySquare,      desc: 'UX Audit' },
    { name: 'Reports',    path: '/app/reports',      icon: FileText,        desc: 'Analysis' },
    { name: 'UX Memory',  path: '/app/historical',   icon: Brain,           desc: 'Analytics' },
    { name: 'Longitudinal', path: '/app/longitudinal', icon: TrendingUp,     desc: 'Long-term' },
    { name: 'Predictive',   path: '/app/predictive',   icon: Zap,            desc: 'Forecasting' },
    { name: 'Redesign',     path: '/app/redesign',     icon: Sparkles,       desc: 'Remediation' },
    { name: 'Autonomous',   path: '/app/autonomous',   icon: Cpu,            desc: 'Optimization' },
    { name: 'Strategy OS',  path: '/app/autonomous-strategy', icon: Target, desc: 'Planning' },
    { name: 'Product Strategy', path: '/app/product-strategy', icon: Compass, desc: 'Portfolio OS' },
    { name: 'Outcome Intelligence', path: '/app/outcome-intelligence', icon: Award, desc: 'Attribution & KPIs' },
    { name: 'Integrations', path: '/app/integrations', icon: Link2,          desc: 'Ecosystem' },
    { name: 'Engineering',  path: '/app/engineering',  icon: GitBranch,      desc: 'CI/CD & Deploy' },
    { name: 'Collaboration', path: '/app/collaboration', icon: MessageSquare,   desc: 'War Rooms' },
    { name: 'Developer',  path: '/app/developer',    icon: Terminal,       desc: 'APIs & SDKs' },
    { name: 'Live Telemetry', path: '/app/telemetry',  icon: Activity,       desc: 'Real User' },
    { name: 'Live Intelligence', path: '/app/live-intelligence', icon: Zap, desc: 'UX Observability' },
    { name: 'Optimization Lab', path: '/app/optimization', icon: FlaskConical, desc: 'Experiments' },
    { name: 'Simulation', path: '/app/simulation',   icon: Compass,         desc: 'Behavior' },
    { name: 'Workspace',  path: '/app/workspace',    icon: Share2,          desc: 'Collaborate' },
    { name: 'Personas',   path: '/app/personas',     icon: Users,           desc: 'Profiles' },
    { name: 'Settings',   path: '/app/settings',     icon: Settings,        desc: 'Config' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--fricta-bg, #070b0a)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside
        className="w-60 flex flex-col relative flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at top left, rgba(99, 102, 241, 0.05), transparent 45%), radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.03), transparent 45%), #09090b',
          borderRight: '1px solid rgba(255, 255, 255, 0.03)',
        }}
      >
        {/* Subtle right-edge glow */}
        <div
          className="absolute inset-y-0 right-0 w-[1px] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.02), rgba(99, 102, 241, 0.1) 20%, rgba(168, 85, 247, 0.08) 80%, rgba(168, 85, 247, 0.01))'
          }}
        />

        {/* Logo */}
        <Link
          to="/app"
          className="h-20 flex items-center px-6 gap-3 flex-shrink-0 hover:opacity-95 transition-all group border-b border-white/[0.03]"
        >
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]"
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <img
              src="/logo.png"
              alt="Fricta"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-wide font-jakarta transition-colors group-hover:text-indigo-200">Fricta</span>
            <span
              className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold leading-none mt-0.5 transition-colors group-hover:text-indigo-400"
              style={{ color: 'rgba(99, 102, 241,0.6)' }}
            >
              Intelligence
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 flex flex-col gap-1.5 mt-1 overflow-y-auto scrollbar-thin">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.2em] px-3.5 py-1 mb-2 font-mono"
            style={{ color: 'rgba(255, 255, 255, 0.25)' }}
          >
            Platform
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path
              || (item.path !== '/app' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group relative border ${
                  isActive
                    ? 'border-indigo-500/16 bg-gradient-to-r from-indigo-500/8 to-purple-500/3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
                    : 'border-transparent hover:bg-white/[0.02] hover:border-white/[0.04] hover:translate-x-0.5'
                }`}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.85)]"
                  />
                )}

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border ${
                    isActive
                      ? 'bg-indigo-500/12 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                      : 'bg-white/[0.02] border-white/[0.04] text-zinc-400 group-hover:bg-white/[0.05] group-hover:border-white/[0.08] group-hover:text-zinc-200 group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                </div>

                <div className="flex flex-col leading-none">
                  <span
                    className={`text-xs font-semibold transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {item.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono mt-1 transition-colors duration-300 ${
                      isActive ? 'text-purple-400/60' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  >
                    {item.desc}
                  </span>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 ml-auto transition-all duration-300 ${
                    isActive
                      ? 'text-indigo-400/70 translate-x-0 group-hover:translate-x-0.5'
                      : 'text-zinc-600 opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-3 mt-auto border-t border-white/[0.03] flex-shrink-0">
          <div
            className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/15 border border-white/[0.02] backdrop-blur-md hover:bg-zinc-900/35 hover:border-white/[0.05] transition-all duration-300 relative group"
          >
            {/* Status dot in the corner */}
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            </div>

            <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              <UserButton afterSignOutUrl="/" />
            </div>

            {isLoaded && user && (
              <div className="flex flex-col overflow-hidden flex-1 leading-none">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors duration-300">
                  {user.fullName || 'User'}
                </p>
                <p
                  className="text-[9px] font-mono truncate mt-1 text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300"
                >
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top header bar */}
        <header
          className="h-14 flex items-center px-8 justify-between flex-shrink-0 border-b border-white/[0.03]"
          style={{
            background: 'rgba(7, 11, 10, 0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Active route breadcrumb */}
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono uppercase tracking-widest font-bold"
              style={{ color: 'rgba(99, 102, 241,0.6)' }}
            >
              Fricta
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span className="text-xs font-semibold text-white">
              {navItems.find(n =>
                n.path !== '/app'
                  ? location.pathname.startsWith(n.path)
                  : location.pathname === n.path
              )?.name ?? 'Dashboard'}
            </span>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold"
              style={{
                background: 'rgba(99, 102, 241,0.06)',
                border: '1px solid rgba(99, 102, 241,0.15)',
                color: 'rgba(99, 102, 241,0.8)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#6366f1', boxShadow: '0 0 6px rgba(99, 102, 241,0.6)' }}
              />
              SYSTEM ACTIVE
            </div>
          </div>
        </header>

        {/* Page content */}
        <div
          className="flex-1 overflow-auto p-8"
          style={{ background: 'var(--fricta-bg, #070b0a)' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};
