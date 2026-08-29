import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../Icons';

interface VideoImportModalProps {
  isOpen: boolean;
  videoFile: File | null;
  onClose: () => void;
  onImport: (frames: string[], importAudio: boolean, startTime: number, endTime: number) => void;
  targetFps: number;
}

interface FilterSettings {
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  grayscale: boolean;
  invert: boolean;
  sepia: boolean;
  thresholdEnabled: boolean;
  thresholdValue: number; // 0 to 255
  edgesEnabled: boolean;
  edgesThreshold: number; // 0 to 100
}

type PanelTab = 'trim' | 'filters' | 'format';

export const VideoImportModal: React.FC<VideoImportModalProps> = ({
  isOpen,
  videoFile,
  onClose,
  onImport,
  targetFps
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [importAudio, setImportAudio] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Custom states
  const [activePanel, setActivePanel] = useState<PanelTab>('trim');
  const [previewTab, setPreviewTab] = useState<'video' | 'filter'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [extractFps, setExtractFps] = useState(targetFps);
  const [scaleFactor, setScaleFactor] = useState<number>(0.5); // Default to 50% to save memory
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('jpeg'); // Default to jpeg for lightweight size
  const [jpegQuality, setJpegQuality] = useState<number>(0.85);
  
  // Advanced Filter Settings
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    grayscale: false,
    invert: false,
    sepia: false,
    thresholdEnabled: false,
    thresholdValue: 128,
    edgesEnabled: false,
    edgesThreshold: 20
  });

  // Timeline / Filmstrip
  const [filmstripThumbs, setFilmstripThumbs] = useState<string[]>([]);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load video file
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      setFilmstripThumbs([]);
      setIsPlaying(false);
      setCurrentTime(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  // Synchronize extracted FPS with target FPS initially
  useEffect(() => {
    setExtractFps(targetFps);
  }, [targetFps]);

  // Handle Play/Pause synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Handle time update for playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Keep playhead within selection loop or clamp
      if (video.currentTime >= endTime && isPlaying) {
        video.currentTime = startTime;
      }
    };

    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlayState);
    video.addEventListener('pause', handlePauseState);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlayState);
      video.removeEventListener('pause', handlePauseState);
    };
  }, [startTime, endTime, isPlaying]);

  // Core canvas filter function
  const applyFiltersToContext = (ctx: CanvasRenderingContext2D, width: number, height: number, settings: FilterSettings) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const b = settings.brightness; 
    const c = settings.contrast;   
    const s = settings.saturation; 
    
    const bFactor = b * 2.55;
    const cFactor = (c + 100) / 100;
    const sFactor = (s + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let bVal = data[i + 2];

      // Brightness
      if (b !== 0) {
        r += bFactor;
        g += bFactor;
        bVal += bFactor;
      }

      // Contrast
      if (c !== 0) {
        r = (r - 128) * cFactor + 128;
        g = (g - 128) * cFactor + 128;
        bVal = (bVal - 128) * cFactor + 128;
      }

      // Saturation
      if (s !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * bVal;
        r = lum + (r - lum) * sFactor;
        g = lum + (g - lum) * sFactor;
        bVal = lum + (bVal - lum) * sFactor;
      }

      // Grayscale
      if (settings.grayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * bVal;
        r = gray;
        g = gray;
        bVal = gray;
      }

      // Sepia
      if (settings.sepia) {
        const tr = 0.393 * r + 0.769 * g + 0.189 * bVal;
        const tg = 0.349 * r + 0.686 * g + 0.168 * bVal;
        const tb = 0.272 * r + 0.534 * g + 0.131 * bVal;
        r = tr;
        g = tg;
        bVal = tb;
      }

      // Invert
      if (settings.invert) {
        r = 255 - r;
        g = 255 - g;
        bVal = 255 - bVal;
      }

      // Binary Threshold
      if (settings.thresholdEnabled) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * bVal;
        const th = settings.thresholdValue;
        const val = gray >= th ? 255 : 0;
        r = val;
        g = val;
        bVal = val;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, bVal));
    }

    // Edge Detection (Sobel)
    if (settings.edgesEnabled) {
      const temp = new Uint8ClampedArray(data.length);
      temp.set(data);

      const threshold = settings.edgesThreshold;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          let p00 = (temp[((y-1)*width + (x-1))*4] + temp[((y-1)*width + (x-1))*4 + 1] + temp[((y-1)*width + (x-1))*4 + 2]) / 3;
          let p01 = (temp[((y-1)*width + x)*4] + temp[((y-1)*width + x)*4 + 1] + temp[((y-1)*width + x)*4 + 2]) / 3;
          let p02 = (temp[((y-1)*width + (x+1))*4] + temp[((y-1)*width + (x+1))*4 + 1] + temp[((y-1)*width + (x+1))*4 + 2]) / 3;
          
          let p10 = (temp[(y*width + (x-1))*4] + temp[(y*width + (x-1))*4 + 1] + temp[(y*width + (x-1))*4 + 2]) / 3;
          let p12 = (temp[(y*width + (x+1))*4] + temp[(y*width + (x+1))*4 + 1] + temp[(y*width + (x+1))*4 + 2]) / 3;
          
          let p20 = (temp[((y+1)*width + (x-1))*4] + temp[((y+1)*width + (x-1))*4 + 1] + temp[((y+1)*width + (x-1))*4 + 2]) / 3;
          let p21 = (temp[((y+1)*width + x)*4] + temp[((y+1)*width + x)*4 + 1] + temp[((y+1)*width + x)*4 + 2]) / 3;
          let p22 = (temp[((y+1)*width + (x+1))*4] + temp[((y+1)*width + (x+1))*4 + 1] + temp[((y+1)*width + (x+1))*4 + 2]) / 3;

          const gx = -p00 + p02 - 2*p10 + 2*p12 - p20 + p22;
          const gy = -p00 - 2*p01 - p02 + p20 + 2*p21 + p22;

          const gVal = Math.sqrt(gx*gx + gy*gy);
          const finalVal = gVal > threshold ? 0 : 255; // Outlines (0 black, 255 white)

          data[idx] = finalVal;
          data[idx+1] = finalVal;
          data[idx+2] = finalVal;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Live filter rendering loop
  useEffect(() => {
    let frameId: number;
    const video = videoRef.current;
    const previewCanvas = previewCanvasRef.current;

    const renderPreview = () => {
      if (video && previewCanvas && previewTab === 'filter') {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          const w = Math.round(video.videoWidth * scaleFactor);
          const h = Math.round(video.videoHeight * scaleFactor);
          if (w > 0 && h > 0) {
            previewCanvas.width = w;
            previewCanvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            applyFiltersToContext(ctx, w, h, filters);
          }
        }
      }
      frameId = requestAnimationFrame(renderPreview);
    };

    if (isOpen && videoUrl) {
      renderPreview();
    }

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [filters, previewTab, scaleFactor, isOpen, videoUrl]);

  // Trigger thumbnail generation when video metadata loads
  const handleLoadedMetadata = async () => {
    const video = videoRef.current;
    if (!video) return;

    const d = video.duration;
    setDuration(d);
    setStartTime(0);
    setEndTime(Math.min(d, 5)); // Limit default range to 5 seconds to prevent memory explosion

    // Generate thumbnails filmstrip
    setIsGeneratingThumbs(true);
    const thumbs: string[] = [];
    const thumbCount = 8;
    const interval = d / thumbCount;
    
    // Create heavy-lifting video clone specifically for background seeking
    const cloneVideo = document.createElement('video');
    cloneVideo.src = videoUrl || '';
    cloneVideo.muted = true;
    cloneVideo.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    await new Promise<void>((resolve) => {
      cloneVideo.onloadedmetadata = () => resolve();
    });

    canvas.width = 160; // Lightweight thumbnail resolution
    canvas.height = 90;

    for (let i = 0; i < thumbCount; i++) {
      const seekTime = Math.min(i * interval, d - 0.1);
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          if (ctx) {
            ctx.drawImage(cloneVideo, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
          }
          cloneVideo.removeEventListener('seeked', onSeeked);
          resolve();
        };
        cloneVideo.addEventListener('seeked', onSeeked);
        cloneVideo.currentTime = seekTime;
      });
    }

    setFilmstripThumbs(thumbs);
    setIsGeneratingThumbs(false);
  };

  // Scrubbing on Timeline click/drag
  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = pct * duration;
    
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSetStart = () => {
    setStartTime(currentTime);
    if (currentTime >= endTime) {
      setEndTime(Math.min(currentTime + 1, duration));
    }
  };

  const handleSetEnd = () => {
    if (currentTime > startTime) {
      setEndTime(currentTime);
    }
  };

  // Precise frame stepping
  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const current = videoRef.current.currentTime;
    const step = frames * (1 / extractFps);
    videoRef.current.currentTime = Math.max(0, Math.min(duration, current + step));
  };

  // Extraction process
  const handleExtract = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsExtracting(true);
    setProgress(0);
    setIsPlaying(false);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply exact custom dimensions scale factor
    const w = Math.round(video.videoWidth * scaleFactor);
    const h = Math.round(video.videoHeight * scaleFactor);
    canvas.width = w;
    canvas.height = h;

    const frames: string[] = [];
    const interval = 1 / extractFps;
    const totalFrames = Math.max(1, Math.floor((endTime - startTime) / interval));
    
    let seekTime = startTime;
    let frameCount = 0;

    const extractFrameAtTime = (time: number) => {
      return new Promise<void>((resolve) => {
        const onSeeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Apply active filter modifications to raw canvas contexts
          applyFiltersToContext(ctx, canvas.width, canvas.height, filters);
          
          // Convert to requested compression format
          const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = exportFormat === 'jpeg' ? jpegQuality : undefined;
          
          frames.push(canvas.toDataURL(mime, quality));
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
      });
    };

    // Store starting position to restore afterwards
    const originalCurrentTime = video.currentTime;

    try {
      while (seekTime <= endTime) {
        await extractFrameAtTime(seekTime);
        frameCount++;
        setProgress(Math.round((frameCount / totalFrames) * 100));
        seekTime += interval;
      }
    } catch (e) {
      console.error("Error extracting video frames", e);
    } finally {
      video.currentTime = originalCurrentTime;
      setIsExtracting(false);
      onImport(frames, importAudio, startTime, endTime);
    }
  };

  // Helper stats
  const totalProjectedFrames = Math.max(1, Math.floor((endTime - startTime) * extractFps));
  const estimatedMemoryMb = ((videoRef.current?.videoWidth || 640) * scaleFactor * (videoRef.current?.videoHeight || 360) * scaleFactor * 4 * totalProjectedFrames * (exportFormat === 'jpeg' ? 0.15 : 1) / (1024 * 1024)).toFixed(1);

  return (
    <AnimatePresence>
      {isOpen && videoUrl && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-sans"
        >
          <div className="absolute inset-0" onClick={onClose} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-4xl max-h-[94vh] bg-[#161616] rounded-3xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden text-gray-200"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-[#1d1d1d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
                  <Icons.FileVideo size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wide">Advanced Video Frame Importer</h2>
                  <p className="text-[11px] text-gray-400 font-medium">Extract, scale, and apply creative rotoscope outline guides.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isExtracting}
                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-full transition-all disabled:opacity-50"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Split Main Body Content */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 overflow-x-hidden no-scrollbar">
              
              {/* Left Column: Visual Live Player / Canvas Previews (Col: 7) */}
              <div className="md:col-span-7 p-4 bg-[#121212] flex flex-col justify-between border-r border-gray-800/60 space-y-4">
                
                {/* View Tabs */}
                <div className="flex bg-[#1d1d1d] p-1 rounded-xl border border-gray-800/80 gap-1 w-full shrink-0">
                  <button
                    onClick={() => setPreviewTab('video')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      previewTab === 'video' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icons.Video size={14} />
                    <span>Original Stream</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('filter')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      previewTab === 'filter' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icons.Brush size={14} />
                    <span>Rotoscope Canvas Preview</span>
                  </button>
                </div>

                {/* Main Visual Display Stage */}
                <div className="relative flex-1 bg-[#0b0b0b] rounded-2xl border border-gray-800/80 overflow-hidden flex items-center justify-center min-h-[220px] aspect-video">
                  
                  {/* Native Video Player */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className={`w-full h-full object-contain ${previewTab === 'filter' ? 'absolute opacity-0 pointer-events-none' : ''}`}
                    onLoadedMetadata={handleLoadedMetadata}
                  />

                  {/* Dynamic Custom Filter Preview Canvas */}
                  <canvas
                    ref={previewCanvasRef}
                    className={`max-w-full max-h-full object-contain ${previewTab === 'video' ? 'absolute opacity-0 pointer-events-none' : ''}`}
                  />

                  {/* Timeline Scrubbing / Buffering Indicators */}
                  {isGeneratingThumbs && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Icons.Loader2 className="animate-spin text-blue-400" size={24} />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">Generating Filmstrip...</span>
                    </div>
                  )}
                </div>

                {/* Professional Video Playback Deck */}
                <div className="flex items-center justify-between gap-4 bg-[#1c1c1c] p-3 rounded-2xl border border-gray-800/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => stepFrame(-1)}
                      className="p-2 rounded-xl bg-[#252525] hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-800 transition-colors"
                      title="Previous Frame"
                    >
                      <Icons.ChevronLeft size={16} />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                        isPlaying 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                          : 'bg-blue-500 border-blue-500 text-white shadow'
                      }`}
                      title={isPlaying ? "Pause Preview Loop" : "Play Loop"}
                    >
                      {isPlaying ? <Icons.Pause size={18} /> : <Icons.Play size={18} />}
                    </button>

                    <button
                      onClick={() => stepFrame(1)}
                      className="p-2 rounded-xl bg-[#252525] hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-800 transition-colors"
                      title="Next Frame"
                    >
                      <Icons.ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="flex gap-2 font-mono text-[11px] font-bold bg-[#111] px-3 py-1.5 rounded-xl border border-gray-800">
                    <span className="text-blue-400">{currentTime.toFixed(2)}s</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-400">{duration.toFixed(2)}s</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSetStart}
                      className="px-2.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#FF3B30]/10 text-gray-400 hover:text-[#FF3B30] border border-gray-800 text-[10px] font-bold transition-all uppercase tracking-wider"
                    >
                      Set Trim Start
                    </button>
                    <button
                      onClick={handleSetEnd}
                      className="px-2.5 py-1.5 rounded-lg bg-[#252525] hover:bg-green-500/10 text-gray-400 hover:text-green-400 border border-gray-800 text-[10px] font-bold transition-all uppercase tracking-wider"
                    >
                      Set Trim End
                    </button>
                  </div>
                </div>

                {/* Professional Filmstrip Timeline & Range Slider Wrapper */}
                <div className="space-y-2 shrink-0">
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                    <span className="text-red-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Start: {startTime.toFixed(2)}s
                    </span>
                    <span className="text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      End: {endTime.toFixed(2)}s
                    </span>
                  </div>

                  {/* Dual-range Filmstrip Timeline Grid */}
                  <div 
                    ref={timelineRef}
                    onClick={handleTimelineInteraction}
                    className="relative h-14 bg-black/50 rounded-2xl overflow-hidden border border-gray-800 cursor-pointer shadow-inner"
                  >
                    {/* Background Filmstrip Thumbs */}
                    <div className="absolute inset-0 grid grid-cols-8 gap-0.5 opacity-60">
                      {filmstripThumbs.map((thumb, idx) => (
                        <img key={idx} src={thumb} alt="" className="w-full h-full object-cover pointer-events-none select-none" />
                      ))}
                    </div>

                    {/* Darkened unselected bounds */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-black/80 border-r-2 border-red-500/80"
                      style={{ width: `${(startTime / duration) * 100}%` }}
                    />
                    <div 
                      className="absolute top-0 bottom-0 right-0 bg-black/80 border-l-2 border-green-500/80"
                      style={{ left: `${(endTime / duration) * 100}%` }}
                    />

                    {/* Active highlight window */}
                    <div 
                      className="absolute top-0 bottom-0 border-y border-blue-500/40 bg-blue-500/10 pointer-events-none"
                      style={{ 
                        left: `${(startTime / duration) * 100}%`,
                        right: `${100 - (endTime / duration) * 100}%`
                      }}
                    />

                    {/* Visual playhead line */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] z-10 pointer-events-none"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  {/* Dual sliders for fallbacks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider mb-1 font-mono">Trim Start (s)</span>
                      <input 
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={startTime}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value), endTime - 0.2);
                          setStartTime(val);
                          if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        className="w-full accent-red-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider mb-1 font-mono">Trim End (s)</span>
                      <input 
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={endTime}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value), startTime + 0.2);
                          setEndTime(val);
                          if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        className="w-full accent-green-500"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Custom Multi-Tab Control Dashboard (Col: 5) */}
              <div className="md:col-span-5 flex flex-col bg-[#161616] h-full overflow-hidden select-none">
                
                {/* Panel Navigation Tabs */}
                <div className="flex border-b border-gray-800/80 shrink-0 bg-[#1d1d1d] p-1">
                  <button
                    onClick={() => setActivePanel('trim')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-all ${
                      activePanel === 'trim' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icons.Sliders size={14} />
                    <span>Cut & Speed</span>
                  </button>

                  <button
                    onClick={() => setActivePanel('filters')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-all ${
                      activePanel === 'filters' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icons.SlidersHorizontal size={14} />
                    <span>Rotoscope</span>
                  </button>

                  <button
                    onClick={() => setActivePanel('format')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-all ${
                      activePanel === 'format' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icons.Maximize2 size={14} />
                    <span>Res & Format</span>
                  </button>
                </div>

                {/* Panel Scrolling Containers */}
                <div className="flex-1 p-5 space-y-5 overflow-y-auto no-scrollbar">
                  
                  {/* PANEL 1: CUT & SPEED */}
                  {activePanel === 'trim' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      
                      {/* Audio Track toggle */}
                      <div className="bg-[#1e1e1e] p-3.5 rounded-2xl border border-gray-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Import Soundtrack</span>
                          <span className="text-[10px] text-gray-400">Insert video audio layer onto audio timeline.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={importAudio} 
                            onChange={(e) => setImportAudio(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>

                      {/* Speed Extraction FPS */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Extraction Rate</span>
                            <span className="text-[10px] text-gray-400 font-mono">Frames per video second.</span>
                          </div>
                          <span className="text-xs font-mono font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                            {extractFps} FPS
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {Array.from(new Set([6, 12, 24, targetFps])).map((v) => (
                            <button
                              key={v}
                              onClick={() => setExtractFps(v)}
                              className={`py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                extractFps === v 
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                  : 'bg-[#151515] border-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {v === targetFps ? `Sync (${v})` : `${v} FPS`}
                            </button>
                          ))}
                        </div>

                        <input 
                          type="range"
                          min="1"
                          max="60"
                          value={extractFps}
                          onChange={(e) => setExtractFps(Number(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>

                      {/* projected timeline memory warnings */}
                      <div className="bg-blue-500/5 border border-blue-500/10 text-blue-400 p-4 rounded-2xl space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <Icons.Activity size={14} />
                          <span>Extraction Outlook</span>
                        </div>
                        <ul className="text-[10px] text-gray-400 space-y-1 pt-1.5 pl-1 list-disc list-inside">
                          <li>Total frames created: <b className="text-white font-mono">{totalProjectedFrames} frames</b></li>
                          <li>Est. heap memory footprint: <b className="text-white font-mono">~{estimatedMemoryMb} MB</b></li>
                          {totalProjectedFrames > 60 && (
                            <li className="text-amber-400">Warning: High frame count may degrade canvas performance.</li>
                          )}
                        </ul>
                      </div>

                    </div>
                  )}

                  {/* PANEL 2: ROTOSCOPE FILTERS */}
                  {activePanel === 'filters' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      
                      {/* Sobel Edge outline (Rotoscoping helper) */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              id="edges"
                              checked={filters.edgesEnabled}
                              onChange={(e) => setFilters({ ...filters, edgesEnabled: e.target.checked })}
                              className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0"
                            />
                            <label htmlFor="edges" className="text-xs font-bold text-gray-200 uppercase tracking-wider cursor-pointer">
                              Contour Outlines
                            </label>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">Edge Detect</span>
                        </div>

                        {filters.edgesEnabled && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Outline Sensitivity</span>
                              <span className="font-mono text-white">{filters.edgesThreshold}</span>
                            </div>
                            <input 
                              type="range"
                              min="5"
                              max="80"
                              value={filters.edgesThreshold}
                              onChange={(e) => setFilters({ ...filters, edgesThreshold: Number(e.target.value) })}
                              className="w-full accent-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Binary Threshold outline */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              id="threshold"
                              checked={filters.thresholdEnabled}
                              onChange={(e) => setFilters({ ...filters, thresholdEnabled: e.target.checked })}
                              className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0"
                            />
                            <label htmlFor="threshold" className="text-xs font-bold text-gray-200 uppercase tracking-wider cursor-pointer">
                              Binary B&W Threshold
                            </label>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">Stencil</span>
                        </div>

                        {filters.thresholdEnabled && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Cutoff Value</span>
                              <span className="font-mono text-white">{filters.thresholdValue}</span>
                            </div>
                            <input 
                              type="range"
                              min="10"
                              max="240"
                              value={filters.thresholdValue}
                              onChange={(e) => setFilters({ ...filters, thresholdValue: Number(e.target.value) })}
                              className="w-full accent-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Classic Tonal Toggles */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setFilters({ ...filters, grayscale: !filters.grayscale })}
                          className={`p-2 rounded-xl text-[10px] font-bold border transition-colors flex flex-col items-center gap-1.5 ${
                            filters.grayscale 
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold' 
                              : 'bg-[#1e1e1e] border-gray-800 text-gray-400 hover:bg-gray-800'
                          }`}
                        >
                          <Icons.Monitor size={14} />
                          <span>Grayscale</span>
                        </button>

                        <button
                          onClick={() => setFilters({ ...filters, sepia: !filters.sepia })}
                          className={`p-2 rounded-xl text-[10px] font-bold border transition-colors flex flex-col items-center gap-1.5 ${
                            filters.sepia 
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                              : 'bg-[#1e1e1e] border-gray-800 text-gray-400 hover:bg-gray-800'
                          }`}
                        >
                          <Icons.Sparkles size={14} />
                          <span>Sepia Retr</span>
                        </button>

                        <button
                          onClick={() => setFilters({ ...filters, invert: !filters.invert })}
                          className={`p-2 rounded-xl text-[10px] font-bold border transition-colors flex flex-col items-center gap-1.5 ${
                            filters.invert 
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                              : 'bg-[#1e1e1e] border-gray-800 text-gray-400 hover:bg-gray-800'
                          }`}
                        >
                          <Icons.Activity size={14} />
                          <span>Invert Map</span>
                        </button>
                      </div>

                      {/* Contrast & Brightness ranges */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-3.5">
                        <div>
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Brightness</span>
                            <span className="font-mono text-white">{filters.brightness > 0 ? `+${filters.brightness}` : filters.brightness}%</span>
                          </div>
                          <input 
                            type="range"
                            min="-100"
                            max="100"
                            value={filters.brightness}
                            onChange={(e) => setFilters({ ...filters, brightness: Number(e.target.value) })}
                            className="w-full accent-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Contrast</span>
                            <span className="font-mono text-white">{filters.contrast > 0 ? `+${filters.contrast}` : filters.contrast}%</span>
                          </div>
                          <input 
                            type="range"
                            min="-100"
                            max="100"
                            value={filters.contrast}
                            onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })}
                            className="w-full accent-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Saturation</span>
                            <span className="font-mono text-white">{filters.saturation > 0 ? `+${filters.saturation}` : filters.saturation}%</span>
                          </div>
                          <input 
                            type="range"
                            min="-100"
                            max="100"
                            value={filters.saturation}
                            onChange={(e) => setFilters({ ...filters, saturation: Number(e.target.value) })}
                            className="w-full accent-blue-500"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* PANEL 3: RESOLUTION & FORMAT */}
                  {activePanel === 'format' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      
                      {/* Resolution Scale Dropdown */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-3">
                        <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Canvas Scaling</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '25% (Fastest)', val: 0.25 },
                            { label: '50% (Recommended)', val: 0.5 },
                            { label: '75% (Sharp)', val: 0.75 },
                            { label: '100% (Native)', val: 1.0 },
                          ].map(scale => (
                            <button
                              key={scale.val}
                              onClick={() => setScaleFactor(scale.val)}
                              className={`p-2.5 rounded-xl text-left border transition-all text-[11px] font-bold ${
                                scaleFactor === scale.val 
                                  ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                                  : 'bg-[#151515] border-gray-800 text-gray-400 hover:bg-gray-800'
                              }`}
                            >
                              <span>{scale.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* File Compression Formats */}
                      <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800/80 space-y-4">
                        <span className="text-xs font-bold text-gray-200 block uppercase tracking-wider">Image Compressor</span>
                        
                        <div className="grid grid-cols-2 p-1 bg-[#121212] rounded-xl border border-gray-800 gap-1">
                          <button
                            onClick={() => setExportFormat('jpeg')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              exportFormat === 'jpeg' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Compressed JPEG
                          </button>
                          <button
                            onClick={() => setExportFormat('png')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              exportFormat === 'png' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Lossless PNG
                          </button>
                        </div>

                        {exportFormat === 'jpeg' && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>JPEG Quality</span>
                              <span className="font-mono text-white">{Math.round(jpegQuality * 100)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0.4"
                              max="1.0"
                              step="0.05"
                              value={jpegQuality}
                              onChange={(e) => setJpegQuality(Number(e.target.value))}
                              className="w-full accent-blue-500"
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>

                {/* Lower Action Drawer */}
                <div className="p-4 border-t border-gray-800/80 bg-[#1d1d1d] flex justify-end gap-3 shrink-0">
                  <button
                    onClick={onClose}
                    disabled={isExtracting}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting || endTime <= startTime}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Icons.Loader2 size={14} className="animate-spin" />
                        <span>Processing ({progress}%)</span>
                      </>
                    ) : (
                      <>
                        <Icons.Download size={14} />
                        <span>Extract & Load Timeline</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

            {/* Offscreen working canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
