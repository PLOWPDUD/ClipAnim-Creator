import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { ToolType, Frame, Layer, SelectionState, ShapeType, BrushType, OnionSkinSettings } from '../types';
import { floodFill, magicWandSelect } from '../utils/drawingUtils';

export interface CanvasAreaHandle {
  resetView: () => void;
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

  // Canvas Settings
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: string | null;

  // Text Tool
  textToolFont: string;
}

const getMixBlendMode = (mode: GlobalCompositeOperation): any => {
    if (mode === 'source-over') return 'normal';
    const supported = ['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    if (supported.includes(mode)) return mode;
    return 'normal';
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
  canvasWidth,
  canvasHeight,
  backgroundImage,
  textToolFont
}, ref) => {
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const latestSelectionState = useRef<SelectionState | null>(null);

  const transform = useRef({ scale: 1, x: 0, y: 0, rotation: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isGesture = useRef(false);
  const isDrawing = useRef(false);
  
  const initialPinchDistance = useRef<number | null>(null);
  const initialAngle = useRef<number | null>(null);
  const startRotation = useRef<number>(0);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  // Tracking movement to distinguish tap from drag
  const hasMoved = useRef(false);
  const drawStart = useRef<{x: number, y: number} | null>(null);
  const lastPoint = useRef<{x: number, y: number} | null>(null);
  const canvasSnapshot = useRef<ImageData | null>(null);

  const dragStart = useRef<{x: number, y: number} | null>(null);
  const initialSelection = useRef<SelectionState | null>(null);
  const selectionMode = useRef<'create' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'rotate' | null>(null);
  const [isCreatingSelection, setIsCreatingSelection] = useState(false);

  const [textInput, setTextInput] = useState<{x: number, y: number, value: string} | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
      resetView: () => {
          transform.current = { scale: 1, x: 0, y: 0, rotation: 0 };
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
                      ctx.clearRect(0, 0, selection.width, selection.height);
                      ctx.drawImage(img, 0, 0, selection.width, selection.height);
                  };
                  img.src = selection.dataUrl;
              }
          }
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
  }, [currentFrame?.id, activeLayerId, currentFrame?.layers, canvasWidth, canvasHeight, brushType]);

  const updateTransformStyle = () => {
    if (transformRef.current) {
      const { scale, x, y, rotation } = transform.current;
      transformRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
      
      // Update rendering mode for pixel art when zoomed in
      if (transformRef.current.style.imageRendering !== undefined) {
         transformRef.current.style.imageRendering = scale > 2 ? 'pixelated' : 'auto';
      }
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
             const fontSize = Math.max(12, strokeWidth);
             // Use selected font family
             ctx.font = `bold ${fontSize}px ${textToolFont}`;
             const metrics = ctx.measureText(textInput.value);
             const width = Math.ceil(metrics.width);
             const height = Math.ceil(fontSize * 1.2);
             
             canvas.width = width;
             canvas.height = height;
             
             // Re-set font after resize
             ctx.font = `bold ${fontSize}px ${textToolFont}`;
             ctx.fillStyle = color;
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
                 scaleY: 1
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
          }
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPlaying || !currentFrame) return;
    
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

    if (tool === 'select') {
        if (selection) onSelectionCommit();
        selectionMode.current = 'create';
        dragStart.current = { x, y };
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
                onSelectionCreate(newSelection);
            }
        }
        isDrawing.current = false;
        return;
    }

    const mapToSelection = (px: number, py: number) => {
        if (!selection) return { x: px, y: py };
        const dx = px - (selection.x + selection.width / 2);
        const dy = py - (selection.y + selection.height / 2);
        const rad = (-selection.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        let sx = dx * cos - dy * sin;
        let sy = dx * sin + dy * cos;
        sx /= selection.scaleX;
        sy /= selection.scaleY;
        sx += selection.width / 2;
        sy += selection.height / 2;
        return { x: sx, y: sy };
    };

    const mappedCoords = mapToSelection(x, y);
    const mx = mappedCoords.x;
    const my = mappedCoords.y;

    isDrawing.current = true;
    drawStart.current = { x: mx, y: my };
    lastPoint.current = { x: mx, y: my };
    
    const ctx = selection ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'fill') {
        floodFill(ctx, Math.floor(mx), Math.floor(my), color);
        if (!selection) saveCanvas();
        else {
            // Update selection dataUrl
            const newUrl = selectionCanvasRef.current?.toDataURL();
            if (newUrl) onSelectionUpdate({ ...selection, dataUrl: newUrl });
        }
        isDrawing.current = false;
    } else if (tool === 'shape') {
        canvasSnapshot.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        setupBrush(ctx);
        if (tool === 'eraser' && selection) {
            ctx.globalCompositeOperation = 'destination-out';
        } else if (selection) {
            ctx.globalCompositeOperation = 'source-atop';
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

  const handleResizePointerDown = (e: React.PointerEvent, type: 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br') => {
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPlaying) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

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

    if ((tool === 'select' || tool === 'wand') && selectionMode.current && selection) {
        const init = initialSelection.current;
        if (selectionMode.current === 'create' && dragStart.current) {
            if (marqueeRef.current) {
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
            }
        } else if (selectionMode.current === 'rotate' && init) {
            const centerX = init.x + init.width / 2;
            const centerY = init.y + init.height / 2;
            // Calculate angle from center to pointer
            const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
            // Since the handle is at the top, add 90 degrees to align
            const newRotation = (angle + 90) % 360;
            
            if (selectionOverlayRef.current) {
                selectionOverlayRef.current.style.transform = `rotate(${newRotation}deg) scale(${init.scaleX}, ${init.scaleY})`;
            }
            latestSelectionState.current = { ...init, rotation: newRotation };
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
                 const ldx = (dx * cos - dy * sin);
                 const ldy = (dx * sin + dy * cos);

                 let handle = selectionMode.current;
                 if (init.scaleX < 0) {
                    if (handle === 'resize-tl') handle = 'resize-tr';
                    else if (handle === 'resize-tr') handle = 'resize-tl';
                    else if (handle === 'resize-bl') handle = 'resize-br';
                    else if (handle === 'resize-br') handle = 'resize-bl';
                 }
                 if (init.scaleY < 0) {
                    if (handle === 'resize-tl') handle = 'resize-bl';
                    else if (handle === 'resize-tr') handle = 'resize-br';
                    else if (handle === 'resize-bl') handle = 'resize-tl';
                    else if (handle === 'resize-br') handle = 'resize-tr';
                 }

                 if (handle === 'resize-br') { newW = init.width + ldx; newH = init.height + ldy; }
                 else if (handle === 'resize-bl') { newW = init.width - ldx; newH = init.height + ldy; newX = init.x + ldx; }
                 else if (handle === 'resize-tr') { newW = init.width + ldx; newH = init.height - ldy; newY = init.y + ldy; }
                 else if (handle === 'resize-tl') { newW = init.width - ldx; newH = init.height - ldy; newX = init.x + ldx; newY = init.y + ldy; }

                 if (newW < 5) { const diff = 5 - newW; newW = 5; if (handle.includes('l')) newX -= diff; }
                 if (newH < 5) { const diff = 5 - newH; newH = 5; if (handle.includes('t')) newY -= diff; }
            }

            if (selectionOverlayRef.current) {
                const s = selectionOverlayRef.current.style;
                s.left = `${newX}px`;
                s.top = `${newY}px`;
                s.width = `${newW}px`;
                s.height = `${newH}px`;
            }
            latestSelectionState.current = { ...init, x: newX, y: newY, width: newW, height: newH };
        }
    }
    
    if (isDrawing.current) {
        const mapToSelection = (px: number, py: number) => {
            if (!selection) return { x: px, y: py };
            const dx = px - (selection.x + selection.width / 2);
            const dy = py - (selection.y + selection.height / 2);
            const rad = (-selection.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            let sx = dx * cos - dy * sin;
            let sy = dx * sin + dy * cos;
            sx /= selection.scaleX;
            sy /= selection.scaleY;
            sx += selection.width / 2;
            sy += selection.height / 2;
            return { x: sx, y: sy };
        };

        const mappedCoords = mapToSelection(x, y);
        const mx = mappedCoords.x;
        const my = mappedCoords.y;

        const ctx = selection ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        if (tool === 'shape' && drawStart.current && canvasSnapshot.current) {
            ctx.putImageData(canvasSnapshot.current, 0, 0);
            const startX = drawStart.current.x;
            const startY = drawStart.current.y;
            const w = mx - startX;
            const h = my - startY;

            ctx.beginPath();
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = color;
            if (selection) {
                ctx.globalCompositeOperation = 'source-atop';
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
                ctx.lineTo(mx, my);
            }
            ctx.stroke();
        } else if (tool === 'pen' && brushType === 'pixel') {
             if (lastPoint.current) {
                 drawPixelLine(ctx, lastPoint.current.x, lastPoint.current.y, mx, my);
                 lastPoint.current = { x: mx, y: my };
             }
        } else if (tool === 'pen' && brushType === 'spray') {
             const density = Math.max(1, strokeWidth * 2);
             for (let i = 0; i < density; i++) {
                 const offsetX = (Math.random() - 0.5) * strokeWidth * 2;
                 const offsetY = (Math.random() - 0.5) * strokeWidth * 2;
                 if (offsetX * offsetX + offsetY * offsetY <= strokeWidth * strokeWidth) {
                     ctx.fillRect(mx + offsetX, my + offsetY, 1, 1);
                 }
             }
        } else if (tool === 'pen' || tool === 'eraser') {
            ctx.lineTo(mx, my);
            ctx.stroke();
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

    if (tool === 'select' || tool === 'wand') {
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
                    onSelectionCreate({ x: left, y: top, width, height, dataUrl: tempCanvas.toDataURL(), rotation: 0, scaleX: 1, scaleY: 1 });
                }
            }
            setIsCreatingSelection(false);
        } else if (selectionMode.current && latestSelectionState.current) {
            onSelectionUpdate(latestSelectionState.current);
        }
    }

    selectionMode.current = null;
    dragStart.current = null;
    initialSelection.current = null;

    if (isDrawing.current) {
        const ctx = selection ? selectionCanvasRef.current?.getContext('2d') : activeCanvasRef.current?.getContext('2d');
        if (ctx) {
            if ((tool === 'pen' && brushType !== 'spray' && brushType !== 'pixel') || tool === 'eraser') {
                if (!hasMoved.current && drawStart.current) {
                    ctx.lineTo(drawStart.current.x, drawStart.current.y);
                    ctx.stroke();
                }
                ctx.closePath();
                if (!selection) ctx.globalCompositeOperation = 'source-over';
                
                if (!selection) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection, dataUrl: newUrl });
                }
            } else if (brushType === 'pixel') {
                if (!hasMoved.current && drawStart.current) {
                    setupBrush(ctx);
                    const size = Math.floor(strokeWidth);
                    ctx.fillStyle = color;
                    ctx.fillRect(Math.floor(drawStart.current.x - size/2), Math.floor(drawStart.current.y - size/2), size, size);
                }
                if (!selection) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection, dataUrl: newUrl });
                }
            } else if (brushType === 'spray') {
                 if (!selection) saveCanvas();
                 else {
                     const newUrl = selectionCanvasRef.current?.toDataURL();
                     if (newUrl) onSelectionUpdate({ ...selection, dataUrl: newUrl });
                 }
            } else if (tool === 'shape') {
                ctx.closePath();
                if (!selection) saveCanvas();
                else {
                    const newUrl = selectionCanvasRef.current?.toDataURL();
                    if (newUrl) onSelectionUpdate({ ...selection, dataUrl: newUrl });
                }
            }
        }
        isDrawing.current = false;
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

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-[#2a2a2a] overflow-hidden touch-none"
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
            className="relative shadow-2xl bg-white origin-center"
            style={{ 
                transform: `translate(0px, 0px) rotate(0deg) scale(1)`,
                width: canvasWidth, 
                height: canvasHeight,
                imageRendering: 'auto'
            }}
        >
            {backgroundImage && (
                <img src={backgroundImage} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none" />
            )}
            
            {showGrid && !isPlaying && (
                <div 
                    className="absolute inset-0 pointer-events-none z-[25] opacity-20"
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
                    <img src={f.thumbnailUrl} alt="" className="w-full h-full object-contain" />
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
                     <img src={f.thumbnailUrl} alt="" className="w-full h-full object-contain" />
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

            {layers.map(layer => {
                if (!layer.isVisible || layer.id === activeLayerId) return null;
                const layerData = currentFrame.layers?.[layer.id];
                if (!layerData) return null;
                return (
                    <img 
                        key={layer.id} 
                        src={layerData} 
                        alt="" 
                        className="absolute inset-0 w-full h-full pointer-events-none z-10" 
                        style={{
                            opacity: layer.opacity,
                            mixBlendMode: getMixBlendMode(layer.blendMode)
                        }}
                    />
                );
            })}

            {layers.find(l => l.id === activeLayerId)?.isVisible && (
                <canvas
                    ref={activeCanvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="absolute inset-0 w-full h-full z-20"
                    style={{ 
                        cursor: isGesture.current ? 'grabbing' : (tool === 'select' || tool === 'text' ? 'text' : tool === 'wand' ? 'crosshair' : 'crosshair'),
                        opacity: layers.find(l => l.id === activeLayerId)?.opacity ?? 1,
                        mixBlendMode: getMixBlendMode(layers.find(l => l.id === activeLayerId)?.blendMode ?? 'source-over')
                    }}
                />
            )}

            {selection && (
                <div 
                    ref={selectionOverlayRef}
                    className="absolute z-30 select-none" 
                    onPointerDown={handleSelectionPointerDown}
                    style={{
                        left: selection.x,
                        top: selection.y,
                        width: selection.width,
                        height: selection.height,
                        transform: `rotate(${selection.rotation}deg) scale(${selection.scaleX}, ${selection.scaleY})`,
                        transformOrigin: 'center',
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
                    <div className="absolute inset-0 border-2 border-[#007AFF] pointer-events-none"></div>
                    
                    {/* Bigger Corner Handles */}
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tl')} className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg cursor-nwse-resize z-40 pointer-events-auto" />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tr')} className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg cursor-nesw-resize z-40 pointer-events-auto" />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-bl')} className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg cursor-nesw-resize z-40 pointer-events-auto" />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-br')} className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-[#007AFF] rounded shadow-lg cursor-nwse-resize z-40 pointer-events-auto" />

                    {/* Interactive Rotation Handle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ transform: 'translateY(-100%)' }}>
                        <div className="w-0.5 h-10 bg-[#007AFF]"></div>
                        <div 
                            onPointerDown={handleRotatePointerDown}
                            className="w-8 h-8 rounded-full bg-white border-2 border-[#007AFF] flex items-center justify-center text-[#007AFF] shadow-xl cursor-grab active:cursor-grabbing pointer-events-auto"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                        </div>
                    </div>
                </div>
            )}
            
            {tool === 'select' && isCreatingSelection && (
                 <div ref={marqueeRef} className="absolute border border-dashed border-red-500 bg-red-500/10 pointer-events-none z-50" />
            )}

            {textInput && (
                <input
                    ref={textInputRef}
                    type="text"
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onKeyDown={(e) => { if(e.key === 'Enter') commitText(); }}
                    className="absolute z-50 bg-transparent border-none outline-none p-0 m-0"
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
        
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none flex gap-2">
            <span>{Math.round(transform.current.scale * 100)}%</span>
            <span>{Math.round(transform.current.rotation)}°</span>
            {tool === 'select' && <span>Select Mode</span>}
            {tool === 'wand' && <span>Wand Mode</span>}
            {tool === 'text' && <span>Text Mode</span>}
        </div>
    </div>
  );
});