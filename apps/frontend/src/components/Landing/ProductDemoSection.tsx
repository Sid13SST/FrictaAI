import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, AlertCircle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

const THOUGHTS = [
  "Initializing Persona: Tech-savvy millennial...",
  "Loading URL: https://acme.com/checkout",
  "Scanning DOM for interactive elements...",
  "Found [Checkout] button. Element is visible.",
  "Attempting click on [Checkout]...",
  "Error: Click intercepted by overlay #cookie-banner.",
  "Rethinking strategy. Need to dismiss overlay first.",
  "Locating close button on cookie banner...",
  "Found [Accept] button. Clicking...",
  "Overlay dismissed. Retrying [Checkout] click...",
  "Navigation successful. Reached /payment.",
  "Scanning payment form inputs...",
];

const FINDINGS = [
  { id: 1, type: 'blocker', title: 'Cookie Banner Intercepts Click', severity: 'high', time: '00:12' },
  { id: 2, type: 'a11y', title: 'Missing aria-label on card input', severity: 'medium', time: '00:15' },
];

export function ProductDemoSection() {
  const [activeThoughts, setActiveThoughts] = useState<string[]>([]);
  const [activeFindings, setActiveFindings] = useState<typeof FINDINGS>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progression
    let thoughtIndex = 0;
    const thoughtInterval = setInterval(() => {
      if (thoughtIndex < THOUGHTS.length) {
        setActiveThoughts(prev => [...prev.slice(-4), THOUGHTS[thoughtIndex]]);
        setProgress((thoughtIndex / THOUGHTS.length) * 100);
        
        // Trigger findings at specific points
        if (thoughtIndex === 5 && activeFindings.length === 0) {
          setActiveFindings([FINDINGS[0]]);
        }
        if (thoughtIndex === 11 && activeFindings.length === 1) {
          setActiveFindings([...FINDINGS]);
        }
        
        thoughtIndex++;
      } else {
        // Reset loop
        thoughtIndex = 0;
        setActiveThoughts([]);
        setActiveFindings([]);
        setProgress(0);
      }
    }, 1500);

    return () => clearInterval(thoughtInterval);
  }, []);

  return (
    <section className="py-32 bg-transparent relative overflow-hidden">
      {/* Reactive Focus Blur Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] blur-[150px] rounded-[100%]"
          animate={{
            backgroundColor: 'rgba(115, 66, 226, 0.08)',
            scale: activeFindings.length > 0 ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 2, ease: "easeInOut", repeat: activeFindings.length > 0 ? Infinity : 0 }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
          >
            See It In Action
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-inter text-text-secondary text-lg max-w-2xl mx-auto"
          >
            Watch the Fricta Agent autonomously navigate, reason, and discover issues in real-time.
          </motion.p>
        </div>

        {/* Fricta App Window */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[700px]"
        >
          {/* Header */}
          <div className="h-14 border-b border-white/10 bg-transparent flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
               <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <div className="w-3 h-3 rounded-full bg-white/20" />
               </div>
               <div className="h-6 w-[1px] bg-white/10" />
               <div className="flex items-center gap-2 text-sm text-text-secondary font-medium">
                 <span>Project: Acme Checkout Flow</span>
                 <ChevronRight className="w-4 h-4 text-white/30" />
                 <span className="text-white">Workflow #8492</span>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Activity className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-xs text-primary font-mono">Running</span>
              </div>
              <span className="text-xs text-text-tertiary font-mono font-medium">00:24s elapsed</span>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Thought Stream */}
            <div className="w-[300px] border-r border-white/10 bg-background-deep/50 flex flex-col p-4">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-4 h-4 text-accent-secondary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Agent Reasoner</span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 flex flex-col justify-end gap-3 pb-4">
                  <AnimatePresence>
                    {activeThoughts.map((thought, i) => (
                      <motion.div 
                        key={`${thought}-${i}`}
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: i === activeThoughts.length - 1 ? 1 : 0.5, x: 0, height: 'auto' }}
                        exit={{ opacity: 0 }}
                        className="text-xs font-mono text-primary bg-primary/5 border border-primary/10 rounded p-2"
                      >
                        <span className="text-white/40 mr-2">{'>'}</span>{thought}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Center: Live Replay View */}
            <div className="flex-1 bg-transparent relative flex flex-col">
              <div className="p-2 border-b border-white/5 flex items-center gap-2 bg-card">
                <div className="flex-1 bg-background-deep rounded border border-white/5 px-3 py-1 flex items-center gap-2">
                  <span className="text-[10px] text-white/30">URL</span>
                  <span className="text-xs text-white/70 font-mono">https://acme.com/checkout</span>
                </div>
              </div>
              
              <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {/* Mock Target Website */}
                <div className="w-[90%] max-w-[500px] h-[80%] max-h-[350px] bg-white rounded-lg shadow-2xl relative overflow-hidden border border-gray-200 flex flex-col font-sans">
                  {/* Fake Nav */}
                  <div className="h-10 border-b border-gray-100 flex items-center px-4 justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-600 rounded-sm" />
                      <span className="text-gray-900 font-bold text-xs tracking-tight">ACME STORE</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-1.5 bg-gray-300 rounded-full" />
                      <div className="w-8 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                  </div>

                  {/* Fake Body */}
                  <div className="flex-1 p-5 flex gap-6 relative z-10">
                    {/* Left: Form */}
                    <div className="flex-1 flex flex-col">
                      <h1 className="text-gray-900 font-bold text-lg mb-4">Checkout</h1>
                      
                      <div className="space-y-4">
                         {/* Email Input */}
                         <div className="space-y-1.5">
                           <div className="w-12 h-2 bg-gray-300 rounded-full" />
                           <div className="h-8 border border-gray-200 rounded px-2 flex items-center bg-white">
                             <div className="w-24 h-2 bg-gray-200 rounded-full" />
                           </div>
                         </div>
                         
                         {/* Card Input (Finding 2) */}
                         <div className="space-y-1.5 relative">
                           <div className="w-20 h-2 bg-gray-300 rounded-full" />
                           <div className={`h-8 border rounded flex items-center px-2 gap-2 relative bg-white transition-colors duration-300 ${progress > 85 ? 'border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(115,66,226,0.2)]' : 'border-gray-200'}`}>
                             <div className="w-5 h-3 bg-gray-300 rounded-sm" />
                             <div className="w-32 h-2 bg-gray-200 rounded-full" />
                             
                             {/* Fricta highlight overlay */}
                             <AnimatePresence>
                               {progress > 85 && (
                                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-6 right-0 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-20 whitespace-nowrap">
                                   Missing aria-label
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
                         </div>

                         {/* Submit Button (Finding 1) */}
                         <div className="mt-4 relative">
                           <div className="h-9 bg-blue-600 rounded text-white text-[11px] font-bold flex items-center justify-center w-full shadow-sm">
                             Complete Checkout
                           </div>
                           
                           {/* Blocker highlight */}
                           <AnimatePresence>
                             {progress > 35 && progress < 75 && (
                               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 border-2 border-dashed border-primary rounded bg-primary/10 flex items-center justify-center pointer-events-none z-20">
                                 <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                   Click Intercepted
                                 </span>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                      </div>
                    </div>

                    {/* Right: Order Summary */}
                    <div className="w-32 bg-gray-50/80 border border-gray-100 rounded-md p-3 flex flex-col gap-3 h-fit">
                      <div className="w-16 h-2 bg-gray-400 rounded-full mb-1" />
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded" />
                        <div className="flex flex-col gap-1.5 items-end">
                          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                          <div className="w-8 h-1.5 bg-gray-200 rounded-full" />
                        </div>
                      </div>
                      <div className="border-t border-gray-200 my-1" />
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-2 bg-gray-400 rounded-full" />
                        <div className="w-12 h-2 bg-gray-900 rounded-full" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Fake Cookie Banner */}
                  <AnimatePresence>
                    {progress > 10 && progress < 75 && (
                      <motion.div 
                        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                        className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-between items-center z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.15)]"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="text-white text-xs font-bold leading-none">We value your privacy</span>
                          <span className="text-gray-400 text-[9px] leading-none">We use cookies to enhance your experience.</span>
                        </div>
                        <div className="px-3 py-1.5 bg-white rounded text-[10px] font-bold text-gray-900 shadow-sm cursor-default">
                          Accept All
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Fake Mouse Pointer */}
                  <motion.div 
                    className="absolute w-4 h-4 z-50 drop-shadow-md"
                    animate={{
                      x: progress < 40 ? 150 : (progress < 75 ? 350 : 150),
                      y: progress < 40 ? 210 : (progress < 75 ? 290 : 210),
                    }}
                    transition={{ type: "spring", stiffness: 60, damping: 25 }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15H17.5C18.05 17.15 18.5 16.7 18.5 16.15V3.21C18.5 2.66 18.05 2.21 17.5 2.21H6.5C5.95 2.21 5.5 2.66 5.5 3.21Z" fill="black" stroke="white" strokeWidth="2"/>
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-white/5 w-full">
                <motion.div 
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Right: Findings */}
            <div className="w-[300px] border-l border-white/10 bg-background-deep/50 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-white" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Live Findings</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white">{activeFindings.length}</span>
              </div>
              
              <div className="flex-1 flex flex-col gap-3">
                <AnimatePresence>
                  {activeFindings.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-text-tertiary flex items-center gap-2 italic">
                      <CheckCircle2 className="w-3 h-3" /> No friction detected yet...
                    </motion.div>
                  )}
                  {activeFindings.map((finding) => (
                    <motion.div 
                      key={finding.id}
                      initial={{ opacity: 0, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className="bg-card border border-white/10 p-3 rounded-lg flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          {finding.severity}
                        </span>
                        <span className="text-[10px] text-text-tertiary font-mono">{finding.time}</span>
                      </div>
                      <span className="text-xs font-medium text-white">{finding.title}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>
    </section>
  );
}
