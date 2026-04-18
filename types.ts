
export type SymmetryMode = 'none' | 'horizontal' | 'vertical';

export type ToolType = 'pen' | 'eraser' | 'fill' | 'select' | 'lasso' | 'wand' | 'shape' | 'text' | 'eyedropper' | 'motionPath';

export type BrushType = 'pen' | 'marker' | 'highlighter' | 'spray' | 'pixel' | 'watercolor' | 'oil' | 'calligraphy';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'triangle' | 'star' | 'hexagon' | 'heart' | 'arrow' | 'speech-bubble';

export interface MotionPath {
  id: string;
  points: Point[];
  targetLayerId: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface BackpackItem {
  id: string;
  dataUrl: string;
  createdAt: number;
  name?: string;
}

export interface Layer {
  id: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  opacity: number; // 0 to 1
  blendMode: GlobalCompositeOperation;
}

export interface Frame {
  id: string;
  layers: Record<string, string>; // Maps layerId to dataUrl
  thumbnailUrl?: string; // Cached composite image for timeline
  durationMultiplier?: number; // Multiplier for frame duration (default 1)
  background?: BackgroundSettings;
  backgroundImage?: string | null;
}

export interface AudioTrack {
  id: string;
  url: string;
  name: string;
  color: string; // For UI visualization
  volume: number;
  startTime: number; // Start time in seconds relative to the timeline
  duration: number;  // Duration in seconds to play
  offset: number;    // Offset in seconds from the start of the original file
}

// Selection state
export interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string; // The image content
  rotation: number; // degrees
  scaleX: number; // 1 or -1
  scaleY: number; // 1 or -1
  anchorX?: number; // relative to selection x
  anchorY?: number; // relative to selection y
  type?: 'text' | 'image';
  selectionType?: 'rectangle' | 'lasso' | 'wand';
  maskUrl?: string;
  originX?: number;
  originY?: number;
  textData?: {
    text: string;
    font: string;
    color: string;
    fontSize: number;
    bold?: boolean;
    italic?: boolean;
  };
}

export interface OnionSkinSettings {
  beforeColor: string;
  afterColor: string;
  beforeOpacity: number;
  afterOpacity: number;
  numBefore: number;
  numAfter: number;
}

export interface Shortcuts {
  selectTool: string;
  lassoTool: string;
  wandTool: string;
  penTool: string;
  eraserTool: string;
  fillTool: string;
  shapeTool: string;
  textTool: string;
  playPause: string;
  nextFrame: string;
  prevFrame: string;
  addFrame: string;
  deleteFrame: string;
  undo: string;
  redo: string;
}

export interface BackgroundSettings {
  type: 'color' | 'gradient3';
  color: string;
  gradientColors?: [string, string, string];
}

export interface AppState {
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  onionSkin: boolean;
  onionSkinSettings: OnionSkinSettings;
  fillOpacity: number;
  fillTolerance: number;
  smoothing: number;
  background: BackgroundSettings;
  motionPaths: MotionPath[];
}

export interface ProjectMeta {
    id: string;
    name: string;
    lastModified: number;
    thumbnailUrl: string;
}

export interface ProjectData {
    id: string;
    name: string;
    lastModified: number;
    thumbnailUrl: string;
    canvasSize: { width: number; height: number };
    background: BackgroundSettings;
    backgroundImage: string | null;
    layers: Layer[];
    frames: Frame[];
    fps: number;
    audioTracks: AudioTrack[];
    motionPaths: MotionPath[];
    onionSkinSettings?: OnionSkinSettings;
}
