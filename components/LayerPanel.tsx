import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, LayerFolder } from '../types';
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
  parentFolder?: LayerFolder;
  allFolders: LayerFolder[];
  onSelectLayer: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onMoveLayerToFolder: (layerId: string, folderId: string | null) => void;
  layersCount: number;
}

const FOLDER_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA', '#8E8E93'
];

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  layer,
  isActive,
  parentFolder,
  allFolders,
  onSelectLayer,
  onToggleLock,
  onToggleVisibility,
  onRemoveLayer,
  onDuplicateLayer,
  onUpdateLayerSettings,
  onRenameLayer,
  onMoveLayerToFolder,
  layersCount,
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(layer.name);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

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

  const isLockedByFolder = parentFolder?.isLocked ?? false;
  const isHiddenByFolder = parentFolder ? !parentFolder.isVisible : false;
  const isEffectivelyLocked = layer.isLocked || isLockedByFolder;
  const isEffectivelyVisible = layer.isVisible && !isHiddenByFolder;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-b border-gray-800/80 transition-colors
        ${parentFolder ? 'pl-5 bg-[#171717]' : 'bg-[#1e1e1e]'}
        ${isActive ? 'bg-[#FF3B30]/15 border-l-4 border-l-[#FF3B30]' : 'hover:bg-gray-800/70 border-l-4 border-l-transparent'}
        ${isDragging ? 'opacity-50 bg-gray-700 shadow-2xl' : ''}
      `}
    >
      {/* Header Row */}
      <div
        onClick={() => onSelectLayer(layer.id)}
        className="flex items-center justify-between p-2 cursor-pointer group select-none relative"
      >
        {/* Tree indicator line for nested items */}
        {parentFolder && (
          <div 
            className="absolute left-2.5 top-0 bottom-0 w-0.5" 
            style={{ backgroundColor: parentFolder.color || '#007AFF', opacity: 0.4 }} 
          />
        )}

        <div {...attributes} {...listeners} className="p-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <Icons.GripVertical size={13} />
        </div>

        {/* Layer icon / type indicator */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 ml-1">
          <div 
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: parentFolder?.color || (isActive ? '#FF3B30' : '#6b7280') }}
          />

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
              className="flex-1 bg-black/70 text-white text-xs px-1.5 py-0.5 outline-none border border-[#FF3B30] rounded"
            />
          ) : (
            <span 
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
              className={`truncate font-medium text-xs ${isActive ? 'text-[#FF3B30] font-bold' : isEffectivelyVisible ? 'text-gray-200' : 'text-gray-500'}`}
              title={`${layer.name}${parentFolder ? ` (${parentFolder.name})` : ''} (Double-click to rename)`}
            >
              {layer.name}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Move to Folder Button */}
          {allFolders.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowFolderMenu(!showFolderMenu); }}
                className={`p-1 rounded hover:bg-black/40 text-gray-500 hover:text-blue-400 transition-colors ${parentFolder ? 'text-blue-400' : ''}`}
                title="Organize / Move into Folder"
              >
                <Icons.FolderInput size={13} />
              </button>

              {showFolderMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 w-44 bg-[#252525] border border-gray-700 rounded-lg shadow-2xl py-1 z-[70] animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-700">
                    Move Layer to:
                  </div>
                  <button
                    onClick={() => { onMoveLayerToFolder(layer.id, null); setShowFolderMenu(false); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-700 flex items-center justify-between ${!layer.folderId ? 'text-[#FF3B30] font-bold' : 'text-gray-300'}`}
                  >
                    <span>Root (No Folder)</span>
                    {!layer.folderId && <Icons.Check size={12} />}
                  </button>
                  {allFolders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { onMoveLayerToFolder(layer.id, f.id); setShowFolderMenu(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-700 flex items-center justify-between gap-1.5 ${layer.folderId === f.id ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color || '#007AFF' }} />
                        <span className="truncate">{f.name}</span>
                      </div>
                      {layer.folderId === f.id && <Icons.Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lock Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
            disabled={isLockedByFolder}
            className={`p-1 rounded hover:bg-black/40 transition-colors ${
              isLockedByFolder 
                ? 'text-[#FF3B30]/60 cursor-not-allowed' 
                : layer.isLocked 
                  ? 'text-[#FF3B30]' 
                  : 'text-gray-500 hover:text-gray-300'
            }`}
            title={isLockedByFolder ? 'Locked by Parent Folder' : layer.isLocked ? t('layers.locked') : 'Lock Layer'}
          >
            {isEffectivelyLocked ? <Icons.Lock size={13} /> : <Icons.Unlock size={13} />}
          </button>

          {/* Visibility Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
            disabled={isHiddenByFolder}
            className={`p-1 rounded hover:bg-black/40 transition-colors ${
              isHiddenByFolder 
                ? 'text-gray-600 cursor-not-allowed' 
                : layer.isVisible 
                  ? 'text-gray-300 hover:text-white' 
                  : 'text-gray-600 hover:text-gray-400'
            }`}
            title={isHiddenByFolder ? 'Hidden by Parent Folder' : layer.isVisible ? t('layers.visible') : 'Hide Layer'}
          >
            {isEffectivelyVisible ? <Icons.Eye size={13} /> : <Icons.EyeOff size={13} />}
          </button>

          {/* Duplicate Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
            className="p-1 rounded hover:bg-black/40 text-gray-500 hover:text-blue-400 transition-colors"
            title={t('layers.duplicate')}
          >
            <Icons.Copy size={13} />
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
            disabled={layersCount <= 1}
            className={`p-1 rounded hover:bg-red-900/40 transition-colors ${layersCount <= 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400'}`}
            title={t('common.delete')}
          >
            <Icons.Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Extended Settings (Only for Active Layer) */}
      {isActive && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 bg-black/30 border-t border-gray-800/40 animate-in slide-in-from-top-1">
          {/* Opacity Slider */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide">
              <span>{t('layers.opacity')}</span>
              <span className="font-semibold text-white">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity}
              onChange={(e) => onUpdateLayerSettings(layer.id, parseFloat(e.target.value), layer.blendMode)}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none accent-[#FF3B30] cursor-pointer"
            />
          </div>

          {/* Blend Mode */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{t('layers.blendMode')}</span>
            <select
              value={layer.blendMode}
              onChange={(e) => onUpdateLayerSettings(layer.id, layer.opacity, e.target.value as GlobalCompositeOperation)}
              className="bg-black/60 text-xs text-gray-200 border border-gray-700 rounded px-2 py-1 outline-none focus:border-[#FF3B30]"
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
  layerFolders: LayerFolder[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: (folderId?: string | null) => void;
  onAddLayerFolder: (name?: string) => void;
  onDuplicateLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onRemoveLayerFolder: (folderId: string, deleteLayers?: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleFolderVisibility: (folderId: string) => void;
  onToggleFolderLock: (folderId: string) => void;
  onToggleFolderExpanded: (folderId: string) => void;
  onRenameLayerFolder: (folderId: string, name: string) => void;
  onSetLayerFolderColor: (folderId: string, color?: string) => void;
  onMoveLayerToFolder: (layerId: string, folderId: string | null) => void;
  onUpdateLayerSettings: (id: string, opacity: number, blendMode: GlobalCompositeOperation) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onReorderLayers: (newLayers: Layer[]) => void;
  onReorderLayerFolders?: (newFolders: LayerFolder[]) => void;
  onClose: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  layerFolders = [],
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onAddLayerFolder,
  onDuplicateLayer,
  onRemoveLayer,
  onRemoveLayerFolder,
  onToggleVisibility,
  onToggleLock,
  onToggleFolderVisibility,
  onToggleFolderLock,
  onToggleFolderExpanded,
  onRenameLayerFolder,
  onSetLayerFolderColor,
  onMoveLayerToFolder,
  onUpdateLayerSettings,
  onRenameLayer,
  onReorderLayers,
  onClose
}) => {
  const { t } = useTranslation();
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<LayerFolder | null>(null);

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

  // Top layer is at top of list
  const displayLayers = [...layers].reverse();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = displayLayers.findIndex((l) => l.id === active.id);
      const newIndex = displayLayers.findIndex((l) => l.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDisplayLayers = arrayMove(displayLayers, oldIndex, newIndex);
        onReorderLayers([...newDisplayLayers].reverse());
      }
    }
  };

  const handleFolderRenameSubmit = (folderId: string) => {
    if (editFolderName.trim() !== '') {
      onRenameLayerFolder(folderId, editFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const allVisible = layers.every(l => l.isVisible) && layerFolders.every(f => f.isVisible);
  const allLocked = layers.every(l => l.isLocked) && layerFolders.every(f => f.isLocked);

  const handleToggleAllVisibility = () => {
    const targetState = !allVisible;
    layers.forEach(l => {
      if (l.isVisible !== targetState) onToggleVisibility(l.id);
    });
    layerFolders.forEach(f => {
      if (f.isVisible !== targetState) onToggleFolderVisibility(f.id);
    });
  };

  const handleToggleAllLock = () => {
    const targetState = !allLocked;
    layers.forEach(l => {
      if (l.isLocked !== targetState) onToggleLock(l.id);
    });
    layerFolders.forEach(f => {
      if (f.isLocked !== targetState) onToggleFolderLock(f.id);
    });
  };

  return (
    <div className="absolute right-16 top-4 w-80 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 font-sans select-none">
      {/* Header */}
      <div className="p-3 bg-[#252525] flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Icons.Layers size={17} className="text-[#FF3B30]" />
          <h3 className="font-bold text-sm text-white">{t('layers.title')}</h3>
          <span className="text-[11px] text-gray-400 bg-black/40 px-2 py-0.5 rounded-full font-medium">
            {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
          </span>
        </div>
        
        {/* Header Action Tools */}
        <div className="flex items-center gap-1">
          {/* New Layer */}
          <button 
            onClick={() => onAddLayer(null)} 
            className="p-1.5 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" 
            title="New Layer"
          >
            <Icons.Plus size={16} />
          </button>
          
          {/* New Layer Folder (Adobe Animate Style) */}
          <button 
            onClick={() => onAddLayerFolder()} 
            className="p-1.5 hover:bg-gray-700 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors" 
            title="New Layer Folder"
          >
            <Icons.FolderPlus size={16} />
          </button>

          {/* Duplicate Active Layer */}
          <button 
            onClick={() => onDuplicateLayer(activeLayerId)} 
            className="p-1.5 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" 
            title={t('layers.duplicate')}
          >
            <Icons.Copy size={16} />
          </button>

          {/* Close */}
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" 
            title={t('common.close')}
          >
            <Icons.X size={16} />
          </button>
        </div>
      </div>

      {/* Global Visibility & Lock bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-gray-800 text-[11px] text-gray-400">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Timeline Hierarchy</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleAllLock}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title={allLocked ? "Unlock All Layers" : "Lock All Layers"}
          >
            {allLocked ? <Icons.Lock size={12} className="text-[#FF3B30]" /> : <Icons.Unlock size={12} />}
            <span>{allLocked ? 'Unlock All' : 'Lock All'}</span>
          </button>
          <button 
            onClick={handleToggleAllVisibility}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title={allVisible ? "Hide All Layers" : "Show All Layers"}
          >
            {allVisible ? <Icons.Eye size={12} className="text-blue-400" /> : <Icons.EyeOff size={12} />}
            <span>{allVisible ? 'Hide All' : 'Show All'}</span>
          </button>
        </div>
      </div>
      
      {/* Layers & Folders List */}
      <div className="max-h-[62vh] overflow-y-auto no-scrollbar divide-y divide-gray-800/60">
        {/* Layer Folders section */}
        {layerFolders.map(folder => {
          const containedLayers = layers.filter(l => l.folderId === folder.id);
          const isFolderActive = containedLayers.some(l => l.id === activeLayerId);

          return (
            <div key={folder.id} className="bg-[#1a1a1a] border-b border-gray-800">
              {/* Folder Header Row */}
              <div className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${isFolderActive ? 'bg-blue-500/10' : 'hover:bg-gray-800/60'}`}>
                {/* Folder Chevron & Icon */}
                <div 
                  onClick={() => onToggleFolderExpanded(folder.id)}
                  className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                  <button className="p-0.5 text-gray-400 hover:text-white">
                    {folder.isExpanded ? <Icons.ChevronDown size={14} /> : <Icons.ChevronRight size={14} />}
                  </button>

                  <div className="relative">
                    <Icons.Folder 
                      size={15} 
                      className="transition-colors flex-shrink-0"
                      style={{ color: folder.color || '#007AFF' }} 
                    />
                    <span 
                      className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: folder.color || '#007AFF' }}
                    />
                  </div>

                  {editingFolderId === folder.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onBlur={() => handleFolderRenameSubmit(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFolderRenameSubmit(folder.id);
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      className="bg-black/80 text-white text-xs px-1.5 py-0.5 outline-none border border-blue-500 rounded flex-1"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 truncate">
                      <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditFolderName(folder.name);
                        }}
                        className="font-bold text-xs text-gray-200 truncate"
                        title={`${folder.name} (Double-click to rename)`}
                      >
                        {folder.name}
                      </span>
                      <span className="text-[10px] text-gray-500 bg-black/40 px-1.5 py-0.2 rounded font-medium flex-shrink-0">
                        {containedLayers.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Folder Action Controls */}
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Add Layer inside Folder */}
                  <button
                    onClick={() => onAddLayer(folder.id)}
                    className="p-1 rounded hover:bg-black/40 text-gray-400 hover:text-green-400 transition-colors"
                    title={`Add New Layer inside "${folder.name}"`}
                  >
                    <Icons.Plus size={13} />
                  </button>

                  {/* Folder Color Tag Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setColorPickerFolderId(colorPickerFolderId === folder.id ? null : folder.id)}
                      className="p-1 rounded hover:bg-black/40 text-gray-400 hover:text-white transition-colors"
                      title="Set Folder Color"
                    >
                      <Icons.Palette size={13} />
                    </button>

                    {colorPickerFolderId === folder.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 p-2 bg-[#252525] border border-gray-700 rounded-lg shadow-2xl z-[70] flex gap-1.5 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {FOLDER_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => {
                              onSetLayerFolderColor(folder.id, c);
                              setColorPickerFolderId(null);
                            }}
                            className="w-4 h-4 rounded-full transition-transform hover:scale-125 border border-white/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Folder Lock */}
                  <button
                    onClick={() => onToggleFolderLock(folder.id)}
                    className={`p-1 rounded hover:bg-black/40 transition-colors ${folder.isLocked ? 'text-[#FF3B30]' : 'text-gray-500 hover:text-gray-300'}`}
                    title={folder.isLocked ? 'Folder Locked (All contained layers locked)' : 'Lock Folder'}
                  >
                    {folder.isLocked ? <Icons.Lock size={13} /> : <Icons.Unlock size={13} />}
                  </button>

                  {/* Folder Visibility */}
                  <button
                    onClick={() => onToggleFolderVisibility(folder.id)}
                    className={`p-1 rounded hover:bg-black/40 transition-colors ${folder.isVisible ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    title={folder.isVisible ? 'Folder Visible' : 'Folder Hidden (All contained layers hidden)'}
                  >
                    {folder.isVisible ? <Icons.Eye size={13} /> : <Icons.EyeOff size={13} />}
                  </button>

                  {/* Delete Folder */}
                  <button
                    onClick={() => setFolderToDelete(folder)}
                    className="p-1 rounded hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete Folder"
                  >
                    <Icons.Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Contained Layers in this Folder (if expanded) */}
              {folder.isExpanded && (
                <div className="divide-y divide-gray-800/40">
                  {containedLayers.length === 0 ? (
                    <div className="py-2.5 px-6 text-[11px] text-gray-500 italic bg-[#151515] flex items-center justify-between">
                      <span>Folder is empty</span>
                      <button 
                        onClick={() => onAddLayer(folder.id)}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        + Add Layer
                      </button>
                    </div>
                  ) : (
                    containedLayers.map(layer => (
                      <SortableLayerItem
                        key={layer.id}
                        layer={layer}
                        isActive={layer.id === activeLayerId}
                        parentFolder={folder}
                        allFolders={layerFolders}
                        onSelectLayer={onSelectLayer}
                        onToggleLock={onToggleLock}
                        onToggleVisibility={onToggleVisibility}
                        onRemoveLayer={onRemoveLayer}
                        onDuplicateLayer={onDuplicateLayer}
                        onUpdateLayerSettings={onUpdateLayerSettings}
                        onRenameLayer={onRenameLayer}
                        onMoveLayerToFolder={onMoveLayerToFolder}
                        layersCount={layers.length}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Root Level Layers (not in any folder) with DndContext */}
        {(() => {
          const rootLayers = displayLayers.filter(l => !l.folderId);
          if (rootLayers.length === 0 && layerFolders.length > 0) return null;

          return (
            <div>
              {layerFolders.length > 0 && (
                <div className="px-3 py-1 bg-[#181818] border-y border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Root Layers
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rootLayers.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rootLayers.map((layer) => (
                    <SortableLayerItem
                      key={layer.id}
                      layer={layer}
                      isActive={layer.id === activeLayerId}
                      parentFolder={undefined}
                      allFolders={layerFolders}
                      onSelectLayer={onSelectLayer}
                      onToggleLock={onToggleLock}
                      onToggleVisibility={onToggleVisibility}
                      onRemoveLayer={onRemoveLayer}
                      onDuplicateLayer={onDuplicateLayer}
                      onUpdateLayerSettings={onUpdateLayerSettings}
                      onRenameLayer={onRenameLayer}
                      onMoveLayerToFolder={onMoveLayerToFolder}
                      layersCount={layers.length}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          );
        })()}
      </div>

      {/* Delete Folder Dialog */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#222222] border border-gray-700 rounded-2xl p-5 max-w-xs w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Icons.Folder size={24} />
            </div>
            <h4 className="font-bold text-white text-base mb-1">Delete "{folderToDelete.name}"?</h4>
            <p className="text-xs text-gray-400 mb-5">
              Choose how you want to handle the layers inside this folder.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onRemoveLayerFolder(folderToDelete.id, false);
                  setFolderToDelete(null);
                }}
                className="w-full py-2.5 px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Delete Folder & Keep Layers (Unassign)
              </button>
              <button
                onClick={() => {
                  onRemoveLayerFolder(folderToDelete.id, true);
                  setFolderToDelete(null);
                }}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Delete Folder & All Contained Layers
              </button>
              <button
                onClick={() => setFolderToDelete(null)}
                className="w-full py-2 px-3 bg-transparent text-gray-400 hover:text-white text-xs transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
