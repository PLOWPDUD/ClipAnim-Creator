
import React, { useRef, useState, useEffect } from 'react';
import { ToolType, ShapeType } from '../types';
import { Icons } from './Icons';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
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
  const [activePopover, setActivePopover] = useState<ToolType | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Close popover when tool changes (e.g. via keyboard shortcut)
  useEffect(() => {
    setActivePopover(null);
  }, [currentTool]);

  const handleToolClick = (e: React.MouseEvent<HTMLButtonElement>, toolId: ToolType) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate position: right of the button
    const top = rect.top + rect.height / 2;
    const left = rect.right + 12; // 12px gap

    if (currentTool === toolId) {
      // Toggle popover for tools that have options
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

  const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: Icons.MousePointer2, label: 'Select (S)' },
    { id: 'pen', icon: Icons.Pencil, label: 'Pen (B)' },
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportImage(e.target.files[0]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPopoverTitle = (tool: ToolType) => {
      switch(tool) {
          case 'pen': return 'Pen Size';
          case 'eraser': return 'Eraser Size';
          case 'text': return 'Font Size';
          default: return 'Size';
      }
  };

  return (
    <>
      <div className="w-16 bg-[#1e1e1e] flex flex-col items-center py-4 space-y-4 border-r border-gray-700 z-20 shadow-xl overflow-y-auto no-scrollbar">
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

        <div className="w-8 h-px bg-gray-700 my-2" />

        {/* Transform Controls (Only visible when selection is active) */}
        {hasSelection ? (
          <>
              <button onClick={onRotate} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shrink-0" title="Rotate 90°">
                  <Icons.RotateCw size={20} />
              </button>
              <button onClick={onFlipHorizontal} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shrink-0" title="Flip Horizontal">
                  <Icons.FlipHorizontal size={20} />
              </button>
              <button onClick={onFlipVertical} className="p-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shrink-0" title="Flip Vertical">
                  <Icons.FlipVertical size={20} />
              </button>
              <div className="w-8 h-px bg-gray-700 my-2" />
          </>
        ) : (
          /* Color Picker */
          <>
            <div className="relative group">
              <input 
                  type="color" 
                  value={currentColor}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="w-10 h-10 rounded-full cursor-pointer border-2 border-white/20 p-0 overflow-hidden"
              />
            </div>
            
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
          </>
        )}

        {/* Toggles */}
        <button 
          onClick={onToggleOnionSkin}
          className={`p-3 rounded-xl transition-colors ${onionSkin ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Onion Skin"
        >
          <Icons.Ghost size={24} />
        </button>

        <button 
          onClick={onToggleGrid}
          className={`p-3 rounded-xl transition-colors ${showGrid ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Grid (G)"
        >
          <Icons.Grid size={24} />
        </button>

        <button 
          onClick={onToggleFocusMode}
          className={`p-3 rounded-xl transition-colors ${isFocusMode ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
          title="Focus Mode"
        >
          {isFocusMode ? <Icons.Minimize2 size={24} /> : <Icons.Maximize2 size={24} />}
        </button>
      </div>

      {/* FIXED POPOVERS */}
      {(activePopover === 'pen' || activePopover === 'eraser' || activePopover === 'text') && (
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
