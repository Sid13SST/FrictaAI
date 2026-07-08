import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import customVideo1 from '../BG_Videos/Video_Fricta.mp4';

export function AnimatedBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;
    const fadeDuration = 1.5; // seconds to fade out/in
    const maxOpacity = 0.12; // Reduced from 0.3 so shining dots don't block text

    const checkTime = () => {
      if (video.duration) {
        const timeLeft = video.duration - video.currentTime;
        let currentOpacity = maxOpacity;
        
        if (timeLeft < fadeDuration) {
          currentOpacity = maxOpacity * (timeLeft / fadeDuration);
        } else if (video.currentTime < fadeDuration) {
          currentOpacity = maxOpacity * (video.currentTime / fadeDuration);
        }
        
        video.style.opacity = currentOpacity.toString();
      }
      animationFrameId = requestAnimationFrame(checkTime);
    };

    animationFrameId = requestAnimationFrame(checkTime);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    // Generate some slow floating particles
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      y: Math.random() * 100, // percentage
      size: Math.random() * 2 + 1, // 1px to 3px
      duration: Math.random() * 20 + 20, // 20s to 40s
      delay: Math.random() * -20, // Start at different times
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Global Background Cinematic Video */}
      <div className="absolute inset-0 z-0 bg-background-deep overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover scale-[1.15] translate-x-[2%] translate-y-[2%]"
          style={{ opacity: 0 }} // Start invisible, fade in
        >
          <source src={customVideo1} type="video/mp4" />
        </video>
      </div>

      {/* Base Dark Background overlay to blend */}
      <div className="absolute inset-0 bg-background-deep/50" />

      {/* Massive Background Watermark Text */}
      <div className="absolute inset-0 flex items-center justify-center mt-20 pointer-events-none select-none overflow-hidden">
        <span 
          className="font-display font-black uppercase text-transparent whitespace-nowrap opacity-[0.07]"
          style={{
            fontSize: 'clamp(120px, 25vw, 400px)',
            letterSpacing: '-0.05em',
            backgroundImage: 'radial-gradient(circle at center, rgba(115, 66, 226, 0) 0%, #7342e2 80%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FRICTA
        </span>
      </div>

      {/* Subtle Aurora Gradients */}
      <div className="absolute top-0 left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] mix-blend-screen opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-secondary/5 blur-[150px] mix-blend-screen opacity-40" />
      
      {/* Moving Radial Gradient (subtle pulse) */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] mix-blend-screen"
      />

      {/* Tiny Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Noise Texture / Subtle Grain */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Slow Floating Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: ['0vh', '-20vh'],
            x: ['0vw', `${Math.random() * 10 - 5}vw`],
            opacity: [0, 0.15, 0], // Reduced max opacity for text readability
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Animated Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(5,5,5,0.9)]" />
    </div>
  );
}
