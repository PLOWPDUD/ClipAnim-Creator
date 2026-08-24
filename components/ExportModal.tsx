import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { Frame, Layer, BackgroundSettings } from '../types';
import { compositeLayers } from '../utils/drawingUtils';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-seq' | 'png' | 'avi' | 'project-zip';
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

  // Low-resolution 1-second loop preview states
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [previewDurations, setPreviewDurations] = useState<number[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);

  const handleGeneratePreview = useCallback(async () => {
    if (!frames || frames.length === 0 || !layers) return;
    
    setIsPreviewLoading(true);
    setShowPreview(true);
    setPreviewIndex(0);

    try {
      const origW = canvasSize?.width || 800;
      const origH = canvasSize?.height || 600;
      // Target low-resolution width = 320px for fast generation
      const lowResW = 320;
      const lowResH = Math.max(1, Math.round(320 * (origH / origW)));

      // Target duration = 1.0 second
      const targetDurationSec = 1.0;
      let accumulatedSec = 0;

      const selectedFrames: Frame[] = [];
      const durationsSec: number[] = [];

      let framePointer = 0;
      const safeFps = fps > 0 ? fps : 12;

      // Select frames to fill ~1 second loop duration
      while (accumulatedSec < targetDurationSec && selectedFrames.length < 60) {
        const frame = frames[framePointer % frames.length];
        const dur = (frame.durationMultiplier || 1) / safeFps;
        
        selectedFrames.push(frame);
        durationsSec.push(dur);
        accumulatedSec += dur;

        framePointer++;
        if (framePointer % frames.length === 0 && accumulatedSec >= targetDurationSec) {
          break;
        }
      }

      // Render low-res composite data URLs
      const compositedUrls: string[] = [];
      for (const frame of selectedFrames) {
        const url = await compositeLayers(
          frame,
          layers,
          lowResW,
          lowResH,
          background || { type: 'color', color: '#ffffff' },
          backgroundImage || null,
          !transparent
        );
        compositedUrls.push(url);
      }

      setPreviewFrames(compositedUrls);
      setPreviewDurations(durationsSec);
      setIsPreviewPlaying(true);
    } catch (e) {
      console.error("Failed to generate preview loop", e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [frames, layers, canvasSize, fps, background, backgroundImage, transparent]);

  // Re-generate preview if transparent setting changes while preview is visible
  useEffect(() => {
    if (showPreview) {
      handleGeneratePreview();
    }
  }, [transparent]);

  // Animation loop interval for preview playback
  useEffect(() => {
    if (!showPreview || !isPreviewPlaying || previewFrames.length === 0 || isPreviewLoading) {
      return;
    }

    const safeFps = fps > 0 ? fps : 12;
    const currentDurationMs = (previewDurations[previewIndex] || (1 / safeFps)) * 1000;

    const timer = setTimeout(() => {
      setPreviewIndex((prev) => (prev + 1) % previewFrames.length);
    }, currentDurationMs);

    return () => clearTimeout(timer);
  }, [showPreview, isPreviewPlaying, previewIndex, previewFrames, previewDurations, isPreviewLoading, fps]);

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

    // 1. Try Median.co / GoNative Bridge (for Android/iOS native apps)
    const median = (window as any).median || (window as any).gonative;
    if (median?.share?.file) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Median expects base64 string without the data:mime;base64, prefix
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

    // 2. Try Web Share API
    try {
      if (navigator.share) {
        const file = new File([exportedFile.blob], exportedFile.name, { type: exportedFile.blob.type });
        
        // Check if sharing files is supported specifically
        const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
        
        if (canShareFiles) {
          await navigator.share({
            title: t('export.shareTitle'),
            text: t('export.shareTextDefault'),
            files: [file]
          });
        } else {
          // Fallback to sharing just text/url if files aren't supported but share API exists
          await navigator.share({
            title: t('export.shareTitle'),
            text: t('export.shareTextWithName', { name: projectName }),
            url: window.location.href
          });
        }
      } else {
        alert(t('export.shareNotSupported'));
      }
    } catch (e) {
      // Don't alert on user cancellation
      if ((e as Error).name === 'AbortError' || (e as Error).name === 'NotAllowedError') {
        return;
      }
      console.error("Share failed:", e);
      alert(t('export.shareFailed'));
    }
  };

  const allFormats: { id: ExportFormat; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { id: 'mp4', label: t('export.mp4'), icon: Icons.FileVideo, color: 'text-blue-400', desc: t('export.mp4Desc') },
    { id: 'webm', label: t('export.webm'), icon: Icons.FileVideo, color: 'text-emerald-400', desc: t('export.webmDesc') },
    { id: 'gif', label: t('export.gif'), icon: Icons.Image, color: 'text-amber-400', desc: t('export.gifDesc') },
    { id: 'png-seq', label: t('export.pngSeq'), icon: Icons.FileArchive, color: 'text-rose-400', desc: t('export.pngSeqDesc') },
    { id: 'png', label: t('export.png', 'PNG Image'), icon: Icons.Image, color: 'text-purple-400', desc: t('export.pngDesc', 'Export a static PNG image') },
    { id: 'project-zip', label: t('export.projectZip'), icon: Icons.FileArchive, color: 'text-purple-400', desc: t('export.projectZipDesc') },
    { id: 'avi', label: t('export.avi'), icon: Icons.FileVideo, color: 'text-indigo-400', desc: t('export.aviDesc') },
  ];

  const formats = projectType === 'painting' 
    ? allFormats.filter(f => f.id === 'png') 
    : allFormats.filter(f => f.id !== 'png');

  const qualityOptions: { id: ExportQuality; label: string; desc: string }[] = [
    { id: 'low', label: t('export.low'), desc: t('export.lowDesc') },
    { id: 'medium', label: t('export.medium'), desc: t('export.mediumDesc') },
    { id: 'high', label: t('export.high'), desc: t('export.highDesc') },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-[720px] max-w-[95vw] max-h-[90vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden relative">
        
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e]/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-[#FF3B30] animate-spin mb-6" />
             <h2 className="text-2xl font-bold mb-2">{t('export.rendering')}</h2>
             <p className="text-gray-400 mb-6">{t('export.renderingDesc')}</p>
             <div className="w-full max-w-md bg-gray-800 h-3 rounded-full overflow-hidden mb-2">
                <div 
                    className="h-full bg-[#FF3B30] transition-all duration-300 shadow-[0_0_10px_rgba(255,59,48,0.5)]" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
             <span className="text-xs font-mono text-gray-500 mb-6">{progress}% {t('common.done')}</span>
             <button 
                 onClick={onCancel}
                 className="px-6 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-bold transition-all border border-gray-700"
             >
                 {t('common.cancel')}
             </button>
          </div>
        )}

        {!isExporting && exportedFile && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                 <Icons.Check className="text-emerald-500" size={40} />
             </div>
             <h2 className="text-3xl font-bold mb-2">{t('export.success')}</h2>
             <p className="text-gray-400 mb-8">{t('export.successDesc')}</p>
             
             <div className="flex gap-4">
                 <button 
                     onClick={handleShare}
                     className="px-8 py-4 rounded-2xl bg-[#FF3B30] hover:bg-[#FF453A] text-white font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,48,0.3)] hover:scale-105 active:scale-95"
                 >
                     <Icons.Share2 size={20} />
                     {t('common.share')}
                 </button>
                 <button 
                     onClick={handleDownload}
                     className="px-8 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all flex items-center gap-2 border border-gray-700 hover:scale-105 active:scale-95"
                 >
                     <Icons.Download size={20} />
                     {t('common.download')}
                 </button>
             </div>
             
             <button 
                 onClick={onClose}
                 className="mt-8 px-6 py-2 rounded-full text-gray-500 hover:text-white text-sm font-bold transition-colors"
             >
                 {t('common.close')}
             </button>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* Left Panel: Settings */}
          <div className="w-1/2 p-8 border-r border-gray-700/50 flex flex-col">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">{t('export.makeMovie')}</h2>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="bg-gray-800 text-white rounded px-2.5 py-1 text-sm font-medium border border-gray-700 hover:border-gray-500 focus:border-[var(--accent-color)] focus:outline-none transition-colors w-full max-w-[200px]"
                  />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">{frameCount} {t('timeline.frames')}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">{(frameCount / fps).toFixed(1)}s</span>
              </div>

              {/* Preview Button */}
              <button
                onClick={handleGeneratePreview}
                disabled={isPreviewLoading}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border shadow-sm ${
                  showPreview
                    ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40 hover:bg-[#FF3B30]/30'
                    : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700 hover:border-gray-600'
                }`}
              >
                {isPreviewLoading ? (
                  <>
                    <Icons.Loader2 size={16} className="animate-spin text-[#FF3B30]" />
                    <span>{t('export.generatingPreview', 'Generating 1s Preview...')}</span>
                  </>
                ) : (
                  <>
                    <Icons.Eye size={16} className="text-[#FF3B30]" />
                    <span>{showPreview ? t('export.refreshPreview', 'Refresh 1s Preview') : t('export.previewLoop', 'Preview (1s Low-Res Loop)')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Live 1s Low-Res Loop Preview Player */}
            {showPreview && (
              <div className="mb-6 p-3.5 rounded-2xl bg-black/40 border border-gray-700/80 flex flex-col gap-2.5 relative overflow-hidden animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-gray-200 tracking-wide">
                      {t('export.previewTitle', '1s Preview Loop')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                      320px • {fps} FPS
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                    title={t('common.close', 'Close')}
                  >
                    <Icons.X size={15} />
                  </button>
                </div>

                {/* Viewport */}
                <div className="relative w-full aspect-video max-h-[160px] bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:10px_10px] bg-[#141414] rounded-xl overflow-hidden flex items-center justify-center border border-gray-800 shadow-inner group">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                      <Icons.Loader2 size={22} className="animate-spin text-[#FF3B30]" />
                      <span className="text-xs font-medium">{t('export.renderingPreview', 'Rendering low-res loop...')}</span>
                    </div>
                  ) : previewFrames.length > 0 ? (
                    <>
                      <img 
                        src={previewFrames[previewIndex]} 
                        alt="Preview Frame" 
                        className="max-w-full max-h-full object-contain select-none" 
                      />
                      
                      {/* Hover Overlay Controls */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button 
                          onClick={() => setPreviewIndex((prev) => (prev - 1 + previewFrames.length) % previewFrames.length)}
                          className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-all transform hover:scale-110 border border-gray-700"
                          title="Previous Frame"
                        >
                          <Icons.SkipBack size={14} />
                        </button>
                        <button 
                          onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                          className="p-2.5 rounded-full bg-[#FF3B30] hover:bg-[#FF453A] text-white shadow-lg transition-all transform hover:scale-110"
                          title={isPreviewPlaying ? "Pause" : "Play"}
                        >
                          {isPreviewPlaying ? <Icons.Pause size={16} /> : <Icons.Play size={16} className="ml-0.5" />}
                        </button>
                        <button 
                          onClick={() => setPreviewIndex((prev) => (prev + 1) % previewFrames.length)}
                          className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-all transform hover:scale-110 border border-gray-700"
                          title="Next Frame"
                        >
                          <Icons.SkipForward size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">{t('export.noPreview', 'No preview available')}</span>
                  )}
                </div>

                {/* Scrubber bar and frame info */}
                {!isPreviewLoading && previewFrames.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                      {previewFrames.map((_, idx) => (
                        <div 
                          key={idx}
                          className={`h-full flex-1 border-r border-gray-900/60 transition-colors ${
                            idx === previewIndex ? 'bg-[#FF3B30] shadow-[0_0_6px_rgba(255,59,48,0.8)]' : 'bg-gray-700/40'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-0.5">
                      <span>Frame {previewIndex + 1} / {previewFrames.length}</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Icons.Repeat size={10} />
                        1.0s Loop
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mb-8">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">{t('export.quality')}</label>
                <div className="grid grid-cols-1 gap-3">
                    {qualityOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setQuality(opt.id)}
                            className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                                quality === opt.id 
                                ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-white shadow-[0_0_20px_rgba(255,59,48,0.1)]' 
                                : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${quality === opt.id ? 'border-[var(--accent-color)]' : 'border-gray-600'}`}>
                                {quality === opt.id && <div className="w-2 h-2 rounded-full bg-[var(--accent-color)]" />}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">{opt.label}</div>
                                <div className="text-[10px] opacity-60 leading-tight mt-0.5">{opt.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 border-b border-gray-700/50 pb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${transparent ? 'bg-[#FF3B30]' : 'bg-gray-700'}`}>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${transparent ? 'translate-x-6' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white group-hover:text-gray-300 transition-colors">{t('export.transparent', 'Transparent Background')}</div>
                    <div className="text-[10px] text-gray-500">{t('export.transparentDesc', 'Omit background for formats that support alpha channel (PNG, WebM, GIF)')}</div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                  />
                </label>
            </div>

            <div className="mt-auto pt-4">
                <button 
                    onClick={onClose}
                    className="w-full py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition-all border border-gray-700 hover:border-gray-600 flex items-center justify-center gap-2"
                >
                    <Icons.ChevronLeft size={18} />
                    {t('common.done')}
                </button>
            </div>
          </div>

          {/* Right Panel: Formats */}
          <div className="w-1/2 bg-black/20 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('export.format')}</label>
                <button onClick={onClose} className="text-gray-500 hover:text-white p-3 -mr-2 rounded-full hover:bg-gray-800 transition-colors">
                    <Icons.X size={20} />
                </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-2 no-scrollbar flex-1">
                {onOpenSpritesheetExport && (
                  <button 
                      onClick={() => {
                        onClose();
                        onOpenSpritesheetExport();
                      }}
                      className="w-full group bg-gradient-to-r from-red-950/40 via-red-900/20 to-gray-800/40 hover:bg-gray-800 border border-red-500/30 hover:border-red-400 p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative overflow-hidden"
                  >
                      <div className="p-3 rounded-xl bg-gray-900 group-hover:scale-110 transition-transform text-red-400">
                          <Icons.Sparkles size={28} />
                      </div>
                      <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base group-hover:text-red-400 transition-colors">Spritesheet + XML</span>
                            <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-red-500/30">Adobe Animate / FNF</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">Pack animated symbols into texture atlas with Sparrow / Starling XML</div>
                      </div>
                      <Icons.ChevronLeft size={20} className="text-gray-600 rotate-180 group-hover:text-white transition-colors" />
                  </button>
                )}

                {formats.map((format) => (
                    <button 
                        key={format.id}
                        onClick={() => onExport(format.id, quality, transparent)}
                        className="w-full group bg-gray-800/40 hover:bg-gray-800 border border-gray-700/30 hover:border-[#FF3B30] p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                    >
                        <div className={`p-3 rounded-xl bg-gray-900 group-hover:scale-110 transition-transform ${format.color}`}>
                            <format.icon size={28} />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-white text-base group-hover:text-[#FF3B30] transition-colors">{format.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{format.desc}</div>
                        </div>
                        <Icons.ChevronLeft size={20} className="text-gray-600 rotate-180 group-hover:text-white transition-colors" />
                    </button>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700/30">
                <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                  💡 <span className="font-bold text-gray-400">Tip:</span> MP4 uses H.264 (AVC). If your media player struggles to open MP4 files, exporting as <span className="text-emerald-400 font-bold">WebM</span> is universally supported by modern browsers, players, and social platforms.
                </p>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                    {t('export.disclaimer')}
                    <br />
                    <span className="text-gray-500 italic">{t('help.about')}</span>
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
