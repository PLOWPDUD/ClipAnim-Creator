
import React, { useRef, useState, useEffect } from 'react';
import { ToolType, ShapeType, BrushType } from '../types';
import { Icons } from './Icons';
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
  // Selection Context Props
  hasSelection: boolean;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;
  // Shape Props
  shapeType: ShapeType;
  onSelectShapeType: (type: ShapeType) => void;
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
  onSelectShapeType
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePopover, setActivePopover] = useState<ToolType | 'color' | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Color Picker State
  const [colorTab, setColorTab] = useState<'wheel' | 'sliders'>('wheel');
  const [tempHex, setTempHex] = useState(currentColor);
  const [tempRgb, setTempRgb] = useState({ r: 0, g: 0, b: 0 });
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });

  useEffect(() => {
    setActivePopover(null);
  }, [currentTool]);

  useEffect(() => {
      // Sync local state when external color changes
      setTempHex(currentColor);
      const r = parseInt(currentColor.slice(1, 3), 16);
      const g = parseInt(currentColor.slice(3, 5), 16);
      const b = parseInt(currentColor.slice(5, 7), 16);
      if (!isNaN(r)) setTempRgb({ r, g, b });
      
      const newHsv = hexToHsv(currentColor);
      setHsv(newHsv);
  }, [currentColor]);

  const handleToolClick = (e: React.MouseEvent<HTMLButtonElement>, toolId: ToolType) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.right + 12;

    if (currentTool === toolId) {
      if (['pen', 'eraser', 'shape', 'text'].includes(toolId)) {
        if (activePopover === toolId) {
            setActivePopover(null);
        } else {
            setPopoverPos({ top, left });
            setActivePopover(toolId);
        }
      }
    } else {
      onSelectTool(toolId);
      setPopoverPos({ top, left });
    }
  };

  const handleColorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const top = rect.top + rect.height / 2;
      const left = rect.right + 12;
      
      if (activePopover === 'color') {
          setActivePopover(null);
      } else {
          setPopoverPos({ top, left });
          setActivePopover('color');
      }
  };

  const handleHexChange = (val: string) => {
      setTempHex(val);
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          onChangeColor(val);
      }
  };

  const handleRgbChange = (key: 'r' | 'g' | 'b', val: string) => {
      const num = Math.min(255, Math.max(0, Number(val)));
      const newRgb = { ...tempRgb, [key]: num };
      setTempRgb(newRgb);
      
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const hex = `#${toHex(newRgb.r)}${toHex(newRgb.g)}${toHex(newRgb.b)}`;
      setTempHex(hex);
      onChangeColor(hex);
  };

  // Color Wheel Interaction Logic
  const wheelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);

  const handleWheelPointer = (e: React.PointerEvent) => {
      if (!wheelRef.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
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

  const handleSvPointer = (e: React.PointerEvent) => {
      if (!svRef.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = svRef.current.getBoundingClientRect();
      let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      
      const s = (x / rect.width) * 100;
      const v = 100 - (y / rect.height) * 100;
      
      const newHsv = { ...hsv, s, v };
      setHsv(newHsv);
      onChangeColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: Icons.MousePointer2, label: 'Select (S)' },
    { id: 'pen', icon: Icons.Pencil, label: 'Brush (B)' },
    { id: 'eraser', icon: Icons.Eraser, label: 'Eraser (E)' },
    { id: 'fill', icon: Icons.PaintBucket, label: 'Fill (F)' },
    { id: 'shape', icon: 
        shapeType === 'circle' ? Icons.Circle : 
        shapeType === 'line' ? Icons.Line : Icons.Square, 
      label: 'Shapes (U)' 
    },
    { id: 'text', icon: Icons.Type, label: 'Text (T)' },
  ];

  const presets = ['#000000', '#FF3B30', '#007AFF', '#34C759', '#FF9500', '#FFFFFF'];

  const getPopoverTitle = (tool: ToolType) => {
      switch(tool) {
          case 'pen': return 'Brush Settings';
          case 'eraser': return 'Eraser Size';
          case 'text': return 'Font Size';
          default: return 'Size';
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportImage(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="w-16 min-w-[64px] shrink-0 bg-[#1e1e1e] flex flex-col items-center py-4 space-y-4 border-r border-gray-700 z-20 shadow-xl overflow-y-auto no-scrollbar h-full">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={(e) => handleToolClick(e, tool.id)}
            className={`
              p-3 rounded-xl transition-all duration-200 relative shrink-0 group
              ${currentTool === tool.id ? 'bg-[#FF3B30] text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
            `}
            title={tool.label}
          >
            <tool.icon size={24} />
            
            {/* Indicator dot for tools with settings */}
            {['pen', 'eraser', 'shape', 'text'].includes(tool.id) && (
                <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full transition-colors ${currentTool === tool.id ? 'bg-white' : 'bg-gray-500 group-hover:bg-gray-300'}`} />
            )}
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
          onChange={handleImageUpload} 
        />

        <div className="w-8 h-px bg-gray-700 my-2 shrink-0" />

        {/* Transform Controls (Only visible when selection is active) */}
        {hasSelection ? (
          <div className="flex flex-col gap-2 shrink-0">
              <button onClick={onRotate} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Rotate 90°">
                  <Icons.RotateCw size={20} />
              </button>
              <button onClick={onFlipHorizontal} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Flip Horizontal">
                  <Icons.FlipHorizontal size={20} />
              </button>
              <button onClick={onFlipVertical} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg" title="Flip Vertical">
                  <Icons.FlipVertical size={20} />
              </button>
              <div className="w-8 h-px bg-gray-700 my-2 self-center" />
          </div>
        ) : (
          /* Color Picker Trigger */
          <div className="flex flex-col gap-2 shrink-0 items-center">
            <button 
                onClick={handleColorClick}
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-white/20 p-0 overflow-hidden hover:scale-110 transition-transform relative"
                style={{ backgroundColor: currentColor }}
                title="Color Picker"
            >
                {activePopover === 'color' && <div className="absolute inset-0 border-2 border-white rounded-full animate-pulse" />}
            </button>
            
            <div className="flex flex-col gap-2">
              {presets.map(color => (
                  <button
                      key={color}
                      onClick={() => onChangeColor(color)}
                      className="w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                  />
              ))}
            </div>
            <div className="w-8 h-px bg-gray-700 my-2" />
          </div>
        )}

        {/* Toggles */}
        <button 
          onClick={onToggleOnionSkin}
          className={`p-3 rounded-xl transition-colors shrink-0 ${onionSkin ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Onion Skin"
        >
          <Icons.Ghost size={24} />
        </button>

        <button 
          onClick={onToggleGrid}
          className={`p-3 rounded-xl transition-colors shrink-0 ${showGrid ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Grid (G)"
        >
          <Icons.Grid size={24} />
        </button>

        <button 
          onClick={onToggleFocusMode}
          className={`p-3 rounded-xl transition-colors shrink-0 ${isFocusMode ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Focus Mode"
        >
          {isFocusMode ? <Icons.Minimize2 size={24} /> : <Icons.Maximize2 size={24} />}
        </button>
      </div>

      {/* --- POPOVERS --- */}

      {/* Color Picker Popover */}
      {activePopover === 'color' && (
        <div 
            className="fixed bg-[#252525] p-3 rounded-xl shadow-2xl w-60 border border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3"
            style={{ 
                top: popoverPos.top, 
                left: popoverPos.left,
                transform: 'translateY(-50%)' 
            }}
        >
            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                <button 
                    onClick={() => setColorTab('wheel')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${colorTab === 'wheel' ? 'bg-[#FF3B30] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    Wheel
                </button>
                <button 
                    onClick={() => setColorTab('sliders')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${colorTab === 'sliders' ? 'bg-[#FF3B30] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    Sliders
                </button>
            </div>

            {/* TAB: WHEEL */}
            {colorTab === 'wheel' && (
                <div className="flex flex-col items-center py-2">
                    <div className="relative w-48 h-48">
                        {/* HUE RING */}
                        <div 
                            ref={wheelRef}
                            onPointerDown={handleWheelPointer}
                            onPointerMove={(e) => e.buttons === 1 && handleWheelPointer(e)}
                            className="absolute inset-0 rounded-full cursor-crosshair shadow-inner border border-gray-700"
                            style={{
                                background: `conic-gradient(
                                    red 0deg, 
                                    yellow 60deg, 
                                    lime 120deg, 
                                    cyan 180deg, 
                                    blue 240deg, 
                                    magenta 300deg, 
                                    red 360deg
                                )`
                            }}
                        >
                             {/* Hue Indicator */}
                             <div 
                                className="absolute w-3 h-3 rounded-full border-2 border-white shadow bg-transparent pointer-events-none"
                                style={{
                                    left: '50%',
                                    top: '5%',
                                    transformOrigin: '0 90px',
                                    transform: `translate(-50%, -50%) rotate(${hsv.h}deg)`
                                }}
                             />
                        </div>

                        {/* SV SQUARE (Inset) */}
                        <div className="absolute inset-0 m-auto w-28 h-28 bg-[#252525] rounded-lg flex items-center justify-center overflow-hidden">
                             <div 
                                ref={svRef}
                                onPointerDown={handleSvPointer}
                                onPointerMove={(e) => e.buttons === 1 && handleSvPointer(e)}
                                className="w-full h-full cursor-crosshair relative"
                                style={{
                                    backgroundColor: hsvToHex(hsv.h, 100, 100),
                                    backgroundImage: `
                                        linear-gradient(to top, black, transparent),
                                        linear-gradient(to right, white, transparent)
                                    `
                                }}
                             >
                                 {/* SV Indicator */}
                                 <div 
                                    className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        left: `${hsv.s}%`,
                                        top: `${100 - hsv.v}%`
                                    }}
                                 />
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SLIDERS */}
            {colorTab === 'sliders' && (
                <div className="space-y-4 py-2">
                    {/* Visual Picker */}
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-600 relative">
                        <input 
                            type="color" 
                            value={currentColor} 
                            onChange={(e) => onChangeColor(e.target.value)}
                            className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] p-0 m-0 border-none cursor-crosshair"
                        />
                    </div>

                    {/* HEX Input */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">HEX</label>
                        <div className="flex items-center bg-gray-800 rounded px-2 py-1 border border-gray-700">
                            <span className="text-gray-500 text-xs mr-1">#</span>
                            <input 
                                type="text" 
                                value={tempHex.replace('#', '')}
                                onChange={(e) => handleHexChange('#' + e.target.value)}
                                maxLength={6}
                                className="bg-transparent text-white text-xs w-full outline-none font-mono uppercase"
                            />
                        </div>
                    </div>

                    {/* RGB Inputs */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">RGB</label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-800 rounded px-1 py-1 border border-gray-700 flex items-center">
                                <span className="text-red-500 text-[10px] font-bold mr-1">R</span>
                                <input 
                                    type="number" 
                                    min="0" max="255"
                                    value={tempRgb.r}
                                    onChange={(e) => handleRgbChange('r', e.target.value)}
                                    className="bg-transparent text-white text-xs w-full outline-none font-mono"
                                />
                            </div>
                            <div className="bg-gray-800 rounded px-1 py-1 border border-gray-700 flex items-center">
                                <span className="text-green-500 text-[10px] font-bold mr-1">G</span>
                                <input 
                                    type="number" 
                                    min="0" max="255"
                                    value={tempRgb.g}
                                    onChange={(e) => handleRgbChange('g', e.target.value)}
                                    className="bg-transparent text-white text-xs w-full outline-none font-mono"
                                />
                            </div>
                            <div className="bg-gray-800 rounded px-1 py-1 border border-gray-700 flex items-center">
                                <span className="text-blue-500 text-[10px] font-bold mr-1">B</span>
                                <input 
                                    type="number" 
                                    min="0" max="255"
                                    value={tempRgb.b}
                                    onChange={(e) => handleRgbChange('b', e.target.value)}
                                    className="bg-transparent text-white text-xs w-full outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Brush Settings Popover */}
      {activePopover === 'pen' && (
        <div 
          className="fixed bg-[#252525] p-3 rounded-lg shadow-xl w-52 border border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: popoverPos.top, 
            left: popoverPos.left,
            transform: 'translateY(-50%)' 
          }}
        >
          <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
            Brush Style
          </div>
          <div className="grid grid-cols-5 gap-2 mb-4">
              <button onClick={() => onSelectBrushType('pen')} className={`p-2 rounded flex items-center justify-center ${currentBrushType === 'pen' ? 'bg-[#FF3B30] text-white' : 'bg-gray-700 text-gray-400'}`} title="Standard Pen">
                  <Icons.Pencil size={18} />
              </button>
              <button onClick={() => onSelectBrushType('marker')} className={`p-2 rounded flex items-center justify-center ${currentBrushType === 'marker' ? 'bg-[#FF3B30] text-white' : 'bg-gray-700 text-gray-400'}`} title="Marker">
                  <Icons.Marker size={18} />
              </button>
              <button onClick={() => onSelectBrushType('highlighter')} className={`p-2 rounded flex items-center justify-center ${currentBrushType === 'highlighter' ? 'bg-[#FF3B30] text-white' : 'bg-gray-700 text-gray-400'}`} title="Highlighter">
                  <Icons.Highlighter size={18} />
              </button>
              <button onClick={() => onSelectBrushType('spray')} className={`p-2 rounded flex items-center justify-center ${currentBrushType === 'spray' ? 'bg-[#FF3B30] text-white' : 'bg-gray-700 text-gray-400'}`} title="Spray">
                  <Icons.Spray size={18} />
              </button>
              <button onClick={() => onSelectBrushType('pixel')} className={`p-2 rounded flex items-center justify-center ${currentBrushType === 'pixel' ? 'bg-[#FF3B30] text-white' : 'bg-gray-700 text-gray-400'}`} title="Pixel Brush">
                  <Icons.Pixel size={18} />
              </button>
          </div>

          <div className="w-full h-px bg-gray-700 mb-3" />

          <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
            Size: {strokeWidth}px
          </div>
          <input 
              type="range" 
              min="1" 
              max="100" 
              value={strokeWidth} 
              onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
              className="w-full accent-[#FF3B30] h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Eraser / Text Size Popover (Simpler) */}
      {(activePopover === 'eraser' || activePopover === 'text') && (
        <div 
          className="fixed bg-[#252525] p-3 rounded-lg shadow-xl w-48 border border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: popoverPos.top, 
            left: popoverPos.left,
            transform: 'translateY(-50%)' 
          }}
        >
          <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">
            {getPopoverTitle(activePopover)}: {strokeWidth}px
          </div>
          <input 
              type="range" 
              min={activePopover === 'text' ? 12 : 1} 
              max={activePopover === 'text' ? 100 : 50} 
              value={strokeWidth} 
              onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
              className="w-full accent-[#FF3B30] h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Shape Popover */}
      {activePopover === 'shape' && (
        <div 
          className="fixed bg-[#252525] p-2 rounded-lg shadow-xl flex gap-2 border border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: popoverPos.top, 
            left: popoverPos.left,
            transform: 'translateY(-50%)' 
          }}
        >
           <div 
               onClick={() => { onSelectShapeType('rectangle'); setActivePopover(null); }}
               className={`p-2 rounded hover:bg-gray-700 cursor-pointer ${shapeType === 'rectangle' ? 'text-[#FF3B30] bg-gray-700' : 'text-gray-400'}`}
               title="Rectangle"
           >
               <Icons.Square size={20} />
           </div>
           <div 
               onClick={() => { onSelectShapeType('circle'); setActivePopover(null); }}
               className={`p-2 rounded hover:bg-gray-700 cursor-pointer ${shapeType === 'circle' ? 'text-[#FF3B30] bg-gray-700' : 'text-gray-400'}`}
               title="Circle"
           >
               <Icons.Circle size={20} />
           </div>
           <div 
               onClick={() => { onSelectShapeType('line'); setActivePopover(null); }}
               className={`p-2 rounded hover:bg-gray-700 cursor-pointer ${shapeType === 'line' ? 'text-[#FF3B30] bg-gray-700' : 'text-gray-400'}`}
               title="Line"
           >
               <Icons.Line size={20} />
           </div>
            {/* Shape Size */}
            <div className="w-px bg-gray-600 mx-1"></div>
            <div className="flex flex-col justify-center w-24 px-1">
               <span className="text-[10px] text-gray-500 mb-1">Stroke: {strokeWidth}</span>
               <input 
                   type="range" 
                   min="1" 
                   max="50" 
                   value={strokeWidth} 
                   onChange={(e) => { onChangeStrokeWidth(Number(e.target.value)); }}
                   className="w-full accent-[#FF3B30] h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
               />
            </div>
        </div>
      )}
    </>
  );
};
