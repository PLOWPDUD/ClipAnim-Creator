import React, { useRef, useEffect, useState } from 'react';
import { Frame, Layer, LayerFolder, AudioTrack, BackgroundSettings } from '../../types';
import { Icons } from '../../Icons';

interface AnimateTimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onCopyFrame: (index: number) => void;
  onTweenFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  audioTracks: AudioTrack[];
  onAddAudioTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudioTrack: (id: string) => void;
  onUpdateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  onCutAudioTrack?: (id: string, cutTime: number) => void;
  onUpdateFrameDuration: (index: number, multiplier: number) => void;
  fps: number;
  layers: Layer[];
  layerFolders?: LayerFolder[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onAddLayerFolder?: () => void;
  onRemoveLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  background: BackgroundSettings;
  backgroundImage: string | null;
  onOpenSoundLibrary?: () => void;
  onOpenAudioEditor?: () => void;
  onOpenRecorder?: () => void;
  onOpenBackpack?: () => void;
  onOpenFrameManager?: () => void;
}

export const AnimateTimeline: React.FC<AnimateTimelineProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onCopyFrame,
  onTweenFrame,
  isPlaying,
  onTogglePlay,
  isLooping,
  onToggleLoop,
  audioTracks,
  onRemoveAudioTrack,
  fps,
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onAddLayerFolder,
  onRemoveLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onRenameLayer,
  onionSkin,
  onToggleOnionSkin,
  onOpenSoundLibrary,
  onOpenAudioEditor,
  onOpenRecorder,
  onOpenBackpack,
  onOpenFrameManager
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');
  const [allLayersVisible, setAllLayersVisible] = useState(true);
  const [allLayersLocked, setAllLayersLocked] = useState(false);

  const framesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to active frame
  useEffect(() => {
    if (framesContainerRef.current) {
      const frameEl = framesContainerRef.current.children[currentFrameIndex] as HTMLElement;
      if (frameEl) {
        frameEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentFrameIndex]);

  const toggleAllLayersVisibility = () => {
    const nextState = !allLayersVisible;
    setAllLayersVisible(nextState);
    layers.forEach(l => {
      if (l.isVisible !== nextState) {
        onToggleLayerVisibility(l.id);
      }
    });
  };

  const toggleAllLayersLock = () => {
    const nextState = !allLayersLocked;
    setAllLayersLocked(nextState);
    layers.forEach(l => {
      if (l.isLocked !== nextState) {
        onToggleLayerLock(l.id);
      }
    });
  };

  const startRenameLayer = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setLayerNameInput(layer.name);
  };

  const saveRenameLayer = () => {
    if (editingLayerId && layerNameInput.trim()) {
      onRenameLayer(editingLayerId, layerNameInput.trim());
    }
    setEditingLayerId(null);
  };

  // Generate frame numbers list up to Math.max(30, frames.length + 10)
  const totalRulerFrames = Math.max(40, frames.length + 15);
  const rulerTicks = Array.from({ length: totalRulerFrames }, (_, i) => i);

  return (
    <div className="bg-[#242424] border-b border-[#141414] select-none text-gray-200 text-xs font-sans shrink-0 flex flex-col z-30 shadow-md">
      
      {/* Top Header & Track Bar */}
      <div className="flex h-36 border-b border-[#181818] overflow-hidden">
        
        {/* Left: Layer Manager Column (Adobe Animate Style) */}
        <div className="w-56 sm:w-64 border-r border-[#181818] bg-[#222222] flex flex-col shrink-0">
          
          {/* Layer Headers / Column Actions */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1b1b1b] border-b border-[#2d2d2d] text-gray-400 font-bold text-[11px]">
            <div className="flex items-center gap-1.5">
              <Icons.Layers size={13} className="text-[#E34F26]" />
              <span className="uppercase tracking-wider text-[10px] text-gray-300">Layers</span>
            </div>

            {/* Quick Actions & Column Toggles */}
            <div className="flex items-center gap-1">
              <button 
                onClick={onAddLayer}
                className="p-1 hover:text-white hover:bg-[#333] rounded text-gray-400 transition-colors"
                title="New Layer"
              >
                <Icons.Plus size={13} />
              </button>
              {onAddLayerFolder && (
                <button 
                  onClick={onAddLayerFolder}
                  className="p-1 hover:text-white hover:bg-[#333] rounded text-gray-400 transition-colors"
                  title="New Layer Folder"
                >
                  <Icons.FolderPlus size={13} />
                </button>
              )}
              {layers.length > 1 && (
                <button 
                  onClick={() => onRemoveLayer(activeLayerId)}
                  className="p-1 hover:text-red-400 hover:bg-[#333] rounded text-gray-400 transition-colors"
                  title="Delete Selected Layer"
                >
                  <Icons.Trash2 size={13} />
                </button>
              )}
              <div className="w-[1px] h-3 bg-[#383838] mx-0.5" />
              <button 
                onClick={toggleAllLayersVisibility}
                className={`p-1 rounded transition-colors ${allLayersVisible ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-400'}`}
                title="Show / Hide All Layers"
              >
                {allLayersVisible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
              </button>
              <button 
                onClick={toggleAllLayersLock}
                className={`p-1 rounded transition-colors ${allLayersLocked ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
                title="Lock / Unlock All Layers"
              >
                {allLayersLocked ? <Icons.Lock size={12} /> : <Icons.Unlock size={12} />}
              </button>
            </div>
          </div>

          {/* Layers List (Scrollable) */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-0.5 divide-y divide-[#2a2a2a]/60">
            {layers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const isEditing = editingLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-[#0078d7] text-white font-semibold' 
                      : 'hover:bg-[#2c2c2c] text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: isActive ? '#fff' : '#007AFF' }} 
                    />
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={layerNameInput}
                        onChange={(e) => setLayerNameInput(e.target.value)}
                        onBlur={saveRenameLayer}
                        onKeyDown={(e) => e.key === 'Enter' && saveRenameLayer()}
                        autoFocus
                        className="bg-[#121212] text-white px-1 py-0.5 rounded text-xs w-full focus:outline-none border border-white/40"
                      />
                    ) : (
                      <span 
                        onDoubleClick={() => startRenameLayer(layer)}
                        className="truncate text-xs select-none"
                        title={layer.name}
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerVisibility(layer.id);
                      }}
                      className={`p-1 rounded hover:bg-black/20 ${layer.isVisible ? 'text-gray-300' : 'text-gray-600'}`}
                      title="Toggle Visibility"
                    >
                      {layer.isVisible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerLock(layer.id);
                      }}
                      className={`p-1 rounded hover:bg-black/20 ${layer.isLocked ? 'text-amber-400' : 'text-gray-400'}`}
                      title="Toggle Lock"
                    >
                      {layer.isLocked ? <Icons.Lock size={12} /> : <Icons.Unlock size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audio Tracks Row in Layer Column */}
          {audioTracks.length > 0 && (
            <div 
              onClick={onOpenAudioEditor || onOpenSoundLibrary}
              className="px-2.5 py-1 bg-[#181818] border-t border-[#2a2a2a] text-[11px] text-indigo-300 flex items-center justify-between cursor-pointer hover:bg-[#222]"
              title="Click to open Audio Editor"
            >
              <span className="flex items-center gap-1 truncate"><Icons.Music size={11} /> Audio Layer</span>
              <span className="text-[10px] text-gray-400 font-mono">{audioTracks.length} track</span>
            </div>
          )}
        </div>

        {/* Right: Adobe Animate Frame Ruler & Grid (Horizontal Scrollable) */}
        <div className="flex-1 flex flex-col bg-[#1c1c1c] overflow-x-auto relative">
          
          {/* Frame Numbering Ruler (Top Header) */}
          <div className="h-6 bg-[#181818] border-b border-[#2d2d2d] flex items-center shrink-0 relative select-none">
            {rulerTicks.map((frameNum) => {
              const isMajor = (frameNum + 1) % 5 === 0 || frameNum === 0;
              const isCurrent = frameNum === currentFrameIndex;

              return (
                <div
                  key={frameNum}
                  onClick={() => {
                    if (frameNum < frames.length) onSelectFrame(frameNum);
                  }}
                  className={`w-7 h-full shrink-0 border-r border-[#262626] flex items-center justify-center relative cursor-pointer hover:bg-[#292929] ${
                    isCurrent ? 'bg-red-500/20 text-red-400 font-bold' : 'text-gray-400'
                  }`}
                >
                  {isMajor ? (
                    <span className="text-[10px] font-mono leading-none">{frameNum + 1}</span>
                  ) : (
                    <span className="w-0.5 h-1 bg-[#444] rounded-full" />
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 w-full h-1 bg-[#E34F26]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Frame Grid Container */}
          <div ref={framesContainerRef} className="flex-1 flex items-stretch overflow-x-auto py-1.5 px-0.5 relative">
            
            {/* Playhead Red Line */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-[#E34F26] pointer-events-none z-20 shadow-sm"
              style={{ left: `${currentFrameIndex * 28 + 14}px` }}
            >
              <div className="w-3 h-2 bg-[#E34F26] -translate-x-[5px] -top-1 absolute rounded-b-sm shadow-md" />
            </div>

            {/* Existing Frames */}
            {frames.map((frame, index) => {
              const isCurrent = index === currentFrameIndex;
              const hasLayerContent = frame.layers && Object.values(frame.layers).some(url => Boolean(url && url.length > 50));
              const durationMult = frame.durationMultiplier || 1;

              return (
                <div
                  key={frame.id || index}
                  onClick={() => onSelectFrame(index)}
                  className={`w-7 shrink-0 h-full border-r border-[#282828] mx-[0.5px] rounded-sm flex flex-col items-center justify-between p-1 cursor-pointer transition-all relative ${
                    isCurrent 
                      ? 'bg-[#0078d7]/40 border-2 border-[#0078d7] shadow-inner' 
                      : 'bg-[#242424] hover:bg-[#2e2e2e]'
                  }`}
                  title={`Frame ${index + 1} (${(index / fps).toFixed(2)}s)`}
                >
                  {/* Keyframe Dot Symbol (Solid dot for content, hollow for blank) */}
                  <div className="mt-1">
                    {hasLayerContent ? (
                      <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-gray-300'} shadow-sm`} />
                    ) : (
                      <div className={`w-2 h-2 rounded-full border border-gray-400 ${isCurrent ? 'border-white' : ''}`} />
                    )}
                  </div>

                  {/* Thumbnail / Frame duration pill */}
                  <div className="w-full flex items-center justify-center my-auto">
                    {frame.thumbnailUrl ? (
                      <img src={frame.thumbnailUrl} alt="" className="w-5 h-4 object-contain opacity-80 rounded" />
                    ) : (
                      <span className="text-[9px] font-mono text-gray-500 font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Duration Tag */}
                  {durationMult > 1 && (
                    <span className="text-[8px] bg-amber-500/30 text-amber-300 px-0.5 rounded font-mono">
                      {durationMult}x
                    </span>
                  )}
                </div>
              );
            })}

            {/* "+ New Keyframe" Placeholder Frame */}
            <div
              onClick={onAddFrame}
              className="w-7 shrink-0 h-full border border-dashed border-[#444] rounded-sm flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-300 hover:bg-[#2b2b2b] cursor-pointer transition-all ml-1"
              title="Add New Frame (N / F6)"
            >
              <Icons.Plus size={14} />
            </div>

            {/* Audio Waveform Row (if audio tracks exist) */}
            {audioTracks.length > 0 && (
              <div className="absolute bottom-1 left-0 right-0 h-6 bg-indigo-950/30 border-t border-indigo-500/20 flex items-center px-2 pointer-events-auto">
                {audioTracks.map(track => (
                  <div key={track.id} className="flex items-center gap-1 text-[10px] text-indigo-300 mr-4">
                    <Icons.Volume2 size={11} />
                    <span className="truncate max-w-[100px]">{track.name}</span>
                    <button 
                      onClick={() => onRemoveAudioTrack(track.id)}
                      className="text-gray-400 hover:text-red-400 p-0.5"
                    >
                      <Icons.X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Bottom Timeline Controller Bar (Adobe Style Playback & Frame Tools) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-t border-[#2a2a2a] text-xs">
        
        {/* Left: Playback Transport Buttons */}
        <div className="flex items-center gap-1">
          {/* First Frame */}
          <button
            onClick={() => onSelectFrame(0)}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Go to First Frame"
          >
            <Icons.SkipBack size={13} />
          </button>

          {/* Prev Frame */}
          <button
            onClick={() => onSelectFrame(Math.max(0, currentFrameIndex - 1))}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Previous Frame (,)"
          >
            <Icons.ChevronLeft size={14} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 rounded text-white font-bold flex items-center gap-1 transition-all shadow-sm ${
              isPlaying 
                ? 'bg-amber-600 hover:bg-amber-500' 
                : 'bg-[#E34F26] hover:bg-[#f05a30]'
            }`}
            title="Play / Pause Animation (Space / Enter)"
          >
            {isPlaying ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
            <span className="text-[11px] font-semibold">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Next Frame */}
          <button
            onClick={() => onSelectFrame(Math.min(frames.length - 1, currentFrameIndex + 1))}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Next Frame (.)"
          >
            <Icons.ChevronRight size={14} />
          </button>

          {/* Last Frame */}
          <button
            onClick={() => onSelectFrame(frames.length - 1)}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Go to Last Frame"
          >
            <Icons.SkipForward size={13} />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={onToggleLoop}
            className={`p-1 rounded ml-1 transition-colors ${
              isLooping ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-white'
            }`}
            title="Toggle Continuous Loop"
          >
            <Icons.Repeat size={14} />
          </button>
        </div>

        {/* Center: Frame Actions & Tools (Keyframe F6, Blank F7, Tween, Duration) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={onAddFrame}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#2c2c2c] hover:bg-[#383838] text-gray-200 hover:text-white rounded border border-[#3e3e3e] text-[11px] font-semibold transition-colors"
            title="Insert Keyframe (F6 / N)"
          >
            <Icons.Film size={12} className="text-[#E34F26]" />
            <span>Keyframe</span>
          </button>

          <button
            onClick={() => onCopyFrame(currentFrameIndex)}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#2c2c2c] hover:bg-[#383838] text-gray-200 hover:text-white rounded border border-[#3e3e3e] text-[11px] font-semibold transition-colors"
            title="Duplicate Current Keyframe"
          >
            <Icons.Copy size={12} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => onTweenFrame(currentFrameIndex)}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#2c2c2c] hover:bg-[#383838] text-indigo-300 hover:text-white rounded border border-indigo-500/30 text-[11px] font-semibold transition-colors"
            title="Create Classic / Motion Tween"
          >
            <Icons.Sparkles size={12} className="text-indigo-400" />
            <span>Tween</span>
          </button>

          {frames.length > 1 && (
            <button
              onClick={() => onDeleteFrame(currentFrameIndex)}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-[#333] rounded transition-colors"
              title="Delete Current Frame (Delete / Backspace)"
            >
              <Icons.Trash2 size={13} />
            </button>
          )}

          <div className="w-[1px] h-3 bg-[#383838] mx-0.5" />

          {/* Onion Skin Toggle */}
          <button
            onClick={onToggleOnionSkin}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
              onionSkin 
                ? 'bg-[#E34F26]/20 border-[#E34F26] text-white shadow-sm' 
                : 'bg-[#2c2c2c] border-[#3e3e3e] text-gray-400 hover:text-white'
            }`}
            title="Onion Skinning (O)"
          >
            <Icons.Layers size={12} className={onionSkin ? 'text-[#E34F26]' : ''} />
            <span>Onion Skin</span>
          </button>

          <div className="w-[1px] h-3 bg-[#383838] mx-0.5" />

          {/* AUDIO TOOL */}
          {onOpenAudioEditor && (
            <button
              onClick={onOpenAudioEditor}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1e293b] hover:bg-[#334155] text-cyan-300 hover:text-cyan-200 rounded border border-cyan-500/40 text-[11px] font-semibold transition-colors shadow-sm"
              title="Open Audio Editor & Sound Track Mixer"
            >
              <Icons.Music size={12} className="text-cyan-400" />
              <span>Audio Tool</span>
            </button>
          )}

          {/* VOICE RECORDER */}
          {onOpenRecorder && (
            <button
              onClick={onOpenRecorder}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#311111] hover:bg-[#451a1a] text-red-300 hover:text-red-200 rounded border border-red-500/40 text-[11px] font-semibold transition-colors shadow-sm"
              title="Record Voice & Sound Effects"
            >
              <Icons.Mic size={12} className="text-red-400" />
              <span>Recorder</span>
            </button>
          )}

          {/* BACKPACK DOCK */}
          {onOpenBackpack && (
            <button
              onClick={onOpenBackpack}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#332211] hover:bg-[#452e18] text-amber-300 hover:text-amber-200 rounded border border-amber-500/40 text-[11px] font-semibold transition-colors shadow-sm"
              title="Open Backpack Asset Stamp Dock"
            >
              <Icons.Briefcase size={12} className="text-amber-400" />
              <span>Backpack</span>
            </button>
          )}

          {/* Frame Manager Full View */}
          {onOpenFrameManager && (
            <button
              onClick={onOpenFrameManager}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
              title="Open Frame Manager Sheet"
            >
              <Icons.LayoutGrid size={13} />
            </button>
          )}
        </div>

        {/* Right: Status HUD (Frame Counter, FPS, Time) */}
        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="bg-[#141414] px-2 py-0.5 rounded border border-[#2d2d2d] text-gray-300">
            Frame: <strong className="text-white font-bold">{currentFrameIndex + 1}</strong> / {frames.length}
          </span>
          <span className="bg-[#141414] px-2 py-0.5 rounded border border-[#2d2d2d] text-gray-300 hidden sm:inline">
            Time: <strong className="text-amber-300 font-bold">{((currentFrameIndex) / fps).toFixed(2)}s</strong>
          </span>
          <span className="bg-[#141414] px-2 py-0.5 rounded border border-[#2d2d2d] text-gray-300 hidden md:inline">
            {fps} FPS
          </span>
        </div>

      </div>

    </div>
  );
};
