import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, FastForward, Rewind, Maximize2 } from 'lucide-react';

export function ReplayExperience() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) return 0;
          return p + 0.5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="py-32 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
        >
          Pixel-Perfect Replays
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-inter text-text-secondary text-lg max-w-2xl mx-auto"
        >
          Don't guess what went wrong. Watch exactly how the AI agent experienced your application, complete with DOM snapshots and network logs.
        </motion.p>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full aspect-[16/10] bg-background-deep rounded-2xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative group"
        >
          {/* Main Replay Area (Mocked Application UI) */}
          <div className="flex-1 relative overflow-hidden bg-white">
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000_100%),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000_100%)] bg-[length:20px_20px] [background-position:0_0,10px_10px]" />
            
            {/* Fake Content that moves based on progress */}
            <motion.div 
              className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gray-100 rounded-xl border border-gray-200 shadow-xl p-8 flex flex-col gap-4"
              style={{
                y: progress > 50 ? -20 : 0,
                opacity: progress > 80 ? 0.5 : 1
              }}
            >
              <div className="w-1/3 h-6 bg-gray-300 rounded" />
              <div className="flex-1 flex gap-4">
                <div className="w-2/3 h-full bg-gray-200 rounded" />
                <div className="w-1/3 h-full bg-gray-200 rounded" />
              </div>
              <motion.div 
                className="w-full h-12 rounded flex items-center justify-center font-bold text-white transition-colors duration-300"
                animate={{
                  backgroundColor: progress > 45 && progress < 55 ? "#FF5F56" : "#4f46e5"
                }}
              >
                Checkout
              </motion.div>
            </motion.div>

            {/* Simulated Mouse Trail */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 z-20">
              <motion.path 
                d="M 100 100 C 300 150, 400 300, 600 200 S 800 400, 700 500" 
                fill="none" 
                stroke="#7342e2" 
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress / 100 }}
              />
            </svg>

            {/* Simulated Mouse Pointer */}
            <motion.div 
              className="absolute w-6 h-6 z-30"
              style={{
                x: 100 + (progress / 100) * 600,
                y: 100 + Math.sin(progress / 10) * 100 + (progress / 100) * 400
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15H17.5C18.05 17.15 18.5 16.7 18.5 16.15V3.21C18.5 2.66 18.05 2.21 17.5 2.21H6.5C5.95 2.21 5.5 2.66 5.5 3.21Z" fill="#7342e2" stroke="#050505" strokeWidth="1.5"/>
              </svg>
              
              {/* Click Ripple */}
              <AnimatePresence>
                {(progress > 48 && progress < 52) && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-full bg-accent-secondary"
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* Visual Finding Popup overlay */}
            <AnimatePresence>
              {(progress > 45 && progress < 70) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-1/4 right-1/4 bg-card border border-[#FF5F56]/50 rounded-lg p-3 shadow-2xl z-40 max-w-[200px]"
                >
                  <div className="text-[#FF5F56] text-xs font-bold mb-1">High Severity</div>
                  <div className="text-white text-xs">Button unclickable due to z-index stacking context.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Replay Controls Footer */}
          <div className="h-16 bg-card border-t border-white/5 flex flex-col justify-end px-4 pb-2 relative">
            
            {/* Timeline */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5 cursor-pointer hover:h-2 transition-all group-hover:bg-white/10">
              <motion.div 
                className="h-full bg-primary relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              
              {/* Markers */}
              <div className="absolute left-[20%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />
              <div className="absolute left-[50%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF5F56] shadow-[0_0_10px_#FF5F56]" title="Friction Detected" />
              <div className="absolute left-[85%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <div className="flex items-center gap-2">
                  <button className="text-white/50 hover:text-white transition-colors"><Rewind className="w-4 h-4" /></button>
                  <button className="text-white/50 hover:text-white transition-colors"><FastForward className="w-4 h-4" /></button>
                </div>
                <div className="text-xs text-text-tertiary font-mono">
                  {Math.floor(progress / 100 * 60).toString().padStart(2, '0')}:{(Math.floor((progress / 100 * 60 * 100) % 100)).toString().padStart(2, '0')} / 01:00
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/50">1x</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-white">2x</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/50">4x</span>
                </div>
                <button className="text-white/50 hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
