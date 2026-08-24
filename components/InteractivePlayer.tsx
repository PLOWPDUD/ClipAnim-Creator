import React, { useEffect, useRef, useState } from 'react';
import { Frame, Actor, BackgroundSettings } from '../types';
import { Icons } from '../Icons';

interface InteractivePlayerProps {
  frames: Frame[];
  actors: Actor[];
  projectScript: string;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundSettings;
  onClose: () => void;
}

export const InteractivePlayer: React.FC<InteractivePlayerProps> = ({
  frames, actors, projectScript, fps, canvasWidth, canvasHeight, background, onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setCurrentFrame] = useState(0);
  const [, setIsPlaying] = useState(true);
  
  // Actor state refs so scripts can mutate them
  const activeActorsRef = useRef<Actor[]>(JSON.parse(JSON.stringify(actors)));
  const currentFrameRef = useRef(0);
  const isPlayingRef = useRef(true);

  // Image caches to prevent endless asynchronous reloads
  const frameImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const actorImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const scriptContexts = useRef<Map<string, any>>(new Map());
  const symbolScopeRef = useRef<Record<string, any>>({});
  const triggerFrameScriptRef = useRef<(index: number) => void>(() => {});
  const lastExecutedFrameIndex = useRef<number>(-1);

  // Setup APIs
  useEffect(() => {
    const triggerFrameScript = (frameIndex: number) => {
      if (frameIndex === lastExecutedFrameIndex.current) return;
      lastExecutedFrameIndex.current = frameIndex;
      const frame = frames[frameIndex];
      if (frame && frame.script) {
        runScript(frame.script);
      }
    };

    triggerFrameScriptRef.current = triggerFrameScript;

    const api = {
      gotoAndStop: (frameNum: number) => {
        // Flash standard is 1-based. If <= 0, fallback to 0.
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        const frameIndex = Math.max(0, Math.min(frames.length - 1, targetIdx));
        currentFrameRef.current = frameIndex;
        setCurrentFrame(frameIndex);
        isPlayingRef.current = false;
        setIsPlaying(false);
        triggerFrameScript(frameIndex);
      },
      gotoAndPlay: (frameNum: number) => {
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        const frameIndex = Math.max(0, Math.min(frames.length - 1, targetIdx));
        currentFrameRef.current = frameIndex;
        setCurrentFrame(frameIndex);
        isPlayingRef.current = true;
        setIsPlaying(true);
        triggerFrameScript(frameIndex);
      },
      play: () => {
        isPlayingRef.current = true;
        setIsPlaying(true);
      },
      stop: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
      },
      get currentFrame() {
        return currentFrameRef.current + 1; // 1-based for users
      },
      getCurrentFrame: () => {
        return currentFrameRef.current + 1;
      }
    };

    const runScript = (code: string, contextObj: any = {}) => {
      try {
        const environment = {
          _global_gotoAndStop: api.gotoAndStop,
          _global_gotoAndPlay: api.gotoAndPlay,
          _global_play: api.play,
          _global_stop: api.stop,
          getCurrentFrame: api.getCurrentFrame,
          get currentFrame() {
            return currentFrameRef.current + 1;
          },
          ...symbolScopeRef.current,
        };
        const keys = Object.keys(environment);
        const values = Object.values(environment);
        // We inject global aliases so they can be called directly, e.g. `gotoAndStop(2)`
        // which controls the main timeline, while `this.gotoAndStop(2)` controls the symbol.
        const fn = new Function(...keys, 
            `const gotoAndStop = _global_gotoAndStop;
             const gotoAndPlay = _global_gotoAndPlay;
             const play = _global_play;
             const stop = _global_stop;
             ${code}`
        );
        fn.apply(contextObj, values);
      } catch (e) {
        console.error("Script execution error:", e);
      }
    };

    // Setup actor contexts
    activeActorsRef.current.forEach(actor => {
      const context = {
        name: actor.name,
        x: actor.x,
        y: actor.y,
        rotation: actor.rotation,
        scaleX: actor.scaleX,
        scaleY: actor.scaleY,
        opacity: actor.opacity,
        visible: true,
        onUpdate: null as Function | null,
        onClick: null as Function | null,
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

    // Trigger starting frame's script
    triggerFrameScript(0);

  }, [frames, projectScript]);

  // Main game loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameAccumulator = 0;
    const frameInterval = 1000 / fps;
    let animationFrameId: number;

    const render = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw background
      if (background.type === 'color') {
        ctx.fillStyle = background.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Draw current frame (all layers composite)
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
          } else {
              img.onload = () => { /* Redrawn in next requestAnimationFrame */ };
          }
      }

      // Draw Actors
      activeActorsRef.current.forEach(actor => {
        if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) return;

        const ctxData = scriptContexts.current.get(actor.id);
        if (!ctxData) return;

        // Run update script (so it can update its own visibility based on currentFrame)
        if (ctxData.onUpdate) {
          try {
            ctxData.onUpdate();
          } catch(e) {
             console.error("onUpdate error:", e);
          }
        }

        if (!ctxData.visible) return;

        // Apply context modifications back to rendering
        ctx.save();
        ctx.translate(ctxData.x + actor.width/2, ctxData.y + actor.height/2);
        ctx.rotate(ctxData.rotation * Math.PI / 180);
        ctx.scale(ctxData.scaleX, ctxData.scaleY);
        ctx.globalAlpha = ctxData.opacity;

        let currentDataUrl = actor.dataUrl;
        if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 0) {
            const frameIndex = ctxData._symbolFrameIndex || 0;
            currentDataUrl = actor.symbolFrames[frameIndex]?.thumbnailUrl || currentDataUrl;
        }

        let img = actorImageCache.current.get(actor.id);
        if (!img || img.src !== currentDataUrl) {
            img = new Image();
            img.src = currentDataUrl;
            actorImageCache.current.set(actor.id, img);
        }
        if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -actor.width/2, -actor.height/2, actor.width, actor.height);
        } else {
            img.onload = () => { /* Redrawn in next requestAnimationFrame */ };
        }
        
        ctx.restore();
      });
    };

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (isPlayingRef.current) {
        frameAccumulator += deltaTime;
        if (frameAccumulator >= frameInterval) {
          const nextFrame = (currentFrameRef.current + 1) % frames.length;
          currentFrameRef.current = nextFrame;
          setCurrentFrame(nextFrame);
          frameAccumulator -= frameInterval;
          // Trigger frame script for the newly entered frame
          if (triggerFrameScriptRef.current) {
            triggerFrameScriptRef.current(nextFrame);
          }
        }
      }

      // Animate symbols independently of main timeline playing state
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

      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [fps, frames, canvasWidth, canvasHeight]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check actor clicks (reverse order for top-most first)
    for (let i = activeActorsRef.current.length - 1; i >= 0; i--) {
      const actor = activeActorsRef.current[i];
      const ctxData = scriptContexts.current.get(actor.id);
      if (!ctxData || !ctxData.visible || !ctxData.onClick) continue;

      // Simple bounding box check (doesn't account for rotation perfectly yet)
      if (clickX >= ctxData.x && clickX <= ctxData.x + actor.width &&
          clickY >= ctxData.y && clickY <= ctxData.y + actor.height) {
         try {
           ctxData.onClick();
         } catch(err) {
           console.error("onClick error:", err);
         }
         return; // Consume click
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-bold tracking-widest uppercase">Testing Movie</span>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md shadow-2xl">
          <Icons.X size={24} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="relative bg-[#111111] shadow-2xl rounded-sm overflow-hidden border border-white/5"
        style={{ width: '100%', maxWidth: '90vw', height: '100%', maxHeight: '90vh', aspectRatio: `${canvasWidth}/${canvasHeight}` }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain touch-none"
          onPointerDown={handlePointerDown}
        />
      </div>
    </div>
  );
};
