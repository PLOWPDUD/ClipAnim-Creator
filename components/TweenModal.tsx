import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { TweenType, TweenOptions } from '../types';
import { getEasingProgress } from '../utils/motionBlurUtils';

interface TweenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    numFrames: number, 
    easing: string, 
    includeOnionSkin: boolean, 
    interpolatePosition: boolean, 
    interpolateScale: boolean, 
    interpolateRotation: boolean,
    motionBlur: boolean,
    motionBlurStrength: number,
    motionBlurSamples: number,
    motionBlurShutterAngle: number,
    tweenType?: TweenType,
    options?: Partial<TweenOptions>
  ) => void;
  frameAThumbnail?: string | null;
  frameBThumbnail?: string | null;
}

export const TweenModal: React.FC<TweenModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate,
  frameAThumbnail,
  frameBThumbnail
}) => {
  // Active Tween Type
  const [tweenType, setTweenType] = useState<TweenType>('motion');

  // Shared Settings
  const [numFrames, setNumFrames] = useState(4);
  const [easing, setEasing] = useState('ease-in-out');
  const [includeOnionSkin, setIncludeOnionSkin] = useState(true);

  // 1. Motion Tween Settings
  const [interpolatePosition, setInterpolatePosition] = useState(true);
  const [interpolateScale, setInterpolateScale] = useState(true);
  const [interpolateRotation, setInterpolateRotation] = useState(true);
  const [motionBlur, setMotionBlur] = useState(true);
  const [motionBlurStrength, setMotionBlurStrength] = useState(0.75); // 0.2 to 1.5
  const [motionBlurSamples, setMotionBlurSamples] = useState(7); // 5, 7, 9, 11
  const [motionBlurShutterAngle, setMotionBlurShutterAngle] = useState(180); // 90, 180, 270, 360

  // 2. Shape Tween Settings
  const [shapeMorphMode, setShapeMorphMode] = useState<'contour' | 'dissolve' | 'liquify'>('liquify');
  const [shapeBlendColors, setShapeBlendColors] = useState(true);
  const [shapeSoftness, setShapeSoftness] = useState(0); // 0 (crisp vector) to 10

  // 3. Classic Tween Settings
  const [classicArc, setClassicArc] = useState<'straight' | 'arc-up' | 'arc-down' | 's-curve'>('straight');
  const [classicAnchor, setClassicAnchor] = useState<'center' | 'top-left' | 'top-center' | 'bottom-center' | 'custom'>('center');
  const [classicSpinCount, setClassicSpinCount] = useState<number>(0);
  const [classicColorTint, setClassicColorTint] = useState<boolean>(true);

  // Live Preview Canvas State
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressTextRef = useRef<HTMLSpanElement | null>(null);

  // Easing presets
  const easingOptions = [
    { id: 'linear', label: 'Linear', desc: 'Constant speed' },
    { id: 'ease-in', label: 'Ease In', desc: 'Starts slow, speeds up' },
    { id: 'ease-out', label: 'Ease Out', desc: 'Starts fast, slows down' },
    { id: 'ease-in-out', label: 'Ease In-Out', desc: 'Smooth start and end' },
    { id: 'bounce', label: 'Bounce', desc: 'Elastic ground bounce' },
    { id: 'elastic', label: 'Elastic', desc: 'Spring overshoot' },
  ];

  const blurPresets = [
    { label: 'Subtle', strength: 0.35, shutter: 90, desc: 'Slight softening' },
    { label: 'Cinematic', strength: 0.75, shutter: 180, desc: 'Film standard' },
    { label: 'Dynamic', strength: 1.1, shutter: 270, desc: 'High action' },
    { label: 'Extreme', strength: 1.5, shutter: 360, desc: 'Speed streak' },
  ];

  // Quick Preset Handlers
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'smooth-float':
        setTweenType('motion');
        setEasing('ease-in-out');
        setMotionBlur(false);
        setNumFrames(6);
        break;
      case 'action-streak':
        setTweenType('motion');
        setEasing('ease-out');
        setMotionBlur(true);
        setMotionBlurStrength(1.1);
        setMotionBlurShutterAngle(270);
        setNumFrames(4);
        break;
      case 'liquid-blob':
        setTweenType('shape');
        setShapeMorphMode('liquify');
        setShapeSoftness(1.5);
        setEasing('ease-in-out');
        setNumFrames(6);
        break;
      case 'geometric-contour':
        setTweenType('shape');
        setShapeMorphMode('contour');
        setShapeSoftness(0);
        setEasing('linear');
        setNumFrames(5);
        break;
      case 'bouncy-jump':
        setTweenType('classic');
        setClassicArc('arc-up');
        setClassicAnchor('bottom-center');
        setEasing('bounce');
        setNumFrames(8);
        break;
      case 'spin-flip':
        setTweenType('classic');
        setClassicArc('arc-up');
        setClassicSpinCount(1);
        setEasing('ease-in-out');
        setNumFrames(6);
        break;
    }
  };

  // Live Canvas Interactive Preview Loop
  useEffect(() => {
    if (!isOpen) return;

    let animFrameId: number;
    let startTime = performance.now();
    const duration = 1800; // 1.8s per loop

    const renderPreview = (now: number) => {
      const elapsed = (now - startTime) % duration;
      const rawT = elapsed / duration;
      // Ping-pong for preview
      const t = rawT < 0.5 ? rawT * 2 : (1 - rawT) * 2;
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `Loop Progress: ${Math.round(t * 100)}%`;
      }

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Draw grid pattern in preview
          ctx.fillStyle = '#101014';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Trajectory / In-Between Ghost Path
          const p = getEasingProgress(t, easing);

          if (tweenType === 'motion') {
            // Motion Tween Preview
            const x0 = 40, y0 = h / 2;
            const x1 = w - 40, y1 = h / 2;
            const curX = x0 + (x1 - x0) * p;
            const curY = y0 + (y1 - y0) * p;
            const curRot = (p * 45 * Math.PI) / 180;
            const curScale = 1 + Math.sin(p * Math.PI) * 0.3;

            // Draw motion trail / ghost
            for (let g = 0; g <= 4; g++) {
              const gt = g / 4;
              const gp = getEasingProgress(gt, easing);
              const gx = x0 + (x1 - x0) * gp;
              const gy = y0 + (y1 - y0) * gp;
              ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
              ctx.beginPath();
              ctx.arc(gx, gy, 12, 0, Math.PI * 2);
              ctx.fill();
            }

            // Draw active object with motion blur simulation
            if (motionBlur) {
              ctx.save();
              ctx.globalAlpha = 0.35;
              ctx.translate(curX - (x1 - x0) * 0.04 * motionBlurStrength, curY);
              ctx.fillStyle = '#c084fc';
              ctx.beginPath();
              ctx.roundRect(-16, -16, 32, 32, 6);
              ctx.fill();
              ctx.restore();
            }

            ctx.save();
            ctx.translate(curX, curY);
            if (interpolateRotation) ctx.rotate(curRot);
            if (interpolateScale) ctx.scale(curScale, curScale);
            ctx.fillStyle = '#a855f7';
            ctx.strokeStyle = '#e9d5ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-16, -16, 32, 32, 8);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

          } else if (tweenType === 'shape') {
            // Shape Tween Preview: Morphs circle -> star/blob
            const cx = w / 2;
            const cy = h / 2;
            ctx.save();
            ctx.translate(cx, cy);

            // Shape morph interpolation
            const sides = 3 + Math.round(p * 5);
            const radius = 24 + (shapeMorphMode === 'liquify' ? Math.sin(p * Math.PI) * 6 : 0);
            
            ctx.fillStyle = shapeBlendColors 
              ? `rgb(${Math.round(236 * (1 - p) + 59 * p)}, ${Math.round(72 * (1 - p) + 130 * p)}, ${Math.round(153 * (1 - p) + 246 * p)})`
              : '#ec4899';
            ctx.strokeStyle = '#fbcfe8';
            ctx.lineWidth = 2;

            if (shapeSoftness > 0) {
              ctx.shadowColor = '#ec4899';
              ctx.shadowBlur = shapeSoftness * 2;
            }

            ctx.beginPath();
            if (shapeMorphMode === 'dissolve') {
              ctx.globalAlpha = 1 - p * 0.5;
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              // Morph polygon / star
              for (let i = 0; i < sides * 2; i++) {
                const angle = (i * Math.PI) / sides;
                const r = i % 2 === 0 ? radius : radius * (0.5 + p * 0.4);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();

          } else {
            // Classic Tween Preview: Trajectory arc + spin + anchor
            const x0 = 40, y0 = h - 35;
            const x1 = w - 40, y1 = h - 35;
            const curX = x0 + (x1 - x0) * p;
            let curY = y0 + (y1 - y0) * p;

            if (classicArc === 'arc-up') {
              curY -= 4 * 45 * p * (1 - p);
            } else if (classicArc === 'arc-down') {
              curY += 4 * 25 * p * (1 - p);
            } else if (classicArc === 's-curve') {
              curY += Math.sin(p * Math.PI * 2) * 20;
            }

            // Draw Trajectory Arc Path
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            for (let step = 0; step <= 20; step++) {
              const st = step / 20;
              const sx = x0 + (x1 - x0) * st;
              let sy = y0 + (y1 - y0) * st;
              if (classicArc === 'arc-up') sy -= 4 * 45 * st * (1 - st);
              else if (classicArc === 'arc-down') sy += 4 * 25 * st * (1 - st);
              else if (classicArc === 's-curve') sy += Math.sin(st * Math.PI * 2) * 20;
              if (step === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Classic Object with Spin
            const spinAngle = classicSpinCount * (Math.PI * 2) * p;
            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(spinAngle);
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#bfdbfe';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-14, -14, 28, 28, 4);
            ctx.fill();
            ctx.stroke();

            // Draw Anchor Pin in Classic Mode
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            let anchorPinY = 0;
            if (classicAnchor === 'bottom-center') anchorPinY = 14;
            else if (classicAnchor === 'top-center') anchorPinY = -14;
            ctx.arc(0, anchorPinY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      animFrameId = requestAnimationFrame(renderPreview);
    };

    animFrameId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animFrameId);
  }, [isOpen, tweenType, easing, motionBlur, motionBlurStrength, shapeMorphMode, shapeSoftness, shapeBlendColors, classicArc, classicAnchor, classicSpinCount, interpolateRotation, interpolateScale]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    const fullOptions: TweenOptions = {
      type: tweenType,
      numFrames,
      easing,
      includeOnionSkin,
      interpolatePosition,
      interpolateScale,
      interpolateRotation,
      motionBlur,
      motionBlurStrength,
      motionBlurSamples,
      motionBlurShutterAngle,
      shapeMorphMode,
      shapeBlendColors,
      shapeSoftness,
      classicArc,
      classicAnchor,
      classicSpinCount,
      classicColorTint,
    };

    onGenerate(
      numFrames, 
      easing, 
      includeOnionSkin, 
      interpolatePosition, 
      interpolateScale, 
      interpolateRotation,
      motionBlur,
      motionBlurStrength,
      motionBlurSamples,
      motionBlurShutterAngle,
      tweenType,
      fullOptions
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#151518] rounded-2xl w-full max-w-xl shadow-2xl border border-white/10 flex flex-col max-h-[92vh] overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#18181c] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              tweenType === 'motion' 
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                : tweenType === 'shape'
                ? 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {tweenType === 'motion' && <Icons.Wand2 size={20} />}
              {tweenType === 'shape' && <Icons.Sparkles size={20} />}
              {tweenType === 'classic' && <Icons.Activity size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tween & In-Between Studio</span>
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                  tweenType === 'motion'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : tweenType === 'shape'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}>
                  {tweenType.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Generate smooth automated in-between frames between keyframes
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-sm">
          
          {/* Keyframe Pair Preview Indicator */}
          {(frameAThumbnail || frameBThumbnail) && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-9 rounded-lg overflow-hidden border border-white/20 bg-black/50 shrink-0 flex items-center justify-center">
                  {frameAThumbnail ? (
                    <img src={frameAThumbnail} alt="Start Keyframe" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-500 font-mono">Frame A</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Start Keyframe</div>
                  <div className="text-[10px] text-gray-400">Origin pose</div>
                </div>
              </div>

              <div className="flex flex-col items-center px-2">
                <div className="flex items-center gap-1 text-purple-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <Icons.ArrowRight size={14} />
                </div>
                <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider">{numFrames} in-betweens</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <div className="text-xs font-bold text-white">End Keyframe</div>
                  <div className="text-[10px] text-gray-400">Target pose</div>
                </div>
                <div className="w-12 h-9 rounded-lg overflow-hidden border border-white/20 bg-black/50 shrink-0 flex items-center justify-center">
                  {frameBThumbnail ? (
                    <img src={frameBThumbnail} alt="End Keyframe" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-500 font-mono">Frame B</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TWEEN TYPE SELECTOR TABS */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Select Tween Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Motion Tween Tab */}
              <button
                type="button"
                onClick={() => setTweenType('motion')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  tweenType === 'motion'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-black/30 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${tweenType === 'motion' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    <Icons.Wand2 size={13} />
                  </div>
                  <span className="font-bold text-xs">Motion Tween</span>
                </div>
                <div className="text-[10px] opacity-75 leading-tight">
                  Transformations, scale & studio motion blur
                </div>
              </button>

              {/* Shape Tween Tab */}
              <button
                type="button"
                onClick={() => setTweenType('shape')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  tweenType === 'shape'
                    ? 'bg-pink-950/40 border-pink-500 text-white shadow-lg shadow-pink-950/50'
                    : 'bg-black/30 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${tweenType === 'shape' ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    <Icons.Sparkles size={13} />
                  </div>
                  <span className="font-bold text-xs">Shape Tween</span>
                </div>
                <div className="text-[10px] opacity-75 leading-tight">
                  Vector contours, organic morphs & liquify
                </div>
              </button>

              {/* Classic Tween Tab */}
              <button
                type="button"
                onClick={() => setTweenType('classic')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  tweenType === 'classic'
                    ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/50'
                    : 'bg-black/30 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${tweenType === 'classic' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    <Icons.Activity size={13} />
                  </div>
                  <span className="font-bold text-xs">Classic Tween</span>
                </div>
                <div className="text-[10px] opacity-75 leading-tight">
                  Flash keyframes, arcs, anchors & spins
                </div>
              </button>
            </div>
          </div>

          {/* REAL-TIME INTERACTIVE PREVIEW VIEWPORT */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Icons.Play size={12} className="text-emerald-400" />
                <span>Live Interactive Simulation</span>
              </span>
              <span ref={progressTextRef} className="font-mono text-[10px] text-gray-400">
                Loop Progress: 0%
              </span>
            </div>
            
            <div className="w-full h-24 rounded-xl overflow-hidden border border-white/5 relative bg-[#101014]">
              <canvas
                ref={previewCanvasRef}
                width={360}
                height={96}
                className="w-full h-full block"
              />
            </div>

            {/* Quick Presets Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 shrink-0">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('smooth-float')}
                className="px-2 py-0.5 bg-black/40 hover:bg-purple-950/60 hover:border-purple-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                Smooth Float
              </button>
              <button
                type="button"
                onClick={() => applyPreset('action-streak')}
                className="px-2 py-0.5 bg-black/40 hover:bg-purple-950/60 hover:border-purple-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                Action Streak
              </button>
              <button
                type="button"
                onClick={() => applyPreset('liquid-blob')}
                className="px-2 py-0.5 bg-black/40 hover:bg-pink-950/60 hover:border-pink-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                Liquid Blob Morph
              </button>
              <button
                type="button"
                onClick={() => applyPreset('geometric-contour')}
                className="px-2 py-0.5 bg-black/40 hover:bg-pink-950/60 hover:border-pink-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                Contour Warp
              </button>
              <button
                type="button"
                onClick={() => applyPreset('bouncy-jump')}
                className="px-2 py-0.5 bg-black/40 hover:bg-blue-950/60 hover:border-blue-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                Bouncy Jump Arc
              </button>
              <button
                type="button"
                onClick={() => applyPreset('spin-flip')}
                className="px-2 py-0.5 bg-black/40 hover:bg-blue-950/60 hover:border-blue-500/50 border border-white/5 rounded text-[10px] text-gray-300 hover:text-white transition-colors shrink-0"
              >
                360° Spin Flip
              </button>
            </div>
          </div>

          {/* FRAME COUNT & DURATION */}
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400">
              <span>In-Between Frame Count</span>
              <span className={`font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg border ${
                tweenType === 'motion'
                  ? 'text-purple-400 bg-purple-950/60 border-purple-500/30'
                  : tweenType === 'shape'
                  ? 'text-pink-400 bg-pink-950/60 border-pink-500/30'
                  : 'text-blue-400 bg-blue-950/60 border-blue-500/30'
              }`}>
                +{numFrames} frames
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input 
                type="range" 
                min="1" 
                max="24" 
                value={numFrames} 
                onChange={(e) => setNumFrames(parseInt(e.target.value, 10))}
                className={`flex-1 cursor-pointer h-2 bg-gray-800 rounded-lg ${
                  tweenType === 'motion' ? 'accent-purple-500' : tweenType === 'shape' ? 'accent-pink-500' : 'accent-blue-500'
                }`}
              />
            </div>
          </div>

          {/* EASING OPTIONS */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Motion Smoothness (Easing Curve)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {easingOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEasing(opt.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    easing === opt.id 
                      ? tweenType === 'motion'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm shadow-purple-500/10'
                        : tweenType === 'shape'
                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-sm shadow-pink-500/10'
                        : 'bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-0.5">{opt.label}</div>
                  <div className="text-[10px] opacity-70 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* MODE SPECIFIC CONTROLS */}

          {/* 1. MOTION TWEEN CONTROLS */}
          {tweenType === 'motion' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Motion Blur Effect Section */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 via-black/40 to-black/20 border border-purple-500/30 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${motionBlur ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      <Icons.Wind size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        Studio Motion Blur
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          PRO
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 leading-tight">
                        Smooths fast displacement & eliminates stepping
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setMotionBlur(!motionBlur)} 
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${motionBlur ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-md ${motionBlur ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {motionBlur && (
                  <div className="pt-2 border-t border-purple-500/20 space-y-3">
                    {/* Quick Presets */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Blur Intensity Preset</span>
                        <span className="text-purple-300 font-mono font-bold">
                          {Math.round(motionBlurStrength * 100)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {blurPresets.map((preset) => {
                          const isActive = Math.abs(motionBlurStrength - preset.strength) < 0.05 && motionBlurShutterAngle === preset.shutter;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setMotionBlurStrength(preset.strength);
                                setMotionBlurShutterAngle(preset.shutter);
                              }}
                              className={`py-1.5 px-1 rounded-lg text-center border transition-all text-xs ${
                                isActive
                                  ? 'bg-purple-600 text-white font-bold border-purple-400 shadow-sm'
                                  : 'bg-black/40 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fine slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Streak Length</span>
                        <span className="font-mono text-gray-300">{(motionBlurStrength * 1.5).toFixed(1)}x exposure</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.05"
                        value={motionBlurStrength}
                        onChange={(e) => setMotionBlurStrength(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                      />
                    </div>

                    {/* Quality & Shutter settings */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                          Shutter Angle
                        </label>
                        <select
                          value={motionBlurShutterAngle}
                          onChange={(e) => setMotionBlurShutterAngle(parseInt(e.target.value, 10))}
                          className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-purple-500"
                        >
                          <option value={90}>90° (Crisp)</option>
                          <option value={180}>180° (Cinema standard)</option>
                          <option value={270}>270° (Smooth flow)</option>
                          <option value={360}>360° (Full exposure)</option>
                        </select>
                      </div>

                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                          Sample Passes
                        </label>
                        <select
                          value={motionBlurSamples}
                          onChange={(e) => setMotionBlurSamples(parseInt(e.target.value, 10))}
                          className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-purple-500"
                        >
                          <option value={5}>5 passes (Fast)</option>
                          <option value={7}>7 passes (Balanced)</option>
                          <option value={9}>9 passes (Ultra Smooth)</option>
                          <option value={11}>11 passes (Studio Film)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Interpolation Toggles */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Transformation Channels
                </div>
                
                <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-medium text-gray-300">Position (X / Y translation)</span>
                  <button 
                    type="button" 
                    onClick={() => setInterpolatePosition(!interpolatePosition)} 
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolatePosition ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolatePosition ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-medium text-gray-300">Scale & Silhouette (Width / Height)</span>
                  <button 
                    type="button" 
                    onClick={() => setInterpolateScale(!interpolateScale)} 
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolateScale ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolateScale ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-xs font-medium text-gray-300">Rotation (Principal Orientation)</span>
                  <button 
                    type="button" 
                    onClick={() => setInterpolateRotation(!interpolateRotation)} 
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolateRotation ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolateRotation ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. SHAPE TWEEN CONTROLS */}
          {tweenType === 'shape' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-br from-pink-950/30 via-black/40 to-black/20 border border-pink-500/30 space-y-3.5 shadow-inner">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
                  <Icons.Sparkles size={14} />
                  <span>Shape Morphing Engine</span>
                </div>

                {/* Morph Blend Modes */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase">Morph Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShapeMorphMode('liquify')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        shapeMorphMode === 'liquify'
                          ? 'bg-pink-600/30 border-pink-500 text-white font-bold'
                          : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">Liquify</div>
                      <div className="text-[10px] opacity-70">Organic fluid stretch</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShapeMorphMode('contour')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        shapeMorphMode === 'contour'
                          ? 'bg-pink-600/30 border-pink-500 text-white font-bold'
                          : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">Contour</div>
                      <div className="text-[10px] opacity-70">Envelope warping</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShapeMorphMode('dissolve')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        shapeMorphMode === 'dissolve'
                          ? 'bg-pink-600/30 border-pink-500 text-white font-bold'
                          : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">Dissolve</div>
                      <div className="text-[10px] opacity-70">Gradient cross-fade</div>
                    </button>
                  </div>
                </div>

                {/* Morph Softness Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Edge Softness / Blur</span>
                    <span className="font-mono text-pink-300 font-bold">{shapeSoftness === 0 ? 'Crisp (0px)' : `${shapeSoftness}px`}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={shapeSoftness}
                    onChange={(e) => setShapeSoftness(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                  />
                </div>

                {/* Color Harmony Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-pink-500/20">
                  <div>
                    <div className="text-xs font-bold text-white">Color Harmony Morph</div>
                    <div className="text-[10px] text-gray-400">Smoothly interpolates source colors into target palette</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShapeBlendColors(!shapeBlendColors)}
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${shapeBlendColors ? 'bg-pink-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shapeBlendColors ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. CLASSIC TWEEN CONTROLS */}
          {tweenType === 'classic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/30 via-black/40 to-black/20 border border-blue-500/30 space-y-3.5 shadow-inner">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <Icons.Activity size={14} />
                  <span>Classic Keyframing & Trajectories</span>
                </div>

                {/* Motion Path Arc Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase">Trajectory Arc</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClassicArc('straight')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        classicArc === 'straight' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Straight
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassicArc('arc-up')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        classicArc === 'arc-up' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Jump Arc ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassicArc('arc-down')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        classicArc === 'arc-down' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Drop Arc ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassicArc('s-curve')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        classicArc === 's-curve' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      S-Wave ~
                    </button>
                  </div>
                </div>

                {/* Anchor Point Registration */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Anchor Registration
                    </label>
                    <select
                      value={classicAnchor}
                      onChange={(e) => setClassicAnchor(e.target.value as any)}
                      className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1.5 border border-white/10 focus:outline-none focus:border-blue-500"
                    >
                      <option value="center">Center of Mass</option>
                      <option value="bottom-center">Bottom / Ground (Squash & Jump)</option>
                      <option value="top-center">Top / Hanging Pendulum</option>
                      <option value="top-left">Top-Left Pivot</option>
                    </select>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Full Turn Spin Count
                    </label>
                    <select
                      value={classicSpinCount}
                      onChange={(e) => setClassicSpinCount(parseInt(e.target.value, 10))}
                      className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1.5 border border-white/10 focus:outline-none focus:border-blue-500"
                    >
                      <option value={0}>0 (Shortest Angle)</option>
                      <option value={1}>+1 Turn (CW 360° Spin)</option>
                      <option value={2}>+2 Turns (CW 720° Spin)</option>
                      <option value={-1}>-1 Turn (CCW 360° Spin)</option>
                      <option value={-2}>-2 Turns (CCW 720° Spin)</option>
                    </select>
                  </div>
                </div>

                {/* Color Shift Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-blue-500/20">
                  <span className="text-xs text-gray-300">Color Tint & Brightness Transition</span>
                  <button
                    type="button"
                    onClick={() => setClassicColorTint(!classicColorTint)}
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${classicColorTint ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${classicColorTint ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Onion Skin preservation toggle */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
            <span className="text-xs font-medium text-gray-300">Preserve Onion Skinning</span>
            <button 
              type="button" 
              onClick={() => setIncludeOnionSkin(!includeOnionSkin)} 
              className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                includeOnionSkin 
                  ? tweenType === 'motion' ? 'bg-purple-600' : tweenType === 'shape' ? 'bg-pink-600' : 'bg-blue-600'
                  : 'bg-gray-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeOnionSkin ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#18181c] shrink-0">
          <div className="text-[11px] text-gray-400">
            Hold between Frame #{framesCountString(numFrames)}
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleGenerate}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                tweenType === 'motion'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                  : tweenType === 'shape'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-600/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-600/30'
              }`}
            >
              <Icons.Sparkles size={15} />
              Generate {tweenType === 'motion' ? 'Motion' : tweenType === 'shape' ? 'Shape' : 'Classic'} In-Betweens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function framesCountString(count: number): string {
  return `${count} frames (~${(count / 24).toFixed(2)}s @ 24fps)`;
}
