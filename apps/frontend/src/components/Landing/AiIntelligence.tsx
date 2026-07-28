import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Brain, Workflow, Eye, Fingerprint, Sparkles, BrainCircuit, Zap, Activity, Bot, Target, Search, Network, Shield, MousePointer2, Terminal } from 'lucide-react';

const NodeConnection = ({ delay }: { delay: number }) => (
  <motion.div 
    className="absolute h-[1px] bg-gradient-to-r from-primary via-accent-secondary to-transparent"
    initial={{ width: 0, opacity: 0 }}
    whileInView={{ width: '100%', opacity: [0, 1, 0] }}
    viewport={{ once: true }}
    transition={{ duration: 2, repeat: Infinity, delay, ease: "linear" }}
  />
);

const features = [
  // LEFT SIDE
  { icon: UserCircle, title: 'Dynamic Personas', desc: 'Adopts distinct user behaviors.', color: 'text-primary', style: { right: 'calc(50% + 180px)', top: '0px' } },
  { icon: Eye, title: 'Computer Vision', desc: 'Analyzes visual UI layouts.', color: 'text-[#FFBD2E]', style: { right: 'calc(50% + 360px)', top: '85px' } },
  { icon: Brain, title: 'Heuristic Reasoning', desc: 'Explains why test flows break.', color: 'text-[#FF5F56]', style: { right: 'calc(50% + 440px)', top: '180px' } },
  { icon: Target, title: 'Smart Locators', desc: 'Reliable despite CSS mutations.', color: 'text-[#4bc089]', style: { right: 'calc(50% + 280px)', top: '275px' } },
  { icon: Terminal, title: 'Syntax Generation', desc: 'Generates perfect test scripts.', color: 'text-white', style: { right: 'calc(50% + 420px)', top: '370px' } },
  { icon: BrainCircuit, title: 'DOM Analysis', desc: 'Understands Shadow DOMs.', color: 'text-primary', style: { right: 'calc(50% + 260px)', top: '465px' } },
  { icon: Sparkles, title: 'Self-Healing', desc: 'Repairs broken scripts live.', color: 'text-white', style: { right: 'calc(50% + 390px)', top: '560px' } },
  { icon: Activity, title: 'State Awareness', desc: 'Monitors real-time state.', color: 'text-[#4bc089]', style: { right: 'calc(50% + 160px)', top: '650px' } },
  
  // RIGHT SIDE
  { icon: Network, title: 'Network Intercept', desc: 'Correlates API responses.', color: 'text-primary', style: { left: 'calc(50% + 200px)', top: '25px' } },
  { icon: MousePointer2, title: 'Interaction Mocks', desc: 'Simulates human mouse paths.', color: 'text-[#FF5F56]', style: { left: 'calc(50% + 380px)', top: '115px' } },
  { icon: Shield, title: 'Security Audit', desc: 'Detects vulnerabilities natively.', color: 'text-[#FFBD2E]', style: { left: 'calc(50% + 270px)', top: '210px' } },
  { icon: Workflow, title: 'Auto Exploration', desc: 'Discovers undocumented flows.', color: 'text-white', style: { left: 'calc(50% + 440px)', top: '305px' } },
  { icon: Fingerprint, title: 'Identity Configs', desc: 'Manages complex auth states.', color: 'text-[#4bc089]', style: { left: 'calc(50% + 290px)', top: '400px' } },
  { icon: Zap, title: 'Instant Execution', desc: 'Sub-millisecond latency.', color: 'text-[#FFBD2E]', style: { left: 'calc(50% + 420px)', top: '495px' } },
  { icon: Search, title: 'Layout Discovery', desc: 'Analyzes deep component trees.', color: 'text-white', style: { left: 'calc(50% + 250px)', top: '590px' } },
  { icon: Bot, title: 'Swarm Agents', desc: 'Collaborative intelligence.', color: 'text-primary', style: { left: 'calc(50% + 140px)', top: '670px' } }
];

const FeatureCard = ({ feat }: { feat: any }) => (
  <motion.div
    className="absolute flex items-center gap-3 w-[230px] bg-[#0a0a0c]/80 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-lg group hover:border-primary/50 transition-colors z-20"
    style={feat.style}
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.3 }}
  >
    <div className="w-10 h-10 rounded-xl bg-card border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:border-primary/30 transition-colors">
      <feat.icon className={`w-5 h-5 ${feat.color}`} />
    </div>
    <div>
      <h4 className="text-[12px] font-bold text-white leading-tight mb-0.5">{feat.title}</h4>
      <p className="text-[10px] text-zinc-500 leading-tight group-hover:text-zinc-300 transition-colors">
        {feat.desc}
      </p>
    </div>
  </motion.div>
);

export function AiIntelligence() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="py-24 bg-transparent relative overflow-hidden font-sans">
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[1400px] mx-auto px-6 relative z-10">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
          >
            Not just bots. <br />
            <span className="text-text-tertiary">Context-aware Personas.</span>
          </motion.h2>
          <p className="text-zinc-500 font-mono text-sm max-w-2xl mx-auto">
            A centralized orchestration engine surrounded by specialized intelligence subsystems.
          </p>
        </div>

        {/* Mobile / tablet fallback: the orbital layout below is desktop-only
            by construction (absolute offsets up to ~440px from center), so
            smaller viewports get the same 16 capabilities as a plain grid. */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {features.map((feat, idx) => (
            <div
              key={`feat-mobile-${idx}`}
              className="flex items-center gap-3 bg-[#0a0a0c]/80 backdrop-blur-md p-3 rounded-2xl border border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-card border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <feat.icon className={`w-5 h-5 ${feat.color}`} />
              </div>
              <div>
                <h4 className="text-[12px] font-bold text-white leading-tight mb-0.5">{feat.title}</h4>
                <p className="text-[10px] text-zinc-500 leading-tight">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Organic Orbital Layout (desktop only) */}
        <div className="hidden lg:block relative w-full h-[750px] mt-10 max-w-[1200px] mx-auto">

          {mounted && features.map((feat, idx) => (
            <FeatureCard key={`feat-${idx}`} feat={feat} />
          ))}

          {/* CENTER ROTATING VISUAL */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none flex items-center justify-center">
              
              {/* Deep background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />

              <div className="relative w-[600px] h-[600px] flex items-center justify-center scale-90">
                {/* Center Brain Node */}
                <motion.div 
                  className="absolute z-40 w-32 h-32 rounded-full bg-[#0a0a0c] border-[3px] border-primary shadow-[0_0_60px_rgba(115,66,226,0.4)] flex items-center justify-center backdrop-blur-xl pointer-events-auto"
                  animate={{ boxShadow: ['0 0 40px rgba(115,66,226,0.3)', '0 0 80px rgba(115,66,226,0.7)', '0 0 40px rgba(115,66,226,0.3)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img src="/logo.png" alt="Fricta Engine" className="w-16 h-16 rounded-2xl shadow-2xl relative z-10 object-cover" />
                </motion.div>

                {/* Ring 1 - Inner */}
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <motion.div 
                    className="relative w-[280px] h-[280px] border border-primary/30 rounded-full pointer-events-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(115,66,226,0.3)]"><UserCircle className="w-5 h-5 text-primary" /></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#FF5F56]/50 flex items-center justify-center"><Brain className="w-5 h-5 text-[#FF5F56]" /></div>
                    <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#FFBD2E]/50 flex items-center justify-center"><Eye className="w-5 h-5 text-[#FFBD2E]" /></div>
                    <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#4bc089]/50 flex items-center justify-center"><Target className="w-5 h-5 text-[#4bc089]" /></div>
                  </motion.div>
                </div>

                {/* Ring 2 - Middle */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <motion.div 
                    className="relative w-[420px] h-[420px] border border-white/10 rounded-full border-dashed pointer-events-auto"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-white/30 flex items-center justify-center"><Terminal className="w-5 h-5 text-white" /></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-primary/30 flex items-center justify-center"><BrainCircuit className="w-5 h-5 text-primary" /></div>
                    <div className="absolute top-1/4 right-0 translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-white/30 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                    <div className="absolute bottom-1/4 left-0 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#4bc089]/30 flex items-center justify-center"><Activity className="w-5 h-5 text-[#4bc089]" /></div>
                    <div className="absolute top-1/4 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-primary/30 flex items-center justify-center"><Network className="w-5 h-5 text-primary" /></div>
                    <div className="absolute bottom-1/4 right-0 translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#FF5F56]/30 flex items-center justify-center"><MousePointer2 className="w-5 h-5 text-[#FF5F56]" /></div>
                  </motion.div>
                </div>

                {/* Ring 3 - Outer */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <motion.div 
                    className="relative w-[580px] h-[580px] border border-white/5 rounded-full border-dotted pointer-events-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#FFBD2E]/20 flex items-center justify-center"><Shield className="w-5 h-5 text-[#FFBD2E]" /></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-white/20 flex items-center justify-center"><Workflow className="w-5 h-5 text-white" /></div>
                    <div className="absolute top-1/4 right-0 translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#4bc089]/20 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-[#4bc089]" /></div>
                    <div className="absolute bottom-1/4 left-0 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-[#FFBD2E]/20 flex items-center justify-center"><Zap className="w-5 h-5 text-[#FFBD2E]" /></div>
                    <div className="absolute top-1/4 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-white/20 flex items-center justify-center"><Search className="w-5 h-5 text-white" /></div>
                    <div className="absolute bottom-1/4 right-0 translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#121214] border border-primary/20 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
                  </motion.div>
                </div>

                {/* Firing Synapses */}
                <div className="absolute inset-0 z-15 opacity-60 pointer-events-none">
                   <div className="absolute top-[35%] left-[35%] w-[80px] origin-left rotate-45"><NodeConnection delay={0} /></div>
                   <div className="absolute bottom-[35%] right-[35%] w-[80px] origin-left -rotate-135"><NodeConnection delay={0.5} /></div>
                   <div className="absolute top-[25%] right-[30%] w-[150px] origin-left rotate-135"><NodeConnection delay={1.2} /></div>
                   <div className="absolute bottom-[25%] left-[30%] w-[150px] origin-left -rotate-45"><NodeConnection delay={0.8} /></div>
                   <div className="absolute top-[15%] left-[20%] w-[220px] origin-left rotate-[35deg]"><NodeConnection delay={2.0} /></div>
                   <div className="absolute bottom-[20%] right-[15%] w-[200px] origin-left -rotate-[150deg]"><NodeConnection delay={1.8} /></div>
                </div>

              </div>
            </div>

        </div>
      </div>
    </section>
  );
}
