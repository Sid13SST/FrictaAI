import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = ['Product', 'Solutions', 'Enterprise', 'Pricing', 'Docs', 'GitHub'];

export function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
          isScrolled 
            ? 'bg-background-deep/70 backdrop-blur-md border-b border-white/5 py-4' 
            : 'bg-transparent py-6'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-card border border-white/10 flex items-center justify-center overflow-hidden relative">
              <img src="/logo.png" alt="Fricta" className="w-full h-full object-cover relative z-10" />
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-white font-display font-semibold text-lg tracking-tight">Fricta</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-[14px] font-inter text-text-secondary hover:text-white transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/sign-in" className="text-[14px] font-inter text-text-secondary hover:text-white transition-colors duration-200">
              Sign In
            </Link>
            
            {/* Get Started Button (Animated Border, Hover Glow) */}
            <Link to="/app" className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent-secondary rounded-full opacity-50 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
              <div className="relative px-5 py-2 bg-card rounded-full border border-white/10 group-hover:border-transparent transition-colors duration-300">
                <span className="text-[14px] font-inter font-medium text-white group-hover:text-primary transition-colors duration-300">
                  Get Started
                </span>
              </div>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-background-deep/95 backdrop-blur-lg flex flex-col">
          <div className="flex justify-end p-6">
            <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-display font-medium text-text-secondary hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
            <div className="mt-8 flex flex-col items-center gap-4">
              <Link to="/sign-in" onClick={() => setMobileMenuOpen(false)} className="text-lg text-text-secondary">Sign In</Link>
              <Link 
                to="/app" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-8 py-3 bg-primary text-background-deep font-semibold rounded-full hover:bg-accent-secondary transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
