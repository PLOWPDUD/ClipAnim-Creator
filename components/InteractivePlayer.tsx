import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Frame, Layer, Actor, BackgroundSettings, AudioTrack } from '../types';
import { Icons } from '../Icons';
import { generateLiveHtmlGame } from '../utils/htmlGameExporter';

interface InteractivePlayerProps {
  frames: Frame[];
  layers?: Layer[];
  actors: Actor[];
  projectScript: string;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundSettings;
  backgroundImage?: string | null;
  audioTracks?: AudioTrack[];
  projectName?: string;
  onClose: () => void;
  onExportHtml?: () => void;
}

export const InteractivePlayer: React.FC<InteractivePlayerProps> = ({
  frames,
  layers = [],
  actors,
  projectScript,
  fps,
  canvasWidth,
  canvasHeight,
  background,
  backgroundImage,
  audioTracks = [],
  projectName = 'ClipAnim Game',
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setCurrentFrameState] = useState(0);
  const [isPlayingState, setIsPlayingState] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [hudStats, setHudStats] = useState({ fps: fps, score: 0, frame: '1/1' });
  const [showStats, setShowStats] = useState(false);

  // Actor state refs so scripts can mutate them
  const activeActorsRef = useRef<Actor[]>(JSON.parse(JSON.stringify(actors)));
  const currentFrameRef = useRef(0);
  const isPlayingRef = useRef(true);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const gameStateRef = useRef('playing');

  // Input States
  const keysRef = useRef<Record<string, boolean>>({});
  const keysJustPressedRef = useRef<Record<string, boolean>>({});
  const mousePosRef = useRef({ x: canvasWidth / 2, y: canvasHeight / 2 });
  const isMouseDownRef = useRef(false);

  // Particle System & Screen Shake
  const particlesRef = useRef<any[]>([]);
  const cameraShakeRef = useRef({ intensity: 0, duration: 0 });

  // Image caches to prevent endless asynchronous reloads
  const frameImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const actorImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const scriptContexts = useRef<Map<string, any>>(new Map());
  const symbolScopeRef = useRef<Record<string, any>>({});
  const triggerFrameScriptRef = useRef<(index: number) => void>(() => {});
  const lastExecutedFrameIndex = useRef<number>(-1);

  // Export HTML Handler
  const handleExportHtml = async () => {
    if (isExportingHtml) return;
    setIsExportingHtml(true);
    setExportProgress(10);
    try {
      const { blob, filename } = await generateLiveHtmlGame({
        projectName: projectName || 'ClipAnim_Game',
        frames,
        layers: layers.length > 0 ? layers : [{ id: '1', name: 'Layer 1', isVisible: true, isLocked: false, opacity: 1, blendMode: 'source-over' }],
        actors,
        projectScript,
        fps,
        canvasSize: { width: canvasWidth, height: canvasHeight },
        background,
        backgroundImage,
        audioTracks,
        onProgress: (pct) => setExportProgress(pct)
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      setIsExportingHtml(false);
      setExportProgress(100);
    } catch (err: any) {
      console.error("Direct HTML Export error:", err);
      alert("Failed to export HTML game: " + (err.message || 'Unknown error'));
      setIsExportingHtml(false);
    }
  };

  const restartGame = useCallback(() => {
    currentFrameRef.current = 0;
    setCurrentFrameState(0);
    isPlayingRef.current = true;
    setIsPlayingState(true);
    scoreRef.current = 0;
    livesRef.current = 3;
    gameStateRef.current = 'playing';
    particlesRef.current = [];
    lastExecutedFrameIndex.current = -1;
    activeActorsRef.current = JSON.parse(JSON.stringify(actors));
    initActorContexts();
  }, [actors]);

  const initActorContexts = useCallback(() => {
    const api = {
      gotoAndStop: (frameNum: number) => {
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        const frameIndex = Math.max(0, Math.min(frames.length - 1, targetIdx));
        currentFrameRef.current = frameIndex;
        setCurrentFrameState(frameIndex);
        isPlayingRef.current = false;
        setIsPlayingState(false);
        triggerFrameScriptRef.current(frameIndex);
      },
      gotoAndPlay: (frameNum: number) => {
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        const frameIndex = Math.max(0, Math.min(frames.length - 1, targetIdx));
        currentFrameRef.current = frameIndex;
        setCurrentFrameState(frameIndex);
        isPlayingRef.current = true;
        setIsPlayingState(true);
        triggerFrameScriptRef.current(frameIndex);
      },
      play: () => {
        isPlayingRef.current = true;
        setIsPlayingState(true);
      },
      stop: () => {
        isPlayingRef.current = false;
        setIsPlayingState(false);
      },
      nextFrame: () => {
        const next = (currentFrameRef.current + 1) % frames.length;
        currentFrameRef.current = next;
        setCurrentFrameState(next);
        triggerFrameScriptRef.current(next);
      },
      prevFrame: () => {
        const prev = (currentFrameRef.current - 1 + frames.length) % frames.length;
        currentFrameRef.current = prev;
        setCurrentFrameState(prev);
        triggerFrameScriptRef.current(prev);
      },
      get currentFrame() {
        return currentFrameRef.current + 1;
      },
      getCurrentFrame: () => {
        return currentFrameRef.current + 1;
      },
      get totalFrames() {
        return frames.length;
      },
      getTotalFrames: () => {
        return frames.length;
      }
    };

    const gameUtils = {
      isKeyDown: (k: string) => !!keysRef.current[k] || !!keysRef.current[k.toLowerCase()] || !!keysRef.current[k.toUpperCase()],
      isKeyPressed: (k: string) => !!keysJustPressedRef.current[k] || !!keysJustPressedRef.current[k.toLowerCase()],
      get mouseX() { return mousePosRef.current.x; },
      get mouseY() { return mousePosRef.current.y; },
      get isMouseDown() { return isMouseDownRef.current; },
      get isPointerDown() { return isMouseDownRef.current; },
      get score() { return scoreRef.current; },
      set score(val: number) { scoreRef.current = val; },
      setScore: (val: number) => { scoreRef.current = val; },
      getScore: () => scoreRef.current,
      addScore: (n: number) => { scoreRef.current += n; },
      get lives() { return livesRef.current; },
      set lives(val: number) { livesRef.current = val; },
      get gameState() { return gameStateRef.current; },
      set gameState(val: string) { gameStateRef.current = val; },
      saveGame: (key: string, val: any) => {
        try { localStorage.setItem('clipanim_save_' + key, JSON.stringify(val)); } catch (e) {}
      },
      loadGame: (key: string, fallback: any) => {
        try {
          const res = localStorage.getItem('clipanim_save_' + key);
          return res ? JSON.parse(res) : fallback;
        } catch (e) { return fallback; }
      },
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      randomRange: (min: number, max: number) => min + Math.random() * (max - min),
      randomInt: (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1)),
      distance: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
      angleBetween: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI),
      shakeCamera: (intensity = 10, durationMs = 300) => {
        cameraShakeRef.current = { intensity, duration: durationMs };
      },
      spawnParticle: (opt: any) => {
        particlesRef.current.push({
          x: opt.x || canvasWidth / 2,
          y: opt.y || canvasHeight / 2,
          vx: opt.vx || (Math.random() - 0.5) * 6,
          vy: opt.vy || (Math.random() - 0.5) * 6,
          size: opt.size || 6,
          color: opt.color || '#FF3B30',
          alpha: 1,
          life: opt.life || 30,
          maxLife: opt.life || 30,
          gravity: opt.gravity || 0
        });
      },
      playSound: (nameOrIndex: string | number, options: any = {}) => {
        if (isMuted) return;
        let track: AudioTrack | undefined;
        if (typeof nameOrIndex === 'number') {
          track = audioTracks[nameOrIndex];
        } else {
          track = audioTracks.find(t => t.name === nameOrIndex || t.id === nameOrIndex);
        }
        if (!track || !track.url) return;
        try {
          const audio = new Audio(track.url);
          audio.volume = (options.volume ?? track.volume ?? 1);
          audio.loop = !!options.loop;
          if (options.playbackRate) audio.playbackRate = options.playbackRate;
          audio.play().catch(() => {});
        } catch (e) {}
      },
      stopAllSounds: () => {},
      getActor: (name: string) => symbolScopeRef.current[name] || null,
      getActors: () => Object.values(symbolScopeRef.current)
    };

    const runScript = (code: string, contextObj: any = {}) => {
      try {
        const environment = {
          _global_gotoAndStop: api.gotoAndStop,
          _global_gotoAndPlay: api.gotoAndPlay,
          _global_play: api.play,
          _global_stop: api.stop,
          _global_nextFrame: api.nextFrame,
          _global_prevFrame: api.prevFrame,
          getCurrentFrame: api.getCurrentFrame,
          get currentFrame() {
            return currentFrameRef.current + 1;
          },
          get totalFrames() {
            return frames.length;
          },
          keys: keysRef.current,
          ...gameUtils,
          ...symbolScopeRef.current,
        };
        const keys = Object.keys(environment);
        const values = Object.values(environment);
        const fn = new Function(...keys, 
            `const gotoAndStop = _global_gotoAndStop;
             const gotoAndPlay = _global_gotoAndPlay;
             const play = _global_play;
             const stop = _global_stop;
             const nextFrame = _global_nextFrame;
             const prevFrame = _global_prevFrame;
             ${code}`
        );
        fn.apply(contextObj, values);
      } catch (e) {
        console.error("ActionScript Execution Error:", e);
      }
    };

    // Setup actor contexts
    activeActorsRef.current.forEach(actor => {
      const context = {
        name: actor.name,
        x: actor.x,
        y: actor.y,
        vx: 0,
        vy: 0,
        rotation: actor.rotation || 0,
        scaleX: actor.scaleX ?? 1,
        scaleY: actor.scaleY ?? 1,
        opacity: actor.opacity ?? 1,
        visible: true,
        width: actor.width,
        height: actor.height,
        onUpdate: null as Function | null,
        onClick: null as Function | null,
        onPointerDown: null as Function | null,
        onPointerUp: null as Function | null,
        onKeyDown: null as Function | null,
        onKeyUp: null as Function | null,
        _symbolFrameIndex: 0,
        _symbolIsPlaying: true,
        _symbolAccumulator: 0,
        ...api,
        play: function() { this._symbolIsPlaying = true; },
        stop: function() { this._symbolIsPlaying = false; },
        gotoAndStop: function(frame: number) {
            this._symbolIsPlaying = false;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
        },
        gotoAndPlay: function(frame: number) {
            this._symbolIsPlaying = true;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
        },
        get currentFrame(): number {
          return currentFrameRef.current + 1;
        },
        get symbolFrame(): number {
          return this._symbolFrameIndex + 1;
        },
        get totalFrames(): number {
          return actor.symbolFrames?.length || 1;
        },
        hitTest: function(other: any) {
          if (!other || other.visible === false || !this.visible) return false;
          const b1 = { x: this.x, y: this.y, w: this.width * Math.abs(this.scaleX), h: this.height * Math.abs(this.scaleY) };
          const b2 = { x: other.x, y: other.y, w: other.width * Math.abs(other.scaleX || 1), h: other.height * Math.abs(other.scaleY || 1) };
          return (b1.x < b2.x + b2.w && b1.x + b1.w > b2.x && b1.y < b2.y + b2.h && b1.y + b1.h > b2.y);
        },
        hitTestPoint: function(px: number, py: number) {
          if (!this.visible) return false;
          const w = this.width * Math.abs(this.scaleX);
          const h = this.height * Math.abs(this.scaleY);
          return px >= this.x && px <= this.x + w && py >= this.y && py <= this.y + h;
        },
        distanceTo: function(other: any) {
          if (!other) return Infinity;
          const c1x = this.x + this.width / 2;
          const c1y = this.y + this.height / 2;
          const c2x = other.x + (other.width || 0) / 2;
          const c2y = other.y + (other.height || 0) / 2;
          return Math.hypot(c2x - c1x, c2y - c1y);
        },
        lookAt: function(tx: number, ty: number) {
          const cx = this.x + this.width / 2;
          const cy = this.y + this.height / 2;
          this.rotation = Math.atan2(ty - cy, tx - cx) * (180 / Math.PI);
        },
        destroy: function() {
          this.visible = false;
        }
      };

      scriptContexts.current.set(actor.id, context);
      symbolScopeRef.current[actor.name] = context;
    });

    // Run actor initialization scripts
    activeActorsRef.current.forEach(actor => {
      const context = scriptContexts.current.get(actor.id);
      if (actor.scripts && context) {
        runScript(actor.scripts, context);
      }
    });

    // Run global script
    if (projectScript) {
      runScript(projectScript);
    }

    const triggerFrameScript = (frameIndex: number) => {
      if (frameIndex === lastExecutedFrameIndex.current) return;
      lastExecutedFrameIndex.current = frameIndex;
      const frame = frames[frameIndex];
      if (frame && frame.script) {
        runScript(frame.script);
      }
    };

    triggerFrameScriptRef.current = triggerFrameScript;
    triggerFrameScript(0);

  }, [frames, projectScript, canvasWidth, canvasHeight, audioTracks, isMuted]);

  useEffect(() => {
    initActorContexts();
  }, [initActorContexts]);

  // Keyboard and Pointer Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      keysRef.current[e.code] = true;
      keysJustPressedRef.current[e.key] = true;
      keysJustPressedRef.current[e.code] = true;

      // Broadcast to actors
      activeActorsRef.current.forEach(actor => {
        const ctxData = scriptContexts.current.get(actor.id);
        if (ctxData && ctxData.onKeyDown) {
          try { ctxData.onKeyDown(e.key, e); } catch (err) {}
        }
      });

      if (e.key === 'r' || e.key === 'R') restartGame();
      if (e.key === 'p' || e.key === 'P') {
        isPlayingRef.current = !isPlayingRef.current;
        setIsPlayingState(isPlayingRef.current);
      }
      if (e.key === 'm' || e.key === 'M') setIsMuted(prev => !prev);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      keysRef.current[e.code] = false;
      delete keysJustPressedRef.current[e.key];
      delete keysJustPressedRef.current[e.code];

      activeActorsRef.current.forEach(actor => {
        const ctxData = scriptContexts.current.get(actor.id);
        if (ctxData && ctxData.onKeyUp) {
          try { ctxData.onKeyUp(e.key, e); } catch (err) {}
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [restartGame]);

  // Main Render Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameAccumulator = 0;
    let fpsCount = 0;
    let fpsTimer = 0;
    let animationFrameId: number;

    const render = (dt: number) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;

      ctx.save();

      // Screen Shake
      if (cameraShakeRef.current.duration > 0) {
        cameraShakeRef.current.duration -= dt;
        const shakeX = (Math.random() - 0.5) * cameraShakeRef.current.intensity;
        const shakeY = (Math.random() - 0.5) * cameraShakeRef.current.intensity;
        ctx.translate(shakeX, shakeY);
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw background
      if (background.type === 'gradient3' && background.gradientColors) {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        grad.addColorStop(0, background.gradientColors[0]);
        grad.addColorStop(0.5, background.gradientColors[1]);
        grad.addColorStop(1, background.gradientColors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (background.color && background.color !== 'transparent') {
        ctx.fillStyle = background.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Draw current frame (composite)
      const frameData = frames[currentFrameRef.current];
      if (frameData && frameData.thumbnailUrl) {
        let img = frameImageCache.current.get(frameData.id);
        if (!img) {
          img = new Image();
          img.src = frameData.thumbnailUrl;
          frameImageCache.current.set(frameData.id, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        }
      }

      // Draw Actors
      activeActorsRef.current.forEach(actor => {
        if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) return;

        const ctxData = scriptContexts.current.get(actor.id);
        if (!ctxData || !ctxData.visible) return;

        // Run update script
        if (ctxData.onUpdate) {
          try {
            ctxData.onUpdate(dt / 1000);
          } catch (e) {
            console.error("onUpdate error:", e);
          }
        }

        if (ctxData.vx) ctxData.x += ctxData.vx;
        if (ctxData.vy) ctxData.y += ctxData.vy;

        // Apply transformations
        ctx.save();
        ctx.translate(ctxData.x + actor.width / 2, ctxData.y + actor.height / 2);
        ctx.rotate((ctxData.rotation * Math.PI) / 180);
        ctx.scale(ctxData.scaleX, ctxData.scaleY);
        ctx.globalAlpha = Math.max(0, Math.min(1, ctxData.opacity));

        let currentDataUrl = actor.dataUrl;
        if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 0) {
          const frameIndex = ctxData._symbolFrameIndex || 0;
          currentDataUrl = actor.symbolFrames[frameIndex]?.thumbnailUrl || currentDataUrl;
        }

        let img = actorImageCache.current.get(actor.id + '_' + (ctxData._symbolFrameIndex || 0));
        if (!img || img.src !== currentDataUrl) {
          img = new Image();
          img.src = currentDataUrl;
          actorImageCache.current.set(actor.id + '_' + (ctxData._symbolFrameIndex || 0), img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -actor.width / 2, -actor.height / 2, actor.width, actor.height);
        }

        ctx.restore();
      });

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      ctx.restore();
    };

    const loop = (time: number) => {
      const deltaTime = Math.min(100, time - lastTime);
      lastTime = time;

      // Stats
      fpsCount++;
      fpsTimer += deltaTime;
      if (fpsTimer >= 1000) {
        setHudStats({
          fps: fpsCount,
          score: scoreRef.current,
          frame: `${currentFrameRef.current + 1}/${frames.length}`
        });
        fpsCount = 0;
        fpsTimer = 0;
      }

      const currentFrameObj = frames[currentFrameRef.current];
      const durationMult = currentFrameObj?.durationMultiplier || 1;
      const frameInterval = (1000 / fps) * durationMult;

      if (isPlayingRef.current) {
        frameAccumulator += deltaTime;
        if (frameAccumulator >= frameInterval) {
          const nextFrame = (currentFrameRef.current + 1) % frames.length;
          currentFrameRef.current = nextFrame;
          setCurrentFrameState(nextFrame);
          frameAccumulator -= frameInterval;
          if (triggerFrameScriptRef.current) {
            triggerFrameScriptRef.current(nextFrame);
          }
        }
      }

      // Animate symbols
      activeActorsRef.current.forEach(actor => {
        if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 1) {
          const ctxData = scriptContexts.current.get(actor.id);
          if (ctxData && ctxData._symbolIsPlaying) {
            const symbolFps = actor.symbolFps || fps;
            const symbolInterval = 1000 / symbolFps;
            ctxData._symbolAccumulator = (ctxData._symbolAccumulator || 0) + deltaTime;
            if (ctxData._symbolAccumulator >= symbolInterval) {
              ctxData._symbolFrameIndex = ((ctxData._symbolFrameIndex || 0) + 1) % actor.symbolFrames.length;
              ctxData._symbolAccumulator -= symbolInterval;
            }
          }
        }
      });

      render(deltaTime);

      // Clear just pressed
      for (const k in keysJustPressedRef.current) {
        delete keysJustPressedRef.current[k];
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [fps, frames, canvasWidth, canvasHeight, background]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    mousePosRef.current = { x: clickX, y: clickY };
    isMouseDownRef.current = true;

    for (let i = activeActorsRef.current.length - 1; i >= 0; i--) {
      const actor = activeActorsRef.current[i];
      const ctxData = scriptContexts.current.get(actor.id);
      if (!ctxData || !ctxData.visible) continue;

      if (ctxData.hitTestPoint(clickX, clickY)) {
        if (ctxData.onPointerDown) ctxData.onPointerDown(e);
        if (ctxData.onClick) {
          try {
            ctxData.onClick(e);
          } catch (err) {
            console.error("onClick error:", err);
          }
        }
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    mousePosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isMouseDownRef.current = false;
    activeActorsRef.current.forEach(actor => {
      const ctxData = scriptContexts.current.get(actor.id);
      if (ctxData && ctxData.onPointerUp) ctxData.onPointerUp(e);
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 select-none">
      {/* Top Action Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white flex items-center gap-2.5 shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold tracking-wider uppercase">Interactive Movie</span>
            <span className="text-[10px] text-gray-400 font-mono">({frames.length} frames)</span>
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${showStats ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'}`}
          >
            📊 Stats
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Export HTML button */}
          <button
            onClick={handleExportHtml}
            disabled={isExportingHtml}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-2 border border-emerald-400/30 hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Export this interactive project as a live, standalone .html game"
          >
            {isExportingHtml ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Exporting ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <Icons.Gamepad2 size={16} />
                <span>Export Live .HTML</span>
              </>
            )}
          </button>

          <button
            onClick={restartGame}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            title="Restart Game (R)"
          >
            <Icons.RotateCcw size={18} />
          </button>

          <button
            onClick={() => {
              isPlayingRef.current = !isPlayingRef.current;
              setIsPlayingState(isPlayingRef.current);
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            title={isPlayingState ? "Pause (P)" : "Play (P)"}
          >
            {isPlayingState ? <Icons.Pause size={18} /> : <Icons.Play size={18} />}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-full transition-colors backdrop-blur-md ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Mute Audio (M)"
          >
            {isMuted ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
          </button>

          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-2.5 rounded-full transition-colors backdrop-blur-md ${showTouchControls ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Toggle Touch D-Pad"
          >
            <Icons.Gamepad size={18} />
          </button>

          <button 
            onClick={onClose} 
            className="p-2.5 bg-white/10 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-md shadow-2xl ml-2"
            title="Close Player"
          >
            <Icons.X size={20} />
          </button>
        </div>
      </div>

      {/* Stats overlay */}
      {showStats && (
        <div className="absolute top-16 left-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-300 z-50 pointer-events-none shadow-2xl flex flex-col gap-1">
          <div>FPS: <span className="text-emerald-400 font-bold">{hudStats.fps}</span> / {fps}</div>
          <div>Frame: <span className="text-amber-400">{hudStats.frame}</span></div>
          <div>Score: <span className="text-blue-400">{hudStats.score}</span></div>
          <div>Actors: <span className="text-purple-400">{actors.length}</span></div>
        </div>
      )}

      {/* Viewport Box */}
      <div 
        ref={containerRef}
        className="relative bg-[#111111] shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-xl overflow-hidden border border-white/10 max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Virtual On-screen Touch Controls (if enabled) */}
      {showTouchControls && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pointer-events-none z-50">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 pointer-events-auto">
            <div></div>
            <button 
              onPointerDown={() => { keysRef.current['ArrowUp'] = true; }} 
              onPointerUp={() => { keysRef.current['ArrowUp'] = false; }}
              className="w-12 h-12 rounded-xl bg-white/20 active:bg-red-500 text-white font-bold backdrop-blur-md flex items-center justify-center"
            >▲</button>
            <div></div>
            <button 
              onPointerDown={() => { keysRef.current['ArrowLeft'] = true; }} 
              onPointerUp={() => { keysRef.current['ArrowLeft'] = false; }}
              className="w-12 h-12 rounded-xl bg-white/20 active:bg-red-500 text-white font-bold backdrop-blur-md flex items-center justify-center"
            >◀</button>
            <div></div>
            <button 
              onPointerDown={() => { keysRef.current['ArrowRight'] = true; }} 
              onPointerUp={() => { keysRef.current['ArrowRight'] = false; }}
              className="w-12 h-12 rounded-xl bg-white/20 active:bg-red-500 text-white font-bold backdrop-blur-md flex items-center justify-center"
            >▶</button>
            <div></div>
            <button 
              onPointerDown={() => { keysRef.current['ArrowDown'] = true; }} 
              onPointerUp={() => { keysRef.current['ArrowDown'] = false; }}
              className="w-12 h-12 rounded-xl bg-white/20 active:bg-red-500 text-white font-bold backdrop-blur-md flex items-center justify-center"
            >▼</button>
            <div></div>
          </div>

          <div className="flex items-end gap-3 pointer-events-auto">
            <button 
              onPointerDown={() => { keysRef.current['KeyZ'] = true; }} 
              onPointerUp={() => { keysRef.current['KeyZ'] = false; }}
              className="w-14 h-14 rounded-full bg-blue-500/40 border border-blue-400 active:bg-blue-600 text-white font-bold backdrop-blur-md flex items-center justify-center shadow-lg"
            >B</button>
            <button 
              onPointerDown={() => { keysRef.current['Space'] = true; }} 
              onPointerUp={() => { keysRef.current['Space'] = false; }}
              className="w-16 h-16 rounded-full bg-red-500/50 border border-red-400 active:bg-red-600 text-white font-bold backdrop-blur-md flex items-center justify-center shadow-lg"
            >A</button>
          </div>
        </div>
      )}

      {/* Footer shortcut hints */}
      <div className="absolute bottom-2 text-center text-[11px] text-gray-500 pointer-events-none">
        Controls: [R] Restart • [P] Pause • [M] Mute Audio • Click / Arrow keys / Spacebar for game input
      </div>
    </div>
  );
};
