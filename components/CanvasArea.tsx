
import React, { useRef, useEffect, useState } from 'react';
import { ToolType, Frame, Layer, SelectionState, ShapeType } from '../types';
import { floodFill } from '../utils/drawingUtils';

interface CanvasAreaProps {
  currentFrame: Frame;
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayer: (layerId: string, dataUrl: string) => void;
  tool: ToolType;
  shapeType: ShapeType;
  color: string;
  strokeWidth: number;
  prevFrame?: Frame | null;
  nextFrame?: Frame | null;
  onionSkin: boolean;
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
}

const getMixBlendMode = (mode: GlobalCompositeOperation): any => {
    if (mode === 'source-over') return 'normal';
    const supported = ['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    if (supported.includes(mode)) return mode;
    return 'normal';
};

export const CanvasArea: React.FC<CanvasAreaProps> = React.memo(({
  currentFrame,
  layers,
  activeLayerId,
  onUpdateLayer,
  tool,
  shapeType,
  color,
  strokeWidth,
  prevFrame,
  nextFrame,
  onionSkin,
  showGrid,
  isPlaying,
  selection,
  onSelectionCreate,
  onSelectionUpdate,
  onSelectionCommit,
  canvasWidth,
  canvasHeight,
  backgroundImage
}) => {
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const latestSelectionState = useRef<SelectionState | null>(null);

  const transform = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isGesture = useRef(false);
  const isDrawing = useRef(false);
  const initialPinchDistance = useRef<number | null>(null);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  // Tracking movement to distinguish tap from drag
  const hasMoved = useRef(false);
  const drawStart = useRef<{x: number, y: number} | null>(null);
  const canvasSnapshot = useRef<ImageData | null>(null);

  const dragStart = useRef<{x: number, y: number} | null>(null);
  const initialSelection = useRef<SelectionState | null>(null);
  const selectionMode = useRef<'create' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null>(null);
  const [isCreatingSelection, setIsCreatingSelection] = useState(false);

  const [textInput, setTextInput] = useState<{x: number, y: number, value: string} | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (selection && selectionOverlayRef.current) {
          const s = selectionOverlayRef.current.style;
          s.left = `${selection.x}px`;
          s.top = `${selection.y}px`;
          s.width = `${selection.width}px`;
          s.height = `${selection.height}px`;
          s.transform = `rotate(${selection.rotation}deg) scale(${selection.scaleX}, ${selection.scaleY})`;
          latestSelectionState.current = selection;
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
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const layerData = currentFrame.layers?.[activeLayerId];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (layerData) {
        const img = new Image();
        img.src = layerData;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
    }
  }, [currentFrame?.id, activeLayerId, currentFrame?.layers, canvasWidth, canvasHeight]);

  const updateTransformStyle = () => {
    if (transformRef.current) {
      const { scale, x, y } = transform.current;
      transformRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!activeCanvasRef.current) return { x: 0, y: 0 };
    const rect = activeCanvasRef.current.getBoundingClientRect();
    const scaleX = activeCanvasRef.current.width / rect.width;
    const scaleY = activeCanvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const getDistance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
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
             ctx.font = `bold ${fontSize}px sans-serif`;
             const metrics = ctx.measureText(textInput.value);
             const width = Math.ceil(metrics.width);
             const height = Math.ceil(fontSize * 1.2);
             
             canvas.width = width;
             canvas.height = height;
             
             ctx.font = `bold ${fontSize}px sans-serif`;
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
        isDrawing.current = false; // Immediately stop drawing if second finger hits
        selectionMode.current = null;
        if (textInput) commitText();

        const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
        if (points.length >= 2) {
            initialPinchDistance.current = getDistance(points[0], points[1]);
            lastPanPoint.current = getCenter(points[0], points[1]);
        }
        return;
    }

    isGesture.current = false;
    hasMoved.current = false; // Reset movement tracking
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const activeLayer = layers.find(l => l.id === activeLayerId);

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

    if (activeLayer?.isLocked || !activeLayer?.isVisible) {
        isDrawing.current = false;
        return;
    }

    isDrawing.current = true;
    drawStart.current = { x, y };
    const ctx = activeCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'fill') {
        floodFill(ctx, Math.floor(x), Math.floor(y), color);
        saveCanvas();
        isDrawing.current = false;
    } else if (tool === 'shape') {
        canvasSnapshot.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        // Prepare context but DO NOT stroke/lineTo yet to avoid dots on multi-touch
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    }
  };

  const handleSelectionPointerDown = (e: React.PointerEvent) => {
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

            if (initialPinchDistance.current && lastPanPoint.current) {
                const zoomFactor = newDistance / initialPinchDistance.current;
                const newScale = Math.min(Math.max(transform.current.scale * zoomFactor, 0.1), 10);
                const dx = newCenter.x - lastPanPoint.current.x;
                const dy = newCenter.y - lastPanPoint.current.y;

                transform.current.scale = newScale;
                transform.current.x += dx;
                transform.current.y += dy;
                updateTransformStyle();
                
                initialPinchDistance.current = newDistance;
                lastPanPoint.current = newCenter;
            }
            return;
        }
        return;
    }

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // Track movement
    if (drawStart.current) {
        const dist = getDistance(drawStart.current, { x, y });
        if (dist > 2) hasMoved.current = true;
    }

    if (tool === 'select' && selectionMode.current && dragStart.current) {
        if (selectionMode.current === 'create') {
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
        } else if (initialSelection.current) {
            const dx = x - dragStart.current.x;
            const dy = y - dragStart.current.y;
            const init = initialSelection.current;
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
        const ctx = activeCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        if (tool === 'shape' && drawStart.current && canvasSnapshot.current) {
            ctx.putImageData(canvasSnapshot.current, 0, 0);
            const startX = drawStart.current.x;
            const startY = drawStart.current.y;
            const w = x - startX;
            const h = y - startY;

            ctx.beginPath();
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = color;
            ctx.globalCompositeOperation = 'source-over';
            if (shapeType === 'rectangle') ctx.rect(startX, startY, w, h);
            else if (shapeType === 'circle') {
                const cx = startX + w / 2;
                const cy = startY + h / 2;
                ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
            } else if (shapeType === 'line') {
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else if (tool === 'pen' || tool === 'eraser') {
            ctx.lineTo(x, y);
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

    if (tool === 'select') {
        if (selectionMode.current === 'create' && dragStart.current) {
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
        const ctx = activeCanvasRef.current?.getContext('2d');
        if (ctx) {
            if (tool === 'pen' || tool === 'eraser') {
                // Handle single tap for dots
                if (!hasMoved.current && drawStart.current) {
                    ctx.lineTo(drawStart.current.x, drawStart.current.y);
                    ctx.stroke();
                }
                ctx.closePath();
                ctx.globalCompositeOperation = 'source-over';
                saveCanvas();
            } else if (tool === 'shape') {
                ctx.closePath();
                saveCanvas();
            }
        }
        isDrawing.current = false;
        drawStart.current = null;
        canvasSnapshot.current = null;
    }
  };

  const saveCanvas = () => {
    if (!activeCanvasRef.current) return;
    const dataUrl = activeCanvasRef.current.toDataURL('image/png');
    onUpdateLayer(activeLayerId, dataUrl);
  };

  const handleWheel = (e: React.WheelEvent) => {
     if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const zoomDelta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(transform.current.scale + zoomDelta, 0.1), 10);
        transform.current.scale = newScale;
        updateTransformStyle();
     } else {
        transform.current.x -= e.deltaX;
        transform.current.y -= e.deltaY;
        updateTransformStyle();
     }
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
                transform: `translate(0px, 0px) scale(1)`,
                width: canvasWidth, 
                height: canvasHeight 
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

            {onionSkin && prevFrame?.thumbnailUrl && !isPlaying && (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
                    <img src={prevFrame.thumbnailUrl} alt="" className="w-full h-full object-contain" />
                </div>
            )}
            
            {onionSkin && nextFrame?.thumbnailUrl && !isPlaying && (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
                     <img src={nextFrame.thumbnailUrl} alt="" className="w-full h-full object-contain" />
                </div>
            )}

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
                        cursor: isGesture.current ? 'grabbing' : (tool === 'select' || tool === 'text' ? 'text' : 'crosshair'),
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
                    <img src={selection.dataUrl} className="w-full h-full select-none pointer-events-none" alt="selection" />
                    <div className="absolute inset-0 border-2 border-[#007AFF] pointer-events-none"></div>
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tl')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#007AFF] rounded-full cursor-nwse-resize z-40 pointer-events-auto" />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-tr')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#007AFF] rounded-full cursor-nesw-resize z-40 pointer-events-auto" />
                     <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-bl')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#007AFF] rounded-full cursor-nesw-resize z-40 pointer-events-auto" />
                    <div onPointerDown={(e) => handleResizePointerDown(e, 'resize-br')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#007AFF] rounded-full cursor-nwse-resize z-40 pointer-events-auto" />
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
                    style={{ left: textInput.x, top: textInput.y, color: color, fontSize: `${Math.max(12, strokeWidth)}px`, fontFamily: 'sans-serif', fontWeight: 'bold', minWidth: '20px' }}
                    placeholder="Type..."
                    autoFocus
                />
            )}
        </div>
        
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none flex gap-2">
            <span>{Math.round(transform.current.scale * 100)}%</span>
            {tool === 'select' && <span>Select Mode</span>}
            {tool === 'text' && <span>Text Mode</span>}
        </div>
    </div>
  );
});
