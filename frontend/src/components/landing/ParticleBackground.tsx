import React, { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return; // Do not animate or render if reduced motion is preferred
    }

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      // Get the parent element's dimensions to cover the whole section
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 8000); // moderately increased density
      
      for (let i = 0; i < numParticles; i++) {
        // Natural size distribution: 80% tiny, 18% slightly larger, 2% brighter/larger
        const rand = Math.random();
        let size = Math.random() * 1.0 + 0.5; // tiny
        let opacity = Math.random() * 0.3 + 0.2;
        let color = '#f8fafc'; // mostly soft white

        if (rand > 0.98) {
          size = Math.random() * 1.0 + 2.5; // brighter/larger
          opacity = Math.random() * 0.4 + 0.5;
          color = '#ffffff'; // pure white
        } else if (rand > 0.8) {
          size = Math.random() * 1.0 + 1.5; // slightly larger
          opacity = Math.random() * 0.3 + 0.4;
          // ~20% of these medium ones have subtle cyan tint
          color = Math.random() > 0.8 ? '#06b6d4' : '#e2e8f0'; 
        } else {
          // tiny particles occasionally blue-white
          color = Math.random() > 0.9 ? '#cbd5e1' : '#f8fafc';
        }

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.1, // extremely slow and elegant
          vy: (Math.random() - 0.5) * 0.1,
          size,
          color,
          opacity,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        // Subtle glow for brighter/larger particles
        if (p.size >= 2.0) {
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset
      ctx.shadowBlur = 0;
    };

    const animate = () => {
      drawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    
    // Initial setup
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      style={{ background: 'transparent' }}
    />
  );
};
