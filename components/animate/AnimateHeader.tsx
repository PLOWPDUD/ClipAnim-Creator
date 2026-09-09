import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../../Icons';
import { WorkspaceMode } from '../../types';

interface AnimateHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  hasUnsavedChanges: boolean;
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  workspaceMode: WorkspaceMode;
  onSetWorkspaceMode: (mode: WorkspaceMode) => void;
  onSaveProject: () => void;
  onExportMovie: () => void;
  onOpenProjectSettings: () => void;
  onOpenGlobalSettings: () => void;
  onTestMovie: () => void;
  onOpenCodeEditor: () => void;
  onOpenHelp: () => void;
  onOpenTutorial: () => void;
  onOpenAssetLibrary: () => void;
  onOpenBackpack: () => void;
  onOpenSoundLibrary: () => void;
  onOpenAudioEditor?: () => void;
  onOpenRecorder?: () => void;
  onOpenSpritesheetExport: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddLayer?: () => void;
  onAddLayerFolder?: () => void;
  onAddKeyframe?: () => void;
  onInsertBlankFrame?: () => void;
  onDeleteFrame?: () => void;
  onConvertToSymbol?: () => void;
  onTweenFrame?: () => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
  onImportImage: (file: File) => void;
  onImportVideo: (file: File) => void;
  onExitToMenu: () => void;
  actorsCount: number;
  framebarPosition?: 'top' | 'bottom';
  onToggleFramebarPosition?: () => void;
}

export const AnimateHeader: React.FC<AnimateHeaderProps> = ({
  projectName,
  setProjectName,
  hasUnsavedChanges,
  canvasWidth,
  canvasHeight,
  fps,
  workspaceMode,
  onSetWorkspaceMode,
  onSaveProject,
  onExportMovie,
  onOpenProjectSettings,
  onOpenGlobalSettings,
  onTestMovie,
  onOpenCodeEditor,
  onOpenHelp,
  onOpenTutorial,
  onOpenAssetLibrary,
  onOpenBackpack,
  onOpenSoundLibrary,
  onOpenAudioEditor,
  onOpenRecorder,
  onOpenSpritesheetExport,
  onUndo,
  onRedo,
  onAddLayer,
  onAddLayerFolder,
  onAddKeyframe,
  onInsertBlankFrame,
  onDeleteFrame,
  onConvertToSymbol,
  onTweenFrame,
  onTogglePlay,
  isPlaying,
  onImportImage,
  onImportVideo,
  onExitToMenu,
  actorsCount,
  framebarPosition = 'top',
  onToggleFramebarPosition
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  
  const menuBarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setProjectName(nameInput.trim());
    } else {
      setNameInput(projectName);
    }
    setIsEditingName(false);
  };

  return (
    <header className="bg-[#242424] border-b border-[#181818] select-none text-gray-200 text-xs font-sans shrink-0 z-40">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] gap-2">
        
        {/* Left: Adobe Animate App Badge & Menus */}
        <div ref={menuBarRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Adobe Animate Iconic Logo Badge */}
          <div 
            onClick={onOpenGlobalSettings}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#E34F26] text-white font-black text-xs shadow-sm cursor-pointer hover:brightness-110 transition-all shrink-0"
            title="Adobe Animate Workspace Mode - Click for Preferences"
          >
            <span className="tracking-tighter font-extrabold text-[13px] leading-tight">An</span>
            <span className="text-[10px] font-semibold opacity-90 hidden md:inline">2026</span>
          </div>

          {/* Menu Items */}
          <nav className="flex items-center space-x-0.5">
            {/* FILE MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                onMouseEnter={() => handleMenuHover('file')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'file' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in-50 duration-100 text-gray-200 text-xs">
                  <button 
                    onClick={() => { onSaveProject(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Save size={13} /> Save Project</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+S</span>
                  </button>
                  <button 
                    onClick={() => { onExportMovie(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Download size={13} /> Export Movie...</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+S</span>
                  </button>
                  <button 
                    onClick={() => { onOpenSpritesheetExport(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.LayoutGrid size={13} /> Export Texture Atlas...</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { imageInputRef.current?.click(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Image size={13} /> Import to Stage...</span>
                  </button>
                  <button 
                    onClick={() => { videoInputRef.current?.click(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Video size={13} /> Import Video Frames...</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onOpenProjectSettings(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.SlidersHorizontal size={13} /> Document Settings...</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+J</span>
                  </button>
                  <button 
                    onClick={() => { onOpenGlobalSettings(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Settings size={13} /> Preferences...</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+U</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onExitToMenu(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-red-600 hover:text-white flex items-center justify-between transition-colors text-red-400"
                  >
                    <span className="flex items-center gap-2"><Icons.FolderOutput size={13} /> Close Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* EDIT MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                onMouseEnter={() => handleMenuHover('edit')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'edit' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  <button 
                    onClick={() => { onUndo?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.RotateCcw size={13} /> Undo</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+Z</span>
                  </button>
                  <button 
                    onClick={() => { onRedo?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.RotateCw size={13} /> Redo</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+Y</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onDeleteFrame?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Trash2 size={13} /> Delete Frame</span>
                    <span className="text-[10px] text-gray-400 font-mono">Shift+F5</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onOpenGlobalSettings(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Sliders size={13} /> App Preferences...</span>
                  </button>
                </div>
              )}
            </div>

            {/* VIEW MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                onMouseEnter={() => handleMenuHover('view')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'view' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div className="absolute left-0 top-full mt-0.5 w-64 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  {onToggleFramebarPosition && (
                    <button 
                      onClick={() => { onToggleFramebarPosition(); setActiveMenu(null); }}
                      className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-purple-300 font-medium"
                    >
                      <span className="flex items-center gap-2">
                        {framebarPosition === 'top' ? <Icons.ArrowDown size={13} /> : <Icons.ArrowUp size={13} />}
                        Framebar Position ({framebarPosition === 'top' ? 'Top ↑' : 'Bottom ↓'})
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">
                        {framebarPosition === 'top' ? 'Move Down' : 'Move Up'}
                      </span>
                    </button>
                  )}
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onOpenProjectSettings(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Grid size={13} /> Grid & Stage Settings...</span>
                  </button>
                </div>
              )}
            </div>

            {/* INSERT MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'insert' ? null : 'insert')}
                onMouseEnter={() => handleMenuHover('insert')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'insert' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                Insert
              </button>
              {activeMenu === 'insert' && (
                <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  <button 
                    onClick={() => { onAddKeyframe?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Film size={13} /> Keyframe</span>
                    <span className="text-[10px] text-gray-400 font-mono">F6</span>
                  </button>
                  <button 
                    onClick={() => { onInsertBlankFrame?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Plus size={13} /> Blank Keyframe</span>
                    <span className="text-[10px] text-gray-400 font-mono">F7</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onTweenFrame?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-purple-300 font-medium"
                  >
                    <span className="flex items-center gap-2"><Icons.Sparkles size={13} /> Create Tween...</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onAddLayer?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Layers size={13} /> New Layer</span>
                  </button>
                  <button 
                    onClick={() => { onAddLayerFolder?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.FolderPlus size={13} /> New Layer Folder</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onConvertToSymbol?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Box size={13} /> Convert to Symbol...</span>
                    <span className="text-[10px] text-gray-400 font-mono">F8</span>
                  </button>
                </div>
              )}
            </div>

            {/* CONTROL MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'control' ? null : 'control')}
                onMouseEnter={() => handleMenuHover('control')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'control' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                Control
              </button>
              {activeMenu === 'control' && (
                <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  <button 
                    onClick={() => { onTestMovie(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-emerald-400 font-bold"
                  >
                    <span className="flex items-center gap-2"><Icons.Play size={13} /> Test Movie</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+Enter</span>
                  </button>
                  <button 
                    onClick={() => { onTogglePlay?.(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">{isPlaying ? <Icons.Pause size={13} /> : <Icons.Play size={13} />} Play / Pause</span>
                    <span className="text-[10px] text-gray-400 font-mono">Enter / Space</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onOpenCodeEditor(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Code size={13} /> Actions / Scripts...</span>
                    <span className="text-[10px] text-gray-400 font-mono">F9</span>
                  </button>
                </div>
              )}
            </div>

            {/* WINDOW & WORKSPACES MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'window' ? null : 'window')}
                onMouseEnter={() => handleMenuHover('window')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'window' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                Window
              </button>
              {activeMenu === 'window' && (
                <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Workspaces</div>
                  <button 
                    onClick={() => { onSetWorkspaceMode('adobe-animate'); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Icons.Check size={13} className={workspaceMode === 'adobe-animate' ? 'text-[#E34F26]' : 'opacity-0'} />
                      Adobe Animate Mode
                    </span>
                    <span className="text-[10px] bg-[#E34F26]/20 text-[#E34F26] px-1 rounded font-bold">Active</span>
                  </button>
                  <button 
                    onClick={() => { onSetWorkspaceMode('classic'); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-amber-300"
                  >
                    <span className="flex items-center gap-2">
                      <Icons.RotateCcw size={13} />
                      Classic UI (ClipAnim)
                    </span>
                    <span className="text-[10px] text-gray-400">Switch</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />
                  <button 
                    onClick={() => { onOpenAssetLibrary(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Library size={13} /> Asset Library</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ctrl+L</span>
                  </button>
                  <button 
                    onClick={() => { onOpenBackpack(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-amber-300"
                  >
                    <span className="flex items-center gap-2"><Icons.Briefcase size={13} /> Backpack Dock...</span>
                  </button>
                  {onOpenAudioEditor && (
                    <button 
                      onClick={() => { onOpenAudioEditor(); setActiveMenu(null); }}
                      className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-cyan-300"
                    >
                      <span className="flex items-center gap-2"><Icons.Music size={13} /> Audio Tool & Mixer...</span>
                    </button>
                  )}
                  {onOpenRecorder && (
                    <button 
                      onClick={() => { onOpenRecorder(); setActiveMenu(null); }}
                      className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-red-300"
                    >
                      <span className="flex items-center gap-2"><Icons.Mic size={13} /> Voice Recorder...</span>
                    </button>
                  )}
                  <button 
                    onClick={() => { onOpenSoundLibrary(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Music size={13} /> Sound Library</span>
                  </button>
                </div>
              )}
            </div>

            {/* HELP MENU */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                onMouseEnter={() => handleMenuHover('help')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeMenu === 'help' ? 'bg-[#383838] text-white' : 'text-gray-300 hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                Help
              </button>
              {activeMenu === 'help' && (
                <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-50 text-gray-200 text-xs">
                  <button 
                    onClick={() => { onOpenHelp(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icons.Help size={13} /> Keyboard Shortcuts</span>
                    <span className="text-[10px] text-gray-400 font-mono">F1</span>
                  </button>
                  <button 
                    onClick={() => { onOpenTutorial(); setActiveMenu(null); }}
                    className="w-full px-3 py-1.5 hover:bg-[#0078d7] hover:text-white flex items-center justify-between transition-colors text-amber-400"
                  >
                    <span className="flex items-center gap-2"><Icons.GraduationCap size={13} /> Interactive Tutorials</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right: Secondary "Classic UI" Button + Workspace Badges + Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Project Settings Button */}
          <button
            onClick={onOpenProjectSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#282828] hover:bg-[#383838] text-gray-200 hover:text-white border border-[#444] rounded-md text-xs font-semibold transition-all shadow-sm"
            title="Open Document & Project Settings (Ctrl+J)"
          >
            <Icons.SlidersHorizontal size={13} className="text-amber-400" />
            <span className="hidden md:inline">Project Settings</span>
          </button>

          {/* THE REQUESTED DEDICATED SECONDARY CLASSIC BUTTON */}
          <button
            onClick={() => onSetWorkspaceMode('classic')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-amber-600 hover:to-amber-700 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 rounded-md text-xs font-bold transition-all shadow-sm group"
            title="Return to Classic ClipAnim UI layout"
          >
            <Icons.RotateCcw size={13} className="group-hover:-rotate-90 transition-transform text-amber-400 group-hover:text-white" />
            <span className="tracking-wide">Classic UI</span>
          </button>

          {/* Test Movie (Ctrl+Enter) */}
          <button
            onClick={onTestMovie}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
              actorsCount > 0 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40' 
                : 'bg-[#303030] hover:bg-[#383838] text-emerald-400 border border-emerald-500/30'
            }`}
            title="Test Interactive Movie (Ctrl+Enter)"
          >
            <Icons.Play size={12} className="fill-current" />
            <span className="hidden sm:inline">Test Movie</span>
          </button>

          {/* Backpack Quick Button */}
          <button
            onClick={onOpenBackpack}
            className="flex items-center gap-1 px-2 py-1 bg-[#332211] hover:bg-[#452e18] text-amber-300 border border-amber-500/40 rounded-md text-xs font-semibold transition-colors shadow-sm"
            title="Open Backpack Asset Stamp Dock"
          >
            <Icons.Briefcase size={13} className="text-amber-400" />
            <span className="hidden xl:inline">Backpack</span>
          </button>

          {/* Audio Tool Quick Button */}
          {onOpenAudioEditor && (
            <button
              onClick={onOpenAudioEditor}
              className="flex items-center gap-1 px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-cyan-300 border border-cyan-500/40 rounded-md text-xs font-semibold transition-colors shadow-sm"
              title="Open Audio Editor & Sound Track Mixer"
            >
              <Icons.Music size={13} className="text-cyan-400" />
              <span className="hidden xl:inline">Audio Tool</span>
            </button>
          )}

          {/* Voice Recorder Quick Button */}
          {onOpenRecorder && (
            <button
              onClick={onOpenRecorder}
              className="flex items-center gap-1 px-2 py-1 bg-[#311111] hover:bg-[#451a1a] text-red-300 border border-red-500/40 rounded-md text-xs font-semibold transition-colors shadow-sm"
              title="Record Voice & Sound Effects"
            >
              <Icons.Mic size={13} className="text-red-400" />
              <span className="hidden xl:inline">Recorder</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={onExportMovie}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2c2c2c] hover:bg-[#383838] text-gray-200 hover:text-white border border-[#444] rounded-md text-xs font-semibold transition-colors"
            title="Export Movie / GIF / MP4"
          >
            <Icons.Download size={13} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Global Settings & Preferences */}
          <button
            onClick={onOpenGlobalSettings}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-md transition-colors"
            title="Application Preferences & Workspace Settings"
          >
            <Icons.Settings size={15} />
          </button>
        </div>
      </div>

      {/* Document Tab Bar (Adobe Animate .fla Document Tab) */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#2b2b2b] border-b border-[#1c1c1c] text-xs">
        <div className="flex items-center gap-2">
          {/* Active .fla Tab */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] border-t-2 border-t-[#E34F26] border-x border-[#1c1c1c] rounded-t text-gray-100 font-semibold shadow-inner">
            <Icons.FileVideo size={13} className="text-[#E34F26]" />
            {isEditingName ? (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                autoFocus
                className="bg-[#121212] px-1 py-0.5 rounded text-white text-xs border border-[#0078d7] focus:outline-none"
              />
            ) : (
              <span 
                onClick={() => setIsEditingName(true)}
                className="hover:underline cursor-pointer flex items-center gap-1"
                title="Click to rename document"
              >
                {projectName}.fla
                {hasUnsavedChanges && <span className="text-[#E34F26] font-bold">*</span>}
              </span>
            )}
          </div>

          <span className="text-[11px] text-gray-400 font-mono ml-2 hidden sm:inline">
            Stage: <span className="text-gray-200 font-bold">{canvasWidth} × {canvasHeight} px</span>
          </span>
          <span className="text-[11px] text-gray-400 font-mono hidden md:inline">
            | Rate: <span className="text-gray-200 font-bold">{fps} fps</span>
          </span>
        </div>

        {/* Workspace Mode Badge indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#383838] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-[#E34F26]"></span>
            <span>Workspace: <strong className="text-gray-200">Adobe Animate</strong></span>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input 
        ref={imageInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportImage(file);
          e.target.value = '';
        }}
      />
      <input 
        ref={videoInputRef} 
        type="file" 
        accept="video/mp4,video/webm" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportVideo(file);
          e.target.value = '';
        }}
      />
    </header>
  );
};
