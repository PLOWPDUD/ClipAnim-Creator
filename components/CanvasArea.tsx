import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../Icons';
import { ToolType, Frame, Layer, SelectionState, ShapeType, BrushType, OnionSkinSettings, BackgroundSettings, Point, SymmetryMode } from '../types';
import { floodFill, magicWandSelect, lassoSelect } from '../utils/drawingUtils';

export interface CanvasAreaHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPanX: (x: number) => void;
  setPanY: (y: number) => void;
}

interface CanvasAreaProps {
  currentFrame: Frame;
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayer: (layerId: string, dataUrl: string) => void;
  tool: ToolType;
  brushType: BrushType;
  shapeType: ShapeType;
  color: string;
  strokeWidth: number;
  beforeFrames?: Frame[];
  afterFrames?: Frame[];
  onionSkin: boolean;
  onionSkinSettings: OnionSkinSettings;
  showGrid: boolean;
  isPlaying: boolean;
  
  // Selection Props
  selection: SelectionState | null;
  onSelectionCreate: (data: SelectionState) => void;
  onSelectionUpdate: (data: SelectionState) => void;
  onSelectionCommit: () => void;
  onSelectionDelete: () => void;

  // Canvas Settings
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundSettings;
  backgroundImage: string | null;

  // Text Tool
  textToolFont: string;
  
  // Fill Tool
  fillOpacity: number;
  fillTolerance: number;
  smoothing: number;
  deviceType: 'mobile' | 'pc' | null;
  onColorPick: (color: string) => void;
  cameraMode: boolean;
  onToggleCameraMode: () => void;
  symmetryMode: SymmetryMode;
  onApplyMotionPath: (points: Point[]) => void;
}

const getMixBlendMode = (mode: GlobalCompositeOperation): any => {
    if (mode === 'source-over') return 'normal';
    const supported = ['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    if (supported.includes(mode)) return mode;
    return 'normal';
};

const getResizeCursor = (handle: string, rotation: number, scaleX: number, scaleY: number) => {
    let baseAngle = 0;
    if (handle === 'resize-tl') baseAngle = 315;
    else if (handle === 'resize-tr') baseAngle = 45;
    else if (handle === 'resize-br') baseAngle = 135;
    else if (handle === 'resize-bl') baseAngle = 225;
    else if (handle === 'resize-l') baseAngle = 270;
    else if (handle === 'resize-r') baseAngle = 90;

    if (scaleX < 0) {
        if (baseAngle === 315) baseAngle = 45;
        else if (baseAngle === 45) baseAngle = 315;
        else if (baseAngle === 135) baseAngle = 225;
        else if (baseAngle === 225) baseAngle = 135;
        else if (baseAngle === 270) baseAngle = 90;
        else if (baseAngle === 90) baseAngle = 270;
    }
    if (scaleY < 0) {
        if (baseAngle === 315) baseAngle = 225;
        else if (baseAngle === 45) baseAngle = 135;
        else if (baseAngle === 135) baseAngle = 45;
        else if (baseAngle === 225) baseAngle = 315;
    }

    let angle = (baseAngle + rotation) % 360;
    if (angle < 0) angle += 360;

    const sector = Math.round(angle / 45) % 8;
    switch (sector) {
        case 0: return 'ns-resize';
        case 1: return 'nesw-resize';
        case 2: return 'ew-resize';
        case 3: return 'nwse-resize';
        case 4: return 'ns-resize';
        case 5: return 'nesw-resize';
        case 6: return 'ew-resize';
        case 7: return 'nwse-resize';
    }
    return 'nwse-resize';
};

export const CanvasArea = forwardRef<CanvasAreaHandle, CanvasAreaProps>(({
  currentFrame,
  layers,
  activeLayerId,
  onUpdateLayer,
  tool,
  brushType,
  shapeType,
  color,
  strokeWidth,
  beforeFrames = [],
  afterFrames = [],
  onionSkin,
  onionSkinSettings,
  showGrid,
  isPlaying,
  selection,
  onSelectionCreate,
  onSelectionUpdate,
  onSelectionCommit,
  onSelectionDelete,
  canvasWidth,
  canvasHeight,
  background,
  backgroundImage,
  textToolFont,
  fillOpacity,
  fillTolerance,
  smoothing,
  deviceType,
  onColorPick,
  cameraMode,
  onToggleCameraMode,
  symmetryMode,
  onApplyMotionPath
}, ref) => {
  console.log('CanvasArea render', { layers, activeLayerId });
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskImageRef = useRef<HTMLImageElement | null>(null);
  const anchorPointRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const lassoPoints = useRef<{x: number, y: number}[]>([]);
  const latestSelectionState = useRef<SelectionState | null>(null);

  const transform = useRef({ scale: 1, x: 0, y: 0, rotation: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isGesture = useRef(false);
  const isDrawing = useRef(false);
  const isDrawingOnSelectionRef = useRef(false);
  
  const initialPinchDistance = useRef<number | null>(null);
  const initialAngle = useRef<number | null>(null);
  const startRotation = useRef<number>(0);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  // Tracking movement to distinguish tap from drag
  const hasMoved = useRef(false);
  const drawStart = useRef<{x: number, y: number} | null>(null);
  const points = useRef<{x: number, y: number}[]>([]);
  const symmetryPathPoints = useRef<Record<string, {x: number, y: number}[]>>({});
  const lastPoint = useRef<{x: number, y: number} | null>(null);
  const symmetryLastPoints = useRef<Record<string, {x: number, y: number} | null>>({});
  const motionPathPoints = useRef<{x: number, y: number}[]>([]);
  const canvasSnapshot = useRef<ImageData | null>(null);

  const dragStart = useRef<{x: number, y: number} | null>(null);
  const initialSelection = useRef<SelectionState | null>(null);
  const selectionMode = useRef<'create' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-l' | 'resize-r' | 'rotate' | 'anchor' | null>(null);
  const [isCreatingSelection, setIsCreatingSelection] = useState(false);

  const [textInput, setTextInput] = useState<{x: number, y: number, value: string, font?: string, color?: string, fontSize?: number} | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
      resetView: () => {
          transform.current = { scale: 1, x: 0, y: 0, rotation: 0 };
          updateTransformStyle();
      },
      zoomIn: () => {
          transform.current.scale = Math.min(transform.current.scale * 1.2, 10);
          updateTransformStyle();
      },
      zoomOut: () => {
          transform.current.scale = Math.max(transform.current.scale / 1.2, 0.1);
          updateTransformStyle();
      },
      setPanX: (x: number) => {
          transform.current.x = x;
          updateTransformStyle();
      },
      setPanY: (y: number) => {
          transform.current.y = y;
          updateTransformStyle();
      }
  }));

  useEffect(() => {
      if (selection && selectionOverlayRef.current) {
          const s = selectionOverlayRef.current.style;
          s.left = `${selection.x}px`;
          s.top = `${selection.y}px`;
          s.width = `${selection.width}px`;
          s.height = `${selection.height}px`;
          s.transform = `rotate(${selection.rotation}deg) scale(${selection.scaleX}, ${selection.scaleY})`;
          latestSelectionState.current = selection;
          
          if (selectionCanvasRef.current) {
              const ctx = selectionCanvasRef.current.getContext('2d');
              if (ctx) {
                  const img = new Image();
                  img.onload = () => {
                      ctx.save();
                      ctx.globalCompositeOperation = 'source-over';
                      ctx.clearRect(0, 0, selection.width, selection.height);
                      ctx.drawImage(img, 0, 0, selection.width, selection.height);
                      ctx.restore();
                  };
                  img.onerror = (e) => {
                      console.error("Error loading selection image:", e);
                  };
                  img.src = selection.dataUrl;
              }
          }

          if (selection.maskUrl) {
              const mImg = new Image();
              mImg.onload = () => {
                  maskImageRef.current = mImg;
              };
              mImg.onerror = (e) => {
                  console.error("Error loading selection mask:", e);
              };
              mImg.src = selection.maskUrl;
          } else {
              maskImageRef.current = null;
          }
      } else {
          maskImageRef.current = null;
      }
  }, [selection]);

  useEffect(() => {
      if (textInput && textInputRef.current) {
          textInputRef.current.focus();
      }
  }, [textInput]);

  useEffect(() => {
    if (!currentFrame) return;
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    // Default smoothing settings
    ctx.imageSmoothingEnabled = brushType !== 'pixel';
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const layerData = currentFrame.layers?.[activeLayerId];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // RESET CONTEXT STATE to prevent ghost transparency from previous tools
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    if (layerData) {
        const img = new Image();
        img.src = layerData;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
    }
  }, [currentFrame?.id, activeLayerId, currentFrame?.layers, canvasWidth, canvasHeight, brushType, layers]);

  const [, forceUpdate] = useState({});
  const updateTransformStyle = () => {
    if (transformRef.current) {
      const { scale, x, y, rotation } = transform.current;
      transformRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
      
      // Update rendering mode for pixel art when zoomed in
      if (transformRef.current.style.imageRendering !== undefined) {
         transformRef.current.style.imageRendering = scale > 2 ? 'pixelated' : 'auto';
      }
      forceUpdate({});
    }
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    // Advanced coordinate mapping that handles Rotation, Scale, and Translation
    if (!activeCanvasRef.current || !transformRef.current) return { x: 0, y: 0 };

    const { x: tX, y: tY, scale, rotation } = transform.current;
    
    // Get center of viewport/container (assuming full screen or filling parent)
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: 0, y: 0 };
    
    const containerCx = containerRect.left + containerRect.width / 2;
    const containerCy = containerRect.top + containerRect.height / 2;

    // Adjust for pan translation
    const centerX = containerCx + tX;
    const centerY = containerCy + tY;

    // Delta from center
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Rotate backwards to align with axis
    const rad = (-rotation * Math.PI) / 180;
    const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Scale down
    const localX = rotatedX / scale;
    const localY = rotatedY / scale;

    // Offset to canvas origin (top-left)
    const finalX = localX + canvasWidth / 2;
    const finalY = localY + canvasHeight / 2;

    return { x: finalX, y: finalY };
  };

  const getDistance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  const getAngle = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
      return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  };

  const getCenter = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  };

  const commitText = () => {
      if (textInput && textInput.value.trim() !== '') {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
             const fontSize = textInput.fontSize || Math.max(12, strokeWidth);
             const font = textInput.font || textToolFont;
             const colorValue = textInput.color || color;
             // Use selected font family
             ctx.font = `bold ${fontSize}px ${font}`;
             const metrics = ctx.measureText(textInput.value);
             const width = Math.ceil(metrics.width);
             const height = Math.ceil(fontSize * 1.2);
             
             canvas.width = width;
             canvas.height = height;
             
             // Re-set font after resize
             ctx.font = `bold ${fontSize}px ${font}`;
             ctx.fillStyle = colorValue;
             ctx.textBaseline = 'top';
             ctx.fillText(textInput.value, 0, 0);

             onSelectionCreate({
                 x: textInput.x,
                 y: textInput.y - (fontSize * 0.2),
                 width,
                 height,
                 dataUrl: canvas.toDataURL(),
                 rotation: 0,
                 scaleX: 1,
                 scaleY: 1,
                 anchorX: width / 2,
                 anchorY: height / 2,
                 type: 'text',
                 textData: {
                     text: textInput.value,
                     font: font,
                     color: colorValue,
                     fontSize: fontSize
                 }
             });
          }
      }
      setTextInput(null);
  };

  const drawPixelLine = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
      const size = Math.floor(strokeWidth);
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = (x0 < x1) ? 1 : -1;
      const sy = (y0 < y1) ? 1 : -1;
      let err = dx - dy;

      ctx.fillStyle = color;

      let x = x0;
      let y = y0;

      while(true) {
          ctx.fillRect(Math.floor(x - size/2), Math.floor(y - size/2), size, size);

          if ((Math.abs(x - x1) < 1) && (Math.abs(y - y1) < 1)) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; x += sx; }
          if (e2 < dx) { err += dx; y += sy; }
      }
  };

  const setupBrush = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]);
      
      if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 1;
      } else if (tool === 'pen') {
          if (brushType === 'pen') {
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.globalAlpha = 1;
          } else if (brushType === 'marker') {
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.globalAlpha = 0.5;
          } else if (brushType === 'highlighter') {
              ctx.lineWidth = strokeWidth * 2;
              ctx.lineCap = 'square';
              ctx.globalAlpha = 0.3;
          } else if (brushType === 'spray') {
              ctx.globalAlpha = 1;
          } else if (brushType === 'pixel') {
              ctx.globalAlpha = 1;
              ctx.imageSmoothingEnabled = false;
          } else if (brushType === 'watercolor') {
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.globalAlpha = 0.2;
          } else if (brushType === 'oil') {
              ctx.lineWidth = strokeWidth * 1.5;
              ctx.lineCap = 'round';
              ctx.globalAlpha = 0.8;
          } else if (brushType === 'calligraphy') {
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'butt';
              ctx.globalAlpha = 1;
          }
      }
  };

  const pickColor = (x: number, y: number) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw background color/gradient
    if (background.type === 'color' && background.color !== 'transparent') {
      tempCtx.fillStyle = background.color;
      tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (background.type === 'gradient3' && background.gradientColors) {
      const grad = tempCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      background.gradientColors.forEach((c, i) => grad.addColorStop(i / 2, c));
      tempCtx.fillStyle = grad;
      tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw layers and images from the DOM to get the composite view
    if (transformRef.current) {
      const children = Array.from(transformRef.current.children);
      children.forEach(child => {
        if (child instanceof HTMLImageElement && child.offsetParent !== null) {
          try {
            tempCtx.drawImage(child, 0, 0, canvasWidth, canvasHeight);
          } catch (e) {
            console.warn('Could not draw image to eyedropper canvas:', e);
          }
        } else if (child instanceof HTMLCanvasElement && child.offsetParent !== null) {
          try {
            tempCtx.drawImage(child, 0, 0);
          } catch (e) {
            console.warn('Could not draw canvas to eyedropper canvas:', e);
          }
        }
      });
    }

    try {
      const pixel = tempCtx.getImageData(Math.max(0, Math.min(canvasWidth - 1, Math.floor(x))), Math.max(0, Math.min(canvasHeight - 1, Math.floor(y))), 1, 1).data;
      // Only pick if not fully transparent, or if it's the background
      const r = pixel[0].toString(16).padStart(2, '0');
      const g = pixel[1].toString(16).padStart(2, '0');
      const b = pixel[2].toString(16).padStart(2, '0');
      onColorPick(`#${r}${g}${b}`);
    } catch (e) {
      console.error('Eyedropper failed:', e);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPlaying || !currentFrame) return;
    
    // Prevent default browser behavior for touch to ensure multi-touch works correctly in WebViews
    if (e.pointerType === 'touch') {
        // Only prevent default if we're not interacting with UI elements
        const target = e.target as HTMLElement;
        if (target === activeCanvasRef.current || target === containerRef.current) {
            e.preventDefault(); 
        }
    }
    
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (e.button === 2) { 
        isGesture.current = true;
        isDrawing.current = false;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        return;
    }
    
    if (pointers.current.size >= 2) { 
        isGesture.current = true;
        isDrawing.current = false;
        selectionMode.current = null;
        if (textInput) commitText();

        const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
        if (points.length >= 2) {
            initialPinchDistance.current = getDistance(points[0], points[1]);
            initialAngle.current = getAngle(points[0], points[1]);
            startRotation.current = transform.current.rotation;
            lastPanPoint.current = getCenter(points[0], points[1]);
        }
        return;
    }

    isGesture.current = false;
    hasMoved.current = false;
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const activeLayer = layers.find(l => l.id === activeLayerId);

    if (tool === 'eyedropper') {
        pickColor(x, y);
        isDrawing.current = true;
        return;
    }

    if (activeLayer?.isLocked || !activeLayer?.isVisible) {
        isDrawing.current = false;
        return;
    }

    if (tool === 'text') {
        if (textInput) {
            commitText();
            return;
        }
        if (selection) onSelectionCommit();
        setTextInput({ x, y, value: '' });
        isDrawing.current = false;
        return;
    }

    if (tool === 'select' || tool === 'lasso') {
        // Only commit if we are not clicking on the selection
        // Since this handler is on the container, and selection overlay stops propagation,
        // we only get here if we clicked outside the selection box.
        
        // However, if the selection is outside the canvas, clicking on the canvas
        // should probably NOT commit if the user is just trying to navigate.
        // But if they are in 'select' tool, they probably want to start a new selection.
        
        // Let's add a small check: if the click is very close to the selection, don't commit.
        const isClickNearSelection = () => {
            if (!selection) return false;
            const margin = 60;
            // Simple unrotated check for now as a heuristic
            return (
                x >= selection.x - margin &&
                x <= selection.x + selection.width + margin &&
                y >= selection.y - margin &&
                y <= selection.y + selection.height + margin
            );
        };

        if (selection && !isClickNearSelection()) {
            // Only commit if clicking inside the canvas bounds
            const isInsideCanvas = x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight;
            if (isInsideCanvas) {
                onSelectionCommit();
            }
        }
        
        selectionMode.current = 'create';
        dragStart.current = { x, y };
        if (tool === 'lasso') {
            lassoPoints.current = [{ x, y }];
        }
        setIsCreatingSelection(true);
        isDrawing.current = false;
        return;
    }

    if (tool === 'wand') {
        if (selection) onSelectionCommit();
        const ctx = activeCanvasRef.current?.getContext('2d');
        if (ctx) {
            const newSelection = magicWandSelect(ctx, Math.floor(x), Math.floor(y));
            if (newSelection) {
                saveCanvas();
                onSelectionCreate({ ...newSelection, originX: newSelection.x, originY: newSelection.y });
            }
        }
        isDrawing.current = false;
        return;
    }

    const mapToSelection = (px: number, py: number) => {
        if (!selection) return { x: px, y: py };
        const anchorX = selection.anchorX ?? selection.width / 2;
        const anchorY = selection.anchorY ?? selection.height / 2;
        const dx = px - (selection.x + anchorX);
        const dy = py - (selection.y + anchorY);
        const rad = (-selection.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        let sx = dx * cos - dy * sin;
        let sy = dx * sin + dy * cos;
        sx /= selection.scaleX;
        sy /= selection.scaleY;
        sx += anchorX;
        sy += anchorY;
        return { x: sx, y: sy };
    };

    const mappedCoords = mapToSelection(x, y);
    let mx = mappedCoords.x;
    let my = mappedCoords.y;

    let didCommit = false;
    
    const isActuallyDrawingOnSelection = selection && !didCommit && (mx >= 0 && mx <= selection.width && my >= 0 && my <= selection.height) && tool !== 'motionPath';
    isDrawingOnSelectionRef.current = !!isActuallyDrawingOnSelection;
    
    const drawX = isActuallyDrawingOnSelection ? mx : x;
    const drawY = isActuallyDrawingOnSelection ? my : y;

    const ctx = isActuallyDrawingOnSelection ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'motionPath') {
        motionPathPoints.current = [{ x, y }];
        isDrawing.current = true;
        const activeCtx = activeCanvasRef.current?.getContext('2d');
        if (activeCtx) {
            canvasSnapshot.current = activeCtx.getImageData(0, 0, activeCtx.canvas.width, activeCtx.canvas.height);
            setupBrush(activeCtx);
            activeCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Distinct color for motion path
            activeCtx.lineWidth = 2;
            activeCtx.setLineDash([5, 5]);
            activeCtx.beginPath();
            activeCtx.moveTo(x, y);
        }
        return;
    }

    isDrawing.current = true;
    drawStart.current = { x: drawX, y: drawY };
    lastPoint.current = { x: drawX, y: drawY };
    points.current = [{ x: drawX, y: drawY }];

    // Initialize symmetry points
    symmetryLastPoints.current = {};
    symmetryPathPoints.current = {};
    if (symmetryMode !== 'none' && !isActuallyDrawingOnSelection) {
        if (symmetryMode === 'horizontal') {
            symmetryLastPoints.current['h'] = { x: canvasWidth - drawX, y: drawY };
            symmetryPathPoints.current['h'] = [{ x: canvasWidth - drawX, y: drawY }];
        } else if (symmetryMode === 'vertical') {
            symmetryLastPoints.current['v'] = { x: drawX, y: canvasHeight - drawY };
            symmetryPathPoints.current['v'] = [{ x: drawX, y: canvasHeight - drawY }];
        }
    }

    if (tool === 'fill') {
        floodFill(ctx, Math.floor(mx), Math.floor(my), color, fillOpacity, fillTolerance);
        if (!isDrawingOnSelectionRef.current) saveCanvas();
        else {
            // Update selection dataUrl
            const newUrl = selectionCanvasRef.current?.toDataURL();
            if (newUrl) onSelectionUpdate({ ...selection!, dataUrl: newUrl });
        }
        isDrawing.current = false;
        isDrawingOnSelectionRef.current = false;
    } else if (tool === 'shape') {
        canvasSnapshot.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        setupBrush(ctx);
        if (tool === 'eraser' && isDrawingOnSelectionRef.current) {
            ctx.globalCompositeOperation = 'destination-out';
        } else if (isDrawingOnSelectionRef.current) {
            ctx.globalCompositeOperation = 'source-over';
        }
        
        if (brushType === 'pixel' && tool === 'pen') {
        } else if (brushType !== 'spray') {
            ctx.beginPath();
            ctx.moveTo(mx, my);
        }
    }
  };

  const handleSelectionPointerDown = (e: React.PointerEvent) => {
      if (tool !== 'select') {
          return; // Let it bubble up to draw or wand
      }
      e.stopPropagation();
      if (e.button === 2) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      selectionMode.current = 'move';
      dragStart.current = { x, y };
      initialSelection.current = selection ? { ...selection } : null;
      latestSelectionState.current = selection ? { ...selection } : null;
  };

  const handleResizePointerDown = (e: React.PointerEvent, type: 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-l' | 'resize-r') => {
      if (tool !== 'select') return;
      e.stopPropagation();
      if (e.button === 2) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      selectionMode.current = type;
      dragStart.current = { x, y };
      initialSelection.current = selection ? { ...selection } : null;
      latestSelectionState.current = selection ? { ...selection } : null;
  };

  const handleRotatePointerDown = (e: React.PointerEvent) => {
      if (tool !== 'select') return;
      e.stopPropagation();
      if (e.button === 2) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      selectionMode.current = 'rotate';
      initialSelection.current = selection ? { ...selection } : null;
      latestSelectionState.current = selection ? { ...selection } : null;
  };

  const handleAnchorPointerDown = (e: React.PointerEvent) => {
      if (tool !== 'select') return;
      e.stopPropagation();
      if (e.button === 2) return;

      // Double click to reset anchor to center
      if (e.detail === 2 && selection) {
          const newAnchorX = selection.width / 2;
          const newAnchorY = selection.height / 2;
          
          // Adjust x and y to keep the selection visually in the same place
          const theta = (selection.rotation * Math.PI) / 180;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          
          const dA_x = (selection.anchorX ?? selection.width / 2) - newAnchorX;
          const dA_y = (selection.anchorY ?? selection.height / 2) - newAnchorY;
          
          const newX = selection.x + dA_x - selection.scaleX * dA_x * cosT + selection.scaleY * dA_y * sinT;
          const newY = selection.y + dA_y - selection.scaleX * dA_x * sinT - selection.scaleY * dA_y * cosT;

          const newState = {
              ...selection,
              x: newX,
              y: newY,
              anchorX: newAnchorX,
              anchorY: newAnchorY
          };
          
          latestSelectionState.current = newState;
          onSelectionUpdate(newState);
          return;
      }

      containerRef.current?.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      selectionMode.current = 'anchor';
      initialSelection.current = selection ? { ...selection } : null;
      latestSelectionState.current = selection ? { ...selection } : null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPlaying) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (e.pointerType === 'touch' && pointers.current.size >= 2) {
        e.preventDefault();
    }

    // Safety net for multi-touch gestures that might have missed pointerdown or are in buggy WebViews
    if (pointers.current.size >= 2 && !isGesture.current) {
        isGesture.current = true;
        isDrawing.current = false;
        const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
        initialPinchDistance.current = getDistance(points[0], points[1]);
        initialAngle.current = getAngle(points[0], points[1]);
        startRotation.current = transform.current.rotation;
        lastPanPoint.current = getCenter(points[0], points[1]);
        
        // If we were drawing, we should probably clear the current path to avoid a "dot" or "line" from the start of the pinch
        const ctx = isDrawingOnSelectionRef.current ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
        if (ctx && !hasMoved.current) {
            // Re-render the frame to clear any accidental marks
            forceUpdate({});
        }
    }

    if (isGesture.current) {
        if (e.pointerType === 'mouse' && e.buttons === 2) {
            if (lastPanPoint.current) {
                const dx = e.clientX - lastPanPoint.current.x;
                const dy = e.clientY - lastPanPoint.current.y;
                transform.current.x += dx;
                transform.current.y += dy;
                updateTransformStyle();
                lastPanPoint.current = { x: e.clientX, y: e.clientY };
            }
            return;
        } else if (pointers.current.size >= 2) {
            const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
            const newDistance = getDistance(points[0], points[1]);
            const newCenter = getCenter(points[0], points[1]);
            const newAngle = getAngle(points[0], points[1]);

            if (initialPinchDistance.current && lastPanPoint.current && initialAngle.current !== null) {
                const zoomFactor = newDistance / initialPinchDistance.current;
                const newScale = Math.min(Math.max(transform.current.scale * zoomFactor, 0.1), 10);
                
                const dx = newCenter.x - lastPanPoint.current.x;
                const dy = newCenter.y - lastPanPoint.current.y;

                // Rotation calculation
                const angleDelta = newAngle - initialAngle.current;
                
                transform.current.scale = newScale;
                transform.current.x += dx;
                transform.current.y += dy;
                transform.current.rotation = startRotation.current + angleDelta;
                
                updateTransformStyle();
                
                initialPinchDistance.current = newDistance;
                // We keep initialAngle constant to avoid drift/jitter, but update center
                lastPanPoint.current = newCenter;
            }
            return;
        }
        return;
    }

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (drawStart.current) {
        const dist = getDistance(drawStart.current, { x, y });
        if (dist > 2) hasMoved.current = true;
    }

    if ((tool === 'select' || tool === 'lasso' || tool === 'wand') && selectionMode.current) {
        const init = initialSelection.current;
        if (selectionMode.current === 'create' && dragStart.current) {
            if (tool === 'select' && marqueeRef.current) {
                const startX = dragStart.current.x;
                const startY = dragStart.current.y;
                const width = Math.abs(x - startX);
                const height = Math.abs(y - startY);
                const left = Math.min(x, startX);
                const top = Math.min(y, startY);
                const s = marqueeRef.current.style;
                s.left = `${left}px`;
                s.top = `${top}px`;
                s.width = `${width}px`;
                s.height = `${height}px`;
            } else if (tool === 'lasso') {
                lassoPoints.current = [...lassoPoints.current, { x, y }];
                forceUpdate({});
            }
        } else if (selectionMode.current === 'rotate' && init) {
            const anchorX = init.x + (init.anchorX ?? init.width / 2);
            const anchorY = init.y + (init.anchorY ?? init.height / 2);
            // Calculate angle from anchor to pointer
            const angle = Math.atan2(y - anchorY, x - anchorX) * (180 / Math.PI);
            // Since the handle is at the top, add 90 degrees to align
            const newRotation = (angle + 90) % 360;
            
            if (selectionOverlayRef.current) {
                selectionOverlayRef.current.style.transform = `rotate(${newRotation}deg) scale(${init.scaleX}, ${init.scaleY})`;
                selectionOverlayRef.current.style.transformOrigin = `${init.anchorX ?? init.width / 2}px ${init.anchorY ?? init.height / 2}px`;
            }
            latestSelectionState.current = { ...init, rotation: newRotation };
        } else if (selectionMode.current === 'anchor' && init) {
            const currentAnchorX = init.anchorX ?? init.width / 2;
            const currentAnchorY = init.anchorY ?? init.height / 2;
            
            // Center of rotation in canvas space is the current anchor position (init.x, init.y)
            const cx = init.x;
            const cy = init.y;
            
            // Vector from center to pointer
            const dx = x - cx;
            const dy = y - cy;
            
            // Rotate back to local space
            const rad = (init.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const localDX = (dx * cos + dy * sin) / init.scaleX;
            const localDY = (-dx * sin + dy * cos) / init.scaleY;
            
            // New anchor position in local space
            const localX = currentAnchorX + localDX;
            const localY = currentAnchorY + localDY;
            
            let newAnchorX = localX;
            let newAnchorY = localY;

            // Snapping to center and corners
            const snapThreshold = 10;
            const targets = [
                { x: 0, y: 0 }, { x: init.width / 2, y: 0 }, { x: init.width, y: 0 },
                { x: 0, y: init.height / 2 }, { x: init.width / 2, y: init.height / 2 }, { x: init.width, y: init.height / 2 },
                { x: 0, y: init.height }, { x: init.width / 2, y: init.height }, { x: init.width, y: init.height }
            ];

            for (const target of targets) {
                if (Math.abs(localX - target.x) < snapThreshold && Math.abs(localY - target.y) < snapThreshold) {
                    newAnchorX = target.x;
                    newAnchorY = target.y;
                    break;
                }
            }
            
            // Adjust x and y to keep the selection visually in the same place
            const theta = (init.rotation * Math.PI) / 180;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            
            const dA_x = (init.anchorX ?? init.width / 2) - newAnchorX;
            const dA_y = (init.anchorY ?? init.height / 2) - newAnchorY;
            
            const newX = init.x + dA_x - init.scaleX * dA_x * cosT + init.scaleY * dA_y * sinT;
            const newY = init.y + dA_y - init.scaleX * dA_x * sinT - init.scaleY * dA_y * cosT;
            
            if (selectionOverlayRef.current) {
                selectionOverlayRef.current.style.left = `${newX}px`;
                selectionOverlayRef.current.style.top = `${newY}px`;
                selectionOverlayRef.current.style.transformOrigin = `${newAnchorX}px ${newAnchorY}px`;
            }
            
            if (anchorPointRef.current) {
                anchorPointRef.current.style.left = `${newAnchorX}px`;
                anchorPointRef.current.style.top = `${newAnchorY}px`;
            }
            
            latestSelectionState.current = { 
                ...init, 
                x: newX, 
                y: newY, 
                anchorX: newAnchorX, 
                anchorY: newAnchorY 
            };
        } else if (dragStart.current && init) {
            const dx = x - dragStart.current.x;
            const dy = y - dragStart.current.y;
            let newW = init.width, newH = init.height, newX = init.x, newY = init.y;

            if (selectionMode.current === 'move') {
                newX = init.x + dx;
                newY = init.y + dy;
            } else if (selectionMode.current.startsWith('resize')) {
                 const rad = (-init.rotation * Math.PI) / 180;
                 const cos = Math.cos(rad);
                 const sin = Math.sin(rad);
                 let ldx = (dx * cos - dy * sin);
                 let ldy = (dx * sin + dy * cos);

                 ldx /= init.scaleX;
                 ldy /= init.scaleY;

                 let handle = selectionMode.current;
                 if (init.scaleX < 0) {
                    if (handle === 'resize-tl') handle = 'resize-tr';
                    else if (handle === 'resize-tr') handle = 'resize-tl';
                    else if (handle === 'resize-bl') handle = 'resize-br';
                    else if (handle === 'resize-br') handle = 'resize-bl';
                    else if (handle === 'resize-l') handle = 'resize-r';
                    else if (handle === 'resize-r') handle = 'resize-l';
                 }
                 if (init.scaleY < 0) {
                    if (handle === 'resize-tl') handle = 'resize-bl';
                    else if (handle === 'resize-tr') handle = 'resize-br';
                    else if (handle === 'resize-bl') handle = 'resize-tl';
                    else if (handle === 'resize-br') handle = 'resize-tr';
                 }

                 let deltaLeft = 0, deltaRight = 0, deltaTop = 0, deltaBottom = 0;

                 if (handle === 'resize-br') { deltaRight = ldx; deltaBottom = ldy; }
                 else if (handle === 'resize-bl') { deltaLeft = ldx; deltaBottom = ldy; }
                 else if (handle === 'resize-tr') { deltaRight = ldx; deltaTop = ldy; }
                 else if (handle === 'resize-tl') { deltaLeft = ldx; deltaTop = ldy; }
                 else if (handle === 'resize-l') { deltaLeft = ldx; }
                 else if (handle === 'resize-r') { deltaRight = ldx; }

                 newW = init.width - deltaLeft + deltaRight;
                 newH = init.height - deltaTop + deltaBottom;

                 if (newW < 5) {
                     if (handle.includes('l')) { deltaLeft = init.width - 5 + deltaRight; }
                     else { deltaRight = 5 - init.width + deltaLeft; }
                     newW = 5;
                 }
                 if (newH < 5) {
                     if (handle.includes('t')) { deltaTop = init.height - 5 + deltaBottom; }
                     else { deltaBottom = 5 - init.height + deltaTop; }
                     newH = 5;
                 }

                 const dcx = (deltaLeft + deltaRight) / 2;
                 const dcy = (deltaTop + deltaBottom) / 2;

                 const scaledDcx = dcx * init.scaleX;
                 const scaledDcy = dcy * init.scaleY;

                 const radPos = (init.rotation * Math.PI) / 180;
                 const cosPos = Math.cos(radPos);
                 const sinPos = Math.sin(radPos);

                 const gdcx = scaledDcx * cosPos - scaledDcy * sinPos;
                 const gdcy = scaledDcx * sinPos + scaledDcy * cosPos;

                 const oldCenterX = init.x + init.width / 2;
                 const oldCenterY = init.y + init.height / 2;

                 const newCenterX = oldCenterX + gdcx;
                 const newCenterY = oldCenterY + gdcy;

                 newX = newCenterX - newW / 2;
                 newY = newCenterY - newH / 2;
            }

            const newAnchorX = ((init.anchorX ?? init.width / 2) / init.width) * newW;
            const newAnchorY = ((init.anchorY ?? init.height / 2) / init.height) * newH;

            if (selectionOverlayRef.current) {
                const s = selectionOverlayRef.current.style;
                s.left = `${newX}px`;
                s.top = `${newY}px`;
                s.width = `${newW}px`;
                s.height = `${newH}px`;
                s.transformOrigin = `${newAnchorX}px ${newAnchorY}px`;
            }
            
            latestSelectionState.current = { 
                ...init, 
                x: newX, 
                y: newY, 
                width: newW, 
                height: newH,
                anchorX: newAnchorX,
                anchorY: newAnchorY
            };
        }
    }
    
    if (isDrawing.current) {
        if (tool === 'eyedropper') {
            pickColor(x, y);
            return;
        }

        const mapToSelection = (px: number, py: number) => {
            if (!selection) return { x: px, y: py };
            const anchorX = selection.anchorX ?? selection.width / 2;
            const anchorY = selection.anchorY ?? selection.height / 2;
            const dx = px - (selection.x + anchorX);
            const dy = py - (selection.y + anchorY);
            const rad = (-selection.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            let sx = dx * cos - dy * sin;
            let sy = dx * sin + dy * cos;
            sx /= selection.scaleX;
            sy /= selection.scaleY;
            sx += anchorX;
            sy += anchorY;
            return { x: sx, y: sy };
        };

        const mappedCoords = mapToSelection(x, y);
        const mx = mappedCoords.x;
        const my = mappedCoords.y;

        const drawX = isDrawingOnSelectionRef.current ? mx : x;
        const drawY = isDrawingOnSelectionRef.current ? my : y;

        const ctx = isDrawingOnSelectionRef.current ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        if (tool === 'shape' && drawStart.current && canvasSnapshot.current) {
            ctx.putImageData(canvasSnapshot.current, 0, 0);
            const startX = drawStart.current.x;
            const startY = drawStart.current.y;
            const w = drawX - startX;
            const h = drawY - startY;

            ctx.beginPath();
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = color;
            ctx.setLineDash([]);
            if (selection) {
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            if (shapeType === 'rectangle') ctx.rect(startX, startY, w, h);
            else if (shapeType === 'circle') {
                const cx = startX + w / 2;
                const cy = startY + h / 2;
                ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
            } else if (shapeType === 'line') {
                ctx.moveTo(startX, startY);
                ctx.lineTo(drawX, drawY);
            }
 else if (shapeType === 'triangle') {
                ctx.moveTo(startX + w / 2, startY);
                ctx.lineTo(startX + w, startY + h);
                ctx.lineTo(startX, startY + h);
                ctx.closePath();
            } else if (shapeType === 'star') {
                const cx = startX + w / 2;
                const cy = startY + h / 2;
                const outerRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
                const innerRadius = outerRadius / 2;
                const spikes = 5;
                let rot = Math.PI / 2 * 3;
                let x = cx;
                let y = cy;
                const step = Math.PI / spikes;
                ctx.moveTo(cx, cy - outerRadius);
                for (let i = 0; i < spikes; i++) {
                    x = cx + Math.cos(rot) * outerRadius;
                    y = cy + Math.sin(rot) * outerRadius;
                    ctx.lineTo(x, y);
                    rot += step;
                    x = cx + Math.cos(rot) * innerRadius;
                    y = cy + Math.sin(rot) * innerRadius;
                    ctx.lineTo(x, y);
                    rot += step;
                }
                ctx.lineTo(cx, cy - outerRadius);
                ctx.closePath();
            } else if (shapeType === 'hexagon') {
                const cx = startX + w / 2;
                const cy = startY + h / 2;
                const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = cx + radius * Math.cos(angle);
                    const y = cy + radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
            } else if (shapeType === 'heart') {
                const cx = startX + w / 2;
                const cy = startY + h / 2;
                const width = Math.abs(w);
                const height = Math.abs(h);
                const topCurveHeight = height * 0.3;
                ctx.moveTo(cx, cy + height / 2);
                ctx.bezierCurveTo(
                    cx - width / 2, cy + height / 2 - topCurveHeight,
                    cx - width / 2, cy - height / 2,
                    cx, cy - height / 2 + topCurveHeight
                );
                ctx.bezierCurveTo(
                    cx + width / 2, cy - height / 2,
                    cx + width / 2, cy + height / 2 - topCurveHeight,
                    cx, cy + height / 2
                );
                ctx.closePath();
            } else if (shapeType === 'arrow') {
                const headlen = Math.min(Math.abs(w), Math.abs(h)) * 0.3;
                const angle = Math.atan2(h, w);
                ctx.moveTo(startX, startY);
                ctx.lineTo(drawX, drawY);
                ctx.lineTo(drawX - headlen * Math.cos(angle - Math.PI / 6), drawY - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(drawX, drawY);
                ctx.lineTo(drawX - headlen * Math.cos(angle + Math.PI / 6), drawY - headlen * Math.sin(angle + Math.PI / 6));
            } else if (shapeType === 'speech-bubble') {
                const minX = Math.min(startX, drawX);
                const minY = Math.min(startY, drawY);
                const absW = Math.abs(w);
                const absH = Math.abs(h);
                const radius = Math.min(absW, absH) * 0.2;
                const tailWidth = radius;
                const tailHeight = radius * 1.5;
                const tailX = minX + absW * 0.2;
                
                ctx.moveTo(minX + radius, minY);
                ctx.lineTo(minX + absW - radius, minY);
                ctx.quadraticCurveTo(minX + absW, minY, minX + absW, minY + radius);
                ctx.lineTo(minX + absW, minY + absH - radius - tailHeight);
                ctx.quadraticCurveTo(minX + absW, minY + absH - tailHeight, minX + absW - radius, minY + absH - tailHeight);
                
                ctx.lineTo(tailX + tailWidth, minY + absH - tailHeight);
                ctx.lineTo(tailX, minY + absH);
                ctx.lineTo(tailX, minY + absH - tailHeight);
                
                ctx.lineTo(minX + radius, minY + absH - tailHeight);
                ctx.quadraticCurveTo(minX, minY + absH - tailHeight, minX, minY + absH - radius - tailHeight);
                ctx.lineTo(minX, minY + radius);
                ctx.quadraticCurveTo(minX, minY, minX + radius, minY);
                ctx.closePath();
            }
            ctx.stroke();
        } else if (tool === 'pen' && brushType === 'pixel') {
             if (lastPoint.current) {
                 drawPixelLine(ctx, lastPoint.current.x, lastPoint.current.y, drawX, drawY);
                 
                 if (symmetryMode !== 'none' && !isDrawingOnSelectionRef.current) {
                     if (symmetryMode === 'horizontal') {
                         drawPixelLine(ctx, canvasWidth - lastPoint.current.x, lastPoint.current.y, canvasWidth - drawX, drawY);
                     } else if (symmetryMode === 'vertical') {
                         drawPixelLine(ctx, lastPoint.current.x, canvasHeight - lastPoint.current.y, drawX, canvasHeight - drawY);
                     }
                 }
                 
                 lastPoint.current = { x: drawX, y: drawY };
             }
        } else if (tool === 'pen' && brushType === 'spray') {
             const density = Math.max(1, strokeWidth * 2);
             for (let i = 0; i < density; i++) {
                 const offsetX = (Math.random() - 0.5) * strokeWidth * 2;
                 const offsetY = (Math.random() - 0.5) * strokeWidth * 2;
                 if (offsetX * offsetX + offsetY * offsetY <= strokeWidth * strokeWidth) {
                     ctx.fillRect(drawX + offsetX, drawY + offsetY, 1, 1);
                     
                     if (symmetryMode !== 'none' && !isDrawingOnSelectionRef.current) {
                         if (symmetryMode === 'horizontal') {
                             ctx.fillRect(canvasWidth - (drawX + offsetX), drawY + offsetY, 1, 1);
                         } else if (symmetryMode === 'vertical') {
                             ctx.fillRect(drawX + offsetX, canvasHeight - (drawY + offsetY), 1, 1);
                         }
                     }
                 }
             }
        } else if (tool === 'motionPath') {
            motionPathPoints.current.push({ x, y });
            const activeCtx = activeCanvasRef.current?.getContext('2d');
            if (activeCtx) {
                activeCtx.lineTo(x, y);
                activeCtx.stroke();
            }
        } else if (tool === 'pen' || tool === 'eraser') {
            if (smoothing > 0 && tool === 'pen') {
                points.current.push({ x: drawX, y: drawY });
                if (points.current.length === 2) {
                    ctx.lineTo(drawX, drawY);
                } else if (points.current.length > 2) {
                    const lastPoint = points.current[points.current.length - 2];
                    const midPoint = {
                        x: (lastPoint.x + drawX) / 2,
                        y: (lastPoint.y + drawY) / 2
                    };
                    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
                }
            } else {
                ctx.lineTo(drawX, drawY);
            }

            if (symmetryMode !== 'none' && !isDrawingOnSelectionRef.current) {
                if (symmetryMode === 'horizontal') {
                    const symX = canvasWidth - drawX;
                    const symY = drawY;
                    symmetryPathPoints.current['h']?.push({ x: symX, y: symY });
                    
                    if (symmetryLastPoints.current['h']) {
                        ctx.moveTo(symmetryLastPoints.current['h'].x, symmetryLastPoints.current['h'].y);
                        if (smoothing > 0 && tool === 'pen' && symmetryPathPoints.current['h']!.length > 2) {
                            const lastSymPoint = symmetryPathPoints.current['h']![symmetryPathPoints.current['h']!.length - 2];
                            const midSymPoint = {
                                x: (lastSymPoint.x + symX) / 2,
                                y: (lastSymPoint.y + symY) / 2
                            };
                            ctx.quadraticCurveTo(lastSymPoint.x, lastSymPoint.y, midSymPoint.x, midSymPoint.y);
                        } else {
                            ctx.lineTo(symX, symY);
                        }
                    }
                    symmetryLastPoints.current['h'] = { x: symX, y: symY };
                } else if (symmetryMode === 'vertical') {
                    const symX = drawX;
                    const symY = canvasHeight - drawY;
                    symmetryPathPoints.current['v']?.push({ x: symX, y: symY });
                    
                    if (symmetryLastPoints.current['v']) {
                        ctx.moveTo(symmetryLastPoints.current['v'].x, symmetryLastPoints.current['v'].y);
                        if (smoothing > 0 && tool === 'pen' && symmetryPathPoints.current['v']!.length > 2) {
                            const lastSymPoint = symmetryPathPoints.current['v']![symmetryPathPoints.current['v']!.length - 2];
                            const midSymPoint = {
                                x: (lastSymPoint.x + symX) / 2,
                                y: (lastSymPoint.y + symY) / 2
                            };
                            ctx.quadraticCurveTo(lastSymPoint.x, lastSymPoint.y, midSymPoint.x, midSymPoint.y);
                        } else {
                            ctx.lineTo(symX, symY);
                        }
                    }
                    symmetryLastPoints.current['v'] = { x: symX, y: symY };
                }
                
                // Move back to main path
                if (smoothing > 0 && tool === 'pen' && points.current.length > 2) {
                    const lastPoint = points.current[points.current.length - 2];
                    const midPoint = {
                        x: (lastPoint.x + drawX) / 2,
                        y: (lastPoint.y + drawY) / 2
                    };
                    ctx.moveTo(midPoint.x, midPoint.y);
                } else {
                    ctx.moveTo(drawX, drawY);
                }
            }
            
            ctx.stroke();
        }

        if (isDrawingOnSelectionRef.current && maskImageRef.current) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskImageRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (e.button === 2) {
        isGesture.current = false;
        lastPanPoint.current = null;
    } else if (pointers.current.size < 2) {
        isGesture.current = false;
        initialPinchDistance.current = null;
        lastPanPoint.current = null;
    }

    if (tool === 'select' || tool === 'lasso' || tool === 'wand') {
        if (tool === 'select' && selectionMode.current === 'create' && dragStart.current) {
            const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
            const startX = dragStart.current.x;
            const startY = dragStart.current.y;
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            const left = Math.min(x, startX);
            const top = Math.min(y, startY);

            if (width > 5 && height > 5) {
                const ctx = activeCanvasRef.current?.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(left, top, width, height);
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx?.putImageData(imageData, 0, 0);
                    ctx.clearRect(left, top, width, height);
                    saveCanvas(); 
                    onSelectionCreate({ 
                        x: left, 
                        y: top, 
                        width, 
                        height, 
                        dataUrl: tempCanvas.toDataURL(), 
                        rotation: 0, 
                        scaleX: 1, 
                        scaleY: 1, 
                        anchorX: width / 2, 
                        anchorY: height / 2, 
                        selectionType: 'rectangle',
                        originX: left,
                        originY: top
                    });
                }
            }
            setIsCreatingSelection(false);
        } else if (tool === 'lasso' && selectionMode.current === 'create') {
            if (lassoPoints.current.length > 2) {
                const ctx = activeCanvasRef.current?.getContext('2d');
                if (ctx) {
                    const newSelection = lassoSelect(ctx, lassoPoints.current);
                    if (newSelection) {
                        saveCanvas();
                        onSelectionCreate({ ...newSelection, originX: newSelection.x, originY: newSelection.y });
                    }
                }
            }
            setIsCreatingSelection(false);
            lassoPoints.current = [];
        } else if (selectionMode.current && latestSelectionState.current) {
            onSelectionUpdate(latestSelectionState.current);
        }
    }

    selectionMode.current = null;
    dragStart.current = null;
    initialSelection.current = null;

    if (isDrawing.current) {
        const ctx = isDrawingOnSelectionRef.current ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
        if (ctx) {
            if ((tool === 'pen' && brushType !== 'spray' && brushType !== 'pixel') || tool === 'eraser') {
                if (!hasMoved.current && drawStart.current) {
                    ctx.lineTo(drawStart.current.x, drawStart.current.y);
                    
                    if (symmetryMode !== 'none' && !isDrawingOnSelectionRef.current) {
                        if (symmetryMode === 'horizontal') {
                            const symX = canvasWidth - drawStart.current.x;
                            const symY = drawStart.current.y;
                            ctx.moveTo(symX, symY);
                            ctx.lineTo(symX, symY);
                        } else if (symmetryMode === 'vertical') {
                            const symX = drawStart.current.x;
                            const symY = canvasHeight - drawStart.current.y;
                            ctx.moveTo(symX, symY);
                            ctx.lineTo(symX, symY);
                        }
                    }
                    
                    ctx.stroke();
                }
                ctx.closePath();
                ctx.globalCompositeOperation = 'source-over';
                
                if (!isDrawingOnSelectionRef.current) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection!, dataUrl: newUrl });
                }
            } else if (brushType === 'pixel') {
                if (!hasMoved.current && drawStart.current) {
                    setupBrush(ctx);
                    const size = Math.floor(strokeWidth);
                    ctx.fillStyle = color;
                    ctx.fillRect(Math.floor(drawStart.current.x - size/2), Math.floor(drawStart.current.y - size/2), size, size);
                    
                    if (symmetryMode !== 'none' && !isDrawingOnSelectionRef.current) {
                        if (symmetryMode === 'horizontal') {
                            const symX = canvasWidth - drawStart.current.x;
                            const symY = drawStart.current.y;
                            ctx.fillRect(Math.floor(symX - size/2), Math.floor(symY - size/2), size, size);
                        } else if (symmetryMode === 'vertical') {
                            const symX = drawStart.current.x;
                            const symY = canvasHeight - drawStart.current.y;
                            ctx.fillRect(Math.floor(symX - size/2), Math.floor(symY - size/2), size, size);
                        }
                    }
                }
                if (!isDrawingOnSelectionRef.current) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection!, dataUrl: newUrl });
                }
            } else if (brushType === 'spray') {
                 if (!isDrawingOnSelectionRef.current) saveCanvas();
                 else {
                     const newUrl = selectionCanvasRef.current?.toDataURL();
                     if (newUrl) onSelectionUpdate({ ...selection!, dataUrl: newUrl });
                 }
            } else if (tool === 'shape') {
                ctx.closePath();
                if (!isDrawingOnSelectionRef.current) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection!, dataUrl: newUrl });
                }
            } else if (tool === 'motionPath') {
                ctx.closePath();
                if (canvasSnapshot.current) {
                    ctx.putImageData(canvasSnapshot.current, 0, 0);
                }
                if (motionPathPoints.current.length > 5) {
                    onApplyMotionPath(motionPathPoints.current);
                }
                motionPathPoints.current = [];
            }
        }
        isDrawing.current = false;
        isDrawingOnSelectionRef.current = false;
        drawStart.current = null;
        lastPoint.current = null;
        canvasSnapshot.current = null;
    }
  };

  const saveCanvas = () => {
    if (!activeCanvasRef.current) return;
    const dataUrl = activeCanvasRef.current.toDataURL('image/png');
    onUpdateLayer(activeLayerId, dataUrl);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Standard panning with wheel, zoom is handled by multi-touch/pinch in onPointerMove
    transform.current.x -= e.deltaX;
    transform.current.y -= e.deltaY;
    updateTransformStyle();
  };

  if (!currentFrame) return null;

  const handleSelectionDoubleClick = () => {
      const s = latestSelectionState.current;
      if (s && s.type === 'text' && s.textData) {
          setTextInput({
              x: s.x,
              y: s.y,
              value: s.textData.text,
              font: s.textData.font,
              color: s.textData.color,
              fontSize: s.textData.fontSize
          });
          onSelectionDelete();
      }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-[#2a2a2a] overflow-visible touch-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
        <div 
            ref={transformRef}
            className={`relative origin-center transition-shadow duration-300 overflow-visible ${cameraMode ? '' : 'shadow-2xl border border-white/20'}`}
            style={{ 
                transform: `translate(${transform.current.x}px, ${transform.current.y}px) rotate(${transform.current.rotation}deg) scale(${transform.current.scale})`,
                width: canvasWidth, 
                height: canvasHeight,
                imageRendering: 'auto',
                background: (currentFrame.background || background).type === 'gradient3' ? ((currentFrame.background || background).gradientColors ? `linear-gradient(to bottom right, ${(currentFrame.background || background).gradientColors!.join(', ')})` : '#ffffff') : ((currentFrame.background || background).color === 'transparent' ? 'transparent' : (currentFrame.background || background).color)
            }}
        >
            {cameraMode && (
                <div className="absolute inset-0 pointer-events-none z-[150] shadow-[0_0_0_10000px_rgba(0,0,0,0.7)]" />
            )}
            {cameraMode && (
                <div className="absolute inset-0 pointer-events-none z-[160] border-2 border-[var(--accent-color)]" />
            )}
            {(currentFrame.backgroundImage !== undefined ? currentFrame.backgroundImage : backgroundImage) && (
                <img src={(currentFrame.backgroundImage !== undefined ? currentFrame.backgroundImage : backgroundImage)!} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none" />
            )}
            
            {showGrid && !isPlaying && (
                <div 
                    className="absolute inset-0 pointer-events-none z-[90] opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
            )}

            {onionSkin && !isPlaying && beforeFrames.map((f, i) => f.thumbnailUrl && (
                <div 
                    key={`before-${f.id}-${i}`}
                    className="absolute inset-0 pointer-events-none z-0" 
                    style={{ 
                        opacity: onionSkinSettings.beforeOpacity / (i + 1),
                        filter: `url(#onion-before)`
                    }}
                >
                    <img src={f.thumbnailUrl} alt="" className="w-full h-full" />
                </div>
            ))}
            
            {onionSkin && !isPlaying && afterFrames.map((f, i) => f.thumbnailUrl && (
                <div 
                    key={`after-${f.id}-${i}`}
                    className="absolute inset-0 pointer-events-none z-0" 
                    style={{ 
                        opacity: onionSkinSettings.afterOpacity / (i + 1),
                        filter: `url(#onion-after)`
                    }}
                >
                     <img src={f.thumbnailUrl} alt="" className="w-full h-full" />
                </div>
            ))}

            {/* SVG Filters for Onion Skinning */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <filter id="onion-before">
                        <feFlood floodColor={onionSkinSettings.beforeColor} result="flood" />
                        <feComposite in="flood" in2="SourceAlpha" operator="in" />
                    </filter>
                    <filter id="onion-after">
                        <feFlood floodColor={onionSkinSettings.afterColor} result="flood" />
                        <feComposite in="flood" in2="SourceAlpha" operator="in" />
                    </filter>
                </defs>
            </svg>

            {layers.map((layer, index) => {
                if (!layer.isVisible) return null;
                
                if (layer.id === activeLayerId) {
                    return (
                        <canvas
                            key={layer.id}
                            ref={activeCanvasRef}
                            width={canvasWidth}
                            height={canvasHeight}
                            className="absolute inset-0 w-full h-full"
                            style={{ 
                                zIndex: index + 10,
                                cursor: isGesture.current ? 'grabbing' : (tool === 'select' || tool === 'text' ? 'text' : tool === 'wand' ? 'crosshair' : 'crosshair'),
                                opacity: layer.opacity,
                                mixBlendMode: getMixBlendMode(layer.blendMode)
                            }}
                        />
                    );
                }

                const layerData = currentFrame.layers?.[layer.id];
                if (!layerData) return null;
                return (
                    <img 
                        key={layer.id} 
                        src={layerData} 
                        alt="" 
                        className="absolute inset-0 w-full h-full pointer-events-none" 
                        style={{
                            zIndex: index + 10,
                            opacity: layer.opacity,
                            mixBlendMode: getMixBlendMode(layer.blendMode)
                        }}
                    />
                );
            })}

            {selection && (
                <div 
                    ref={selectionOverlayRef}
                    className="absolute z-[200] select-none overflow-visible pointer-events-auto group" 
                    onPointerDown={handleSelectionPointerDown}
                    onDoubleClick={handleSelectionDoubleClick}
                    style={{
                        left: selection.x,
                        top: selection.y,
                        width: selection.width,
                        height: selection.height,
                        transform: `rotate(${selection.rotation}deg) scale(${selection.scaleX}, ${selection.scaleY})`,
                        transformOrigin: `${selection.anchorX ?? selection.width / 2}px ${selection.anchorY ?? selection.height / 2}px`,
                        cursor: 'move'
                    }}
                >
                    <canvas 
                        ref={selectionCanvasRef} 
                        width={selection.width} 
                        height={selection.height} 
                        className="w-full h-full select-none pointer-events-none" 
                    />
                    
                    {/* Interactive Selection UI */}
                    <div className="absolute inset-0 border-4 border-[#007AFF] pointer-events-none shadow-[0_0_15px_rgba(0,122,255,0.3)]"></div>

                    {/* Commit/Delete Buttons */}
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onSelectionCommit(); }}
                            className="bg-[#007AFF] text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 hover:brightness-110 whitespace-nowrap"
                        >
                            <Icons.Check size={16} /> Commit
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onSelectionDelete(); }}
                            className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 hover:brightness-110 whitespace-nowrap"
                        >
                            <Icons.Trash2 size={16} /> Delete
                        </motion.button>
                    </div>
                    
                    {/* Bigger Corner Handles */}
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tl')} className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-tl', selection.rotation, selection.scaleX, selection.scaleY) }} />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tr')} className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-tr', selection.rotation, selection.scaleX, selection.scaleY) }} />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-bl')} className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-bl', selection.rotation, selection.scaleX, selection.scaleY) }} />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-br')} className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-br', selection.rotation, selection.scaleX, selection.scaleY) }} />

                    {/* Middle Edge Handles */}
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-l')} className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-l', selection.rotation, selection.scaleX, selection.scaleY) }} />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-r')} className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg z-40 pointer-events-auto" style={{ cursor: getResizeCursor('resize-r', selection.rotation, selection.scaleX, selection.scaleY) }} />

                    {/* Interactive Rotation Handle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ transform: 'translateY(-100%)' }}>
                        <div className="w-0.5 h-10 bg-[#007AFF]"></div>
                        <motion.div 
                            onPointerDown={handleRotatePointerDown}
                            whileHover={{ scale: 1.1, backgroundColor: "#f0f7ff" }}
                            whileTap={{ scale: 0.95 }}
                            className="w-8 h-8 rounded-full bg-white border-2 border-[#007AFF] flex items-center justify-center text-[#007AFF] shadow-xl cursor-grab active:cursor-grabbing pointer-events-auto transition-colors"
                        >
                            <Icons.RotateCw size={20} />
                        </motion.div>
                    </div>

                    {/* Anchor Point */}
                    <motion.div 
                        ref={anchorPointRef}
                        onPointerDown={handleAnchorPointerDown}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.2, boxShadow: "0 0 15px rgba(255, 59, 48, 0.4)" }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#FF3B30] flex items-center justify-center text-[#FF3B30] shadow-xl z-50 pointer-events-auto cursor-crosshair transition-colors hover:bg-red-50"
                        style={{
                            left: selection.anchorX ?? selection.width / 2,
                            top: selection.anchorY ?? selection.height / 2,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ 
                                duration: 2, 
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" 
                        />
                    </motion.div>
                </div>
            )}
            
            {tool === 'select' && isCreatingSelection && (
                 <div ref={marqueeRef} className="absolute border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none z-[200]" />
            )}

            {tool === 'lasso' && isCreatingSelection && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[200] overflow-visible">
                    <polyline
                        points={lassoPoints.current.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(255, 59, 48, 0.2)"
                        stroke="#FF3B30"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                    />
                </svg>
            )}

            {textInput && (
                <input
                    ref={textInputRef}
                    type="text"
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onKeyDown={(e) => { if(e.key === 'Enter') commitText(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute z-[200] bg-transparent border-none outline-none p-0 m-0"
                    style={{ 
                        left: textInput.x, 
                        top: textInput.y, 
                        color: color, 
                        fontSize: `${Math.max(12, strokeWidth)}px`, 
                        fontFamily: textToolFont,
                        fontWeight: 'bold', 
                        minWidth: '20px' 
                    }}
                    placeholder="Type..."
                    autoFocus
                />
            )}
        </div>
        
        <div className="absolute top-4 left-4 flex items-center gap-2 z-[120]">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleCameraMode}
                className={`p-2 rounded-lg backdrop-blur-md border transition-all flex items-center gap-2 ${cameraMode ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]' : 'bg-black/50 border-white/10 text-white hover:bg-black/70'}`}
                title={cameraMode ? "Exit Camera View" : "Enter Camera View (Show Canvas Boundaries)"}
            >
                <Icons.Camera size={18} />
                <span className="text-xs font-medium hidden sm:inline">{cameraMode ? "Camera ON" : "Camera OFF"}</span>
            </motion.button>
            
            <div className="bg-black/50 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-md border border-white/10 pointer-events-none flex gap-3">
                <span className="flex items-center gap-1 opacity-70"><Icons.Maximize2 size={12} /> {Math.round(transform.current.scale * 100)}%</span>
                <span className="flex items-center gap-1 opacity-70"><Icons.RotateCw size={12} /> {Math.round(transform.current.rotation)}°</span>
            </div>
        </div>

        {/* Pan Sliders */}
        {deviceType !== 'mobile' && (
          <>
            <div 
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 flex items-center gap-2 bg-black/30 backdrop-blur-sm p-2 rounded-full z-[120]"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">X</span>
                <input 
                    type="range" 
                    min="-2000" 
                    max="2000" 
                    step="1"
                    value={transform.current.x}
                    onChange={(e) => {
                        transform.current.x = parseInt(e.target.value);
                        updateTransformStyle();
                    }}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                />
            </div>
            <div 
                className="absolute right-4 top-1/2 -translate-y-1/2 h-1/2 flex flex-col items-center gap-2 bg-black/30 backdrop-blur-sm p-2 rounded-full z-[120]"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Y</span>
                <input 
                    type="range" 
                    min="-2000" 
                    max="2000" 
                    step="1"
                    value={transform.current.y}
                    onChange={(e) => {
                        transform.current.y = parseInt(e.target.value);
                        updateTransformStyle();
                    }}
                    className="h-full w-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)] [writing-mode:vertical-lr] direction-rtl"
                    style={{ WebkitAppearance: 'slider-vertical' } as any}
                />
            </div>
          </>
        )}
    </div>
  );
});