
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
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
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
  onUpdateLayerSettings,
  onClose
}) => {
  // We reverse layers for display so Top layer is at the top of the list
  const displayLayers = [...layers].reverse();

  const blendModes: GlobalCompositeOperation[] = [
      'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
  ];

  return (
    <div className="absolute right-16 top-4 w-72 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
      <div className="p-3 bg-[#252525] flex justify-between items-center border-b border-gray-700">
        <h3 className="font-bold text-sm text-white">Layers</h3>
        <div className="flex items-center gap-2">
            <button onClick={onAddLayer} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white" title="Add Layer">
                <Icons.Plus size={16} />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white" title="Close">
                <Icons.X size={16} />
            </button>
        </div>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
        {displayLayers.map((layer) => {
            const isActive = layer.id === activeLayerId;
            return (
            <div 
                key={layer.id}
                className={`
                    border-b border-gray-800 transition-colors
                    ${isActive ? 'bg-[#FF3B30]/10 border-l-4 border-l-[#FF3B30]' : 'hover:bg-gray-800 border-l-4 border-l-transparent'}
                `}
            >
                {/* Header Row */}
                <div 
                    onClick={() => onSelectLayer(layer.id)}
                    className="flex items-center justify-between p-2 cursor-pointer"
                >
                    <span className={`truncate flex-1 font-medium text-sm ${isActive ? 'text-[#FF3B30]' : 'text-gray-300'}`}>
                    {layer.name}
                    </span>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                            className={`p-1.5 rounded hover:bg-black/30 ${layer.isLocked ? 'text-[#FF3B30]' : 'text-gray-600'}`}
                            title={layer.isLocked ? "Unlock" : "Lock"}
                        >
                            {layer.isLocked ? <Icons.Lock size={14} /> : <Icons.Unlock size={14} />}
                        </button>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                            className={`p-1.5 rounded hover:bg-black/30 ${layer.isVisible ? 'text-gray-300' : 'text-gray-600'}`}
                            title={layer.isVisible ? "Hide" : "Show"}
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

                {/* Extended Settings (Only for Active Layer) */}
                {isActive && (
                    <div className="px-3 pb-3 pt-1 space-y-3 bg-black/20 animate-in slide-in-from-top-1">
                        {/* Opacity Slider */}
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide">
                                <span>Opacity</span>
                                <span>{Math.round(layer.opacity * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01"
                                value={layer.opacity}
                                onChange={(e) => onUpdateLayerSettings(layer.id, parseFloat(e.target.value), layer.blendMode)}
                                className="w-full h-1.5 bg-gray-600 rounded-full appearance-none accent-[#FF3B30] cursor-pointer"
                            />
                        </div>

                        {/* Blend Mode */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Blend Mode</span>
                            <select 
                                value={layer.blendMode}
                                onChange={(e) => onUpdateLayerSettings(layer.id, layer.opacity, e.target.value as GlobalCompositeOperation)}
                                className="bg-black/40 text-xs text-gray-300 border border-gray-600 rounded px-2 py-1 outline-none focus:border-[#FF3B30]"
                            >
                                {blendModes.map(mode => (
                                    <option key={mode} value={mode}>
                                        {mode.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
