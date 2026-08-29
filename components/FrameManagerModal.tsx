import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Frame, BackgroundSettings, Layer } from '../types';
import { Icons } from '../Icons';
import JSZip from 'jszip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const FRAME_COLOR_TAGS = [
  { id: 'red', name: 'Red (Keyframe)', color: '#FF3B30' },
  { id: 'orange', name: 'Orange (Breakdown)', color: '#FF9500' },
  { id: 'yellow', name: 'Yellow (Inbetween)', color: '#FFCC00' },
  { id: 'green', name: 'Green (Start/End)', color: '#34C759' },
  { id: 'cyan', name: 'Cyan (Action)', color: '#5AC8FA' },
  { id: 'blue', name: 'Blue (Pose)', color: '#007AFF' },
  { id: 'purple', name: 'Purple (Anticipation)', color: '#AF52DE' },
  { id: 'pink', name: 'Pink (Impact)', color: '#FF2D55' },
];

export const PRESET_FRAME_LABELS = [
  'Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Land', 'Attack', 'Hit', 'Impact', 'Block', 'Die', 'Special', 'Loop'
];

interface FrameManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  fps?: number;
  layers?: Layer[];
  onDeleteFrames: (indices: number[]) => void;
  onDuplicateFrames: (indices: number[]) => void;
  onReorderFrames: (frames: Frame[]) => void;
  onUpdateFrameBackground: (indices: number[], background: BackgroundSettings, backgroundImage: string | null) => void;
  onUpdateFrameDuration?: (indices: number[], multiplier: number) => void;
  onUpdateFrameLabel?: (indices: number[], label: string, colorTag?: string) => void;
  onReverseFrames?: (indices?: number[]) => void;
  onFlipFrames?: (indices: number[], horizontal: boolean) => void;
  onApplyFilterToFrames?: (indices: number[], filterType: 'grayscale' | 'invert' | 'sepia' | 'brightness') => void;
  onInsertBlankFrames?: (afterIndex: number, count: number) => void;
  onCropFramesToSelection?: (indices: number[]) => void;
  onSelectFrame?: (index: number) => void;
}

interface SortableFrameItemProps {
  frame: Frame;
  index: number;
  isSelected: boolean;
  gridCols: number;
  toggleSelection: (index: number, e: React.MouseEvent) => void;
  onQuickJump?: (index: number) => void;
}

const SortableFrameItem: React.FC<SortableFrameItemProps> = ({
  frame,
  index,
  isSelected,
  toggleSelection,
  onQuickJump
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: frame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  const tagColor = FRAME_COLOR_TAGS.find(t => t.id === frame.colorTag || t.color === frame.colorTag)?.color;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`relative aspect-[4/3] group cursor-pointer transition-all duration-150 rounded-xl overflow-hidden border-2 select-none ${
        isSelected 
          ? 'border-[#FF3B30] ring-4 ring-[#FF3B30]/30 transform scale-[1.02] shadow-xl shadow-[#FF3B30]/20' 
          : 'border-gray-700/80 hover:border-gray-500 bg-[#161616]'
      } ${isDragging ? 'opacity-40 ring-4 ring-blue-500 shadow-2xl' : ''}`}
      onClick={(e) => toggleSelection(index, e)}
    >
      {/* Drag handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 right-2 z-20 p-1 bg-black/70 hover:bg-black/90 text-gray-400 hover:text-white rounded-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder frame"
        onClick={(e) => e.stopPropagation()}
      >
        <Icons.GripVertical size={13} />
      </div>

      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-20">
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
          isSelected 
            ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-md' 
            : 'bg-black/60 border-gray-500 group-hover:border-white text-transparent'
        }`}>
          {isSelected && <Icons.Check size={13} className="stroke-[3]" />}
        </div>
      </div>

      {/* Color Tag Ribbon / Marker (Adobe Animate Style) */}
      {tagColor && (
        <div 
          className="absolute top-0 right-0 left-0 h-1.5 z-10"
          style={{ backgroundColor: tagColor }}
          title={`Tag: ${frame.colorTag}`}
        />
      )}

      {/* Frame Canvas Thumbnail & Background */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ 
          background: (frame.background || { type: 'color', color: '#ffffff' }).type === 'gradient3' 
            ? ((frame.background || { type: 'color', color: '#ffffff' }).gradientColors 
                ? `linear-gradient(to bottom right, ${(frame.background || { type: 'color', color: '#ffffff' }).gradientColors!.join(', ')})` 
                : '#ffffff') 
            : ((frame.background || { type: 'color', color: '#ffffff' }).color === 'transparent' 
                ? 'repeating-conic-gradient(#222 0% 25%, #181818 0% 50%) 50% / 12px 12px' 
                : (frame.background || { type: 'color', color: '#ffffff' }).color)
        }}
      >
        {frame.backgroundImage && (
          <img src={frame.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        )}
        {frame.thumbnailUrl ? (
          <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} className="relative w-full h-full object-contain pointer-events-none" />
        ) : (
          <span className="text-[10px] text-gray-500 font-mono">Empty Frame</span>
        )}
      </div>

      {/* Frame Details Overlay Footer */}
      <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-black shadow-black drop-shadow-md font-mono">
            #{index + 1}
          </span>
          {frame.label && (
            <span 
              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full truncate max-w-[80px] shadow"
              style={{ backgroundColor: tagColor || '#4b5563' }}
            >
              {frame.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Duration Multiplier / Hold badge */}
          {(frame.durationMultiplier && frame.durationMultiplier > 1) && (
            <span className="text-[10px] font-bold bg-amber-500/80 text-black px-1 rounded shadow">
              {frame.durationMultiplier}x
            </span>
          )}

          {/* Quick jump to frame */}
          {onQuickJump && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickJump(index); }}
              className="p-1 hover:bg-white/20 rounded text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Open this frame in editor"
            >
              <Icons.ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const FrameManagerModal: React.FC<FrameManagerModalProps> = ({
  isOpen,
  onClose,
  frames,
  fps = 12,
  layers: _layers = [],
  onDeleteFrames,
  onDuplicateFrames,
  onReorderFrames,
  onUpdateFrameBackground,
  onUpdateFrameDuration,
  onUpdateFrameLabel,
  onReverseFrames,
  onFlipFrames,
  onApplyFilterToFrames,
  onInsertBlankFrames,
  onCropFramesToSelection,
  onSelectFrame
}) => {
  const { t } = useTranslation();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'filmstrip' | 'list'>('grid');
  const [gridCols, setGridCols] = useState(4);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCropConfirm, setShowCropConfirm] = useState(false);

  // Background Modal
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [tempBackground, setTempBackground] = useState<BackgroundSettings>({ type: 'color', color: '#ffffff' });
  const [tempBackgroundImage, setTempBackgroundImage] = useState<string | null>(null);

  // Label & Tag Modal
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [tempLabel, setTempLabel] = useState('');
  const [tempColorTag, setTempColorTag] = useState<string>('');

  // Live Animation Preview
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const [previewSpeed, setPreviewSpeed] = useState<number>(1);
  const [playSelectedOnly, setPlaySelectedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Animation player loop
  useEffect(() => {
    if (!isOpen || !isPreviewPlaying || frames.length === 0) return;

    const activeIndices = playSelectedOnly && selectedIndices.size > 0
      ? Array.from(selectedIndices).sort((a, b) => a - b)
      : frames.map((_, i) => i);

    if (activeIndices.length === 0) return;

    const currentIdxInSequence = activeIndices.indexOf(previewFrameIndex);
    const validIdx = currentIdxInSequence === -1 ? 0 : currentIdxInSequence;
    const targetFrame = frames[activeIndices[validIdx]];
    const duration = ((targetFrame?.durationMultiplier || 1) / (fps * previewSpeed)) * 1000;

    const timeout = setTimeout(() => {
      const nextIdx = (validIdx + 1) % activeIndices.length;
      setPreviewFrameIndex(activeIndices[nextIdx]);
    }, Math.max(30, duration));

    return () => clearTimeout(timeout);
  }, [isOpen, isPreviewPlaying, previewFrameIndex, frames, fps, previewSpeed, playSelectedOnly, selectedIndices]);

  if (!isOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = frames.findIndex((f) => f.id === active.id);
      const newIndex = frames.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFrames = arrayMove(frames, oldIndex, newIndex);
        onReorderFrames(newFrames);
        setSelectedIndices(new Set());
      }
    }
  };

  const toggleSelection = (index: number, _e?: React.MouseEvent) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const selectAll = () => {
    if (selectedIndices.size === frames.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(frames.map((_, i) => i)));
    }
  };

  const selectInvert = () => {
    const newSet = new Set<number>();
    frames.forEach((_, i) => {
      if (!selectedIndices.has(i)) newSet.add(i);
    });
    setSelectedIndices(newSet);
  };

  const selectOdd = () => {
    setSelectedIndices(new Set(frames.map((_, i) => i).filter(i => i % 2 === 0)));
  };

  const selectEven = () => {
    setSelectedIndices(new Set(frames.map((_, i) => i).filter(i => i % 2 === 1)));
  };

  const selectByTag = (tagId: string) => {
    const matching = frames.map((f, i) => f.colorTag === tagId ? i : -1).filter(i => i !== -1);
    setSelectedIndices(new Set(matching));
  };

  const handleDelete = () => {
    if (selectedIndices.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteFrames(Array.from(selectedIndices));
    setSelectedIndices(new Set());
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = () => {
    if (selectedIndices.size === 0) return;
    onDuplicateFrames(Array.from(selectedIndices));
    setSelectedIndices(new Set());
  };

  const handleApplyLabel = () => {
    if (selectedIndices.size === 0) return;
    if (onUpdateFrameLabel) {
      onUpdateFrameLabel(Array.from(selectedIndices), tempLabel, tempColorTag || undefined);
    }
    setShowLabelModal(false);
  };

  const handleSetDuration = (multiplier: number) => {
    if (selectedIndices.size === 0 || !onUpdateFrameDuration) return;
    onUpdateFrameDuration(Array.from(selectedIndices), multiplier);
  };

  const handleReverse = () => {
    if (!onReverseFrames) return;
    if (selectedIndices.size > 1) {
      onReverseFrames(Array.from(selectedIndices));
    } else {
      onReverseFrames(undefined); // Reverse all
    }
  };

  const handleFlip = (horizontal: boolean) => {
    if (selectedIndices.size === 0 || !onFlipFrames) return;
    onFlipFrames(Array.from(selectedIndices), horizontal);
  };

  const handleFilter = (filterType: 'grayscale' | 'invert' | 'sepia' | 'brightness') => {
    if (selectedIndices.size === 0 || !onApplyFilterToFrames) return;
    onApplyFilterToFrames(Array.from(selectedIndices), filterType);
  };

  const handleInsertBlanks = (count: number) => {
    if (!onInsertBlankFrames) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    const afterIndex = sorted.length > 0 ? sorted[sorted.length - 1] : frames.length - 1;
    onInsertBlankFrames(afterIndex, count);
  };

  const handleCrop = () => {
    if (selectedIndices.size === 0 || !onCropFramesToSelection) return;
    setShowCropConfirm(true);
  };

  const confirmCrop = () => {
    if (onCropFramesToSelection) {
      onCropFramesToSelection(Array.from(selectedIndices));
    }
    setSelectedIndices(new Set());
    setShowCropConfirm(false);
  };

  const handleExport = async () => {
    if (selectedIndices.size === 0) return;
    setIsExporting(true);

    try {
      const indices = Array.from(selectedIndices).sort((a, b) => a - b);
      
      if (indices.length === 1) {
        const index = indices[0];
        const frame = frames[index];
        const dataUrl = frame.thumbnailUrl;
        if (!dataUrl) throw new Error("Frame data not found");

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `frame_${index + 1}.png`;
        link.click();
      } else {
        const zip = new JSZip();
        const folder = zip.folder("frames");
        
        for (let i = 0; i < indices.length; i++) {
          const index = indices[i];
          const frame = frames[index];
          const dataUrl = frame.thumbnailUrl;
          if (dataUrl) {
            const base64Data = dataUrl.split(',')[1];
            folder?.file(`frame_${String(index + 1).padStart(4, '0')}.png`, base64Data, { base64: true });
          }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "frames_sequence.zip";
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export frames. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalTimeSeconds = frames.reduce((acc, f) => acc + ((f.durationMultiplier || 1) / fps), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="flex flex-col w-full h-full max-w-6xl max-h-[92vh] bg-[#1a1a1a] rounded-2xl border border-gray-700 shadow-2xl overflow-hidden m-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 bg-[#222222]">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30]">
              <Icons.FrameGrid size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">Advanced Frame Manager</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/40 text-gray-300 font-mono font-medium border border-gray-700">
                  {frames.length} frames • {totalTimeSeconds.toFixed(2)}s @ {fps} FPS
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Adobe Animate style sequence sequencing, labels, color tags, timing holds & batch operations
              </p>
            </div>
          </div>

          {/* View Mode & Controls */}
          <div className="flex items-center gap-3">
            {/* Zoom slider (Grid View only) */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-gray-700 rounded-lg text-xs text-gray-300">
                <span className="text-[10px] uppercase font-bold text-gray-400">Zoom</span>
                <input
                  type="range"
                  min="2"
                  max="7"
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value))}
                  className="w-16 h-1 bg-gray-700 rounded-full appearance-none accent-[#FF3B30] cursor-pointer"
                  title="Grid columns"
                />
              </div>
            )}

            {/* View Mode Buttons */}
            <div className="flex bg-black/50 p-0.5 rounded-lg border border-gray-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Grid View"
              >
                <Icons.LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('filmstrip')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'filmstrip' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Filmstrip View"
              >
                <Icons.Film size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Detailed Table View"
              >
                <Icons.List size={16} />
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Live Animation Mini Player Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#151515] border-b border-gray-800 text-xs">
          <div className="flex items-center gap-3">
            {/* Frame preview canvas / image */}
            <div className="w-14 h-10 bg-black rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center relative flex-shrink-0">
              {frames[previewFrameIndex]?.thumbnailUrl ? (
                <img 
                  src={frames[previewFrameIndex].thumbnailUrl} 
                  alt="" 
                  className="w-full h-full object-contain pointer-events-none" 
                />
              ) : (
                <span className="text-[9px] text-gray-600 font-mono">#{previewFrameIndex + 1}</span>
              )}
            </div>

            {/* Play / Pause */}
            <button
              onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                isPreviewPlaying ? 'bg-amber-600 text-white' : 'bg-[#FF3B30] text-white hover:bg-red-600'
              }`}
            >
              {isPreviewPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
              <span>{isPreviewPlaying ? 'Pause' : 'Preview Sequence'}</span>
            </button>

            {/* Step Back / Step Forward */}
            <button
              onClick={() => {
                setIsPreviewPlaying(false);
                setPreviewFrameIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
              }}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md"
              title="Step Back"
            >
              <Icons.SkipBack size={14} />
            </button>
            <button
              onClick={() => {
                setIsPreviewPlaying(false);
                setPreviewFrameIndex((prev) => (prev + 1) % frames.length);
              }}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md"
              title="Step Forward"
            >
              <Icons.SkipForward size={14} />
            </button>

            <span className="font-mono text-gray-300 font-semibold ml-1">
              Frame {previewFrameIndex + 1} / {frames.length}
            </span>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-2 bg-black/40 p-0.5 rounded-md border border-gray-800">
              {[0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPreviewSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${previewSpeed === speed ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {selectedIndices.size > 0 && (
              <label className="flex items-center gap-1.5 text-gray-400 hover:text-white cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={playSelectedOnly}
                  onChange={(e) => setPlaySelectedOnly(e.target.checked)}
                  className="rounded border-gray-700 text-[#FF3B30] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Play Selected Only ({selectedIndices.size})</span>
              </label>
            )}
          </div>

          {/* Quick Selection Shortcuts */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-500 mr-1">Select:</span>
            <button onClick={selectAll} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium">
              {selectedIndices.size === frames.length ? 'Deselect All' : 'All'}
            </button>
            <button onClick={selectInvert} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium">
              Invert
            </button>
            <button onClick={selectOdd} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium" title="Select frames 1, 3, 5, 7... (On 2s decimation)">
              Odds
            </button>
            <button onClick={selectEven} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium" title="Select frames 2, 4, 6, 8...">
              Evens
            </button>

            {/* Tag Filter Dropdown */}
            <div className="relative group ml-1">
              <button className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-medium flex items-center gap-1">
                <Icons.Tag size={12} />
                <span>By Tag</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#252525] border border-gray-700 rounded-lg shadow-2xl py-1 z-50 hidden group-hover:block animate-in fade-in">
                {FRAME_COLOR_TAGS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectByTag(t.id)}
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-700 flex items-center gap-2 text-gray-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-[#1e1e1e] border-b border-gray-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Label & Tag Button */}
            <button
              onClick={() => {
                const firstSelected = Array.from(selectedIndices)[0];
                if (firstSelected !== undefined) {
                  setTempLabel(frames[firstSelected]?.label || '');
                  setTempColorTag(frames[firstSelected]?.colorTag || '');
                }
                setShowLabelModal(true);
              }}
              disabled={selectedIndices.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedIndices.size > 0 ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              title="Set frame label and color marker"
            >
              <Icons.Tag size={14} />
              <span>Label & Tag</span>
            </button>

            {/* Timing / Hold Multiplier dropdown */}
            <div className="flex items-center bg-black/40 rounded-lg border border-gray-700 p-0.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Hold:</span>
              {[1, 2, 3, 4].map(mul => (
                <button
                  key={mul}
                  onClick={() => handleSetDuration(mul)}
                  disabled={selectedIndices.size === 0}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                    selectedIndices.size > 0 ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'
                  }`}
                  title={`Set selected frames duration to ${mul}x (${mul === 2 ? 'Animate on 2s' : mul === 3 ? 'Animate on 3s' : `${mul} frames hold`})`}
                >
                  {mul}x
                </button>
              ))}
            </div>

            {/* Reverse Sequence */}
            <button
              onClick={handleReverse}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-semibold transition-colors border border-gray-700"
              title={selectedIndices.size > 1 ? "Reverse selected frames order" : "Reverse entire animation sequence"}
            >
              <Icons.Shuffle size={14} />
              <span>{selectedIndices.size > 1 ? 'Reverse Selected' : 'Reverse All'}</span>
            </button>

            {/* Batch Flip */}
            <div className="flex items-center bg-black/40 rounded-lg border border-gray-700 p-0.5">
              <button
                onClick={() => handleFlip(true)}
                disabled={selectedIndices.size === 0}
                className={`p-1.5 rounded transition-colors ${selectedIndices.size > 0 ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                title="Batch Flip Horizontal"
              >
                <Icons.FlipHorizontal size={14} />
              </button>
              <button
                onClick={() => handleFlip(false)}
                disabled={selectedIndices.size === 0}
                className={`p-1.5 rounded transition-colors ${selectedIndices.size > 0 ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                title="Batch Flip Vertical"
              >
                <Icons.FlipVertical size={14} />
              </button>
            </div>

            {/* Filters Dropdown */}
            <div className="relative group">
              <button
                disabled={selectedIndices.size === 0}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-colors border border-gray-700 ${
                  selectedIndices.size > 0 ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Icons.Sliders size={14} />
                <span>Filters</span>
              </button>
              {selectedIndices.size > 0 && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-[#252525] border border-gray-700 rounded-lg shadow-2xl py-1 z-50 hidden group-hover:block animate-in fade-in">
                  <button onClick={() => handleFilter('grayscale')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">Grayscale</button>
                  <button onClick={() => handleFilter('invert')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">Invert Colors</button>
                  <button onClick={() => handleFilter('sepia')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">Sepia</button>
                  <button onClick={() => handleFilter('brightness')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">Brightness +20%</button>
                </div>
              )}
            </div>

            {/* Insert Blank Frames */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-semibold transition-colors border border-gray-700"
                title="Insert Blank Frames"
              >
                <Icons.Plus size={14} />
                <span>Insert Blank</span>
              </button>
              <div className="absolute left-0 top-full mt-1 w-32 bg-[#252525] border border-gray-700 rounded-lg shadow-2xl py-1 z-50 hidden group-hover:block animate-in fade-in">
                <button onClick={() => handleInsertBlanks(1)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">+1 Blank Frame</button>
                <button onClick={() => handleInsertBlanks(2)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">+2 Blank Frames</button>
                <button onClick={() => handleInsertBlanks(5)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 text-gray-200">+5 Blank Frames</button>
              </div>
            </div>

            {/* Set Background */}
            <button 
              onClick={() => setShowBackgroundModal(true)}
              disabled={selectedIndices.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors border border-gray-700 ${
                selectedIndices.size > 0 ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Icons.Palette size={14} />
              <span>Background</span>
            </button>
          </div>

          {/* Right Action Tools: Duplicate, Crop, Export, Delete */}
          <div className="flex items-center gap-1.5">
            {/* Duplicate */}
            <button 
              onClick={handleDuplicate}
              disabled={selectedIndices.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedIndices.size > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              title="Duplicate selected frames"
            >
              <Icons.Copy size={14} />
              <span>Duplicate ({selectedIndices.size})</span>
            </button>

            {/* Crop to selection */}
            {selectedIndices.size > 0 && selectedIndices.size < frames.length && (
              <button
                onClick={handleCrop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600 hover:text-white transition-colors"
                title="Crop animation to selected frames only"
              >
                <Icons.Scissors size={14} />
                <span>Crop</span>
              </button>
            )}

            {/* Export PNG Sequence */}
            <button 
              onClick={handleExport}
              disabled={selectedIndices.size === 0 || isExporting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedIndices.size > 0 && !isExporting ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isExporting ? <Icons.Loader2 size={14} className="animate-spin" /> : <Icons.Download size={14} />}
              <span>Export ({selectedIndices.size})</span>
            </button>

            {/* Delete */}
            <button 
              onClick={handleDelete}
              disabled={selectedIndices.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedIndices.size > 0 ? 'bg-red-600/20 text-red-500 border border-red-500/40 hover:bg-red-600 hover:text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Icons.Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Frame Views Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#121212] no-scrollbar">
          {viewMode === 'grid' && (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={frames.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                <div 
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
                  }}
                >
                  {frames.map((frame, index) => {
                    const isSelected = selectedIndices.has(index);
                    return (
                      <SortableFrameItem 
                        key={frame.id}
                        frame={frame}
                        index={index}
                        isSelected={isSelected}
                        gridCols={gridCols}
                        toggleSelection={toggleSelection}
                        onQuickJump={(idx) => {
                          if (onSelectFrame) onSelectFrame(idx);
                          onClose();
                        }}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Filmstrip View */}
          {viewMode === 'filmstrip' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 mb-2">Sequential timeline filmstrip. Click frame to select, or jump straight to editor:</div>
              <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 px-1">
                {frames.map((frame, index) => {
                  const isSelected = selectedIndices.has(index);
                  const tagColor = FRAME_COLOR_TAGS.find(t => t.id === frame.colorTag || t.color === frame.colorTag)?.color;

                  return (
                    <div
                      key={frame.id}
                      onClick={(e) => toggleSelection(index, e)}
                      className={`relative w-48 aspect-[4/3] flex-shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-[#FF3B30] ring-4 ring-[#FF3B30]/30 shadow-2xl scale-105' : 'border-gray-700 hover:border-gray-500 bg-[#181818]'
                      }`}
                    >
                      {tagColor && (
                        <div className="absolute top-0 left-0 right-0 h-2 z-10" style={{ backgroundColor: tagColor }} />
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        {frame.thumbnailUrl ? (
                          <img src={frame.thumbnailUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                        ) : (
                          <span className="text-xs text-gray-600 font-mono">Frame {index + 1}</span>
                        )}
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono">#{index + 1}</span>
                          {frame.label && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold" style={{ backgroundColor: tagColor || '#4b5563' }}>
                              {frame.label}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {((index / fps)).toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List / Table View */}
          {viewMode === 'list' && (
            <div className="bg-[#181818] border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#222222] border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIndices.size === frames.length && frames.length > 0} 
                        onChange={selectAll}
                        className="rounded border-gray-700 text-[#FF3B30] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-16">#</th>
                    <th className="p-3 w-28">Preview</th>
                    <th className="p-3">Label / Name</th>
                    <th className="p-3">Color Tag</th>
                    <th className="p-3">Timing Hold</th>
                    <th className="p-3">Timecode</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium">
                  {frames.map((frame, index) => {
                    const isSelected = selectedIndices.has(index);
                    const tagObj = FRAME_COLOR_TAGS.find(t => t.id === frame.colorTag || t.color === frame.colorTag);

                    return (
                      <tr 
                        key={frame.id}
                        onClick={() => toggleSelection(index)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#FF3B30]/15 font-bold text-white' : 'hover:bg-gray-800/50'
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleSelection(index)}
                            className="rounded border-gray-700 text-[#FF3B30] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold">Frame {index + 1}</td>
                        <td className="p-3">
                          <div className="w-20 h-12 bg-black/60 rounded border border-gray-700 overflow-hidden flex items-center justify-center">
                            {frame.thumbnailUrl ? (
                              <img src={frame.thumbnailUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-gray-500">Empty</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {frame.label ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gray-700">
                              {frame.label}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          {tagObj ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tagObj.color }} />
                              <span>{tagObj.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {frame.durationMultiplier || 1}x ({Math.round(((frame.durationMultiplier || 1) / fps) * 1000)}ms)
                        </td>
                        <td className="p-3 font-mono text-gray-400">
                          {((index / fps)).toFixed(2)}s
                        </td>
                        <td className="p-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (onSelectFrame) onSelectFrame(index);
                              onClose();
                            }}
                            className="p-1.5 hover:bg-blue-600 rounded text-gray-300 hover:text-white transition-colors"
                            title="Jump to Frame in Editor"
                          >
                            <Icons.ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => onDuplicateFrames([index])}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                            title="Duplicate Frame"
                          >
                            <Icons.Copy size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteFrames([index])}
                            disabled={frames.length <= 1}
                            className="p-1.5 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
                            title="Delete Frame"
                          >
                            <Icons.Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Label & Color Tag Modal */}
        {showLabelModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#222222] p-6 rounded-2xl border border-gray-700 w-[420px] shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Tag className="text-purple-400" size={20} />
                <h3 className="text-base font-bold text-white">Set Frame Label & Color Tag</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                    Frame Label Name
                  </label>
                  <input
                    type="text"
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    placeholder="e.g. Idle, Walk, Jump, Attack..."
                    className="w-full bg-black/60 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 outline-none focus:border-purple-500"
                  />
                  
                  {/* Preset Label Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_FRAME_LABELS.map(lbl => (
                      <button
                        key={lbl}
                        onClick={() => setTempLabel(lbl)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          tempLabel === lbl ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                    Color Tag Marker
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setTempColorTag('')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        !tempColorTag ? 'border-white bg-gray-700 text-white' : 'border-gray-800 bg-black/40 text-gray-400'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-gray-600" />
                      <span>None</span>
                    </button>
                    {FRAME_COLOR_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => setTempColorTag(tag.id)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                          tempColorTag === tag.id ? 'border-white ring-2 ring-white/30 scale-105' : 'border-transparent bg-black/40'
                        }`}
                        style={{ backgroundColor: `${tag.color}22` }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shadow" style={{ backgroundColor: tag.color }} />
                        <span className="text-[10px] text-white truncate max-w-full">{tag.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowLabelModal(false)}
                  className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyLabel}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/30"
                >
                  Apply to {selectedIndices.size} Frame{selectedIndices.size > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Background Modal */}
        {showBackgroundModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#222222] p-6 rounded-2xl border border-gray-700 w-[420px] shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Icons.Palette className="text-[#FF3B30]" size={18} />
                Set Background for {selectedIndices.size} Frame{selectedIndices.size > 1 ? 's' : ''}
              </h3>
              
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setTempBackground({ ...tempBackground, type: 'color' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tempBackground.type === 'color' ? 'bg-[#FF3B30] text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  {t('frameManager.color')}
                </button>
                <button 
                  onClick={() => setTempBackground({ ...tempBackground, type: 'gradient3', gradientColors: tempBackground.gradientColors || ['#FF3B30', '#007AFF', '#34C759'] })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tempBackground.type === 'gradient3' ? 'bg-[#FF3B30] text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  {t('frameManager.gradient')}
                </button>
              </div>

              {tempBackground.type === 'color' ? (
                <div className="flex gap-4 items-center mb-4">
                  <input 
                    type="color" 
                    value={tempBackground.color === 'transparent' ? '#ffffff' : tempBackground.color}
                    onChange={(e) => setTempBackground({ ...tempBackground, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                  />
                  <input 
                    type="text" 
                    value={tempBackground.color}
                    onChange={(e) => setTempBackground({ ...tempBackground, color: e.target.value })}
                    className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 w-full"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(tempBackground.gradientColors || ['#FF3B30', '#007AFF', '#34C759']).map((color, index) => (
                    <input
                      key={index}
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...(tempBackground.gradientColors || ['#FF3B30', '#007AFF', '#34C759'])];
                        newColors[index] = e.target.value;
                        setTempBackground({ ...tempBackground, gradientColors: newColors as [string, string, string] });
                      }}
                      className="w-full h-10 rounded cursor-pointer bg-transparent border-none"
                    />
                  ))}
                </div>
              )}

              <div className="mb-4">
                {tempBackgroundImage ? (
                  <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group">
                    <img src={tempBackgroundImage} alt="BG" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setTempBackgroundImage(null)}
                      className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-[#FF3B30] hover:text-[#FF3B30] transition-colors"
                  >
                    <Icons.Image size={24} className="mb-2" />
                    <span className="text-xs">{t('frameManager.importBgImage')}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) setTempBackgroundImage(ev.target.result as string);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }} />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowBackgroundModal(false)}
                  className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => {
                    onUpdateFrameBackground(Array.from(selectedIndices), tempBackground, tempBackgroundImage);
                    setShowBackgroundModal(false);
                  }}
                  className="flex-1 py-2.5 bg-[#FF3B30] text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-600/30"
                >
                  {t('frameManager.apply')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#222222] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <Icons.Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Delete {selectedIndices.size} Frame{selectedIndices.size > 1 ? 's' : ''}?</h2>
              <p className="text-xs text-gray-400 mb-6">This action cannot be undone. Are you sure you want to permanently delete these frames?</p>
              <div className="grid grid-cols-1 gap-2.5">
                <button onClick={confirmDelete} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                  Delete Permanently
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crop Confirmation Modal */}
        {showCropConfirm && (
          <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#222222] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
                <Icons.Scissors size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Crop Animation?</h2>
              <p className="text-xs text-gray-400 mb-6">
                This will keep only the {selectedIndices.size} selected frame{selectedIndices.size > 1 ? 's' : ''} and remove all other frames in the animation.
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                <button onClick={confirmCrop} className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 transition-colors">
                  Crop to Selection
                </button>
                <button onClick={() => setShowCropConfirm(false)} className="w-full py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
