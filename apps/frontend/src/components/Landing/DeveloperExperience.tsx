import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Code, Settings2, Copy, Check } from 'lucide-react';


const TABS = [
  { id: 'cli', label: 'CLI', icon: Terminal },
  { id: 'api', label: 'REST API', icon: Code },
  { id: 'ci', label: 'CI/CD', icon: Settings2 },
];

const CODE_SNIPPETS: Record<string, string> = {
  cli: `npx fricta audit --url https://staging.acme.com \\
  --persona "power_user" \\
  --goal "complete checkout flow" \\
  --output ./report.json

# Launching Fricta Agent...
# Running autonomous exploration...
# Found 3 high-severity friction points.
# Report saved to ./report.json`,
  
  api: `const response = await fetch('https://api.fricta.dev/v1/audits', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: "https://staging.acme.com",
    persona: "power_user",
    goal: "complete checkout flow"
  })
});

const { audit_id } = await response.json();`,

  ci: `name: Fricta UX Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Fricta
        uses: fricta-hq/fricta-action@v1
        with:
          api-key: \${{ secrets.FRICTA_API_KEY }}
          url: \${{ github.event.deployment.url }}
          fail-on-high-severity: true`
};

export function DeveloperExperience() {
  const [activeTab, setActiveTab] = useState('cli');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-32 bg-transparent relative overflow-hidden" id="docs">
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left: Text */}
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-6"
          >
            Built for developers. <br />
            <span className="text-text-tertiary">Ready for CI/CD.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-inter text-text-secondary text-lg leading-relaxed mb-8"
          >
            Integrate Fricta directly into your existing pipelines. Trigger autonomous audits on every pull request to ensure UX regressions never reach production.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Terminal className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Zero-config CLI</h4>
                <p className="text-text-tertiary text-sm leading-relaxed">Run audits locally with a single command. No installation required.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Code className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">RESTful API</h4>
                <p className="text-text-tertiary text-sm leading-relaxed">Programmatic access to trigger runs, fetch results, and retrieve replays.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Code Block */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Decorative glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent-secondary/30 rounded-2xl blur-lg opacity-50" />
          
          <div className="relative bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Tabs */}
            <div className="flex items-center gap-2 px-4 pt-4 border-b border-white/5 overflow-x-auto hide-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-primary text-white' 
                      : 'border-transparent text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <button 
                onClick={handleCopy}
                className="p-2 hover:bg-white/5 rounded text-text-tertiary hover:text-white transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Code Content */}
            <div className="p-6 overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-mono leading-relaxed"
                >
                  <code className="text-[#c9d1d9]">
                    {CODE_SNIPPETS[activeTab].split('\n').map((line, i) => (
                      <div key={i} className="table-row">
                        <span className="table-cell pr-6 text-[#484f58] select-none text-right">{i + 1}</span>
                        <span className={`table-cell whitespace-pre ${
                          line.trim().startsWith('#') ? 'text-[#8b949e]' : 
                          line.includes('const ') || line.includes('await ') ? 'text-[#ff7b72]' :
                          line.includes('fricta ') || line.includes('npm ') || line.includes('npx ') ? 'text-[#79c0ff]' :
                          line.includes('--') ? 'text-[#a5d6ff]' :
                          line.includes('https://') || line.includes('"') || line.includes("'") ? 'text-[#a5d6ff]' :
                          ''
                        }`}>
                          {line}
                        </span>
                      </div>
                    ))}
                  </code>
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
