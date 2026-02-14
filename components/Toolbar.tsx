import React, { useRef, useState, useEffect } from 'react';
import { ToolType, ShapeType, BrushType } from '../types';
import { Icons } from '../Icons';
import { hexToHsv, hsvToHex } from '../utils/drawingUtils';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentBrushType: BrushType;
  onSelectBrushType: (type: BrushType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onImportImage: (file: File) => void;
  hasSelection: boolean;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;
  shapeType: ShapeType;
  onSelectShapeType: (type: ShapeType) => void;
  onOpenHelp: () => void;
  textToolFont: string;
  onSelectTextToolFont: (font: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentBrushType,
  onSelectBrushType,
  currentColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  onionSkin,
  onToggleOnionSkin,
  showGrid,
  onToggleGrid,
  isFocusMode,
  onToggleFocusMode,
  onImportImage,
  hasSelection,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
  shapeType,
  onSelectShapeType,
  onOpenHelp,
  textToolFont,
  onSelectTextToolFont
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePopover, setActivePopover] = useState<ToolType | 'color' | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [colorTab, setColorTab] = useState<'wheel' | 'sliders'>('wheel');
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });

  const wheelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivePopover(null);
  }, [currentTool]);

  useEffect(() => {
      const newHsv = hexToHsv(currentColor);
      setHsv(newHsv);
  }, [currentColor]);

  const handleWheelPointerUpdate = (e: React.PointerEvent) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const x = e.clientX - rect.left - cx;
      const y = e.clientY - rect.top - cy;
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      const newHsv = { ...hsv, h: angle };
      setHsv(newHsv);
      onChangeColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const handleSvPointerUpdate = (e: React.PointerEvent) => {
      if (!svRef.current) return;
      const rect = svRef.current.getBoundingClientRect();
      let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const s = (x / rect.width) * 100;
      const v = 100 - (y / rect.height) * 100;
      const newHsv = { ...hsv, s, v };
      setHsv(newHsv);
      onChangeColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const handleToolClick = (e: React.MouseEvent<HTMLButtonElement>, toolId: ToolType) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.right + 12;
    if (currentTool === toolId && ['pen', 'eraser', 'shape', 'text'].includes(toolId)) {
        setActivePopover(activePopover === toolId ? null : toolId);
    } else {
        onSelectTool(toolId);
    }
    setPopoverPos({ top, left });
  };

  const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: Icons.MousePointer2, label: 'Select' },
    { id: 'pen', icon: Icons.Pencil, label: 'Brush' },
    { id: 'eraser', icon: Icons.Eraser, label: 'Eraser' },
    { id: 'fill', icon: Icons.PaintBucket, label: 'Fill' },
    { id: 'shape', icon: shapeType === 'circle' ? Icons.Circle : shapeType === 'line' ? Icons.Line : Icons.Square, label: 'Shapes' },
    { id: 'text', icon: Icons.Type, label: 'Text' },
  ];

  const textFonts = [
      { label: 'Sans Serif', value: 'sans-serif' },
      { label: 'Serif', value: 'serif' },
      { label: 'Monospace', value: 'monospace' },
      { label: 'Cursive', value: 'cursive' },
      { label: 'Fantasy', value: 'fantasy' },
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Verdana', value: 'Verdana, sans-serif' },
      { label: 'Times', value: '"Times New Roman", serif' },
      { label: 'Courier', value: '"Courier New", monospace' },
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
      { label: 'Impact', value: 'Impact, sans-serif' },
  ];

  return (
    <>
      <div className="w-16 min-w-[64px] bg-[#1e1e1e] flex flex-col h-full border-r border-gray-700 z-20 shadow-xl">
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-4 space-y-4">
            {tools.map((tool) => (
            <button key={tool.id} onClick={(e) => handleToolClick(e, tool.id)} className={`p-3 rounded-xl transition-all shrink-0 ${currentTool === tool.id ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                <tool.icon size={24} />
            </button>
            ))}
            
            {/* Image Import */}
            <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all shrink-0"
            title="Import Image"
            >
            <Icons.Image size={24} />
            </button>
            <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => { if(e.target.files?.[0]) onImportImage(e.target.files[0]); if(fileInputRef.current) fileInputRef.current.value=''; }} 
            />

            <div className="w-8 h-px bg-gray-700 my-2 shrink-0" />

            {/* Color / Transforms */}
            {hasSelection ? (
            <div className="flex flex-col gap-2 shrink-0">
                <button onClick={onRotate} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Rotate">
                    <Icons.RotateCw size={20} />
                </button>
                <button onClick={onFlipHorizontal} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Flip H">
                    <Icons.FlipHorizontal size={20} />
                </button>
                <button onClick={onFlipVertical} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Flip V">
                    <Icons.FlipVertical size={20} />
                </button>
            </div>
            ) : (
            <button 
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPopoverPos({ top: r.top + r.height/2, left: r.right+12 }); setActivePopover(activePopover === 'color' ? null : 'color'); }} 
                className="w-10 h-10 rounded-full border-2 border-white/20 shrink-0" 
                style={{ backgroundColor: currentColor }} 
            />
            )}

            <div className="w-8 h-px bg-gray-700 my-2 shrink-0" />

            {/* Toggles */}
            <button onClick={onToggleOnionSkin} className={`p-3 rounded-xl transition-colors shrink-0 ${onionSkin ? 'text-[var(--accent-color)] bg-white/10' : 'text-gray-400 hover:text-white'}`} title="Onion Skin">
            <Icons.Ghost size={24} />
            </button>
            
            <button onClick={onToggleGrid} className={`p-3 rounded-xl transition-colors shrink-0 ${showGrid ? 'text-[var(--accent-color)] bg-white/10' : 'text-gray-400 hover:text-white'}`} title="Grid">
            <Icons.Grid size={24} />
            </button>

            <button onClick={onToggleFocusMode} className={`p-3 rounded-xl transition-colors shrink-0 ${isFocusMode ? 'text-[var(--accent-color)] bg-white/10' : 'text-gray-400 hover:text-white'}`} title="Focus Mode">
            {isFocusMode ? <Icons.Minimize2 size={24} /> : <Icons.Maximize2 size={24} />}
            </button>
        </div>

        {/* Help Button - Pinned to bottom */}
        <div className="shrink-0 p-2 border-t border-gray-700 flex justify-center bg-[#1e1e1e]">
            <button onClick={onOpenHelp} className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="Help">
                <Icons.Help size={24} />
            </button>
        </div>
      </div>

      {activePopover === 'color' && (
        <div className="fixed bg-[#252525] p-3 rounded-xl shadow-2xl w-60 border border-gray-700 z-50 flex flex-col gap-3" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setColorTab('wheel')} className={`flex-1 text-xs py-1 rounded ${colorTab === 'wheel' ? 'bg-[var(--accent-color)] text-white' : 'text-gray-400'}`}>Wheel</button>
                <button onClick={() => setColorTab('sliders')} className={`flex-1 text-xs py-1 rounded ${colorTab === 'sliders' ? 'bg-[var(--accent-color)] text-white' : 'text-gray-400'}`}>Sliders</button>
            </div>
            {colorTab === 'wheel' && (
                <div className="flex flex-col items-center py-2">
                    <div className="relative w-48 h-48 touch-none">
                        <div ref={wheelRef} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleWheelPointerUpdate(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) handleWheelPointerUpdate(e); }} className="absolute inset-0 rounded-full border border-gray-700" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                             <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow bg-transparent" style={{ left: '50%', top: '5%', transformOrigin: '0 90px', transform: `translate(-50%, -50%) rotate(${hsv.h}deg)` }} />
                        </div>
                        <div className="absolute inset-0 m-auto w-28 h-28 bg-[#252525] rounded-lg flex items-center justify-center overflow-hidden">
                             <div ref={svRef} onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); handleSvPointerUpdate(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) handleSvPointerUpdate(e); }} className="w-full h-full relative" style={{ backgroundColor: hsvToHex(hsv.h, 100, 100), backgroundImage: 'linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)' }}>
                                 <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
                             </div>
                        </div>
                    </div>
                </div>
            )}
            {colorTab === 'sliders' && (
                <div className="space-y-4 py-2">
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-600 relative">
                        <input type="color" value={currentColor} onChange={(e) => onChangeColor(e.target.value)} className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] p-0 m-0 border-none cursor-crosshair" />
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Pen Settings */}
      {activePopover === 'pen' && (
        <div className="fixed bg-[#252525] p-4 rounded-xl shadow-2xl w-64 border border-gray-700 z-50 flex flex-col gap-4" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="grid grid-cols-5 gap-2">
                {[
                    { type: 'pen', icon: Icons.Pencil },
                    { type: 'marker', icon: Icons.Marker },
                    { type: 'highlighter', icon: Icons.Highlighter },
                    { type: 'spray', icon: Icons.Spray },
                    { type: 'pixel', icon: Icons.Pixel },
                ].map((b) => (
                    <button 
                        key={b.type}
                        onClick={() => onSelectBrushType(b.type as BrushType)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${currentBrushType === b.type ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        title={b.type}
                    >
                        <b.icon size={20} />
                    </button>
                ))}
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
                    <span>Size</span>
                    <span>{strokeWidth}px</span>
                </div>
                <input type="range" min="1" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}

      {/* Eraser Settings */}
      {activePopover === 'eraser' && (
        <div className="fixed bg-[#252525] p-4 rounded-xl shadow-2xl w-48 border border-gray-700 z-50 flex flex-col gap-4" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
                    <span>Eraser Size</span>
                    <span>{strokeWidth}px</span>
                </div>
                <input type="range" min="1" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}

      {/* Shape Settings */}
      {activePopover === 'shape' && (
        <div className="fixed bg-[#252525] p-4 rounded-xl shadow-2xl w-56 border border-gray-700 z-50 flex flex-col gap-4" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
             <div className="flex gap-2">
                {[
                    { type: 'rectangle', icon: Icons.Square },
                    { type: 'circle', icon: Icons.Circle },
                    { type: 'line', icon: Icons.Line },
                ].map((s) => (
                    <button 
                        key={s.type}
                        onClick={() => onSelectShapeType(s.type as ShapeType)}
                        className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${shapeType === s.type ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        title={s.type}
                    >
                        <s.icon size={20} />
                    </button>
                ))}
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
                    <span>Stroke Width</span>
                    <span>{strokeWidth}px</span>
                </div>
                <input type="range" min="1" max="50" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}
      
      {/* Text Settings */}
      {activePopover === 'text' && (
        <div className="fixed bg-[#252525] p-4 rounded-xl shadow-2xl w-56 border border-gray-700 z-50 flex flex-col gap-4" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
                    <span>Font Size</span>
                    <span>{strokeWidth}px</span>
                </div>
                <input type="range" min="10" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            </div>
             <div className="w-full h-px bg-gray-700" />
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
                    <span>Font Family</span>
                </div>
                <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
                    {textFonts.map(f => (
                        <button
                            key={f.value}
                            onClick={() => onSelectTextToolFont(f.value)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${textToolFont === f.value ? 'bg-[var(--accent-color)] text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            style={{ fontFamily: f.value }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </>
  );
};