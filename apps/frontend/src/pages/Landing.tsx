import { useEffect } from 'react';
import Lenis from 'lenis';

// Components
import { CustomCursor } from '../components/Landing/CustomCursor';
import { AnimatedBackground } from '../components/Landing/AnimatedBackground';
import { Navbar } from '../components/Landing/Navbar';
import { HeroSection } from '../components/Landing/HeroSection';
import { HowItWorks } from '../components/Landing/HowItWorks';
import { FeaturesGrid } from '../components/Landing/FeaturesGrid';
import { ProductDemoSection } from '../components/Landing/ProductDemoSection';
import { ReplayExperience } from '../components/Landing/ReplayExperience';
import { AiIntelligence } from '../components/Landing/AiIntelligence';
import { MetricsSection } from '../components/Landing/MetricsSection';
import { DeveloperExperience } from '../components/Landing/DeveloperExperience';
import { TestimonialsSection } from '../components/Landing/TestimonialsSection';
import { PricingFAQSection } from '../components/Landing/PricingFAQSection';
import { FooterCTA } from '../components/Landing/FooterCTA';

export const Landing = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <div className="relative bg-background text-text-primary selection:bg-primary/30 min-h-screen">
      <CustomCursor />
      <AnimatedBackground />
      <Navbar />
      
      <main>
        <HeroSection />
        <HowItWorks />
        <FeaturesGrid />
        <ProductDemoSection />
        <ReplayExperience />
        <AiIntelligence />
        <MetricsSection />
        <DeveloperExperience />
        <TestimonialsSection />
        <PricingFAQSection />
      </main>

      <FooterCTA />
    </div>
  );
};
