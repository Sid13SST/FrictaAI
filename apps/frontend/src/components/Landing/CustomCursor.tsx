import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('cursor-pointer')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };
    
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cursorX, cursorY, isVisible]);

  // Don't render cursor on mobile
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      {/* Outer Ring - trails with spring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] rounded-full border border-primary/50 bg-primary/10 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(115,66,226,0.3)]"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
          width: isHovering ? 64 : 32,
          height: isHovering ? 64 : 32,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isHovering ? 1.1 : 1,
          backgroundColor: isHovering ? 'rgba(115, 66, 226, 0.2)' : 'rgba(115, 66, 226, 0.1)',
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Inner Dot - instant tracking */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10001] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          width: 8,
          height: 8,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isHovering ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
}
