import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const AnimatedCounter = ({ from, to, duration, suffix = "", prefix = "" }: any) => {
  const [count, setCount] = useState(from);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * (to - from) + from));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);

    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, from, to, duration]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
};

export function MetricsSection() {
  return (
    <section className="py-24 border-y border-white/5 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="font-display font-bold text-5xl md:text-7xl text-white mb-4 tracking-tight">
              <AnimatedCounter from={0} to={98} duration={2} suffix="%" />
            </div>
            <div className="font-inter text-text-tertiary text-lg font-medium">Detection Accuracy</div>
            <div className="text-sm text-text-quaternary mt-2">Versus traditional scripted E2E</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="font-display font-bold text-5xl md:text-7xl text-primary mb-4 tracking-tight">
              <AnimatedCounter from={0} to={10} duration={2} suffix="x" />
            </div>
            <div className="font-inter text-text-tertiary text-lg font-medium">Faster QA Cycles</div>
            <div className="text-sm text-text-quaternary mt-2">Automated regression testing</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="font-display font-bold text-5xl md:text-7xl text-white mb-4 tracking-tight">
              <AnimatedCounter from={0} to={0} duration={1} />
            </div>
            <div className="font-inter text-text-tertiary text-lg font-medium">Code to write</div>
            <div className="text-sm text-text-quaternary mt-2">Zero integration overhead</div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
