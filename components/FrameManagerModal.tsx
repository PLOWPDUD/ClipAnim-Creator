import React, { useState } from 'react';
import { Frame } from '../types';
import { Icons } from '../Icons';

interface FrameManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  onDeleteFrames: (indices: number[]) => void;
  onDuplicateFrames: (indices: number[]) => void;
}

export const FrameManagerModal: React.FC<FrameManagerModalProps> = ({
  isOpen,
  onClose,
  frames,
  onDeleteFrames,
  onDuplicateFrames
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

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
    onClose(); // Optional: close after action or stay open? Let's stay open usually, but for duplication usually you want to go back to edit. Let's keep it open for now to see result.
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {frames.map((frame, index) => {
                    const isSelected = selectedIndices.has(index);
                    return (
                        <div 
                            key={frame.id}
                            onClick={() => toggleSelection(index)}
                            className={`relative aspect-[4/3] group cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${isSelected ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/30 transform scale-[1.02]' : 'border-gray-700 hover:border-gray-500 hover:bg-white/5'}`}
                        >
                            <div className="absolute top-2 left-2 z-10">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#FF3B30] border-[#FF3B30]' : 'bg-black/50 border-gray-400 group-hover:border-white'}`}>
                                    {isSelected && <Icons.Check size={14} className="text-white" />}
                                </div>
                            </div>
                            
                            <div className="absolute inset-0 bg-white">
                                {frame.thumbnailUrl && (
                                    <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} className="w-full h-full object-contain" />
                                )}
                            </div>

                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Frame {index + 1}</span>
                            </div>
                        </div>
                    );
                })}
                
                {/* Add New Frame Button within Manager? Optional, but let's stick to management only for now to keep it clean */}
            </div>
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