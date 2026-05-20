import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicBackground } from '../components/CinematicBackground';

// ─── Constants ──────────────────────────────────────────────────────────────

const NAV_LINKS = ['PLATFORM', 'REPORTS', 'SOLUTIONS', 'LEARNING'];

// ─── Liquid Glass Intelligence Card ─────────────────────────────────────────

function IntelligenceCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="liquid-glass rounded-2xl w-[200px] h-[200px] p-5 flex flex-col justify-between -translate-y-[50px] mb-0"
    >
      {/* Top label */}
      <span className="text-[14px] uppercase tracking-widest text-white/40 font-inter relative z-10">
        [ AI UX ]
      </span>

      {/* Main headline */}
      <div className="relative z-10">
        <h3 className="text-[18px] leading-[1.25] text-white/90 font-inter">
          Autonomous UX{' '}
          <span className="font-serif italic text-white/80">Intelligence</span>
        </h3>
      </div>

      {/* Description */}
      <p className="text-[11px] leading-[1.45] text-white/40 font-inter relative z-10">
        AI agents that simulate real users, navigate workflows, and expose friction before launch.
      </p>
    </motion.div>
  );
}

// ─── Mobile Menu ────────────────────────────────────────────────────────────

function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-[#070b0a]/95 backdrop-blur-md flex flex-col"
        >
          {/* Close button */}
          <div className="flex justify-end p-6">
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav links */}
          <div className="flex-1 flex flex-col items-center justify-center gap-10">
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link}
                href="#"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="text-2xl font-inter font-medium tracking-wide text-white/80 hover:text-accent transition-colors"
                onClick={onClose}
              >
                {link}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                to="/app"
                className="btn-primary-cta rounded-full px-8 py-3 text-sm font-bold inline-flex items-center gap-2"
                onClick={onClose}
              >
                Start Testing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────────────

export const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <CinematicBackground>
      {/* ── Header / Navbar ───────────────────────────────────────────── */}
      <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Fricta"
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="text-white font-inter font-semibold text-lg tracking-tight hidden sm:block">
            Fricta
          </span>
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-[16px] font-inter font-medium text-white/60 hover:text-accent tracking-wide transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right: CTA + Hamburger */}
        <div className="flex items-center gap-4">
          <Link
            to="/app"
            className="hidden md:inline-flex btn-hero-secondary rounded-full px-5 py-2 text-sm font-medium"
          >
            Start Testing
          </Link>
          <button
            className="lg:hidden text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ── Navbar Divider ────────────────────────────────────────────── */}
      <div className="navbar-divider" />

      {/* ── Hero Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center px-6 md:px-10 lg:px-20">
        <div className="w-full max-w-[720px]">

          {/* ── Floating Intelligence Card ─────────────────────────── */}
          <div className="hidden md:block">
            <IntelligenceCard />
          </div>

          {/* ── Eyebrow ────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-jakarta font-bold text-[11px] uppercase tracking-[0.2em] text-accent mb-6"
          >
            AUTONOMOUS UX TESTING
          </motion.p>

          {/* ── Headline ───────────────────────────────────────────── */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="font-inter font-extrabold uppercase tracking-tight text-white text-[40px] md:text-[56px] lg:text-[72px] leading-[1.05]"
          >
            FIND USER FRICTION
            <br />
            BEFORE THEY DO
            <span className="text-accent">.</span>
          </motion.h1>

          {/* ── Description ────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="font-inter text-[14px] text-white/70 max-w-[512px] leading-[1.7] mt-6"
          >
            Fricta autonomously simulates realistic users, navigates workflows,
            detects usability friction, and reveals where onboarding and product
            experiences break down before real customers encounter them.
          </motion.p>

          {/* ── CTA ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-8"
          >
            <Link
              to="/app"
              className="btn-primary-cta rounded-full px-7 py-3.5 text-[13px] font-bold inline-flex items-center gap-2.5 group"
            >
              Run AI UX Test
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── Mobile Menu ───────────────────────────────────────────────── */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </CinematicBackground>
  );
};
