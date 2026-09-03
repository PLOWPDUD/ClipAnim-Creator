import React, { useState } from 'react';
import { Icons } from '../Icons';
import { BackpackItem } from '../types';

interface QuickBackpackDockProps {
  isOpen: boolean;
  onClose: () => void;
  items: BackpackItem[];
  onSelectItem: (item: BackpackItem) => void;
  onStampOnLayer: (item: BackpackItem) => void;
  onOpenFullModal: () => void;
  onQuickCaptureSelection: () => void;
  onQuickPackLayer: () => void;
  onQuickPackFrame: () => void;
}

export const QuickBackpackDock: React.FC<QuickBackpackDockProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onStampOnLayer,
  onOpenFullModal,
  onQuickCaptureSelection,
  onQuickPackLayer,
  onQuickPackFrame
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isOpen) return null;

  const categories = ['all', 'favorites', 'mouths', 'faces', 'vfx', 'bubbles', 'characters'];

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return !!item.isFavorite;
    return item.category === selectedCategory;
  });

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-2xl w-[92%] bg-[#18181b]/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl z-40 p-2 text-white flex flex-col gap-1.5 animate-in slide-in-from-bottom-3 duration-200">
      
      {/* Top Header & Quick Actions */}
      <div className="flex items-center justify-between px-1.5 border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
            <Icons.Briefcase size={14} />
          </div>
          <span className="text-xs font-bold text-gray-200">Quick Backpack Stamp</span>
          <span className="text-[10px] bg-white/10 text-gray-300 font-mono px-1.5 py-0.2 rounded-full">
            {items.length}
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[280px]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'favorites' ? '⭐' : cat}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Quick Capture Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
              title="Quick Capture to Backpack"
            >
              <Icons.Plus size={13} />
              <span className="hidden sm:inline text-[10px]">Pack</span>
            </button>

            {isMenuOpen && (
              <div 
                className="absolute right-0 bottom-full mb-2 w-48 bg-[#222227] border border-white/15 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in"
                onClick={() => setIsMenuOpen(false)}
              >
                <button
                  onClick={onQuickCaptureSelection}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-left"
                >
                  <Icons.MousePointer2 size={13} className="text-blue-400" />
                  <span>Capture Selection</span>
                </button>
                <button
                  onClick={onQuickPackLayer}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-left"
                >
                  <Icons.Layers size={13} className="text-amber-400" />
                  <span>Pack Active Layer</span>
                </button>
                <button
                  onClick={onQuickPackFrame}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-left"
                >
                  <Icons.Image size={13} className="text-emerald-400" />
                  <span>Pack Full Frame</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onOpenFullModal}
            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs"
            title="Open Full Backpack Manager"
          >
            <Icons.Maximize2 size={13} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg"
            title="Close Quick Dock"
          >
            <Icons.X size={14} />
          </button>
        </div>
      </div>

      {/* Items Horizontal Scroll Strip */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar min-h-[64px]">
        {filteredItems.length === 0 ? (
          <div className="flex-1 text-center py-2 text-xs text-gray-400 flex items-center justify-center gap-2">
            <span>No items found.</span>
            <button
              onClick={onOpenFullModal}
              className="text-amber-400 underline hover:text-amber-300"
            >
              Open Backpack to add stamps
            </button>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className="group relative flex-shrink-0 w-14 h-14 bg-[#232329] border border-white/10 hover:border-amber-400 rounded-xl flex items-center justify-center p-1 cursor-pointer transition-all hover:scale-105 shadow-md overflow-hidden bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:6px_6px]"
              title={`${item.name || 'Item'} (Click to transform / Shift-click to stamp)`}
              onClick={(e) => {
                if (e.shiftKey) {
                  onStampOnLayer(item);
                } else {
                  onSelectItem(item);
                }
              }}
            >
              <img
                src={item.dataUrl}
                alt={item.name || 'Backpack Item'}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />

              {/* Badges */}
              {item.isFavorite && (
                <span className="absolute top-0.5 right-0.5 text-[8px] leading-none">⭐</span>
              )}

              {/* Hover Quick Actions */}
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item);
                  }}
                  className="w-full py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-bold rounded"
                  title="Transform on Canvas"
                >
                  Select
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStampOnLayer(item);
                  }}
                  className="w-full py-0.5 bg-white/20 hover:bg-white/30 text-white text-[8px] font-bold rounded"
                  title="Direct Stamp onto Layer"
                >
                  Stamp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
