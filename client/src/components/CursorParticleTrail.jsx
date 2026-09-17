import React, { useEffect, useRef } from 'react';

/**
 * Interactive Cursor Fluid Line & Idle Floating Particle Trail
 *
 * Specific Colors:
 * - Main particles: #00E676
 * - Bright particles: #39FF88
 * - Secondary particles: #00C853
 * - Particle glow: rgba(0, 230, 118, 0.35)
 * - Soft ambient glow: rgba(57, 255, 136, 0.12)
 * - Cursor highlight: #FFFFFF
 *
 * Dynamic Behavior:
 * - When Moving: Draws a smooth, glowing green line ribbon with moderate length.
 * - When Stopped / Idle: Automatically generates gentle floating emerald-green particles
 *   drifting and orbiting softly around the stopped cursor.
 */
export default function CursorParticleTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates & state
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false,
      lastMoveTime: Date.now(),
      isMoving: false,
    };

    // Store points for smooth line curve
    const history = [];
    const MAX_POINTS = 20;
    const MAX_TOTAL_LENGTH = 160;

    // Particles array (both motion sparks and idle floating particles)
    const particles = [];
    const particleColors = ['#00E676', '#39FF88', '#00C853'];

    let prevMouseX = width / 2;
    let prevMouseY = height / 2;

    const handleMouseMove = (e) => {
      // Check if user is in-game or body has in-game-active
      if (
        document.body.classList.contains('in-game-active') ||
        document.body.getAttribute('data-in-game') === 'true'
      ) {
        mouse.active = false;
        mouse.isMoving = false;
        history.length = 0;
        particles.length = 0;
        return;
      }

      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
      mouse.lastMoveTime = Date.now();
      mouse.isMoving = true;

      // Add new point at head of line
      history.unshift({
        x: e.clientX,
        y: e.clientY,
        life: 1.0,
      });

      if (history.length > MAX_POINTS) {
        history.pop();
      }

      // Micro spark along line while moving
      if (Math.random() < 0.35 && particles.length < 35) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          size: Math.random() * 1.8 + 1,
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
          life: 1,
          decay: 0.035,
          type: 'spark',
        });
      }

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      history.length = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Spawn an idle particle softly drifting around the stopped cursor
    function spawnIdleParticle(cx, cy) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 18 + 4;
      const speed = Math.random() * 0.4 + 0.2;

      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.2,
        vy: Math.sin(angle) * speed - 0.3, // gently floating upwards
        size: Math.random() * 2.2 + 1.2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        life: 1.0,
        decay: Math.random() * 0.018 + 0.012, // soft slow fade
        type: 'idle',
      });
    }

    let lastIdleSpawn = 0;

    // Main Render loop
    const render = (time) => {
      ctx.clearRect(0, 0, width, height);

      // In game: completely disable drawing and clear particles
      if (
        document.body.classList.contains('in-game-active') ||
        document.body.getAttribute('data-in-game') === 'true'
      ) {
        mouse.active = false;
        mouse.isMoving = false;
        history.length = 0;
        particles.length = 0;
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Check if cursor has stopped
      const now = Date.now();
      const timeSinceMove = now - mouse.lastMoveTime;
      mouse.isMoving = timeSinceMove < 120;

      // Fast, responsive mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.3;
      mouse.y += (mouse.targetY - mouse.y) * 0.3;

      // When cursor is STOPPED/IDLE and active on screen, spawn floating particles
      if (mouse.active && !mouse.isMoving && now - lastIdleSpawn > 85) {
        lastIdleSpawn = now;
        if (particles.length < 40) {
          spawnIdleParticle(mouse.targetX, mouse.targetY);
        }
      }

      // Smooth point decay for line trail
      for (let i = history.length - 1; i >= 0; i--) {
        history[i].life -= 0.055;
        if (history[i].life <= 0) {
          history.splice(i, 1);
        }
      }

      // Enforce max line length
      let accumulatedLength = 0;
      for (let i = 0; i < history.length - 1; i++) {
        const dx = history[i].x - history[i + 1].x;
        const dy = history[i].y - history[i + 1].y;
        accumulatedLength += Math.sqrt(dx * dx + dy * dy);

        if (accumulatedLength > MAX_TOTAL_LENGTH) {
          history.splice(i + 1);
          break;
        }
      }

      // 1. Draw glowing line ribbon when moving
      if (history.length > 1) {
        // Pass 1: Soft ambient glow (wide, blurred)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(57, 255, 136, 0.12)'; // Soft ambient glow

        for (let i = 0; i < history.length - 1; i++) {
          const p1 = history[i];
          const p2 = history[i + 1];
          const progress = (1 - i / history.length) * Math.min(p1.life, p2.life);
          const width = progress * 5 + 1;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 230, 118, ${progress * 0.35})`; // Particle glow
          ctx.lineWidth = width;
          ctx.stroke();
        }
        ctx.restore();

        // Pass 2: Main crisp neon line (#39FF88 -> #00E676 -> #00C853)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 230, 118, 0.35)'; // Particle glow

        for (let i = 0; i < history.length - 1; i++) {
          const p1 = history[i];
          const p2 = history[i + 1];
          const progress = (1 - i / history.length) * Math.min(p1.life, p2.life);
          const lineWidth = progress * 3.2 + 0.8;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          if (progress > 0.6) {
            ctx.strokeStyle = `rgba(57, 255, 136, ${progress * 0.95})`; // #39FF88 Bright particles
          } else if (progress > 0.3) {
            ctx.strokeStyle = `rgba(0, 230, 118, ${progress * 0.85})`; // #00E676 Main particles
          } else {
            ctx.strokeStyle = `rgba(0, 200, 83, ${progress * 0.65})`; // #00C853 Secondary particles
          }

          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Cursor Highlight: #FFFFFF at mouse point
      if (mouse.active) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39FF88';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(mouse.targetX, mouse.targetY, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(57, 255, 136, 0.12)'; // Soft ambient glow
        ctx.beginPath();
        ctx.arc(mouse.targetX, mouse.targetY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw & update particles (idle floating particles + sparks)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        // Gentle drag for idle particles
        if (p.type === 'idle') {
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life * 0.85);
        ctx.shadowBlur = p.type === 'idle' ? 8 : 4;
        ctx.shadowColor = 'rgba(0, 230, 118, 0.35)'; // Particle glow
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.type === 'idle' ? (0.8 + (1 - p.life) * 0.3) : p.life), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
