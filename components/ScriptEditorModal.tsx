import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { Actor, Frame } from '../types';

interface ScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  actors: Actor[];
  onUpdateActorScript: (id: string, script: string) => void;
  projectScript: string;
  onUpdateProjectScript: (script: string) => void;
  frames: Frame[];
  onUpdateFrameScript: (frameIndex: number, script: string) => void;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({
  isOpen, onClose, actors, onUpdateActorScript, projectScript, onUpdateProjectScript, frames, onUpdateFrameScript
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('project'); // 'project', actor ID, or 'frame_INDEX'
  const [currentScript, setCurrentScript] = useState<string>('');

  useEffect(() => {
    if (selectedTarget === 'project') {
      setCurrentScript(projectScript || '');
    } else if (selectedTarget.startsWith('frame_')) {
      const idx = parseInt(selectedTarget.replace('frame_', ''), 10);
      setCurrentScript(frames[idx]?.script || '');
    } else {
      const actor = actors.find(a => a.id === selectedTarget);
      if (actor) {
        setCurrentScript(actor.scripts || '');
      }
    }
  }, [selectedTarget, projectScript, actors, frames]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (selectedTarget === 'project') {
      onUpdateProjectScript(currentScript);
    } else if (selectedTarget.startsWith('frame_')) {
      const idx = parseInt(selectedTarget.replace('frame_', ''), 10);
      onUpdateFrameScript(idx, currentScript);
    } else {
      onUpdateActorScript(selectedTarget, currentScript);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] w-full max-w-4xl h-[80vh] rounded-3xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1e1e1e]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Icons.Code size={20} className="text-amber-400" />
            Script Editor
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#007AFF] text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-800 bg-[#141414] overflow-y-auto p-2 flex flex-col gap-1">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 px-2 pt-2">Global</h3>
            <button
              onClick={() => { handleSave(); setSelectedTarget('project'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                selectedTarget === 'project' ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icons.Code size={16} />
              Project Script
            </button>

            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-4 mb-2 px-2">Timeline Frames</h3>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border-b border-gray-800 pb-3 mb-2">
              {frames.map((frame, index) => {
                const isSelected = selectedTarget === `frame_${index}`;
                const hasScript = !!frame.script;
                return (
                  <button
                    key={frame.id}
                    onClick={() => { handleSave(); setSelectedTarget(`frame_${index}`); }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      isSelected ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icons.Clock size={14} className={hasScript ? "text-amber-400" : "text-gray-500"} />
                      <span>Frame {index + 1}</span>
                    </span>
                    {hasScript && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has script" />
                    )}
                  </button>
                );
              })}
            </div>

            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-2 mb-2 px-2">Symbols / Actors</h3>
            {actors.map(actor => (
              <button
                key={actor.id}
                onClick={() => { handleSave(); setSelectedTarget(actor.id); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selectedTarget === actor.id ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icons.Box size={16} />
                <span className="truncate">{actor.name}</span>
              </button>
            ))}
            {actors.length === 0 && (
              <p className="text-gray-500 text-xs px-2 italic">Select a drawing on the canvas and click "Make Symbol" to add actors.</p>
            )}
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col bg-[#111111]">
            <div className="flex-1 p-4 relative">
              <textarea
                value={currentScript}
                onChange={(e) => setCurrentScript(e.target.value)}
                className="w-full h-full bg-transparent text-gray-300 font-mono text-sm resize-none outline-none leading-relaxed"
                spellCheck="false"
                placeholder={
                  selectedTarget.startsWith('frame_')
                    ? "// Frame Action Script\n// Executes when this frame is entered.\n// Examples: stop(); or gotoAndPlay(0);"
                    : "// Write JavaScript code here..."
                }
              />
            </div>
            {/* Quick Reference */}
            <div className="bg-[#1e1e1e] border-t border-gray-800 p-3 text-xs text-gray-400">
              <strong className="text-gray-300">API Reference:</strong> <code className="text-amber-400 mx-1">play()</code> <code className="text-amber-400 mx-1">stop()</code> <code className="text-amber-400 mx-1">gotoAndStop(frame)</code> <code className="text-amber-400 mx-1">gotoAndPlay(frame)</code> <code className="text-amber-400 mx-1">this.x</code> <code className="text-amber-400 mx-1">this.y</code> <code className="text-amber-400 mx-1">this.rotation</code> <br/>
              <strong className="text-gray-300 mt-1 inline-block">Events:</strong> <code className="text-emerald-400 mx-1">this.onUpdate = function() {}</code> <code className="text-emerald-400 mx-1">this.onClick = function() {}</code>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
