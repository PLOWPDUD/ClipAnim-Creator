import React, { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  url: string;
  color: string;
  duration: number;
  offset: number;
}

export const Waveform: React.FC<WaveformProps> = ({ url, color, duration, offset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [originalDuration, setOriginalDuration] = useState<number>(0);

  useEffect(() => {
    const fetchAudio = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        setOriginalDuration(audioBuffer.duration);
        
        // Downsample for rendering
        const rawData = audioBuffer.getChannelData(0); // Use first channel
        const samples = 1000; // Fixed number of samples for the waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j]);
          }
          filteredData[i] = sum / blockSize;
        }
        
        setAudioData(filteredData);
      } catch (error) {
        console.error("Error decoding audio for waveform:", error);
      }
    };

    fetchAudio();
  }, [url]);

  useEffect(() => {
    if (!canvasRef.current || !audioData || originalDuration === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Calculate which portion of the audio data to draw based on offset and duration
    const startRatio = offset / originalDuration;
    const endRatio = (offset + duration) / originalDuration;
    
    const startIndex = Math.floor(startRatio * audioData.length);
    const endIndex = Math.min(audioData.length, Math.ceil(endRatio * audioData.length));
    
    const visibleData = audioData.slice(startIndex, endIndex);
    if (visibleData.length === 0) return;

    // Normalize visible data
    const maxVal = Math.max(...visibleData);
    const multiplier = maxVal > 0 ? Math.pow(maxVal, -1) : 1;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const step = width / visibleData.length;
    
    for (let i = 0; i < visibleData.length; i++) {
      const x = i * step;
      const y = (visibleData[i] * multiplier * height) / 2;
      
      ctx.moveTo(x, height / 2 - y);
      ctx.lineTo(x, height / 2 + y);
    }
    
    ctx.stroke();

  }, [audioData, color, duration, offset, originalDuration]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full absolute inset-0 pointer-events-none opacity-80"
    />
  );
};
