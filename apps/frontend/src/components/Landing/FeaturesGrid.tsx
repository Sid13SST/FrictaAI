import { motion } from 'framer-motion';
import { 
  Bot, PlaySquare, FileSearch, Accessibility, 
  Zap, Route, Target, AlertTriangle, 
  FileDown, Clock, Activity, Lightbulb, 
  Map, Eye 
} from 'lucide-react';

const features = [
  { icon: Bot, title: 'AI Agents', desc: 'Autonomous bots that navigate your app like real users.' },
  { icon: PlaySquare, title: 'Browser Replay', desc: 'Watch exact session replays of friction points.' },
  { icon: FileSearch, title: 'Evidence Collection', desc: 'Automatically gathers DOM snapshots and console logs.' },
  { icon: Accessibility, title: 'Accessibility', desc: 'Detects a11y violations during complex user flows.' },
  { icon: Zap, title: 'Performance', desc: 'Measures load times and interaction delays.' },
  { icon: Route, title: 'Journey Analysis', desc: 'Maps out successful vs failed user journeys.' },
  { icon: Target, title: 'UX Findings', desc: 'Pinpoints exact locations of user confusion.' },
  { icon: AlertTriangle, title: 'Severity Detection', desc: 'Prioritizes issues by business impact.' },
  { icon: FileDown, title: 'Report Export', desc: 'Export actionable data to PDF or JSON.' },
  { icon: Clock, title: 'Session Timeline', desc: 'Chronological breakdown of agent actions.' },
  { icon: Activity, title: 'Live Monitoring', desc: 'Watch agents test your app in real-time.' },
  { icon: Lightbulb, title: 'Smart Recommendations', desc: 'AI-generated code fixes for identified issues.' },
  { icon: Map, title: 'Heatmaps', desc: 'Visual overlays of agent focus and rage clicks.' },
  { icon: Eye, title: 'Visual Regression', desc: 'Detects UI breaks across different viewports.' },
];

const row1 = features.slice(0, 7);
const row2 = features.slice(7, 14);

const FeatureCard = ({ feature }: { feature: typeof features[0] }) => {
  const Icon = feature.icon;
  return (
    <div className="w-[320px] md:w-[380px] shrink-0 group relative bg-card/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 hover:border-primary/50 transition-all duration-500 hover:bg-card hover:shadow-[0_0_40px_rgba(115, 66, 226,0.15)] overflow-hidden cursor-default">
      {/* Background flare on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="w-12 h-12 rounded-xl bg-background-deep border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary/50 group-hover:bg-primary/20 transition-all duration-500 relative z-10 shadow-lg group-hover:shadow-primary/20">
         <Icon className="w-5 h-5 text-text-tertiary group-hover:text-primary transition-colors" />
      </div>
      
      <h3 className="font-display font-bold text-lg md:text-xl text-white mb-2 relative z-10 transition-colors group-hover:text-primary/90">{feature.title}</h3>
      <p className="font-inter text-sm md:text-base text-text-tertiary leading-relaxed relative z-10">
        {feature.desc}
      </p>

      {/* Animated corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-tr-2xl" />
    </div>
  );
};

const MarqueeRow = ({ row, reverse }: { row: typeof features, reverse?: boolean }) => {
  return (
    <div 
      className="flex w-max hover:[animation-play-state:paused] transition-transform"
      style={{
        animation: `${reverse ? 'scroll-right' : 'scroll-left'} 45s linear infinite`
      }}
    >
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-6 pr-6">
           {row.map((f, j) => <FeatureCard key={j} feature={f} />)}
        </div>
      ))}
    </div>
  );
};

export function FeaturesGrid() {
  return (
    <section className="py-32 bg-transparent relative overflow-hidden flex flex-col border-y border-white/5">
      
      {/* Dynamic Keyframes for Marquee */}
      <style>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }
        @keyframes scroll-right {
          from { transform: translateX(-25%); }
          to { transform: translateX(0); }
        }
      `}</style>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-primary/5 blur-[150px] pointer-events-none rounded-[100%]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="text-center mb-16">


          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
          >
            Everything you need.
            <br className="md:hidden" /> <span className="text-primary">Nothing you don't.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-inter text-text-secondary text-lg max-w-2xl mx-auto"
          >
            Audit, analyze, and optimize your user experience autonomously with our comprehensive suite of intelligence tools.
          </motion.p>
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-6 mt-4">
        {/* Cinematic Fade Edges */}
        <div className="absolute inset-y-0 left-0 w-16 md:w-48 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 md:w-48 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

        <MarqueeRow row={row1} />
        <MarqueeRow row={row2} reverse />
      </div>

    </section>
  );
}
