import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { OnionSkinSettings, BackgroundSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fps: number;
  setFps: (fps: number) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  projectType: 'animation' | 'painting' | 'game';
  setProjectType: (type: 'animation' | 'painting' | 'game') => void;
  canvasSize: { width: number, height: number };
  setCanvasSize: (size: { width: number, height: number }) => void;
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
  background: BackgroundSettings;
  setBackground: (background: BackgroundSettings) => void;
  onBackupProject: () => void;
  onionSkinSettings: OnionSkinSettings;
  setOnionSkinSettings: (settings: OnionSkinSettings) => void;
  frames?: any[];
  layers?: any[];
  layerFolders?: any[];
  actors?: any[];
  audioTracks?: any[];
}

type TabType = 'general' | 'canvas' | 'stage' | 'onionskin' | 'engine' | 'backup';

interface PresetItem {
  id: string;
  label: string;
  category: 'video' | 'social' | 'pixel' | 'standard';
  w: number;
  h: number;
  badge?: string;
  icon?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  fps, 
  setFps,
  projectName,
  setProjectName,
  projectType,
  setProjectType,
  canvasSize,
  setCanvasSize,
  backgroundImage,
  setBackgroundImage,
  background,
  setBackground,
  onBackupProject,
  onionSkinSettings,
  setOnionSkinSettings,
  frames = [],
  layers = [],
  layerFolders = [],
  actors = [],
  audioTracks = []
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [projectAuthor, setProjectAuthor] = useState(() => localStorage.getItem('clipanim_project_author') || '');
  const [projectDescription, setProjectDescription] = useState(() => localStorage.getItem('clipanim_project_desc') || '');
  
  // Canvas settings state
  const [isAspectLocked, setIsAspectLocked] = useState(true);
  const [presetCategory, setPresetCategory] = useState<'all' | 'video' | 'social' | 'pixel' | 'standard'>('all');
  
  // Grid & Overlay local state
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('clipanim_grid_show') === 'true');
  const [gridSize, setGridSize] = useState(() => Number(localStorage.getItem('clipanim_grid_size')) || 24);
  const [gridColor, setGridColor] = useState(() => localStorage.getItem('clipanim_grid_color') || '#ffffff');
  const [gridOpacity, setGridOpacity] = useState(() => Number(localStorage.getItem('clipanim_grid_opacity')) || 0.2);
  const [showSafeAreas, setShowSafeAreas] = useState(() => localStorage.getItem('clipanim_safe_areas') === 'true');
  const [showCenterCross, setShowCenterCross] = useState(() => localStorage.getItem('clipanim_center_cross') === 'true');

  // Engine preferences
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => Number(localStorage.getItem('clipanim_autosave_min')) || 5);
  const [maxUndoSteps, setMaxUndoSteps] = useState(() => Number(localStorage.getItem('clipanim_max_undo')) || 50);
  const [highDpiMode, setHighDpiMode] = useState(() => localStorage.getItem('clipanim_high_dpi') !== 'false');

  useEffect(() => {
    localStorage.setItem('clipanim_project_author', projectAuthor);
  }, [projectAuthor]);

  useEffect(() => {
    localStorage.setItem('clipanim_project_desc', projectDescription);
  }, [projectDescription]);

  useEffect(() => {
    localStorage.setItem('clipanim_grid_show', String(showGrid));
    localStorage.setItem('clipanim_grid_size', String(gridSize));
    localStorage.setItem('clipanim_grid_color', gridColor);
    localStorage.setItem('clipanim_grid_opacity', String(gridOpacity));
    localStorage.setItem('clipanim_safe_areas', String(showSafeAreas));
    localStorage.setItem('clipanim_center_cross', String(showCenterCross));
  }, [showGrid, gridSize, gridColor, gridOpacity, showSafeAreas, showCenterCross]);

  useEffect(() => {
    localStorage.setItem('clipanim_autosave_min', String(autoSaveInterval));
    localStorage.setItem('clipanim_max_undo', String(maxUndoSteps));
    localStorage.setItem('clipanim_high_dpi', String(highDpiMode));
  }, [autoSaveInterval, maxUndoSteps, highDpiMode]);

  if (!isOpen) return null;

  const presets: PresetItem[] = [
    // Video & Film
    { id: '1080p', label: '1080p Full HD', category: 'video', w: 1920, h: 1080, badge: '16:9' },
    { id: '720p', label: '720p HD', category: 'video', w: 1280, h: 720, badge: '16:9' },
    { id: '480p', label: '480p SD', category: 'video', w: 854, h: 480, badge: '16:9' },
    { id: '4k', label: '4K Ultra HD', category: 'video', w: 3840, h: 2160, badge: '16:9' },
    { id: '43_std', label: 'Classic TV 4:3', category: 'video', w: 1024, h: 768, badge: '4:3' },

    // Social Media
    { id: 'shorts', label: 'TikTok / Shorts / Reels', category: 'social', w: 1080, h: 1920, badge: '9:16' },
    { id: 'insta_sq', label: 'Instagram Square', category: 'social', w: 1080, h: 1080, badge: '1:1' },
    { id: 'insta_port', label: 'Instagram Portrait', category: 'social', w: 1080, h: 1350, badge: '4:5' },
    { id: 'twitter_hdr', label: 'Header Banner', category: 'social', w: 1500, h: 500, badge: '3:1' },

    // Pixel Art & Retro
    { id: 'px_256', label: 'Pixel Canvas 256', category: 'pixel', w: 256, h: 256, badge: '1:1' },
    { id: 'retro_320', label: 'Retro Game 320x240', category: 'pixel', w: 320, h: 240, badge: '4:3' },
    { id: 'gba', label: 'Handheld 240x160', category: 'pixel', w: 240, h: 160, badge: '3:2' },
    { id: 'sprite_sheet', label: 'Sprite Sheet Base 512', category: 'pixel', w: 512, h: 512, badge: '1:1' },

    // Standard / Traditional
    { id: 'std_800', label: 'Standard 800x600', category: 'standard', w: 800, h: 600, badge: '4:3' },
    { id: 'square_600', label: 'Square Canvas 600', category: 'standard', w: 600, h: 600, badge: '1:1' },
  ];

  const filteredPresets = presetCategory === 'all' 
    ? presets 
    : presets.filter(p => p.category === presetCategory);

  const handleWidthChange = (newW: number) => {
    if (newW <= 0) return;
    if (isAspectLocked && canvasSize.width > 0) {
      const ratio = canvasSize.height / canvasSize.width;
      setCanvasSize({ width: newW, height: Math.round(newW * ratio) });
    } else {
      setCanvasSize({ ...canvasSize, width: newW });
    }
  };

  const handleHeightChange = (newH: number) => {
    if (newH <= 0) return;
    if (isAspectLocked && canvasSize.height > 0) {
      const ratio = canvasSize.width / canvasSize.height;
      setCanvasSize({ width: Math.round(newH * ratio), height: newH });
    } else {
      setCanvasSize({ ...canvasSize, height: newH });
    }
  };

  const handleSwapDimensions = () => {
    setCanvasSize({ width: canvasSize.height, height: canvasSize.width });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBackgroundImage(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Compute aspect ratio GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const commonDivisor = gcd(canvasSize.width, canvasSize.height);
  const aspectW = Math.round(canvasSize.width / (commonDivisor || 1));
  const aspectH = Math.round(canvasSize.height / (commonDivisor || 1));
  const isLandscape = canvasSize.width >= canvasSize.height;

  // Frame timing math
  const frameMs = Math.round((1000 / (fps || 12)) * 10) / 10;

  // Calculate memory estimation
  const totalLayersCount = layers.length;
  const totalFramesCount = frames.length;
  const estPixels = canvasSize.width * canvasSize.height;
  const estMb = ((estPixels * 4 * Math.max(1, totalFramesCount) * Math.max(1, totalLayersCount)) / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-3 sm:p-6">
      <div className="bg-[#181818] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden text-gray-200 font-sans">
        
        {/* Top Navigation Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#202020] border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF3B30] to-orange-500 flex items-center justify-center shadow-lg text-white">
              <Icons.Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Project Settings</h2>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span className="font-medium text-gray-300">{projectName || 'Untitled'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span>{canvasSize.width} × {canvasSize.height} px</span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-[#FF3B30] font-semibold">{fps} FPS</span>
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800/80 transition-colors"
            title="Close Settings"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Main Body with Sidebar + Tab Content */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          
          {/* Tab Navigation Sidebar */}
          <div className="w-full sm:w-56 bg-[#1f1f1f] border-r border-gray-800/80 p-3 flex sm:flex-col gap-1.5 shrink-0 overflow-x-auto sm:overflow-x-visible no-scrollbar">
            
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'general' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Sliders size={16} />
              <span>General & FPS</span>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'canvas' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Maximize2 size={16} />
              <span>Canvas Resolution</span>
            </button>

            <button
              onClick={() => setActiveTab('stage')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'stage' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Grid size={16} />
              <span>Background & Grid</span>
            </button>

            <button
              onClick={() => setActiveTab('onionskin')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'onionskin' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Layers size={16} />
              <span>Onion Skinning</span>
            </button>

            <button
              onClick={() => setActiveTab('engine')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'engine' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Zap size={16} />
              <span>Engine & Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left shrink-0 ${
                activeTab === 'backup' 
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-red-900/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Activity size={16} />
              <span>Stats & Backup</span>
            </button>
          </div>

          {/* Tab Panel Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#181818]">
            
            {/* TAB 1: GENERAL & FPS */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">General Project Properties</h3>
                  <p className="text-xs text-gray-400">Configure name, project classification, and target frame rate.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Project Name</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-[#222222] text-white rounded-xl px-3.5 py-2.5 border border-gray-700/80 focus:border-[#FF3B30] focus:outline-none text-sm transition-colors"
                      placeholder="My Animation Project"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Author / Creator</label>
                    <input 
                      type="text" 
                      value={projectAuthor}
                      onChange={(e) => setProjectAuthor(e.target.value)}
                      className="w-full bg-[#222222] text-white rounded-xl px-3.5 py-2.5 border border-gray-700/80 focus:border-[#FF3B30] focus:outline-none text-sm transition-colors"
                      placeholder="Your Name / Studio"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Project Description</label>
                  <textarea 
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-[#222222] text-white rounded-xl px-3.5 py-2.5 border border-gray-700/80 focus:border-[#FF3B30] focus:outline-none text-xs transition-colors resize-none"
                    placeholder="Brief notes about storyboards, palette, or targets..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Project Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setProjectType('animation')}
                      className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                        projectType === 'animation' 
                          ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-white' 
                          : 'bg-[#222] border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Icons.Video size={20} className={projectType === 'animation' ? 'text-[#FF3B30]' : ''} />
                      <span>Animation Timeline</span>
                    </button>

                    <button
                      onClick={() => setProjectType('painting')}
                      className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                        projectType === 'painting' 
                          ? 'bg-purple-500/20 border-purple-500 text-white' 
                          : 'bg-[#222] border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Icons.Brush size={20} className={projectType === 'painting' ? 'text-purple-400' : ''} />
                      <span>Digital Illustration</span>
                    </button>

                    <button
                      onClick={() => setProjectType('game')}
                      className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                        projectType === 'game' 
                          ? 'bg-amber-500/20 border-amber-500 text-white' 
                          : 'bg-[#222] border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Icons.Box size={20} className={projectType === 'game' ? 'text-amber-400' : ''} />
                      <span>Sprite / Game Asset</span>
                    </button>
                  </div>
                </div>

                {projectType === 'animation' && (
                  <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">Target Frame Rate (FPS)</span>
                        <span className="text-[11px] text-gray-500">1 frame = {frameMs} ms</span>
                      </div>
                      <span className="text-lg font-black text-[#FF3B30] bg-[#FF3B30]/10 px-3 py-1 rounded-xl border border-[#FF3B30]/30 font-mono">
                        {fps} FPS
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[8, 12, 15, 24, 30, 60].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setFps(speed)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            fps === speed 
                              ? 'bg-[#FF3B30] border-[#FF3B30] text-white' 
                              : 'bg-[#282828] border-gray-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>1 FPS (Slow)</span>
                      <span>12 FPS (Hand-Drawn)</span>
                      <span>24 FPS (Film)</span>
                      <span>60 FPS (Ultra Smooth)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CANVAS RESOLUTION & PRESETS */}
            {activeTab === 'canvas' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Canvas Resolution & Presets</h3>
                  <p className="text-xs text-gray-400">Choose standard formats or define custom pixel dimensions.</p>
                </div>

                {/* Preset Category Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'all', label: 'All Presets' },
                    { id: 'video', label: 'Video & TV' },
                    { id: 'social', label: 'Social & Mobile' },
                    { id: 'pixel', label: 'Pixel & Retro' },
                    { id: 'standard', label: 'Standard' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setPresetCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        presetCategory === cat.id 
                          ? 'bg-[#FF3B30] text-white' 
                          : 'bg-[#222] text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                  {filteredPresets.map(p => {
                    const isSelected = canvasSize.width === p.w && canvasSize.height === p.h;
                    return (
                      <button 
                        key={p.id}
                        onClick={() => setCanvasSize({ width: p.w, height: p.h })}
                        className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white shadow-sm' 
                            : 'bg-[#202020] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#252525]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold truncate pr-1">{p.label}</span>
                          {p.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-gray-400">{p.w} × {p.h} px</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Dimension Controls + Visual Stage Preview */}
                <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Left Controls */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Custom Dimensions</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setIsAspectLocked(!isAspectLocked)}
                          className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                            isAspectLocked 
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' 
                              : 'bg-[#282828] border-gray-700 text-gray-400'
                          }`}
                          title={isAspectLocked ? "Aspect Ratio Locked" : "Aspect Ratio Unlocked"}
                        >
                          {isAspectLocked ? <Icons.Lock size={14} /> : <Icons.Unlock size={14} />}
                          <span>{isAspectLocked ? 'Locked' : 'Unlocked'}</span>
                        </button>

                        <button
                          onClick={handleSwapDimensions}
                          className="p-2 rounded-lg bg-[#282828] border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 text-xs font-bold transition-colors"
                          title="Swap Width & Height"
                        >
                          <Icons.Repeat size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-gray-400 font-medium block mb-1">Width (px)</span>
                        <input 
                          type="number" 
                          min="16"
                          max="8192"
                          value={canvasSize.width}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          className="w-full bg-[#181818] text-white rounded-xl px-3 py-2 text-sm font-mono border border-gray-700/80 focus:border-[#FF3B30] focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-400 font-medium block mb-1">Height (px)</span>
                        <input 
                          type="number" 
                          min="16"
                          max="8192"
                          value={canvasSize.height}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          className="w-full bg-[#181818] text-white rounded-xl px-3 py-2 text-sm font-mono border border-gray-700/80 focus:border-[#FF3B30] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Stage Proportions Preview Box */}
                  <div className="md:col-span-5 bg-[#141414] rounded-2xl p-4 border border-gray-800 flex flex-col items-center justify-center min-h-[140px]">
                    <div 
                      className="border-2 border-dashed border-[#FF3B30]/70 bg-[#FF3B30]/10 rounded-lg flex items-center justify-center transition-all duration-300 shadow-inner max-w-[120px] max-h-[90px]"
                      style={{
                        aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
                        width: isLandscape ? '100px' : `${Math.round(100 * (canvasSize.width / canvasSize.height))}px`,
                        height: !isLandscape ? '80px' : `${Math.round(80 * (canvasSize.height / canvasSize.width))}px`
                      }}
                    >
                      <span className="text-[10px] font-bold text-[#FF3B30] font-mono">
                        {aspectW}:{aspectH}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono mt-2">
                      {isLandscape ? 'Landscape' : canvasSize.width === canvasSize.height ? 'Square' : 'Portrait'} ({canvasSize.width}x{canvasSize.height})
                    </span>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 3: STAGE BACKGROUND & GRID */}
            {activeTab === 'stage' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stage Background & Grid Guides</h3>
                  <p className="text-xs text-gray-400">Customize stage background color, gradients, image textures, and alignment guides.</p>
                </div>

                {/* Fill Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">Fill Mode</label>
                  <div className="flex bg-[#222] p-1 rounded-xl border border-gray-800 gap-1">
                    <button 
                      onClick={() => setBackground({ ...background, type: 'color' })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${background.type === 'color' ? 'bg-[#FF3B30] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Solid Color
                    </button>
                    <button 
                      onClick={() => setBackground({ ...background, type: 'gradient3', gradientColors: background.gradientColors || ['#FF3B30', '#007AFF', '#34C759'] })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${background.type === 'gradient3' ? 'bg-[#FF3B30] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Gradient
                    </button>
                  </div>
                </div>

                {background.type === 'color' ? (
                  <div className="flex gap-4 items-center bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-3 flex-1 bg-[#181818] rounded-xl px-3 py-2 border border-gray-700/80">
                      <input 
                        type="color" 
                        value={background.color === 'transparent' ? '#ffffff' : background.color}
                        onChange={(e) => setBackground({ ...background, color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none shrink-0"
                        disabled={background.color === 'transparent'}
                      />
                      <input 
                        type="text" 
                        value={background.color}
                        onChange={(e) => setBackground({ ...background, color: e.target.value })}
                        className="bg-transparent text-white text-xs focus:outline-none w-full font-mono"
                      />
                    </div>
                    
                    <button 
                      onClick={() => setBackground({ ...background, color: background.color === 'transparent' ? '#ffffff' : 'transparent' })}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        background.color === 'transparent' 
                          ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-[#FF3B30]' 
                          : 'bg-[#282828] border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {background.color === 'transparent' ? 'Transparent' : 'Make Transparent'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#202020] p-3.5 rounded-2xl border border-gray-800 space-y-2">
                    <span className="text-xs font-medium text-gray-400 block mb-1">Gradient Colors</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(background.gradientColors || ['#FF3B30', '#007AFF', '#34C759']).map((color, index) => (
                        <div key={index} className="flex items-center gap-2 bg-[#181818] p-2 rounded-xl border border-gray-700">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...(background.gradientColors || ['#FF3B30', '#007AFF', '#34C759'])];
                              newColors[index] = e.target.value;
                              setBackground({ ...background, gradientColors: newColors as [string, string, string] });
                            }}
                            className="w-7 h-7 rounded cursor-pointer bg-transparent border-none shrink-0"
                          />
                          <span className="text-[10px] font-mono text-gray-300 uppercase">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Image Reference */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Stage Reference Image</span>
                  {backgroundImage ? (
                    <div className="relative w-full aspect-video bg-[#202020] rounded-2xl overflow-hidden border border-gray-700 max-h-40 flex items-center justify-center">
                      <img src={backgroundImage} alt="BG" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setBackgroundImage(null)}
                        className="absolute top-2 right-2 bg-red-600/90 p-2 rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                        title="Remove Image"
                      >
                        <Icons.Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-gray-700/80 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FF3B30] hover:text-[#FF3B30] transition-colors bg-[#202020]/50"
                    >
                      <Icons.Image size={24} className="mb-2" />
                      <span className="text-xs font-semibold">Upload Background / Reference Image</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                {/* Stage Grid Overlay Settings */}
                <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Canvas Grid & Alignment</span>
                      <span className="text-[11px] text-gray-400">Display grid lines on canvas for precise drawing.</span>
                    </div>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        showGrid ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'bg-[#282828] border-gray-700 text-gray-400'
                      }`}
                    >
                      {showGrid ? 'Grid Enabled' : 'Grid Off'}
                    </button>
                  </div>

                  {showGrid && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-800/80">
                      <div>
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                          <span>Grid Size (px)</span>
                          <span className="font-mono text-white">{gridSize} px</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="128"
                          step="8"
                          value={gridSize}
                          onChange={(e) => setGridSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                          <span>Grid Line Opacity</span>
                          <span className="font-mono text-white">{Math.round(gridOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={gridOpacity}
                          onChange={(e) => setGridOpacity(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                          <span>Grid Line Color</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#181818] p-1 rounded-xl border border-gray-700">
                          <input
                            type="color"
                            value={gridColor}
                            onChange={(e) => setGridColor(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none shrink-0"
                          />
                          <span className="text-[10px] font-mono text-gray-300 uppercase">{gridColor}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-2 border-t border-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showSafeAreas} 
                        onChange={(e) => setShowSafeAreas(e.target.checked)}
                        className="rounded bg-gray-800 border-gray-700 text-[#FF3B30] focus:ring-0"
                      />
                      <span className="text-xs text-gray-300">TV Safe Title Margins (10%/20%)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showCenterCross} 
                        onChange={(e) => setShowCenterCross(e.target.checked)}
                        className="rounded bg-gray-800 border-gray-700 text-[#FF3B30] focus:ring-0"
                      />
                      <span className="text-xs text-gray-300">Center Crosshair</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ONION SKINNING */}
            {activeTab === 'onionskin' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Onion Skinning Controls</h3>
                  <p className="text-xs text-gray-400">Configure keyframe ghosting, before/after color tints, and frame opacities.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Previous Frames */}
                  <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Previous Frames (Before)</span>
                      <input 
                        type="color" 
                        value={onionSkinSettings.beforeColor}
                        onChange={(e) => setOnionSkinSettings({ ...onionSkinSettings, beforeColor: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Base Opacity</span>
                        <span className="font-mono text-white">{Math.round(onionSkinSettings.beforeOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={onionSkinSettings.beforeOpacity}
                        onChange={(e) => setOnionSkinSettings({ ...onionSkinSettings, beforeOpacity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1.5">Number of Previous Ghost Frames</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button 
                            key={n}
                            onClick={() => setOnionSkinSettings({ ...onionSkinSettings, numBefore: n })}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              onionSkinSettings.numBefore === n 
                                ? 'bg-red-500 text-white shadow' 
                                : 'bg-[#282828] text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Next Frames */}
                  <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Next Frames (After)</span>
                      <input 
                        type="color" 
                        value={onionSkinSettings.afterColor}
                        onChange={(e) => setOnionSkinSettings({ ...onionSkinSettings, afterColor: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Base Opacity</span>
                        <span className="font-mono text-white">{Math.round(onionSkinSettings.afterOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={onionSkinSettings.afterOpacity}
                        onChange={(e) => setOnionSkinSettings({ ...onionSkinSettings, afterOpacity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1.5">Number of Next Ghost Frames</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button 
                            key={n}
                            onClick={() => setOnionSkinSettings({ ...onionSkinSettings, numAfter: n })}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              onionSkinSettings.numAfter === n 
                                ? 'bg-green-500 text-white shadow' 
                                : 'bg-[#282828] text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ENGINE & PREFERENCES */}
            {activeTab === 'engine' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Engine Performance & Memory</h3>
                  <p className="text-xs text-gray-400">Adjust undo buffer limits, auto-save triggers, and canvas resolution scaling.</p>
                </div>

                <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Undo History Depth</span>
                      <span className="text-[11px] text-gray-400">Maximum state snapshots stored for Ctrl+Z undo.</span>
                    </div>
                    <div className="flex gap-1">
                      {[25, 50, 100].map(steps => (
                        <button
                          key={steps}
                          onClick={() => setMaxUndoSteps(steps)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            maxUndoSteps === steps ? 'bg-[#FF3B30] text-white' : 'bg-[#282828] text-gray-400'
                          }`}
                        >
                          {steps} Steps
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Auto-Save Backup Interval</span>
                      <span className="text-[11px] text-gray-400">Automatically save local session snapshots in background.</span>
                    </div>
                    <select
                      value={autoSaveInterval}
                      onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                      className="bg-[#181818] text-xs font-bold text-white rounded-xl px-3 py-1.5 border border-gray-700 focus:outline-none"
                    >
                      <option value={0}>Disabled</option>
                      <option value={1}>Every 1 min</option>
                      <option value={3}>Every 3 mins</option>
                      <option value={5}>Every 5 mins</option>
                      <option value={10}>Every 10 mins</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">High-DPI Canvas Scaling</span>
                      <span className="text-[11px] text-gray-400">Render crisp vectors on Retina & 4K displays.</span>
                    </div>
                    <button
                      onClick={() => setHighDpiMode(!highDpiMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        highDpiMode ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'bg-[#282828] border-gray-700 text-gray-400'
                      }`}
                    >
                      {highDpiMode ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: STATS & BACKUP */}
            {activeTab === 'backup' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Analytics & Data Backup</h3>
                  <p className="text-xs text-gray-400">Inspect project footprint metrics and export raw project JSON archives.</p>
                </div>

                {/* Project Analytics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Frames</span>
                    <span className="text-lg font-black text-white font-mono">{totalFramesCount}</span>
                  </div>

                  <div className="bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Layers / Folders</span>
                    <span className="text-lg font-black text-white font-mono">{totalLayersCount} / {layerFolders.length}</span>
                  </div>

                  <div className="bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Symbols</span>
                    <span className="text-lg font-black text-amber-400 font-mono">{actors.length}</span>
                  </div>

                  <div className="bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Audio Tracks</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">{audioTracks.length}</span>
                  </div>

                  <div className="bg-[#202020] p-3 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Est. Buffer</span>
                    <span className="text-lg font-black text-green-400 font-mono">~{estMb} MB</span>
                  </div>
                </div>

                {/* Backup & Save Buttons */}
                <div className="bg-[#202020] p-4 rounded-2xl border border-gray-800 space-y-3">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider block">Save & Export Project File</span>
                  
                  <button 
                    onClick={onBackupProject}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#FF3B30] to-orange-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-orange-700 transition-all shadow-lg shadow-red-900/20"
                  >
                    <Icons.FolderDown size={20} />
                    <span>Download Project File (.clipanim / JSON)</span>
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    Saves all timeline frames, vector layers, layer folders, symbol library, audio tracks, and stage settings into a portable project file.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#202020] border-t border-gray-800 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-400 hidden sm:block">
            Changes auto-apply to canvas instantly.
          </div>
          
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 bg-[#FF3B30] text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors shadow-lg"
          >
            {t('common.done')}
          </button>
        </div>

      </div>
    </div>
  );
};
