import React, { useState, useEffect, useRef } from 'react';
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

interface CodeSnippet {
  id: string;
  name: string;
  category: 'Movement' | 'Interactivity' | 'Physics & Game' | 'Timeline & Audio';
  description: string;
  code: string;
}

const SNIPPETS: CodeSnippet[] = [
  {
    id: 'arrow_keys',
    name: 'Arrow Keys / WASD Movement',
    category: 'Movement',
    description: 'Smooth 8-way keyboard steering inside the onUpdate loop.',
    code: `// Keyboard controls (Arrow keys & WASD)
this.onUpdate = function() {
  var speed = 6;
  if (keys['ArrowRight'] || keys['KeyD']) this.x += speed;
  if (keys['ArrowLeft'] || keys['KeyA']) this.x -= speed;
  if (keys['ArrowUp'] || keys['KeyW']) this.y -= speed;
  if (keys['ArrowDown'] || keys['KeyS']) this.y += speed;
};`
  },
  {
    id: 'mouse_follow',
    name: 'Follow Mouse / Aim Cursor',
    category: 'Movement',
    description: 'Smoothly rotate towards and track the cursor position.',
    code: `// Smoothly rotate towards the mouse cursor
this.onUpdate = function() {
  if (typeof mouse !== 'undefined') {
    var dx = mouse.x - this.x;
    var dy = mouse.y - this.y;
    this.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
  }
};`
  },
  {
    id: 'drag_and_drop',
    name: 'Click & Drag Actor',
    category: 'Interactivity',
    description: 'Make this actor draggable with mouse or touch.',
    code: `// Interactive Drag & Drop
this.isDragging = false;

this.onPointerDown = function(e) {
  this.isDragging = true;
};

this.onPointerUp = function(e) {
  this.isDragging = false;
};

this.onUpdate = function() {
  if (this.isDragging && typeof mouse !== 'undefined') {
    this.x = mouse.x;
    this.y = mouse.y;
  }
};`
  },
  {
    id: 'click_score',
    name: 'Click to Score & Pop Animation',
    category: 'Interactivity',
    description: 'Increment game score and trigger a bouncy squish effect.',
    code: `// Click counter & bounce
this.onClick = function() {
  if (typeof globalScore === 'undefined') globalScore = 0;
  globalScore += 10;
  
  // Quick bounce scale
  this.scaleX = 1.3;
  this.scaleY = 1.3;
  console.log("Current Score:", globalScore);
};

this.onUpdate = function() {
  // Smoothly return to normal scale
  this.scaleX += (1.0 - this.scaleX) * 0.15;
  this.scaleY += (1.0 - this.scaleY) * 0.15;
};`
  },
  {
    id: 'gravity_jump',
    name: 'Platformer Gravity & Jump',
    category: 'Physics & Game',
    description: 'Simple physics with velocity, gravity acceleration, and ground floor.',
    code: `// Basic Gravity & Jump mechanics
this.vy = 0;
this.isGrounded = false;
var gravity = 0.6;
var groundY = 480;

this.onUpdate = function() {
  this.vy += gravity;
  this.y += this.vy;

  if (this.y >= groundY) {
    this.y = groundY;
    this.vy = 0;
    this.isGrounded = true;
  }

  // Jump on Space or Up Arrow
  if (this.isGrounded && (keys['Space'] || keys['ArrowUp'])) {
    this.vy = -12;
    this.isGrounded = false;
  }
};`
  },
  {
    id: 'collision_actor',
    name: 'Actor Collision Check (HitTest)',
    category: 'Physics & Game',
    description: 'Detect bounding distance overlap between two actors.',
    code: `// Collision detection with other actors
this.onUpdate = function() {
  if (typeof actors !== 'undefined') {
    for (var i = 0; i < actors.length; i++) {
      var other = actors[i];
      if (other.id !== this.id) {
        var dist = Math.hypot(this.x - other.x, this.y - other.y);
        if (dist < 40) {
          console.log("Collision detected with:", other.name || other.id);
        }
      }
    }
  }
};`
  },
  {
    id: 'frame_navigation',
    name: 'Timeline Navigation (gotoAndPlay)',
    category: 'Timeline & Audio',
    description: 'Jump to specific frames or loop sequences on condition.',
    code: `// Go to next scene/frame when goal is reached
if (typeof gotoAndPlay === 'function') {
  gotoAndPlay(0); // Jump to Frame 1 (0-indexed)
} else if (typeof stop === 'function') {
  stop(); // Pause timeline playback
}`
  },
  {
    id: 'spin_hover',
    name: 'Continuous Spin & Floating Bob',
    category: 'Movement',
    description: 'Cosmetic ambient float and rotation animation.',
    code: `// Idle hovering and continuous spin
this.timer = 0;
this.baseY = this.y;

this.onUpdate = function() {
  this.timer += 0.05;
  this.y = this.baseY + Math.sin(this.timer) * 15;
  this.rotation = (this.rotation + 2) % 360;
};`
  }
];

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({
  isOpen, onClose, actors, onUpdateActorScript, projectScript, onUpdateProjectScript, frames, onUpdateFrameScript
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('project'); // 'project', actor ID, or 'frame_INDEX'
  const [currentScript, setCurrentScript] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'snippets' | 'console' | 'docs'>('editor');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'error' | 'info'; text: string; time: string }[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync script when target changes
  useEffect(() => {
    let script = '';
    if (selectedTarget === 'project') {
      script = projectScript || '';
    } else if (selectedTarget.startsWith('frame_')) {
      const idx = parseInt(selectedTarget.replace('frame_', ''), 10);
      script = frames[idx]?.script || '';
    } else {
      const actor = actors.find(a => a.id === selectedTarget);
      if (actor) {
        script = actor.scripts || '';
      }
    }
    setCurrentScript(script);
    setHasUnsavedChanges(false);
  }, [selectedTarget, projectScript, actors, frames]);

  // Real-time syntax validation
  useEffect(() => {
    if (!currentScript.trim()) {
      setSyntaxError(null);
      return;
    }
    try {
      new Function(currentScript);
      setSyntaxError(null);
    } catch (err: any) {
      setSyntaxError(err.message || 'Syntax error in script');
    }
  }, [currentScript]);

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
    setHasUnsavedChanges(false);
    addConsoleLog('info', `Saved script for ${getTargetDisplayName(selectedTarget)}`);
  };

  const getTargetDisplayName = (targetId: string) => {
    if (targetId === 'project') return 'Project Global Script';
    if (targetId.startsWith('frame_')) {
      const idx = parseInt(targetId.replace('frame_', ''), 10);
      return `Frame ${idx + 1} Action`;
    }
    const actor = actors.find(a => a.id === targetId);
    return actor ? `Actor: ${actor.name}` : 'Unknown Target';
  };

  const addConsoleLog = (type: 'log' | 'error' | 'info', text: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev.slice(-49), { type, text, time }]);
  };

  const handleRunTest = () => {
    addConsoleLog('info', `Running sandbox execution of ${getTargetDisplayName(selectedTarget)}...`);
    try {
      const mockKeys: Record<string, boolean> = { ArrowRight: false, ArrowLeft: false, Space: false };
      const mockMouse = { x: 400, y: 300 };
      const mockActor = {
        id: 'test-actor',
        name: 'Test Actor',
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        onUpdate: function() {},
        onClick: function() {},
        onPointerDown: function() {},
        onPointerUp: function() {}
      };

      const customConsole = {
        log: (...args: any[]) => addConsoleLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => addConsoleLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        info: (...args: any[]) => addConsoleLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
      };

      const runner = new Function(
        'keys', 'mouse', 'actors', 'play', 'stop', 'gotoAndPlay', 'gotoAndStop', 'console',
        `with(this) { ${currentScript} \n if(typeof onUpdate === "function") { onUpdate.call(this); } }`
      );

      runner.call(
        mockActor,
        mockKeys,
        mockMouse,
        [mockActor],
        () => addConsoleLog('info', 'play() called'),
        () => addConsoleLog('info', 'stop() called'),
        (f: number) => addConsoleLog('info', `gotoAndPlay(${f}) called`),
        (f: number) => addConsoleLog('info', `gotoAndStop(${f}) called`),
        customConsole
      );

      addConsoleLog('info', '✅ Execution finished with 0 errors.');
    } catch (err: any) {
      addConsoleLog('error', `❌ Runtime Error: ${err.message}`);
    }
    setActiveTab('console');
  };

  const insertSnippet = (snippet: CodeSnippet) => {
    const updated = currentScript ? `${currentScript}\n\n${snippet.code}` : snippet.code;
    setCurrentScript(updated);
    setHasUnsavedChanges(true);
    setActiveTab('editor');
    addConsoleLog('info', `Inserted snippet: "${snippet.name}"`);
  };

  // Line numbering
  const lineCount = Math.max(1, currentScript.split('\n').length);

  return (
    <div className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-5xl h-[88vh] rounded-3xl border border-gray-700/80 shadow-2xl flex flex-col overflow-hidden text-gray-200">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-[#202020]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Icons.Code size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-black text-base tracking-tight">Interactive Script IDE</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 font-mono">
                  {getTargetDisplayName(selectedTarget)}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold animate-pulse">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Write real-time game logic, collision detection, and frame behaviors.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Run Sandbox Button */}
            <button
              onClick={handleRunTest}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all border border-emerald-400/30"
              title="Test run script in sandbox"
            >
              <Icons.Play size={14} />
              <span>Test Run</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110"
              style={{ backgroundColor: 'var(--accent-color, #007AFF)' }}
            >
              <Icons.Check size={15} />
              <span>Save Code</span>
            </button>

            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors">
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#161616] text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'editor' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icons.Code size={14} />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'snippets' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icons.Sparkles size={14} className="text-amber-400" />
              <span>Snippets ({SNIPPETS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'console' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icons.Layers size={14} className="text-blue-400" />
              <span>Output Console {consoleLogs.length > 0 && `(${consoleLogs.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'docs' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icons.Help size={14} className="text-purple-400" />
              <span>API Reference</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {syntaxError ? (
              <span className="text-[11px] text-red-400 font-mono flex items-center gap-1 bg-red-950/40 border border-red-800/60 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {syntaxError}
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Syntax Valid
              </span>
            )}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Target Hierarchy Sidebar */}
          <div className="w-64 border-r border-gray-800 bg-[#141414] overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
            <div>
              <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 mb-1">Global Scope</h3>
              <button
                onClick={() => { if (hasUnsavedChanges) handleSave(); setSelectedTarget('project'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left font-bold transition-all ${
                  selectedTarget === 'project'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800/70 border border-transparent'
                }`}
              >
                <Icons.Code size={15} />
                <span>Project Initialization</span>
              </button>
            </div>

            <div className="border-t border-gray-800/80 pt-2">
              <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                <span>Timeline Frames</span>
                <span className="text-[10px] text-gray-600">{frames.length}</span>
              </h3>
              <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                {frames.map((frame, index) => {
                  const isSelected = selectedTarget === `frame_${index}`;
                  const hasScript = !!frame.script && frame.script.trim().length > 0;
                  return (
                    <button
                      key={frame.id}
                      onClick={() => { if (hasUnsavedChanges) handleSave(); setSelectedTarget(`frame_${index}`); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                          : 'text-gray-300 hover:bg-gray-800/60 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icons.Clock size={13} className={hasScript ? "text-amber-400" : "text-gray-500"} />
                        <span>Frame {index + 1}</span>
                      </span>
                      {hasScript && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                          JS
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-800/80 pt-2">
              <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                <span>Actor Symbols</span>
                <span className="text-[10px] text-gray-600">{actors.length}</span>
              </h3>
              <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                {actors.map(actor => {
                  const isSelected = selectedTarget === actor.id;
                  const hasScript = !!actor.scripts && actor.scripts.trim().length > 0;
                  return (
                    <button
                      key={actor.id}
                      onClick={() => { if (hasUnsavedChanges) handleSave(); setSelectedTarget(actor.id); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                        isSelected
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                          : 'text-gray-300 hover:bg-gray-800/60 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icons.Box size={14} className={hasScript ? "text-purple-400" : "text-gray-500"} />
                        <span className="truncate">{actor.name}</span>
                      </span>
                      {hasScript && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                          JS
                        </span>
                      )}
                    </button>
                  );
                })}
                {actors.length === 0 && (
                  <p className="text-gray-500 text-[11px] px-2 py-1 italic leading-relaxed">
                    Use Lasso or Select Tool on the canvas, then click "Make Symbol" to add interactive actors.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tab 1: Code Editor */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col bg-[#111111]">
              <div className="flex-1 flex overflow-hidden relative">
                {/* Line Numbers */}
                <div className="w-12 bg-[#0d0d0d] border-r border-gray-800 text-gray-600 select-none py-4 text-right pr-3 font-mono text-xs leading-relaxed">
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={currentScript}
                  onChange={(e) => {
                    setCurrentScript(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="flex-1 p-4 bg-transparent text-gray-200 font-mono text-xs sm:text-sm resize-none outline-none leading-relaxed custom-scrollbar selection:bg-blue-600/40"
                  spellCheck="false"
                  placeholder={
                    selectedTarget.startsWith('frame_')
                      ? "// Frame Action Script\n// Executes automatically when this timeline frame is reached.\n// Example:\nif (score >= 100) {\n  gotoAndPlay(5);\n} else {\n  stop();\n}"
                      : selectedTarget === 'project'
                      ? "// Project Global Initialization Script\n// Executes once before animation begins.\nwindow.globalScore = 0;\nconsole.log('Project started!');"
                      : "// Actor Controller Script\n// Available methods:\nthis.onUpdate = function() {\n  // Runs 60 FPS every tick\n  this.x += 2;\n};\n\nthis.onClick = function() {\n  this.scaleX = 1.2;\n};"
                  }
                />
              </div>

              {/* Bottom Quick Bar */}
              <div className="bg-[#181818] border-t border-gray-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-gray-500 font-bold">Quick Insert:</span>
                  <button
                    onClick={() => insertSnippet(SNIPPETS[0])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + Movement
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS[2])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + Drag&Drop
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS[3])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + Click Score
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS[6])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + gotoAndPlay
                  </button>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  {lineCount} lines • JavaScript ES6
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Code Snippets & Game Templates */}
          {activeTab === 'snippets' && (
            <div className="flex-1 bg-[#111111] p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div>
                <h3 className="text-white font-bold text-sm">Interactive Game & Animation Snippets</h3>
                <p className="text-xs text-gray-400 mt-0.5">Click "Insert Snippet" to append ready-to-use code into your active target script.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {SNIPPETS.map(snip => (
                  <div key={snip.id} className="bg-[#181818] border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-bold text-xs">{snip.name}</h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                          {snip.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{snip.description}</p>
                      <pre className="mt-2.5 p-2.5 bg-[#0d0d0d] border border-gray-850 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-28 custom-scrollbar">
                        {snip.code}
                      </pre>
                    </div>
                    <button
                      onClick={() => insertSnippet(snip)}
                      className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Icons.Check size={13} className="text-emerald-400" />
                      <span>Insert Snippet</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Sandbox Console Output */}
          {activeTab === 'console' && (
            <div className="flex-1 bg-[#0f0f0f] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-800 bg-[#161616] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Icons.Layers size={14} className="text-blue-400" />
                    Sandbox Execution Console
                  </span>
                  <span className="text-[10px] text-gray-500">Logs captured during test execution</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                  >
                    Clear Console
                  </button>
                  <button
                    onClick={handleRunTest}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors"
                  >
                    Re-Run Script
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
                {consoleLogs.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Icons.Layers size={28} className="mx-auto mb-2 opacity-40" />
                    <p>Console is empty.</p>
                    <p className="text-[11px] mt-1 text-gray-600">Click "Test Run" to evaluate your JavaScript logic and see runtime output.</p>
                  </div>
                ) : (
                  consoleLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-3 py-1.5 rounded-lg flex items-start gap-2 border leading-relaxed ${
                        log.type === 'error'
                          ? 'bg-red-950/30 border-red-800/40 text-red-300'
                          : log.type === 'info'
                          ? 'bg-blue-950/20 border-blue-800/30 text-blue-300'
                          : 'bg-gray-900 border-gray-800 text-gray-300'
                      }`}
                    >
                      <span className="text-[10px] text-gray-500 shrink-0 select-none">[{log.time}]</span>
                      <span className="flex-1 break-all">{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: API Reference Documentation */}
          {activeTab === 'docs' && (
            <div className="flex-1 bg-[#111111] p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div>
                <h3 className="text-white font-bold text-sm">Engine Scripting API Cheatsheet</h3>
                <p className="text-xs text-gray-400 mt-0.5">Reference for available methods, actor properties, global variables, and event hooks.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-[#181818] border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-amber-400 font-bold text-xs mb-2">🎬 Timeline Functions</h4>
                  <ul className="space-y-1.5 text-gray-300">
                    <li><code className="text-amber-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">play()</code> - Starts playback of the main timeline.</li>
                    <li><code className="text-amber-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">stop()</code> - Pauses playback on current frame.</li>
                    <li><code className="text-amber-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">gotoAndPlay(frameIndex)</code> - Jumps to specific frame and plays.</li>
                    <li><code className="text-amber-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">gotoAndStop(frameIndex)</code> - Jumps to specific frame and stops.</li>
                  </ul>
                </div>

                <div className="bg-[#181818] border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-emerald-400 font-bold text-xs mb-2">🎮 Actor Transformation & Physics</h4>
                  <ul className="space-y-1.5 text-gray-300">
                    <li><code className="text-emerald-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.x / this.y</code> - X & Y position in pixels on canvas.</li>
                    <li><code className="text-emerald-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.vx / this.vy</code> - Velocity vectors.</li>
                    <li><code className="text-emerald-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.rotation</code> - Rotation in degrees (0 to 360).</li>
                    <li><code className="text-emerald-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.scaleX / this.scaleY</code> - Horizontal and vertical scale multipliers (1.0 = default).</li>
                    <li><code className="text-emerald-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.alpha</code> - Opacity (0.0 to 1.0).</li>
                  </ul>
                </div>

                <div className="bg-[#181818] border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-purple-400 font-bold text-xs mb-2">⚡ Event Callbacks</h4>
                  <ul className="space-y-1.5 text-gray-300">
                    <li><code className="text-purple-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.onUpdate = function() &#123;&#125;</code> - Invoked every animation frame tick (60 FPS).</li>
                    <li><code className="text-purple-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.onClick = function() &#123;&#125;</code> - Invoked when user clicks this actor.</li>
                    <li><code className="text-purple-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.onPointerDown / onPointerUp</code> - Touch / Mouse drag tracking events.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

