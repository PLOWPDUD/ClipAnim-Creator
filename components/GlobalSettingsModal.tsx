import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Shortcuts } from '../types';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  uiFont: string;
  setUiFont: (font: string) => void;
  shortcuts: Shortcuts;
  setShortcuts: (shortcuts: Shortcuts) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  accentColor,
  setAccentColor,
  uiFont,
  setUiFont,
  shortcuts,
  setShortcuts
}) => {
  const [recordingKey, setRecordingKey] = useState<keyof Shortcuts | null>(null);

  if (!isOpen) return null;

  const colors = [
    '#FF3B30', // Default Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FF2D55', // Pink
    '#00C7BE', // Teal
    '#FFCC00', // Yellow
  ];

  const fonts = [
    { label: 'System Default', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
    { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
    { label: 'Round', value: '"Varela Round", "Nunito", "Arial Rounded MT Bold", sans-serif' },
  ];

  const shortcutLabels: Record<keyof Shortcuts, string> = {
    selectTool: 'Select Tool',
    wandTool: 'Wand Tool',
    penTool: 'Pen Tool',
    eraserTool: 'Eraser Tool',
    fillTool: 'Fill Tool',
    shapeTool: 'Shape Tool',
    textTool: 'Text Tool',
    playPause: 'Play/Pause',
    nextFrame: 'Next Frame',
    prevFrame: 'Previous Frame',
    addFrame: 'Add Frame',
    deleteFrame: 'Delete Frame',
    undo: 'Undo',
    redo: 'Redo',
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: keyof Shortcuts) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setRecordingKey(null);
      return;
    }

    let keyStr = e.key;
    if (keyStr === ' ') keyStr = 'Space';
    if (keyStr.length === 1) keyStr = keyStr.toLowerCase();

    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const finalKey = [...modifiers, keyStr].join('+');
    
    setShortcuts({ ...shortcuts, [key]: finalKey });
    setRecordingKey(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="bg-[#1e1e1e] w-[500px] max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#252525] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Settings className="text-[var(--accent-color)]" />
            App Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1 no-scrollbar">
          {/* Accent Color */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Accent Color</label>
            <div className="grid grid-cols-8 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`w-full aspect-square rounded-full border-2 flex items-center justify-center transition-all ${accentColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                >
                  {accentColor === c && <Icons.Check size={14} className="text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* UI Font */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">App Font</label>
            <div className="grid grid-cols-2 gap-2">
              {fonts.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setUiFont(f.value)}
                  className={`w-full p-3 rounded-xl text-left transition-colors flex justify-between items-center ${uiFont === f.value ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  style={{ fontFamily: f.value }}
                >
                  <span className="text-sm">{f.label}</span>
                  {uiFont === f.value && <Icons.Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* Shortcuts */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Keyboard Shortcuts</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(Object.keys(shortcutLabels) as Array<keyof Shortcuts>).map((key) => (
                <div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                  <span className="text-sm text-gray-300">{shortcutLabels[key]}</span>
                  <button
                    onClick={() => setRecordingKey(key)}
                    onKeyDown={(e) => recordingKey === key ? handleKeyDown(e, key) : undefined}
                    onBlur={() => setRecordingKey(null)}
                    className={`min-w-[60px] px-2 py-1 rounded text-xs font-mono text-center transition-colors ${
                      recordingKey === key 
                        ? 'bg-[var(--accent-color)] text-white animate-pulse' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {recordingKey === key ? 'Press keys...' : shortcuts[key]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-[#252525] shrink-0">
            <button 
                onClick={onClose}
                className="w-full py-3 bg-[var(--accent-color)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
                Done
            </button>
        </div>

      </div>
    </div>
  );
};