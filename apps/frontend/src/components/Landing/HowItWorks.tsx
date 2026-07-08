import { motion } from 'framer-motion';
import { Terminal, Play, Eye, FileCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    num: "01",
    title: "Create Project",
    desc: "Connect your staging or production environment. Define basic personas or let Fricta infer them automatically.",
    icon: Terminal
  },
  {
    num: "02",
    title: "Launch Audit",
    desc: "Trigger a workflow via UI or CI/CD. Specify user goals like 'Complete checkout' or 'Upgrade to pro'.",
    icon: Play
  },
  {
    num: "03",
    title: "AI Explores",
    desc: "Autonomous agents navigate your UI, interacting with elements, detecting friction, and reasoning through blockers.",
    icon: Eye
  },
  {
    num: "04",
    title: "Get Report",
    desc: "Receive an engineering-ready report with browser replays, visual evidence, severity scores, and actionable fixes.",
    icon: FileCheck
  }
];

export function HowItWorks() {
  return (
    <section className="py-32 relative bg-background overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-[100%] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-6"
          >
            How Fricta Works
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-inter text-text-secondary text-lg max-w-2xl mx-auto"
          >
            A seamless, autonomous intelligence pipeline that integrates directly into your QA and release workflows.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
           
           {/* Animated connection line behind cards on desktop */}
           <div className="hidden lg:block absolute top-14 left-0 w-full h-[1px] bg-white/5 z-0">
             <motion.div 
               className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-1/3"
               animate={{ x: ["-100%", "300%"] }}
               transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
             />
           </div>
           
           {steps.map((step, index) => (
             <motion.div
               key={step.num}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
               className="relative z-10 bg-card/60 backdrop-blur-xl border border-white/5 hover:border-primary/30 p-8 rounded-2xl group transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-[0_0_30px_rgba(94,210,156,0.1)] overflow-hidden"
             >
               {/* Ambient idle glow inside the card */}
               <motion.div 
                 className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"
                 animate={{ opacity: [0.1, 0.4, 0.1] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
               />

               <div className="flex items-center justify-between mb-8 relative z-10">
                 <motion.div 
                   animate={{ y: [0, -6, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                   className="w-12 h-12 rounded-xl bg-background-deep border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 group-hover:bg-primary/20 transition-all duration-300 relative"
                 >
                    <motion.div 
                      className="absolute inset-0 bg-primary/30 blur-md rounded-xl"
                      animate={{ opacity: [0, 0.8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
                    />
                    <step.icon className="w-5 h-5 text-text-tertiary group-hover:text-primary transition-colors relative z-10" />
                 </motion.div>
                 <div className="text-sm font-mono text-white/20 group-hover:text-primary/50 transition-colors relative z-10">{step.num}</div>
               </div>
               
               <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 relative z-10">
                 {step.title}
                 <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
               </h3>
               
               <p className="text-text-tertiary text-sm leading-relaxed flex-1 relative z-10">
                 {step.desc}
               </p>

               {/* Step indicator glow on hover */}
               <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-2xl transition-colors duration-300 pointer-events-none" />
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
}
