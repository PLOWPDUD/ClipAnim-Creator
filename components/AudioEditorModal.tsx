import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { AudioTrack, Frame } from '../types';
import { Waveform } from './Waveform';

interface AudioEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioTracks: AudioTrack[];
  onUpdateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  onRemoveAudioTrack: (id: string) => void;
  onAddAudioTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCutAudioTrack: (id: string, cutTime: number) => void;
  fps: number;
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const AudioEditorModal: React.FC<AudioEditorModalProps> = ({
  isOpen,
  onClose,
  audioTracks,
  onUpdateAudioTrack,
  onRemoveAudioTrack,
  onAddAudioTrack,
  onCutAudioTrack,
  fps,
  frames,
  currentFrameIndex,
  onSelectFrame,
  isPlaying,
  onTogglePlay,
}) => {
  const { t } = useTranslation();
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [draggingFadeId, setDraggingFadeId] = useState<string | null>(null);
  const [fadeType, setFadeType] = useState<'in' | 'out' | null>(null);
  const [draggingTrimId, setDraggingTrimId] = useState<string | null>(null);
  const [trimType, setTrimType] = useState<'start' | 'end' | null>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);
  
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartStartTime, setDragStartStartTime] = useState(0);
  const [dragStartFade, setDragStartFade] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [dragStartDuration, setDragStartDuration] = useState(0);

  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const FRAME_WIDTH = 60 * zoom; 
  const totalDuration = frames.reduce((acc, f) => acc + (f.durationMultiplier || 1) / fps, 0);

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
      const dt = dx / FRAME_WIDTH / fps;
      const newStartTime = Math.max(0, dragStartStartTime + dt);
      onUpdateAudioTrack(draggingTrackId, { startTime: newStartTime });
    } else if (draggingFadeId && fadeType) {
      const dx = e.clientX - dragStartX;
      const dt = (fadeType === 'in' ? dx : -dx) / FRAME_WIDTH / fps;
      const newFade = Math.max(0, dragStartFade + dt);
      onUpdateAudioTrack(draggingFadeId, { [fadeType === 'in' ? 'fadeIn' : 'fadeOut']: newFade });
    } else if (draggingTrimId && trimType) {
      const dx = e.clientX - dragStartX;
      const dt = dx / FRAME_WIDTH / fps;
      
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

  const handleRulerPointerDown = (e: React.PointerEvent) => {
    setIsScrubbingRuler(true);
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left + (e.currentTarget as HTMLDivElement).scrollLeft;
    const time = x / (fps * FRAME_WIDTH);
    const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(time * fps)));
    onSelectFrame(frameIndex);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handleRulerPointerMove = (e: React.PointerEvent) => {
    if (isScrubbingRuler) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left + (e.currentTarget as HTMLDivElement).scrollLeft;
      const time = x / (fps * FRAME_WIDTH);
      const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(time * fps)));
      onSelectFrame(frameIndex);
    }
  };

  const handleRulerPointerUp = (e: React.PointerEvent) => {
    setIsScrubbingRuler(false);
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#121212] animate-in fade-in">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#1e1e1e]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#FF3B30]/10 rounded-lg">
            <Icons.Music size={24} className="text-[#FF3B30]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('timeline.audio')} Editor</h2>
            <p className="text-xs text-gray-400">Advanced multi-track mixing</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <Icons.Minus size={16} />
            </button>
            <span className="text-[10px] text-gray-400 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <Icons.Plus size={16} />
            </button>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <Icons.X size={24} />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Playback Controls */}
        <div className="h-14 flex items-center justify-center gap-6 bg-[#1e1e1e] border-b border-gray-800 shrink-0">
          <button 
            onClick={() => onSelectFrame(0)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Icons.SkipBack size={20} />
          </button>
          <button 
            onClick={onTogglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-white text-black' : 'bg-[#FF3B30] text-white hover:scale-105'}`}
          >
            {isPlaying ? <Icons.Pause size={20} fill="currentColor" /> : <Icons.Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          <button 
            onClick={() => onSelectFrame(frames.length - 1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Icons.SkipForward size={20} />
          </button>

          <div className="absolute right-6 flex gap-2">
            <button 
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
            >
              <Icons.Plus size={16} />
              {t('timeline.importAudio')}
            </button>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onAddAudioTrack} />
          </div>
        </div>

        {/* Timeline Ruler */}
        <div className="h-8 bg-black/40 border-b border-gray-800 flex relative overflow-hidden shrink-0">
           <div className="w-48 shrink-0 border-r border-gray-800 bg-[#1e1e1e] z-20 flex items-center px-4">
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tracks</span>
           </div>
           <div 
             className="flex-1 relative overflow-x-auto no-scrollbar cursor-pointer"
             onScroll={(e) => {
               if (scrollContainerRef.current) {
                 scrollContainerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
               }
             }}
             onPointerDown={handleRulerPointerDown}
             onPointerMove={handleRulerPointerMove}
             onPointerUp={handleRulerPointerUp}
           >
             <div style={{ width: `${totalDuration * fps * FRAME_WIDTH}px` }} className="h-full relative">
               {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                 <div 
                   key={i}
                   className="absolute top-0 bottom-0 border-l border-gray-700/30 text-[9px] text-gray-500 pl-1 py-1 font-mono"
                   style={{ left: `${i * fps * FRAME_WIDTH}px` }}
                 >
                   {i}s
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Scrollable Tracks */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-auto bg-[#121212] flex flex-col"
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={handleTimelinePointerUp}
            onPointerLeave={handleTimelinePointerUp}
            onScroll={(e) => {
              const tracksArea = scrollContainerRef.current?.parentElement;
              const rulerContainer = tracksArea?.previousElementSibling;
              const ruler = rulerContainer?.children[1] as HTMLDivElement;
              if (ruler) {
                ruler.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
              }
            }}
          >
            {audioTracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                <Icons.Music size={64} strokeWidth={1} />
                <p className="text-sm">No audio tracks yet. Import or record audio to start mixing.</p>
              </div>
            ) : (
              <div className="flex flex-col min-h-full" style={{ width: `${totalDuration * fps * FRAME_WIDTH + 200}px` }}>
                {audioTracks.map((track) => (
                  <div key={track.id} className="h-24 flex border-b border-gray-800/50 group">
                    {/* Track Controls */}
                    <div className="w-48 shrink-0 border-r border-gray-800 bg-[#1e1e1e] z-10 p-3 flex flex-col justify-between sticky left-0 shadow-xl">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                           <span className="text-xs text-gray-200 font-bold truncate">{track.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => onCutAudioTrack(track.id, currentFrameIndex / fps)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title={t('timeline.cutAtPlayhead')}
                          >
                            <Icons.Scissors size={14} />
                          </button>
                          <button 
                            onClick={() => onRemoveAudioTrack(track.id)}
                            className="p-1 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Icons.X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-500 font-bold uppercase">Volume</span>
                          <span className="text-[9px] text-gray-400 font-mono">{Math.round(track.volume * 100)}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={track.volume}
                          onChange={(e) => onUpdateAudioTrack(track.id, { volume: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-gray-700 rounded-full appearance-none accent-[#FF3B30] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Track Timeline */}
                    <div className="flex-1 relative bg-black/10">
                      {/* Grid Lines */}
                      {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                         <div 
                           key={i}
                           className="absolute top-0 bottom-0 border-l border-gray-800/20 pointer-events-none"
                           style={{ left: `${i * fps * FRAME_WIDTH}px` }}
                         />
                      ))}

                      {/* Clip */}
                      <div 
                        className="absolute inset-y-2 rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing group/clip transition-shadow hover:shadow-lg touch-none"
                        style={{ 
                          left: `${track.startTime * fps * FRAME_WIDTH}px`,
                          width: `${track.duration * fps * FRAME_WIDTH}px`,
                          backgroundColor: `${track.color}20`,
                          borderColor: `${track.color}60`
                        }}
                        onPointerDown={(e) => handleAudioPointerDown(e, track)}
                      >
                         <div className="absolute inset-0 opacity-40">
                           <Waveform url={track.url} color={track.color} duration={track.duration} offset={track.offset} />
                         </div>

                         {/* Info Overlay */}
                         <div className="absolute inset-x-2 top-1 flex justify-between pointer-events-none">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-white/50 uppercase">{track.startTime.toFixed(2)}s</span>
                              <span className="px-1 py-0.5 bg-black/60 rounded text-[9px] font-mono text-red-400 border border-red-500/30 uppercase leading-none">
                                F:{Math.floor(track.startTime * fps)}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[8px] font-bold text-white/50 uppercase">{track.duration.toFixed(2)}s</span>
                              <span className="px-1 py-0.5 bg-black/60 rounded text-[9px] font-mono text-red-400 border border-red-500/30 uppercase leading-none">
                                F:{Math.floor((track.startTime + track.duration) * fps)}
                              </span>
                            </div>
                         </div>

                         {/* Fade Visualization */}
                         <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {track.fadeIn && (
                              <path 
                                d={`M 0 100 L ${(track.fadeIn / track.duration) * 100} 0 L ${(track.fadeIn / track.duration) * 100} 100 Z`}
                                className="fill-white/10"
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                             {track.fadeOut && (
                              <path 
                                d={`M ${100 - (track.fadeOut / track.duration) * 100} 100 L ${100 - (track.fadeOut / track.duration) * 100} 0 L 100 100 Z`}
                                className="fill-white/10"
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                         </svg>

                         {/* Trim Handles */}
                         <div 
                            className="absolute inset-y-0 left-0 w-8 bg-black/10 hover:bg-white/20 cursor-col-resize z-20 transition-colors border-r border-white/5 flex items-center justify-center touch-none"
                            onPointerDown={(e) => handleTrimPointerDown(e, track, 'start')}
                         >
                            <div className="w-1 h-8 bg-white/40 rounded-full" />
                         </div>
                         <div 
                            className="absolute inset-y-0 right-0 w-8 bg-black/10 hover:bg-white/20 cursor-col-resize z-20 transition-colors border-l border-white/5 flex items-center justify-center touch-none"
                            onPointerDown={(e) => handleTrimPointerDown(e, track, 'end')}
                         >
                            <div className="w-1 h-8 bg-white/40 rounded-full" />
                         </div>

                         {/* Fade Handles */}
                         <div 
                            className="absolute top-1 w-4 h-4 rounded-full bg-white border-2 border-[#FF3B30] cursor-col-resize z-30 opacity-0 group-hover/clip:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                            style={{ left: `${(track.fadeIn || 0) / track.duration * 100}%`, transform: 'translateX(-50%)' }}
                            onPointerDown={(e) => handleFadePointerDown(e, track, 'in')}
                         >
                            <div className="w-1 h-1 bg-[#FF3B30] rounded-full" />
                         </div>
                         <div 
                            className="absolute top-1 w-4 h-4 rounded-full bg-white border-2 border-[#FF3B30] cursor-col-resize z-30 opacity-0 group-hover/clip:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                            style={{ right: `${(track.fadeOut || 0) / track.duration * 100}%`, transform: 'translateX(50%)' }}
                            onPointerDown={(e) => handleFadePointerDown(e, track, 'out')}
                         >
                            <div className="w-1 h-1 bg-[#FF3B30] rounded-full" />
                         </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Scrubber Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-[#FF3B30] z-40 pointer-events-none shadow-[0_0_10px_rgba(255,59,48,0.8)]"
                  style={{ 
                    left: `${192 + (currentFrameIndex / fps) * fps * FRAME_WIDTH}px`,
                   }}
                >
                   <div className="w-3 h-3 bg-[#FF3B30] rounded-full absolute -top-1.5 -left-[5px] ring-4 ring-[#FF3B30]/20" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="h-10 bg-[#1e1e1e] border-t border-gray-800 flex items-center px-6 justify-between shrink-0">
         <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Project Duration: <span className="text-gray-300">{totalDuration.toFixed(2)}s</span></span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">FPS: <span className="text-gray-300">{fps}</span></span>
         </div>
         <div className="text-[10px] text-gray-400 font-mono">
            {t('timeline.frames')} {currentFrameIndex + 1} / {frames.length}
         </div>
      </div>
    </div>
  );
};
