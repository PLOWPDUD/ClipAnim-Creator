import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';

interface LoadingScreenProps {
  isReady?: boolean;
  onFinished?: () => void;
  minDurationMs?: number;
  mode?: 'startup' | 'project';
  projectName?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isReady = true,
  onFinished,
  minDurationMs = 450,
  mode = 'startup',
  projectName,
}) => {
  const [progress, setProgress] = useState(0);
  const isProjectMode = mode === 'project';
  
  const initialStatus = isProjectMode
    ? (projectName ? `Opening "${projectName}"...` : 'Opening project...')
    : 'Initializing ClipAnim Studio...';

  const [statusText, setStatusText] = useState(initialStatus);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let currentProgress = 0;
    const startTime = performance.now();
    let animFrame: number;
    let isDone = false;

    const tick = (now: number) => {
      if (isDone) return;
      const elapsed = now - startTime;
      const timeRatio = Math.min(1, elapsed / minDurationMs);

      // Fast progress curve
      let target = Math.floor(timeRatio * 90);
      if (isReady && (timeRatio >= 0.75 || elapsed >= 300)) {
        target = 100;
      }

      if (target > currentProgress) {
        // Step quickly towards target
        const step = Math.max(3, Math.ceil((target - currentProgress) * 0.35));
        currentProgress = Math.min(100, currentProgress + step);
        setProgress(currentProgress);

        // Update informative status message based on mode
        if (isProjectMode) {
          if (currentProgress < 30) {
            setStatusText(projectName ? `Opening "${projectName}"...` : 'Reading project data...');
          } else if (currentProgress < 65) {
            setStatusText('Decoding layers, frames & assets...');
          } else if (currentProgress < 95) {
            setStatusText('Configuring timeline & canvas...');
          } else {
            setStatusText('Project Ready!');
          }
        } else {
          if (currentProgress < 30) {
            setStatusText('Initializing ClipAnim Studio...');
          } else if (currentProgress < 65) {
            setStatusText('Loading canvas engine & shaders...');
          } else if (currentProgress < 95) {
            setStatusText('Preparing workspace...');
          } else {
            setStatusText('Studio Ready!');
          }
        }
      }

      // Completion check
      if (currentProgress >= 100 && isReady && elapsed >= Math.min(minDurationMs, 400)) {
        isDone = true;
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsVisible(false);
            onFinished?.();
          }, 200); // Quick, clean fade-out
        }, 50); // Minimal hold at 100%
        return;
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => {
      isDone = true;
      cancelAnimationFrame(animFrame);
    };
  }, [isReady, minDurationMs, onFinished, isProjectMode, projectName]);

  const handleSkip = () => {
    if (progress < 100) {
      setProgress(100);
      setStatusText(isProjectMode ? 'Project Ready!' : 'Studio Ready!');
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onFinished?.();
        }, 150);
      }, 40);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      id="clipanim-loading-screen"
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0c0d10] select-none transition-all duration-200 ease-out cursor-default ${
        isFadingOut ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-live="polite"
      aria-label={isProjectMode ? `Opening ${projectName || 'project'}` : 'Loading ClipAnim Creator'}
    >
      {/* Background radial ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF3B30]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[90px] pointer-events-none" />
        {/* Subtle dot matrix grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Logo Badge */}
        <div className="relative mb-5 group">
          {/* Subtle logo pulse glow */}
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#FF3B30] to-orange-500 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
          
          <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-3xl bg-gradient-to-tr from-[#FF3B30] via-[#ff5e54] to-orange-500 p-0.5 shadow-2xl flex items-center justify-center border border-white/20">
            <div className="w-full h-full rounded-[22px] bg-black/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Icons.Clapperboard className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
            </div>
          </div>

          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-[#FF3B30] flex items-center justify-center shadow-lg border border-red-200">
            <Icons.Play size={12} className="fill-current ml-0.5" />
          </div>
        </div>

        {/* Brand Name & Mode Specific Heading */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
          <span>ClipAnim</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Creator</span>
        </h1>

        {isProjectMode && projectName ? (
          <div className="mb-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 max-w-full">
            <Icons.Folder size={13} className="text-orange-400 shrink-0" />
            <span className="text-xs font-semibold text-gray-200 truncate">
              {projectName}
            </span>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 font-medium mb-6 tracking-wide">
            {isProjectMode ? 'Loading animation workspace...' : '2D Animation & Interactive Studio'}
          </p>
        )}

        {/* Loading Bar Section */}
        <div className="w-full max-w-[280px] sm:max-w-xs flex flex-col gap-2.5">
          {/* Progress Track */}
          <div 
            className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-[2px] backdrop-blur-md border border-white/10 relative shadow-inner"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] via-orange-500 to-[#FF3B30] transition-all duration-200 ease-out relative shadow-[0_0_12px_rgba(255,59,48,0.8)]"
              style={{ width: `${progress}%` }}
            >
              {/* Highlight tip shine */}
              <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/70 rounded-full blur-[1px]" />
            </div>
          </div>

          {/* Status Label & Percentage Counter */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="text-gray-400 font-medium truncate max-w-[210px] text-left">
              {statusText}
            </span>
            <span className="font-mono font-bold text-white pl-2">
              {progress}%
            </span>
          </div>
        </div>

        {/* Bottom studio detail badge */}
        <div className="mt-8 text-[10px] text-gray-400 font-mono tracking-wider uppercase">
          {isProjectMode ? 'Opening Studio Workspace' : 'Studio Engine v1.3.4 • Ready to Create'}
        </div>
      </div>
    </div>
  );
};
