import React, { useEffect, useState, useMemo } from 'react';
import { Icons } from '../Icons';

export type TourMode = 'all' | 'painting' | 'games';

export interface TourStep {
  id: string;
  targetId: string;
  badge: string;
  title: string;
  description: string;
  position: 'right' | 'top' | 'bottom' | 'left' | 'center';
  highlightPadding?: number;
  actionButton?: {
    label: string;
    icon?: any;
    action: () => void;
  };
  tips?: string;
}

export interface InteractiveTourProps {
  isActive: boolean;
  initialMode?: TourMode;
  onComplete: () => void;
  onOpenLayers?: () => void;
  onOpenSymbols?: () => void;
  onOpenScripts?: () => void;
  onOpenTestMovie?: () => void;
  onOpenExport?: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isActive,
  initialMode = 'all',
  onComplete,
  onOpenLayers,
  onOpenSymbols,
  onOpenScripts,
  onOpenTestMovie,
  onOpenExport,
}) => {
  const [mode, setMode] = useState<TourMode>(initialMode);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Sync mode when initialMode changes
  useEffect(() => {
    if (isActive) {
      setMode(initialMode);
      setCurrentStep(0);
    }
  }, [isActive, initialMode]);

  // Step definitions for each tour archetype
  const paintingSteps: TourStep[] = useMemo(() => [
    {
      id: 'paint-tools',
      targetId: 'tour-toolbar-tools',
      badge: 'Artistic Media',
      title: '1. Creative Drawing & Brush Engines',
      description: 'Choose from 10+ expressive brush engines: Classic Inking Pens, Textured Pencils, Calligraphy Nibs, Wet Markers, Airbrushes, Spray Cans, and Pixel Art grid pencils, plus vector Shapes, Fill Buckets, and Magic Wand.',
      position: 'right',
      highlightPadding: 8,
      tips: 'Use bracket keys [ and ] to quickly resize your brush on the fly.'
    },
    {
      id: 'paint-symmetry',
      targetId: 'tour-toolbar-symmetry',
      badge: 'Precision Inking',
      title: '2. Real-Time Symmetry & Line Smoothing',
      description: 'Activate real-time horizontal, vertical, quad, or radial symmetry mirrors. Enable Line Smoothing on the top bar to remove stylus jitter and draw crystal-smooth curves effortlessly.',
      position: 'right',
      highlightPadding: 8,
      tips: 'Perfect for drawing symmetrical character portraits, mecha designs, and mandala patterns.'
    },
    {
      id: 'paint-color',
      targetId: 'tour-toolbar-color',
      badge: 'Color Studio',
      title: '3. Color Studio & Custom Palettes',
      description: 'Pick harmonious colors using the HSV Color Wheel, numeric HEX/RGB sliders, or build your own persistent custom palette swatches to reuse across your entire painting.',
      position: 'right',
      highlightPadding: 8,
      tips: 'Click "Save Color" inside the color popup to build a custom project palette.'
    },
    {
      id: 'paint-canvas',
      targetId: 'tour-canvas',
      badge: 'Drawing Stage',
      title: '4. Hardware-Accelerated Canvas & Gestures',
      description: 'Draw freely on the viewport. Pan by dragging with right-click (or two-finger touch) and zoom smoothly with mouse wheel or pinch gestures. Toggle the pixel grid for pixel-perfect precision.',
      position: 'center',
      highlightPadding: 4,
      tips: 'Press Spacebar + Drag anytime to pan across large artwork.'
    },
    {
      id: 'paint-layers',
      targetId: 'tour-btn-layers',
      badge: 'Layer Studio',
      title: '5. Multi-Layer Studio & Photoshop Blend Modes',
      description: 'Organize your artwork on separate layers: Lineart, Flat Colors, Shading, and Backgrounds. Use blend modes like Multiply (for shadows), Screen (for glows), Add, and Overlay with individual opacity controls.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenLayers ? {
        label: 'Open Layers Panel',
        icon: Icons.Layers,
        action: onOpenLayers
      } : undefined,
      tips: 'Keeping color on a layer below lineart lets you color quickly without ruining your lines.'
    },
    {
      id: 'paint-timeline',
      targetId: 'tour-timeline',
      badge: 'Timeline & Onion Skin',
      title: '6. Frame-by-Frame Timeline & Onion Skinning',
      description: 'Add new animation frames with the "+" button, set playback FPS speed (12 FPS classic, 24 FPS cinema), and turn on Onion Skinning to view faint ghost outlines of previous and upcoming frames for easy tracing.',
      position: 'top',
      highlightPadding: 8,
      tips: 'Press Spacebar to play/pause your animated sequence.'
    },
    {
      id: 'paint-export',
      targetId: 'tour-btn-export',
      badge: 'Render & Export',
      title: '7. Reusable Backpack & High-Res Export',
      description: 'Save character stamps and props to your Backpack for instant reuse. When finished, export your artwork as high-definition MP4 video, looping animated GIF, WebM, or PNG image sequences.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenExport ? {
        label: 'Open Export Menu',
        icon: Icons.Download,
        action: onOpenExport
      } : undefined,
      tips: 'All encoding is processed 100% locally on your device for complete privacy.'
    }
  ], [onOpenLayers, onOpenExport]);

  const gamesSteps: TourStep[] = useMemo(() => [
    {
      id: 'game-symbols',
      targetId: 'tour-btn-symbols',
      badge: 'Symbol Architecture',
      title: '1. Graphic & MovieClip Symbols',
      description: 'Turn your drawings into reusable game components. Use Graphic Symbols for static scenery, props, and UI buttons, and MovieClip Symbols with nested multi-frame timelines for animated characters (walk, run, jump, idle).',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenSymbols ? {
        label: 'Open Symbol Library',
        icon: Icons.Library,
        action: onOpenSymbols
      } : undefined,
      tips: 'Symbols are saved in your library and can be placed on stage multiple times.'
    },
    {
      id: 'game-actors',
      targetId: 'tour-canvas',
      badge: 'Stage Actors & Frames',
      title: '2. Stage Actors & Target Frame Binding',
      description: 'Drag symbols onto the canvas to place live Actor instances. Assign targetFrame parameters to bind buttons and actors to specific levels, quiz questions, or dialogue screens (e.g. Frame 1 for Intro, Frame 2 for Quiz, Frame 3 for Victory).',
      position: 'center',
      highlightPadding: 4,
      tips: 'Actors on Frame 1 will stay hidden on other frames unless programmed otherwise.'
    },
    {
      id: 'game-scripting',
      targetId: 'tour-toolbar-script',
      badge: 'ActionScript Engine',
      title: '3. Event Logic & ActionScript Engine',
      description: 'Write custom JavaScript/ActionScript behaviors for each actor. Hook into this.onClick for clickable buttons, this.onUpdate for physics, keys["ArrowRight"] for player controls, and hitTest() for collisions.',
      position: 'right',
      highlightPadding: 8,
      actionButton: onOpenScripts ? {
        label: 'Open Script Editor',
        icon: Icons.Code,
        action: onOpenScripts
      } : undefined,
      tips: 'Use gotoAndStop(frameNumber) inside button clicks to advance through game levels.'
    },
    {
      id: 'game-timeline',
      targetId: 'tour-timeline',
      badge: 'Timeline State Routing',
      title: '4. Non-Linear Timeline & State Branching',
      description: 'Structure multi-screen games using timeline branching. Build Question/Answer screens, branching visual novels, and game-over loops. Non-looping projects pause playback and wait for player button clicks.',
      position: 'top',
      highlightPadding: 8,
      tips: 'You can store global variables like player score, lives, and high scores across frames.'
    },
    {
      id: 'game-test-movie',
      targetId: 'tour-btn-test-movie',
      badge: 'Live Game Simulator',
      title: '5. Live Test Movie & Touch Gamepad',
      description: 'Click the Gamepad icon in the top bar to test-play your game immediately! Experience live keyboard/mouse input, responsive touch D-pad, HUD score/lives display, physics particles, and sound effects.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenTestMovie ? {
        label: 'Playtest Game Now',
        icon: Icons.Gamepad2,
        action: onOpenTestMovie
      } : undefined,
      tips: 'Press Escape anytime during playtesting to return to the editor.'
    },
    {
      id: 'game-export-html',
      targetId: 'tour-btn-export',
      badge: 'HTML5 & Spritesheet Export',
      title: '6. Standalone HTML5 Game & Spritesheet Export',
      description: 'Export a 100% self-contained, offline-playable .HTML game file ready to publish on itch.io or share on Discord! You can also generate Adobe Animate Starling XML texture atlases for Unity, Godot, and Phaser.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenExport ? {
        label: 'Open Export Dialog',
        icon: Icons.Download,
        action: onOpenExport
      } : undefined,
      tips: 'The exported .html file runs in any web browser with zero external dependencies.'
    }
  ], [onOpenSymbols, onOpenScripts, onOpenTestMovie, onOpenExport]);

  const allSteps: TourStep[] = useMemo(() => [
    {
      id: 'all-tools',
      targetId: 'tour-toolbar',
      badge: 'Drawing Tools',
      title: '1. Complete Creative Suite',
      description: 'Explore the full drawing toolkit: Natural Brushes, Inking Pens, Airbrush, Pixel Art, Shapes, Fill Bucket, and Symmetry mirroring.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'all-canvas',
      targetId: 'tour-canvas',
      badge: 'Animation Stage',
      title: '2. The Animation Stage',
      description: 'Create your artwork, position characters, and arrange stage actors with smooth multi-touch pan, zoom, and transform tools.',
      position: 'center',
      highlightPadding: 4,
    },
    {
      id: 'all-layers',
      targetId: 'tour-btn-layers',
      badge: 'Layer Studio',
      title: '3. Layers & Photoshop Blend Modes',
      description: 'Organize drawings on multiple layers with Multiply, Screen, Add, and Overlay blend modes, lock protection, and opacity sliders.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenLayers ? {
        label: 'Open Layers',
        icon: Icons.Layers,
        action: onOpenLayers
      } : undefined,
    },
    {
      id: 'all-symbols',
      targetId: 'tour-btn-symbols',
      badge: 'Game Assets',
      title: '4. Symbol Library & MovieClips',
      description: 'Convert drawings into reusable Symbols with nested timelines for animated characters, interactive buttons, and game props.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenSymbols ? {
        label: 'Open Symbols',
        icon: Icons.Library,
        action: onOpenSymbols
      } : undefined,
    },
    {
      id: 'all-timeline',
      targetId: 'tour-timeline',
      badge: 'Timeline & Audio',
      title: '5. Frame-by-Frame Timeline',
      description: 'Scrub animation keyframes, configure Onion Skin ghosting guides, adjust FPS speed, and record microphone audio voiceovers.',
      position: 'top',
      highlightPadding: 8,
    },
    {
      id: 'all-test-movie',
      targetId: 'tour-btn-test-movie',
      badge: 'Interactive Testing',
      title: '6. Test Interactive Movie',
      description: 'Playtest your interactive games and animations with live keyboard controls, touch virtual gamepad, and real-time script physics.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenTestMovie ? {
        label: 'Test Game',
        icon: Icons.Gamepad2,
        action: onOpenTestMovie
      } : undefined,
    },
    {
      id: 'all-export',
      targetId: 'tour-btn-export',
      badge: 'Export Studio',
      title: '7. Multi-Format Movie & Game Export',
      description: 'Export finished projects as MP4 videos, animated GIFs, standalone offline .HTML games, or Starling XML spritesheets for game engines.',
      position: 'bottom',
      highlightPadding: 8,
      actionButton: onOpenExport ? {
        label: 'Export Project',
        icon: Icons.Download,
        action: onOpenExport
      } : undefined,
    }
  ], [onOpenLayers, onOpenSymbols, onOpenTestMovie, onOpenExport]);

  const steps = useMemo(() => {
    switch (mode) {
      case 'painting':
        return paintingSteps;
      case 'games':
        return gamesSteps;
      case 'all':
      default:
        return allSteps;
    }
  }, [mode, paintingSteps, gamesSteps, allSteps]);

  // Update spotlight target rectangle
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
        // Fallback target or center
        const fallbackEl = document.getElementById('tour-toolbar') || document.getElementById('tour-canvas');
        if (fallbackEl) {
          setTargetRect(fallbackEl.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    const timer = setTimeout(updateRect, 100);

    return () => {
      window.removeEventListener('resize', updateRect);
      clearTimeout(timer);
    };
  }, [isActive, currentStep, steps, mode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onComplete();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, steps.length, onComplete]);

  if (!isActive) return null;

  const step = steps[currentStep] || steps[0];

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

  const handleSwitchMode = (newMode: TourMode) => {
    setMode(newMode);
    setCurrentStep(0);
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
        top: Math.max(20, Math.min(window.innerHeight - 340, targetRect.top)),
        left: Math.min(window.innerWidth - 420, targetRect.right + margin),
      };
    } else if (step.position === 'top') {
      return {
        bottom: window.innerHeight - targetRect.top + margin,
        left: Math.max(20, Math.min(window.innerWidth - 420, targetRect.left + (targetRect.width / 2) - 190)),
      };
    } else if (step.position === 'bottom') {
      return {
        top: targetRect.bottom + margin,
        left: Math.max(20, Math.min(window.innerWidth - 420, targetRect.left + (targetRect.width / 2) - 190)),
      };
    } else if (step.position === 'left') {
      return {
        top: Math.max(20, Math.min(window.innerHeight - 340, targetRect.top)),
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

  const getModeColor = () => {
    if (mode === 'painting') return 'from-pink-500 to-rose-500';
    if (mode === 'games') return 'from-emerald-500 to-cyan-500';
    return 'from-amber-500 to-orange-500';
  };

  const getBadgeColor = () => {
    if (mode === 'painting') return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    if (mode === 'games') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
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
          <span className="absolute -top-3 -right-3 flex h-7 w-7">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-7 w-7 bg-gradient-to-tr from-[var(--accent-color)] to-amber-400 text-white text-[12px] font-black items-center justify-center shadow-lg border border-white/20">
              {currentStep + 1}
            </span>
          </span>
        </div>
      )}

      {/* Floating Spotlight Card */}
      <div
        className="absolute z-[102] w-[380px] max-w-[92vw] bg-[#1a1a1a] border border-gray-700/80 rounded-3xl p-5 shadow-2xl text-white transition-all duration-300 space-y-4 backdrop-blur-xl"
        style={getTooltipStyle() as any}
      >
        {/* Tour Type Selector & Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${getModeColor()} text-white text-xs font-black flex items-center justify-center shadow`}>
                {currentStep + 1}
              </span>
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            
            <button
              onClick={onComplete}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              title="Exit Tour (Esc)"
            >
              <Icons.X size={16} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-gray-900/90 p-1 rounded-xl border border-gray-800 text-[11px] font-bold">
            <button
              onClick={() => handleSwitchMode('painting')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'painting'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Brush size={12} />
              <span>Painting</span>
            </button>
            <button
              onClick={() => handleSwitchMode('games')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'games'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Gamepad2 size={12} />
              <span>New Games</span>
            </button>
            <button
              onClick={() => handleSwitchMode('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'all'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icons.Sparkles size={12} />
              <span>All</span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getBadgeColor()}`}>
              {step.badge}
            </span>
          </div>
          <h4 className="text-base font-bold text-white leading-tight">
            {step.title}
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            {step.description}
          </p>

          {/* Contextual Tip */}
          {step.tips && (
            <div className="p-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-[11px] text-gray-400 flex items-start gap-2">
              <Icons.Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="text-gray-300 font-semibold">Pro Tip: </span>
                {step.tips}
              </div>
            </div>
          )}

          {/* Quick Action Button (if applicable) */}
          {step.actionButton && (
            <button
              onClick={step.actionButton.action}
              className="w-full py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all border border-gray-700 flex items-center justify-center gap-2 shadow-sm hover:scale-[1.01]"
            >
              {step.actionButton.icon && <step.actionButton.icon size={14} className="text-[var(--accent-color)]" />}
              <span>{step.actionButton.label}</span>
            </button>
          )}
        </div>

        {/* Step Dots & Navigation Buttons */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-5 bg-[var(--accent-color)]'
                    : idx < currentStep
                    ? 'w-1.5 bg-gray-500 hover:bg-gray-400'
                    : 'w-1.5 bg-gray-700 hover:bg-gray-600'
                }`}
                title={`Go to Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-colors flex items-center gap-1 border border-gray-700"
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
