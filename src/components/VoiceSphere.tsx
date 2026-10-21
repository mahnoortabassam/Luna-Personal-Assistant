import React, { useEffect, useRef } from 'react';

interface VoiceSphereProps {
  status: 'idle' | 'connecting' | 'listening' | 'speaking';
  analyser?: AnalyserNode | null;
  size?: number;
}

export const VoiceSphere: React.FC<VoiceSphereProps> = ({
  status,
  analyser,
  size = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = size * 0.32;

      let volume = 0;
      if (analyser && dataArray && (status === 'speaking' || status === 'listening')) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        volume = (sum / dataArray.length) / 255;
      }

      phase += status === 'speaking' ? 0.05 + volume * 0.08 : status === 'listening' ? 0.03 : 0.015;

      // Outer gentle ambient glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * (1.6 + volume * 0.8)
      );

      if (status === 'speaking') {
        glowGradient.addColorStop(0, 'rgba(194, 120, 75, 0.22)');
        glowGradient.addColorStop(0.6, 'rgba(217, 140, 95, 0.08)');
        glowGradient.addColorStop(1, 'rgba(217, 140, 95, 0)');
      } else if (status === 'listening') {
        glowGradient.addColorStop(0, 'rgba(78, 120, 110, 0.2)');
        glowGradient.addColorStop(0.6, 'rgba(78, 120, 110, 0.06)');
        glowGradient.addColorStop(1, 'rgba(78, 120, 110, 0)');
      } else if (status === 'connecting') {
        glowGradient.addColorStop(0, 'rgba(160, 150, 135, 0.18)');
        glowGradient.addColorStop(1, 'rgba(160, 150, 135, 0)');
      } else {
        glowGradient.addColorStop(0, 'rgba(140, 130, 120, 0.1)');
        glowGradient.addColorStop(1, 'rgba(140, 130, 120, 0)');
      }

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Fluid orbital rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringOffset = (r * Math.PI) / 3;
        const currentScale = 1 + Math.sin(phase + ringOffset) * (0.04 + volume * 0.12) + (r * 0.15);

        ctx.beginPath();
        const numPoints = 64;
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const wobble =
            Math.sin(angle * 3 + phase * 2 + r) * (3 + volume * 14) +
            Math.cos(angle * 5 - phase) * (2 + volume * 8);
          const rad = (baseRadius * currentScale) + wobble;
          const x = centerX + Math.cos(angle) * rad;
          const y = centerY + Math.sin(angle) * rad;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        if (status === 'speaking') {
          ctx.strokeStyle = `rgba(180, 83, 9, ${0.45 - r * 0.12 + volume * 0.3})`;
          ctx.lineWidth = 1.5;
        } else if (status === 'listening') {
          ctx.strokeStyle = `rgba(47, 107, 95, ${0.45 - r * 0.12 + volume * 0.3})`;
          ctx.lineWidth = 1.5;
        } else if (status === 'connecting') {
          ctx.strokeStyle = `rgba(120, 110, 100, ${0.35 - r * 0.1})`;
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = `rgba(160, 150, 140, ${0.28 - r * 0.08})`;
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      // Center sphere core
      const coreGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.25,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 0.95
      );

      if (status === 'speaking') {
        coreGradient.addColorStop(0, '#FFF5EB');
        coreGradient.addColorStop(0.5, '#F4D3BE');
        coreGradient.addColorStop(1, '#B45309');
      } else if (status === 'listening') {
        coreGradient.addColorStop(0, '#F0FAF7');
        coreGradient.addColorStop(0.5, '#C2DFD7');
        coreGradient.addColorStop(1, '#2F6B5F');
      } else if (status === 'connecting') {
        coreGradient.addColorStop(0, '#FAF9F6');
        coreGradient.addColorStop(0.5, '#E5E1D8');
        coreGradient.addColorStop(1, '#8A8275');
      } else {
        coreGradient.addColorStop(0, '#FCFBF8');
        coreGradient.addColorStop(0.6, '#ECE8E0');
        coreGradient.addColorStop(1, '#A39C90');
      }

      ctx.save();
      ctx.beginPath();
      const coreRadius = baseRadius * (0.85 + Math.sin(phase) * 0.03 + volume * 0.08);
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = status === 'speaking' ? 'rgba(180, 83, 9, 0.3)' : 'rgba(0,0,0,0.06)';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status, analyser, size]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full max-w-[220px] max-h-[220px]"
      />
    </div>
  );
};
