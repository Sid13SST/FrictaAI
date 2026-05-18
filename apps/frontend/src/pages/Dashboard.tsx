import { Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-foreground/60 mt-1">Monitor your recent UX test runs and insights.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Runs', value: '1,248', icon: Activity, color: 'text-blue-500' },
          { label: 'Avg UX Score', value: '84/100', icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Critical Issues', value: '12', icon: AlertCircle, color: 'text-red-500' },
          { label: 'Testing Hours', value: '340h', icon: Clock, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-xl flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/60">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Runs */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Recent Workflow Runs</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <div>
                      <p className="font-medium text-sm">Checkout Flow - Guest User</p>
                      <p className="text-xs text-foreground/50">Run {i} hours ago • E-commerce App</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-medium bg-green-500/10 text-green-500 px-2 py-1 rounded-md">Score: 92</span>
                    <button className="text-sm text-primary hover:underline">View Report</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action center */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Run New Test</h3>
              <p className="text-sm text-foreground/60 mt-1">Deploy an AI agent to test a specific user flow.</p>
            </div>
            <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              Configure Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
