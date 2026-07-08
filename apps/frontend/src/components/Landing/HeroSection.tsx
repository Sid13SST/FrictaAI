import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Github, ShieldCheck, CheckCircle2, BrainCircuit, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrambleText } from '../common/ScrambleText';


const MockDashboard = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 5);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const agentThoughts = [
    "Initializing Fricta Agent...",
    "Scanning DOM and computing layout...",
    "Simulating 'Power User' persona...",
    "Critical UX Friction detected on CTA.",
    "Generating engineering report..."
  ];

  return (
    <div className="relative w-full h-[550px] liquid-glass rounded-2xl border border-white/10 shadow-[0_0_80px_rgba(115, 66, 226,0.15)] flex flex-col overflow-hidden">
      
      {/* Dashboard Header */}
      <div className="h-12 border-b border-white/10 bg-white/5 flex items-center justify-between px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm" />
        </div>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-md border border-white/5">
          <Activity className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-xs text-white/70 font-mono tracking-tight">acme.com/checkout</span>
        </div>
        <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest flex items-center gap-2">
          <span>Target Active</span>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Agent Log Stream */}
        <div className="w-1/3 border-r border-white/10 bg-black/20 p-4 flex flex-col font-mono text-xs">
          <div className="flex items-center gap-2 mb-4 text-white/50 border-b border-white/10 pb-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            <span className="uppercase tracking-wider">Agent Stream</span>
          </div>
          
          <div className="flex flex-col gap-3 flex-1">
            {agentThoughts.map((thought, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: step >= i ? (step === i ? 1 : 0.4) : 0,
                  x: step >= i ? 0 : -10 
                }}
                className={`p-2 rounded border ${step === i ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(115, 66, 226,0.1)]' : 'bg-white/5 border-transparent text-white/40'}`}
              >
                <span className="opacity-50 mr-2">{'>'}</span>{thought}
              </motion.div>
            ))}
          </div>

          {/* Mini progress bar */}
          <div className="mt-auto pt-4">
            <div className="flex justify-between text-[10px] text-white/40 mb-1">
              <span>Audit Progress</span>
              <span>{Math.min(100, (step + 1) * 20)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${(step + 1) * 20}%` }}
                transition={{ ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel: The Mock Website */}
        <div className="flex-1 bg-[#f3f4f6] relative overflow-hidden flex items-center justify-center p-6">
          
          {/* Wireframe Mockup */}
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden relative">
            <div className="h-32 bg-gray-100 flex items-end p-4">
              <div className="w-3/4 h-6 bg-gray-200 rounded" />
            </div>
            
            <div className="p-6 space-y-4 relative">
              <div className="w-1/2 h-4 bg-gray-200 rounded" />
              <div className="space-y-2">
                <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded" />
                <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded" />
              </div>

              {/* The CTA Button */}
              <div className="relative mt-6">
                <motion.div 
                  className="w-full h-12 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold shadow-sm"
                  animate={{ 
                    opacity: step >= 3 ? 0.5 : 1,
                    scale: step === 3 ? 0.98 : 1
                  }}
                >
                  Complete Checkout
                </motion.div>
                
                {/* Friction Highlight */}
                {step >= 3 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 border-2 border-[#FF5F56] rounded bg-[#FF5F56]/10 flex items-center justify-center"
                  >
                    <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#FF5F56] flex items-center justify-center shadow-lg text-white font-bold text-xs">!</div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Fake Cookie Banner that blocks the CTA */}
            {step >= 2 && step <= 3 && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 text-white shadow-2xl z-20"
              >
                <div className="w-2/3 h-2 bg-gray-700 rounded mb-2" />
                <div className="w-1/2 h-2 bg-gray-700 rounded mb-4" />
                <div className="w-full h-8 bg-white/20 rounded" />
              </motion.div>
            )}

            {/* Simulated AI Cursor */}
            <motion.div 
              className="absolute z-50 pointer-events-none drop-shadow-xl"
              animate={{
                x: step === 0 ? 50 : step === 1 ? 150 : step === 2 ? 100 : step === 3 ? 160 : 300,
                y: step === 0 ? 50 : step === 1 ? 120 : step === 2 ? 280 : step === 3 ? 240 : 400,
                scale: step === 3 ? 0.9 : 1
              }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15H17.5C18.05 17.15 18.5 16.7 18.5 16.15V3.21C18.5 2.66 18.05 2.21 17.5 2.21H6.5C5.95 2.21 5.5 2.66 5.5 3.21Z" fill="#111" stroke="white" strokeWidth="2"/>
              </svg>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const blurFadeUp = {
    initial: { opacity: 0, filter: "blur(20px)", y: 40 },
    animate: { opacity: 1, filter: "blur(0px)", y: 0 },
  };

  return (
    <section className="relative w-full h-[100dvh] pt-32 pb-20 flex items-center overflow-hidden bg-transparent">
      
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left: Copy */}
        <div className="flex flex-col items-start z-30">
          

          <motion.h1 
            variants={blurFadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-bold text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.05] text-white tracking-tight mb-6"
          >
            Autonomous <br />
            <span className="text-primary">
              <ScrambleText text="UX Intelligence" delay={500} triggered={mounted} />
            </span>
          </motion.h1>

          <motion.p 
            variants={blurFadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-inter text-lg text-white/60 max-w-[540px] leading-[1.6] mb-10"
          >
            Fricta launches AI agents that navigate your application like real users, detect UX friction, capture browser replays, generate evidence, and deliver engineering-ready reports automatically.
          </motion.p>

          <motion.div 
            variants={blurFadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-4 mb-12"
          >
            <Link to="/app" className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent-secondary rounded-full opacity-50 blur-md group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative px-8 py-4 bg-primary rounded-full flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                <span className="text-background-deep font-bold text-[15px]">Start Free</span>
                <ArrowRight className="w-5 h-5 text-background-deep group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            <button className="liquid-glass px-8 py-4 rounded-full text-white font-medium text-[15px] flex items-center gap-2 hover:bg-white/10 transition-colors">
              <Play className="w-4 h-4 fill-white" />
              Watch Demo
            </button>
          </motion.div>

          <motion.div 
            variants={blurFadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-6 text-xs text-white/40 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <Github className="w-4 h-4" /> 
              <span>Open Source Core</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> 
              <span>SOC2 Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 
              <span>No credit card required</span>
            </div>
          </motion.div>
        </div>

        {/* Right: Interactive Visualization */}
        <div className="relative hidden lg:block z-20">
          <motion.div
            variants={blurFadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MockDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
