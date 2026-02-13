import React, { useRef, useEffect, useState } from 'react';
import { Frame, AudioTrack } from '../types';
import { Icons } from '../Icons';

interface TimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onCopyFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  audioTracks: AudioTrack[];
  onAddAudioTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudioTrack: (id: string) => void;
  isFocusMode?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onCopyFrame,
  isPlaying,
  onTogglePlay,
  audioTracks,
  onAddAudioTrack,
  onRemoveAudioTrack,
  isFocusMode = false
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [showAudio, setShowAudio] = useState(false);

  // Auto scroll to active frame
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[currentFrameIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentFrameIndex]);

  return (
    <div className={`flex flex-col shrink-0 bg-transparent pb-4 pb-[env(safe-area-inset-bottom)] transition-all duration-300 ${isFocusMode ? 'pt-0 pointer-events-none' : 'pt-8 pointer-events-auto'}`}>
      {!isFocusMode && (
        <div className="h-10 flex items-center px-4 justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-2">
              <span className="text-[10px] text-white font-mono uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  Frame {currentFrameIndex + 1} / {frames.length}
              </span>
              <button 
                  onClick={() => setShowAudio(!showAudio)}
                  className={`p-1.5 rounded-full transition-colors ${showAudio ? 'text-[#FF3B30] bg-black/40' : 'text-gray-300 hover:text-white drop-shadow-md'}`}
                  title="Toggle Audio Tracks"
              >
                  <Icons.Music size={16} />
                  {audioTracks.length > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-[#1e1e1e]" />
                  )}
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
               <button onClick={() => onDeleteFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white" disabled={frames.length <= 1}>
                  <Icons.Trash2 size={16} />
               </button>
               <button onClick={() => onCopyFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white">
                  <Icons.Copy size={16} />
               </button>
          </div>
        </div>
      )}

      {showAudio && !isFocusMode && (
        <div className="mb-2 flex flex-col gap-1 px-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center bg-black/60 backdrop-blur-md p-1 rounded text-xs">
                <span className="text-gray-200 font-bold uppercase tracking-wider px-2">Audio Layers</span>
                <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 px-2"
                >
                    <Icons.Plus size={12} />
                    <span>Add Track</span>
                </button>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onAddAudioTrack} />
            </div>

            <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                {audioTracks.map((track) => (
                    <div key={track.id} className="h-8 flex relative overflow-hidden bg-black/50 backdrop-blur-md border border-white/10 rounded group">
                        <div className="w-32 shrink-0 border-r border-white/10 flex items-center px-2 z-20 bg-black/20">
                            <Icons.Volume2 size={12} className="text-gray-300 mr-2" />
                            <span className="text-[10px] text-gray-100 truncate flex-1">{track.name}</span>
                            <button onClick={() => onRemoveAudioTrack(track.id)} className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icons.X size={12}/>
                            </button>
                        </div>
                        <div className="flex-1 relative overflow-hidden"> 
                            <div 
                                className="absolute inset-y-0 left-[50vw] flex items-center pointer-events-none transition-transform duration-100"
                                style={{ transform: `translateX(-${currentFrameIndex * 66}px)` }}
                            >
                                <div className="h-full flex items-center gap-0.5 rounded px-2" style={{ width: `${frames.length * 66}px`, backgroundColor: `${track.color}40` }}>
                                    {Array.from({ length: Math.ceil(frames.length * 10) }).map((_, i) => (
                                        <div key={i} className="w-1 rounded-full opacity-80" style={{ height: `${30 + Math.random() * 70}%`, backgroundColor: track.color }} />
                                    ))}
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
                        relative flex-shrink-0 w-16 h-20 mx-0.5 bg-white rounded-[4px] overflow-hidden border transition-all duration-150 select-none
                        ${isFocusMode ? 'pointer-events-none opacity-20 border-gray-500' : 'cursor-pointer hover:opacity-100 border-gray-600 opacity-80 scale-95 shadow-md'}
                        ${!isFocusMode && currentFrameIndex === index ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/50 scale-100 z-10 shadow-lg !opacity-100' : ''}
                        ${isFocusMode && currentFrameIndex === index ? 'opacity-50 scale-100 border-white' : ''}
                    `}
                >
                    {frame.thumbnailUrl ? (
                         <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} className="w-full h-full object-contain pointer-events-none bg-white" />
                    ) : (
                        <div className="w-full h-full bg-white" />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-[#121212] bg-white/90 px-1 rounded-sm">
                        {index + 1}
                    </span>
                </div>
            ))}
            
             <div 
                onClick={onAddFrame}
                className="flex-shrink-0 w-16 h-20 mx-0.5 flex items-center justify-center bg-[#FF3B30] border border-[#FF3B30] rounded-[4px] cursor-pointer hover:bg-red-600 text-white shadow-lg transition-all scale-95 pointer-events-auto opacity-100 z-20"
            >
                <Icons.Plus size={32} strokeWidth={3} />
            </div>
        </div>
        
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#FF3B30] z-20 pointer-events-none transform -translate-x-1/2 shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
      </div>
    </div>
  );
};