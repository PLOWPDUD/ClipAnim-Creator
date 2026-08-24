import React, { useEffect, useState } from 'react';
import { Icons } from '../Icons';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'right' | 'top' | 'bottom' | 'left' | 'center';
  highlightPadding?: number;
}

export interface InteractiveTourProps {
  isActive: boolean;
  onComplete: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isActive,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      targetId: 'tour-toolbar',
      title: '1. Creative Drawing Tools',
      description: 'Select your drawing tools here! Choose from Pens, Textured Pencils, Markers, Airbrush, Pixel Art, Eraser, Fill Bucket, Shapes, and real-time Symmetry mirrors.',
      position: 'right',
      highlightPadding: 8
    },
    {
      targetId: 'tour-canvas',
      title: '2. The Animation Stage',
      description: 'Draw your characters and scenery here. Pan by dragging with right-click (or two-finger drag) and zoom with Ctrl + scroll wheel or pinch gestures.',
      position: 'center',
      highlightPadding: 4
    },
    {
      targetId: 'tour-timeline',
      title: '3. Frame-by-Frame Timeline',
      description: 'Add new frames with the "+" button, scrub back and forth across your sequence, adjust FPS playback speed, and press Spacebar to play your animation.',
      position: 'top',
      highlightPadding: 8
    },
    {
      targetId: 'tour-topbar-actions',
      title: '4. Audio Studio & Export',
      description: 'Add music and sound effects in the Audio Studio, record microphone voiceovers, configure Onion Skinning ghosting, and export your finished MP4 or GIF movie.',
      position: 'bottom',
      highlightPadding: 8
    },
    {
      targetId: 'tour-right-actions',
      title: '5. Layers & Backpack',
      description: 'Organize lineart, coloring, and background on separate layers with Blend Modes (Multiply, Screen). Save reusable characters and props to your Backpack.',
      position: 'left',
      highlightPadding: 8
    }
  ];

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const step = steps[currentStep];
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        // Fallback center if element not in view
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    const timer = setTimeout(updateRect, 100);

    return () => {
      window.removeEventListener('resize', updateRect);
      clearTimeout(timer);
    };
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Calculate tooltip placement
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.highlightPadding || 8;
    const margin = 16 + padding;

    if (step.position === 'right') {
      return {
        top: Math.max(16, Math.min(window.innerHeight - 280, targetRect.top)),
        left: Math.min(window.innerWidth - 380, targetRect.right + margin),
      };
    } else if (step.position === 'top') {
      return {
        bottom: window.innerHeight - targetRect.top + margin,
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left + (targetRect.width / 2) - 175)),
      };
    } else if (step.position === 'bottom') {
      return {
        top: targetRect.bottom + margin,
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
      };
    } else if (step.position === 'left') {
      return {
        top: Math.max(16, Math.min(window.innerHeight - 280, targetRect.top)),
        right: window.innerWidth - targetRect.left + margin,
      };
    }

    // Default center
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* Dark overlay backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300" />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300 border-2 border-[var(--accent-color)] shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_25px_var(--accent-color)] z-[101]"
          style={{
            top: targetRect.top - (step.highlightPadding || 8),
            left: targetRect.left - (step.highlightPadding || 8),
            width: targetRect.width + (step.highlightPadding || 8) * 2,
            height: targetRect.height + (step.highlightPadding || 8) * 2,
          }}
        >
          <span className="absolute -top-3 -right-3 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-[var(--accent-color)] text-white text-[11px] font-black items-center justify-center shadow-md">
              {currentStep + 1}
            </span>
          </span>
        </div>
      )}

      {/* Floating Spotlight Card */}
      <div
        className="absolute z-[102] w-[350px] max-w-[90vw] bg-[#1e1e1e] border border-gray-700 rounded-3xl p-5 shadow-2xl text-white transition-all duration-300 space-y-4"
        style={getTooltipStyle() as any}
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--accent-color)] text-white text-xs font-black flex items-center justify-center shadow">
              {currentStep + 1}
            </span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Tour Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={onComplete}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            title="Exit Tour"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            {step.title}
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step Dots & Navigation Buttons */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-5 bg-[var(--accent-color)]'
                    : idx < currentStep
                    ? 'w-1.5 bg-gray-500'
                    : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-colors flex items-center gap-1"
              >
                <Icons.ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-xs font-bold text-white transition-all flex items-center gap-1 shadow-md hover:scale-[1.02]"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next'}</span>
              {currentStep < steps.length - 1 && <Icons.ChevronRight size={14} />}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
