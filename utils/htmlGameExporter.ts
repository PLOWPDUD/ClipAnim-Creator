import { Frame, Layer, Actor, BackgroundSettings, AudioTrack } from '../types';
import { compositeLayers } from './drawingUtils';

export interface GenerateHtmlGameOptions {
  projectName: string;
  frames: Frame[];
  layers: Layer[];
  actors: Actor[];
  projectScript: string;
  fps: number;
  canvasSize: { width: number; height: number };
  background: BackgroundSettings;
  backgroundImage?: string | null;
  audioTracks?: AudioTrack[];
  transparent?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Converts a Blob or data URL to a standalone base64 string
 */
async function toBase64(urlOrBlob: string | Blob): Promise<string> {
  if (typeof urlOrBlob === 'string') {
    if (urlOrBlob.startsWith('data:')) {
      return urlOrBlob;
    }
    try {
      const response = await fetch(urlOrBlob);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Failed to convert url to base64, using fallback:", e);
      return urlOrBlob;
    }
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(urlOrBlob);
    });
  }
}

/**
 * Generates a completely self-contained, offline-playable .html game file.
 */
export async function generateLiveHtmlGame(options: GenerateHtmlGameOptions): Promise<{ blob: Blob; url: string; filename: string }> {
  const {
    projectName,
    frames,
    layers,
    actors,
    projectScript,
    fps,
    canvasSize,
    background,
    backgroundImage,
    audioTracks = [],
    transparent = false,
    onProgress
  } = options;

  const totalFrames = frames.length;
  const compositedFrames: Array<{
    id: string;
    dataUrl: string;
    script?: string;
    durationMultiplier?: number;
  }> = [];

  // 1. Pre-render & composite all timeline frames
  for (let i = 0; i < totalFrames; i++) {
    const frame = frames[i];
    const frameDataUrl = await compositeLayers(
      frame,
      layers,
      canvasSize.width,
      canvasSize.height,
      background,
      backgroundImage,
      !transparent
    );

    compositedFrames.push({
      id: frame.id,
      dataUrl: frameDataUrl,
      script: frame.script || '',
      durationMultiplier: frame.durationMultiplier || 1
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / (totalFrames + actors.length + audioTracks.length + 1)) * 60));
    }
  }

  // 2. Pre-process actors and their symbol frames
  const processedActors: any[] = [];
  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i];
    const actorDataUrl = actor.dataUrl ? await toBase64(actor.dataUrl) : '';
    
    let processedSymbolFrames: any[] = [];
    if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 0) {
      for (const symFrame of actor.symbolFrames) {
        let symUrl = symFrame.thumbnailUrl || '';
        if (symUrl && !symUrl.startsWith('data:')) {
          symUrl = await toBase64(symUrl);
        } else if (!symUrl && actor.symbolLayers) {
          symUrl = await compositeLayers(
            symFrame,
            actor.symbolLayers,
            actor.width || canvasSize.width,
            actor.height || canvasSize.height,
            { type: 'color', color: 'transparent' },
            null,
            false
          );
        }
        processedSymbolFrames.push({
          id: symFrame.id,
          dataUrl: symUrl,
          durationMultiplier: symFrame.durationMultiplier || 1,
          script: symFrame.script || ''
        });
      }
    }

    processedActors.push({
      id: actor.id,
      name: actor.name,
      dataUrl: actorDataUrl,
      x: actor.x,
      y: actor.y,
      width: actor.width,
      height: actor.height,
      rotation: actor.rotation || 0,
      scaleX: actor.scaleX ?? 1,
      scaleY: actor.scaleY ?? 1,
      opacity: actor.opacity ?? 1,
      scripts: actor.scripts || '',
      targetFrame: actor.targetFrame,
      isAnimated: !!actor.isAnimated,
      symbolFrames: processedSymbolFrames,
      symbolFps: actor.symbolFps || fps
    });

    if (onProgress) {
      onProgress(60 + Math.round(((i + 1) / (actors.length + audioTracks.length + 1)) * 25));
    }
  }

  // 3. Pre-process audio tracks
  const processedAudioTracks: any[] = [];
  for (let i = 0; i < audioTracks.length; i++) {
    const track = audioTracks[i];
    const trackBase64 = await toBase64(track.url);
    processedAudioTracks.push({
      id: track.id,
      name: track.name,
      url: trackBase64,
      volume: track.volume ?? 1,
      startTime: track.startTime || 0,
      duration: track.duration || 0,
      offset: track.offset || 0,
      fadeIn: track.fadeIn || 0,
      fadeOut: track.fadeOut || 0
    });
  }

  if (onProgress) {
    onProgress(95);
  }

  // 4. Build the standalone HTML document content
  const gameDataJson = JSON.stringify({
    title: projectName || 'ClipAnim Game',
    fps: fps > 0 ? fps : 12,
    canvasSize,
    background,
    projectScript: projectScript || '',
    frames: compositedFrames,
    actors: processedActors,
    audioTracks: processedAudioTracks
  });

  const htmlSource = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${escapeHtml(projectName || 'ClipAnim Game')}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    :root {
      --accent: #FF3B30;
      --accent-glow: rgba(255, 59, 48, 0.4);
      --bg: #0d0e12;
      --panel: #161820;
      --border: rgba(255, 255, 255, 0.1);
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #ffffff;
    }
    #game-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 30%, #1c1f2b 0%, var(--bg) 100%);
    }
    /* Top Header Bar */
    #header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 52px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(18, 20, 28, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      z-index: 50;
      transition: opacity 0.3s ease;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 59, 48, 0.15);
      border: 1px solid rgba(255, 59, 48, 0.4);
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #ff5e54;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #FF3B30;
      box-shadow: 0 0 8px #FF3B30;
      animation: pulse 1.6s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .game-title {
      font-size: 14px;
      font-weight: 700;
      color: #f3f4f6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-icon {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border);
      color: #d1d5db;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    .btn-icon:active {
      transform: translateY(1px);
    }
    .btn-icon.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      box-shadow: 0 0 12px var(--accent-glow);
    }

    /* Main Viewport */
    #viewport-container {
      position: relative;
      width: 100%;
      height: 100%;
      padding-top: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #game-canvas-box {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 76px);
      border-radius: 12px;
      overflow: hidden;
      background: #000000;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--border);
      transition: transform 0.05s ease-out;
    }
    #game-canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      touch-action: none;
    }
    /* CRT Scanline Filter effect (optional) */
    .scanlines::after {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      z-index: 10;
      background-size: 100% 3px, 6px 100%;
      pointer-events: none;
    }

    /* Preloader & Start Overlay */
    #start-overlay {
      position: absolute;
      inset: 0;
      background: rgba(13, 14, 18, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 24px;
      text-align: center;
      transition: opacity 0.3s ease;
    }
    .start-card {
      background: var(--panel);
      border: 1px solid var(--border);
      padding: 36px 32px;
      border-radius: 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }
    .game-badge-icon {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, #FF3B30, #FF9500);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(255, 59, 48, 0.35);
    }
    .game-badge-icon svg {
      width: 32px;
      height: 32px;
      fill: white;
    }
    .start-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .start-desc {
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .start-btn {
      width: 100%;
      padding: 14px 24px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 20px var(--accent-glow);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .start-btn:hover {
      background: #ff5247;
      transform: scale(1.02);
    }
    .start-btn:active {
      transform: scale(0.98);
    }
    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.2s ease;
    }

    /* Virtual Touch Controls for Mobile / Tablets */
    #touch-controls {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      display: none;
      justify-content: space-between;
      padding: 0 24px;
      pointer-events: none;
      z-index: 40;
    }
    .dpad, .action-buttons {
      pointer-events: auto;
      display: grid;
      gap: 8px;
    }
    .dpad {
      grid-template-columns: repeat(3, 48px);
      grid-template-rows: repeat(3, 48px);
    }
    .dpad-btn {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 12px;
      color: white;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      user-select: none;
    }
    .dpad-btn:active {
      background: var(--accent);
      border-color: var(--accent);
    }
    .action-buttons {
      display: flex;
      align-items: flex-end;
      gap: 14px;
    }
    .action-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 59, 48, 0.3);
      border: 2px solid rgba(255, 59, 48, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: white;
      font-size: 16px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      user-select: none;
    }
    .action-btn:active {
      background: var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }

    /* HUD Stats & Notifications */
    #hud-info {
      position: absolute;
      top: 64px;
      left: 16px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid var(--border);
      backdrop-filter: blur(8px);
      padding: 6px 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #9ca3af;
      pointer-events: none;
      z-index: 30;
      display: none;
    }

    /* Help Modal */
    #help-modal {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(12px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 120;
      padding: 20px;
    }
    .help-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      max-width: 520px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      color: #d1d5db;
    }
    .help-card h3 {
      color: #ffffff;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .help-card table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12px;
    }
    .help-card th, .help-card td {
      padding: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      text-align: left;
    }
    .help-card th {
      color: #9ca3af;
    }
    .help-card code {
      background: rgba(255,255,255,0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #fbbf24;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="game-wrapper">
    <!-- Header Controls -->
    <header id="header-bar">
      <div class="header-left">
        <div class="live-badge">
          <div class="live-dot"></div>
          <span>LIVE HTML5 GAME</span>
        </div>
        <span class="game-title">${escapeHtml(projectName || 'ClipAnim Game')}</span>
      </div>

      <div class="header-right">
        <button id="btn-touch" class="btn-icon" title="Toggle On-Screen Touch Controls">
          <span>🎮 Touch</span>
        </button>
        <button id="btn-scanlines" class="btn-icon" title="Toggle CRT Filter">
          <span>📺 CRT</span>
        </button>
        <button id="btn-stats" class="btn-icon" title="Toggle FPS & Timeline Stats">
          <span>📊 Stats</span>
        </button>
        <button id="btn-restart" class="btn-icon" title="Restart Game (R)">
          <span>🔄 Restart</span>
        </button>
        <button id="btn-pause" class="btn-icon" title="Pause / Play (P)">
          <span>⏸️ Pause</span>
        </button>
        <button id="btn-mute" class="btn-icon" title="Mute Audio (M)">
          <span>🔊 Sound</span>
        </button>
        <button id="btn-help" class="btn-icon" title="Controls & Script Guide">
          <span>❓ Help</span>
        </button>
        <button id="btn-fullscreen" class="btn-icon" title="Toggle Fullscreen (F)">
          <span>⛶ Fullscreen</span>
        </button>
      </div>
    </header>

    <!-- Main Game Viewport -->
    <main id="viewport-container">
      <div id="game-canvas-box">
        <canvas id="game-canvas" width="${canvasSize.width}" height="${canvasSize.height}"></canvas>
      </div>
      <div id="hud-info">FPS: <span id="hud-fps">0</span> | Frame: <span id="hud-frame">1/1</span> | Score: <span id="hud-score">0</span></div>
    </main>

    <!-- Virtual Touch Controls (Auto enabled on mobile or via toggle) -->
    <div id="touch-controls">
      <div class="dpad">
        <div></div>
        <button class="dpad-btn" data-key="ArrowUp">▲</button>
        <div></div>
        <button class="dpad-btn" data-key="ArrowLeft">◀</button>
        <div></div>
        <button class="dpad-btn" data-key="ArrowRight">▶</button>
        <div></div>
        <button class="dpad-btn" data-key="ArrowDown">▼</button>
        <div></div>
      </div>
      <div class="action-buttons">
        <button class="action-btn" data-key="KeyZ">B</button>
        <button class="action-btn" data-key="Space">A</button>
      </div>
    </div>

    <!-- Start / Loading Overlay -->
    <div id="start-overlay">
      <div class="start-card">
        <div class="game-badge-icon">
          <svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        </div>
        <div>
          <h1 class="start-title">${escapeHtml(projectName || 'ClipAnim Game')}</h1>
          <p class="start-desc">Interactive HTML5 game created with ClipAnim Creator. Runs offline with full script physics, animated symbols, and audio.</p>
        </div>
        <div class="progress-bar-container" id="loading-bar-box">
          <div class="progress-bar" id="loading-bar"></div>
        </div>
        <button id="btn-start" class="start-btn" style="display:none;">
          <span>▶ Play Game</span>
        </button>
      </div>
    </div>

    <!-- Script & Controls Help Modal -->
    <div id="help-modal">
      <div class="help-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3>🎮 Game Controls & ActionScript API</h3>
          <button id="btn-close-help" class="btn-icon">✕</button>
        </div>
        <p style="font-size:12px; line-height:1.6; margin-bottom:12px;">
          This game is driven by ClipAnim's ActionScript-compatible runtime engine. All actors, symbols, and frame actions execute directly on the HTML5 canvas.
        </p>
        <table>
          <thead>
            <tr><th>Feature</th><th>Methods / Variables</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Timeline</strong></td>
              <td><code>play()</code>, <code>stop()</code>, <code>gotoAndPlay(n)</code>, <code>gotoAndStop(n)</code>, <code>currentFrame</code></td>
            </tr>
            <tr>
              <td><strong>Actors & Symbols</strong></td>
              <td><code>this.x</code>, <code>this.y</code>, <code>this.vx</code>, <code>this.vy</code>, <code>this.rotation</code>, <code>this.scaleX</code>, <code>this.opacity</code></td>
            </tr>
            <tr>
              <td><strong>Keyboard Input</strong></td>
              <td><code>isKeyDown('ArrowRight')</code>, <code>isKeyDown('Space')</code>, <code>keys['w']</code></td>
            </tr>
            <tr>
              <td><strong>Collisions</strong></td>
              <td><code>this.hitTest(targetActor)</code>, <code>this.hitTestPoint(x, y)</code></td>
            </tr>
            <tr>
              <td><strong>Audio FX</strong></td>
              <td><code>playSound(nameOrIndex, { volume, loop })</code>, <code>stopAllSounds()</code></td>
            </tr>
            <tr>
              <td><strong>Game State</strong></td>
              <td><code>score</code>, <code>lives</code>, <code>setScore(n)</code>, <code>saveGame(k, v)</code>, <code>loadGame(k)</code></td>
            </tr>
          </tbody>
        </table>
        <p style="font-size:11px; color:#9ca3af; margin-top:8px;">Shortcuts: [R] Restart • [P] Pause • [M] Mute • [F] Fullscreen • [T] Touchpad</p>
      </div>
    </div>
  </div>

  <script>
  (function() {
    'use strict';

    // 1. EMBEDDED PROJECT DATA
    const GAME_DATA = ${gameDataJson};

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    const canvasBox = document.getElementById('game-canvas-box');
    const startOverlay = document.getElementById('start-overlay');
    const btnStart = document.getElementById('btn-start');
    const loadingBar = document.getElementById('loading-bar');
    const loadingBarBox = document.getElementById('loading-bar-box');
    const hudInfo = document.getElementById('hud-info');
    const hudFps = document.getElementById('hud-fps');
    const hudFrame = document.getElementById('hud-frame');
    const hudScore = document.getElementById('hud-score');
    const touchControls = document.getElementById('touch-controls');
    const helpModal = document.getElementById('help-modal');

    const CW = GAME_DATA.canvasSize.width || 800;
    const CH = GAME_DATA.canvasSize.height || 600;
    const TARGET_FPS = GAME_DATA.fps || 12;

    // 2. RUNTIME STATE
    let isPlaying = true;
    let isGameLoaded = false;
    let isGameStarted = false;
    let currentFrameIndex = 0;
    let lastExecutedFrameIndex = -1;
    let isMuted = false;
    let masterVolume = 1.0;
    let score = 0;
    let lives = 3;
    let gameState = 'playing'; // 'playing' | 'paused' | 'gameover' | 'victory'

    // Camera / Screen shake
    let cameraShakeIntensity = 0;
    let cameraShakeDuration = 0;

    // Active Particles
    const particles = [];

    // Input States
    const keys = {};
    const keysJustPressed = {};
    let mouseX = CW / 2;
    let mouseY = CH / 2;
    let isMouseDown = false;

    // Caches & Audio
    const frameImages = [];
    const actorImageCache = new Map();
    let audioContext = null;
    const loadedAudioBuffers = new Map();

    // Actor Instances
    let activeActors = JSON.parse(JSON.stringify(GAME_DATA.actors || []));
    const actorContexts = new Map();
    const symbolScope = {};

    // Resize letterboxing
    function resizeCanvas() {
      const container = document.getElementById('viewport-container');
      const availW = container.clientWidth - 24;
      const availH = container.clientHeight - 24;
      const scale = Math.min(availW / CW, availH / CH);
      canvasBox.style.width = Math.floor(CW * scale) + 'px';
      canvasBox.style.height = Math.floor(CH * scale) + 'px';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 3. PRELOADING ASSETS
    async function preloadAllAssets() {
      const totalAssets = (GAME_DATA.frames.length) + (GAME_DATA.actors.length) + (GAME_DATA.audioTracks ? GAME_DATA.audioTracks.length : 0);
      let loadedCount = 0;

      function updateProgress() {
        loadedCount++;
        const pct = Math.min(100, Math.round((loadedCount / Math.max(1, totalAssets)) * 100));
        loadingBar.style.width = pct + '%';
      }

      // Preload Timeline Frames
      const framePromises = GAME_DATA.frames.map((f, i) => {
        return new Promise((resolve) => {
          if (!f.dataUrl) {
            frameImages[i] = null;
            updateProgress();
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            frameImages[i] = img;
            updateProgress();
            resolve();
          };
          img.onerror = () => {
            frameImages[i] = null;
            updateProgress();
            resolve();
          };
          img.src = f.dataUrl;
        });
      });

      // Preload Actor textures & symbols
      const actorPromises = GAME_DATA.actors.map((actor) => {
        return new Promise(async (resolve) => {
          if (actor.dataUrl) {
            const img = new Image();
            img.src = actor.dataUrl;
            actorImageCache.set(actor.id + '_base', img);
          }
          if (actor.symbolFrames && actor.symbolFrames.length > 0) {
            for (let sIdx = 0; sIdx < actor.symbolFrames.length; sIdx++) {
              const sf = actor.symbolFrames[sIdx];
              if (sf.dataUrl) {
                const sImg = new Image();
                sImg.src = sf.dataUrl;
                actorImageCache.set(actor.id + '_sym_' + sIdx, sImg);
              }
            }
          }
          updateProgress();
          resolve();
        });
      });

      // Preload Audio (AudioBuffers if Web Audio is active or standard Audio Elements)
      const audioPromises = (GAME_DATA.audioTracks || []).map((track) => {
        return new Promise((resolve) => {
          if (track.url) {
            try {
              const audio = new Audio();
              audio.src = track.url;
              audio.preload = 'auto';
              audio.addEventListener('canplaythrough', () => {
                updateProgress();
                resolve();
              }, { once: true });
              audio.addEventListener('error', () => {
                updateProgress();
                resolve();
              }, { once: true });
              // Safety timeout
              setTimeout(() => { resolve(); }, 3000);
            } catch (e) {
              updateProgress();
              resolve();
            }
          } else {
            updateProgress();
            resolve();
          }
        });
      });

      await Promise.all([...framePromises, ...actorPromises, ...audioPromises]);
      isGameLoaded = true;
      loadingBarBox.style.display = 'none';
      btnStart.style.display = 'flex';
    }

    // 4. ACTION SCRIPT & TIMELINE API
    const timelineApi = {
      gotoAndStop: function(frameNum) {
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        currentFrameIndex = Math.max(0, Math.min(GAME_DATA.frames.length - 1, targetIdx));
        isPlaying = false;
        triggerFrameScript(currentFrameIndex);
      },
      gotoAndPlay: function(frameNum) {
        const targetIdx = frameNum <= 0 ? 0 : frameNum - 1;
        currentFrameIndex = Math.max(0, Math.min(GAME_DATA.frames.length - 1, targetIdx));
        isPlaying = true;
        triggerFrameScript(currentFrameIndex);
      },
      play: function() {
        isPlaying = true;
      },
      stop: function() {
        isPlaying = false;
      },
      nextFrame: function() {
        currentFrameIndex = (currentFrameIndex + 1) % GAME_DATA.frames.length;
        triggerFrameScript(currentFrameIndex);
      },
      prevFrame: function() {
        currentFrameIndex = (currentFrameIndex - 1 + GAME_DATA.frames.length) % GAME_DATA.frames.length;
        triggerFrameScript(currentFrameIndex);
      },
      get currentFrame() {
        return currentFrameIndex + 1;
      },
      getCurrentFrame: function() {
        return currentFrameIndex + 1;
      },
      get totalFrames() {
        return GAME_DATA.frames.length;
      },
      getTotalFrames: function() {
        return GAME_DATA.frames.length;
      }
    };

    // Helper Math & Utilities
    const gameUtils = {
      isKeyDown: function(k) {
        return !!keys[k] || !!keys[k.toLowerCase()] || !!keys[k.toUpperCase()];
      },
      isKeyPressed: function(k) {
        return !!keysJustPressed[k] || !!keysJustPressed[k.toLowerCase()];
      },
      get mouseX() { return mouseX; },
      get mouseY() { return mouseY; },
      get isMouseDown() { return isMouseDown; },
      get isPointerDown() { return isMouseDown; },
      get score() { return score; },
      set score(val) { score = val; if(hudScore) hudScore.innerText = score; },
      setScore: function(val) { score = val; if(hudScore) hudScore.innerText = score; },
      getScore: function() { return score; },
      addScore: function(n) { score += n; if(hudScore) hudScore.innerText = score; },
      get lives() { return lives; },
      set lives(val) { lives = val; },
      get gameState() { return gameState; },
      set gameState(val) { gameState = val; },
      saveGame: function(key, val) {
        try { localStorage.setItem('clipanim_save_' + key, JSON.stringify(val)); } catch(e){}
      },
      loadGame: function(key, fallback) {
        try {
          const res = localStorage.getItem('clipanim_save_' + key);
          return res ? JSON.parse(res) : fallback;
        } catch(e) { return fallback; }
      },
      lerp: function(a, b, t) { return a + (b - a) * t; },
      clamp: function(v, min, max) { return Math.max(min, Math.min(max, v)); },
      randomRange: function(min, max) { return min + Math.random() * (max - min); },
      randomInt: function(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },
      distance: function(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
      angleBetween: function(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI); },
      shakeCamera: function(intensity, durationMs) {
        cameraShakeIntensity = intensity || 10;
        cameraShakeDuration = durationMs || 300;
      },
      spawnParticle: function(opt) {
        particles.push({
          x: opt.x || CW/2,
          y: opt.y || CH/2,
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
      playSound: function(nameOrIndex, options = {}) {
        if (isMuted) return;
        const tracks = GAME_DATA.audioTracks || [];
        let track = null;
        if (typeof nameOrIndex === 'number') {
          track = tracks[nameOrIndex];
        } else {
          track = tracks.find(t => t.name === nameOrIndex || t.id === nameOrIndex);
        }
        if (!track || !track.url) return;
        try {
          const audio = new Audio(track.url);
          audio.volume = (options.volume ?? track.volume ?? 1) * masterVolume;
          audio.loop = !!options.loop;
          if (options.playbackRate) audio.playbackRate = options.playbackRate;
          audio.play().catch(()=>{});
        } catch(e){}
      },
      stopAllSounds: function() {
        // Can pause background audios
      },
      getActor: function(name) {
        return symbolScope[name] || null;
      },
      getActors: function() {
        return Object.values(symbolScope);
      }
    };

    function runScript(code, contextObj = {}) {
      if (!code || typeof code !== 'string') return;
      try {
        const environment = {
          _global_gotoAndStop: timelineApi.gotoAndStop,
          _global_gotoAndPlay: timelineApi.gotoAndPlay,
          _global_play: timelineApi.play,
          _global_stop: timelineApi.stop,
          _global_nextFrame: timelineApi.nextFrame,
          _global_prevFrame: timelineApi.prevFrame,
          getCurrentFrame: timelineApi.getCurrentFrame,
          get currentFrame() { return currentFrameIndex + 1; },
          get totalFrames() { return GAME_DATA.frames.length; },
          keys,
          ...gameUtils,
          ...symbolScope
        };
        const keysList = Object.keys(environment);
        const valuesList = Object.values(environment);
        const fn = new Function(...keysList, 
          \`const gotoAndStop = _global_gotoAndStop;
           const gotoAndPlay = _global_gotoAndPlay;
           const play = _global_play;
           const stop = _global_stop;
           const nextFrame = _global_nextFrame;
           const prevFrame = _global_prevFrame;
           \${code}\`
        );
        fn.apply(contextObj, valuesList);
      } catch (err) {
        console.error("ActionScript Execution Error:", err);
      }
    }

    function triggerFrameScript(frameIdx) {
      if (frameIdx === lastExecutedFrameIndex) return;
      lastExecutedFrameIndex = frameIdx;
      const frame = GAME_DATA.frames[frameIdx];
      if (frame && frame.script) {
        runScript(frame.script);
      }
    }

    // 5. INITIALIZE ACTORS & SYMBOLS
    function initActors() {
      activeActors = JSON.parse(JSON.stringify(GAME_DATA.actors || []));
      actorContexts.clear();
      
      activeActors.forEach(actor => {
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
          onUpdate: null,
          onClick: null,
          onPointerDown: null,
          onPointerUp: null,
          onKeyDown: null,
          onKeyUp: null,
          _symbolFrameIndex: 0,
          _symbolIsPlaying: true,
          _symbolAccumulator: 0,
          ...timelineApi,
          play: function() { this._symbolIsPlaying = true; },
          stop: function() { this._symbolIsPlaying = false; },
          gotoAndStop: function(frame) {
            this._symbolIsPlaying = false;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
          },
          gotoAndPlay: function(frame) {
            this._symbolIsPlaying = true;
            this._symbolFrameIndex = Math.max(0, Math.min((actor.symbolFrames?.length || 1) - 1, frame - 1));
          },
          get currentFrame() { return currentFrameIndex + 1; },
          get symbolFrame() { return this._symbolFrameIndex + 1; },
          get totalFrames() { return actor.symbolFrames?.length || 1; },
          hitTest: function(other) {
            if (!other || other.visible === false || !this.visible) return false;
            const b1 = { x: this.x, y: this.y, w: this.width * Math.abs(this.scaleX), h: this.height * Math.abs(this.scaleY) };
            const b2 = { x: other.x, y: other.y, w: other.width * Math.abs(other.scaleX || 1), h: other.height * Math.abs(other.scaleY || 1) };
            return (b1.x < b2.x + b2.w && b1.x + b1.w > b2.x && b1.y < b2.y + b2.h && b1.y + b1.h > b2.y);
          },
          hitTestPoint: function(px, py) {
            if (!this.visible) return false;
            const w = this.width * Math.abs(this.scaleX);
            const h = this.height * Math.abs(this.scaleY);
            return px >= this.x && px <= this.x + w && py >= this.y && py <= this.y + h;
          },
          distanceTo: function(other) {
            if (!other) return Infinity;
            const c1x = this.x + this.width / 2;
            const c1y = this.y + this.height / 2;
            const c2x = other.x + (other.width || 0) / 2;
            const c2y = other.y + (other.height || 0) / 2;
            return Math.hypot(c2x - c1x, c2y - c1y);
          },
          lookAt: function(tx, ty) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            this.rotation = Math.atan2(ty - cy, tx - cx) * (180 / Math.PI);
          },
          destroy: function() {
            this.visible = false;
          }
        };

        actorContexts.set(actor.id, context);
        symbolScope[actor.name] = context;
      });

      // Run Actor Initialization Scripts
      activeActors.forEach(actor => {
        const ctxData = actorContexts.get(actor.id);
        if (actor.scripts && ctxData) {
          runScript(actor.scripts, ctxData);
        }
      });

      // Run Global Script
      if (GAME_DATA.projectScript) {
        runScript(GAME_DATA.projectScript);
      }

      // Initial Frame 1 Script
      triggerFrameScript(0);
    }

    // 6. MAIN GAME TICK & RENDER LOOP
    let lastTime = performance.now();
    let frameAccumulator = 0;
    let fpsCount = 0;
    let fpsTimer = 0;

    function renderGame(dt) {
      ctx.save();

      // Screen Shake
      if (cameraShakeDuration > 0) {
        cameraShakeDuration -= dt;
        const shakeX = (Math.random() - 0.5) * cameraShakeIntensity;
        const shakeY = (Math.random() - 0.5) * cameraShakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      ctx.clearRect(0, 0, CW, CH);

      // Draw Background
      const bg = GAME_DATA.background || { type: 'color', color: '#ffffff' };
      if (bg.type === 'gradient3' && bg.gradientColors) {
        const grad = ctx.createLinearGradient(0, 0, CW, CH);
        grad.addColorStop(0, bg.gradientColors[0]);
        grad.addColorStop(0.5, bg.gradientColors[1]);
        grad.addColorStop(1, bg.gradientColors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CW, CH);
      } else if (bg.color && bg.color !== 'transparent') {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, CW, CH);
      }

      // Draw Timeline Frame Canvas
      const curFrameImg = frameImages[currentFrameIndex];
      if (curFrameImg && curFrameImg.complete && curFrameImg.naturalWidth > 0) {
        ctx.drawImage(curFrameImg, 0, 0, CW, CH);
      }

      // Draw Actors & Symbols
      activeActors.forEach(actor => {
        if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameIndex) return;

        const ctxData = actorContexts.get(actor.id);
        if (!ctxData || !ctxData.visible) return;

        // Run OnUpdate Hook
        if (ctxData.onUpdate) {
          try { ctxData.onUpdate(dt / 1000); } catch(e){}
        }

        // Apply velocities
        if (ctxData.vx) ctxData.x += ctxData.vx;
        if (ctxData.vy) ctxData.y += ctxData.vy;

        // Render Actor Graphic
        ctx.save();
        const pivotX = ctxData.x + actor.width / 2;
        const pivotY = ctxData.y + actor.height / 2;

        ctx.translate(pivotX, pivotY);
        ctx.rotate((ctxData.rotation * Math.PI) / 180);
        ctx.scale(ctxData.scaleX, ctxData.scaleY);
        ctx.globalAlpha = Math.max(0, Math.min(1, ctxData.opacity));

        let imgToDraw = null;
        if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 0) {
          const symIndex = ctxData._symbolFrameIndex || 0;
          imgToDraw = actorImageCache.get(actor.id + '_sym_' + symIndex);
        } else {
          imgToDraw = actorImageCache.get(actor.id + '_base');
        }

        if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
          ctx.drawImage(imgToDraw, -actor.width / 2, -actor.height / 2, actor.width, actor.height);
        }
        ctx.restore();
      });

      // Update & Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
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

        if (p.life <= 0) particles.splice(i, 1);
      }

      ctx.restore();
    }

    function gameLoop(time) {
      const dt = Math.min(100, time - lastTime);
      lastTime = time;

      // FPS Calculation
      fpsCount++;
      fpsTimer += dt;
      if (fpsTimer >= 1000) {
        if (hudFps) hudFps.innerText = fpsCount;
        fpsCount = 0;
        fpsTimer = 0;
      }
      if (hudFrame) hudFrame.innerText = (currentFrameIndex + 1) + '/' + GAME_DATA.frames.length;

      const currentFrameObj = GAME_DATA.frames[currentFrameIndex];
      const durationMult = (currentFrameObj?.durationMultiplier || 1);
      const frameInterval = (1000 / TARGET_FPS) * durationMult;

      if (isPlaying && isGameStarted) {
        frameAccumulator += dt;
        if (frameAccumulator >= frameInterval) {
          const nextIdx = (currentFrameIndex + 1) % GAME_DATA.frames.length;
          currentFrameIndex = nextIdx;
          frameAccumulator -= frameInterval;
          triggerFrameScript(nextIdx);
        }
      }

      // Animate symbols
      activeActors.forEach(actor => {
        if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 1) {
          const ctxData = actorContexts.get(actor.id);
          if (ctxData && ctxData._symbolIsPlaying) {
            const symFps = actor.symbolFps || TARGET_FPS;
            const symInterval = 1000 / symFps;
            ctxData._symbolAccumulator = (ctxData._symbolAccumulator || 0) + dt;
            if (ctxData._symbolAccumulator >= symInterval) {
              ctxData._symbolFrameIndex = ((ctxData._symbolFrameIndex || 0) + 1) % actor.symbolFrames.length;
              ctxData._symbolAccumulator -= symInterval;
            }
          }
        }
      });

      renderGame(dt);

      // Clear single-frame keypress triggers
      for (const k in keysJustPressed) {
        delete keysJustPressed[k];
      }

      requestAnimationFrame(gameLoop);
    }

    // 7. USER INPUTS & EVENT LISTENERS
    function handlePointer(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CW / rect.width;
      const scaleY = CH / rect.height;
      mouseX = (e.clientX - rect.left) * scaleX;
      mouseY = (e.clientY - rect.top) * scaleY;
    }

    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerdown', (e) => {
      handlePointer(e);
      isMouseDown = true;

      // Hit test clicked actors (top to bottom)
      for (let i = activeActors.length - 1; i >= 0; i--) {
        const actor = activeActors[i];
        if (actor.targetFrame !== undefined && actor.targetFrame !== currentFrameIndex) continue;
        const ctxData = actorContexts.get(actor.id);
        if (!ctxData || !ctxData.visible) continue;

        if (ctxData.hitTestPoint(mouseX, mouseY)) {
          if (ctxData.onPointerDown) ctxData.onPointerDown(e);
          if (ctxData.onClick) {
            try { ctxData.onClick(e); } catch(err){}
          }
          break; // top-most consumed
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      isMouseDown = false;
      activeActors.forEach(actor => {
        const ctxData = actorContexts.get(actor.id);
        if (ctxData && ctxData.onPointerUp) ctxData.onPointerUp(e);
      });
    });

    // Keyboard Handlers
    window.addEventListener('keydown', (e) => {
      const key = e.key;
      const code = e.code;
      if (!keys[key]) keysJustPressed[key] = true;
      if (!keys[code]) keysJustPressed[code] = true;
      keys[key] = true;
      keys[code] = true;

      // Broadcast to actors
      activeActors.forEach(actor => {
        const ctxData = actorContexts.get(actor.id);
        if (ctxData && ctxData.onKeyDown) {
          try { ctxData.onKeyDown(key, e); } catch(err){}
        }
      });

      // Global hotkeys
      if (key === 'r' || key === 'R') restartGame();
      if (key === 'p' || key === 'P') togglePause();
      if (key === 'm' || key === 'M') toggleMute();
      if (key === 'f' || key === 'F') toggleFullscreen();
      if (key === 't' || key === 'T') toggleTouchControls();
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key;
      const code = e.code;
      keys[key] = false;
      keys[code] = false;
      delete keysJustPressed[key];
      delete keysJustPressed[code];

      activeActors.forEach(actor => {
        const ctxData = actorContexts.get(actor.id);
        if (ctxData && ctxData.onKeyUp) {
          try { ctxData.onKeyUp(key, e); } catch(err){}
        }
      });
    });

    // Touch D-Pad mapping
    document.querySelectorAll('.dpad-btn, .action-btn').forEach(btn => {
      const targetKey = btn.getAttribute('data-key');
      const startTouch = (e) => {
        e.preventDefault();
        keys[targetKey] = true;
        keysJustPressed[targetKey] = true;
      };
      const endTouch = (e) => {
        e.preventDefault();
        keys[targetKey] = false;
      };
      btn.addEventListener('pointerdown', startTouch);
      btn.addEventListener('pointerup', endTouch);
      btn.addEventListener('pointercancel', endTouch);
    });

    // 8. HEADER UI CONTROLS
    function startGame() {
      isGameStarted = true;
      startOverlay.style.opacity = '0';
      setTimeout(() => { startOverlay.style.display = 'none'; }, 300);
      initActors();
    }

    function restartGame() {
      currentFrameIndex = 0;
      isPlaying = true;
      score = 0;
      lives = 3;
      gameState = 'playing';
      particles.length = 0;
      initActors();
    }

    function togglePause() {
      isPlaying = !isPlaying;
      const btn = document.getElementById('btn-pause');
      btn.classList.toggle('active', !isPlaying);
      btn.innerHTML = isPlaying ? '<span>⏸️ Pause</span>' : '<span>▶️ Resume</span>';
    }

    function toggleMute() {
      isMuted = !isMuted;
      const btn = document.getElementById('btn-mute');
      btn.classList.toggle('active', isMuted);
      btn.innerHTML = isMuted ? '<span>🔇 Muted</span>' : '<span>🔊 Sound</span>';
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
      } else {
        document.exitFullscreen().catch(()=>{});
      }
    }

    function toggleTouchControls() {
      const isVisible = touchControls.style.display === 'flex';
      touchControls.style.display = isVisible ? 'none' : 'flex';
      document.getElementById('btn-touch').classList.toggle('active', !isVisible);
    }

    function toggleScanlines() {
      canvasBox.classList.toggle('scanlines');
      document.getElementById('btn-scanlines').classList.toggle('active');
    }

    function toggleStats() {
      const isVis = hudInfo.style.display === 'block';
      hudInfo.style.display = isVis ? 'none' : 'block';
      document.getElementById('btn-stats').classList.toggle('active', !isVis);
    }

    // Bind Header Buttons
    btnStart.addEventListener('click', startGame);
    document.getElementById('btn-restart').addEventListener('click', restartGame);
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-mute').addEventListener('click', toggleMute);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('btn-touch').addEventListener('click', toggleTouchControls);
    document.getElementById('btn-scanlines').addEventListener('click', toggleScanlines);
    document.getElementById('btn-stats').addEventListener('click', toggleStats);
    document.getElementById('btn-help').addEventListener('click', () => { helpModal.style.display = 'flex'; });
    document.getElementById('btn-close-help').addEventListener('click', () => { helpModal.style.display = 'none'; });

    // Auto-detect mobile devices for touch controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      touchControls.style.display = 'flex';
      document.getElementById('btn-touch').classList.add('active');
    }

    // Begin Loading & Start Loop
    preloadAllAssets().then(() => {
      requestAnimationFrame(gameLoop);
    });

  })();
  </script>
</body>
</html>`;

  const blob = new Blob([htmlSource], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeFilename = `${(projectName || 'ClipAnim_Game').replace(/[/\\?%*:|"<>]/g, '_')}.html`;

  return { blob, url, filename: safeFilename };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
