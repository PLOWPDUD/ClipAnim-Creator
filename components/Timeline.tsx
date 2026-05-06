import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Frame, AudioTrack, BackgroundSettings } from '../types';
import { Icons } from '../Icons';
import { Waveform } from './Waveform';

interface TimelineProps {
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
  onCutAudioTrack: (id: string, cutTime: number) => void;
  onUpdateFrameDuration: (index: number, multiplier: number) => void;
  fps: number;
  isFocusMode?: boolean;
  onOpenFrameManager: () => void;
  onOpenRecorder: () => void;
  onOpenSoundLibrary: () => void;
  background: BackgroundSettings;
  backgroundImage: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({
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
  onAddAudioTrack,
  onRemoveAudioTrack,
  onUpdateAudioTrack,
  onCutAudioTrack,
  onUpdateFrameDuration,
  fps,
  isFocusMode = false,
  onOpenFrameManager,
  onOpenRecorder,
  onOpenSoundLibrary,
  background,
  backgroundImage
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [draggingFadeId, setDraggingFadeId] = useState<string | null>(null);
  const [fadeType, setFadeType] = useState<'in' | 'out' | null>(null);
  const [draggingTrimId, setDraggingTrimId] = useState<string | null>(null);
  const [trimType, setTrimType] = useState<'start' | 'end' | null>(null);
  
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartStartTime, setDragStartStartTime] = useState(0);
  const [dragStartFade, setDragStartFade] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [dragStartDuration, setDragStartDuration] = useState(0);

  const FRAME_WIDTH = 66; // 64px width + 2px margin

  // Auto scroll to active frame
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[currentFrameIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentFrameIndex]);

  const handleAudioPointerDown = (e: React.PointerEvent, track: AudioTrack) => {
    e.stopPropagation();
    setDraggingTrackId(track.id);
    setDragStartX(e.clientX);
    setDragStartStartTime(track.startTime);
  };

  const handleFadePointerDown = (e: React.PointerEvent, track: AudioTrack, type: 'in' | 'out') => {
    e.stopPropagation();
    setDraggingFadeId(track.id);
    setFadeType(type);
    setDragStartX(e.clientX);
    setDragStartFade(type === 'in' ? (track.fadeIn || 0) : (track.fadeOut || 0));
  };

  const handleTrimPointerDown = (e: React.PointerEvent, track: AudioTrack, type: 'start' | 'end') => {
    e.stopPropagation();
    setDraggingTrimId(track.id);
    setTrimType(type);
    setDragStartX(e.clientX);
    setDragStartStartTime(track.startTime);
    setDragStartOffset(track.offset);
    setDragStartDuration(track.duration);
  };

  const handleTimelinePointerMove = (e: React.PointerEvent) => {
    if (draggingTrackId) {
      const dx = e.clientX - dragStartX;
      const startFrame = Math.round(dragStartStartTime * fps + dx / FRAME_WIDTH);
      const newStartTime = Math.max(0, startFrame / fps);
      onUpdateAudioTrack(draggingTrackId, { startTime: newStartTime });
    } else if (draggingFadeId && fadeType) {
      const dx = e.clientX - dragStartX;
      const dt = (fadeType === 'in' ? dx : -dx) / FRAME_WIDTH / fps;
      const newFade = Math.max(0, dragStartFade + dt);
      onUpdateAudioTrack(draggingFadeId, { [fadeType === 'in' ? 'fadeIn' : 'fadeOut']: newFade });
    } else if (draggingTrimId && trimType) {
      const dx = e.clientX - dragStartX;
      const df = Math.round(dx / FRAME_WIDTH);
      const dt = df / fps;
      
      if (trimType === 'start') {
        const newStartTime = Math.max(0, dragStartStartTime + dt);
        const actualDt = newStartTime - dragStartStartTime;
        const newOffset = Math.max(0, dragStartOffset + actualDt);
        const newDuration = Math.max(0.1, dragStartDuration - actualDt);
        onUpdateAudioTrack(draggingTrimId, { startTime: newStartTime, offset: newOffset, duration: newDuration });
      } else {
        const newDuration = Math.max(0.1, dragStartDuration + dt);
        onUpdateAudioTrack(draggingTrimId, { duration: newDuration });
      }
    }
  };

  const handleTimelinePointerUp = () => {
    setDraggingTrackId(null);
    setDraggingFadeId(null);
    setFadeType(null);
    setDraggingTrimId(null);
    setTrimType(null);
  };

  return (
    <div 
        className={`flex flex-col shrink-0 bg-transparent pb-4 pb-[env(safe-area-inset-bottom)] transition-all duration-300 ${isFocusMode ? 'pt-0 pointer-events-none' : 'pt-8 pointer-events-auto'}`}
        onPointerMove={handleTimelinePointerMove}
        onPointerUp={handleTimelinePointerUp}
        onPointerLeave={handleTimelinePointerUp}
    >
      {!isFocusMode && (
        <div className="h-10 flex items-center px-4 justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-2">
              <button 
                  onClick={onOpenFrameManager}
                  className="p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors drop-shadow-md"
                  title={t('layers.title')}
              >
                  <Icons.FrameGrid size={18} />
              </button>
              <button 
                  onClick={() => setShowAudio(!showAudio)}
                  className={`p-1.5 rounded-full transition-colors ${showAudio ? 'text-[var(--accent-color)] bg-black/40' : 'text-gray-300 hover:text-white drop-shadow-md'}`}
                  title={t('timeline.audio')}
              >
                  <Icons.Music size={16} />
                  {audioTracks.length > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-[#1e1e1e]" />
                  )}
              </button>
              <button 
                  onClick={onToggleLoop}
                  className={`p-1.5 rounded-full transition-colors ${isLooping ? 'text-[var(--accent-color)] bg-black/40' : 'text-gray-300 hover:text-white drop-shadow-md'}`}
                  title={isLooping ? t('timeline.loop') : t('timeline.loop')}
              >
                  <Icons.Repeat size={16} />
              </button>
          </div>
          
          <button 
              onClick={onTogglePlay}
              className={`
                  flex items-center justify-center w-12 h-12 -mt-10 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)]
                  transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-[#121212] z-30
                  ${isPlaying ? 'bg-white text-red-600' : 'bg-[#FF3B30] text-white'}
              `}
          >
              {isPlaying ? <Icons.Pause size={24} fill="currentColor" /> : <Icons.Play size={24} fill="currentColor" className="ml-1"/>}
          </button>

          <div className="flex items-center space-x-1 bg-black/40 rounded-lg p-1 backdrop-blur-sm">
                <div className="flex items-center space-x-1 px-2 border-r border-white/10 mr-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{t('timeline.frames')}</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={frames[currentFrameIndex]?.durationMultiplier || 1}
                      onChange={(e) => onUpdateFrameDuration(currentFrameIndex, parseInt(e.target.value) || 1)}
                      className="w-10 bg-black/50 text-white text-xs rounded px-1 py-0.5 border border-white/10 text-center"
                      title={t('timeline.frames')}
                    />
                </div>
               <button onClick={() => onDeleteFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white" disabled={frames.length <= 1}>
                  <Icons.Trash2 size={16} />
               </button>
               <button onClick={() => onCopyFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white" title={t('layers.duplicate')}>
                  <Icons.Copy size={16} />
               </button>
               <button onClick={() => onTweenFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-purple-400 hover:text-purple-300" title={t('toolbar.wand')}>
                  <Icons.Wand2 size={16} />
               </button>
          </div>
        </div>
      )}

      {!isFocusMode && (
        <div className="px-4 mb-2 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <input 
                type="range" 
                min="0" 
                max={frames.length - 1} 
                value={currentFrameIndex} 
                onChange={(e) => onSelectFrame(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-black/40 rounded-full appearance-none accent-[var(--accent-color)] cursor-pointer hover:bg-black/60 transition-colors"
                title={t('timeline.scrubFrames')}
            />
            <span className="text-[10px] text-white font-mono whitespace-nowrap opacity-80 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                {t('timeline.frames')} {currentFrameIndex + 1} / {frames.length}
            </span>
        </div>
      )}

      {showAudio && !isFocusMode && (
        <div className="mb-2 flex flex-col gap-1 px-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center bg-black/60 backdrop-blur-md p-1 rounded text-xs">
                <span className="text-gray-200 font-bold uppercase tracking-wider px-2">{t('timeline.audio')}</span>
                <div className="flex gap-2">
                    <button 
                        onClick={onOpenSoundLibrary}
                        className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 px-2 border-r border-white/10 pr-3"
                    >
                        <Icons.Music size={12} />
                        <span>{t('timeline.backpack')}</span>
                    </button>
                    <button 
                        onClick={onOpenRecorder}
                        className="flex items-center space-x-1 text-red-400 hover:text-red-300 px-2 border-r border-white/10 pr-3"
                    >
                        <Icons.Mic size={12} />
                        <span>{t('timeline.recordAudio')}</span>
                    </button>
                    <button 
                        onClick={() => audioInputRef.current?.click()}
                        className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 px-2"
                    >
                        <Icons.Plus size={12} />
                        <span>{t('timeline.importAudio')}</span>
                    </button>
                </div>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onAddAudioTrack} />
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
                {audioTracks.map((track) => (
                    <div key={track.id} className="h-12 flex relative overflow-hidden bg-black/50 backdrop-blur-md border border-white/10 rounded group">
                        <div className="w-36 shrink-0 border-r border-white/10 flex flex-col justify-center px-2 z-20 bg-black/20">
                            <div className="flex items-center mb-1">
                                <Icons.Volume2 size={10} className="text-gray-300 mr-1" />
                                <span className="text-[9px] text-gray-100 truncate flex-1">{track.name}</span>
                                <button onClick={() => onRemoveAudioTrack(track.id)} className="text-gray-400 hover:text-red-400 transition-opacity">
                                    <Icons.X size={10}/>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.01" 
                                    value={track.volume} 
                                    onChange={(e) => onUpdateAudioTrack(track.id, { volume: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-gray-700 rounded-full appearance-none accent-[var(--accent-color)] cursor-pointer"
                                />
                                <button 
                                    onClick={() => onCutAudioTrack(track.id, currentFrameIndex / fps)}
                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                    title={t('timeline.cutAtPlayhead')}
                                >
                                    <Icons.Pencil size={10} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative overflow-hidden"> 
                            <div 
                                className="absolute inset-y-0 left-[50vw] flex items-center transition-transform duration-100"
                                style={{ transform: `translateX(-${currentFrameIndex * FRAME_WIDTH}px)` }}
                            >
                                <div 
                                    className="h-full flex items-center gap-0.5 rounded px-2 cursor-grab active:cursor-grabbing group/clip" 
                                    style={{ 
                                        position: 'absolute',
                                        left: `${track.startTime * fps * FRAME_WIDTH}px`,
                                        width: `${track.duration * fps * FRAME_WIDTH}px`, 
                                        backgroundColor: `${track.color}40`,
                                        border: `1px solid ${track.color}80`
                                    }}
                                    onPointerDown={(e) => handleAudioPointerDown(e, track)}
                                >
                                    {/* Fade visualization */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible opacity-50">
                                        {track.fadeIn && (
                                            <line 
                                                x1="0" y1="100%" 
                                                x2={`${(track.fadeIn / track.duration) * 100}%`} y2="0" 
                                                stroke="white" strokeWidth="1" strokeDasharray="2 2"
                                            />
                                        )}
                                        {track.fadeOut && (
                                            <line 
                                                x1={`${(1 - track.fadeOut / track.duration) * 100}%`} y1="0" 
                                                x2="100%" y2="100%" 
                                                stroke="white" strokeWidth="1" strokeDasharray="2 2"
                                            />
                                        )}
                                    </svg>

                                    {/* Trim Handles */}
                                    <div 
                                        className="absolute inset-y-0 left-0 w-2 hover:bg-white/30 cursor-col-resize z-20"
                                        onPointerDown={(e) => handleTrimPointerDown(e, track, 'start')}
                                    />
                                    <div 
                                        className="absolute inset-y-0 right-0 w-2 hover:bg-white/30 cursor-col-resize z-20"
                                        onPointerDown={(e) => handleTrimPointerDown(e, track, 'end')}
                                    />

                                    {/* Fade Handles */}
                                    <div 
                                        className="absolute top-0 w-3 h-3 rounded-full bg-white/70 border border-black/50 cursor-col-resize z-30 opacity-0 group-hover/clip:opacity-100 transition-opacity"
                                        style={{ left: `${(track.fadeIn || 0) / track.duration * 100}%`, transform: 'translateX(-50%)' }}
                                        onPointerDown={(e) => handleFadePointerDown(e, track, 'in')}
                                        title={t('timeline.fadeIn')}
                                    />
                                    <div 
                                        className="absolute top-0 w-3 h-3 rounded-full bg-white/70 border border-black/50 cursor-col-resize z-30 opacity-0 group-hover/clip:opacity-100 transition-opacity"
                                        style={{ right: `${(track.fadeOut || 0) / track.duration * 100}%`, transform: 'translateX(50%)' }}
                                        onPointerDown={(e) => handleFadePointerDown(e, track, 'out')}
                                        title={t('timeline.fadeOut')}
                                    />

                                    <div className="absolute top-0 left-0 px-1 text-[8px] text-white/60 pointer-events-none z-10">
                                        {track.startTime.toFixed(1)}s
                                    </div>
                                    <Waveform url={track.url} color={track.color} duration={track.duration} offset={track.offset} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className={`relative w-full overflow-hidden h-24`}>
        <div 
            ref={scrollContainerRef}
            className={`absolute inset-0 flex items-center px-[50vw] overflow-x-auto overflow-y-hidden no-scrollbar`}
        >
            {frames.map((frame, index) => (
                <div 
                    key={frame.id}
                    onClick={() => !isFocusMode && onSelectFrame(index)}
                    className={`
                        relative flex-shrink-0 w-16 h-20 mx-0.5 rounded-[4px] overflow-hidden border transition-all duration-150 select-none
                        ${isFocusMode ? 'pointer-events-none opacity-20 border-gray-500' : 'cursor-pointer hover:opacity-100 border-gray-600 opacity-80 scale-95 shadow-md'}
                        ${!isFocusMode && currentFrameIndex === index ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/50 scale-100 z-10 shadow-lg !opacity-100' : ''}
                        ${isFocusMode && currentFrameIndex === index ? 'opacity-50 scale-100 border-white' : ''}
                    `}
                >
                    <div 
                        className="absolute inset-0"
                        style={{ 
                            background: (frame.background || background).type === 'gradient3' ? ((frame.background || background).gradientColors ? `linear-gradient(to bottom right, ${(frame.background || background).gradientColors!.join(', ')})` : '#ffffff') : ((frame.background || background).color === 'transparent' ? 'transparent' : (frame.background || background).color)
                        }}
                    >
                        {(frame.backgroundImage || backgroundImage) && (
                            <img src={frame.backgroundImage || backgroundImage!} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                        )}
                        {frame.thumbnailUrl && (
                            <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} className="relative w-full h-full object-contain pointer-events-none" />
                        )}
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-[#121212] bg-white/90 px-1 rounded-sm">
                        {index + 1}
                    </span>
                </div>
            ))}
            
             <div 
                onClick={onAddFrame}
                className="flex-shrink-0 w-16 h-20 mx-0.5 flex items-center justify-center bg-[#FF3B30] border border-[#FF3B30] rounded-[4px] cursor-pointer hover:opacity-90 text-white shadow-lg transition-all scale-95 pointer-events-auto opacity-100 z-20"
            >
                <Icons.Plus size={32} strokeWidth={3} />
            </div>
        </div>
        
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#FF3B30] z-20 pointer-events-none transform -translate-x-1/2 shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
      </div>
    </div>
  );
};
