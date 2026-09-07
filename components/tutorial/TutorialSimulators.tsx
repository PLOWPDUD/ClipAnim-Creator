import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../Icons';

// ==========================================
// 1. Squash & Stretch Physics Simulator
// ==========================================
export const SquashStretchSimulator: React.FC = () => {
  const [frame, setFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [elasticity, setElasticity] = useState<number>(0.8);
  const [showGhosts, setShowGhosts] = useState<boolean>(true);
  const [showVectors] = useState<boolean>(true);
  const totalFrames = 6;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % totalFrames);
    }, 240);
    return () => clearInterval(interval);
  }, [isPlaying, totalFrames]);

  // Frame properties for physics stages
  const frameConfigs = [
    { name: 'Apex (Anticipation)', y: 20, scaleX: 1, scaleY: 1, desc: 'Zero velocity at top of arc. Preparing descent.' },
    { name: 'Accelerating Descent', y: 70, scaleX: 0.85, scaleY: 1.2, desc: 'Gravity accelerates velocity. Shape stretches along direction of motion.' },
    { name: 'Maximum Stretch', y: 130, scaleX: 0.7, scaleY: 1.4, desc: 'Maximum speed just before impact. Highest vertical elongation.' },
    { name: 'Ground Impact (Squash)', y: 175, scaleX: 1.55 * elasticity, scaleY: 0.55 / elasticity, desc: 'Sudden deceleration! Kinetic energy squashes mass outward horizontally.' },
    { name: 'Snappy Rebound (Elastic)', y: 120, scaleX: 0.8, scaleY: 1.3, desc: 'Stored elasticity launches object back into flight.' },
    { name: 'Deceleration to Apex', y: 50, scaleX: 0.95, scaleY: 1.05, desc: 'Decelerating upward until velocity reaches zero at apex.' }
  ];

  const current = frameConfigs[frame];

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
          <Icons.Sparkles size={14} />
          <span>Squash & Stretch Physics Engine</span>
        </span>
        <span className="text-[10px] font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
          Stage {frame + 1}/{totalFrames}
        </span>
      </div>

      {/* Physics Stage Viewport */}
      <div className="relative w-full h-52 bg-gray-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col items-center justify-start p-3 select-none">
        {/* Trajectory Guide Arc */}
        <div className="absolute top-8 bottom-6 w-0.5 border-l-2 border-dashed border-gray-800 pointer-events-none" />

        {/* Floor Contact Line */}
        <div className="absolute bottom-6 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent flex items-center justify-center">
          <span className="absolute -bottom-4 text-[9px] font-mono text-amber-400/80 uppercase tracking-wider">
            Contact Plane
          </span>
        </div>

        {/* Ghost Outlines */}
        {showGhosts && frameConfigs.map((cfg, idx) => {
          if (idx === frame) return null;
          const isPast = idx < frame;
          return (
            <div
              key={idx}
              className={`absolute rounded-full border pointer-events-none transition-opacity duration-200 ${
                isPast ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
              style={{
                top: `${cfg.y}px`,
                width: `${44 * cfg.scaleX}px`,
                height: `${44 * cfg.scaleY}px`,
                transform: 'translateX(-50%)',
                left: '50%'
              }}
            />
          );
        })}

        {/* Active Animated Ball */}
        <div
          className="absolute rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 shadow-xl shadow-amber-500/30 border-2 border-white flex items-center justify-center transition-all duration-200"
          style={{
            top: `${current.y}px`,
            width: `${46 * current.scaleX}px`,
            height: `${46 * current.scaleY}px`,
            transform: 'translateX(-50%)',
            left: '50%'
          }}
        >
          <span className="text-[10px] font-black text-black/80">F{frame + 1}</span>
          
          {/* Velocity Vector Arrow */}
          {showVectors && (
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none ${
              frame === 0 ? 'hidden' : frame <= 3 ? 'top-full pt-1 text-red-400' : 'bottom-full pb-1 text-emerald-400'
            }`}>
              {frame <= 3 ? (
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-red-400" />
                  <Icons.ChevronDown size={12} className="-mt-1" />
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Icons.ChevronUp size={12} className="-mb-1" />
                  <div className="w-0.5 h-3 bg-emerald-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage State Tag */}
        <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-gray-200 border border-gray-800 font-mono shadow">
          <span className="text-amber-400 font-bold">{current.name}: </span>
          <span className="text-gray-300">{current.desc}</span>
        </div>
      </div>

      {/* Frame Scrubber Buttons */}
      <div className="grid grid-cols-6 gap-1.5">
        {frameConfigs.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setFrame(idx);
              setIsPlaying(false);
            }}
            className={`py-1 rounded-lg font-bold text-[10px] transition-all ${
              frame === idx
                ? 'bg-amber-500 text-black shadow font-black'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          >
            F{idx + 1}
          </button>
        ))}
      </div>

      {/* Physics Controls */}
      <div className="space-y-2 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Elasticity / Bounciness:</span>
          <span className="font-mono text-amber-400 font-bold">{Math.round(elasticity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.4"
          max="1.2"
          step="0.05"
          value={elasticity}
          onChange={(e) => setElasticity(parseFloat(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px] ${
                isPlaying ? 'bg-amber-500 text-black shadow' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {isPlaying ? <Icons.Pause size={12} /> : <Icons.Play size={12} />}
              <span>{isPlaying ? 'Pause' : 'Play Loop'}</span>
            </button>

            <button
              onClick={() => setShowGhosts(!showGhosts)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                showGhosts ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              <Icons.Ghost size={12} />
              <span>Ghost Trail</span>
            </button>
          </div>

          <button
            onClick={() => setFrame(prev => (prev + 1) % totalFrames)}
            className="text-[11px] text-amber-400 hover:underline font-bold flex items-center gap-0.5"
          >
            <span>Step</span>
            <Icons.ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. Interactive Mini Practice Canvas
// ==========================================
export const InteractiveMiniCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'line'>('brush');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [brushColor, setBrushColor] = useState<string>('#f59e0b');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState<boolean>(false);
  const [ghostFrameData, setGhostFrameData] = useState<string | null>(null);

  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = activeTool === 'eraser' ? '#0b0b0e' : brushColor;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0b0b0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveToGhostFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGhostFrameData(canvas.toDataURL());
    clearCanvas();
    setOnionSkinEnabled(true);
  };

  useEffect(() => {
    clearCanvas();
  }, []);

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-pink-400 flex items-center gap-1.5">
          <Icons.Brush size={14} />
          <span>Live Practice Scratchpad</span>
        </span>
        <span className="text-[10px] text-gray-400 font-mono">Interactive Stage</span>
      </div>

      {/* Mini Drawing Viewport */}
      <div className="relative w-full h-48 bg-[#0b0b0e] rounded-xl border border-gray-800 overflow-hidden select-none cursor-crosshair">
        {/* Onion Skin Ghost Underlay */}
        {onionSkinEnabled && ghostFrameData && (
          <img
            src={ghostFrameData}
            alt="Ghost Frame"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-30 filter hue-rotate-180 brightness-150"
          />
        )}

        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full block"
        />

        {/* Floating Tool Controls */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTool('brush')}
            className={`p-1.5 rounded-lg transition-colors ${activeTool === 'brush' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Brush"
          >
            <Icons.Brush size={13} />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Eraser"
          >
            <Icons.Eraser size={13} />
          </button>
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={saveToGhostFrame}
            className="px-2 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg shadow flex items-center gap-1 transition-colors"
            title="Save as ghost & start next frame"
          >
            <Icons.Ghost size={11} />
            <span>Set Ghost</span>
          </button>
          <button
            onClick={clearCanvas}
            className="p-1 bg-red-600/60 hover:bg-red-500 text-white rounded-lg transition-colors"
            title="Clear Drawing"
          >
            <Icons.Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Palette & Size Options */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Color Swatches */}
        <div className="flex items-center gap-1.5">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => {
                setBrushColor(c);
                if (activeTool === 'eraser') setActiveTool('brush');
              }}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                brushColor === c && activeTool === 'brush' ? 'border-white scale-125 shadow-md' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>Size: {brushSize}px</span>
          <input
            type="range"
            min="2"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            className="w-16 accent-pink-500 h-1 bg-gray-800 rounded"
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. Motion Tweening & Easing Curve Simulator
// ==========================================
export const TweeningCurveSimulator: React.FC = () => {
  const [curve, setCurve] = useState<'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic'>('easeInOut');
  const [progress, setProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Easing calculations
  const calculateEase = (t: number, type: typeof curve) => {
    switch (type) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t * t;
      case 'easeOut':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOut':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'bounce': {
        const n1 = 7.5625;
        const d1 = 2.75;
        let x = t;
        if (x < 1 / d1) return n1 * x * x;
        if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
        if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
        x -= 2.625 / d1; return n1 * x * x + 0.984375;
      }
      case 'elastic': {
        const c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
      }
      default:
        return t;
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    let animFrame: number;
    let startTime: number | null = null;
    const duration = 1600; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, (elapsed % duration) / duration);
      setProgress(t);
      animFrame = requestAnimationFrame(step);
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, curve]);

  const easedValue = Math.max(0, Math.min(1.2, calculateEase(progress, curve)));

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-indigo-400 flex items-center gap-1.5">
          <Icons.Wand2 size={14} />
          <span>Mathematical Tween & Easing Graph</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded hover:bg-gray-800 text-gray-300 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Icons.Pause size={12} /> : <Icons.Play size={12} />}
          </button>
          <span className="text-[10px] font-mono text-gray-400">f(t) = {curve}</span>
        </div>
      </div>

      {/* Visual Animation Track */}
      <div className="relative w-full h-32 bg-gray-950 rounded-xl border border-gray-800 p-4 flex flex-col justify-between overflow-hidden">
        {/* Track Guideline */}
        <div className="relative w-full h-1 bg-gray-800 rounded-full mt-6">
          <div
            className="absolute -top-3.5 w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-400 shadow-lg border-2 border-white flex items-center justify-center text-[10px] font-black text-white"
            style={{
              left: `calc(${easedValue * 85}% - 4px)`
            }}
          >
            ★
          </div>
        </div>

        {/* Start / End Markers */}
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>Keyframe A (0%)</span>
          <span>Keyframe B (100%)</span>
        </div>

        {/* Timeline Scrub Progress Bar */}
        <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
          <div className="bg-indigo-500 h-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Curve Type Selector Buttons */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        {(['linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic'] as const).map(c => (
          <button
            key={c}
            onClick={() => setCurve(c)}
            className={`py-1.5 px-2 rounded-lg font-bold capitalize transition-all ${
              curve === c ? 'bg-indigo-600 text-white shadow' : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
          >
            {c === 'easeInOut' ? 'Ease In-Out' : c === 'easeIn' ? 'Ease In' : c === 'easeOut' ? 'Ease Out' : c}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 4. Interactive Game Script & Actor Simulator
// ==========================================
export const GameScriptSimulator: React.FC = () => {
  const [posX, setPosX] = useState<number>(50);
  const [posY, setPosY] = useState<number>(110);
  const [score, setScore] = useState<number>(0);
  const [actorColor, setActorColor] = useState<string>('#10b981');
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [dialogue, setDialogue] = useState<string>('Press Arrow Keys to move me!');

  const moveLeft = () => setPosX(prev => Math.max(10, prev - 15));
  const moveRight = () => setPosX(prev => Math.min(260, prev + 15));
  const jump = () => {
    if (isJumping) return;
    setIsJumping(true);
    setPosY(50);
    setTimeout(() => {
      setPosY(110);
      setIsJumping(false);
    }, 350);
  };

  const handleActorClick = () => {
    setScore(prev => prev + 10);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    setActorColor(colors[Math.floor(Math.random() * colors.length)]);
    setDialogue(`Clicked! +10 Points! (Total: ${score + 10})`);
  };

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
          <Icons.Gamepad2 size={14} />
          <span>Interactive Script & Collision Stage</span>
        </span>
        <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
          Score: {score}
        </span>
      </div>

      {/* Mini Playable Stage */}
      <div className="relative w-full h-44 bg-gray-950 rounded-xl border border-gray-800 overflow-hidden select-none">
        {/* Dialogue Bubble */}
        <div className="absolute top-2 left-2 right-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-emerald-300 border border-emerald-500/30 font-mono shadow truncate">
          💬 {dialogue}
        </div>

        {/* Floor */}
        <div className="absolute bottom-4 left-0 right-0 h-1 bg-emerald-800/60" />

        {/* Interactive Actor */}
        <div
          onClick={handleActorClick}
          className="absolute w-10 h-10 rounded-xl shadow-lg border-2 border-white flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-90"
          style={{
            left: `${posX}px`,
            top: `${posY}px`,
            backgroundColor: actorColor
          }}
          title="Click actor to trigger onClick event!"
        >
          <span className="text-[14px]">🤖</span>
          <span className="text-[7px] font-black text-white bg-black/60 px-1 rounded -mt-1">Actor</span>
        </div>

        {/* Collectible Star */}
        <div
          onClick={() => {
            setScore(prev => prev + 50);
            setDialogue('★ Collected Star! +50 Points!');
          }}
          className="absolute top-16 right-8 text-xl animate-bounce cursor-pointer hover:scale-125 transition-transform"
          title="Click to collect!"
        >
          ⭐
        </div>
      </div>

      {/* Stage Controller Controls */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={moveLeft}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl active:scale-95 font-bold"
            title="Move Left"
          >
            <Icons.ChevronLeft size={14} />
          </button>
          <button
            onClick={jump}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl active:scale-95 font-bold text-[11px]"
            title="Jump"
          >
            Jump (Space)
          </button>
          <button
            onClick={moveRight}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl active:scale-95 font-bold"
            title="Move Right"
          >
            <Icons.ChevronRight size={14} />
          </button>
        </div>

        <button
          onClick={() => {
            setScore(0);
            setPosX(50);
            setDialogue('Game restarted!');
          }}
          className="text-[10px] text-gray-400 hover:text-white underline font-mono"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 5. Lip-Sync & Phoneme Visualizer
// ==========================================
export const LipSyncPhonemeSimulator: React.FC = () => {
  const [selectedPhoneme, setSelectedPhoneme] = useState<string>('A');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const phonemes = [
    { id: 'A', label: 'A / AH', shape: '👄 Open Wide', desc: 'Mouth opens vertically for vowels like "Cat", "Father".' },
    { id: 'E', label: 'E / EE', shape: '😁 Wide Smile', desc: 'Corners stretched back for "See", "Happy".' },
    { id: 'O', label: 'O / OH', shape: '😮 Round Circle', desc: 'Lips rounded into small O shape for "Go", "Boat".' },
    { id: 'U', label: 'U / OO', shape: '😗 Tight Pucker', desc: 'Narrow protrusion for "You", "Moon".' },
    { id: 'M', label: 'M / B / P', shape: '😐 Closed Lips', desc: 'Lips compressed together before sound explosion.' },
    { id: 'F', label: 'F / V', shape: '😬 Teeth on Lip', desc: 'Upper incisors resting on lower lip.' },
    { id: 'L', label: 'L / D / T', shape: '👅 Tongue Up', desc: 'Tongue touches roof of mouth behind front teeth.' }
  ];

  const handlePlayVoice = () => {
    setIsSpeaking(true);
    let step = 0;
    const sequence = ['M', 'E', 'L', 'O', 'A', 'U', 'M'];
    const interval = setInterval(() => {
      setSelectedPhoneme(sequence[step]);
      step++;
      if (step >= sequence.length) {
        clearInterval(interval);
        setIsSpeaking(false);
      }
    }, 280);
  };

  const current = phonemes.find(p => p.id === selectedPhoneme) || phonemes[0];

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-cyan-400 flex items-center gap-1.5">
          <Icons.Music size={14} />
          <span>Lip-Sync & Dialogue Phonemes</span>
        </span>
        <button
          onClick={handlePlayVoice}
          disabled={isSpeaking}
          className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1"
        >
          <Icons.Play size={10} />
          <span>{isSpeaking ? 'Speaking...' : 'Auto Lip-Sync'}</span>
        </button>
      </div>

      {/* Mouth Graphic Visualizer */}
      <div className="relative w-full h-36 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-2">
          {/* Stylized Mouth Box */}
          <div className="w-24 h-16 bg-pink-950/60 border-2 border-pink-500/80 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-150">
            {selectedPhoneme === 'A' && <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white" />}
            {selectedPhoneme === 'E' && <div className="w-16 h-4 rounded-full bg-red-500 border border-white" />}
            {selectedPhoneme === 'O' && <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white" />}
            {selectedPhoneme === 'U' && <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white" />}
            {selectedPhoneme === 'M' && <div className="w-14 h-1 bg-red-400 rounded-full" />}
            {selectedPhoneme === 'F' && <div className="w-12 h-3 bg-red-600 border-t-4 border-white rounded-b-xl" />}
            {selectedPhoneme === 'L' && <div className="w-10 h-7 bg-red-600 rounded-t-full border-t-4 border-pink-300" />}
          </div>

          <div className="text-center">
            <span className="text-sm font-black text-white">{current.label}</span>
            <p className="text-[10px] text-gray-400 max-w-xs">{current.desc}</p>
          </div>
        </div>
      </div>

      {/* Phoneme Selection Pills */}
      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
        {phonemes.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPhoneme(p.id)}
            className={`py-1 rounded-lg font-bold transition-all ${
              selectedPhoneme === p.id ? 'bg-cyan-600 text-white shadow' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 6. Symbol Architecture & Target Frame Binding Simulator
// ==========================================
export const SymbolFrameBindingSimulator: React.FC = () => {
  const [activeFrame, setActiveFrame] = useState<number>(0);
  const [targetConfig, setTargetConfig] = useState<{ [key: string]: number | 'all' }>({
    playerHero: 'all',
    powerUpCoin: 1, // only on Frame 2
    bossMonster: 2  // only on Frame 3
  });

  const actors = [
    { id: 'playerHero', name: 'Hero (MovieClip)', emoji: '🦸‍♂️', color: 'bg-blue-600' },
    { id: 'powerUpCoin', name: 'Coin (Graphic)', emoji: '🪙', color: 'bg-amber-600' },
    { id: 'bossMonster', name: 'Dragon Boss', emoji: '🐲', color: 'bg-red-600' }
  ];

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-blue-400 flex items-center gap-1.5">
          <Icons.Library size={14} />
          <span>Symbol & Target Frame Binding Simulator</span>
        </span>
        <span className="text-[10px] font-mono text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
          Viewing Frame {activeFrame + 1}
        </span>
      </div>

      {/* Mini Stage Viewport */}
      <div className="relative w-full h-36 bg-gray-950 rounded-xl border border-gray-800 p-3 flex items-center justify-around overflow-hidden select-none">
        <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500">
          Stage Canvas (Frame {activeFrame + 1})
        </div>

        {actors.map(actor => {
          const target = targetConfig[actor.id];
          const isVisible = target === 'all' || target === activeFrame;

          return (
            <div
              key={actor.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-300 ${
                isVisible
                  ? 'border-blue-500/50 bg-gray-900/80 scale-100 opacity-100 shadow-lg'
                  : 'border-dashed border-gray-800 bg-gray-950/40 scale-90 opacity-20 filter grayscale'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow ${actor.color}`}>
                {actor.emoji}
              </div>
              <span className="text-[9px] font-bold text-gray-300 truncate max-w-[70px]">{actor.name}</span>
              <span className={`text-[8px] font-mono px-1 rounded ${isVisible ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-500'}`}>
                {isVisible ? 'ON STAGE' : 'HIDDEN'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Frame Timeline Selector */}
      <div className="flex items-center justify-between bg-gray-900/80 p-1.5 rounded-xl border border-gray-800">
        <span className="text-[10px] text-gray-400 font-medium pl-1">Scrub Frame:</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map(f => (
            <button
              key={f}
              onClick={() => setActiveFrame(f)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeFrame === f ? 'bg-blue-600 text-white shadow' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Frame {f + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Binding Selectors */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Configure Actor Placement:</span>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          {actors.map(actor => (
            <div key={actor.id} className="bg-gray-900 p-2 rounded-xl border border-gray-800 flex flex-col gap-1">
              <span className="font-bold text-gray-300 truncate">{actor.name}</span>
              <select
                value={targetConfig[actor.id]}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  setTargetConfig(prev => ({ ...prev, [actor.id]: val }));
                }}
                className="bg-black text-white text-[9px] border border-gray-700 rounded px-1 py-0.5"
              >
                <option value="all">✨ All Frames</option>
                <option value={0}>Frame 1</option>
                <option value={1}>Frame 2</option>
                <option value={2}>Frame 3</option>
                <option value={3}>Frame 4</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. Spritesheet & Starling XML Atlas Simulator
// ==========================================
export const SpritesheetAtlasSimulator: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeFrame, setActiveFrame] = useState<number>(0);

  const frames = [
    { name: 'idle_01', emoji: '🧍', x: 0, y: 0, w: 64, h: 64 },
    { name: 'walk_01', emoji: '🚶', x: 64, y: 0, w: 64, h: 64 },
    { name: 'walk_02', emoji: '🏃', x: 128, y: 0, w: 64, h: 64 },
    { name: 'jump_01', emoji: '🧗', x: 0, y: 64, w: 64, h: 64 },
    { name: 'attack_01', emoji: '⚔️', x: 64, y: 64, w: 64, h: 64 },
    { name: 'hit_01', emoji: '💥', x: 128, y: 64, w: 64, h: 64 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFrame(prev => (prev + 1) % frames.length);
    }, 320);
    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <div className="space-y-3 bg-[#111115] p-4 rounded-2xl border border-gray-800 text-xs">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-purple-400 flex items-center gap-1.5">
          <Icons.FileArchive size={14} />
          <span>Starling XML Texture Atlas Packer</span>
        </span>
        <span className="text-[10px] font-mono text-purple-300">192x128 Packed Atlas</span>
      </div>

      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Spritesheet Texture Map Grid */}
        <div className="col-span-7 bg-gray-950 p-2 rounded-xl border border-gray-800 relative">
          <div className="grid grid-cols-3 gap-1">
            {frames.map((f, idx) => (
              <div
                key={f.name}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all cursor-pointer ${
                  hoveredIndex === idx || activeFrame === idx
                    ? 'border-purple-400 bg-purple-950/60 shadow-lg scale-105'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-600'
                }`}
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-[8px] font-mono text-gray-400">{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Looping Animated Output */}
        <div className="col-span-5 bg-gray-950 p-3 rounded-xl border border-gray-800 flex flex-col items-center justify-center space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Engine Playback</span>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-900 to-indigo-950 border-2 border-purple-500/50 flex items-center justify-center text-3xl shadow-inner">
            {frames[activeFrame].emoji}
          </div>
          <span className="text-[9px] font-mono text-purple-300">{frames[activeFrame].name}</span>
        </div>
      </div>

      {/* Starling XML Inspector */}
      <div className="bg-black/90 p-2.5 rounded-xl border border-gray-800 font-mono text-[9px] text-gray-300 overflow-x-auto">
        <span className="text-purple-400 font-bold">&lt;TextureAtlas imagePath="spritesheet.png"&gt;</span>
        <div className="pl-3 text-gray-400">
          &lt;SubTexture name="{frames[hoveredIndex ?? activeFrame].name}" x="{frames[hoveredIndex ?? activeFrame].x}" y="{frames[hoveredIndex ?? activeFrame].y}" width="64" height="64" /&gt;
        </div>
        <span className="text-purple-400 font-bold">&lt;/TextureAtlas&gt;</span>
      </div>
    </div>
  );
};

