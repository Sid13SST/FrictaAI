import { motion } from 'framer-motion';
import { UserCircle, Brain, Workflow, Eye, Fingerprint, Sparkles, BrainCircuit } from 'lucide-react';

const NodeConnection = ({ delay }: { delay: number }) => (
  <motion.div 
    className="absolute h-[1px] bg-gradient-to-r from-primary via-accent-secondary to-transparent"
    initial={{ width: 0, opacity: 0 }}
    whileInView={{ width: '100%', opacity: [0, 1, 0] }}
    viewport={{ once: true }}
    transition={{ duration: 2, repeat: Infinity, delay, ease: "linear" }}
  />
);

export function AiIntelligence() {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase">Cognitive Engine</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-6"
          >
            Not just bots. <br />
            <span className="text-text-tertiary">Context-aware Personas.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Text Content */}
          <div className="space-y-12">
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex gap-6"
            >
              <div className="w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Dynamic Personas</h3>
                <p className="text-text-tertiary leading-relaxed">
                  Fricta doesn't just click randomly. You define personas (e.g., "Elderly user, low tech literacy" or "Power user, keyboard navigation") and the agent adopts their behavior, reading speed, and likely mistakes.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex gap-6"
            >
              <div className="w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center shrink-0">
                <Eye className="w-6 h-6 text-[#FFBD2E]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Computer Vision</h3>
                <p className="text-text-tertiary leading-relaxed">
                  Agents literally "see" your UI. They understand layout, contrast, and visual hierarchy, allowing them to detect if a button is obscured by a chat widget or if text is unreadable.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex gap-6"
            >
              <div className="w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-[#FF5F56]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Heuristic Reasoning</h3>
                <p className="text-text-tertiary leading-relaxed">
                  When a flow breaks, Fricta reasons about *why*. Instead of throwing a dumb timeout error, it explains: "I couldn't complete checkout because the 'State' dropdown didn't populate after entering the Zip code."
                </p>
              </div>
            </motion.div>

          </div>

          {/* Right: Neural Visual */}
          <div className="relative h-[500px] flex items-center justify-center">
            
            {/* Center Brain Node */}
            <motion.div 
              className="absolute z-30 w-24 h-24 rounded-full bg-card border-2 border-primary shadow-[0_0_50px_rgba(94,210,156,0.3)] flex items-center justify-center"
              animate={{ boxShadow: ['0 0 30px rgba(94,210,156,0.2)', '0 0 70px rgba(94,210,156,0.6)', '0 0 30px rgba(94,210,156,0.2)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src="/logo.png" alt="Fricta Engine" className="w-12 h-12 rounded-xl shadow-lg relative z-10 object-cover" />
            </motion.div>

            {/* Orbiting Nodes */}
            <motion.div 
              className="absolute w-[300px] h-[300px] border border-white/5 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg">
                <Workflow className="w-5 h-5 text-white/70" />
              </div>
              <div className="absolute bottom-1/4 right-0 translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg">
                <Fingerprint className="w-4 h-4 text-white/70" />
              </div>
            </motion.div>

            <motion.div 
              className="absolute w-[450px] h-[450px] border border-white/5 rounded-full border-dashed"
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-full bg-card border border-[#FFBD2E]/30 flex items-center justify-center shadow-lg">
                <Eye className="w-6 h-6 text-[#FFBD2E]" />
              </div>
              <div className="absolute top-1/4 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg">
                 <UserCircle className="w-4 h-4 text-white/70" />
              </div>
            </motion.div>

            {/* Firing Synapses */}
            <div className="absolute inset-0 z-20 opacity-50">
               <div className="absolute top-[20%] left-[20%] w-[100px] origin-left rotate-45"><NodeConnection delay={0} /></div>
               <div className="absolute top-[30%] right-[20%] w-[150px] origin-left rotate-135"><NodeConnection delay={1.5} /></div>
               <div className="absolute bottom-[30%] left-[30%] w-[120px] origin-left -rotate-45"><NodeConnection delay={0.7} /></div>
               <div className="absolute bottom-[20%] right-[30%] w-[180px] origin-left -rotate-135"><NodeConnection delay={2.2} /></div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
