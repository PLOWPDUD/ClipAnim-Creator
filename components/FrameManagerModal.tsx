import React, { useState } from 'react';
import { Frame } from '../types';
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

interface FrameManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  onDeleteFrames: (indices: number[]) => void;
  onDuplicateFrames: (indices: number[]) => void;
  onReorderFrames: (frames: Frame[]) => void;
}

const SortableFrameItem = ({ frame, index, isSelected, toggleSelection }: { frame: Frame, index: number, isSelected: boolean, toggleSelection: (index: number) => void }) => {
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
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => toggleSelection(index)}
        className={`relative aspect-[4/3] group cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${isSelected ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/30 transform scale-[1.02]' : 'border-gray-700 hover:border-gray-500 hover:bg-white/5'} ${isDragging ? 'opacity-50' : ''}`}
    >
        <div className="absolute top-2 left-2 z-10">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#FF3B30] border-[#FF3B30]' : 'bg-black/50 border-gray-400 group-hover:border-white'}`}>
                {isSelected && <Icons.Check size={14} className="text-white" />}
            </div>
        </div>
        
        <div className="absolute inset-0 bg-white">
            {frame.thumbnailUrl && (
                <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} className="w-full h-full object-contain pointer-events-none" />
            )}
        </div>

        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Frame {index + 1}</span>
        </div>
    </div>
  );
};

export const FrameManagerModal: React.FC<FrameManagerModalProps> = ({
  isOpen,
  onClose,
  frames,
  onDeleteFrames,
  onDuplicateFrames,
  onReorderFrames
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  if (!isOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = frames.findIndex((f) => f.id === active.id);
      const newIndex = frames.findIndex((f) => f.id === over.id);
      
      const newFrames = arrayMove(frames, oldIndex, newIndex);
      onReorderFrames(newFrames);
      setSelectedIndices(new Set()); // Clear selection on reorder to avoid index confusion
    }
  };

  const toggleSelection = (index: number) => {
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
    onClose(); 
  };

  const handleExport = async () => {
    if (selectedIndices.size === 0) return;
    setIsExporting(true);

    try {
      const indices = Array.from(selectedIndices).sort((a, b) => a - b);
      
      if (indices.length === 1) {
        // Single frame export
        const index = indices[0];
        const frame = frames[index];
        const dataUrl = frame.thumbnailUrl;
        if (!dataUrl) throw new Error("Frame data not found");

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `frame_${index + 1}.png`;
        link.click();
      } else {
        // Multi frame export (ZIP)
        const zip = new JSZip();
        const folder = zip.folder("frames");
        
        for (let i = 0; i < indices.length; i++) {
          const index = indices[i];
          const frame = frames[index];
          const dataUrl = frame.thumbnailUrl;
          if (dataUrl) {
            const base64Data = dataUrl.split(',')[1];
            folder?.file(`frame_${index + 1}.png`, base64Data, { base64: true });
          }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "frames_export.zip";
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full h-full max-w-5xl max-h-[90vh] bg-[#1e1e1e] rounded-xl border border-gray-700 shadow-2xl overflow-hidden m-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#252525]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icons.FrameGrid className="text-[#FF3B30]" />
              Frame Manager
            </h2>
            <span className="text-sm text-gray-400">{frames.length} Frames</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 bg-[#1e1e1e] border-b border-gray-800">
             <button 
                onClick={selectAll}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 hover:bg-blue-500/10 rounded transition-colors"
             >
                {selectedIndices.size === frames.length ? 'Deselect All' : 'Select All'}
             </button>

             <div className="flex gap-2">
                 <button 
                    onClick={handleExport}
                    disabled={selectedIndices.size === 0 || isExporting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${selectedIndices.size > 0 && !isExporting ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                 >
                    {isExporting ? <Icons.Loader2 size={16} className="animate-spin" /> : <Icons.Download size={16} />}
                    Export ({selectedIndices.size})
                 </button>
                 <button 
                    onClick={handleDuplicate}
                    disabled={selectedIndices.size === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${selectedIndices.size > 0 ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                 >
                    <Icons.Copy size={16} />
                    Duplicate ({selectedIndices.size})
                 </button>
                 <button 
                    onClick={handleDelete}
                    disabled={selectedIndices.size === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${selectedIndices.size > 0 ? 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                 >
                    <Icons.Trash2 size={16} />
                    Delete ({selectedIndices.size})
                 </button>
             </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#121212]">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={frames.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {frames.map((frame, index) => {
                        const isSelected = selectedIndices.has(index);
                        return (
                            <SortableFrameItem 
                                key={frame.id}
                                frame={frame}
                                index={index}
                                isSelected={isSelected}
                                toggleSelection={toggleSelection}
                            />
                        );
                    })}
                </div>
              </SortableContext>
            </DndContext>
        </div>

        {showDeleteConfirm && (
            <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-[#1e1e1e] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"> <Icons.Trash2 size={32} /> </div>
                    <h2 className="text-2xl font-bold mb-2">Delete {selectedIndices.size} Frames?</h2>
                    <p className="text-gray-400 mb-8">This action cannot be undone. Selected frames will be permanently removed.</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors">Delete Permanently</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-700 text-white font-bold rounded-2xl hover:bg-gray-600 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};