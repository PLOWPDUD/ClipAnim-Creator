import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { Frame, Layer, BackgroundSettings } from '../types';
import { compositeLayers } from '../utils/drawingUtils';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-seq' | 'png' | 'avi' | 'project-zip' | 'html';
export type ExportQuality = 'low' | 'medium' | 'high';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, quality: ExportQuality, transparent: boolean) => void;
  onCancel: () => void;
  isExporting: boolean;
  progress: number;
  projectName: string;
  setProjectName: (name: string) => void;
  projectType?: 'animation' | 'painting' | 'game';
  frameCount: number;
  fps: number;
  exportedFile?: { url: string, name: string, blob: Blob } | null;
  frames?: Frame[];
  layers?: Layer[];
  canvasSize?: { width: number; height: number };
  background?: BackgroundSettings;
  backgroundImage?: string | null;
  onOpenSpritesheetExport?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onCancel,
  isExporting, 
  progress,
  projectName,
  setProjectName,
  projectType = 'animation',
  frameCount,
  fps,
  exportedFile,
  frames,
  layers,
  canvasSize,
  background,
  backgroundImage,
  onOpenSpritesheetExport
}) => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [transparent, setTransparent] = useState(false);

  // Full Movie & Painting Preview States
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [previewDurations, setPreviewDurations] = useState<number[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100%' | '150%'>('fit');

  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingScrubberRef = useRef(false);

  // Safe frame counts and FPS
  const safeFps = fps > 0 ? fps : 12;
  const totalFramesCount = frames && frames.length > 0 ? frames.length : frameCount;

  // Calculate total duration in seconds from durations array or frame count
  const totalDurationSec = previewDurations.length > 0 
    ? previewDurations.reduce((acc, d) => acc + d, 0)
    : (totalFramesCount / safeFps);

  // Calculate current elapsed time up to previewIndex
  const currentElapsedSec = previewDurations.length > 0
    ? previewDurations.slice(0, previewIndex).reduce((acc, d) => acc + d, 0)
    : (previewIndex / safeFps);

  // Format seconds to mm:ss.s or ss.ss
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = (sec % 60).toFixed(1);
    if (mins > 0) {
      return `${mins}:${remainingSec.padStart(4, '0')}s`;
    }
    return `${remainingSec}s`;
  };

  // Generate crisp FULL animation preview of ALL frames
  const handleGenerateFullPreview = useCallback(async () => {
    if (!frames || frames.length === 0 || !layers) return;
    
    setIsPreviewLoading(true);
    setRenderProgress(0);

    try {
      const origW = canvasSize?.width || 800;
      const origH = canvasSize?.height || 600;
      // High-resolution preview: crisp rendering up to 1024px for pixel sharpness
      const renderW = Math.min(origW, 1024);
      const renderH = Math.max(1, Math.round(renderW * (origH / origW)));

      const compositedUrls: string[] = [];
      const durationsSec: number[] = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const dur = (frame.durationMultiplier || 1) / safeFps;
        durationsSec.push(dur);

        const url = await compositeLayers(
          frame,
          layers,
          renderW,
          renderH,
          background || { type: 'color', color: '#ffffff' },
          backgroundImage || null,
          !transparent
        );
        compositedUrls.push(url);
        setRenderProgress(Math.round(((i + 1) / frames.length) * 100));
      }

      setPreviewFrames(compositedUrls);
      setPreviewDurations(durationsSec);
      setPreviewIndex(0);
      setIsPreviewPlaying(true);
    } catch (e) {
      console.error("Failed to generate full preview", e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [frames, layers, canvasSize, safeFps, background, backgroundImage, transparent]);

  // Auto-generate full preview on modal open and whenever transparency setting changes
  useEffect(() => {
    if (isOpen) {
      handleGenerateFullPreview();
    }
  }, [isOpen, transparent, handleGenerateFullPreview]);

  // Animation loop playback ticker for full animation preview
  useEffect(() => {
    if (!isOpen || !isPreviewPlaying || previewFrames.length === 0 || isPreviewLoading) {
      return;
    }

    const currentDurationMs = ((previewDurations[previewIndex] || (1 / safeFps)) * 1000) / playbackSpeed;

    const timer = setTimeout(() => {
      setPreviewIndex((prev) => {
        if (prev >= previewFrames.length - 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPreviewPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, Math.max(15, currentDurationMs));

    return () => clearTimeout(timer);
  }, [isOpen, isPreviewPlaying, previewIndex, previewFrames, previewDurations, isPreviewLoading, safeFps, playbackSpeed, isLooping]);

  // Interactive scrubber click and drag handling
  const handleScrubberInteraction = (clientX: number) => {
    if (!scrubberRef.current || previewFrames.length <= 1) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetIdx = Math.min(previewFrames.length - 1, Math.floor(pos * previewFrames.length));
    setPreviewIndex(targetIdx);
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingScrubberRef.current = true;
    handleScrubberInteraction(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingScrubberRef.current) {
        handleScrubberInteraction(moveEvent.clientX);
      }
    };

    const onMouseUp = () => {
      isDraggingScrubberRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard navigation inside preview (Space = Play/Pause, Left/Right = Frame step, L = Loop, F = Theater, Esc = Exit)
  useEffect(() => {
    if (!isOpen || isExporting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPreviewPlaying(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPreviewPlaying(false);
        setPreviewIndex(prev => (prev - 1 + previewFrames.length) % Math.max(1, previewFrames.length));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPreviewPlaying(false);
        setPreviewIndex(prev => (prev + 1) % Math.max(1, previewFrames.length));
      } else if (e.key.toLowerCase() === 'l') {
        setIsLooping(prev => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        setIsTheaterMode(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isTheaterMode) {
          setIsTheaterMode(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, previewFrames.length, isTheaterMode, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!exportedFile) return;
    const a = document.createElement('a');
    a.href = exportedFile.url;
    a.download = exportedFile.name;
    a.click();
  };

  const handleShare = async () => {
    if (!exportedFile) return;

    const median = (window as any).median || (window as any).gonative;
    if (median?.share?.file) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          median.share.file({
            base64: base64,
            filename: exportedFile.name
          });
        };
        reader.readAsDataURL(exportedFile.blob);
        return;
      } catch (e) {
        console.error("Median share failed:", e);
      }
    }

    try {
      if (navigator.share) {
        const file = new File([exportedFile.blob], exportedFile.name, { type: exportedFile.blob.type });
        const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
        
        if (canShareFiles) {
          await navigator.share({
            title: t('export.shareTitle', 'Exported Animation'),
            text: t('export.shareTextDefault', 'Check out my animation!'),
            files: [file]
          });
        } else {
          await navigator.share({
            title: t('export.shareTitle', 'Exported Animation'),
            text: t('export.shareTextWithName', { name: projectName }),
            url: window.location.href
          });
        }
      } else {
        alert(t('export.shareNotSupported', 'Direct sharing is not supported on this browser.'));
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError' || (e as Error).name === 'NotAllowedError') {
        return;
      }
      console.error("Share failed:", e);
      alert(t('export.shareFailed', 'Sharing failed.'));
    }
  };

  const allFormats: { id: ExportFormat; label: string; icon: React.ElementType; color: string; desc: string; badge?: string }[] = [
    { id: 'mp4', label: t('export.mp4', 'MP4 Video'), icon: Icons.FileVideo, color: 'text-blue-400', desc: t('export.mp4Desc', 'High quality H.264 standard video for YouTube, Instagram, and TikTok'), badge: 'Standard' },
    { id: 'webm', label: t('export.webm', 'WebM Video'), icon: Icons.FileVideo, color: 'text-emerald-400', desc: t('export.webmDesc', 'Lightweight modern web video format with optional alpha transparency'), badge: 'Alpha Ready' },
    { id: 'gif', label: t('export.gif', 'Animated GIF'), icon: Icons.Image, color: 'text-amber-400', desc: t('export.gifDesc', 'Looping animated GIF perfect for Discord, Reddit, and stickers'), badge: 'Looping' },
    { id: 'png-seq', label: t('export.pngSeq', 'PNG Sequence (.zip)'), icon: Icons.FileArchive, color: 'text-rose-400', desc: t('export.pngSeqDesc', 'Lossless transparent frame images zipped for Premiere, After Effects, Blender'), badge: 'Pro Zip' },
    { id: 'png', label: t('export.png', 'PNG Image'), icon: Icons.Image, color: 'text-purple-400', desc: t('export.pngDesc', 'Export full-resolution crisp static PNG artwork'), badge: 'Single Frame' },
    { id: 'html', label: t('export.html', 'Playable HTML5 Game (.html)'), icon: Icons.Gamepad2, color: 'text-cyan-400', desc: t('export.htmlDesc', 'Self-contained offline playable interactive game file for itch.io or web sharing'), badge: 'Interactive' },
    { id: 'project-zip', label: t('export.projectZip', 'Project Backup (.zip)'), icon: Icons.FileArchive, color: 'text-purple-400', desc: t('export.projectZipDesc', 'Complete editable project archive with all frames, layers, audio, and settings'), badge: 'Full Source' },
    { id: 'avi', label: t('export.avi', 'AVI Video'), icon: Icons.FileVideo, color: 'text-indigo-400', desc: t('export.aviDesc', 'Raw video container for legacy desktop video editors') },
  ];

  const formats = projectType === 'painting' 
    ? allFormats.filter(f => f.id === 'png' || f.id === 'project-zip') 
    : allFormats.filter(f => f.id !== 'png');

  const qualityOptions: { id: ExportQuality; label: string; desc: string }[] = [
    { id: 'low', label: t('export.low', 'Fast / Compact'), desc: t('export.lowDesc', 'Lower bitrate, smallest file size for quick previews and chats') },
    { id: 'medium', label: t('export.medium', 'Standard HD (Recommended)'), desc: t('export.mediumDesc', 'Balanced crisp sharpness and efficient file size for web & social') },
    { id: 'high', label: t('export.high', 'Maximum Quality / Master'), desc: t('export.highDesc', 'Highest bitrate and crystal-clear frames for master archives') },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-2 sm:p-4 md:p-6 select-none">
      
      {/* Main Large Modal Container */}
      <div className={`bg-[#181818] w-[1120px] max-w-[98vw] ${isTheaterMode ? 'h-[96vh]' : 'max-h-[94vh]'} rounded-3xl shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden relative transition-all duration-300`}>
        
        {/* Export Progress Overlay */}
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-[#141414]/98 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-20 h-20 rounded-full border-4 border-gray-800 border-t-[#FF3B30] animate-spin mb-6 shadow-[0_0_30px_rgba(255,59,48,0.3)]" />
             <h2 className="text-3xl font-bold text-white mb-2">{t('export.rendering', 'Rendering Full Animation...')}</h2>
             <p className="text-gray-400 text-sm mb-6 max-w-md">{t('export.renderingDesc', 'Compositing all layers, audio, and encoding movie file with high-definition frames.')}</p>
             
             <div className="w-full max-w-md bg-gray-800 h-3.5 rounded-full overflow-hidden mb-3 border border-gray-700">
                <div 
                    className="h-full bg-gradient-to-r from-red-500 to-[#FF3B30] transition-all duration-300 shadow-[0_0_15px_rgba(255,59,48,0.7)]" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
             
             <div className="flex items-center gap-3 text-sm font-mono text-gray-400 mb-8">
               <span className="font-bold text-white">{progress}%</span>
               <span>•</span>
               <span>{frameCount} Frames Total</span>
             </div>

             <button 
                 onClick={onCancel}
                 className="px-8 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-all border border-gray-700 shadow-md"
             >
                 {t('common.cancel', 'Cancel Export')}
             </button>
          </div>
        )}

        {/* Success Finished Overlay */}
        {!isExporting && exportedFile && (
          <div className="absolute inset-0 z-50 bg-[#141414]/98 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                 <Icons.Check className="text-emerald-400" size={48} />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">{t('export.success', 'Export Complete!')}</h2>
             <p className="text-gray-400 text-sm mb-8 max-w-md">{t('export.successDesc', 'Your file has been rendered and is ready to download or share.')}</p>
             
             <div className="flex flex-wrap gap-4 justify-center">
                 <button 
                     onClick={handleShare}
                     className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-[#FF3B30] hover:opacity-90 text-white font-bold transition-all flex items-center gap-2.5 shadow-[0_0_25px_rgba(255,59,48,0.4)] hover:scale-105 active:scale-95"
                 >
                     <Icons.Share2 size={20} />
                     <span>{t('common.share', 'Share File')}</span>
                 </button>
                 <button 
                     onClick={handleDownload}
                     className="px-8 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all flex items-center gap-2.5 border border-gray-700 shadow-lg hover:scale-105 active:scale-95"
                 >
                     <Icons.Download size={20} />
                     <span>{t('common.download', 'Download File')}</span>
                 </button>
             </div>
             
             <button 
                 onClick={onClose}
                 className="mt-8 px-6 py-2.5 rounded-full text-gray-400 hover:text-white text-xs font-bold transition-colors hover:bg-gray-800"
             >
                 {t('common.close', 'Return to Canvas')}
             </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#141414] border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-[#FF3B30] flex items-center justify-center text-white shadow-md">
              <Icons.Clapperboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {projectType === 'painting' ? 'Export Painting & Artwork' : t('export.makeMovie', 'Export Movie & Animation')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gray-800 text-gray-300 border border-gray-700">
                  {projectType === 'painting' ? 'Painting' : projectType === 'game' ? 'Game Project' : 'Full Movie'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Preview full composition, timeline playback, and select output format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTheaterMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isTheaterMode 
                  ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40 shadow-sm' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
              }`}
              title="Toggle Full Preview Theater Mode (F)"
            >
              {isTheaterMode ? <Icons.Minimize2 size={15} /> : <Icons.Maximize2 size={15} />}
              <span>{isTheaterMode ? 'Exit Theater' : 'Full Theater Preview'}</span>
            </button>

            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors"
              title="Close (Esc)"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body: Split between Full Cinema Preview (Left) and Export Formats & Options (Right) */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT PANEL: FULL PREVIEW CINEMA STAGE */}
          <div className={`${isTheaterMode ? 'w-full' : 'w-full lg:w-[58%]'} p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col bg-[#161616] overflow-y-auto no-scrollbar`}>
            
            {/* Viewport Header Bar with Project Info & Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs font-bold text-gray-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Full Preview
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/40 text-gray-400 text-[11px] font-mono border border-gray-800">
                  {canvasSize?.width || 800} × {canvasSize?.height || 600}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/40 text-gray-400 text-[11px] font-mono border border-gray-800">
                  {totalFramesCount} {totalFramesCount === 1 ? 'Frame' : 'Frames'} • {safeFps} FPS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-red-950/40 text-red-300 text-[11px] font-mono border border-red-800/40 font-semibold">
                  {formatTime(totalDurationSec)} Full Duration
                </span>
              </div>

              {/* Refresh / Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800 text-[10px] font-bold">
                  {(['fit', '100%', '150%'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setZoomLevel(lvl)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        zoomLevel === lvl 
                          ? 'bg-gray-700 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={`Zoom ${lvl}`}
                    >
                      {lvl === 'fit' ? 'Fit' : lvl}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateFullPreview}
                  disabled={isPreviewLoading}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  title="Re-render Full Preview"
                >
                  <Icons.RotateCw size={15} className={isPreviewLoading ? 'animate-spin text-[#FF3B30]' : ''} />
                </button>
              </div>
            </div>

            {/* Main Stage Viewport Box */}
            <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] md:min-h-[360px] max-h-[520px] rounded-2xl bg-[#0e0e0e] border border-gray-800/90 shadow-2xl flex items-center justify-center overflow-hidden group">
              
              {/* Checkerboard Pattern for Alpha Backgrounds */}
              <div 
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
                    linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
                    linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                }}
              />

              {/* Canvas Preview Image / Loading State */}
              {isPreviewLoading ? (
                <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
                  <Icons.Loader2 size={36} className="animate-spin text-[#FF3B30]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Rendering Full Preview...</p>
                    <p className="text-xs text-gray-400 font-mono">
                      Compositing high-res layers ({renderProgress}%)
                    </p>
                  </div>
                  <div className="w-48 bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700 mt-1">
                    <div className="bg-[#FF3B30] h-full transition-all duration-150" style={{ width: `${renderProgress}%` }} />
                  </div>
                </div>
              ) : previewFrames.length > 0 ? (
                <div className="relative z-10 w-full h-full flex items-center justify-center p-3">
                  <img 
                    src={previewFrames[previewIndex] || previewFrames[0]} 
                    alt={`Frame ${previewIndex + 1}`} 
                    className="max-w-full max-h-full object-contain select-none drop-shadow-2xl transition-transform duration-150"
                    style={{
                      transform: zoomLevel === '150%' ? 'scale(1.5)' : zoomLevel === '100%' ? 'scale(1.0)' : 'none'
                    }}
                  />

                  {/* Hover Floating Overlay Buttons for Fast Play / Pause */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPreviewPlaying(!isPreviewPlaying);
                      }}
                      className="p-3.5 rounded-full bg-[#FF3B30] hover:bg-[#FF453A] text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                      title={isPreviewPlaying ? "Pause (Space)" : "Play (Space)"}
                    >
                      {isPreviewPlaying ? <Icons.Pause size={22} /> : <Icons.Play size={22} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-2 text-gray-500 p-6 text-center">
                  <Icons.Clapperboard size={32} />
                  <p className="text-xs">No frames available to preview.</p>
                </div>
              )}

              {/* Top-Right Resolution & Format Stamp */}
              <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-300 tracking-wider uppercase shadow-lg">
                  {transparent ? 'Alpha / Transparent' : 'Composite RGB'}
                </span>
              </div>
            </div>

            {/* INTERACTIVE FULL TIMELINE SCRUBBER */}
            <div className="mt-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-3.5 space-y-3">
              
              {/* Scrubbing Bar with Frame Segments & Playhead */}
              <div 
                ref={scrubberRef}
                onMouseDown={handleScrubberMouseDown}
                className="relative h-6 bg-black/60 rounded-xl overflow-hidden cursor-pointer border border-gray-800 flex items-center group/scrubber select-none"
                title="Click or drag to scrub through all frames"
              >
                {/* Visual Segments for all frames */}
                <div className="absolute inset-0 flex">
                  {previewFrames.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-full flex-1 border-r border-black/40 transition-colors ${
                        idx <= previewIndex ? 'bg-gradient-to-r from-red-600/80 to-[#FF3B30]' : 'bg-gray-800/40 hover:bg-gray-700/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Draggable Playhead Pin */}
                {previewFrames.length > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] border border-gray-900 transition-all pointer-events-none z-10"
                    style={{
                      left: `${((previewIndex + 0.5) / Math.max(1, previewFrames.length)) * 100}%`
                    }}
                  />
                )}
              </div>

              {/* Master Playback Controls Deck */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                
                {/* Step / Play / Jump Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(0);
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Jump to Start"
                  >
                    <Icons.SkipBack size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(prev => (prev - 1 + previewFrames.length) % Math.max(1, previewFrames.length));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Previous Frame (Left Arrow)"
                  >
                    <Icons.ChevronLeft size={18} />
                  </button>

                  <button
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    className="px-4 py-2 rounded-xl bg-[#FF3B30] hover:bg-[#FF453A] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
                    title="Play/Pause (Spacebar)"
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Icons.Pause size={16} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Icons.Play size={16} className="ml-0.5" />
                        <span>Play Full</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(prev => (prev + 1) % Math.max(1, previewFrames.length));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Next Frame (Right Arrow)"
                  >
                    <Icons.ChevronRight size={18} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(Math.max(0, previewFrames.length - 1));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Jump to End"
                  >
                    <Icons.SkipForward size={16} />
                  </button>
                </div>

                {/* Timecode & Frame Indicator */}
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-gray-800 font-mono text-xs text-gray-300">
                  <span className="font-bold text-white">
                    {formatTime(currentElapsedSec)}
                  </span>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-400">
                    {formatTime(totalDurationSec)}
                  </span>
                  <span className="text-gray-700">|</span>
                  <span className="text-red-400 font-semibold">
                    Frame {previewIndex + 1} / {totalFramesCount}
                  </span>
                </div>

                {/* Loop and Speed Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                      isLooping 
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm' 
                        : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                    }`}
                    title="Toggle Loop Playback (L)"
                  >
                    <Icons.Repeat size={14} />
                    <span className="text-[11px] hidden sm:inline">{isLooping ? 'Looping' : 'Once'}</span>
                  </button>

                  {/* Playback Speed Pill */}
                  <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700 text-[11px] font-bold">
                    {[0.5, 1, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          playbackSpeed === spd 
                            ? 'bg-[#FF3B30] text-white shadow' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Quick Keyboard Reference Banner */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 px-1">
              <span>Shortcuts: <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">Space</kbd> Play/Pause • <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">←</kbd> <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">→</kbd> Step Frame • <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">F</kbd> Theater</span>
              <span className="text-emerald-400/80 font-medium">100% Full Timeline Loaded</span>
            </div>

          </div>

          {/* RIGHT PANEL: EXPORT FORMATS & SETTINGS */}
          <div className={`${isTheaterMode ? 'hidden' : 'w-full lg:w-[42%]'} p-6 sm:p-7 flex flex-col bg-[#1a1a1a] overflow-y-auto no-scrollbar`}>
            
            {/* Project Name & Resolution Summary */}
            <div className="mb-5 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  File Name
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Animation"
                    className="flex-1 bg-gray-900 text-white rounded-xl px-3.5 py-2.5 text-sm font-semibold border border-gray-700 hover:border-gray-500 focus:border-[#FF3B30] focus:outline-none transition-colors shadow-inner"
                  />
                </div>
              </div>

              {/* Transparent Background Toggle */}
              <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${transparent ? 'bg-[#FF3B30]' : 'bg-gray-700'}`}>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${transparent ? 'translate-x-5' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-gray-200 transition-colors">
                      {t('export.transparent', 'Transparent Background (Alpha Channel)')}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Omit solid background for WebM video, animated GIF, and PNG sequences
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                  />
                </label>
              </div>

              {/* Quality Preset Radio selector */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  {t('export.quality', 'Export Quality & Bitrate')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {qualityOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setQuality(opt.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        quality === opt.id 
                          ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white shadow-md' 
                          : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      <div className="font-bold text-xs capitalize">{opt.id}</div>
                      <div className="text-[9px] opacity-60 leading-tight mt-0.5 truncate">{opt.id === 'low' ? 'Small File' : opt.id === 'medium' ? 'Standard HD' : 'Maximum Bitrate'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Format Actions List */}
            <div className="space-y-2.5 flex-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Choose Format to Render
              </label>

              {/* Adobe Animate / FNF Spritesheet Button (if available) */}
              {onOpenSpritesheetExport && (
                <button 
                  onClick={() => {
                    onClose();
                    onOpenSpritesheetExport();
                  }}
                  className="w-full group bg-gradient-to-r from-red-950/50 via-red-900/30 to-gray-900 border border-red-500/40 hover:border-red-400 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-left shadow-lg"
                >
                  <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:scale-110 transition-transform">
                    <Icons.Sparkles size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm group-hover:text-red-300 transition-colors">Spritesheet + Starling XML</span>
                      <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-red-500/30">Adobe Animate / FNF</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Pack animated symbols into texture atlas with Sparrow / Starling XML</div>
                  </div>
                  <Icons.ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
              )}

              {/* Format Cards */}
              <div className="space-y-2">
                {formats.map((format) => (
                  <button 
                    key={format.id}
                    onClick={() => onExport(format.id, quality, transparent)}
                    className="w-full group bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-[#FF3B30] p-3.5 rounded-2xl flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-left shadow-sm"
                  >
                    <div className={`p-2.5 rounded-xl bg-black/50 group-hover:scale-110 transition-transform ${format.color}`}>
                      <format.icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-[#FF3B30] transition-colors">{format.label}</span>
                        {format.badge && (
                          <span className="bg-gray-800 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-gray-700">
                            {format.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">{format.desc}</div>
                    </div>
                    <Icons.Download size={18} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Disclaimer and Tips */}
            <div className="mt-5 pt-4 border-t border-gray-800/80 text-[10px] text-gray-500 space-y-1">
              <p>
                💡 <span className="font-bold text-gray-400">Pro Tip:</span> All video, GIF, and sprite exports are processed 100% locally on your browser with hardware acceleration.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
