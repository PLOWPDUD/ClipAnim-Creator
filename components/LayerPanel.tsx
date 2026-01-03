import React from 'react';
import { Layer } from '../types';
import { Icons } from './Icons';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onClose: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onRemoveLayer,
  onToggleVisibility,
  onToggleLock,
  onClose
}) => {
  // We reverse layers for display so Top layer is at the top of the list
  const displayLayers = [...layers].reverse();

  return (
    <div className="absolute right-16 top-4 w-64 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
      <div className="p-3 bg-[#252525] flex justify-between items-center border-b border-gray-700">
        <h3 className="font-bold text-sm">Layers</h3>
        <div className="flex items-center gap-2">
            <button onClick={onAddLayer} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white">
                <Icons.Plus size={16} />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white">
                <Icons.X size={16} />
            </button>
        </div>
      </div>
      
      <div className="max-h-60 overflow-y-auto no-scrollbar">
        {displayLayers.map((layer) => (
          <div 
            key={layer.id}
            onClick={() => onSelectLayer(layer.id)}
            className={`
              flex items-center justify-between p-2 border-b border-gray-800 cursor-pointer text-sm
              ${layer.id === activeLayerId ? 'bg-[#FF3B30]/20 border-l-4 border-l-[#FF3B30]' : 'hover:bg-gray-800 border-l-4 border-l-transparent'}
            `}
          >
            <span className={`truncate flex-1 font-medium ${layer.id === activeLayerId ? 'text-[#FF3B30]' : 'text-gray-300'}`}>
              {layer.name}
            </span>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                className={`p-1.5 rounded hover:bg-black/30 ${layer.isLocked ? 'text-[#FF3B30]' : 'text-gray-600'}`}
              >
                {layer.isLocked ? <Icons.Lock size={14} /> : <Icons.Unlock size={14} />}
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                className={`p-1.5 rounded hover:bg-black/30 ${layer.isVisible ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {layer.isVisible ? <Icons.Eye size={14} /> : <Icons.EyeOff size={14} />}
              </button>
              
               <button 
                onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                disabled={layers.length <= 1}
                className={`p-1.5 rounded hover:bg-red-900/50 ${layers.length <= 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400'}`}
              >
                <Icons.Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};