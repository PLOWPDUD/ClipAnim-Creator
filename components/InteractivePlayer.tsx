import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Frame, Layer, Actor, BackgroundSettings, AudioTrack, TouchButtonConfig, TouchButtonColor, DEFAULT_TOUCH_BUTTONS } from '../types';
import { Icons } from '../Icons';
import { generateLiveHtmlGame } from '../utils/htmlGameExporter';
import { preprocessActionScript, createFlashCompatibilityEnvironment, attachFlashActorProperties } from '../utils/actionScriptSnippets';

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
  touchButtons?: TouchButtonConfig[];
  onUpdateTouchButtons?: (buttons: TouchButtonConfig[]) => void;
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
  onClose,
  touchButtons,
  onUpdateTouchButtons
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFrameState, setCurrentFrameState] = useState(0);
  const [isPlayingState, setIsPlayingState] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() => 
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  const [pressedPadKeys, setPressedPadKeys] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    a: boolean;
    b: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
  });

  // Dynamic Touchpad Buttons State
  const [playerTouchButtons, setPlayerTouchButtons] = useState<TouchButtonConfig[]>(
    () => (touchButtons && touchButtons.length > 0 ? touchButtons : DEFAULT_TOUCH_BUTTONS)
  );
  const playerTouchButtonsRef = useRef<TouchButtonConfig[]>(playerTouchButtons);
  playerTouchButtonsRef.current = playerTouchButtons;

  useEffect(() => {
    if (touchButtons && touchButtons.length > 0) {
      setPlayerTouchButtons(touchButtons);
    }
  }, [touchButtons]);

  const [pressedCustomBtnIds, setPressedCustomBtnIds] = useState<Record<string, boolean>>({});
  const [isQuickAddButtonOpen, setIsQuickAddButtonOpen] = useState(false);
  const [quickLabel, setQuickLabel] = useState('E');
  const [quickKey, setQuickKey] = useState('e');
  const [quickColor, setQuickColor] = useState<TouchButtonColor>('blue');
  const [quickSize, setQuickSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isQuickDetecting, setIsQuickDetecting] = useState(false);

  useEffect(() => {
    if (!isQuickDetecting) return;
    const handleDetect = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const detectedKey = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
      setQuickKey(detectedKey);
      if (!quickLabel || quickLabel === 'E') {
        setQuickLabel(detectedKey === ' ' ? 'SPACE' : detectedKey.toUpperCase().slice(0, 6));
      }
      setIsQuickDetecting(false);
    };
    window.addEventListener('keydown', handleDetect, { capture: true, once: true });
    return () => {
      window.removeEventListener('keydown', handleDetect, { capture: true });
    };
  }, [isQuickDetecting, quickLabel]);

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
  const flashEnvRef = useRef<any>(null);
  const triggerFrameScriptRef = useRef<(index: number) => void>(() => {});
  const lastExecutedFrameIndex = useRef<number>(-1);
  const dragStateRef = useRef<{ actor: any; lockCenter: boolean; offsetX: number; offsetY: number } | null>(null);
  const pressedActorIdRef = useRef<string | null>(null);

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
        touchButtons: playerTouchButtonsRef.current,
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

  const addTouchButtonDynamic = useCallback((config: any) => {
    if (!config) return null;
    const rawKey = typeof config === 'string' ? config : (config.key || 'e');
    const normKey = rawKey.toLowerCase() === 'space' ? ' ' : rawKey;
    const label = (typeof config === 'string' ? config.toUpperCase() : (config.label || (normKey === ' ' ? 'SPACE' : normKey.toUpperCase()))).slice(0, 10);
    const code = config.code || (normKey.length === 1 ? `Key${normKey.toUpperCase()}` : (normKey === ' ' ? 'Space' : normKey));
    const newBtn: TouchButtonConfig = {
      id: 'btn-' + Math.random().toString(36).slice(2, 9),
      label,
      key: normKey,
      code,
      color: config.color || 'blue',
      size: config.size || 'md',
      position: config.position || 'right'
    };
    setPlayerTouchButtons(prev => {
      const next = [...prev.filter(b => b.label.toLowerCase() !== newBtn.label.toLowerCase()), newBtn];
      if (onUpdateTouchButtons) onUpdateTouchButtons(next);
      return next;
    });
    return newBtn;
  }, [onUpdateTouchButtons]);

  const removeTouchButtonDynamic = useCallback((keyOrLabel: string) => {
    if (!keyOrLabel) return;
    const search = keyOrLabel.toLowerCase();
    setPlayerTouchButtons(prev => {
      const next = prev.filter(b => b.key.toLowerCase() !== search && b.label.toLowerCase() !== search && b.id !== keyOrLabel);
      if (onUpdateTouchButtons) onUpdateTouchButtons(next);
      return next;
    });
  }, [onUpdateTouchButtons]);

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
    const resolveFrameIndex = (target: any, secondArg?: any): number => {
      let val = secondArg !== undefined ? secondArg : target;
      if (typeof val === 'number') {
        return Math.max(0, Math.min(frames.length - 1, val <= 0 ? 0 : Math.round(val) - 1));
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed) && String(parsed) === trimmed) {
          return Math.max(0, Math.min(frames.length - 1, parsed <= 0 ? 0 : parsed - 1));
        }
        const byLabel = frames.findIndex((f, idx) => 
          (f.label && f.label.toLowerCase() === trimmed.toLowerCase()) ||
          ((f as any).name && (f as any).name.toLowerCase() === trimmed.toLowerCase()) ||
          (`frame ${idx + 1}`.toLowerCase() === trimmed.toLowerCase()) ||
          (`frame${idx + 1}`.toLowerCase() === trimmed.toLowerCase())
        );
        if (byLabel !== -1) return byLabel;
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(frames.length - 1, parsed <= 0 ? 0 : parsed - 1));
        }
      }
      return currentFrameRef.current;
    };

    const api = {
      gotoAndStop: (frameOrScene: any, maybeFrame?: any) => {
        const frameIndex = resolveFrameIndex(frameOrScene, maybeFrame);
        currentFrameRef.current = frameIndex;
        setCurrentFrameState(frameIndex);
        setHudStats(s => ({ ...s, frame: `${frameIndex + 1}/${frames.length}` }));
        isPlayingRef.current = false;
        setIsPlayingState(false);
        lastExecutedFrameIndex.current = -1;
        if (triggerFrameScriptRef.current) {
          triggerFrameScriptRef.current(frameIndex);
        }
      },
      gotoAndPlay: (frameOrScene: any, maybeFrame?: any) => {
        const frameIndex = resolveFrameIndex(frameOrScene, maybeFrame);
        currentFrameRef.current = frameIndex;
        setCurrentFrameState(frameIndex);
        setHudStats(s => ({ ...s, frame: `${frameIndex + 1}/${frames.length}` }));
        isPlayingRef.current = true;
        setIsPlayingState(true);
        lastExecutedFrameIndex.current = -1;
        if (triggerFrameScriptRef.current) {
          triggerFrameScriptRef.current(frameIndex);
        }
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
        const next = Math.min(frames.length - 1, currentFrameRef.current + 1);
        currentFrameRef.current = next;
        setCurrentFrameState(next);
        setHudStats(s => ({ ...s, frame: `${next + 1}/${frames.length}` }));
        isPlayingRef.current = false;
        setIsPlayingState(false);
        lastExecutedFrameIndex.current = -1;
        if (triggerFrameScriptRef.current) {
          triggerFrameScriptRef.current(next);
        }
      },
      prevFrame: () => {
        const prev = Math.max(0, currentFrameRef.current - 1);
        currentFrameRef.current = prev;
        setCurrentFrameState(prev);
        setHudStats(s => ({ ...s, frame: `${prev + 1}/${frames.length}` }));
        isPlayingRef.current = false;
        setIsPlayingState(false);
        lastExecutedFrameIndex.current = -1;
        if (triggerFrameScriptRef.current) {
          triggerFrameScriptRef.current(prev);
        }
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
      isKeyDown: (k: string) => {
        if (!k) return false;
        const norm = k === ' ' || k.toLowerCase() === 'space' ? ' ' : k;
        return (
          !!keysRef.current[norm] ||
          !!keysRef.current[k] ||
          !!keysRef.current[k.toLowerCase()] ||
          !!keysRef.current[k.toUpperCase()] ||
          (norm === ' ' ? (!!keysRef.current['Space'] || !!keysRef.current['space']) : false) ||
          (k.length === 1 ? !!keysRef.current[`Key${k.toUpperCase()}`] : false)
        );
      },
      isKeyPressed: (k: string) => {
        if (!k) return false;
        const norm = k === ' ' || k.toLowerCase() === 'space' ? ' ' : k;
        return (
          !!keysJustPressedRef.current[norm] ||
          !!keysJustPressedRef.current[k] ||
          !!keysJustPressedRef.current[k.toLowerCase()] ||
          !!keysJustPressedRef.current[k.toUpperCase()] ||
          (norm === ' ' ? (!!keysJustPressedRef.current['Space'] || !!keysJustPressedRef.current['space']) : false) ||
          (k.length === 1 ? !!keysJustPressedRef.current[`Key${k.toUpperCase()}`] : false)
        );
      },
      addTouchButton: (config: any) => addTouchButtonDynamic(config),
      removeTouchButton: (keyOrLabel: string) => removeTouchButtonDynamic(keyOrLabel),
      getTouchButtons: () => playerTouchButtonsRef.current,
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

    const flashEnv = createFlashCompatibilityEnvironment({
      api,
      gameUtils,
      symbolScope: symbolScopeRef.current,
      frames,
      currentFrameRef,
      keysRef,
      mousePosRef
    });
    flashEnvRef.current = flashEnv;

    const runScript = (code: string, contextObj: any = {}) => {
      try {
        const transformedCode = preprocessActionScript(code);
        const environment = {
          ...flashEnv,
          ...gameUtils,
          ...symbolScopeRef.current,
          getCurrentFrame: api.getCurrentFrame,
          get currentFrame() {
            return currentFrameRef.current + 1;
          },
          get totalFrames() {
            return frames.length;
          },
          keys: keysRef.current,
        };
        const keys = Object.keys(environment);
        const values = Object.values(environment);
        const fn = new Function(
          ...keys,
          `with(this) {\n${transformedCode}\n}
if (typeof onClick === 'function' && !this.onClick) this.onClick = onClick;
if (typeof onRelease === 'function' && !this.onRelease) this.onRelease = onRelease;
if (typeof onPress === 'function' && !this.onPress) this.onPress = onPress;
if (typeof onPointerDown === 'function' && !this.onPointerDown) this.onPointerDown = onPointerDown;
if (typeof onPointerUp === 'function' && !this.onPointerUp) this.onPointerUp = onPointerUp;
if (typeof onEnterFrame === 'function' && !this.onEnterFrame) this.onEnterFrame = onEnterFrame;
if (typeof onUpdate === 'function' && !this.onUpdate) this.onUpdate = onUpdate;
if (typeof onLoad === 'function' && !this.onLoad) this.onLoad = onLoad;
`
        );
        fn.apply(contextObj || {}, values);
      } catch (e) {
        console.error("ActionScript Execution Error:", e);
      }
    };

    // Setup actor contexts
    activeActorsRef.current.forEach(actor => {
      const hasMultiSymbolFrames = actor.symbolFrames && actor.symbolFrames.length > 1;
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
        onEnterFrame: null as Function | null,
        onLoad: null as Function | null,
        onClick: null as Function | null,
        onPress: null as Function | null,
        onRelease: null as Function | null,
        onPointerDown: null as Function | null,
        onPointerUp: null as Function | null,
        onKeyDown: null as Function | null,
        onKeyUp: null as Function | null,
        _symbolFrameIndex: 0,
        _symbolIsPlaying: true,
        _symbolAccumulator: 0,
        ...api,
        play: function() {
          if (hasMultiSymbolFrames) {
            this._symbolIsPlaying = true;
          } else {
            api.play();
          }
        },
        stop: function() {
          if (hasMultiSymbolFrames) {
            this._symbolIsPlaying = false;
          } else {
            api.stop();
          }
        },
        gotoAndStop: function(frameOrScene: any, maybeFrame?: any) {
          if (hasMultiSymbolFrames) {
            const symTarget = typeof maybeFrame === 'number' ? maybeFrame : (typeof frameOrScene === 'number' ? frameOrScene : 1);
            this._symbolIsPlaying = false;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, symTarget - 1));
          } else {
            api.gotoAndStop(frameOrScene, maybeFrame);
          }
        },
        gotoAndPlay: function(frameOrScene: any, maybeFrame?: any) {
          if (hasMultiSymbolFrames) {
            const symTarget = typeof maybeFrame === 'number' ? maybeFrame : (typeof frameOrScene === 'number' ? frameOrScene : 1);
            this._symbolIsPlaying = true;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, symTarget - 1));
          } else {
            api.gotoAndPlay(frameOrScene, maybeFrame);
          }
        },
        gotoAndStopSymbol: function(frame: number) {
          this._symbolIsPlaying = false;
          this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
        },
        gotoAndPlaySymbol: function(frame: number) {
          this._symbolIsPlaying = true;
          this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
        },
        gotoAndStopTimeline: api.gotoAndStop,
        gotoAndPlayTimeline: api.gotoAndPlay,
        _root: flashEnv._root,
        exportRoot: flashEnv.exportRoot,
        root: flashEnv.root,
        stage: flashEnv.stage,
        _parent: flashEnv._parent,
        parent: flashEnv.parent,
        timeline: flashEnv.timeline,
        get currentFrame(): number {
          return currentFrameRef.current + 1;
        },
        get symbolFrame(): number {
          return this._symbolFrameIndex + 1;
        },
        get totalFrames(): number {
          return actor.symbolFrames?.length || 1;
        },
        hitTest: function(other: any, arg2?: any) {
          if (typeof other === 'number' && typeof arg2 === 'number') {
            return this.hitTestPoint(other, arg2);
          }
          if (!other || other.visible === false || !this.visible) return false;
          const b1 = { x: this.x, y: this.y, w: this.width * Math.abs(this.scaleX), h: this.height * Math.abs(this.scaleY) };
          const b2 = { x: other.x, y: other.y, w: other.width * Math.abs(other.scaleX || 1), h: other.height * Math.abs(other.scaleY || 1) };
          return (b1.x < b2.x + b2.w && b1.x + b1.w > b2.x && b1.y < b2.y + b2.h && b1.y + b1.h > b2.y);
        },
        hitTestPoint: function(px: number, py: number) {
          if (!this.visible) return false;
          const w = (this.width || actor.width || 64);
          const h = (this.height || actor.height || 64);
          const sx = Math.abs(this.scaleX ?? actor.scaleX ?? 1) || 1;
          const sy = Math.abs(this.scaleY ?? actor.scaleY ?? 1) || 1;
          const cx = this.x + w / 2;
          const cy = this.y + h / 2;
          
          let rx = px - cx;
          let ry = py - cy;
          const rot = this.rotation || actor.rotation || 0;
          if (rot !== 0) {
            const rad = -(rot * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const nx = rx * cos - ry * sin;
            const ny = rx * sin + ry * cos;
            rx = nx;
            ry = ny;
          }
          const halfW = (w * sx) / 2;
          const halfH = (h * sy) / 2;
          return Math.abs(rx) <= halfW && Math.abs(ry) <= halfH;
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

      attachFlashActorProperties(context, actor, mousePosRef, dragStateRef);

      scriptContexts.current.set(actor.id, context);
      symbolScopeRef.current[actor.name] = context;
    });

    // Run actor initialization scripts
    activeActorsRef.current.forEach(actor => {
      const context = scriptContexts.current.get(actor.id);
      if (actor.scripts && context) {
        runScript(actor.scripts, context);
        if (typeof context.onLoad === 'function') {
          try {
            context.onLoad.call(context);
          } catch (e) {
            console.error("onLoad error:", e);
          }
        }
      }
    });

    // Run global script
    if (projectScript) {
      runScript(projectScript, flashEnv._root);
    }

    const triggerFrameScript = (frameIndex: number) => {
      if (frameIndex === lastExecutedFrameIndex.current) return;
      lastExecutedFrameIndex.current = frameIndex;
      const frame = frames[frameIndex];
      if (frame && frame.script) {
        runScript(frame.script, flashEnv._root);
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

      // Update touchpad visual lighting (light up in red)
      const k = e.key.toLowerCase();
      const code = e.code;
      if (e.key === 'ArrowUp' || code === 'ArrowUp') {
        setPressedPadKeys(prev => prev.up ? prev : { ...prev, up: true });
      }
      if (e.key === 'ArrowDown' || code === 'ArrowDown') {
        setPressedPadKeys(prev => prev.down ? prev : { ...prev, down: true });
      }
      if (e.key === 'ArrowLeft' || code === 'ArrowLeft') {
        setPressedPadKeys(prev => prev.left ? prev : { ...prev, left: true });
      }
      if (e.key === 'ArrowRight' || code === 'ArrowRight') {
        setPressedPadKeys(prev => prev.right ? prev : { ...prev, right: true });
      }
      if (k === 'a' || code === 'KeyA' || code === 'Space' || e.key === ' ') {
        setPressedPadKeys(prev => prev.a ? prev : { ...prev, a: true });
      }
      if (k === 'b' || code === 'KeyB' || k === 'z' || code === 'KeyZ') {
        setPressedPadKeys(prev => prev.b ? prev : { ...prev, b: true });
      }

      // Update custom touch buttons visual glow
      playerTouchButtonsRef.current.forEach(btn => {
        const norm = btn.key.toLowerCase() === 'space' ? ' ' : btn.key;
        if (
          e.key === norm ||
          e.key.toLowerCase() === norm.toLowerCase() ||
          e.code === btn.code ||
          (norm === ' ' && (e.key === ' ' || e.code === 'Space'))
        ) {
          setPressedCustomBtnIds(prev => ({ ...prev, [btn.id]: true }));
        }
      });

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
      if (e.key === 't' || e.key === 'T') setShowTouchControls(prev => !prev);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      keysRef.current[e.code] = false;
      delete keysJustPressedRef.current[e.key];
      delete keysJustPressedRef.current[e.code];

      // Turn off touchpad red lighting when key released
      const k = e.key.toLowerCase();
      const code = e.code;
      if (e.key === 'ArrowUp' || code === 'ArrowUp') {
        setPressedPadKeys(prev => !prev.up ? prev : { ...prev, up: false });
      }
      if (e.key === 'ArrowDown' || code === 'ArrowDown') {
        setPressedPadKeys(prev => !prev.down ? prev : { ...prev, down: false });
      }
      if (e.key === 'ArrowLeft' || code === 'ArrowLeft') {
        setPressedPadKeys(prev => !prev.left ? prev : { ...prev, left: false });
      }
      if (e.key === 'ArrowRight' || code === 'ArrowRight') {
        setPressedPadKeys(prev => !prev.right ? prev : { ...prev, right: false });
      }
      if (k === 'a' || code === 'KeyA' || code === 'Space' || e.key === ' ') {
        const stillDown = keysRef.current['a'] || keysRef.current['A'] || keysRef.current['KeyA'] || keysRef.current['Space'] || keysRef.current[' '];
        if (!stillDown) {
          setPressedPadKeys(prev => !prev.a ? prev : { ...prev, a: false });
        }
      }
      if (k === 'b' || code === 'KeyB' || k === 'z' || code === 'KeyZ') {
        const stillDown = keysRef.current['b'] || keysRef.current['B'] || keysRef.current['KeyB'] || keysRef.current['z'] || keysRef.current['Z'] || keysRef.current['KeyZ'];
        if (!stillDown) {
          setPressedPadKeys(prev => !prev.b ? prev : { ...prev, b: false });
        }
      }

      // Turn off custom touch buttons visual glow
      playerTouchButtonsRef.current.forEach(btn => {
        const norm = btn.key.toLowerCase() === 'space' ? ' ' : btn.key;
        if (
          e.key === norm ||
          e.key.toLowerCase() === norm.toLowerCase() ||
          e.code === btn.code ||
          (norm === ' ' && (e.key === ' ' || e.code === 'Space'))
        ) {
          setPressedCustomBtnIds(prev => ({ ...prev, [btn.id]: false }));
        }
      });

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
      if (frameData) {
        let drawn = false;
        if (frameData.thumbnailUrl) {
          let img = frameImageCache.current.get(frameData.id);
          if (!img) {
            img = new Image();
            img.src = frameData.thumbnailUrl;
            frameImageCache.current.set(frameData.id, img);
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            drawn = true;
          }
        }
        // Fallback to layers if thumbnail is not ready or missing
        if (!drawn && frameData.layers) {
          layers.forEach(layer => {
            if (layer.isVisible === false) return;
            const layerData = frameData.layers[layer.id];
            if (layerData) {
              const layerKey = `${frameData.id}_${layer.id}`;
              let lImg = frameImageCache.current.get(layerKey);
              if (!lImg) {
                lImg = new Image();
                lImg.src = layerData;
                frameImageCache.current.set(layerKey, lImg);
              }
              if (lImg.complete && lImg.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = layer.opacity ?? 1;
                ctx.drawImage(lImg, 0, 0, canvasWidth, canvasHeight);
                ctx.restore();
              }
            }
          });
        }
      }

      // Draw Actors
      activeActorsRef.current.forEach(actor => {
        if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) return;

        const ctxData = scriptContexts.current.get(actor.id);
        if (!ctxData || !ctxData.visible) return;

        // Run update script (ClipAnim onUpdate, Flash 8 onEnterFrame, Animate tick event)
        if (ctxData.onUpdate) {
          try {
            ctxData.onUpdate(dt / 1000);
          } catch (e) {
            console.error("onUpdate error:", e);
          }
        }
        if (ctxData.onEnterFrame) {
          try {
            ctxData.onEnterFrame(dt / 1000);
          } catch (e) {
            console.error("onEnterFrame error:", e);
          }
        }
        if (typeof ctxData.emit === 'function') {
          ctxData.emit('tick', dt / 1000);
          ctxData.emit('enterframe', dt / 1000);
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
      // Filter out actors that only belong to other timeline frames
      if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) continue;

      const ctxData = scriptContexts.current.get(actor.id);
      if (!ctxData || ctxData.visible === false) continue;

      if (ctxData.hitTestPoint(clickX, clickY)) {
        pressedActorIdRef.current = actor.id;

        if (typeof ctxData.onPointerDown === 'function') {
          try { ctxData.onPointerDown(e); } catch (err) { console.error("onPointerDown error:", err); }
        }
        if (typeof ctxData.onPress === 'function') {
          try { ctxData.onPress(e); } catch (err) { console.error("onPress error:", err); }
        }
        if (typeof ctxData.onClick === 'function') {
          try { ctxData.onClick(e); } catch (err) { console.error("onClick error:", err); }
        }
        if (typeof ctxData.onRelease === 'function') {
          try { ctxData.onRelease(e); } catch (err) { console.error("onRelease error:", err); }
        }
        if (typeof ctxData.emit === 'function') {
          ctxData.emit('click', e);
          ctxData.emit('press', e);
          ctxData.emit('release', e);
          ctxData.emit('mousedown', e);
          ctxData.emit('pointerdown', e);
        }
        return;
      }
    }

    // Stage / Root click fallback
    const root = flashEnvRef.current?._root;
    if (root) {
      if (typeof root.onPointerDown === 'function') {
        try { root.onPointerDown(e); } catch (err) { console.error("root onPointerDown error:", err); }
      }
      if (typeof root.onMouseDown === 'function') {
        try { root.onMouseDown(e); } catch (err) { console.error("root onMouseDown error:", err); }
      }
      if (typeof root.onPress === 'function') {
        try { root.onPress(e); } catch (err) { console.error("root onPress error:", err); }
      }
      if (typeof root.onClick === 'function') {
        try { root.onClick(e); } catch (err) { console.error("root onClick error:", err); }
      }
      if (typeof root.emit === 'function') {
        root.emit('pointerdown', e);
        root.emit('mousedown', e);
        root.emit('press', e);
        root.emit('click', e);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;
    mousePosRef.current = { x: curX, y: curY };

    // Update dragged actor position (Flash 8 startDrag)
    if (dragStateRef.current && dragStateRef.current.actor) {
      if (dragStateRef.current.lockCenter) {
        dragStateRef.current.actor.x = curX - (dragStateRef.current.actor.width || 0) / 2;
        dragStateRef.current.actor.y = curY - (dragStateRef.current.actor.height || 0) / 2;
      } else {
        dragStateRef.current.actor.x = curX - dragStateRef.current.offsetX;
        dragStateRef.current.actor.y = curY - dragStateRef.current.offsetY;
      }
    }

    // Dynamic pointer cursor when hovering over clickable actors (like Adobe Flash / Animate)
    let isHoveringClickable = false;
    for (let i = activeActorsRef.current.length - 1; i >= 0; i--) {
      const actor = activeActorsRef.current[i];
      if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) continue;
      const ctxData = scriptContexts.current.get(actor.id);
      if (!ctxData || ctxData.visible === false) continue;
      const hasClickHandler = typeof ctxData.onClick === 'function' ||
                              typeof ctxData.onPress === 'function' ||
                              typeof ctxData.onRelease === 'function' ||
                              typeof ctxData.onPointerDown === 'function' ||
                              (ctxData._eventListeners && (ctxData._eventListeners.get('click')?.length || ctxData._eventListeners.get('press')?.length));
      if (hasClickHandler && ctxData.hitTestPoint(curX, curY)) {
        isHoveringClickable = true;
        break;
      }
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isHoveringClickable ? 'pointer' : 'default';
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isMouseDownRef.current = false;
    if (dragStateRef.current) {
      dragStateRef.current = null;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    const upX = rect ? (e.clientX - rect.left) * (canvasWidth / rect.width) : mousePosRef.current.x;
    const upY = rect ? (e.clientY - rect.top) * (canvasHeight / rect.height) : mousePosRef.current.y;
    const pressedId = pressedActorIdRef.current;
    pressedActorIdRef.current = null;

    let actorHitOnUp = false;
    activeActorsRef.current.forEach(actor => {
      if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameRef.current) return;
      const ctxData = scriptContexts.current.get(actor.id);
      if (ctxData && ctxData.visible !== false) {
        const isOver = ctxData.hitTestPoint(upX, upY);
        if (isOver) {
          actorHitOnUp = true;
        }

        if (typeof ctxData.onPointerUp === 'function') {
          try { ctxData.onPointerUp(e); } catch (err) { console.error("onPointerUp error:", err); }
        }
        if (typeof ctxData.emit === 'function') {
          ctxData.emit('mouseup', e);
          ctxData.emit('pointerup', e);
        }

        // Standard Flash on (release) occurs when pointer was pressed on actor and released on actor
        if (pressedId === actor.id && isOver) {
          if (typeof ctxData.onRelease === 'function') {
            try { ctxData.onRelease(e); } catch (err) { console.error("onRelease error:", err); }
          }
          if (typeof ctxData.onClick === 'function') {
            try { ctxData.onClick(e); } catch (err) { console.error("onClick error:", err); }
          }
          if (typeof ctxData.emit === 'function') {
            ctxData.emit('release', e);
            ctxData.emit('click', e);
          }
        }

        // Release outside handler
        if (pressedId === actor.id && !isOver && typeof ctxData.onReleaseOutside === 'function') {
          try { ctxData.onReleaseOutside(e); } catch (err) { console.error("onReleaseOutside error:", err); }
        }
      }
    });

    // Stage / Root pointer up fallback
    const root = flashEnvRef.current?._root;
    if (root) {
      if (typeof root.onPointerUp === 'function') {
        try { root.onPointerUp(e); } catch (err) { console.error("root onPointerUp error:", err); }
      }
      if (typeof root.onMouseUp === 'function') {
        try { root.onMouseUp(e); } catch (err) { console.error("root onMouseUp error:", err); }
      }
      if (!actorHitOnUp) {
        if (typeof root.onRelease === 'function') {
          try { root.onRelease(e); } catch (err) { console.error("root onRelease error:", err); }
        }
        if (typeof root.onClick === 'function') {
          try { root.onClick(e); } catch (err) { console.error("root onClick error:", err); }
        }
        if (typeof root.emit === 'function') {
          root.emit('release', e);
          root.emit('click', e);
        }
      }
      if (typeof root.emit === 'function') {
        root.emit('pointerup', e);
        root.emit('mouseup', e);
      }
    }
  };

  const handleVirtualPadDown = (pad: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => {
    setPressedPadKeys(prev => ({ ...prev, [pad]: true }));
    const notifyActorsDown = (kName: string, cName: string) => {
      keysRef.current[kName] = true;
      keysRef.current[cName] = true;
      keysJustPressedRef.current[kName] = true;
      keysJustPressedRef.current[cName] = true;
      activeActorsRef.current.forEach(actor => {
        const ctxData = scriptContexts.current.get(actor.id);
        if (ctxData && ctxData.onKeyDown) {
          try { ctxData.onKeyDown(kName, { key: kName, code: cName }); } catch (err) {}
        }
      });
    };

    if (pad === 'up') notifyActorsDown('ArrowUp', 'ArrowUp');
    if (pad === 'down') notifyActorsDown('ArrowDown', 'ArrowDown');
    if (pad === 'left') notifyActorsDown('ArrowLeft', 'ArrowLeft');
    if (pad === 'right') notifyActorsDown('ArrowRight', 'ArrowRight');
    if (pad === 'a') {
      notifyActorsDown(' ', 'Space');
      notifyActorsDown('a', 'KeyA');
    }
    if (pad === 'b') {
      notifyActorsDown('b', 'KeyB');
      notifyActorsDown('z', 'KeyZ');
    }
  };

  const handleVirtualPadUp = (pad: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => {
    setPressedPadKeys(prev => ({ ...prev, [pad]: false }));
    const notifyActorsUp = (kName: string, cName: string) => {
      keysRef.current[kName] = false;
      keysRef.current[cName] = false;
      delete keysJustPressedRef.current[kName];
      delete keysJustPressedRef.current[cName];
      activeActorsRef.current.forEach(actor => {
        const ctxData = scriptContexts.current.get(actor.id);
        if (ctxData && ctxData.onKeyUp) {
          try { ctxData.onKeyUp(kName, { key: kName, code: cName }); } catch (err) {}
        }
      });
    };

    if (pad === 'up') notifyActorsUp('ArrowUp', 'ArrowUp');
    if (pad === 'down') notifyActorsUp('ArrowDown', 'ArrowDown');
    if (pad === 'left') notifyActorsUp('ArrowLeft', 'ArrowLeft');
    if (pad === 'right') notifyActorsUp('ArrowRight', 'ArrowRight');
    if (pad === 'a') {
      notifyActorsUp(' ', 'Space');
      notifyActorsUp('a', 'KeyA');
    }
    if (pad === 'b') {
      notifyActorsUp('b', 'KeyB');
      notifyActorsUp('z', 'KeyZ');
    }
  };

  const handleCustomButtonDown = (btn: TouchButtonConfig) => {
    setPressedCustomBtnIds(prev => ({ ...prev, [btn.id]: true }));
    const k = btn.key === ' ' || btn.key.toLowerCase() === 'space' ? ' ' : btn.key;
    const code = btn.code || (k.length === 1 ? `Key${k.toUpperCase()}` : (k === ' ' ? 'Space' : k));

    keysRef.current[k] = true;
    keysRef.current[code] = true;
    keysRef.current[k.toLowerCase()] = true;
    keysRef.current[k.toUpperCase()] = true;
    if (k === ' ') {
      keysRef.current['Space'] = true;
      keysRef.current['space'] = true;
    }
    keysJustPressedRef.current[k] = true;
    keysJustPressedRef.current[code] = true;

    activeActorsRef.current.forEach(actor => {
      const ctxData = scriptContexts.current.get(actor.id);
      if (ctxData && ctxData.onKeyDown) {
        try { ctxData.onKeyDown(k, { key: k, code }); } catch (err) {}
      }
    });

    if (flashEnvRef.current?._root?.onKeyDown) {
      try { flashEnvRef.current._root.onKeyDown(k, { key: k, code }); } catch (err) {}
    }
  };

  const handleCustomButtonUp = (btn: TouchButtonConfig) => {
    setPressedCustomBtnIds(prev => ({ ...prev, [btn.id]: false }));
    const k = btn.key === ' ' || btn.key.toLowerCase() === 'space' ? ' ' : btn.key;
    const code = btn.code || (k.length === 1 ? `Key${k.toUpperCase()}` : (k === ' ' ? 'Space' : k));

    keysRef.current[k] = false;
    keysRef.current[code] = false;
    keysRef.current[k.toLowerCase()] = false;
    keysRef.current[k.toUpperCase()] = false;
    if (k === ' ') {
      keysRef.current['Space'] = false;
      keysRef.current['space'] = false;
    }
    delete keysJustPressedRef.current[k];
    delete keysJustPressedRef.current[code];

    activeActorsRef.current.forEach(actor => {
      const ctxData = scriptContexts.current.get(actor.id);
      if (ctxData && ctxData.onKeyUp) {
        try { ctxData.onKeyUp(k, { key: k, code }); } catch (err) {}
      }
    });

    if (flashEnvRef.current?._root?.onKeyUp) {
      try { flashEnvRef.current._root.onKeyUp(k, { key: k, code }); } catch (err) {}
    }
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

          {/* Quick Frame Step Indicator */}
          <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-white flex items-center gap-1 shadow-lg">
            <button
              onClick={() => {
                const prev = Math.max(0, currentFrameRef.current - 1);
                currentFrameRef.current = prev;
                setCurrentFrameState(prev);
                setHudStats(s => ({ ...s, frame: `${prev + 1}/${frames.length}` }));
                if (triggerFrameScriptRef.current) triggerFrameScriptRef.current(prev);
              }}
              className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center text-[10px] text-gray-300 hover:text-white transition-colors"
              title="Previous Frame"
            >
              ◀
            </button>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/10 rounded text-amber-300">
              Frame {currentFrameState + 1}/{frames.length}
            </span>
            <button
              onClick={() => {
                const next = Math.min(frames.length - 1, currentFrameRef.current + 1);
                currentFrameRef.current = next;
                setCurrentFrameState(next);
                setHudStats(s => ({ ...s, frame: `${next + 1}/${frames.length}` }));
                if (triggerFrameScriptRef.current) triggerFrameScriptRef.current(next);
              }}
              className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center text-[10px] text-gray-300 hover:text-white transition-colors"
              title="Next Frame"
            >
              ▶
            </button>
          </div>
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
            title="Toggle Touch D-Pad (T)"
          >
            <Icons.Gamepad size={18} />
          </button>

          <button
            onClick={() => {
              setIsQuickAddButtonOpen(prev => !prev);
              setShowTouchControls(true);
            }}
            className={`p-2.5 rounded-full transition-colors backdrop-blur-md ${isQuickAddButtonOpen ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Configure / Add Touchpad Buttons"
          >
            <Icons.Sliders size={18} />
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

      {/* Quick Add / Manage Touchpad Buttons Overlay Modal */}
      {isQuickAddButtonOpen && (
        <div className="absolute top-16 right-4 z-50 w-96 max-w-[92vw] bg-[#161616]/95 backdrop-blur-xl border border-gray-700/90 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-3 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-500/20 text-rose-400 rounded-lg">
                <Icons.Gamepad2 size={16} />
              </span>
              <span className="font-bold text-white text-sm">Touchpad Controls</span>
            </div>
            <button
              onClick={() => setIsQuickAddButtonOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <Icons.X size={15} />
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">
              Quick Presets (or type custom key below):
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'SPACE', key: ' ' },
                { label: 'E', key: 'e' },
                { label: 'SHIFT', key: 'Shift' },
                { label: 'ENTER', key: 'Enter' },
                { label: 'W', key: 'w' },
                { label: 'A', key: 'a' },
                { label: 'S', key: 's' },
                { label: 'D', key: 'd' },
                { label: 'Q', key: 'q' },
                { label: 'F', key: 'f' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setQuickKey(p.key);
                    setQuickLabel(p.label);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                    quickKey === p.key ? 'bg-rose-600 text-white ring-1 ring-rose-400' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input Fields */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 font-bold">Button Label:</label>
              <input
                type="text"
                value={quickLabel}
                maxLength={8}
                onChange={e => setQuickLabel(e.target.value)}
                placeholder="e.g. SPACE, E"
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs uppercase outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-gray-400 font-bold">Target Key:</label>
                <button
                  type="button"
                  onClick={() => setIsQuickDetecting(true)}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                    isQuickDetecting 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                  title="Click and press any key to auto-detect"
                >
                  {isQuickDetecting ? 'Press Key...' : 'Detect'}
                </button>
              </div>
              <input
                type="text"
                value={quickKey === ' ' ? 'Space' : quickKey}
                onChange={e => {
                  const v = e.target.value;
                  setQuickKey(v.toLowerCase() === 'space' ? ' ' : v);
                }}
                placeholder="e.g. e, space"
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1 text-rose-300 font-mono text-xs font-bold outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Color & Size & Add Row */}
          <div className="flex items-center justify-between pt-1 text-[11px] gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-bold mr-1">Color:</span>
              {(['red', 'blue', 'green', 'amber', 'purple', 'cyan'] as TouchButtonColor[]).map(c => {
                const bg = 
                  c === 'red' ? 'bg-red-500' :
                  c === 'green' ? 'bg-emerald-500' :
                  c === 'amber' ? 'bg-amber-500' :
                  c === 'purple' ? 'bg-purple-500' :
                  c === 'cyan' ? 'bg-cyan-500' : 'bg-blue-500';
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setQuickColor(c)}
                    className={`w-5 h-5 rounded-full ${bg} transition-all ${quickColor === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-bold mr-1">Size:</span>
              {(['sm', 'md', 'lg'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setQuickSize(sz)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                    quickSize === sz
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const raw = quickKey.trim() || 'e';
                const norm = raw.toLowerCase() === 'space' ? ' ' : raw;
                const label = (quickLabel.trim() || (norm === ' ' ? 'SPACE' : norm.toUpperCase())).slice(0, 10);
                addTouchButtonDynamic({
                  label,
                  key: norm,
                  color: quickColor,
                  size: quickSize,
                  position: 'right'
                });
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow transition-all flex items-center gap-1 active:scale-95"
            >
              <Icons.Plus size={13} />
              <span>Add</span>
            </button>
          </div>

          {/* List of active buttons */}
          <div className="border-t border-gray-800/80 pt-2 max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Active Buttons ({playerTouchButtons.length}):
            </span>
            {playerTouchButtons.map(btn => (
              <div key={btn.id} className="flex items-center justify-between bg-black/40 px-2.5 py-1 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {btn.label.slice(0, 2)}
                  </span>
                  <span className="font-bold text-white text-xs">{btn.label}</span>
                  <span className="text-rose-300 font-mono text-[10px]">({btn.key === ' ' ? 'Space' : btn.key})</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTouchButtonDynamic(btn.id)}
                  className="text-gray-500 hover:text-red-400 p-0.5"
                  title="Remove button"
                >
                  <Icons.Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="absolute bottom-6 left-0 right-0 flex items-end justify-between px-6 sm:px-10 pointer-events-none z-50">
          {/* D-Pad Buttons + Left custom buttons */}
          <div className="flex items-end gap-3 pointer-events-auto select-none">
            <div className="grid grid-cols-3 grid-rows-3 gap-2">
              <div></div>
              <button 
                onPointerDown={() => handleVirtualPadDown('up')} 
                onPointerUp={() => handleVirtualPadUp('up')}
                onPointerLeave={() => handleVirtualPadUp('up')}
                onPointerCancel={() => handleVirtualPadUp('up')}
                aria-label="Up Arrow"
                className={`w-12 h-12 rounded-xl text-white font-bold backdrop-blur-md flex items-center justify-center transition-all duration-75 select-none touch-none ${
                  pressedPadKeys.up
                    ? 'bg-red-600 border-2 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.95)] scale-95 ring-2 ring-red-400/80'
                    : 'bg-white/20 hover:bg-white/30 active:bg-red-600 border border-white/20 active:border-red-400'
                }`}
              >▲</button>
              <div></div>
              <button 
                onPointerDown={() => handleVirtualPadDown('left')} 
                onPointerUp={() => handleVirtualPadUp('left')}
                onPointerLeave={() => handleVirtualPadUp('left')}
                onPointerCancel={() => handleVirtualPadUp('left')}
                aria-label="Left Arrow"
                className={`w-12 h-12 rounded-xl text-white font-bold backdrop-blur-md flex items-center justify-center transition-all duration-75 select-none touch-none ${
                  pressedPadKeys.left
                    ? 'bg-red-600 border-2 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.95)] scale-95 ring-2 ring-red-400/80'
                    : 'bg-white/20 hover:bg-white/30 active:bg-red-600 border border-white/20 active:border-red-400'
                }`}
              >◀</button>
              <div></div>
              <button 
                onPointerDown={() => handleVirtualPadDown('right')} 
                onPointerUp={() => handleVirtualPadUp('right')}
                onPointerLeave={() => handleVirtualPadUp('right')}
                onPointerCancel={() => handleVirtualPadUp('right')}
                aria-label="Right Arrow"
                className={`w-12 h-12 rounded-xl text-white font-bold backdrop-blur-md flex items-center justify-center transition-all duration-75 select-none touch-none ${
                  pressedPadKeys.right
                    ? 'bg-red-600 border-2 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.95)] scale-95 ring-2 ring-red-400/80'
                    : 'bg-white/20 hover:bg-white/30 active:bg-red-600 border border-white/20 active:border-red-400'
                }`}
              >▶</button>
              <div></div>
              <button 
                onPointerDown={() => handleVirtualPadDown('down')} 
                onPointerUp={() => handleVirtualPadUp('down')}
                onPointerLeave={() => handleVirtualPadUp('down')}
                onPointerCancel={() => handleVirtualPadUp('down')}
                aria-label="Down Arrow"
                className={`w-12 h-12 rounded-xl text-white font-bold backdrop-blur-md flex items-center justify-center transition-all duration-75 select-none touch-none ${
                  pressedPadKeys.down
                    ? 'bg-red-600 border-2 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.95)] scale-95 ring-2 ring-red-400/80'
                    : 'bg-white/20 hover:bg-white/30 active:bg-red-600 border border-white/20 active:border-red-400'
                }`}
              >▼</button>
              <div></div>
            </div>

            {/* Left custom buttons */}
            {playerTouchButtons.filter(b => b.position === 'left').map(btn => {
              const isPressed = !!pressedCustomBtnIds[btn.id];
              return (
                <button
                  key={btn.id}
                  onPointerDown={() => handleCustomButtonDown(btn)}
                  onPointerUp={() => handleCustomButtonUp(btn)}
                  onPointerLeave={() => handleCustomButtonUp(btn)}
                  onPointerCancel={() => handleCustomButtonUp(btn)}
                  title={`Touch Button: ${btn.label} (${btn.key === ' ' ? 'Space' : btn.key})`}
                  className={`min-w-[48px] h-12 px-3 rounded-2xl font-black backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-75 select-none touch-none text-xs tracking-wider uppercase ${
                    isPressed
                      ? 'bg-blue-600 border-2 border-blue-300 text-white shadow-[0_0_24px_rgba(59,130,246,0.95)] scale-95 ring-2 ring-blue-400'
                      : 'bg-blue-500/30 hover:bg-blue-500/40 active:bg-blue-600 border-2 border-blue-400/60 text-white'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Center custom buttons (e.g. Pause, Select, Menu, Space) */}
          <div className="flex items-end gap-2.5 pointer-events-auto select-none">
            {playerTouchButtons.filter(b => b.position === 'center').map(btn => {
              const isPressed = !!pressedCustomBtnIds[btn.id];
              return (
                <button
                  key={btn.id}
                  onPointerDown={() => handleCustomButtonDown(btn)}
                  onPointerUp={() => handleCustomButtonUp(btn)}
                  onPointerLeave={() => handleCustomButtonUp(btn)}
                  onPointerCancel={() => handleCustomButtonUp(btn)}
                  title={`Touch Button: ${btn.label} (${btn.key === ' ' ? 'Space' : btn.key})`}
                  className={`min-w-[56px] h-11 px-3.5 rounded-full font-black backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-75 select-none touch-none text-xs tracking-wider uppercase ${
                    isPressed
                      ? 'bg-amber-600 border-2 border-amber-300 text-white shadow-[0_0_24px_rgba(245,158,11,0.95)] scale-95 ring-2 ring-amber-400'
                      : 'bg-amber-500/30 hover:bg-amber-500/40 active:bg-amber-600 border-2 border-amber-400/60 text-white'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons: Dynamic Touchpad Buttons (e.g. A, B, Space, E, etc.) */}
          <div className="flex items-end gap-3 pointer-events-auto select-none flex-wrap justify-end max-w-[55vw]">
            {playerTouchButtons.filter(b => !b.position || b.position === 'right').map(btn => {
              const isPressed = !!pressedCustomBtnIds[btn.id];
              const col = btn.color || 'red';
              const sz = btn.size || 'md';

              const sizeClass =
                sz === 'sm' ? 'min-w-[46px] h-11 px-2.5 text-xs' :
                sz === 'lg' ? 'min-w-[66px] h-16 px-4 text-sm' :
                'min-w-[56px] h-14 px-3 text-xs';

              const colorClass = 
                col === 'blue' ? (isPressed ? 'bg-blue-600 border-2 border-blue-300 text-white shadow-[0_0_24px_rgba(59,130,246,0.95)] scale-95 ring-2 ring-blue-400' : 'bg-blue-500/30 hover:bg-blue-500/40 border-2 border-blue-400/60 text-white') :
                col === 'green' ? (isPressed ? 'bg-emerald-600 border-2 border-emerald-300 text-white shadow-[0_0_24px_rgba(16,185,129,0.95)] scale-95 ring-2 ring-emerald-400' : 'bg-emerald-500/30 hover:bg-emerald-500/40 border-2 border-emerald-400/60 text-white') :
                col === 'amber' ? (isPressed ? 'bg-amber-600 border-2 border-amber-300 text-white shadow-[0_0_24px_rgba(245,158,11,0.95)] scale-95 ring-2 ring-amber-400' : 'bg-amber-500/30 hover:bg-amber-500/40 border-2 border-amber-400/60 text-white') :
                col === 'purple' ? (isPressed ? 'bg-purple-600 border-2 border-purple-300 text-white shadow-[0_0_24px_rgba(168,85,247,0.95)] scale-95 ring-2 ring-purple-400' : 'bg-purple-500/30 hover:bg-purple-500/40 border-2 border-purple-400/60 text-white') :
                col === 'cyan' ? (isPressed ? 'bg-cyan-600 border-2 border-cyan-300 text-white shadow-[0_0_24px_rgba(6,182,212,0.95)] scale-95 ring-2 ring-cyan-400' : 'bg-cyan-500/30 hover:bg-cyan-500/40 border-2 border-cyan-400/60 text-white') :
                col === 'gray' ? (isPressed ? 'bg-gray-600 border-2 border-gray-300 text-white shadow-[0_0_20px_rgba(156,163,175,0.95)] scale-95 ring-2 ring-gray-400' : 'bg-gray-600/30 hover:bg-gray-600/40 border-2 border-gray-400/60 text-white') :
                (isPressed ? 'bg-red-600 border-2 border-red-300 text-white shadow-[0_0_24px_rgba(239,68,68,0.95)] scale-95 ring-2 ring-red-400' : 'bg-red-500/30 hover:bg-red-500/40 border-2 border-red-400/60 text-white');

              return (
                <button
                  key={btn.id}
                  onPointerDown={() => handleCustomButtonDown(btn)}
                  onPointerUp={() => handleCustomButtonUp(btn)}
                  onPointerLeave={() => handleCustomButtonUp(btn)}
                  onPointerCancel={() => handleCustomButtonUp(btn)}
                  aria-label={`Button ${btn.label}`}
                  title={`Touch Button: ${btn.label} (Triggers key '${btn.key === ' ' ? 'Space' : btn.key}')`}
                  className={`${sizeClass} ${colorClass} rounded-full font-black backdrop-blur-md flex flex-col items-center justify-center shadow-lg transition-all duration-75 select-none touch-none`}
                >
                  <span className="font-black leading-tight tracking-wider">{btn.label}</span>
                  <span className="text-[9px] opacity-75 font-mono leading-none">
                    {btn.key === ' ' ? '␣' : btn.key.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer shortcut hints */}
      <div className="absolute bottom-2 text-center text-[11px] text-gray-500 pointer-events-none">
        Controls: [R] Restart • [P] Pause • [M] Mute Audio • [T] Touchpad • Arrow keys / A & B for game input
      </div>
    </div>
  );
};
