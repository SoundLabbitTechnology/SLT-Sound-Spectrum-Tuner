import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  mode: 'spectrum' | 'wave';
  snapshotData: Uint8Array | null;
}

export function Visualizer({ analyser, mode, snapshotData }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Initial resize
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Clear background
      ctx.fillStyle = '#fdfbf7'; // Wood-like light background matches theme
      ctx.fillRect(0, 0, width, height);

      // Draw snapshot if available
      if (snapshotData) {
        drawData(ctx, snapshotData, width, height, mode, true);
      }

      // Get current data
      if (mode === 'spectrum') {
        analyser.getByteFrequencyData(dataArray);
      } else {
        analyser.getByteTimeDomainData(dataArray);
      }

      // Draw current data
      drawData(ctx, dataArray, width, height, mode, false);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, mode, snapshotData]);

  const drawData = (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number,
    mode: 'spectrum' | 'wave',
    isSnapshot: boolean
  ) => {
    const bufferLength = data.length;

    if (mode === 'spectrum') {
      const barWidth = Math.max(1, (width / bufferLength) * 2.5); // log scale approach later? Keep simple linear for now or adjusted
      // Let's implement a pseudo-logarithmic view by stretching lower frequencies
      // For kids workshop, simple linear but focused on human hearing range (0-5000Hz) is usually best.
      // 4096 fftSize = 2048 bins. At 48000Hz, each bin is ~11Hz.
      // 5000Hz is about bin 450.
      
      const maxBins = Math.min(bufferLength, 600); // Focus on lower half
      const visualBarWidth = (width / maxBins);
      
      let x = 0;
      for (let i = 0; i < maxBins; i++) {
        const barHeight = (data[i] / 255) * height;

        if (isSnapshot) {
          ctx.fillStyle = 'rgba(180, 180, 180, 0.4)'; // Light gray for snapshot
        } else {
          // Color mapping: warm to cool based on frequency index
          const hue = Math.floor((i / maxBins) * 200); 
          // 0 is red, 200 is blue/purple
          ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        }

        ctx.fillRect(x, height - barHeight, visualBarWidth, barHeight);
        x += visualBarWidth + 1; // 1px gap
      }
    } else {
      // Waveform
      ctx.lineWidth = isSnapshot ? 2 : 3;
      ctx.strokeStyle = isSnapshot ? 'rgba(180, 180, 180, 0.5)' : '#8b5a2b'; // Wood brown
      ctx.beginPath();

      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner bg-[#fdfbf7]">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/70 px-3 py-1 rounded-full text-xs font-bold text-amber-900 border border-amber-200">
        {mode === 'spectrum' ? '成分 (スペクトル)' : '波の形 (波形)'}
      </div>
    </div>
  );
}
