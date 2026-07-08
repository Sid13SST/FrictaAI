import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Github, ShieldCheck, CheckCircle2, BrainCircuit, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';



const MockDashboard = () => {
  return (
    <div className="relative w-full h-[500px] bg-card/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_80px_rgba(94,210,156,0.1)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-white/10 bg-background-alt/50 flex items-center px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <div className="mx-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Activity className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-xs text-text-secondary font-medium font-mono">Agent exploring acme.com...</span>
        </div>
      </div>

      {/* Main Browser Body */}
      <div className="flex-1 bg-background relative flex items-center justify-center p-8 overflow-hidden">
        
        {/* Mock Target Website */}
        <div className="w-full h-full max-w-lg bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col border border-white/10">
          <div className="h-10 border-b border-gray-200 flex items-center px-4 bg-gray-50">
            <div className="w-20 h-3 bg-gray-200 rounded" />
          </div>
          <div className="p-6 flex-1 flex flex-col gap-6">
            <div className="w-48 h-8 bg-gray-200 rounded" />
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 rounded border border-gray-200 w-full" />
              <div className="h-12 bg-gray-100 rounded border border-gray-200 w-full" />
            </div>
            <div className="h-12 bg-primary/20 border border-primary rounded animate-pulse w-32 mt-4" />
          </div>
          
          {/* Fake Mouse Pointer */}
          <motion.div 
            className="absolute w-5 h-5 z-50 drop-shadow-lg"
            animate={{
              x: [100, 300, 250, 100],
              y: [100, 200, 300, 100],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15H17.5C18.05 17.15 18.5 16.7 18.5 16.15V3.21C18.5 2.66 18.05 2.21 17.5 2.21H6.5C5.95 2.21 5.5 2.66 5.5 3.21Z" fill="#5ED29C" stroke="white" strokeWidth="1.5"/>
            </svg>
          </motion.div>
        </div>

        {/* Floating Thought Bubble overlay */}
        <motion.div 
          className="absolute bottom-8 right-8 bg-background border border-primary/20 rounded-lg p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <BrainCircuit className="w-4 h-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold">Reasoning</span>
            <span className="text-xs text-white font-mono">Found checkout form. Proceeding...</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export function HeroSection() {
  const [typewriterText, setTypewriterText] = useState("");
  const fullText = "Modern Software Teams.";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full h-[100dvh] pt-32 pb-20 flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left: Copy */}
        <div className="flex flex-col items-start z-30">


          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="font-display font-bold text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.15] text-white tracking-tight mb-6"
          >
            Autonomous UX Testing for <br />
            <span className="text-primary">{typewriterText}</span>
            <motion.span 
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="text-primary inline-block -ml-2"
            >
              |
            </motion.span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="font-inter text-lg text-text-secondary max-w-[540px] leading-[1.6] mb-10"
          >
            Fricta launches AI agents that navigate your application like real users, detect UX friction, capture browser replays, generate evidence, and deliver engineering-ready reports automatically.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-4 mb-12"
          >
            <Link to="/app" className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent-secondary rounded-full opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative px-8 py-4 bg-primary rounded-full flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                <span className="text-background-deep font-bold text-[15px]">Start Free</span>
                <ArrowRight className="w-5 h-5 text-background-deep group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            <button className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-[15px] flex items-center gap-2 transition-all duration-300">
              <Play className="w-4 h-4 fill-white" />
              Watch Demo
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap items-center gap-6 text-xs text-text-quaternary font-medium"
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
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 50 }}
          >
            <MockDashboard />
          </motion.div>


        </div>
      </div>
    </section>
  );
}
