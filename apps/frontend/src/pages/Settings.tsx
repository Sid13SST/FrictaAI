export const Settings = () => {
  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-foreground/60 mt-1">Manage your account and project preferences.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">General</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-foreground/80">Project Name</label>
              <input type="text" defaultValue="Project Alpha" className="col-span-2 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-foreground/80">Default URL</label>
              <input type="text" defaultValue="https://app.example.com" className="col-span-2 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-foreground/60">Manage keys for integrating Fricta via MCP or external agents.</p>
          <div className="flex items-center space-x-4">
            <input type="password" value="sk_test_1234567890" readOnly className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground/50 font-mono" />
            <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-white/10">
              Reveal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
