import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Play, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center">
          <img src="/logo.png" alt="Fricta Logo" className="w-8 h-8 mr-2 rounded-md object-cover" />
          <span className="font-semibold text-xl tracking-tight">Fricta</span>
        </div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium text-foreground/70">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#demo" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link to="/app" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
          <Link to="/app" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors border border-white/10">
            Start Free
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10"></div>
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary font-medium"
            >
              <Zap className="w-4 h-4 mr-2" /> Fricta Engine v1.0 is live
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 leading-tight"
            >
              Find user friction <br /> before your users do.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed"
            >
              AI-powered UX testing that simulates real users and reveals workflow confusion, navigation issues, and onboarding weaknesses before launch.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center space-x-4 pt-4"
            >
              <Link to="/app" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-medium transition-all shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center group">
                Run AI UX Test <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="bg-card hover:bg-card/80 border border-border text-foreground px-8 py-4 rounded-lg font-medium transition-all flex items-center">
                <Play className="mr-2 w-4 h-4" /> Watch Demo
              </button>
            </motion.div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="py-24 px-8 bg-black/50 border-t border-white/5" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Autonomous Agents', desc: 'Deploy AI agents that behave like real users with specific goals and technical proficiencies.', icon: Activity },
                { title: 'Friction Analysis', desc: 'Identify exact DOM elements and flow steps that cause hesitation or rage clicks.', icon: Zap },
                { title: 'Zero Integration', desc: 'No SDKs or code changes required. Point Fricta at any URL and let the engine run.', icon: Shield },
              ].map((feature, i) => (
                <div key={i} className="bg-card/50 border border-white/5 p-8 rounded-2xl backdrop-blur-sm">
                  <feature.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-foreground/60">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border text-center text-foreground/40 text-sm">
        <p>© 2026 Fricta AI. All rights reserved.</p>
      </footer>
    </div>
  );
};
