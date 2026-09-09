import React, { useState } from 'react';
import { ToolType, ShapeType, BrushType, SymmetryMode, Actor, Layer, LayerFolder, BackgroundSettings, BackpackItem, SelectionState } from '../../types';
import { Icons } from '../../Icons';

interface AnimateRightDockProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentBrushType: BrushType;
  onSelectBrushType: (type: BrushType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fillOpacity: number;
  onChangeFillOpacity: (opacity: number) => void;
  fillTolerance: number;
  onChangeFillTolerance: (tolerance: number) => void;
  smoothing: number;
  onChangeSmoothing: (smoothing: number) => void;
  shapeType: ShapeType;
  onSelectShapeType: (type: ShapeType) => void;
  textToolFont: string;
  onSelectTextToolFont: (font: string) => void;
  textToolBold: boolean;
  setTextToolBold: (bold: boolean) => void;
  textToolItalic: boolean;
  setTextToolItalic: (italic: boolean) => void;
  symmetryMode: SymmetryMode;
  onSelectSymmetryMode: (mode: SymmetryMode) => void;
  canvasWidth: number;
  canvasHeight: number;
  setCanvasSize: (size: { width: number; height: number }) => void;
  fps: number;
  setFps: (fps: number) => void;
  background: BackgroundSettings;
  setBackground: (bg: BackgroundSettings) => void;
  actors: Actor[];
  onAddActor: (actor: Actor) => void;
  onRemoveActor: (id: string) => void;
  onEnterSymbolEditMode?: (actorId: string) => void;
  onOpenSpritesheetExport: () => void;
  onOpenAssetLibrary: () => void;
  layers: Layer[];
  layerFolders?: LayerFolder[];
  activeLayerId: string;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
  backpackItems: BackpackItem[];
  onStampBackpackItem: (item: BackpackItem) => void;
  onOpenBackpackModal: () => void;
  hasSelection: boolean;
  selection: SelectionState | null;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;
  onSelectionCommit: () => void;
  onSelectionDelete: () => void;
  onSelectionMakeSymbol?: () => void;
  onOpenProjectSettings?: () => void;
}

export const AnimateRightDock: React.FC<AnimateRightDockProps> = ({
  currentTool,
  currentBrushType,
  onSelectBrushType,
  strokeWidth,
  onChangeStrokeWidth,
  fillOpacity,
  onChangeFillOpacity,
  fillTolerance,
  onChangeFillTolerance,
  smoothing,
  onChangeSmoothing,
  shapeType,
  onSelectShapeType,
  textToolFont,
  onSelectTextToolFont,
  textToolBold,
  setTextToolBold,
  textToolItalic,
  setTextToolItalic,
  symmetryMode,
  onSelectSymmetryMode,
  canvasWidth,
  canvasHeight,
  setCanvasSize,
  fps,
  setFps,
  background,
  setBackground,
  actors,
  onRemoveActor,
  onEnterSymbolEditMode,
  onOpenSpritesheetExport,
  onOpenAssetLibrary,
  layers,
  activeLayerId,
  onUpdateLayerSettings,
  backpackItems,
  onStampBackpackItem,
  onOpenBackpackModal,
  hasSelection,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
  onSelectionMakeSymbol,
  onOpenProjectSettings
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'library' | 'layers' | 'backpack'>('properties');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(actors[0]?.id || null);

  const activeLayer = layers.find(l => l.id === activeLayerId);
  const selectedActor = actors.find(a => a.id === selectedActorId);

  const brushTypes: { id: BrushType; label: string }[] = [
    { id: 'pen', label: 'Ink Pen' },
    { id: 'marker', label: 'Marker' },
    { id: 'spray', label: 'Airbrush' },
    { id: 'pixel', label: 'Pixel Brush' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'oil', label: 'Oil Paint' },
    { id: 'calligraphy', label: 'Calligraphy' },
  ];

  const shapeTypes: { id: ShapeType; label: string }[] = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'circle', label: 'Oval / Circle' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'star', label: 'Star (5-point)' },
    { id: 'line', label: 'Line Segment' },
    { id: 'heart', label: 'Heart' },
    { id: 'speech-bubble', label: 'Callout Bubble' },
  ];

  const fontOptions = [
    { label: 'Sans-Serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Comic / Cursive', value: 'cursive' },
    { label: 'Impact Display', value: 'Impact, sans-serif' },
  ];

  const blendModes: { id: GlobalCompositeOperation; label: string }[] = [
    { id: 'source-over', label: 'Normal' },
    { id: 'multiply', label: 'Multiply' },
    { id: 'screen', label: 'Screen' },
    { id: 'overlay', label: 'Overlay' },
    { id: 'darken', label: 'Darken' },
    { id: 'lighten', label: 'Lighten' },
    { id: 'color-dodge', label: 'Color Dodge' },
    { id: 'color-burn', label: 'Color Burn' },
    { id: 'hard-light', label: 'Hard Light' },
    { id: 'difference', label: 'Difference' },
  ];

  return (
    <aside className="w-64 sm:w-72 bg-[#222222] border-l border-[#141414] select-none flex flex-col shrink-0 z-30 text-gray-200 text-xs shadow-xl">
      
      {/* Dock Tabs Header */}
      <div className="flex items-center bg-[#181818] border-b border-[#2d2d2d] px-1 py-1 gap-0.5 shrink-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'properties' 
              ? 'bg-[#2b2b2b] text-white border-b-2 border-b-[#E34F26] shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-[#222]'
          }`}
        >
          <Icons.Sliders size={13} className={activeTab === 'properties' ? 'text-[#E34F26]' : ''} />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'library' 
              ? 'bg-[#2b2b2b] text-white border-b-2 border-b-[#0078d7] shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-[#222]'
          }`}
        >
          <Icons.Library size={13} className={activeTab === 'library' ? 'text-[#0078d7]' : ''} />
          <span>Library ({actors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'layers' 
              ? 'bg-[#2b2b2b] text-white border-b-2 border-b-emerald-500 shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-[#222]'
          }`}
        >
          <Icons.Layers size={13} className={activeTab === 'layers' ? 'text-emerald-400' : ''} />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveTab('backpack')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'backpack' 
              ? 'bg-[#2b2b2b] text-white border-b-2 border-b-amber-500 shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-[#222]'
          }`}
        >
          <Icons.Briefcase size={13} className={activeTab === 'backpack' ? 'text-amber-400' : ''} />
          <span>Stamps</span>
        </button>
      </div>

      {/* Dock Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar bg-[#222222]">
        
        {/* ================= TAB 1: PROPERTIES (INSPECTOR) ================= */}
        {activeTab === 'properties' && (
          <div className="space-y-4 animate-in fade-in duration-100">
            
            {/* Tool Specific Inspector */}
            <div className="bg-[#1c1c1c] p-2.5 rounded-lg border border-[#2e2e2e] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-1.5">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Icons.PenTool size={12} className="text-[#E34F26]" />
                  Tool: <span className="text-white capitalize">{currentTool}</span>
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Options</span>
              </div>

              {/* When Pen/Brush Active */}
              {currentTool === 'pen' && (
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span>Stroke Size</span>
                      <span className="font-mono text-white font-bold">{strokeWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={strokeWidth}
                      onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
                      className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Brush Engine</label>
                    <select
                      value={currentBrushType}
                      onChange={(e) => onSelectBrushType(e.target.value as BrushType)}
                      className="w-full bg-[#141414] border border-[#333] text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-[#E34F26]"
                    >
                      {brushTypes.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span>Smoothing</span>
                      <span className="font-mono text-white font-bold">{Math.round(smoothing * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={smoothing}
                      onChange={(e) => onChangeSmoothing(Number(e.target.value))}
                      className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Symmetry Mirror</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['none', 'horizontal', 'vertical'] as SymmetryMode[]).map(m => (
                        <button
                          key={m}
                          onClick={() => onSelectSymmetryMode(m)}
                          className={`py-1 rounded text-[10px] font-semibold capitalize border ${
                            symmetryMode === m 
                              ? 'bg-[#E34F26] border-[#E34F26] text-white' 
                              : 'bg-[#141414] border-[#333] text-gray-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* When Eraser Active */}
              {currentTool === 'eraser' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Eraser Width</span>
                    <span className="font-mono text-white font-bold">{strokeWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={120}
                    value={strokeWidth}
                    onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
                    className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* When Paint Bucket Active */}
              {currentTool === 'fill' && (
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span>Fill Opacity</span>
                      <span className="font-mono text-white font-bold">{Math.round(fillOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={fillOpacity}
                      onChange={(e) => onChangeFillOpacity(Number(e.target.value))}
                      className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span>Fill Tolerance</span>
                      <span className="font-mono text-white font-bold">{fillTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={fillTolerance}
                      onChange={(e) => onChangeFillTolerance(Number(e.target.value))}
                      className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* When Shapes Active */}
              {currentTool === 'shape' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Primitive Shape</label>
                    <select
                      value={shapeType}
                      onChange={(e) => onSelectShapeType(e.target.value as ShapeType)}
                      className="w-full bg-[#141414] border border-[#333] text-white rounded px-2 py-1 text-xs focus:outline-none"
                    >
                      {shapeTypes.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span>Shape Stroke</span>
                      <span className="font-mono text-white font-bold">{strokeWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={40}
                      value={strokeWidth}
                      onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
                      className="w-full accent-[#E34F26] h-1.5 bg-[#121212] rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* When Text Tool Active */}
              {currentTool === 'text' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Font Family</label>
                    <select
                      value={textToolFont}
                      onChange={(e) => onSelectTextToolFont(e.target.value)}
                      className="w-full bg-[#141414] border border-[#333] text-white rounded px-2 py-1 text-xs focus:outline-none"
                    >
                      {fontOptions.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTextToolBold(!textToolBold)}
                      className={`flex-1 py-1 rounded font-bold border text-xs ${
                        textToolBold ? 'bg-[#0078d7] border-[#0078d7] text-white' : 'bg-[#141414] border-[#333] text-gray-400'
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      onClick={() => setTextToolItalic(!textToolItalic)}
                      className={`flex-1 py-1 rounded italic border text-xs ${
                        textToolItalic ? 'bg-[#0078d7] border-[#0078d7] text-white' : 'bg-[#141414] border-[#333] text-gray-400'
                      }`}
                    >
                      Italic
                    </button>
                  </div>
                </div>
              )}

              {/* Selection Transform Controls */}
              {hasSelection && (
                <div className="pt-2 border-t border-[#2e2e2e] space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Transform Selection</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={onFlipHorizontal} className="p-1 bg-[#141414] hover:bg-[#333] rounded text-center" title="Flip Horizontal">
                      <Icons.FlipHorizontal size={13} className="mx-auto" />
                    </button>
                    <button onClick={onFlipVertical} className="p-1 bg-[#141414] hover:bg-[#333] rounded text-center" title="Flip Vertical">
                      <Icons.FlipVertical size={13} className="mx-auto" />
                    </button>
                    <button onClick={onRotate} className="p-1 bg-[#141414] hover:bg-[#333] rounded text-center" title="Rotate 90">
                      <Icons.RotateCw size={13} className="mx-auto" />
                    </button>
                  </div>
                  {onSelectionMakeSymbol && (
                    <button
                      onClick={onSelectionMakeSymbol}
                      className="w-full py-1 bg-blue-600/20 hover:bg-blue-600/40 text-[#007AFF] border border-blue-500/40 rounded font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Icons.Box size={13} /> Convert to Symbol (F8)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Document Stage Properties */}
            <div className="bg-[#1c1c1c] p-2.5 rounded-lg border border-[#2e2e2e] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-1.5">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Icons.Sliders size={12} className="text-[#0078d7]" />
                  Stage Document
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Adobe FLA</span>
              </div>

              {/* Dimensions Input */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Canvas Size (px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1 bg-[#141414] border border-[#333] rounded px-2 py-1">
                    <span className="text-gray-500 text-[10px] font-mono">W:</span>
                    <input
                      type="number"
                      value={canvasWidth}
                      onChange={(e) => setCanvasSize({ width: Number(e.target.value) || 100, height: canvasHeight })}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-[#141414] border border-[#333] rounded px-2 py-1">
                    <span className="text-gray-500 text-[10px] font-mono">H:</span>
                    <input
                      type="number"
                      value={canvasHeight}
                      onChange={(e) => setCanvasSize({ width: canvasWidth, height: Number(e.target.value) || 100 })}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FPS Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span>Frame Rate (FPS)</span>
                  <span className="font-mono text-amber-300 font-bold">{fps} fps</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-[#121212] rounded cursor-pointer"
                />
              </div>

              {/* Stage Background Color */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span>Stage Color</span>
                  <span className="font-mono text-gray-300 text-[10px]">{background.color}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background.color}
                    onChange={(e) => setBackground({ ...background, color: e.target.value })}
                    className="w-7 h-7 rounded border border-gray-600 bg-transparent cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {['#ffffff', '#000000', '#222222', '#007AFF', '#34C759'].map(c => (
                      <button
                        key={c}
                        onClick={() => setBackground({ ...background, color: c })}
                        className="w-5 h-5 rounded border border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Document & Project Settings Button */}
              {onOpenProjectSettings && (
                <button
                  onClick={onOpenProjectSettings}
                  className="w-full mt-2 py-2 px-3 bg-[#2a2a2a] hover:bg-[#383838] border border-[#3e3e3e] text-amber-300 hover:text-white rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Icons.SlidersHorizontal size={14} className="text-amber-400" />
                  <span>Document & Project Settings...</span>
                </button>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 2: SYMBOL LIBRARY ================= */}
        {activeTab === 'library' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            {/* Symbol Preview Box */}
            <div className="bg-[#181818] p-2 rounded-lg border border-[#2e2e2e]">
              <div className="w-full aspect-video bg-[#121212] rounded flex items-center justify-center overflow-hidden border border-[#262626]">
                {selectedActor?.dataUrl ? (
                  <img src={selectedActor.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-600">Select symbol to preview</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-200 truncate">{selectedActor?.name || 'No symbol selected'}</span>
                <span className="text-gray-500 font-mono text-[10px] uppercase">{(selectedActor as any)?.type || 'graphic'}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAssetLibrary}
                className="flex-1 py-1.5 bg-[#0078d7] hover:bg-[#0063b1] text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Icons.Library size={13} /> Asset Library
              </button>
              <button
                onClick={onOpenSpritesheetExport}
                className="py-1.5 px-2 bg-[#2c2c2c] hover:bg-[#383838] text-gray-300 hover:text-white rounded border border-[#3e3e3e] text-xs transition-colors"
                title="Export Spritesheet Texture Atlas"
              >
                <Icons.LayoutGrid size={13} />
              </button>
            </div>

            {/* Symbols List */}
            <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
              {actors.map(actor => {
                const isSel = actor.id === selectedActorId;
                return (
                  <div
                    key={actor.id}
                    onClick={() => setSelectedActorId(actor.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer border transition-colors ${
                      isSel 
                        ? 'bg-[#0078d7]/20 border-[#0078d7] text-white font-semibold' 
                        : 'bg-[#1a1a1a] border-transparent hover:border-[#333] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icons.Box size={13} className="text-[#0078d7] shrink-0" />
                      <span className="truncate text-xs">{actor.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onEnterSymbolEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEnterSymbolEditMode(actor.id);
                          }}
                          className="p-1 hover:text-blue-400 rounded"
                          title="Edit Symbol Timeline"
                        >
                          <Icons.Film size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveActor(actor.id);
                        }}
                        className="p-1 hover:text-red-400 rounded"
                        title="Delete Symbol"
                      >
                        <Icons.Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {actors.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-xs">
                  No symbols yet. Press <kbd className="bg-black px-1 rounded text-white">F8</kbd> or use Convert to Symbol.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: LAYERS SETTINGS ================= */}
        {activeTab === 'layers' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            {activeLayer && (
              <div className="bg-[#1c1c1c] p-2.5 rounded-lg border border-[#2e2e2e] space-y-3">
                <div className="border-b border-[#2e2e2e] pb-1.5">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Active Layer Settings</span>
                  <span className="text-xs text-[#007AFF] font-bold">{activeLayer.name}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Layer Opacity</span>
                    <span className="font-mono text-white font-bold">{Math.round((activeLayer.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={activeLayer.opacity ?? 1}
                    onChange={(e) => onUpdateLayerSettings(activeLayer.id, Number(e.target.value), activeLayer.blendMode || 'source-over')}
                    className="w-full accent-emerald-500 h-1.5 bg-[#121212] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Blend Mode (Composite)</label>
                  <select
                    value={activeLayer.blendMode || 'source-over'}
                    onChange={(e) => onUpdateLayerSettings(activeLayer.id, activeLayer.opacity ?? 1, e.target.value as GlobalCompositeOperation)}
                    className="w-full bg-[#141414] border border-[#333] text-white rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    {blendModes.map(bm => (
                      <option key={bm.id} value={bm.id}>{bm.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: BACKPACK STAMPS ================= */}
        {activeTab === 'backpack' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <button
              onClick={onOpenBackpackModal}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Icons.Briefcase size={13} /> Open Full Backpack
            </button>

            <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto no-scrollbar">
              {backpackItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onStampBackpackItem(item)}
                  className="aspect-square bg-[#181818] hover:bg-[#282828] border border-[#2e2e2e] hover:border-amber-400 rounded p-1 flex flex-col items-center justify-center transition-all group"
                  title={item.name || 'Click to stamp on layer'}
                >
                  <img src={item.dataUrl} alt="" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                </button>
              ))}
            </div>

            {backpackItems.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-xs">
                Backpack is empty. Select art on canvas and pack it.
              </div>
            )}
          </div>
        )}

      </div>

    </aside>
  );
};
