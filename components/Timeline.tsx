import React, { useRef, useEffect, useState } from 'react';
import { Frame, AudioTrack } from '../types';
import { Icons } from './Icons';

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
  onRemoveAudioTrack
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
    <div className="flex flex-col shrink-0 pointer-events-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-4 pb-[env(safe-area-inset-bottom)]">
      {/* Playback Controls & Stats */}
      <div className="h-10 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-300 font-mono uppercase tracking-wider drop-shadow-md">
                Frame {currentFrameIndex + 1} / {frames.length}
            </span>
            <button 
                onClick={() => setShowAudio(!showAudio)}
                className={`p-1.5 rounded-full transition-colors ${showAudio ? 'text-[#FF3B30] bg-white/10' : 'text-gray-400 hover:text-white'}`}
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
             <button onClick={() => onDeleteFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" disabled={frames.length <= 1}>
                <Icons.Trash2 size={16} />
             </button>
             <button onClick={() => onCopyFrame(currentFrameIndex)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                <Icons.Copy size={16} />
             </button>
        </div>
      </div>

      {/* Audio Tracks */}
      {showAudio && (
        <div className="mb-2 flex flex-col gap-1 px-2 animate-in fade-in slide-in-from-bottom-2">
            {/* Header / Add Button */}
            <div className="flex justify-between items-center bg-black/40 p-1 rounded text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider px-2">Audio Layers</span>
                <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 px-2"
                >
                    <Icons.Plus size={12} />
                    <span>Add Track</span>
                </button>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onAddAudioTrack} />
            </div>

            {/* List of Tracks */}
            <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                {audioTracks.map((track) => (
                    <div key={track.id} className="h-8 flex relative overflow-hidden bg-black/30 backdrop-blur-sm border border-white/5 rounded group">
                         {/* Controls */}
                        <div className="w-32 shrink-0 border-r border-white/10 flex items-center px-2 z-20 bg-black/20">
                            <Icons.Volume2 size={12} className="text-gray-400 mr-2" />
                            <span className="text-[10px] text-gray-300 truncate flex-1">{track.name}</span>
                            <button onClick={() => onRemoveAudioTrack(track.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icons.X size={12}/>
                            </button>
                        </div>
                        
                        {/* Waveform Viz */}
                        <div className="flex-1 relative overflow-hidden"> 
                            <div 
                                className="absolute inset-y-0 left-[50vw] flex items-center pointer-events-none transition-transform duration-100"
                                style={{ transform: `translateX(-${currentFrameIndex * 66}px)` }}
                            >
                                <div className="h-full flex items-center gap-0.5 rounded px-2" style={{ width: `${frames.length * 66}px`, backgroundColor: `${track.color}20` }}>
                                    {/* Fake bars pattern */}
                                    {Array.from({ length: Math.ceil(frames.length * 10) }).map((_, i) => (
                                        <div key={i} className="w-1 rounded-full opacity-60" style={{ height: `${30 + Math.random() * 70}%`, backgroundColor: track.color }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {audioTracks.length === 0 && (
                    <div className="h-8 flex items-center justify-center text-gray-500 text-xs italic">
                        No audio tracks. Tap + to add.
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Frames Strip */}
      <div className="relative w-full overflow-hidden h-24">
        <div 
            ref={scrollContainerRef}
            className="absolute inset-0 flex items-center px-[50vw] overflow-x-auto overflow-y-hidden no-scrollbar"
        >
            {frames.map((frame, index) => (
                <div 
                    key={frame.id}
                    onClick={() => onSelectFrame(index)}
                    className={`
                        relative flex-shrink-0 w-16 h-20 mx-0.5 bg-white rounded-[4px] overflow-hidden border transition-all duration-150 select-none cursor-pointer
                        ${currentFrameIndex === index ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/50 scale-100 z-10 shadow-lg' : 'border-gray-600 opacity-60 hover:opacity-100 scale-95'}
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
                className="flex-shrink-0 w-16 h-20 mx-0.5 flex items-center justify-center bg-[#FF3B30] border border-[#FF3B30] rounded-[4px] cursor-pointer hover:bg-red-600 text-white shadow-lg transition-all scale-95"
            >
                <Icons.Plus size={32} strokeWidth={3} />
            </div>
        </div>
        
        {/* Center Indicator Line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#FF3B30] z-20 pointer-events-none transform -translate-x-1/2 shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
      </div>
    </div>
  );
};