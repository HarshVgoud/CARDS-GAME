// src/components/Confetti.jsx
import React, { useEffect, useRef } from 'react';

const Confetti = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = [
      '#f1c40f', // gold
      '#e74c3c', // red
      '#3498db', // blue
      '#2ecc71', // green
      '#9b59b6', // purple
      '#e67e22', // orange
      '#1abc9c', // teal
    ];

    const particleCount = 120;
    const particles = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * particleCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.speed;
        p.x += Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        // Draw particle
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Loop particle back to top if it goes offscreen
        if (p.y > canvas.height) {
          particles[idx] = {
            ...p,
            x: Math.random() * canvas.width,
            y: -20,
            tilt: Math.random() * 10 - 5,
            speed: Math.random() * 3 + 2,
          };
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
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
        zIndex: 9999 
      }} 
    />
  );
};

export default Confetti;
