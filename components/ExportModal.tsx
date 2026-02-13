import React from 'react';
import { Icons } from '../Icons';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-seq' | 'avi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  isExporting: boolean;
  progress: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  isExporting, 
  progress 
}) => {
  if (!isOpen) return null;

  const formats: { id: ExportFormat; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { id: 'mp4', label: 'MP4 Video', icon: Icons.FileVideo, color: 'text-blue-400', desc: 'Standard video, great for social media.' },
    { id: 'webm', label: 'WebM Video', icon: Icons.FileVideo, color: 'text-emerald-400', desc: 'Web-native format, small file size.' },
    { id: 'gif', label: 'Animated GIF', icon: Icons.Image, color: 'text-amber-400', desc: 'Looping animation for the web.' },
    { id: 'png-seq', label: 'PNG Sequence', icon: Icons.FileArchive, color: 'text-rose-400', desc: 'High quality frames in a ZIP file.' },
    { id: 'avi', label: 'AVI Video', icon: Icons.FileVideo, color: 'text-indigo-400', desc: 'Legacy format (Windows-friendly).' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-[450px] max-w-full rounded-3xl shadow-2xl border border-gray-700 p-8 flex flex-col overflow-hidden relative">
        
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e]/90 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-[#FF3B30] animate-spin mb-6" />
             <h2 className="text-2xl font-bold mb-2">Rendering...</h2>
             <p className="text-gray-400 mb-6">Processing frames and encoding your movie.</p>
             <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-2">
                <div 
                    className="h-full bg-[#FF3B30] transition-all duration-300 shadow-[0_0_10px_rgba(255,59,48,0.5)]" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
             <span className="text-xs font-mono text-gray-500">{progress}% Complete</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Make a Movie</h2>
            <p className="text-gray-400 text-sm">Choose your preferred export format.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        <div className="space-y-3 mb-8">
            {formats.map((format) => (
                <button 
                    key={format.id}
                    onClick={() => onExport(format.id)}
                    className="w-full group bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-[#FF3B30] p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                >
                    <div className={`p-3 rounded-xl bg-gray-900 group-hover:scale-110 transition-transform ${format.color}`}>
                        <format.icon size={28} />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white group-hover:text-[#FF3B30] transition-colors">{format.label}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{format.desc}</div>
                    </div>
                    <Icons.ChevronLeft size={20} className="text-gray-600 rotate-180 group-hover:text-white transition-colors" />
                </button>
            ))}
        </div>

        <p className="text-[10px] text-gray-600 text-center">
            ClipAnim uses client-side encoding. Large projects might take a moment.
        </p>
      </div>
    </div>
  );
};