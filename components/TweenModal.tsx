import React, { useState } from 'react';
import { Icons } from '../Icons';

interface TweenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (numFrames: number, easing: string, includeOnionSkin: boolean) => void;
}

export const TweenModal: React.FC<TweenModalProps> = ({ isOpen, onClose, onGenerate }) => {
  console.log("TweenModal rendered, isOpen:", isOpen);
  const [numFrames, setNumFrames] = useState(3);
  const [easing, setEasing] = useState('linear');
  const [includeOnionSkin, setIncludeOnionSkin] = useState(true);

  if (!isOpen) return null;

  const easingOptions = [
    { id: 'linear', label: 'Linear', desc: 'Constant speed' },
    { id: 'ease-in', label: 'Ease In', desc: 'Starts slow, speeds up' },
    { id: 'ease-out', label: 'Ease Out', desc: 'Starts fast, slows down' },
    { id: 'ease-in-out', label: 'Ease In-Out', desc: 'Slow start and end' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Wand2 size={20} className="text-purple-400" />
            Tween Frames
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of in-between frames
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="24" 
                value={numFrames} 
                onChange={(e) => setNumFrames(parseInt(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-white font-mono w-8 text-center bg-black/30 py-1 rounded">{numFrames}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Motion Smoothness (Easing)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {easingOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setEasing(opt.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    easing === opt.id 
                      ? 'bg-purple-600/20 border-purple-500 text-white' 
                      : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-0.5">{opt.label}</div>
                  <div className="text-[10px] opacity-60 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
            <label className="text-sm font-medium text-gray-300">
              Include Onion Skin
            </label>
            <button 
              onClick={() => setIncludeOnionSkin(!includeOnionSkin)}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${includeOnionSkin ? 'bg-purple-600' : 'bg-gray-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeOnionSkin ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/20 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onGenerate(numFrames, easing, includeOnionSkin);
              onClose();
            }}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-purple-500/20"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
