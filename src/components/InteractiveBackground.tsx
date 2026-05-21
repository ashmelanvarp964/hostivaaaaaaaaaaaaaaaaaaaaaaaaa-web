import React, { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    let targetX = currentX;
    let targetY = currentY;
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const tick = () => {
      // Super smooth lerp (linear interpolation)
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0)`;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#050505] overflow-hidden pointer-events-none">
      {/* Glow following cursor (Pure GPU-accelerated translate3d tracking) */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '750px',
          height: '750px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          willChange: 'transform',
        }}
        className="rounded-full opacity-50 pointer-events-none"
      />

      {/* Secondary slow floating atmospheric blobs (using cheap pure hardware-accelerated CSS animations) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatBlob1 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          33% { transform: translate3d(30px, -20px, 0); }
          66% { transform: translate3d(-30px, 20px, 0); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          33% { transform: translate3d(-40px, 30px, 0); }
          66% { transform: translate3d(40px, -30px, 0); }
        }
      `}} />
      
      <div 
        style={{
          animation: 'floatBlob1 35s infinite linear',
          willChange: 'transform'
        }}
        className="absolute top-[15%] -left-[10%] w-[500px] h-[500px] bg-blue-600/[0.015] rounded-full blur-[80px] pointer-events-none" 
      />
      
      <div 
        style={{
          animation: 'floatBlob2 40s infinite linear',
          willChange: 'transform'
        }}
        className="absolute bottom-[10%] -right-[5%] w-[600px] h-[600px] bg-indigo-600/[0.02] rounded-full blur-[90px] pointer-events-none" 
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
    </div>
  );
}
