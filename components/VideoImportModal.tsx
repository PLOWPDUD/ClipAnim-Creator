import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../Icons';

interface VideoImportModalProps {
  isOpen: boolean;
  videoFile: File | null;
  onClose: () => void;
  onImport: (frames: string[], importAudio: boolean, startTime: number, endTime: number) => void;
  targetFps: number;
}

export const VideoImportModal: React.FC<VideoImportModalProps> = ({
  isOpen,
  videoFile,
  onClose,
  onImport,
  targetFps
}) => {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [importAudio, setImportAudio] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setStartTime(0);
      setEndTime(Math.min(d, 5)); // Default to 5 seconds max to prevent huge imports initially
    }
  };

  const handleExtract = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsExtracting(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const frames: string[] = [];
    const interval = 1 / targetFps;
    const totalFrames = Math.floor((endTime - startTime) / interval);
    
    let currentTime = startTime;
    let frameCount = 0;

    const extractFrame = () => {
      return new Promise<void>((resolve) => {
        const onSeeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/png'));
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = currentTime;
      });
    };

    // Save original state
    const originalCurrentTime = video.currentTime;
    const originalPaused = video.paused;
    if (!originalPaused) video.pause();

    try {
      while (currentTime <= endTime) {
        await extractFrame();
        frameCount++;
        setProgress(Math.round((frameCount / totalFrames) * 100));
        currentTime += interval;
      }
    } catch (e) {
      console.error("Error extracting frames", e);
    } finally {
      // Restore state
      video.currentTime = originalCurrentTime;
      setIsExtracting(false);
      onImport(frames, importAudio, startTime, endTime);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && videoUrl && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl max-h-[90vh] bg-[#1e1e1e] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.FileVideo size={20} className="text-blue-500" />
                {t('videoImport.title')}
              </h2>
              <button
                onClick={onClose}
                disabled={isExtracting}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white disabled:opacity-50"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">
              <div className="bg-black rounded-xl overflow-hidden relative flex justify-center max-h-[35vh]">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain max-h-[35vh]"
                  onLoadedMetadata={handleLoadedMetadata}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-medium text-gray-400">
                  <span>{t('help.start') || 'Start'}: {startTime.toFixed(2)}s</span>
                  <span>{t('help.end') || 'End'}: {endTime.toFixed(2)}s</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('videoImport.startTime')}</label>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStartTime(val);
                        if (val >= endTime) setEndTime(Math.min(val + 1, duration));
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      disabled={isExtracting}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('videoImport.endTime')}</label>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEndTime(val);
                        if (val <= startTime) setStartTime(Math.max(val - 1, 0));
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      disabled={isExtracting}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer w-fit">
                  <input 
                    type="checkbox" 
                    checked={importAudio} 
                    onChange={(e) => setImportAudio(e.target.checked)}
                    disabled={isExtracting}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-500"
                  />
                  {t('videoImport.importAudio')}
                </label>

                <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl text-xs flex items-start gap-2">
                  <Icons.Help className="shrink-0 mt-0.5" size={14} />
                  <p dangerouslySetInnerHTML={{ __html: t('videoImport.extractWarning', { count: Math.floor((endTime - startTime) * targetFps), fps: targetFps }) }} />
                </div>
              </div>

              {isExtracting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{t('videoImport.extractingFrames')}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 bg-black/20 flex justify-end gap-3 shrink-0">
              <button
                onClick={onClose}
                disabled={isExtracting}
                className="px-4 py-2 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExtract}
                disabled={isExtracting || endTime <= startTime}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Icons.Loader2 size={16} className="animate-spin" />
                    {t('videoImport.extracting')}
                  </>
                ) : (
                  <>
                    <Icons.Download size={16} />
                    {t('videoImport.importFrames')}
                  </>
                )}
              </button>
            </div>
            
            {/* Hidden canvas for extraction */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
