import { Users, Plus } from 'lucide-react';

export const Personas = () => {
  const personas = [
    { name: 'Confused Beginner', desc: 'Low tech literacy, reads every label, hesitant to click.', type: 'Novice' },
    { name: 'Impatient Shopper', desc: 'High intent, skips instructions, rage clicks if slow.', type: 'Expert' },
    { name: 'Distracted Mobile User', desc: 'Frequent pauses, misclicks, scrolling randomly.', type: 'Intermediate' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Personas</h1>
          <p className="text-foreground/60 mt-1">Manage AI profiles used to simulate different user behaviors.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center">
          <Plus className="w-4 h-4 mr-2" /> New Persona
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((persona, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-xl hover:border-primary/50 transition-colors group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/5 rounded-lg text-foreground group-hover:text-primary transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium bg-white/5 px-2 py-1 rounded-md text-foreground/70">{persona.type}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{persona.name}</h3>
            <p className="text-sm text-foreground/60">{persona.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
