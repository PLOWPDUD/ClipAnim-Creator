import React from 'react';
import { Icons } from '../Icons';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (url: string, name: string) => void;
}

const SOUNDS = [
  { name: 'Pop', url: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg' },
  { name: 'Boing', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg' },
  { name: 'Slide Whistle', url: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg' },
  { name: 'Beep', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
  { name: 'Wood Planks', url: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg' },
  { name: 'Clang', url: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg' },
  { name: 'Crash', url: 'https://actions.google.com/sounds/v1/impacts/crash.ogg' },
  { name: 'Robot Code', url: 'https://actions.google.com/sounds/v1/science_fiction/robot_code.ogg' },
];

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({ isOpen, onClose, onSelectSound }) => {
  if (!isOpen) return null;

  const playPreview = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => {
      if (e.name !== 'AbortError') console.error(e);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Music size={20} className="text-[var(--accent-color)]" />
            Sound Library
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3">
          {SOUNDS.map((sound) => (
            <div key={sound.name} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-white/5 transition-colors group">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-200">{sound.name}</span>
                <button 
                  onClick={() => playPreview(sound.url)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-color)] transition-colors"
                >
                  <Icons.Play size={14} className="ml-0.5" />
                </button>
              </div>
              <button 
                onClick={() => {
                  onSelectSound(sound.url, sound.name);
                  onClose();
                }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Add to Timeline
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
