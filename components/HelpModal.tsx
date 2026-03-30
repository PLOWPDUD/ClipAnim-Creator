import React from 'react';
import { Icons } from '../Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-[#1e1e1e] w-[600px] max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#252525]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icons.Help className="text-[#FF3B30]" />
            Shortcuts & Guide
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 no-scrollbar">
            
            {/* Tools Section */}
            <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">Tools</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ShortcutItem icon={Icons.Pencil} label="Brush" k="B" />
                    <ShortcutItem icon={Icons.Eraser} label="Eraser" k="E" />
                    <ShortcutItem icon={Icons.PaintBucket} label="Fill" k="G" />
                    <ShortcutItem icon={Icons.MousePointer2} label="Select" k="V" />
                    <ShortcutItem icon={Icons.Lasso} label="Lasso" k="L" />
                    <ShortcutItem icon={Icons.Wand2} label="Wand" k="W" />
                    <ShortcutItem icon={Icons.Square} label="Shapes" k="U" />
                    <ShortcutItem icon={Icons.Type} label="Text" k="T" />
                </div>
            </section>

            {/* Canvas Control */}
            <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">Canvas & Navigation</h3>
                <div className="space-y-3">
                    <KeyRow label="Pan Canvas" value="Right-Click Drag" />
                    <KeyRow label="Zoom" value="Ctrl + Scroll / Pinch" />
                    <KeyRow label="Play / Pause" value="Spacebar" />
                    <KeyRow label="Next / Prev Frame" value="Arrow Keys" />
                    <KeyRow label="Toggle Grid" value="G" />
                </div>
            </section>

            {/* General Actions */}
             <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">Actions</h3>
                <div className="space-y-3">
                    <KeyRow label="Undo" value="Ctrl + Z" />
                    <KeyRow label="Redo" value="Ctrl + Shift + Z" />
                    <KeyRow label="Copy Selection" value="Ctrl + C" />
                    <KeyRow label="Paste Selection" value="Ctrl + V" />
                    <KeyRow label="Delete Selection" value="Del / Backspace" />
                    <KeyRow label="Save Project" value="Ctrl + S" />
                    <KeyRow label="Export Movie" value="Ctrl + Shift + E" />
                </div>
            </section>

             {/* Features Guide */}
             <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">How To...</h3>
                <div className="space-y-4 text-sm text-gray-300">
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Wand2 size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Magic Wand vs. Tweening</p>
                            <p className="text-gray-400">
                                <span className="text-white font-semibold">Toolbar Wand:</span> Used for color-based selection on the canvas. <br/>
                                <span className="text-white font-semibold">Timeline Wand:</span> Used to automatically generate transition frames (tweening) between keyframes.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Image size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Import Image</p>
                            <p className="text-gray-400">Click the Image icon in the toolbar on the left to add a reference image or background layer.</p>
                        </div>
                    </div>
                     <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Music size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Add Audio</p>
                            <p className="text-gray-400">Click the Music icon in the timeline (bottom right) to open the audio panel, then click "Add Track" to import MP3/WAV files.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.FolderDown size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Import/Export Project</p>
                            <p className="text-gray-400">Go to Settings to backup your project as a .JSON file. Use the "Import Project" button on the home screen to restore it.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.FileVideo size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Import Video</p>
                            <p className="text-gray-400">Click the Video icon in the toolbar to import MP4/MOV files. You can extract frames to use as a background or reference for your animation.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Music size={20} /></div>
                        <div>
                            <p className="font-bold text-white">Sound Library</p>
                            <p className="text-gray-400">Search thousands of free sound effects from Freesound in the "Library" tab. Save your favorites to the "Saved" tab for quick access.</p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
        
        <div className="p-6 border-t border-gray-700 bg-[#252525] text-center">
            <button onClick={onClose} className="w-full py-3 bg-[#FF3B30] text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
                Got it
            </button>
        </div>
      </div>
    </div>
  );
};

const ShortcutItem = ({ icon: Icon, label, k }: { icon: any, label: string, k: string }) => (
    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700">
        <Icon size={20} className="text-gray-400" />
        <div className="flex-1">
            <div className="font-bold text-white text-sm">{label}</div>
        </div>
        <kbd className="bg-black/50 px-2 py-1 rounded text-xs font-mono text-gray-300 font-bold min-w-[24px] text-center border border-gray-600">
            {k}
        </kbd>
    </div>
);

const KeyRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center border-b border-gray-800 last:border-0 pb-2 last:pb-0">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        <span className="text-xs font-mono text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-1 rounded border border-[#FF3B30]/20">
            {value}
        </span>
    </div>
);