import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolType, ShapeType, BrushType, SymmetryMode } from '../types';
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
  onImportVideo: (file: File) => void;
  hasSelection: boolean;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;
  onSelectionCommit: () => void;
  onSelectionDelete: () => void;
  onSelectionMakeSymbol?: () => void;
  shapeType: ShapeType;
  onSelectShapeType: (type: ShapeType) => void;
  onOpenHelp: () => void;
  onOpenCodeEditor?: () => void;
  textToolFont: string;
  onSelectTextToolFont: (font: string) => void;
  textToolBold: boolean;
  setTextToolBold: (bold: boolean) => void;
  textToolItalic: boolean;
  setTextToolItalic: (italic: boolean) => void;
  fillOpacity: number;
  onChangeFillOpacity: (opacity: number) => void;
  fillTolerance: number;
  onChangeFillTolerance: (tolerance: number) => void;
  smoothing: number;
  onChangeSmoothing: (smoothing: number) => void;
  symmetryMode: SymmetryMode;
  onSelectSymmetryMode: (mode: SymmetryMode) => void;
  customBrushes: string[];
  onAddCustomBrush: (brush: string) => void;
  isPainting?: boolean;
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
  onImportVideo,
  hasSelection,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
  onSelectionCommit,
  onSelectionDelete,
  onSelectionMakeSymbol,
  shapeType,
  onSelectShapeType,
  onOpenHelp,
  onOpenCodeEditor,
  textToolFont,
  onSelectTextToolFont,
  textToolBold,
  setTextToolBold,
  textToolItalic,
  setTextToolItalic,
  fillOpacity,
  onChangeFillOpacity,
  fillTolerance,
  onChangeFillTolerance,
  smoothing,
  onChangeSmoothing,
  symmetryMode,
  onSelectSymmetryMode,
  customBrushes,
  onAddCustomBrush,
  isPainting
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brushInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [activePopover, setActivePopover] = useState<ToolType | 'color' | 'symmetry' | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [colorTab, setColorTab] = useState<'wheel' | 'sliders' | 'palette'>('wheel');
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });
  const [secondaryColor, setSecondaryColor] = useState<string>('#FFFFFF');
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('clipanim_custom_palette');
        return saved ? JSON.parse(saved) : ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#00C7BE', '#FFCC00', '#000000', '#FFFFFF'];
    } catch {
        return ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#00C7BE', '#FFCC00', '#000000', '#FFFFFF'];
    }
  });

  const QUICK_PALETTE = ['#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE'];
  const BRUSH_SIZE_PRESETS = [2, 4, 8, 16, 24, 36, 64];

  const saveColorToPalette = () => {
    if (!savedColors.includes(currentColor)) {
        const newColors = [...savedColors, currentColor];
        setSavedColors(newColors);
        localStorage.setItem('clipanim_custom_palette', JSON.stringify(newColors));
    }
  };

  const removeColorFromPalette = (e: React.MouseEvent, colorToRemove: string) => {
    e.stopPropagation();
    const newColors = savedColors.filter(c => c !== colorToRemove);
    setSavedColors(newColors);
    localStorage.setItem('clipanim_custom_palette', JSON.stringify(newColors));
  };

  const swapColors = () => {
    const current = currentColor;
    onChangeColor(secondaryColor);
    setSecondaryColor(current);
  };

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
    const top = Math.min(window.innerHeight - 200, Math.max(80, rect.top + rect.height / 2));
    const left = rect.right + 12;
    if (currentTool === toolId && ['pen', 'eraser', 'shape', 'text', 'fill'].includes(toolId)) {
        setActivePopover(activePopover === toolId ? null : toolId);
    } else {
        onSelectTool(toolId);
    }
    setPopoverPos({ top, left });
  };

  const getShapeIcon = () => {
      switch (shapeType) {
          case 'circle': return Icons.Circle;
          case 'line': return Icons.Line;
          case 'triangle': return Icons.Triangle;
          case 'star': return Icons.Star;
          case 'hexagon': return Icons.Hexagon;
          case 'heart': return Icons.Heart;
          case 'arrow': return Icons.ArrowRight;
          case 'speech-bubble': return Icons.MessageCircle;
          default: return Icons.Square;
      }
  };

  const allTools: { id: ToolType; icon: React.ElementType; label: string; shortcut: string }[] = [
    { id: 'select', icon: Icons.MousePointer2, label: t('toolbar.select', 'Select & Move'), shortcut: 'V' },
    { id: 'lasso', icon: Icons.Lasso, label: t('toolbar.lasso', 'Lasso Select'), shortcut: 'L' },
    { id: 'wand', icon: Icons.Wand2, label: t('toolbar.wand', 'Magic Wand'), shortcut: 'W' },
    { id: 'pen', icon: Icons.Pencil, label: t('toolbar.brush', 'Brush / Pen'), shortcut: 'B' },
    { id: 'eraser', icon: Icons.Eraser, label: t('toolbar.eraser', 'Eraser'), shortcut: 'E' },
    { id: 'fill', icon: Icons.PaintBucket, label: t('toolbar.fill', 'Paint Bucket'), shortcut: 'G' },
    { id: 'eyedropper', icon: Icons.Eyedropper, label: t('toolbar.eyedropper', 'Color Picker'), shortcut: 'I' },
    { id: 'shape', icon: getShapeIcon(), label: t('toolbar.shapes', 'Vector Shapes'), shortcut: 'U' },
    { id: 'text', icon: Icons.Type, label: t('toolbar.text', 'Text Tool'), shortcut: 'T' },
    { id: 'motionPath', icon: Icons.Repeat, label: t('toolbar.motionPath', 'Motion Path'), shortcut: 'M' },
  ];

  const tools = isPainting ? allTools.filter(t => t.id !== 'motionPath') : allTools;

  const textFonts = [
      { label: t('globalSettings.systemDefault'), value: 'sans-serif' },
      { label: t('globalSettings.serif'), value: 'serif' },
      { label: t('globalSettings.monospace'), value: 'monospace' },
      { label: t('fonts.cursive'), value: 'cursive' },
      { label: t('fonts.fantasy'), value: 'fantasy' },
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
      <div id="tour-toolbar" className="w-16 min-w-[64px] bg-[#1a1a1a] flex flex-col h-full border-r border-gray-800/80 z-20 shadow-2xl select-none">
        
        {/* Scrollable Tools Stack */}
        <div id="tour-toolbar-tools" className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-3 space-y-2">
            {tools.map((tool) => {
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={(e) => handleToolClick(e, tool.id)}
                  className={`relative p-2.5 rounded-2xl transition-all shrink-0 group ${
                    isActive
                      ? 'text-white shadow-lg ring-2 ring-white/20'
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
                  }`}
                  style={isActive ? { backgroundColor: 'var(--accent-color, #007AFF)' } : {}}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <tool.icon size={22} />
                  
                  {/* Miniature tool badge indicator for popover-enabled tools */}
                  {['pen', 'eraser', 'shape', 'text', 'fill'].includes(tool.id) && isActive && (
                    <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
            
            <div className="w-8 h-px bg-gray-800 my-1 shrink-0" />

            {/* Symmetry Mirror Toggle */}
            <div id="tour-toolbar-symmetry" className="flex flex-col items-center gap-1.5">
              <button
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setPopoverPos({ top: r.top + r.height / 2, left: r.right + 12 });
                  setActivePopover(activePopover === 'symmetry' ? null : 'symmetry');
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                  symmetryMode !== 'none'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
                title="Symmetry & Mirror Guides"
              >
                <Icons.Sparkles size={18} />
              </button>
            </div>

            {/* Custom Brushes */}
            <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => brushInputRef.current?.click()}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  title="Import Custom Brush Texture"
                >
                  <Icons.Plus size={18} />
                </button>
                <input 
                    ref={brushInputRef} 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => onAddCustomBrush(e.target?.result as string);
                            reader.readAsDataURL(file);
                        }
                    }} 
                />
                {customBrushes.slice(0, 3).map((brush, index) => (
                    <img key={index} src={brush} alt={`Brush ${index}`} className="w-7 h-7 rounded-lg border border-gray-700 object-cover" />
                ))}
            </div>
            
            <div className="w-8 h-px bg-gray-800 my-1 shrink-0" />
            
            {/* Image Import */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all shrink-0"
              title={t('toolbar.importImage', 'Import Image Asset')}
            >
              <Icons.Image size={20} />
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => { if(e.target.files?.[0]) onImportImage(e.target.files[0]); if(fileInputRef.current) fileInputRef.current.value=''; }} 
            />

            {/* Video Import */}
            {!isPainting && (
              <>
                <button 
                  onClick={() => videoInputRef.current?.click()}
                  className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all shrink-0"
                  title={t('toolbar.importVideo', 'Import Video Frame Guide')}
                >
                  <Icons.FileVideo size={20} />
                </button>
                <input 
                  ref={videoInputRef} 
                  type="file" 
                  accept="video/mp4" 
                  className="hidden" 
                  onChange={(e) => { if(e.target.files?.[0]) onImportVideo(e.target.files[0]); if(videoInputRef.current) videoInputRef.current.value=''; }} 
                />
              </>
            )}

            <div className="w-8 h-px bg-gray-800 my-1 shrink-0" />

            {/* Dual Primary / Secondary Color Pill */}
            <div className="relative flex items-center justify-center my-1">
              <button 
                  id="tour-toolbar-color"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setPopoverPos({ top: r.top + r.height/2, left: r.right+12 });
                    setActivePopover(activePopover === 'color' ? null : 'color');
                  }} 
                  className="w-8 h-8 rounded-full border-2 border-white/40 shadow-lg shrink-0 transition-transform active:scale-95 cursor-pointer z-10" 
                  style={{ backgroundColor: currentColor }} 
                  title="Primary Color Palette"
              />
              <button
                onClick={swapColors}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-gray-600 shadow-md transition-transform hover:scale-110 active:scale-90"
                style={{ backgroundColor: secondaryColor }}
                title="Swap with Secondary Color (X)"
              />
            </div>

            {/* Quick Palette Swatch Dots */}
            <div className="grid grid-cols-2 gap-1 px-2 pt-1">
              {QUICK_PALETTE.slice(0, 6).map((c, i) => (
                <button
                  key={i}
                  onClick={() => onChangeColor(c)}
                  className="w-4 h-4 rounded-md border border-gray-700/80 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {hasSelection && (
            <div className="flex flex-col gap-1.5 shrink-0 mt-2 bg-gray-900/90 p-1.5 rounded-2xl border border-gray-800">
                <button onClick={onSelectionCommit} className="p-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-md" title={t('tooltips.commitSelection', 'Commit Selection (Enter)')}>
                    <Icons.Check size={18} />
                </button>
                <button onClick={onSelectionDelete} className="p-2 rounded-xl text-white bg-red-600 hover:bg-red-500 shadow-md" title={t('tooltips.deselect', 'Delete Selection (Del)')}>
                    <Icons.Trash2 size={18} />
                </button>
                {onSelectionMakeSymbol && (
                  <button onClick={onSelectionMakeSymbol} className="p-2 rounded-xl text-white bg-amber-600 hover:bg-amber-500 shadow-md" title="Convert to Interactive Symbol">
                      <Icons.Box size={18} />
                  </button>
                )}
                <button onClick={onRotate} className="p-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md" title={t('tooltips.rotate', 'Rotate 90°')}>
                    <Icons.RotateCw size={18} />
                </button>
                <button onClick={onFlipHorizontal} className="p-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md" title={t('tooltips.flipH', 'Flip Horizontal')}>
                    <Icons.FlipHorizontal size={18} />
                </button>
                <button onClick={onFlipVertical} className="p-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md" title={t('tooltips.flipV', 'Flip Vertical')}>
                    <Icons.FlipVertical size={18} />
                </button>
            </div>
            )}

            <div className="w-8 h-px bg-gray-800 my-1 shrink-0" />

            {/* Onion Skin & Grid Toggles */}
            {!isPainting && (
              <button
                onClick={onToggleOnionSkin}
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                  onionSkin ? 'text-white bg-[var(--accent-color)] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={t('toolbar.onionSkin', 'Toggle Onion Skinning (O)')}
              >
                <Icons.Ghost size={20} />
              </button>
            )}
            
            <button
              onClick={onToggleGrid}
              className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                showGrid ? 'text-white bg-[var(--accent-color)] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={t('toolbar.grid', 'Toggle Alignment Grid (G)')}
            >
              <Icons.Grid size={20} />
            </button>

            <button
              onClick={onToggleFocusMode}
              className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                isFocusMode ? 'text-white bg-[var(--accent-color)] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={t('toolbar.focusMode', 'Focus Mode (F)')}
            >
              {isFocusMode ? <Icons.Minimize2 size={20} /> : <Icons.Maximize2 size={20} />}
            </button>
        </div>

        {/* Bottom Pinned Help & Code Actions */}
        <div className="shrink-0 p-2 border-t border-gray-800/80 flex flex-col items-center gap-1 bg-[#1a1a1a]">
            {onOpenCodeEditor && (
                <button
                  id="tour-toolbar-script"
                  onClick={onOpenCodeEditor}
                  className="p-2.5 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all border border-amber-500/20"
                  title="Open Interactive Script IDE"
                >
                    <Icons.Code size={20} />
                </button>
            )}
            <button
              onClick={onOpenHelp}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title={t('toolbar.help', 'Help & Keyboard Shortcuts')}
            >
                <Icons.Help size={20} />
            </button>
        </div>
      </div>

      {/* Popover: Color Palette */}
      {activePopover === 'color' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-64 border border-gray-700/80 z-50 flex flex-col gap-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.Palette size={15} className="text-amber-400" />
                Color Master
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
            </div>

            <div className="flex bg-gray-800/90 p-1 rounded-xl">
                <button onClick={() => setColorTab('wheel')} className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${colorTab === 'wheel' ? 'bg-[var(--accent-color)] text-white shadow' : 'text-gray-400'}`}>{t('toolbar.wheel')}</button>
                <button onClick={() => setColorTab('sliders')} className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${colorTab === 'sliders' ? 'bg-[var(--accent-color)] text-white shadow' : 'text-gray-400'}`}>{t('toolbar.sliders')}</button>
                <button onClick={() => setColorTab('palette')} className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${colorTab === 'palette' ? 'bg-[var(--accent-color)] text-white shadow' : 'text-gray-400'}`}>{t('toolbar.palette')}</button>
            </div>

            {colorTab === 'wheel' && (
                <div className="flex flex-col items-center py-1">
                    <div className="relative w-48 h-48 touch-none">
                        <div ref={wheelRef} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleWheelPointerUpdate(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) handleWheelPointerUpdate(e); }} className="absolute inset-0 rounded-full border border-gray-700 shadow-inner" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                             <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md bg-transparent" style={{ left: '50%', top: '5%', transformOrigin: '0 90px', transform: `translate(-50%, -50%) rotate(${hsv.h}deg)` }} />
                        </div>
                        <div className="absolute inset-0 m-auto w-26 h-26 bg-[#222222] rounded-xl flex items-center justify-center overflow-hidden border border-gray-700 shadow-inner">
                             <div ref={svRef} onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); handleSvPointerUpdate(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) handleSvPointerUpdate(e); }} className="w-full h-full relative" style={{ backgroundColor: hsvToHex(hsv.h, 100, 100), backgroundImage: 'linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)' }}>
                                 <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
                             </div>
                        </div>
                    </div>
                    <div className="w-full mt-3 flex items-center justify-between text-xs font-mono bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800">
                      <span className="text-gray-400">HEX</span>
                      <span className="text-white font-bold">{currentColor.toUpperCase()}</span>
                    </div>
                </div>
            )}
            {colorTab === 'sliders' && (
                <div className="space-y-3 py-1">
                    <div className="w-full h-20 rounded-xl overflow-hidden border border-gray-700 relative shadow-inner">
                        <input type="color" value={currentColor} onChange={(e) => onChangeColor(e.target.value)} className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] p-0 m-0 border-none cursor-crosshair" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800">
                      <span className="text-gray-400">Selected</span>
                      <span className="text-white font-bold">{currentColor.toUpperCase()}</span>
                    </div>
                </div>
            )}
            {colorTab === 'palette' && (
                <div className="flex flex-col gap-3 py-1">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-gray-600 shrink-0" style={{ backgroundColor: currentColor }} />
                        <button onClick={saveColorToPalette} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm">
                            <Icons.Plus size={14} /> {t('toolbar.saveColor')}
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                        {savedColors.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => onChangeColor(c)}
                                className="relative w-full aspect-square rounded-lg border border-gray-700 hover:scale-110 transition-transform group"
                                style={{ backgroundColor: c }}
                            >
                                <div 
                                    onClick={(e) => removeColorFromPalette(e, c)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                >
                                    <Icons.X size={10} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Popover: Symmetry Mode Selector */}
      {activePopover === 'symmetry' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-60 border border-gray-700/80 z-50 flex flex-col gap-3 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
          <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Icons.Sparkles size={15} className="text-purple-400" />
              Symmetry Guides
            </span>
            <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
              <Icons.X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { id: 'none', label: 'Disabled (Off)', desc: 'Standard freehand drawing' },
              { id: 'vertical', label: 'Vertical Mirror (Left-Right)', desc: 'Mirrors across center Y-axis' },
              { id: 'horizontal', label: 'Horizontal Mirror (Top-Bottom)', desc: 'Mirrors across center X-axis' },
              { id: 'quad', label: '4-Way Quad Mirror', desc: '4-quadrant reflection' },
              { id: 'radial', label: '8-Way Kaleidoscope', desc: 'Radial circular symmetry' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { onSelectSymmetryMode(item.id as SymmetryMode); setActivePopover(null); }}
                className={`p-2.5 rounded-xl text-left text-xs transition-all flex flex-col ${
                  symmetryMode === item.id
                    ? 'bg-purple-600 text-white font-bold shadow-md'
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] opacity-75 font-normal">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popover: Pen / Brush Settings */}
      {activePopover === 'pen' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-68 border border-gray-700/80 z-50 flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.Pencil size={15} className="text-blue-400" />
                Brush Dynamics
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
                {[
                    { type: 'pen', icon: Icons.Pencil, label: 'Pen' },
                    { type: 'marker', icon: Icons.Marker, label: 'Marker' },
                    { type: 'highlighter', icon: Icons.Highlighter, label: 'Highlight' },
                    { type: 'spray', icon: Icons.Spray, label: 'Spray' },
                    { type: 'pixel', icon: Icons.Pixel, label: 'Pixel' },
                    { type: 'watercolor', icon: Icons.Image, label: 'Water' },
                    { type: 'oil', icon: Icons.Palette, label: 'Oil' },
                    { type: 'calligraphy', icon: Icons.Type, label: 'Calli' },
                ].map((b) => (
                    <button 
                        key={b.type}
                        onClick={() => onSelectBrushType(b.type as BrushType)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${currentBrushType === b.type ? 'bg-[var(--accent-color)] text-white shadow-md' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'}`}
                        title={b.label}
                    >
                        <b.icon size={18} />
                        <span className="text-[9px] font-semibold">{b.label}</span>
                    </button>
                ))}
            </div>

            {/* Quick Size Presets */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                  <span>{t('toolbar.size', 'Brush Size')}</span>
                  <span className="text-white font-mono">{strokeWidth}px</span>
              </div>
              <div className="flex gap-1 mb-2">
                {BRUSH_SIZE_PRESETS.map(size => (
                  <button
                    key={size}
                    onClick={() => onChangeStrokeWidth(size)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                      strokeWidth === size ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <input type="range" min="1" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            {/* Smoothing / Stabilizer */}
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.smoothing', 'Stroke Stabilizer')}</span>
                    <span className="text-white font-mono">{smoothing}%</span>
                </div>
                <input type="range" min="0" max="100" value={smoothing} onChange={(e) => onChangeSmoothing(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}

      {/* Popover: Eraser Settings */}
      {activePopover === 'eraser' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-56 border border-gray-700/80 z-50 flex flex-col gap-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.Eraser size={15} className="text-red-400" />
                Eraser Radius
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.size')}</span>
                    <span className="text-white font-mono">{strokeWidth}px</span>
                </div>
                <input type="range" min="1" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}

      {/* Popover: Fill Settings */}
      {activePopover === 'fill' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-60 border border-gray-700/80 z-50 flex flex-col gap-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.PaintBucket size={15} className="text-emerald-400" />
                Paint Fill Settings
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.opacity')}</span>
                    <span className="text-white font-mono">{Math.round(fillOpacity * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={fillOpacity} onChange={(e) => onChangeFillOpacity(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="w-full h-px bg-gray-700/80" />
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.tolerance')}</span>
                    <span className="text-white font-mono">{fillTolerance}%</span>
                </div>
                <input type="range" min="0" max="100" value={fillTolerance} onChange={(e) => onChangeFillTolerance(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}

      {/* Popover: Shape Settings */}
      {activePopover === 'shape' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-64 border border-gray-700/80 z-50 flex flex-col gap-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
             <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.Square size={15} className="text-purple-400" />
                Geometry Shapes
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
             </div>
             <div className="grid grid-cols-3 gap-1.5">
                {[
                    { type: 'rectangle', icon: Icons.Square },
                    { type: 'circle', icon: Icons.Circle },
                    { type: 'line', icon: Icons.Line },
                    { type: 'triangle', icon: Icons.Triangle },
                    { type: 'star', icon: Icons.Star },
                    { type: 'hexagon', icon: Icons.Hexagon },
                    { type: 'heart', icon: Icons.Heart },
                    { type: 'arrow', icon: Icons.ArrowRight },
                    { type: 'speech-bubble', icon: Icons.MessageCircle },
                ].map((s) => (
                    <button 
                        key={s.type}
                        onClick={() => onSelectShapeType(s.type as ShapeType)}
                        className={`p-2 rounded-xl flex items-center justify-center transition-colors ${shapeType === s.type ? 'bg-[var(--accent-color)] text-white shadow-md' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'}`}
                        title={s.type}
                    >
                        <s.icon size={20} />
                    </button>
                ))}
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.strokeWidth')}</span>
                    <span className="text-white font-mono">{strokeWidth}px</span>
                </div>
                <input type="range" min="1" max="50" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
        </div>
      )}
      
      {/* Popover: Text Settings */}
      {activePopover === 'text' && (
        <div className="fixed bg-[#222222] p-4 rounded-2xl shadow-2xl w-60 border border-gray-700/80 z-50 flex flex-col gap-3.5 text-gray-200 animate-in fade-in zoom-in-95 duration-150" style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateY(-50%)' }}>
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icons.Type size={15} className="text-blue-400" />
                Typography
              </span>
              <button onClick={() => setActivePopover(null)} className="text-gray-400 hover:text-white">
                <Icons.X size={15} />
              </button>
            </div>
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.fontSize')}</span>
                    <span className="text-white font-mono">{strokeWidth}px</span>
                </div>
                <input type="range" min="10" max="100" value={strokeWidth} onChange={(e) => onChangeStrokeWidth(Number(e.target.value))} className="w-full accent-[var(--accent-color)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
             <div className="flex gap-2">
                <button 
                    onClick={() => setTextToolBold(!textToolBold)}
                    className={`flex-1 p-2 rounded-xl border transition-colors flex items-center justify-center ${textToolBold ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-md' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    title={t('fonts.bold')}
                >
                    <Icons.Bold size={18} />
                </button>
                <button 
                    onClick={() => setTextToolItalic(!textToolItalic)}
                    className={`flex-1 p-2 rounded-xl border transition-colors flex items-center justify-center ${textToolItalic ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-md' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    title={t('fonts.italic')}
                >
                    <Icons.Italic size={18} />
                </button>
             </div>
             <div className="w-full h-px bg-gray-700/80" />
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                    <span>{t('toolbar.fontFamily')}</span>
                </div>
                <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
                    {textFonts.map(f => (
                        <button
                            key={f.value}
                            onClick={() => onSelectTextToolFont(f.value)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${textToolFont === f.value ? 'bg-[var(--accent-color)] text-white font-bold' : 'text-gray-300 hover:bg-gray-700'}`}
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
