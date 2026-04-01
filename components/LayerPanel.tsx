import React from 'react';
import { Layer } from '../types';
import { Icons } from '../Icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableLayerItemProps {
  layer: Layer;
  isActive: boolean;
  onSelectLayer: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
  onRenameLayer: (id: string, newName: string) => void;
  layersCount: number;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  layer,
  isActive,
  onSelectLayer,
  onToggleLock,
  onToggleVisibility,
  onRemoveLayer,
  onDuplicateLayer,
  onUpdateLayerSettings,
  onRenameLayer,
  layersCount,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editNameValue, setEditNameValue] = React.useState(layer.name);

  const handleRenameSubmit = () => {
    if (editNameValue.trim() !== '') {
      onRenameLayer(layer.id, editNameValue.trim());
    } else {
      setEditNameValue(layer.name);
    }
    setIsEditingName(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  const blendModes: GlobalCompositeOperation[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-b border-gray-800 transition-colors
        ${isActive ? 'bg-[#FF3B30]/10 border-l-4 border-l-[#FF3B30]' : 'hover:bg-gray-800 border-l-4 border-l-transparent'}
        ${isDragging ? 'opacity-50 bg-gray-700 shadow-2xl' : ''}
      `}
    >
      {/* Header Row */}
      <div
        onClick={() => onSelectLayer(layer.id)}
        className="flex items-center justify-between p-2 cursor-pointer group"
      >
        <div {...attributes} {...listeners} className="p-1.5 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none">
          <Icons.GripVertical size={14} />
        </div>

        {isEditingName ? (
          <input
            autoFocus
            type="text"
            value={editNameValue}
            onChange={(e) => setEditNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setEditNameValue(layer.name);
                setIsEditingName(false);
              }
            }}
            className="flex-1 ml-1 bg-black/50 text-white text-sm px-1 py-0.5 outline-none border border-[#FF3B30] rounded"
          />
        ) : (
          <span 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
            className={`truncate flex-1 font-medium text-sm ml-1 ${isActive ? 'text-[#FF3B30]' : 'text-gray-300'}`}
          >
            {layer.name}
          </span>
        )}

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
            onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
            className="p-1.5 rounded hover:bg-black/30 text-gray-600 hover:text-blue-400"
            title="Duplicate Layer"
          >
            <Icons.Copy size={14} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
            disabled={layersCount <= 1}
            className={`p-1.5 rounded hover:bg-red-900/50 ${layersCount <= 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400'}`}
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
};

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onReorderLayers: (newLayers: Layer[]) => void;
  onClose: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onToggleVisibility,
  onToggleLock,
  onUpdateLayerSettings,
  onRenameLayer,
  onReorderLayers,
  onClose
}) => {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // We reverse layers for display so Top layer is at the top of the list
  // But dnd-kit works better with the actual order. 
  // However, the user expects the top item to be the top layer.
  // So we'll work with a reversed copy for the UI.
  const displayLayers = [...layers].reverse();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = displayLayers.findIndex((l) => l.id === active.id);
      const newIndex = displayLayers.findIndex((l) => l.id === over.id);
      
      const newDisplayLayers = arrayMove(displayLayers, oldIndex, newIndex);
      // Reverse back to original internal order (bottom to top)
      onReorderLayers([...newDisplayLayers].reverse());
    }
  };

  return (
    <div className="absolute right-16 top-4 w-72 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
      <div className="p-3 bg-[#252525] flex justify-between items-center border-b border-gray-700">
        <h3 className="font-bold text-sm text-white">Layers</h3>
        <div className="flex items-center gap-2">
            <button onClick={onAddLayer} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white" title="Add Layer">
                <Icons.Plus size={16} />
            </button>
            <button onClick={() => onDuplicateLayer(activeLayerId)} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white" title="Duplicate Layer">
                <Icons.Copy size={16} />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white" title="Close">
                <Icons.X size={16} />
            </button>
        </div>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayLayers.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayLayers.map((layer) => (
              <SortableLayerItem
                key={layer.id}
                layer={layer}
                isActive={layer.id === activeLayerId}
                onSelectLayer={onSelectLayer}
                onToggleLock={onToggleLock}
                onToggleVisibility={onToggleVisibility}
                onRemoveLayer={onRemoveLayer}
                onDuplicateLayer={onDuplicateLayer}
                onUpdateLayerSettings={onUpdateLayerSettings}
                onRenameLayer={onRenameLayer}
                layersCount={layers.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
