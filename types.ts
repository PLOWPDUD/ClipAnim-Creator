
export type ToolType = 'pen' | 'eraser' | 'fill' | 'select' | 'shape' | 'text';

export type BrushType = 'pen' | 'marker' | 'highlighter' | 'spray' | 'pixel';

export type ShapeType = 'rectangle' | 'circle' | 'line';

export interface Point {
  x: number;
  y: number;
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
}

export interface AudioTrack {
  id: string;
  url: string;
  name: string;
  color: string; // For UI visualization
  volume: number;
}

export interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string; // The image content
  rotation: number; // degrees
  scaleX: number; // 1 or -1
  scaleY: number; // 1 or -1
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
    backgroundImage: string | null;
    layers: Layer[];
    frames: Frame[];
    fps: number;
    audioTracks: AudioTrack[];
}
