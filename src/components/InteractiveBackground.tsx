import React, { useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export default function InteractiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for cursor tracking
  const springX = useSpring(mouseX, { damping: 50, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 200 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 -z-10 bg-[#050505] overflow-hidden pointer-events-none">
      {/* Glow following cursor (Simplified) */}
      <motion.div
        style={{
          left: mouseX,
          top: mouseY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        }}
        className="absolute w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none"
      />

      {/* Secondary slow floating blobs for atmosphere */}
      <motion.div 
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[15%] -left-[10%] w-[600px] h-[600px] bg-blue-600/[0.02] rounded-full blur-[120px] will-change-transform" 
      />
      
      <motion.div 
        animate={{
          x: [0, -60, 60, 0],
          y: [0, 40, -40, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[10%] -right-[5%] w-[700px] h-[700px] bg-indigo-600/[0.03] rounded-full blur-[140px] will-change-transform" 
      />

      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }}
      />
      
      {/* Heavy Grain overlay removed for performance */}
    </div>
  );
}
