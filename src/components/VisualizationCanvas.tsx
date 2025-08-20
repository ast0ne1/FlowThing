import React, { useRef, useEffect, useCallback } from 'react';
import { VisualizationProps } from '../types/visualization';

const VisualizationCanvas: React.FC<VisualizationProps> = ({ 
  settings, 
  audioData = [], 
  isActive 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<any[]>([]);
  const confettiRef = useRef<any[]>([]);

  // Generate mock audio data if none provided
  const generateMockAudioData = useCallback(() => {
    if (audioData.length > 0) return audioData;
    return Array.from({ length: 128 }, () => Math.random() * 0.5 + 0.1);
  }, [audioData]);

  // Wave visualization
  const drawWave = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = (settings.audioSensitivity || 50) / 100;
    const speed = (settings.animationSpeed || 50) / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor || '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = settings.primaryColor || '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const step = width / data.length;
    const time = Date.now() * speed * 0.001;
    
    data.forEach((value, index) => {
      const x = index * step;
      const amplitude = value * sensitivity * height * 0.3;
      const y = height / 2 + Math.sin(time + index * 0.1) * amplitude;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }, []);

  // Bars visualization
  const drawBars = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = settings.primaryColor;
    
    const barWidth = width / data.length;
    const time = Date.now() * speed * 0.001;
    
    data.forEach((value, index) => {
      const barHeight = value * sensitivity * height * 0.8;
      const x = index * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
  }, []);

  // Confetti visualization
  const drawConfetti = useCallback((ctx: CanvasRenderingContext2D, settings: any) => {
    const { width, height } = ctx.canvas;
    const speed = settings.animationSpeed / 100;
    
    // Initialize confetti particles
    if (confettiRef.current.length === 0) {
      confettiRef.current = Array.from({ length: 100 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2 * speed,
        vy: (Math.random() - 0.5) * 2 * speed,
        size: Math.random() * 4 + 2,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      }));
    }
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    confettiRef.current.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off walls
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      
      // Draw particle
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
  }, []);

  // Burning visualization
  const drawBurning = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now() * speed * 0.001;
    const centerX = width / 2;
    const baseY = height;
    
    // Create fire effect
    for (let i = 0; i < 20; i++) {
      const x = centerX + (Math.random() - 0.5) * width * 0.8;
      const flameHeight = (Math.random() * 0.5 + 0.5) * height * 0.8 * sensitivity;
      const y = baseY - flameHeight * (1 + Math.sin(time + i) * 0.3);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
      gradient.addColorStop(0, '#ff4400');
      gradient.addColorStop(0.5, '#ff8800');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Plasma visualization (fully simplified like DeskScape)
  const drawPlasma = useCallback((ctx: CanvasRenderingContext2D, settings: any) => {
    const { width, height } = ctx.canvas;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now() * speed * 0.001;
    const step = 8; // Simple fixed step size like DeskScape
    
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        const value = Math.sin(x * 0.01 + time) + Math.sin(y * 0.01 + time * 0.7);
        const hue = ((value + 2) * 60 + time * 30) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.fillRect(x, y, step, step);
      }
    }
  }, []);

  // Meter visualization
  const drawMeter = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / data.length;
    const maxHeight = height * 0.8;
    
    data.forEach((value, index) => {
      const barHeight = value * sensitivity * maxHeight;
      const x = index * barWidth;
      const y = height - barHeight;
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, '#00ff00');
      gradient.addColorStop(0.5, '#ffff00');
      gradient.addColorStop(1, '#ff0000');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, []);

  // Triangular visualization (simplified like DeskScape)
  const drawTriangular = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now() * speed * 0.001;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const triangleCount = 8; // Fixed count like DeskScape
    const angleStep = (Math.PI * 2) / triangleCount;
    const baseRadius = Math.min(width, height) * 0.1;
    const radiusVariation = baseRadius * 0.6;
    
    ctx.fillStyle = settings.primaryColor;
    
    for (let i = 0; i < triangleCount; i++) {
      const angle = i * angleStep + time;
      const radius = baseRadius + Math.sin(time * 2 + i) * radiusVariation * sensitivity;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle + Math.PI * 2 / 3) * radius;
      const y2 = centerY + Math.sin(angle + Math.PI * 2 / 3) * radius;
      const x3 = centerX + Math.cos(angle + Math.PI * 4 / 3) * radius;
      const y3 = centerY + Math.sin(angle + Math.PI * 4 / 3) * radius;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    }
  }, []);

  // Milkdrop visualization (simplified like DeskScape)
  const drawMilkdrop = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now() * speed * 0.001;
    const step = Math.max(6, Math.floor(width / 80)); // Fixed step size
    
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        const noise = Math.sin(x * 0.01 + time) * Math.sin(y * 0.01 + time * 0.7);
        const value = (noise + 1) / 2;
        
        const hue = (value * 240 + time * 30) % 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.fillRect(x, y, step, step);
      }
    }
  }, []);

  // Kaleidosync visualization (simplified like DeskScape)
  const drawKaleidosync = useCallback((ctx: CanvasRenderingContext2D, data: number[], settings: any) => {
    const { width, height } = ctx.canvas;
    const sensitivity = settings.audioSensitivity / 100;
    const speed = settings.animationSpeed / 100;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now() * speed * 0.001;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const segments = 8; // Fixed segments like DeskScape
    const angleStep = (Math.PI * 2) / segments;
    const baseRadius = Math.min(width, height) * 0.15;
    const radiusVariation = baseRadius * 0.5;
    
    ctx.fillStyle = settings.primaryColor;
    ctx.strokeStyle = settings.primaryColor;
    ctx.lineWidth = 2;
    
    // Draw all circles first
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const radius = baseRadius + Math.sin(time + i) * radiusVariation * sensitivity;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Then draw all connecting lines
    ctx.beginPath();
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const radius = baseRadius + Math.sin(time + i) * radiusVariation * sensitivity;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    // Close the path
    ctx.lineTo(centerX + Math.cos(0) * (baseRadius + Math.sin(time) * radiusVariation * sensitivity),
               centerY + Math.sin(0) * (baseRadius + Math.sin(time) * radiusVariation * sensitivity));
    ctx.stroke();
  }, []);

    // Main animation loop (restored to DeskScape's simple approach)
  const animate = useCallback(() => {
    if (!isActive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const data = generateMockAudioData();
    
    // Draw the current visualization
    switch (settings.visualizationType) {
      case 'wave':
        drawWave(ctx, data, settings);
        break;
      case 'confetti':
        drawConfetti(ctx, settings);
        break;
      case 'bars':
        drawBars(ctx, data, settings);
        break;
      case 'burning':
        drawBurning(ctx, data, settings);
        break;
      case 'plasma':
        drawPlasma(ctx, settings);
        break;
      case 'meter':
        drawMeter(ctx, data, settings);
        break;
      case 'triangular':
        drawTriangular(ctx, data, settings);
        break;
      case 'milkdrop':
        drawMilkdrop(ctx, data, settings);
        break;
      case 'kaleidosync':
        drawKaleidosync(ctx, data, settings);
        break;
      default:
        drawWave(ctx, data, settings);
    }
    
    // Continue animation loop with simple requestAnimationFrame
    if (isActive) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isActive, drawWave, drawConfetti, drawBars, drawBurning, drawPlasma, drawMeter, drawTriangular, drawMilkdrop, drawKaleidosync, generateMockAudioData]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Start/stop animation (simplified)
  useEffect(() => {
    if (isActive) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, animate]);



  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-black"
      style={{ display: 'block' }}
    />
  );
};

export default VisualizationCanvas;
