import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from '../Icons';
import { Actor, Frame, TouchButtonConfig, TouchButtonColor, DEFAULT_TOUCH_BUTTONS } from '../types';
import {
  SNIPPETS,
  SCRIPT_TYPES,
  ScriptType,
  CodeSnippet,
  preprocessActionScript,
  createFlashCompatibilityEnvironment,
  attachFlashActorProperties
} from '../utils/actionScriptSnippets';

interface ScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  actors: Actor[];
  onUpdateActorScript: (id: string, script: string) => void;
  projectScript: string;
  onUpdateProjectScript: (script: string) => void;
  frames: Frame[];
  onUpdateFrameScript: (frameIndex: number, script: string) => void;
  touchButtons?: TouchButtonConfig[];
  onUpdateTouchButtons?: (buttons: TouchButtonConfig[]) => void;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({
  isOpen,
  onClose,
  actors,
  onUpdateActorScript,
  projectScript,
  onUpdateProjectScript,
  frames,
  onUpdateFrameScript,
  touchButtons,
  onUpdateTouchButtons
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('project'); // 'project', actor ID, or 'frame_INDEX'
  const [currentScript, setCurrentScript] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'snippets' | 'touchpad' | 'console' | 'docs'>('editor');
  const [selectedScriptType, setSelectedScriptType] = useState<ScriptType>('flash8_as2');
  const [snippetSearch, setSnippetSearch] = useState<string>('');
  const [snippetCategory, setSnippetCategory] = useState<string>('All');
  const [snippetTypeFilter, setSnippetTypeFilter] = useState<string>('All');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'error' | 'info'; text: string; time: string }[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Touchpad Buttons State
  const [touchButtonsList, setTouchButtonsList] = useState<TouchButtonConfig[]>(
    () => (touchButtons && touchButtons.length > 0 ? touchButtons : DEFAULT_TOUCH_BUTTONS)
  );

  useEffect(() => {
    if (touchButtons && touchButtons.length > 0) {
      setTouchButtonsList(touchButtons);
    }
  }, [touchButtons]);

  // Touchpad Button Builder State
  const [newButtonLabel, setNewButtonLabel] = useState('E');
  const [newButtonKey, setNewButtonKey] = useState('e');
  const [newButtonCode, setNewButtonCode] = useState('KeyE');
  const [newButtonColor, setNewButtonColor] = useState<TouchButtonColor>('blue');
  const [newButtonSize, setNewButtonSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [newButtonPosition, setNewButtonPosition] = useState<'right' | 'left' | 'center'>('right');
  const [isDetectingKey, setIsDetectingKey] = useState(false);
  const [testActiveKey, setTestActiveKey] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Key detection listener
  useEffect(() => {
    if (!isDetectingKey) return;
    const handleKeyDetect = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let k = e.key;
      let c = e.code;
      let label = k.toUpperCase();
      if (k === ' ') {
        k = ' ';
        c = 'Space';
        label = 'SPACE';
      } else if (k === 'Enter') {
        label = 'ENTER';
      } else if (k === 'Shift') {
        label = 'SHIFT';
      } else if (k === 'Escape') {
        label = 'ESC';
      } else if (k.length === 1) {
        label = k.toUpperCase();
      }
      setNewButtonKey(k);
      setNewButtonCode(c);
      setNewButtonLabel(label);
      setIsDetectingKey(false);
      setTestFeedback(`Detected key '${k}' (${c})!`);
      setTimeout(() => setTestFeedback(null), 3000);
    };
    window.addEventListener('keydown', handleKeyDetect, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDetect, { capture: true });
    };
  }, [isDetectingKey]);

  const handleAddTouchButton = () => {
    const rawKey = newButtonKey.trim() || 'e';
    const normKey = rawKey.toLowerCase() === 'space' ? ' ' : rawKey;
    const label = (newButtonLabel.trim() || (normKey === ' ' ? 'SPACE' : normKey.toUpperCase())).slice(0, 10);
    const code = newButtonCode || (normKey.length === 1 ? `Key${normKey.toUpperCase()}` : (normKey === ' ' ? 'Space' : normKey));
    
    const newBtn: TouchButtonConfig = {
      id: 'btn-' + Math.random().toString(36).slice(2, 9),
      label,
      key: normKey,
      code,
      color: newButtonColor,
      size: newButtonSize,
      position: newButtonPosition
    };

    const updated = [...touchButtonsList.filter(b => b.label.toLowerCase() !== newBtn.label.toLowerCase()), newBtn];
    setTouchButtonsList(updated);
    if (onUpdateTouchButtons) {
      onUpdateTouchButtons(updated);
    }
    addConsoleLog('info', `🎮 Added Touchpad Button: "${newBtn.label}" triggering key '${newBtn.key}' (${newBtn.code})`);
    setTestFeedback(`Added button "${newBtn.label}" for key '${newBtn.key}'!`);
    setTimeout(() => setTestFeedback(null), 3500);
  };

  const handleDeleteTouchButton = (id: string) => {
    const updated = touchButtonsList.filter(b => b.id !== id);
    setTouchButtonsList(updated);
    if (onUpdateTouchButtons) {
      onUpdateTouchButtons(updated);
    }
    addConsoleLog('info', `Deleted Touchpad Button [${id}]`);
  };

  const handleResetTouchButtons = () => {
    setTouchButtonsList(DEFAULT_TOUCH_BUTTONS);
    if (onUpdateTouchButtons) {
      onUpdateTouchButtons(DEFAULT_TOUCH_BUTTONS);
    }
    addConsoleLog('info', `Reset Touchpad Buttons to defaults`);
  };

  const insertTouchButtonListener = (btn: TouchButtonConfig, style: 'if' | 'event' | 'flash8' | 'scriptDef') => {
    const isSpace = btn.key === ' ' || btn.key.toLowerCase() === 'space';
    const keyRepr = isSpace ? ' ' : btn.key;
    const charCode = isSpace ? 'Key.SPACE' : (btn.key.length === 1 ? btn.key.toUpperCase().charCodeAt(0) : `'${btn.key}'`);

    let snippet = '';
    if (style === 'if') {
      snippet = `// Touchpad & Keyboard check for '${btn.label}' button\nif (isKeyDown("${keyRepr}")) {\n  // Action when '${btn.label}' is held\n  trace("${btn.label} button is active!");\n}`;
    } else if (style === 'event') {
      snippet = `// Handle '${btn.label}' button press event\nthis.onKeyDown = function(key) {\n  if (key === "${keyRepr}" || key.toLowerCase() === "${keyRepr.toLowerCase()}") {\n    trace("${btn.label} pressed!");\n  }\n};`;
    } else if (style === 'flash8') {
      snippet = `// Macromedia Flash 8 check for '${btn.label}'\nif (Key.isDown(${charCode})) {\n  trace("${btn.label} key pressed!");\n}`;
    } else if (style === 'scriptDef') {
      snippet = `// Dynamically add '${btn.label}' touchpad button\naddTouchButton({\n  label: "${btn.label}",\n  key: "${keyRepr}",\n  color: "${btn.color || 'blue'}",\n  size: "${btn.size || 'md'}"\n});`;
    }

    const updated = currentScript ? `${currentScript}\n\n${snippet}` : snippet;
    setCurrentScript(updated);
    setHasUnsavedChanges(true);
    setActiveTab('editor');
    addConsoleLog('info', `Inserted code snippet for button '${btn.label}' into script`);
  };

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

  // Real-time syntax validation (runs on preprocessed code so Flash 8 block syntax validates accurately)
  useEffect(() => {
    if (!currentScript.trim()) {
      setSyntaxError(null);
      return;
    }
    try {
      const preprocessed = preprocessActionScript(currentScript);
      new Function(preprocessed);
      setSyntaxError(null);
    } catch (err: any) {
      setSyntaxError(err.message || 'Syntax error in script');
    }
  }, [currentScript]);

  // Filtered Snippets
  const filteredSnippets = useMemo(() => {
    return SNIPPETS.filter(snip => {
      // Search query filter
      if (snippetSearch.trim()) {
        const q = snippetSearch.toLowerCase();
        const matchesText =
          snip.name.toLowerCase().includes(q) ||
          snip.description.toLowerCase().includes(q) ||
          snip.code.toLowerCase().includes(q) ||
          snip.origin.toLowerCase().includes(q) ||
          snip.category.toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      // Category filter
      if (snippetCategory !== 'All' && snip.category !== snippetCategory) {
        return false;
      }
      // Script Type filter
      if (snippetTypeFilter !== 'All') {
        if (snip.scriptType !== 'all' && snip.scriptType !== snippetTypeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [snippetSearch, snippetCategory, snippetTypeFilter]);

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
    addConsoleLog('info', `Evaluating sandbox execution of ${getTargetDisplayName(selectedTarget)} [${selectedScriptType}]...`);
    try {
      const mockKeys: Record<string, boolean> = { ArrowRight: false, ArrowLeft: false, ArrowUp: false, ArrowDown: false, Space: false };
      const mockMouse = { x: 400, y: 300 };
      const currentFrameRef = { current: 0 };
      const keysRef = { current: mockKeys };
      const mousePosRef = { current: mockMouse };

      const mockApi = {
        play: () => addConsoleLog('info', '▶ play() called'),
        stop: () => addConsoleLog('info', '⏸ stop() called'),
        gotoAndPlay: (f: number) => addConsoleLog('info', `⏩ gotoAndPlay(${f}) called`),
        gotoAndStop: (f: number) => addConsoleLog('info', `⏹ gotoAndStop(${f}) called`),
        nextFrame: () => addConsoleLog('info', '⏭ nextFrame() called'),
        prevFrame: () => addConsoleLog('info', '⏮ prevFrame() called'),
        getCurrentFrame: () => 1,
        stopAllSounds: () => addConsoleLog('info', '🔇 stopAllSounds() called')
      };

      const mockGameUtils = {
        playSound: (id: string) => addConsoleLog('info', `🎵 playSound("${id}") triggered`),
        spawnParticle: (p: any) => addConsoleLog('info', `✨ spawnParticle({ color: "${p?.color || '#fff'}" })`),
        shakeCamera: (intensity: number, ms: number) => addConsoleLog('info', `📳 shakeCamera(${intensity}, ${ms}ms)`)
      };

      const mockActor: any = {
        id: 'test-actor',
        name: 'TestActor',
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        width: 80,
        height: 80,
        onUpdate: null as Function | null,
        onEnterFrame: null as Function | null,
        onLoad: null as Function | null,
        onClick: null as Function | null,
        onPress: null as Function | null,
        onRelease: null as Function | null,
        onPointerDown: null as Function | null,
        onPointerUp: null as Function | null,
        hitTestPoint: (px: number, py: number) => px >= 100 && px <= 180 && py >= 100 && py <= 180,
        hitTest: () => false
      };

      attachFlashActorProperties(mockActor, mockActor, mousePosRef);

      const symbolScope = { [mockActor.name]: mockActor };

      const flashEnv = createFlashCompatibilityEnvironment({
        api: mockApi,
        gameUtils: mockGameUtils,
        symbolScope,
        frames: frames.length > 0 ? frames : [{ id: 'f1' } as any],
        currentFrameRef,
        keysRef,
        mousePosRef,
        addConsoleLog
      });

      const customConsole = {
        log: (...args: any[]) => addConsoleLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => addConsoleLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        info: (...args: any[]) => addConsoleLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
      };

      const transpiled = preprocessActionScript(currentScript);

      const environment = {
        keys: mockKeys,
        mouse: mockMouse,
        actors: [mockActor],
        console: customConsole,
        ...mockGameUtils,
        ...flashEnv,
        ...symbolScope
      };

      const envKeys = Object.keys(environment);
      const envValues = Object.values(environment);

      const runner = new Function(
        ...envKeys,
        `with(this) { 
          ${transpiled} 
          if (typeof onLoad === "function") { onLoad.call(this); }
          if (typeof onEnterFrame === "function") { onEnterFrame.call(this, 1/60); }
          if (typeof onUpdate === "function") { onUpdate.call(this, 1/60); }
        }`
      );

      runner.apply(mockActor, envValues);

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
    addConsoleLog('info', `Inserted snippet: "${snippet.name}" (${snippet.origin})`);
  };

  const copySnippetCode = (snippet: CodeSnippet) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet.code);
      setCopiedSnippetId(snippet.id);
      setTimeout(() => setCopiedSnippetId(null), 2000);
    }
  };

  const applyStarterTemplate = () => {
    const activeDef = SCRIPT_TYPES.find(t => t.id === selectedScriptType);
    if (!activeDef) return;

    let template = '';
    if (selectedTarget === 'project') {
      template = activeDef.starterTemplates.project;
    } else if (selectedTarget.startsWith('frame_')) {
      template = activeDef.starterTemplates.frame;
    } else {
      template = activeDef.starterTemplates.actor;
    }

    if (currentScript.trim() && !window.confirm(`Replace current script with the ${activeDef.name} starter template?`)) {
      return;
    }

    setCurrentScript(template);
    setHasUnsavedChanges(true);
    addConsoleLog('info', `Applied ${activeDef.name} starter template for ${getTargetDisplayName(selectedTarget)}`);
  };

  // Line numbering
  const lineCount = Math.max(1, currentScript.split('\n').length);
  const activeTypeDef = SCRIPT_TYPES.find(t => t.id === selectedScriptType) || SCRIPT_TYPES[0];

  return (
    <div className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-6xl h-[92vh] rounded-3xl border border-gray-700/80 shadow-2xl flex flex-col overflow-hidden text-gray-200">
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-gray-800 bg-[#202020] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Icons.Code size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-black text-base tracking-tight">Script & Action IDE</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 font-mono font-bold">
                  {getTargetDisplayName(selectedTarget)}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold animate-pulse">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Macromedia Flash 8, Adobe Animate & ClipAnim scripting engine.
              </p>
            </div>
          </div>

          {/* Script Type Picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#151515] p-1 rounded-xl border border-gray-850">
              <span className="text-[10px] font-bold text-gray-400 px-2 uppercase tracking-wider">Type:</span>
              <div className="flex items-center gap-1">
                {SCRIPT_TYPES.map(type => {
                  const isSelected = selectedScriptType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedScriptType(type.id);
                        setSnippetTypeFilter(type.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-gray-800 text-white shadow-sm border border-gray-700'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title={type.description}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: type.badgeColor }}
                      />
                      <span>{type.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starter Template Button */}
            <button
              onClick={applyStarterTemplate}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 rounded-xl text-xs font-bold transition-all border border-gray-700 flex items-center gap-1"
              title="Apply starter boilerplate code for active script type"
            >
              <Icons.Sparkles size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Starter Code</span>
            </button>

            {/* Run Sandbox Button */}
            <button
              onClick={handleRunTest}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all border border-emerald-400/30"
              title="Test run script in sandbox"
            >
              <Icons.Play size={13} />
              <span>Test Run</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110"
              style={{ backgroundColor: 'var(--accent-color, #007AFF)' }}
            >
              <Icons.Check size={14} />
              <span>Save Code</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* View Tabs & Syntax Status */}
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
              onClick={() => setActiveTab('touchpad')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'touchpad' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icons.Gamepad2 size={14} className="text-rose-400" />
              <span>Touchpad Buttons ({touchButtonsList.length})</span>
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

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTypeDef.badgeColor }} />
              {activeTypeDef.software} Mode
            </span>

            {syntaxError ? (
              <span className="text-[11px] text-red-400 font-mono flex items-center gap-1.5 bg-red-950/40 border border-red-800/60 px-2.5 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {syntaxError}
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Syntax Valid
              </span>
            )}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Target Hierarchy Sidebar */}
          <div className="w-64 border-r border-gray-800 bg-[#141414] overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar shrink-0">
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
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Frame contains action script" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-800/80 pt-2 flex-1 flex flex-col min-h-0">
              <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                <span>Interactive Actors</span>
                <span className="text-[10px] text-gray-600">{actors.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                {actors.map((actor) => {
                  const isSelected = selectedTarget === actor.id;
                  const hasScript = !!actor.scripts && actor.scripts.trim().length > 0;
                  return (
                    <button
                      key={actor.id}
                      onClick={() => { if (hasUnsavedChanges) handleSave(); setSelectedTarget(actor.id); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        isSelected
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                          : 'text-gray-300 hover:bg-gray-800/60 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icons.Layers size={13} className={hasScript ? "text-purple-400" : "text-gray-500"} />
                        <span className="truncate">{actor.name}</span>
                      </span>
                      {hasScript && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Actor contains behavior script" />
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
                      ? `// Frame Action (${activeTypeDef.name})\n// Executes automatically when this timeline frame is reached.\n// Example:\nstop();\n\nif (_root.score >= 100) {\n  _root.gotoAndPlay(5);\n}`
                      : selectedTarget === 'project'
                      ? `// Project Global Initialization (${activeTypeDef.name})\n// Executes once before playback begins.\n_root.score = 0;\ntrace("Project Initialized in ${activeTypeDef.name}!");\nstop();`
                      : `// Actor MovieClip Script (${activeTypeDef.name})\nonClipEvent (load) {\n  speed = 6;\n  trace("Loaded actor: " + this._name);\n}\n\nonClipEvent (enterFrame) {\n  if (Key.isDown(Key.RIGHT)) this._x += speed;\n  if (Key.isDown(Key.LEFT))  this._x -= speed;\n}\n\non (release) {\n  trace("Clicked actor!");\n}`
                  }
                />
              </div>

              {/* Bottom Quick Snippets Bar */}
              <div className="bg-[#181818] border-t border-gray-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-gray-500 font-bold text-[11px]">Quick Insert:</span>
                  <button
                    onClick={() => setActiveTab('touchpad')}
                    className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-rose-300 border border-red-700/60 rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                    title="Configure touch buttons (Space, E, Shift, or any button) & generate code"
                  >
                    <Icons.Gamepad2 size={12} className="text-rose-400" />
                    <span>🎮 Touchpad Buttons</span>
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_stop') || SNIPPETS[0])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + stop();
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_goto_play') || SNIPPETS[1])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + gotoAndPlay()
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_arrow_movement') || SNIPPETS[17])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + Arrow Keys (Flash 8)
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_btn_release') || SNIPPETS[8])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + on (release)
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_drag_drop') || SNIPPETS[10])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + Drag & Drop
                  </button>
                  <button
                    onClick={() => insertSnippet(SNIPPETS.find(s => s.id === 'flash8_hittest_actor') || SNIPPETS[23])}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition-colors"
                  >
                    + hitTest
                  </button>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  {lineCount} lines • {activeTypeDef.name}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Code Snippets & Game Templates */}
          {activeTab === 'snippets' && (
            <div className="flex-1 bg-[#111111] p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-bold text-sm">Macromedia Flash 8 & Adobe Animate Snippets</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Authentic ActionScript 2.0, HTML5 Canvas, and AS3 snippets directly inspired by classic authoring tools.
                  </p>
                </div>

                {/* Snippet Search Input */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={snippetSearch}
                    onChange={(e) => setSnippetSearch(e.target.value)}
                    placeholder="Search snippets (hitTest, drag, etc.)..."
                    className="w-full bg-[#181818] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
                  />
                  {snippetSearch && (
                    <button
                      onClick={() => setSnippetSearch('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white"
                    >
                      <Icons.X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800">
                <span className="text-[11px] text-gray-500 font-bold">Category:</span>
                {['All', 'Timeline & Scenes', 'Interactivity & Mouse', 'Movement & Controls', 'Game & Physics', 'Animation & Tween', 'Audio & System'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSnippetCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      snippetCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="text-[11px] text-gray-500 font-bold">Origin:</span>
                {[
                  { id: 'All', label: 'All Engines' },
                  { id: 'flash8_as2', label: '⚡ Macromedia Flash 8' },
                  { id: 'animate_html5', label: '🎨 Adobe Animate HTML5' },
                  { id: 'flash_as3', label: '🔷 ActionScript 3.0' },
                  { id: 'clipanim_js', label: '🚀 ClipAnim JS' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSnippetTypeFilter(item.id)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                      snippetTypeFilter === item.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-850 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Snippet Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSnippets.map(snip => {
                  const isCopied = copiedSnippetId === snip.id;
                  const isFlash8 = snip.origin === 'Macromedia Flash 8';
                  const isAnimate = snip.origin === 'Adobe Animate';

                  return (
                    <div
                      key={snip.id}
                      className="bg-[#181818] border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-white font-bold text-xs">{snip.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  isFlash8
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    : isAnimate
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {snip.origin}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 font-semibold">
                                {snip.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{snip.description}</p>

                        <pre className="mt-2.5 p-2.5 bg-[#0d0d0d] border border-gray-850 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-36 custom-scrollbar selection:bg-blue-600/40">
                          {snip.code}
                        </pre>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80">
                        <button
                          onClick={() => copySnippetCode(snip)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
                        >
                          <Icons.Sparkles size={12} className={isCopied ? "text-emerald-400" : "text-gray-400"} />
                          <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                        <button
                          onClick={() => insertSnippet(snip)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Icons.Check size={13} />
                          <span>Insert into Editor</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredSnippets.length === 0 && (
                  <div className="col-span-full py-16 text-center text-gray-500">
                    <p className="font-semibold text-sm">No snippets match your filter criteria.</p>
                    <button
                      onClick={() => { setSnippetSearch(''); setSnippetCategory('All'); setSnippetTypeFilter('All'); }}
                      className="mt-2 text-xs text-blue-400 hover:underline"
                    >
                      Clear search and category filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Touchpad Custom Buttons Configurator */}
          {activeTab === 'touchpad' && (
            <div className="flex-1 bg-[#111111] p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              {/* Header & Description */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
                      <Icons.Gamepad2 size={18} />
                    </span>
                    <h3 className="text-white font-black text-sm tracking-wide">
                      Touchpad Controls & Virtual On-Screen Buttons
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                    Add custom buttons for the virtual touchpad when coding. Specify which button to trigger (such as <strong className="text-rose-300">Space</strong>, <strong className="text-blue-300">E</strong>, <strong className="text-emerald-300">Shift</strong>, or <strong className="text-amber-300">any custom key</strong>). Use the one-click code insert buttons to check them in your scripts!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetTouchButtons}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-all border border-gray-700/60"
                    title="Reset to default A & B buttons"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={() => {
                      const allDefs = touchButtonsList.map(b => 
                        `addTouchButton({ label: "${b.label}", key: "${b.key === ' ' ? ' ' : b.key}", color: "${b.color || 'blue'}", size: "${b.size || 'md'}" });`
                      ).join('\n');
                      const snippet = `// Configure custom touch buttons on startup:\n${allDefs}`;
                      setCurrentScript(prev => prev ? `${prev}\n\n${snippet}` : snippet);
                      setHasUnsavedChanges(true);
                      setActiveTab('editor');
                    }}
                    className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    title="Insert addTouchButton() initialization code into current script"
                  >
                    <Icons.Code size={13} />
                    <span>Insert All in Code</span>
                  </button>
                </div>
              </div>

              {/* Top Section: Form on Left + Live Virtual Pad Playground on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* 1. Add Button Form (7 cols) */}
                <div className="lg:col-span-7 bg-[#161616] border border-gray-800/90 rounded-2xl p-4 shadow-md flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                      <Icons.Plus size={14} className="text-emerald-400" />
                      <span>Create New Touchpad Button</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {touchButtonsList.length} Active Button{touchButtonsList.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Quick Preset Selector Chips */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 block mb-1.5">
                      1. Choose Target Key Preset (or type any custom key below):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'SPACE', key: ' ', code: 'Space', desc: 'Jump / Action' },
                        { label: 'E', key: 'e', code: 'KeyE', desc: 'Interact / Use' },
                        { label: 'SHIFT', key: 'Shift', code: 'ShiftLeft', desc: 'Sprint / Run' },
                        { label: 'ENTER', key: 'Enter', code: 'Enter', desc: 'Confirm' },
                        { label: 'W', key: 'w', code: 'KeyW', desc: 'Up' },
                        { label: 'A', key: 'a', code: 'KeyA', desc: 'Left' },
                        { label: 'S', key: 's', code: 'KeyS', desc: 'Down' },
                        { label: 'D', key: 'd', code: 'KeyD', desc: 'Right' },
                        { label: 'Q', key: 'q', code: 'KeyQ', desc: 'Skill 1' },
                        { label: 'F', key: 'f', code: 'KeyF', desc: 'Skill 2' },
                        { label: 'R', key: 'r', code: 'KeyR', desc: 'Reload' },
                        { label: 'Z', key: 'z', code: 'KeyZ', desc: 'Action Z' },
                        { label: 'X', key: 'x', code: 'KeyX', desc: 'Action X' },
                        { label: 'C', key: 'c', code: 'KeyC', desc: 'Dash' },
                        { label: 'ESC', key: 'Escape', code: 'Escape', desc: 'Menu' },
                      ].map((preset) => {
                        const isSelected = newButtonKey === preset.key;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setNewButtonKey(preset.key);
                              setNewButtonCode(preset.code);
                              setNewButtonLabel(preset.label);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                              isSelected
                                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                                : 'bg-gray-800/80 hover:bg-gray-750 text-gray-300 border border-gray-700/50'
                            }`}
                            title={`${preset.label}: ${preset.desc}`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Input Fields: Label + Custom Key + Key Detector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-800/70">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">
                        Button Display Label:
                      </label>
                      <input
                        type="text"
                        value={newButtonLabel}
                        maxLength={10}
                        onChange={(e) => setNewButtonLabel(e.target.value)}
                        placeholder="e.g. SPACE, E, JUMP, DASH"
                        className="w-full bg-[#111111] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase tracking-wider outline-none focus:border-rose-500"
                      />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">Shown on the on-screen button</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">
                        Specify Target Key (Any Button):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newButtonKey === ' ' ? 'Space' : newButtonKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.toLowerCase() === 'space') {
                              setNewButtonKey(' ');
                              setNewButtonCode('Space');
                            } else {
                              setNewButtonKey(val);
                              setNewButtonCode(val.length === 1 ? `Key${val.toUpperCase()}` : val);
                            }
                          }}
                          placeholder="e.g. e, space, shift, 1, f"
                          className="flex-1 bg-[#111111] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-rose-300 font-mono font-bold outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setIsDetectingKey(true)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 border ${
                            isDetectingKey
                              ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                              : 'bg-gray-800 hover:bg-gray-700 text-amber-300 border-amber-500/40'
                          }`}
                          title="Click here and press any key on your physical keyboard to automatically detect it"
                        >
                          {isDetectingKey ? 'Press Any Key Now...' : '🎯 Detect Key'}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        Triggers: <code className="text-gray-300">{newButtonKey === ' ' ? 'Space' : newButtonKey}</code> (Code: {newButtonCode})
                      </span>
                    </div>
                  </div>

                  {/* Color, Size, and Placement Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-800/70 text-xs">
                    {/* Color Theme */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Color Theme:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'red', name: 'Red', bg: 'bg-red-500' },
                          { id: 'blue', name: 'Blue', bg: 'bg-blue-500' },
                          { id: 'green', name: 'Green', bg: 'bg-emerald-500' },
                          { id: 'amber', name: 'Amber', bg: 'bg-amber-500' },
                          { id: 'purple', name: 'Purple', bg: 'bg-purple-500' },
                          { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500' },
                          { id: 'gray', name: 'Gray', bg: 'bg-gray-500' },
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNewButtonColor(c.id as TouchButtonColor)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${c.bg} ${
                              newButtonColor === c.id ? 'ring-2 ring-white scale-110 shadow' : 'opacity-60 hover:opacity-100'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Button Size:</label>
                      <div className="flex items-center gap-1">
                        {(['sm', 'md', 'lg'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setNewButtonSize(sz)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                              newButtonSize === sz
                                ? 'bg-gray-700 text-white shadow ring-1 ring-gray-400'
                                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {sz === 'sm' ? 'S' : sz === 'md' ? 'M' : 'L'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Placement Position */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Screen Cluster:</label>
                      <div className="flex items-center gap-1">
                        {(['right', 'center', 'left'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setNewButtonPosition(pos)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                              newButtonPosition === pos
                                ? 'bg-gray-700 text-white shadow ring-1 ring-gray-400'
                                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Button Action */}
                  <div className="pt-2 flex items-center justify-between">
                    {testFeedback ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Icons.Check size={14} />
                        <span>{testFeedback}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">
                        Will be available in <code className="text-rose-300">isKeyDown("{newButtonKey === ' ' ? ' ' : newButtonKey}")</code>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleAddTouchButton}
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-900/30 flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Icons.Plus size={15} />
                      <span>Add Touchpad Button</span>
                    </button>
                  </div>
                </div>

                {/* 2. Interactive Live Touchpad Playground (5 cols) */}
                <div className="lg:col-span-5 bg-gradient-to-b from-[#181818] to-[#121212] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <Icons.Play size={13} />
                        <span>Interactive Touchpad Preview</span>
                      </span>
                      <span className="text-[10px] text-gray-500">Click buttons to test!</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Tap or click any button below to test how it reacts in the game player in real time.
                    </p>
                  </div>

                  {/* Visual Touchpad Mockup Box */}
                  <div className="my-4 p-4 bg-black/60 border border-gray-800/80 rounded-2xl flex items-center justify-between gap-4 relative overflow-hidden min-h-[160px]">
                    {/* Simulated D-Pad */}
                    <div className="grid grid-cols-3 gap-1 w-24 h-24 select-none">
                      <div />
                      <button
                        type="button"
                        onPointerDown={() => { setTestActiveKey('ArrowUp'); setTestFeedback("D-Pad: ArrowUp"); }}
                        onPointerUp={() => setTestActiveKey(null)}
                        className={`w-7 h-7 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-xs font-bold transition-all ${
                          testActiveKey === 'ArrowUp' ? 'bg-red-600 text-white scale-95 ring-2 ring-red-400' : 'hover:bg-gray-700'
                        }`}
                      >▲</button>
                      <div />
                      <button
                        type="button"
                        onPointerDown={() => { setTestActiveKey('ArrowLeft'); setTestFeedback("D-Pad: ArrowLeft"); }}
                        onPointerUp={() => setTestActiveKey(null)}
                        className={`w-7 h-7 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-xs font-bold transition-all ${
                          testActiveKey === 'ArrowLeft' ? 'bg-red-600 text-white scale-95 ring-2 ring-red-400' : 'hover:bg-gray-700'
                        }`}
                      >◀</button>
                      <div className="w-7 h-7 bg-gray-900 rounded-sm" />
                      <button
                        type="button"
                        onPointerDown={() => { setTestActiveKey('ArrowRight'); setTestFeedback("D-Pad: ArrowRight"); }}
                        onPointerUp={() => setTestActiveKey(null)}
                        className={`w-7 h-7 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-xs font-bold transition-all ${
                          testActiveKey === 'ArrowRight' ? 'bg-red-600 text-white scale-95 ring-2 ring-red-400' : 'hover:bg-gray-700'
                        }`}
                      >▶</button>
                      <div />
                      <button
                        type="button"
                        onPointerDown={() => { setTestActiveKey('ArrowDown'); setTestFeedback("D-Pad: ArrowDown"); }}
                        onPointerUp={() => setTestActiveKey(null)}
                        className={`w-7 h-7 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-xs font-bold transition-all ${
                          testActiveKey === 'ArrowDown' ? 'bg-red-600 text-white scale-95 ring-2 ring-red-400' : 'hover:bg-gray-700'
                        }`}
                      >▼</button>
                      <div />
                    </div>

                    {/* Action Buttons Cluster */}
                    <div className="flex flex-wrap items-center justify-end gap-2 max-w-[210px] select-none">
                      {touchButtonsList.map((btn) => {
                        const isPressed = testActiveKey === btn.key || testActiveKey === btn.label;
                        const col = btn.color || 'blue';
                        const colorClass = 
                          col === 'red' ? (isPressed ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-[0_0_18px_rgba(239,68,68,0.9)] scale-95' : 'bg-red-500/30 text-white border border-red-500/60') :
                          col === 'green' ? (isPressed ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)] scale-95' : 'bg-emerald-500/30 text-white border border-emerald-500/60') :
                          col === 'amber' ? (isPressed ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)] scale-95' : 'bg-amber-500/30 text-white border border-amber-500/60') :
                          col === 'purple' ? (isPressed ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.9)] scale-95' : 'bg-purple-500/30 text-white border border-purple-500/60') :
                          col === 'cyan' ? (isPressed ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.9)] scale-95' : 'bg-cyan-500/30 text-white border border-cyan-500/60') :
                          col === 'gray' ? (isPressed ? 'bg-gray-600 text-white ring-2 ring-gray-300 shadow-[0_0_15px_rgba(156,163,175,0.8)] scale-95' : 'bg-gray-700/40 text-white border border-gray-600/60') :
                          (isPressed ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.9)] scale-95' : 'bg-blue-500/30 text-white border border-blue-500/60');

                        return (
                          <button
                            key={btn.id}
                            type="button"
                            onPointerDown={() => {
                              setTestActiveKey(btn.key);
                              setTestFeedback(`Key '${btn.key}' (${btn.label}) DOWN`);
                            }}
                            onPointerUp={() => {
                              setTestActiveKey(null);
                              setTestFeedback(`Key '${btn.key}' released`);
                            }}
                            onPointerLeave={() => setTestActiveKey(null)}
                            className={`min-w-[42px] h-[42px] px-2 rounded-full font-black text-xs transition-all flex items-center justify-center shadow ${colorClass}`}
                            title={`Button: ${btn.label} (Key: ${btn.key === ' ' ? 'Space' : btn.key})`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Realtime readout */}
                  <div className="bg-black/40 border border-gray-800 rounded-xl px-3 py-2 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-gray-400">Live Status:</span>
                    <span className="text-emerald-400 font-bold">
                      {testActiveKey ? `Key: [${testActiveKey === ' ' ? 'Space' : testActiveKey}] ACTIVE` : 'Touch buttons to test'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Active Buttons Cards & Code Insert Helpers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <Icons.Layers size={14} className="text-purple-400" />
                    <span>Configured Touchpad Buttons ({touchButtonsList.length})</span>
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    Click any "+ Code" button to insert the handler directly into your script
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {touchButtonsList.map((btn) => {
                    const isSpace = btn.key === ' ' || btn.key.toLowerCase() === 'space';
                    const col = btn.color || 'blue';
                    const badgeBg = 
                      col === 'red' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      col === 'green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      col === 'amber' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      col === 'purple' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                      col === 'cyan' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                      col === 'gray' ? 'bg-gray-500/20 text-gray-300 border-gray-500/40' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/40';

                    return (
                      <div
                        key={btn.id}
                        className="bg-[#181818] border border-gray-800 hover:border-gray-700/80 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shadow ${badgeBg}`}>
                              {btn.label}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{btn.label} Button</span>
                                <span className="text-[10px] text-gray-500 uppercase">({btn.position || 'right'})</span>
                              </div>
                              <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-1.5">
                                <span>Key:</span>
                                <span className="text-rose-300 font-bold bg-black/40 px-1 py-0.5 rounded">
                                  {isSpace ? 'Space' : btn.key}
                                </span>
                                <span className="text-gray-500 text-[10px]">({btn.code})</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTouchButton(btn.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-950/30 transition-colors"
                            title={`Delete ${btn.label} button`}
                          >
                            <Icons.Trash2 size={13} />
                          </button>
                        </div>

                        {/* Code Snippet Generators */}
                        <div className="pt-2 border-t border-gray-800/80 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Insert Code into Script:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => insertTouchButtonListener(btn, 'if')}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[10px] font-mono transition-colors text-left truncate flex items-center gap-1"
                              title={`Insert isKeyDown("${btn.key}") check into current script`}
                            >
                              <span className="text-emerald-400 font-bold">+</span>
                              <span className="truncate">isKeyDown('{isSpace ? ' ' : btn.key}')</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => insertTouchButtonListener(btn, 'event')}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[10px] font-mono transition-colors text-left truncate flex items-center gap-1"
                              title={`Insert onKeyDown listener for '${btn.key}'`}
                            >
                              <span className="text-blue-400 font-bold">+</span>
                              <span className="truncate">onKeyDown</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => insertTouchButtonListener(btn, 'flash8')}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[10px] font-mono transition-colors text-left truncate flex items-center gap-1"
                              title={`Insert Flash 8 Key.isDown check`}
                            >
                              <span className="text-amber-400 font-bold">+</span>
                              <span className="truncate">Key.isDown</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => insertTouchButtonListener(btn, 'scriptDef')}
                              className="px-2 py-1 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 rounded-lg text-[10px] font-mono transition-colors text-left truncate flex items-center gap-1"
                              title={`Insert dynamic addTouchButton() statement`}
                            >
                              <span className="text-purple-400 font-bold">+</span>
                              <span className="truncate">addTouchButton</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ActionScript / JavaScript Touchpad Coding Reference */}
              <div className="bg-[#181818] border border-gray-800 rounded-2xl p-4 text-xs space-y-2.5">
                <h4 className="text-gray-300 font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Icons.Help size={13} className="text-amber-400" />
                  <span>How to Code Touchpad Buttons in ActionScript & Game Scripts</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-300 font-mono text-[11px]">
                  <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-rose-400 font-bold block mb-1">1. Fast Loop Check (isKeyDown):</span>
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
{`if (isKeyDown('e')) {
  // Triggers while E button is held
  this.interact();
}`}
                    </pre>
                  </div>

                  <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-blue-400 font-bold block mb-1">2. Event Handler (onKeyDown):</span>
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
{`this.onKeyDown = function(key) {
  if (key === ' ') {
    // Jump when Space button pressed
    this.jump();
  }
};`}
                    </pre>
                  </div>

                  <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-emerald-400 font-bold block mb-1">3. Dynamic Button from Script:</span>
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
{`// Add button from code anytime:
addTouchButton({
  label: "SPACE",
  key: " ",
  color: "red"
});`}
                    </pre>
                  </div>
                </div>
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
                  <span className="text-[10px] text-gray-500">Output from trace(), console.log(), and Flash 8 runtime events</span>
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
                    <p className="text-[11px] mt-1 text-gray-600">Click "Test Run" to evaluate your logic and inspect output.</p>
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
                <h3 className="text-white font-bold text-sm">ActionScript & Engine API Reference</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Complete documentation for Macromedia Flash 8, Adobe Animate, and ClipAnim scripting features.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Macromedia Flash 8 Reference */}
                <div className="bg-[#181818] border border-orange-500/30 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <h4 className="text-orange-400 font-bold text-xs uppercase tracking-wider">
                      Macromedia Flash 8 (ActionScript 2.0)
                    </h4>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">_root</code> - The main timeline scope. Access <code className="text-gray-300 font-mono">_root.gotoAndPlay(n)</code>, <code className="text-gray-300 font-mono">_root._currentframe</code>, and named actors directly as <code className="text-gray-300 font-mono">_root.myActor</code>.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this._x, this._y, this._rotation, this._alpha, this._xscale, this._yscale, this._visible</code> - Classic Flash 8 MovieClip properties (alpha and scale are 0-100%).
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">Key.isDown(Key.SPACE)</code> - Test key state with <code className="text-gray-300 font-mono">Key.LEFT, Key.RIGHT, Key.UP, Key.DOWN, Key.SPACE, Key.ENTER</code>.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.startDrag(true) / this.stopDrag()</code> - Enables classic interactive mouse dragging.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.hitTest(target)</code> - Checks bounding collision with another MovieClip or point <code className="text-gray-300 font-mono">hitTest(x, y, shapeFlag)</code>.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">onClipEvent (load) &#123;&#125; / onClipEvent (enterFrame) &#123;&#125;</code> - Classic MovieClip event blocks.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">on (release) &#123;&#125; / on (rollOver) &#123;&#125;</code> - Classic button handler blocks.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">trace("message")</code> - Logs output to the Output Console panel.
                    </li>
                    <li>
                      <code className="text-orange-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">new Sound() / attachSound(id) / start()</code> - Sound object playback.
                    </li>
                  </ul>
                </div>

                {/* Adobe Animate HTML5 Canvas Reference */}
                <div className="bg-[#181818] border border-red-500/30 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider">
                      Adobe Animate (HTML5 Canvas / CreateJS)
                    </h4>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li>
                      <code className="text-red-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">exportRoot</code> - Top-level HTML5 canvas root with timeline playback functions.
                    </li>
                    <li>
                      <code className="text-red-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.stop() / this.play() / this.gotoAndPlay(n)</code> - Adobe Animate timeline navigation.
                    </li>
                    <li>
                      <code className="text-red-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.on("tick", function() &#123;&#125;)</code> - 60 FPS animation loop listener.
                    </li>
                    <li>
                      <code className="text-red-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.on("click", function() &#123;&#125;)</code> - Mouse pointer click listener.
                    </li>
                    <li>
                      <code className="text-red-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">createjs.Tween.get(this).to(&#123; scaleX: 1.5 &#125;, 300)</code> - Programmatic tweening engine.
                    </li>
                  </ul>
                </div>

                {/* ClipAnim Native Engine */}
                <div className="bg-[#181818] border border-blue-500/30 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wider">
                      ClipAnim Native Game Engine (ES6)
                    </h4>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li>
                      <code className="text-blue-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">this.onUpdate = function(dt) &#123;&#125;</code> - Main high-performance game loop hook.
                    </li>
                    <li>
                      <code className="text-blue-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">spawnParticle(&#123; x, y, color, size &#125;)</code> - Spawns visual particle fx.
                    </li>
                    <li>
                      <code className="text-blue-300 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">shakeCamera(intensity, durationMs)</code> - Screen rumble effect on impact.
                    </li>
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
