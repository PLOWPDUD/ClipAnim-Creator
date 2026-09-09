import React, { useState } from 'react';
import { ToolType, ShapeType, BrushType, SymmetryMode } from '../../types';
import { Icons } from '../../Icons';

interface AnimateToolbarProps {
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
  symmetryMode: SymmetryMode;
  onSelectSymmetryMode: (mode: SymmetryMode) => void;
}

export const AnimateToolbar: React.FC<AnimateToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  showGrid,
  onToggleGrid,
  isFocusMode,
  onToggleFocusMode,
  hasSelection,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
  onSelectionCommit,
  onSelectionDelete,
  onSelectionMakeSymbol,
  onOpenHelp,
  onOpenCodeEditor
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);

  const toolButtons = [
    { id: 'select', name: 'Selection Tool (V)', icon: Icons.MousePointer, key: 'V' },
    { id: 'wand', name: 'Magic Wand / Subselect (W)', icon: Icons.Wand2, key: 'W' },
    { id: 'lasso', name: 'Lasso Tool (L)', icon: Icons.Lasso, key: 'L' },
    { id: 'pen', name: 'Fluid Brush / Pen (B)', icon: Icons.Brush, key: 'B' },
    { id: 'eraser', name: 'Eraser Tool (E)', icon: Icons.Eraser, key: 'E' },
    { id: 'fill', name: 'Paint Bucket (K)', icon: Icons.PaintBucket, key: 'K' },
    { id: 'shape', name: 'Shape Tool (U)', icon: Icons.Square, key: 'U' },
    { id: 'text', name: 'Text Tool (T)', icon: Icons.Type, key: 'T' },
    { id: 'eyedropper', name: 'Eyedropper (I)', icon: Icons.Pipette, key: 'I' },
    { id: 'motionPath', name: 'Motion Path / Pose (M)', icon: Icons.Zap, key: 'M' },
  ];

  const defaultSwatches = [
    '#000000', '#ffffff', '#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FFCC00', '#5AC8FA', '#8E8E93'
  ];

  return (
    <aside className="w-12 sm:w-14 bg-[#242424] border-r border-[#141414] select-none flex flex-col items-center py-2 shrink-0 z-30 shadow-md">
      
      {/* Tools Section Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
        {toolButtons.map(tool => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id as ToolType)}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-all relative ${
                isActive 
                  ? 'bg-[#0078d7] text-white shadow-sm ring-1 ring-white/50' 
                  : 'text-gray-400 hover:text-white hover:bg-[#333]'
              }`}
              title={tool.name}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-8 h-[1px] bg-[#383838] my-2" />

      {/* Adobe Overlapping Color Swatch Box */}
      <div className="flex flex-col items-center gap-1.5 relative">
        <div className="relative w-8 h-8">
          {/* Main Color Box */}
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-6 h-6 rounded border-2 border-white shadow-md absolute top-0 left-0 hover:scale-105 transition-transform"
            style={{ backgroundColor: currentColor }}
            title="Active Fill Color - Click to change"
          />
          {/* Secondary Stroke Box */}
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-5 h-5 rounded border border-gray-600 bg-black/80 absolute bottom-0 right-0 shadow-sm hover:scale-105 transition-transform"
            title="Active Stroke Color"
          />
        </div>

        {/* Default B/W and Swap Buttons */}
        <div className="flex items-center gap-1 mt-0.5">
          <button
            onClick={() => onChangeColor('#000000')}
            className="w-2.5 h-2.5 bg-black border border-white rounded-[1px]"
            title="Reset Default Black (D)"
          />
          <button
            onClick={() => onChangeColor(currentColor === '#000000' ? '#ffffff' : '#000000')}
            className="text-gray-400 hover:text-white p-0.5"
            title="Swap Colors (X)"
          >
            <Icons.RotateCw size={9} />
          </button>
        </div>

        {/* Color Popover */}
        {showColorPicker && (
          <div className="absolute left-full top-0 ml-2 p-2.5 bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl z-50 w-44 text-xs text-white">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#383838] mb-2 font-bold text-[11px]">
              <span>Color Palette</span>
              <button onClick={() => setShowColorPicker(false)} className="text-gray-400 hover:text-white">
                <Icons.X size={12} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {defaultSwatches.map(c => (
                <button
                  key={c}
                  onClick={() => { onChangeColor(c); setCustomColor(c); }}
                  className="w-6 h-6 rounded border border-black shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-[#383838]">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => { onChangeColor(e.target.value); setCustomColor(e.target.value); }}
                className="w-6 h-6 bg-transparent cursor-pointer border-0"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9A-F]{6}$/i.test(e.target.value)) onChangeColor(e.target.value);
                }}
                className="w-full bg-[#181818] border border-gray-700 px-1 py-0.5 rounded text-[10px] font-mono text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-8 h-[1px] bg-[#383838] my-2" />

      {/* Transform Options when Selection is Active */}
      {hasSelection && (
        <div className="flex flex-col items-center gap-1 mb-2 bg-[#1b1b1b] p-1 rounded border border-[#383838]">
          <button
            onClick={onFlipHorizontal}
            className="p-1 text-gray-300 hover:text-white hover:bg-[#333] rounded"
            title="Flip Horizontal"
          >
            <Icons.FlipHorizontal size={13} />
          </button>
          <button
            onClick={onFlipVertical}
            className="p-1 text-gray-300 hover:text-white hover:bg-[#333] rounded"
            title="Flip Vertical"
          >
            <Icons.FlipVertical size={13} />
          </button>
          <button
            onClick={onRotate}
            className="p-1 text-gray-300 hover:text-white hover:bg-[#333] rounded"
            title="Rotate 90°"
          >
            <Icons.RotateCw size={13} />
          </button>
          {onSelectionMakeSymbol && (
            <button
              onClick={onSelectionMakeSymbol}
              className="p-1 text-[#007AFF] hover:text-blue-300 hover:bg-blue-500/20 rounded"
              title="Convert to Symbol (F8)"
            >
              <Icons.Box size={13} />
            </button>
          )}
          <button
            onClick={onSelectionCommit}
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded"
            title="Commit Transform"
          >
            <Icons.Check size={13} />
          </button>
          <button
            onClick={onSelectionDelete}
            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
            title="Delete Selection"
          >
            <Icons.Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Bottom Modifiers / Helpers Section */}
      <div className="mt-auto flex flex-col items-center gap-1">
        {/* Grid Toggle */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded transition-colors ${
            showGrid ? 'text-[#0078d7] bg-[#0078d7]/20' : 'text-gray-400 hover:text-white hover:bg-[#333]'
          }`}
          title="Toggle Canvas Grid (Ctrl+')"
        >
          <Icons.Grid size={14} />
        </button>

        {/* Focus Mode */}
        <button
          onClick={onToggleFocusMode}
          className={`p-1.5 rounded transition-colors ${
            isFocusMode ? 'text-amber-400 bg-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-[#333]'
          }`}
          title="Focus Mode (F)"
        >
          <Icons.Maximize2 size={14} />
        </button>

        {/* Action Script Code Editor */}
        {onOpenCodeEditor && (
          <button
            onClick={onOpenCodeEditor}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Action Script Code Editor (F9)"
          >
            <Icons.Code size={14} />
          </button>
        )}

        {/* Help */}
        <button
          onClick={onOpenHelp}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
          title="Shortcuts & Help (F1)"
        >
          <Icons.Help size={14} />
        </button>
      </div>

    </aside>
  );
};
