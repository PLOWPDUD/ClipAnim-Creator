// Built-in presets, background packs, vector graphics, animated symbols, and color palettes
import { Frame, Layer, SavedSymbol } from '../types';

export interface PresetAsset {
  id: string;
  name: string;
  type: 'image' | 'sound' | 'symbol' | 'palette';
  category: string;
  tags: string[];
  dataUrl: string;
  fileType: string;
  size: number;
  duration?: number;
  isAnimated?: boolean;
  symbolFrames?: Frame[];
  symbolLayers?: Layer[];
  symbolFps?: number;
  scripts?: string;
  paletteColors?: string[];
  description?: string;
}

// 1. Vector SVG Graphics & Backgrounds
const SVG_ANIME_SKY = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%231a73e8"/>
      <stop offset="50%" stop-color="%2364b5f6"/>
      <stop offset="100%" stop-color="%23ffcc80"/>
    </linearGradient>
    <linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23ffffff"/>
      <stop offset="100%" stop-color="%23e1f5fe"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(%23sky)"/>
  <circle cx="1500" cy="350" r="140" fill="%23fff9c4" opacity="0.85"/>
  <g fill="url(%23cloud)" opacity="0.95">
    <ellipse cx="400" cy="550" rx="260" ry="110"/>
    <ellipse cx="560" cy="480" rx="190" ry="140"/>
    <ellipse cx="280" cy="510" rx="160" ry="100"/>
    <ellipse cx="1300" cy="700" rx="340" ry="140"/>
    <ellipse cx="1520" cy="620" rx="220" ry="160"/>
    <ellipse cx="1120" cy="660" rx="200" ry="120"/>
  </g>
</svg>`;

const SVG_CYBERPUNK_GRID = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23090014"/>
      <stop offset="55%" stop-color="%232b0938"/>
      <stop offset="100%" stop-color="%230d0221"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23ff007f"/>
      <stop offset="100%" stop-color="%23ffae00"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(%23bg)"/>
  <circle cx="960" cy="550" r="280" fill="url(%23sun)"/>
  <g stroke="%2300f3ff" stroke-width="2" opacity="0.7">
    <line x1="0" y1="650" x2="1920" y2="650"/>
    <line x1="0" y1="700" x2="1920" y2="700"/>
    <line x1="0" y1="770" x2="1920" y2="770"/>
    <line x1="0" y1="870" x2="1920" y2="870"/>
    <line x1="0" y1="1000" x2="1920" y2="1000"/>
    <line x1="960" y1="650" x2="960" y2="1080"/>
    <line x1="960" y1="650" x2="400" y2="1080"/>
    <line x1="960" y1="650" x2="-200" y2="1080"/>
    <line x1="960" y1="650" x2="1520" y2="1080"/>
    <line x1="960" y1="650" x2="2120" y2="1080"/>
  </g>
</svg>`;

const SVG_FOREST_NIGHT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23050c1a"/>
      <stop offset="70%" stop-color="%230d2b45"/>
      <stop offset="100%" stop-color="%23203c56"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(%23night)"/>
  <circle cx="1350" cy="280" r="90" fill="%23f7fafc" opacity="0.9"/>
  <circle cx="1320" cy="270" r="90" fill="url(%23night)"/>
  <path d="M0,1080 L0,750 L200,600 L450,780 L700,560 L950,790 L1200,540 L1500,810 L1750,570 L1920,720 L1920,1080 Z" fill="%23041322" opacity="0.7"/>
  <path d="M0,1080 L0,840 L180,720 L400,870 L650,680 L900,890 L1150,670 L1420,890 L1680,690 L1920,810 L1920,1080 Z" fill="%23020912"/>
</svg>`;

const SVG_SPEECH_BUBBLE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <path d="M 50,40 Q 350,40 350,150 Q 350,240 220,240 L 140,290 L 160,240 Q 50,240 50,140 Z" fill="%23ffffff" stroke="%23111827" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

const SVG_ACTION_BURST = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <polygon points="200,10 240,120 350,60 300,170 390,200 290,250 350,350 240,300 200,390 160,300 50,350 110,250 10,200 100,170 50,60 160,120" fill="%23ffcc00" stroke="%23ff3b30" stroke-width="12" stroke-linejoin="round"/>
</svg>`;

const SVG_SPEED_LINES = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="%23111827" stop-opacity="0"/>
      <stop offset="100%" stop-color="%23111827" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <g fill="url(%23lineGrad)">
    <polygon points="0,50 800,280 800,288 0,55"/>
    <polygon points="0,150 800,292 800,300 0,160"/>
    <polygon points="0,420 800,305 800,312 0,430"/>
    <polygon points="0,520 800,318 800,328 0,535"/>
    <polygon points="800,50 0,280 0,288 800,55"/>
    <polygon points="800,150 0,292 0,300 800,160"/>
    <polygon points="800,420 0,305 0,312 800,430"/>
    <polygon points="800,520 0,318 0,328 800,535"/>
  </g>
</svg>`;

const SVG_COIN_BASE = (angle: number) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <ellipse cx="50" cy="50" rx="${Math.max(4, Math.abs(Math.cos(angle)) * 40)}" ry="40" fill="%23fbbf24" stroke="%23d97706" stroke-width="4"/>
  <ellipse cx="50" cy="50" rx="${Math.max(2, Math.abs(Math.cos(angle)) * 28)}" ry="28" fill="%23fef08a" stroke="%23f59e0b" stroke-width="2"/>
</svg>`;

const SVG_FLAME_FRAME = (f: number) => {
  const h = 70 + (f % 3) * 10;
  const sway = (f % 4 - 1.5) * 8;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
    <path d="M 50,110 Q ${40 + sway},${80} ${30 + sway},${60} Q ${35 + sway},${30} ${50 + sway},${120 - h} Q ${65 + sway},${30} ${70 + sway},${60} Q ${60 + sway},${80} 50,110 Z" fill="%23ef4444"/>
    <path d="M 50,110 Q ${45 + sway * 0.5},${90} ${40 + sway * 0.5},${70} Q ${42 + sway * 0.5},${45} ${50 + sway * 0.5},${125 - h * 0.8} Q ${58 + sway * 0.5},${45} ${60 + sway * 0.5},${70} Q ${55 + sway * 0.5},${90} 50,110 Z" fill="%23f59e0b"/>
    <path d="M 50,110 Q 48,95 45,80 Q 46,65 50,${120 - h * 0.5} Q 54,65 55,80 Q 52,95 50,110 Z" fill="%23fef08a"/>
  </svg>`;
};

const SVG_BOUNCE_BALL = (frameIdx: number) => {
  // 8 frames of bouncing
  const positions = [
    { y: 30, rx: 25, ry: 25 }, // Top apex
    { y: 60, rx: 22, ry: 28 }, // Fall stretch
    { y: 95, rx: 18, ry: 32 }, // Fast fall stretch
    { y: 110, rx: 36, ry: 15 }, // Squash on floor!
    { y: 90, rx: 18, ry: 32 }, // Rebound stretch
    { y: 60, rx: 22, ry: 28 }, // Rising stretch
    { y: 35, rx: 24, ry: 26 }, // Easing to apex
    { y: 28, rx: 25, ry: 25 }  // Apex hover
  ];
  const p = positions[frameIdx % positions.length];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="120" height="140">
    <ellipse cx="60" cy="120" rx="${p.rx * 0.9}" ry="6" fill="%23000000" opacity="0.3"/>
    <ellipse cx="60" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="%23ef4444" stroke="%23991b1b" stroke-width="3"/>
    <ellipse cx="${60 - p.rx * 0.3}" cy="${p.y - p.ry * 0.3}" rx="${p.rx * 0.3}" ry="${p.ry * 0.3}" fill="%23ffffff" opacity="0.7"/>
  </svg>`;
};

const SVG_STICK_WALK = (frameIdx: number) => {
  // 8 frames walk cycle poses
  const angles = [
    { l1: -25, l2: 25, a1: 20, a2: -20, bob: 0 },
    { l1: -10, l2: 15, a1: 10, a2: -10, bob: 4 },
    { l1: 0, l2: 0, a1: 0, a2: 0, bob: 6 },
    { l1: 15, l2: -10, a1: -10, a2: 10, bob: 4 },
    { l1: 25, l2: -25, a1: -20, a2: 20, bob: 0 },
    { l1: 15, l2: -10, a1: -10, a2: 10, bob: 4 },
    { l1: 0, l2: 0, a1: 0, a2: 0, bob: 6 },
    { l1: -10, l2: 15, a1: 10, a2: -10, bob: 4 }
  ];
  const a = angles[frameIdx % angles.length];
  const hy = 25 + a.bob;
  const by = 55 + a.bob;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
    <circle cx="50" cy="${hy}" r="12" fill="%23ffffff" stroke="%230f172a" stroke-width="3.5"/>
    <line x1="50" y1="${hy + 12}" x2="50" y2="${by}" stroke="%230f172a" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="${hy + 18}" x2="${50 + a.a1}" y2="${hy + 35}" stroke="%230f172a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="${hy + 18}" x2="${50 + a.a2}" y2="${hy + 35}" stroke="%230f172a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="${by}" x2="${50 + a.l1}" y2="105" stroke="%230f172a" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="${by}" x2="${50 + a.l2}" y2="105" stroke="%232563eb" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
};

// Helper to make an animated symbol structure
function createAnimatedSymbol(name: string, frameSvgs: string[], fps: number = 12, scripts: string = ''): SavedSymbol {
  const layerId = crypto.randomUUID();
  const layer: Layer = {
    id: layerId,
    name: 'SymbolLayer',
    isVisible: true,
    isLocked: false,
    opacity: 1,
    blendMode: 'source-over'
  };

  const frames: Frame[] = frameSvgs.map(svgUrl => ({
    id: crypto.randomUUID(),
    layers: { [layerId]: svgUrl },
    script: ''
  }));

  return {
    id: `preset-sym-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    dataUrl: frameSvgs[0],
    isAnimated: true,
    symbolFrames: frames,
    symbolLayers: [layer],
    symbolFps: fps,
    scripts: scripts || '// Symbol Script\nthis.onUpdate = function() {\n  // frame loop\n};',
    createdAt: Date.now()
  };
}

// Curated Built-in Symbols
export const PRESET_SYMBOLS: SavedSymbol[] = [
  createAnimatedSymbol(
    'Bouncing Ball (Squash & Stretch)',
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => SVG_BOUNCE_BALL(i)),
    12,
    `// Bouncing Ball Physics\nthis.vy = (this.vy || 0) + 0.5;\nthis.y += this.vy;\nif (this.y > 400) {\n  this.y = 400;\n  this.vy = -12;\n}`
  ),
  createAnimatedSymbol(
    'Stickman Walk Loop',
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => SVG_STICK_WALK(i)),
    10,
    `// Walk across screen\nthis.x += 3;\nif (this.x > 800) this.x = -100;`
  ),
  createAnimatedSymbol(
    'Spinning Gold Coin',
    [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, (5 * Math.PI) / 6].map(a => SVG_COIN_BASE(a)),
    12,
    `// Coin collect behavior\nthis.onClick = function() {\n  this.scaleX = 1.3;\n  this.scaleY = 1.3;\n};`
  ),
  createAnimatedSymbol(
    'Roaring Campfire Flame',
    [0, 1, 2, 3, 4, 5].map(i => SVG_FLAME_FRAME(i)),
    10
  )
];

// Curated Built-in Assets for Local Asset Library
export const CURATED_PRESET_ASSETS: PresetAsset[] = [
  // Backgrounds
  {
    id: 'preset-bg-anime-sky',
    name: 'Anime Daytime Sky & Fluffy Clouds',
    type: 'image',
    category: 'Backgrounds',
    tags: ['sky', 'clouds', 'anime', 'day', 'sun'],
    dataUrl: SVG_ANIME_SKY,
    fileType: 'image/svg+xml',
    size: 3200,
    description: 'High-res Anime sky with golden horizon and stylized clouds'
  },
  {
    id: 'preset-bg-cyberpunk',
    name: 'Retro Synthwave Cyberpunk Grid',
    type: 'image',
    category: 'Backgrounds',
    tags: ['synthwave', 'cyberpunk', 'neon', 'grid', 'retro', '80s'],
    dataUrl: SVG_CYBERPUNK_GRID,
    fileType: 'image/svg+xml',
    size: 2800,
    description: 'Neon glowing 80s synthwave perspective grid and digital sun'
  },
  {
    id: 'preset-bg-forest',
    name: 'Enchanted Forest Moonlight',
    type: 'image',
    category: 'Backgrounds',
    tags: ['forest', 'night', 'moon', 'nature', 'landscape'],
    dataUrl: SVG_FOREST_NIGHT,
    fileType: 'image/svg+xml',
    size: 2400,
    description: 'Moody silhouettes with crescent moonlight and misty hills'
  },

  // Props & VFX
  {
    id: 'preset-vfx-speedlines',
    name: 'Anime Action Speed Lines Overlay',
    type: 'image',
    category: 'VFX & Overlays',
    tags: ['speed', 'action', 'anime', 'manga', 'lines', 'focus'],
    dataUrl: SVG_SPEED_LINES,
    fileType: 'image/svg+xml',
    size: 1900,
    description: 'Dynamic comic radial speed burst lines overlay'
  },
  {
    id: 'preset-prop-speech-bubble',
    name: 'Comic Speech Bubble Vector',
    type: 'image',
    category: 'Props & UI',
    tags: ['comic', 'bubble', 'dialogue', 'text', 'speech', 'cartoon'],
    dataUrl: SVG_SPEECH_BUBBLE,
    fileType: 'image/svg+xml',
    size: 1200,
    description: 'Crisp hand-drawn cartoon speech callout bubble'
  },
  {
    id: 'preset-vfx-action-burst',
    name: 'Comic Boom Action Starburst',
    type: 'image',
    category: 'VFX & Overlays',
    tags: ['boom', 'star', 'burst', 'impact', 'pow', 'vfx'],
    dataUrl: SVG_ACTION_BURST,
    fileType: 'image/svg+xml',
    size: 1500,
    description: 'Explosive comic action impact starburst'
  },

  // Color Palettes
  {
    id: 'preset-pal-cyberpunk',
    name: 'Cyberpunk Neon Palette',
    type: 'palette',
    category: 'Color Palettes',
    tags: ['neon', 'cyberpunk', 'vibrant', 'palette'],
    dataUrl: '',
    fileType: 'application/json',
    size: 500,
    paletteColors: ['#00f3ff', '#ff007f', '#ffe600', '#7b2cbf', '#050505', '#ffffff'],
    description: 'Electric cyan, hot magenta, neon yellow, and deep purple'
  },
  {
    id: 'preset-pal-ghibli',
    name: 'Studio Ghibli Nature Palette',
    type: 'palette',
    category: 'Color Palettes',
    tags: ['ghibli', 'nature', 'anime', 'pastel', 'palette'],
    dataUrl: '',
    fileType: 'application/json',
    size: 500,
    paletteColors: ['#588157', '#3a5a40', '#dad7cd', '#e07a5f', '#3d405b', '#f4f1de'],
    description: 'Organic moss green, earthy clay, warm cream, and twilight indigo'
  },
  {
    id: 'preset-pal-pico8',
    name: 'PICO-8 Retro 8-Bit Palette',
    type: 'palette',
    category: 'Color Palettes',
    tags: ['pico8', '8bit', 'retro', 'pixel', 'game', 'palette'],
    dataUrl: '',
    fileType: 'application/json',
    size: 500,
    paletteColors: [
      '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ],
    description: 'Classic 16-color PICO-8 game engine color palette'
  },
  {
    id: 'preset-pal-sunset',
    name: 'Warm Sunset Twilight',
    type: 'palette',
    category: 'Color Palettes',
    tags: ['sunset', 'twilight', 'warm', 'gradient', 'palette'],
    dataUrl: '',
    fileType: 'application/json',
    size: 500,
    paletteColors: ['#2b0938', '#591a53', '#9e2a2b', '#ff5400', '#ffbd00', '#fff3b0'],
    description: 'Deep dusk purple, vibrant orange, and golden amber'
  }
];
