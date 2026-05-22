import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlaySquare, FileText, Users, Settings, Brain, ChevronRight } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, isLoaded } = useUser();

  const navItems = [
    { name: 'Dashboard',  path: '/app',             icon: LayoutDashboard, desc: 'Overview' },
    { name: 'Run Test',   path: '/app/workflow',     icon: PlaySquare,      desc: 'UX Audit' },
    { name: 'Reports',    path: '/app/reports',      icon: FileText,        desc: 'Analysis' },
    { name: 'Personas',   path: '/app/personas',     icon: Users,           desc: 'Profiles' },
    { name: 'Settings',   path: '/app/settings',     icon: Settings,        desc: 'Config' },
  ];

  return (
    <div className="flex h-screen" style={{ background: 'var(--fricta-bg)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside
        className="w-60 flex flex-col relative"
        style={{
          background: 'var(--fricta-obsidian)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Subtle right-edge glow */}
        <div
          className="absolute inset-y-0 right-0 w-[1px] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241,0.12), transparent)' }}
        />

        {/* Logo */}
        <div
          className="h-16 flex items-center px-5 gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(99, 102, 241,0.1)',
              border: '1px solid rgba(99, 102, 241,0.25)',
            }}
          >
            <Brain className="w-4 h-4" style={{ color: '#6366f1' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-tight leading-none">Fricta</span>
            <span
              className="text-[9px] font-mono uppercase tracking-widest leading-none mt-0.5"
              style={{ color: 'rgba(99, 102, 241,0.6)' }}
            >
              Intelligence
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 mt-1">
          <div
            className="text-[9px] font-black uppercase tracking-widest px-3 py-2 mb-1 font-mono"
            style={{ color: 'rgba(255,255,255,0.25)' }}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
                style={{
                  background: isActive ? 'rgba(99, 102, 241,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241,0.18)' : '1px solid transparent',
                }}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/4 bottom-1/4 w-[2.5px] rounded-full"
                    style={{ background: '#6366f1' }}
                  />
                )}

                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    background: isActive ? 'rgba(99, 102, 241,0.12)' : 'rgba(255,255,255,0.04)',
                    border: isActive
                      ? '1px solid rgba(99, 102, 241,0.25)'
                      : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? '#6366f1' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex flex-col leading-none">
                  <span
                    className="text-xs font-semibold transition-colors duration-200"
                    style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)' }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="text-[9px] font-mono mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {item.desc}
                  </span>
                </div>

                {isActive && (
                  <ChevronRight
                    className="w-3 h-3 ml-auto"
                    style={{ color: 'rgba(99, 102, 241,0.5)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <UserButton afterSignOutUrl="/" />
            {isLoaded && user && (
              <div className="flex flex-col overflow-hidden flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user.fullName || 'User'}
                </p>
                <p
                  className="text-[9px] font-mono truncate mt-0.5"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
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
          className="h-14 flex items-center px-8 justify-between flex-shrink-0"
          style={{
            background: 'rgba(7,11,10,0.85)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
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
          style={{ background: 'var(--fricta-bg)' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};
