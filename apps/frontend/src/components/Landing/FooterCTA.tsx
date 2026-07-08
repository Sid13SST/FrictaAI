import { motion } from 'framer-motion';
import { ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FooterCTA() {
  return (
    <footer className="relative bg-background overflow-hidden border-t border-white/5">
      
      {/* Aurora Background for CTA */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-r from-primary/20 via-accent-secondary/10 to-primary/20 blur-[100px] opacity-40 pointer-events-none" />

      {/* CTA Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24 text-center border-b border-white/5">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display font-bold text-5xl md:text-7xl text-white mb-6 tracking-tight"
        >
          Ship better UX. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-secondary">Autonomously.</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-inter text-text-secondary text-lg max-w-2xl mx-auto mb-10"
        >
          Stop writing brittle E2E tests. Let Fricta's AI agents explore your application, find friction, and generate evidence-backed reports.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/app" className="group relative">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent-secondary rounded-full opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative px-8 py-4 bg-primary rounded-full flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-0.5 shadow-[0_0_30px_rgba(94,210,156,0.3)]">
              <span className="text-background-deep font-bold text-[15px]">Start Free Trial</span>
              <ArrowRight className="w-5 h-5 text-background-deep group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <button className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-[15px] transition-colors">
            Contact Sales
          </button>
        </motion.div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 group mb-6 inline-flex">
              <div className="w-8 h-8 rounded-lg bg-card border border-white/10 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Fricta" className="w-full h-full object-cover" />
              </div>
              <span className="text-white font-display font-semibold text-lg tracking-tight">Fricta</span>
            </Link>
            <p className="text-text-tertiary text-sm leading-relaxed max-w-xs mb-8">
              The autonomous UX intelligence platform for modern software teams.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary hover:text-white hover:bg-white/10 transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary hover:text-white hover:bg-white/10 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary hover:text-white hover:bg-white/10 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">AI Agents</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Browser Replay</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Accessibility</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Integrations</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">API Reference</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Community</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">OSS Core</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">About</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Careers <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded ml-2 uppercase font-bold">Hiring</span></a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Security</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-text-tertiary hover:text-white transition-colors text-sm">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 text-sm text-text-quaternary">
          <p>© {new Date().getFullYear()} Fricta, Inc. All rights reserved.</p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
