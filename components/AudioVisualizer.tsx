import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, volume, isUserSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const draw = () => {
      // Resize canvas to parent
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      const { width, height } = canvas;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Gradient Line
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      
      if (isUserSpeaking) {
        gradient.addColorStop(0, '#4ade80'); // Green for user
        gradient.addColorStop(1, '#22c55e');
      } else if (isPlaying) {
        gradient.addColorStop(0, '#60a5fa'); // Blue for AI
        gradient.addColorStop(1, '#3b82f6');
      } else {
        gradient.addColorStop(0, '#475569'); // Gray idle
        gradient.addColorStop(1, '#334155');
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';

      ctx.beginPath();

      const amplitude = isPlaying || isUserSpeaking ? Math.min(height / 2.5, volume * height * 2) : 5;
      const frequency = isPlaying || isUserSpeaking ? 0.15 : 0.05;
      const speed = isPlaying || isUserSpeaking ? 0.2 : 0.05;

      for (let x = 0; x < width; x++) {
        // Sine wave modulation
        const y = centerY + Math.sin(x * frequency + time * speed) * amplitude * Math.sin(x / width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();

      // Mirror reflection for aesthetics
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
          const y = centerY - Math.sin(x * frequency + time * speed) * amplitude * Math.sin(x / width * Math.PI);
           if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      time += 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, volume, isUserSpeaking]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default AudioVisualizer;