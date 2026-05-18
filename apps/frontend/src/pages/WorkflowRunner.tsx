import { Play } from 'lucide-react';

export const WorkflowRunner = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Run Workflow Test</h1>
        <p className="text-foreground/60 mt-1">Configure an AI agent to execute a specific task on your application.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Target URL</label>
          <input 
            type="text" 
            placeholder="https://example.com/login" 
            className="w-full bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">User Goal (Prompt)</label>
          <textarea 
            rows={4}
            placeholder="e.g. You are a new user trying to sign up, add an item to the cart, and complete checkout using a dummy credit card."
            className="w-full bg-background border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Persona</label>
            <select className="w-full bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
              <option>Tech-Savvy User</option>
              <option>Impatient Shopper</option>
              <option>Confused Beginner</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Engine</label>
            <select className="w-full bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
              <option>Fricta Fast (GPT-4o mini)</option>
              <option>Fricta Deep (Claude 3.5 Sonnet)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-md font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center">
            <Play className="w-4 h-4 mr-2" /> Start Execution
          </button>
        </div>
      </div>
    </div>
  );
};
