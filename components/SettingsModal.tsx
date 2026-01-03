import React, { useRef } from 'react';
import { Icons } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fps: number;
  setFps: (fps: number) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  canvasSize: { width: number, height: number };
  setCanvasSize: (size: { width: number, height: number }) => void;
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  fps, 
  setFps,
  projectName,
  setProjectName,
  canvasSize,
  setCanvasSize,
  backgroundImage,
  setBackgroundImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const presets = [
    { label: 'Standard (4:3)', w: 800, h: 600 },
    { label: 'YouTube (16:9)', w: 854, h: 480 }, // Using 480p base to keep canvas light
    { label: 'Shorts (9:16)', w: 360, h: 640 },
    { label: 'Square (1:1)', w: 600, h: 600 },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBackgroundImage(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-[400px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-700 p-6 flex flex-col no-scrollbar">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-white">Project Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800">
            <Icons.X size={24} />
          </button>
        </div>

        <div className="space-y-6 flex-1">
            {/* Project Name */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Project Name</label>
                <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-[#FF3B30] focus:outline-none"
                    placeholder="My Animation"
                />
            </div>

            {/* Playback */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                <span>Frame Rate</span>
                <span className="text-[#FF3B30]">{fps} FPS</span>
              </div>
              <input
                  type="range"
                  min="1"
                  max="30"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>1</span><span>12</span><span>24</span><span>30</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-gray-700" />

            {/* Canvas Size */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Canvas Size</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {presets.map(p => (
                        <button 
                            key={p.label}
                            onClick={() => setCanvasSize({ width: p.w, height: p.h })}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                canvasSize.width === p.w && canvasSize.height === p.h 
                                ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-[#FF3B30]' 
                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <span className="text-[10px] text-gray-500 block mb-1">Width</span>
                        <input 
                            type="number" 
                            value={canvasSize.width}
                            onChange={(e) => setCanvasSize({ ...canvasSize, width: Number(e.target.value) })}
                            className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700"
                        />
                    </div>
                    <div className="flex-1">
                         <span className="text-[10px] text-gray-500 block mb-1">Height</span>
                        <input 
                            type="number" 
                            value={canvasSize.height}
                            onChange={(e) => setCanvasSize({ ...canvasSize, height: Number(e.target.value) })}
                            className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700"
                        />
                    </div>
                </div>
            </div>

             <div className="w-full h-px bg-gray-700" />

            {/* Background Image */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Background Image</label>
                {backgroundImage ? (
                    <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group">
                        <img src={backgroundImage} alt="BG" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => setBackgroundImage(null)}
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
                        <span className="text-xs">Import Background</span>
                    </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
        </div>

        <div className="mt-6 shrink-0">
            <button 
            onClick={onClose}
            className="w-full py-3 bg-[#FF3B30] text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg"
            >
            Done
            </button>
        </div>
      </div>
    </div>
  );
};