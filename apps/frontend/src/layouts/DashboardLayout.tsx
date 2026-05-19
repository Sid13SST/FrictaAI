import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, PlaySquare, FileText, Users, Settings } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, isLoaded } = useUser();
  
  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Run Test', path: '/app/workflow', icon: PlaySquare },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Personas', path: '/app/personas', icon: Users },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <img src="/logo.png" alt="Fricta Logo" className="w-8 h-8 mr-2 rounded-md object-cover" />
          <span className="font-semibold text-lg tracking-tight">Fricta</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-white/5 hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center px-3 py-2">
            <UserButton afterSignOutUrl="/" />
            {isLoaded && user && (
              <div className="ml-3 text-sm overflow-hidden">
                <p className="font-medium truncate">{user.fullName || 'User'}</p>
                <p className="text-foreground/50 text-xs truncate">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm flex items-center px-8 justify-between">
          <h2 className="text-lg font-medium">Project Alpha</h2>
          <div className="flex items-center space-x-4">
            <button className="text-sm text-foreground/70 hover:text-foreground transition-colors">Documentation</button>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              Upgrade
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
