import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour: () => void;
}

interface Lesson {
  id: string;
  title: string;
  category: 'basics' | 'drawing' | 'animation' | 'audio' | 'advanced';
  icon: any;
  duration: string;
  summary: string;
  keyTakeaways: string[];
  steps: {
    title: string;
    description: string;
    tip?: string;
    demoType?: 'bouncingBall' | 'onionSkin' | 'layers' | 'timeline' | 'audio';
  }[];
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onStartInteractiveTour,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'lessons' | 'shortcuts' | 'faq'>('lessons');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('quickstart');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive demo states
  const [demoFrame, setDemoFrame] = useState<number>(2);
  const [demoOnionSkin, setDemoOnionSkin] = useState<boolean>(true);
  const [demoPlaying, setDemoPlaying] = useState<boolean>(false);
  const [demoLayer, setDemoLayer] = useState<'all' | 'lineart' | 'color' | 'background'>('all');

  useEffect(() => {
    if (!demoPlaying) return;
    const interval = setInterval(() => {
      setDemoFrame(prev => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [demoPlaying]);

  if (!isOpen) return null;

  const lessons: Lesson[] = [
    {
      id: 'quickstart',
      category: 'basics',
      title: 'Your First Animation in 3 Minutes',
      duration: '3 min',
      icon: Icons.Sparkles,
      summary: 'Learn the core workflow: draw, add frames, check onion skins, and preview your animation.',
      keyTakeaways: [
        'Animations are sequences of frames played at speed (FPS).',
        'Use the + button on the timeline to create new frames.',
        'Toggle Onion Skinning (ghost icon) to see the previous frame as a drawing guide.',
      ],
      steps: [
        {
          title: '1. Create a Keyframe & Draw',
          description: 'Select the Brush (B) from the left toolbar, pick a color from the color picker, and draw your first subject on Canvas frame 1.',
          tip: 'Tip: Keep your initial drawings simple to understand the movement before adding complex detail.',
          demoType: 'bouncingBall'
        },
        {
          title: '2. Add Next Frame with Onion Skinning',
          description: 'Click the "+" icon on the bottom timeline. Turn on Onion Skinning (or press O) to see a faint red/green ghost of your previous drawing.',
          tip: 'Onion skinning removes guesswork and makes frame-by-frame tracing seamless.',
          demoType: 'onionSkin'
        },
        {
          title: '3. Draw the Progressive Movement',
          description: 'Draw the subject slightly shifted or deformed (e.g. a falling ball getting squashed on contact with the floor).',
          tip: 'Use Squash & Stretch to convey weight, speed, and elasticity.',
          demoType: 'bouncingBall'
        },
        {
          title: '4. Preview and Set Frame Rate (FPS)',
          description: 'Hit the Play button (or press Spacebar) to watch your creation loop! Adjust the FPS slider (12 FPS is classic animation standard, 24 FPS is cinema smooth).',
          tip: 'You can change project frame rate anytime without losing drawing data.',
          demoType: 'timeline'
        }
      ]
    },
    {
      id: 'brushes',
      category: 'drawing',
      title: 'Mastering Brushes, Shapes & Symmetry',
      duration: '4 min',
      icon: Icons.Brush,
      summary: 'Explore 10+ artistic brush engines, line stabilization, shape generators, and real-time symmetry mirrors.',
      keyTakeaways: [
        'Customize brush size with sliders or bracket keys [ and ].',
        'Enable Line Smoothing to remove stylus jitter and draw crisp curves.',
        'Symmetry modes allow instant drawing of symmetrical characters, faces, and mandala patterns.',
      ],
      steps: [
        {
          title: '1. Choosing the Right Brush Engine',
          description: 'ClipAnim offers specialized brushes: Classic Pen, Textured Pencil, Marker, Airbrush, Pixel Art Grid, Calligraphy Nib, and Spray Can. Click the brush menu to switch.',
          tip: 'For pixel art, select the Pixel Brush and pick a low resolution canvas (e.g. 64x64 or 128x128).'
        },
        {
          title: '2. Line Smoothing & Jitter Control',
          description: 'Use the Smoothing slider on the top brush options bar. Low smoothing gives raw responsive sketching; high smoothing calculates smooth bezier curves.',
          tip: 'High smoothing is perfect for clean inking and final lineart.'
        },
        {
          title: '3. Real-Time Symmetry Tool',
          description: 'Activate Symmetry in Vertical, Horizontal, Quad, or Radial modes. Every stroke you draw mirrors automatically across axes in real-time.',
          tip: 'Great for drawing vehicles, character portraits, wings, and kaleidoscopic visual effects.'
        },
        {
          title: '4. Fill Bucket with Tolerance & Opacity',
          description: 'Fill closed shapes with one click (G). Adjust Tolerance to fill anti-aliased sketches without leaving ugly white fringe pixels.',
          tip: 'Hold the eyedropper tool (I) on any canvas pixel to sample that exact color.'
        }
      ]
    },
    {
      id: 'onionskin',
      category: 'animation',
      title: 'Onion Skinning & 12 Principles of Animation',
      duration: '5 min',
      icon: Icons.Ghost,
      summary: 'Harness multiple before/after ghosting colors and apply traditional animation principles like Squash & Stretch and Anticipation.',
      keyTakeaways: [
        'Red ghosting shows previous frames; Green ghosting shows upcoming frames.',
        'Adjust the number of visible ghost frames in Project Settings.',
        'Squash and stretch conveys weight, mass, and flexibility.',
      ],
      steps: [
        {
          title: '1. Reading the Color Coded Ghosts',
          description: 'When Onion Skin is enabled, past frames are tinted in red and future frames are tinted in green with customizable opacities.',
          tip: 'Open Project Settings to adjust ghost frame count (up to 5 frames before and after).',
          demoType: 'onionSkin'
        },
        {
          title: '2. Squash and Stretch',
          description: 'When an object speeds up or hits an obstacle, deform its shape while keeping the overall volume constant. Elongate during rapid movement and compress on impact.',
          tip: 'An elongated shape feels fast, while a squashed shape conveys high impact.',
          demoType: 'bouncingBall'
        },
        {
          title: '3. Anticipation & Follow-Through',
          description: 'Before a character jumps or punches, draw 1-2 frames of winding backward (anticipation). After the peak action, add decaying overshoot frames (follow-through).',
          tip: 'Anticipation lets the viewer\'s eyes prepare for sudden rapid motion.'
        },
        {
          title: '4. In-Betweening (Tweening vs Manual)',
          description: 'Draw your main Keyframes first (start pose, contact, apex pose), then fill in Breakdown and In-between frames for consistent pacing.',
          tip: 'You can also use the Timeline Wand tool to automatically generate mathematical motion tweens!'
        }
      ]
    },
    {
      id: 'layers',
      category: 'drawing',
      title: 'Multi-Layer Stacking & Blend Modes',
      duration: '4 min',
      icon: Icons.Layers,
      summary: 'Keep backgrounds, characters, ink lineart, and shadow highlights organized on independent canvas layers.',
      keyTakeaways: [
        'Layers keep your sketch, lineart, colors, and background scenery separated.',
        'Use the Multiply blend mode for natural shading and shadows.',
        'Use Screen and Overlay blend modes for glowing magical effects and lighting.',
      ],
      steps: [
        {
          title: '1. Structuring Your Layer Stack',
          description: 'Open the Layer Panel on the right. Create separate layers for: Background (bottom), Flat Colors (middle), Ink Lineart (top), and Highlights/FX (topmost).',
          tip: 'Lock your Background layer so you never accidentally erase your scenery while animating characters.',
          demoType: 'layers'
        },
        {
          title: '2. Blend Modes for Lighting & Shading',
          description: 'Change layer blend modes in the Layer Settings dropdown. Multiply blends shadows into underlying colors seamlessly; Screen/Overlay creates radiant highlights.',
          tip: 'Adjust layer opacity slider to make subtle transparent shadows or translucent water/glass.'
        },
        {
          title: '3. Layer Visibility & Duplicate',
          description: 'Hide or isolate individual layers while sketching. Duplicate any layer to experiment with alternate color palettes or props without losing originals.',
          tip: 'Reorder layers anytime by dragging their grip handles up or down in the stack.'
        }
      ]
    },
    {
      id: 'selection-backpack',
      category: 'advanced',
      title: 'Selection Tools, Transforms & The Backpack',
      duration: '4 min',
      icon: Icons.Briefcase,
      summary: 'Cut, copy, rotate, scale, and save reusable animated rigs and props into your global Backpack.',
      keyTakeaways: [
        'Use Box Select, Freeform Lasso, or Magic Wand to isolate artwork.',
        'Transform bounding box allows free rotation, non-uniform scaling, and flipping.',
        'Save reusable character drawings in the Backpack to stamp across any project.',
      ],
      steps: [
        {
          title: '1. Selecting Artwork (Lasso & Magic Wand)',
          description: 'Use the Rectangular Marquee (V) or Lasso (L) to circle parts of your drawing. Use the Magic Wand (W) in the toolbar to select contiguous color areas.',
          tip: 'Hold Shift to add to selection, or press Ctrl+C / Ctrl+V to copy and paste artwork instantly.'
        },
        {
          title: '2. Transforming & Stamping',
          description: 'Drag the handles of your selection to scale or rotate. Use the top selection action bar to Flip Horizontally/Vertically or stamp multiple copies.',
          tip: 'Click Commit (or Enter) to bake your transformed artwork into the active layer.'
        },
        {
          title: '3. Storing Assets in the Backpack',
          description: 'Select any drawing and click "Add to Backpack". Open the Backpack modal anytime to stamp saved character rigs, expressions, backgrounds, and props into any frame!',
          tip: 'Backpack items persist across your entire browser workspace.'
        }
      ]
    },
    {
      id: 'audio-studio',
      category: 'audio',
      title: 'Audio Studio, Voiceover & Foley Sound FX',
      duration: '4 min',
      icon: Icons.Music,
      summary: 'Add multi-track sound effects, record custom voiceovers directly through your microphone, and sync with timeline waveforms.',
      keyTakeaways: [
        'Add multiple audio tracks for dialogue, sound effects, and background music.',
        'Record microphone voiceovers directly inside ClipAnim.',
        'Search the built-in sound library for hundreds of free sound effects and music loops.',
      ],
      steps: [
        {
          title: '1. Opening the Audio Studio',
          description: 'Click the Music note icon in the top navigation bar. You can add background music, sound effects, or voice tracks synced to timeline frames.',
          tip: 'Drag the audio start marker to align sound effects (like a punch or footsteps) with exact visual action frames.'
        },
        {
          title: '2. Built-in Sound Library',
          description: 'Click "Sound Library" to browse curated sound effects (foley, impacts, cartoon noises, ambient nature, game sounds). One-click import directly into your timeline.',
          tip: 'All library sounds are royalty-free and ready for YouTube, TikTok, and web export.'
        },
        {
          title: '3. Direct Microphone Recording',
          description: 'Click the Mic icon to record your voice. ClipAnim counts down and captures live audio, automatically generating a waveform track.',
          tip: 'Wear headphones while recording voiceovers to avoid feedback loop from animation audio.'
        },
        {
          title: '4. Waveform Audio Editor',
          description: 'Double-click any audio track to open the Waveform Audio Editor. Trim unwanted silence, apply fade-in / fade-out, adjust gain volume, and pitch shift.',
          tip: 'Visual waveforms make lip-syncing dialogue with character mouths accurate.'
        }
      ]
    },
    {
      id: 'tweening',
      category: 'advanced',
      title: 'Automatic Motion Tweening & In-betweens',
      duration: '3 min',
      icon: Icons.Wand2,
      summary: 'Generate silky-smooth interpolation between keyframes with customizable easing curves.',
      keyTakeaways: [
        'Click the Wand icon on the timeline between two frames to open Tweening.',
        'Choose tween count and easing curve (Linear, Ease-In-Out, Bounce, Elastic).',
        'Saves hours of manual intermediate in-between drawing.',
      ],
      steps: [
        {
          title: '1. Creating Start and End Keyframes',
          description: 'Draw your initial pose on frame 1 (e.g. an object on the left). Create a second keyframe (e.g. frame 2) with the object on the right.',
          tip: 'Keep the layer structure and main silhouette consistent between the two frames for best interpolation.'
        },
        {
          title: '2. Launching Tween Generator',
          description: 'Click the Magic Wand icon situated on the Timeline between frames to open the Tweening generator dialog.',
          tip: 'Choose between 2 to 24 intermediate in-between frames.'
        },
        {
          title: '3. Selecting Easing Curves',
          description: 'Pick an easing formula: Linear for mechanical speed, Ease-Out for friction deceleration, Bounce for cartoon drops, or Elastic for snappy rubber physics.',
          tip: 'Ease-In-Out creates the most natural organic motion.'
        }
      ]
    },
    {
      id: 'exporting',
      category: 'basics',
      title: 'Exporting Movies, GIFs & Sharing',
      duration: '2 min',
      icon: Icons.Download,
      summary: 'Render your finished masterwork as MP4 video, WebM, animated GIF, or high-res PNG sequences.',
      keyTakeaways: [
        'MP4 (H.264) is optimized for Instagram, TikTok, YouTube, and all devices.',
        'WebM provides ultra-crisp web rendering with small file sizes.',
        'Project Archive (.canim JSON / ZIP) lets you back up raw projects with full layer history.',
      ],
      steps: [
        {
          title: '1. Opening Export Dialog',
          description: 'Click the "Export" button in the top action bar or press Ctrl+Shift+E.',
          tip: 'Choose between MP4 Video, WebM, Animated GIF, PNG Sequence (ZIP), or Single PNG image.'
        },
        {
          title: '2. Setting Resolution & Quality',
          description: 'Select your preferred render quality: High (crystal sharp), Medium (balanced), or Low (small file size). ClipAnim processes all frames client-side.',
          tip: 'Client-side encoding means your art stays 100% private on your own device.'
        },
        {
          title: '3. Download & Social Share',
          description: 'Once rendering completes, click "Download Movie" or use the direct system Share sheet to send to friends or social platforms.',
          tip: 'Always keep a Project Backup (.canim) saved in your files so you can edit layers in the future.'
        }
      ]
    },
    {
      id: 'games-guide',
      category: 'advanced',
      title: 'How to Build Interactive Games',
      duration: '5 min',
      icon: Icons.Gamepad2,
      summary: 'Transform your hand-drawn animations into playable interactive games with key inputs, movement scripting, and collisions.',
      keyTakeaways: [
        'Add custom update behaviors to Actors using JavaScript scripts.',
        'Access keyboard events like KeyDown and KeyUp to control player movements.',
        'Use bounding box equations to compute real-time collision detections between assets.',
      ],
      steps: [
        {
          title: '1. Create Actors and Open Script Editor',
          description: 'Convert any visual drawing into a Symbol, place it on the stage to create a live Actor instance, then click the script icon in its properties to open the script console.',
          tip: 'Actors have unique state coordinates (this.x, this.y, this.width, this.height, this.rotation, this.opacity, and this.scaleX).'
        },
        {
          title: '2. Script Keyboard & Controller Input',
          description: 'Register key down events in your Actor\'s initialization code, or query raw key states directly inside the onUpdate loop. Example:\n\nthis.onUpdate = function() {\n  if (keys["ArrowRight"]) this.x += 5;\n  if (keys["ArrowLeft"]) this.x -= 5;\n};',
          tip: 'The keys dictionary tracks pressed state values globally in real-time.'
        },
        {
          title: '3. Boundaries and Collision Math',
          description: 'Ensure player characters stay within bounds by clamping their coordinates (e.g., this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x))). Check for intersections with other actors using AABB bounding boxes:\n\nif (player.x < target.x + target.width && player.x + player.width > target.x && player.y < target.y + target.height) { // Hit! }',
          tip: 'For round characters, compute Euclidean distance between center points instead.'
        },
        {
          title: '4. Dynamic Timeline Frame Branching',
          description: 'Trigger game over scenes or next stages by dynamically controlling the player timeline playhead inside event callbacks. Execute statements like gotoAndStop(frameNumber) or play() based on gameplay outcomes.',
          tip: 'Keep game-logic scripts cleanly separated from pure frame drawing layers.'
        }
      ]
    },
    {
      id: 'quizzes-guide',
      category: 'advanced',
      title: 'Building Interactive Quizzes & Buttons',
      duration: '4 min',
      icon: Icons.Code,
      summary: 'Learn how to construct clickable buttons, handle multiple-choice answer validation, score accumulation, and game UI dialogue screens.',
      keyTakeaways: [
        'Define bounding areas on drawings to trigger clickable zones (this.onClick).',
        'Store score counts, state indexes, and user responses in global variables.',
        'Utilize gotoAndStop() frame controls to branch users between Question and Success/Failure screens.',
      ],
      steps: [
        {
          title: '1. Lay Out Questions across Frames',
          description: 'Construct your quiz by drawing questions on dedicated individual frames (e.g., Frame 1 for Intro, Frame 2 for Question 1, Frame 3 for Feedback, Frame 4 for Results). Turn off Auto-Play so the timeline waits for user interactions.',
          tip: 'Use separate drawing layers for text headings, graphic questions, and decorative button backgrounds.'
        },
        {
          title: '2. Program Clickable Button Triggers',
          description: 'Select an Actor element representing an option card and hook into its onClick script callback. For example:\n\nthis.onClick = function() {\n  if (isCorrectAnswer) {\n    globalScore += 10;\n    gotoAndStop(3); // Go to Correct Screen\n  } else {\n    gotoAndStop(4); // Go to Incorrect Screen\n  }\n};',
          tip: 'Ensure touch/click hit areas are sufficiently large (at least 44px) so they are easy to press.'
        },
        {
          title: '3. Tracking Player Scores & State',
          description: 'Initialize a global scores counter on the very first frame or in a startup script. You can accumulate positive points for correct choices, decrement for retries, and display live scores on stage using Text components.',
          tip: 'Reset variables inside the restart button event to allow infinite repeat playthroughs.'
        },
        {
          title: '4. Branching Storytelling & End Screens',
          description: 'Combine user choices with conditional routing blocks to design branching visual novels or trivia games. Redirect players to custom endings based on their final score threshold.',
          tip: 'Keep users motivated with cheerful sound effects for successes and cartoonish buzzers for incorrect answers.'
        }
      ]
    },
    {
      id: 'spritesheet-xml-guide',
      category: 'advanced',
      title: 'Adobe Animate Spritesheet & XML Export',
      duration: '4 min',
      icon: Icons.FileArchive,
      summary: 'Master the asset workflow for professional game engines. Pack your animation frames into compact texture atlases with standard Starling XML code.',
      keyTakeaways: [
        'Spritesheets merge multiple sequential drawing frames into a single master image to save GPU memory.',
        'The matching XML file maps exact sub-rectangles (x, y, width, height) of each frame.',
        'Compatible with Adobe Animate, Starling, Phaser, PixiJS, Unity, and Godot.',
      ],
      steps: [
        {
          title: '1. Export spritesheet from ClipAnim',
          description: 'Click the "Export" button or open the Symbol panel and select "Export Spritesheet". ClipAnim automatically arranges all frames into a tight, rectangular grid (spritesheet) using smart bin-packing algorithms.',
          tip: 'You can customize Padding (space between frames) and choose to export transparent PNG sheets for clean overlays.'
        },
        {
          title: '2. Understanding Starling/Adobe Animate XML metadata',
          description: 'Along with the packed PNG sheet, ClipAnim produces a Starling-compatible XML metadata file. This describes coordinate parameters:\n\n<TextureAtlas imagePath="spritesheet.png">\n  <SubTexture name="frame_00" x="0" y="0" width="120" height="120" />\n  <SubTexture name="frame_01" x="120" y="0" width="120" height="120" />\n</TextureAtlas>',
          tip: 'The names of the SubTextures correspond to sequence indexes, enabling smooth timeline reconstruction in engines.'
        },
        {
          title: '3. Importing into Adobe Animate or Game Engines',
          description: 'To play your hand-drawn animation in external tools: upload both the packed PNG and the XML file. Game frameworks (like Phaser or PixiJS) load these using a simple atlas loader:\n\nscene.load.atlas("character", "spritesheet.png", "spritesheet.xml");',
          tip: 'Using texture atlases dramatically reduces CPU/GPU draw calls, improving mobile/web game frame rates.'
        }
      ]
    }
  ];

  const currentLesson = lessons.find(l => l.id === selectedLessonId) || lessons[0];

  const filteredLessons = lessons.filter(l => {
    const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter;
    const matchesSearch = searchQuery.trim() === '' ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.keyTakeaways.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleNextStep = () => {
    if (activeStepIndex < currentLesson.steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    } else {
      // Find next lesson
      const currIdx = lessons.findIndex(l => l.id === currentLesson.id);
      if (currIdx < lessons.length - 1) {
        setSelectedLessonId(lessons[currIdx + 1].id);
        setActiveStepIndex(0);
      }
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-2 sm:p-4 md:p-6 select-none">
      <div className="bg-[#181818] w-[1100px] max-w-full h-[92vh] max-h-[850px] rounded-3xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden text-white relative">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#202020]/90 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--accent-color)] to-orange-400 flex items-center justify-center text-white shadow-lg shadow-[var(--accent-color)]/20">
              <Icons.GraduationCap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  {t('tutorial.title', 'ClipAnim Academy & Tutorial')}
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-bold text-[10px] uppercase tracking-wider border border-[var(--accent-color)]/30">
                  Interactive Guide
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {t('tutorial.subtitle', 'Learn animation fundamentals, digital drawing mastery, and pro production workflows.')}
              </p>
            </div>
          </div>

          {/* Top Actions & Mode Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              title="Launch on-screen spotlight tour in the editor"
            >
              <Icons.Compass size={16} />
              <span>{t('tutorial.startTour', 'Start Live UI Tour')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-gray-800 bg-[#1c1c1c] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'lessons'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.BookOpen size={15} />
              <span>Guided Lessons</span>
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.Monitor size={15} />
              <span>Hotkeys & Gestures</span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'faq'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.Help size={15} />
              <span>Animation FAQ & Tips</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-gray-400 text-xs">
            <Icons.Lightbulb size={14} className="text-yellow-400" />
            <span>Click any lesson on the left to start interactive learning</span>
          </div>
        </div>

        {/* Main Content Body */}
        {activeTab === 'lessons' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            
            {/* Left Sidebar: Lesson Directory */}
            <div className="w-full md:w-80 border-r border-gray-800 bg-[#161616] flex flex-col shrink-0">
              
              {/* Search & Filter */}
              <div className="p-3 border-b border-gray-800 space-y-2">
                <div className="relative">
                  <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lessons & topics..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-color)]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      <Icons.X size={12} />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'basics', label: 'Basics' },
                    { id: 'drawing', label: 'Drawing' },
                    { id: 'animation', label: 'Animation' },
                    { id: 'audio', label: 'Audio' },
                    { id: 'advanced', label: 'Advanced' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                        categoryFilter === cat.id
                          ? 'bg-gray-700 text-white font-bold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
                {filteredLessons.map((lesson, idx) => {
                  const isSelected = lesson.id === currentLesson.id;
                  const IconComponent = lesson.icon;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setActiveStepIndex(0);
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 border ${
                        isSelected
                          ? 'bg-gray-800/90 border-[var(--accent-color)]/60 text-white shadow-lg'
                          : 'bg-gray-900/40 border-transparent text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        <IconComponent size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Lesson {idx + 1}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                            {lesson.duration}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate leading-snug">
                          {lesson.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {lesson.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Stage: Selected Lesson Interactive Detail */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#181818] overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Lesson Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-gray-800/80 to-gray-900/80 border border-gray-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-color)]/20 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider border border-[var(--accent-color)]/30">
                      {currentLesson.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                      <Icons.Clock size={13} /> {currentLesson.duration} guide
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    {currentLesson.title}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {currentLesson.summary}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onStartInteractiveTour();
                  }}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold transition-all border border-gray-600"
                >
                  <Icons.Compass size={15} />
                  <span>Try in Live Editor</span>
                </button>
              </div>

              {/* Step Navigator Bar */}
              <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 p-2 rounded-2xl">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {currentLesson.steps.map((step, idx) => {
                    const isActive = idx === activeStepIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveStepIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-[var(--accent-color)] text-white shadow'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[120px]">{step.title.split('.')[1] || step.title}</span>
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs text-gray-400 font-mono px-3 shrink-0">
                  Step {activeStepIndex + 1} of {currentLesson.steps.length}
                </span>
              </div>

              {/* Active Step Content Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Step Details & Explanation */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#202020] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-[var(--accent-color)]/20 text-[var(--accent-color)] flex items-center justify-center text-sm font-black border border-[var(--accent-color)]/30">
                        {activeStepIndex + 1}
                      </span>
                      {currentLesson.steps[activeStepIndex].title}
                    </h4>

                    <p className="text-sm text-gray-300 leading-relaxed">
                      {currentLesson.steps[activeStepIndex].description}
                    </p>

                    {currentLesson.steps[activeStepIndex].tip && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                        <Icons.Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          {currentLesson.steps[activeStepIndex].tip}
                        </div>
                      </div>
                    )}

                    {/* Step Navigation Controls */}
                    <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
                      <button
                        onClick={handlePrevStep}
                        disabled={activeStepIndex === 0}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                          activeStepIndex === 0
                            ? 'opacity-40 cursor-not-allowed text-gray-500'
                            : 'bg-gray-800 hover:bg-gray-700 text-white'
                        }`}
                      >
                        <Icons.ChevronLeft size={16} />
                        <span>Previous Step</span>
                      </button>

                      <button
                        onClick={handleNextStep}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-md hover:scale-[1.02]"
                      >
                        <span>{activeStepIndex === currentLesson.steps.length - 1 ? 'Next Lesson' : 'Next Step'}</span>
                        <Icons.ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Key Takeaways Box */}
                  <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <Icons.Check size={16} className="text-emerald-400" />
                      Key Rules for this Lesson
                    </h5>
                    <ul className="space-y-2 text-xs text-gray-300">
                      {currentLesson.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Interactive Visual Simulator Box */}
                <div className="lg:col-span-5 bg-[#141414] border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Icons.Sparkles size={14} className="text-amber-400" />
                      Interactive Demo Stage
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">Live Preview</span>
                  </div>

                  {/* Interactive Bouncing Ball Demo */}
                  {(!currentLesson.steps[activeStepIndex].demoType || currentLesson.steps[activeStepIndex].demoType === 'bouncingBall' || currentLesson.steps[activeStepIndex].demoType === 'onionSkin' || currentLesson.steps[activeStepIndex].demoType === 'timeline') && (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-[4/3] bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center p-4">
                        
                        {/* Floor Line */}
                        <div className="absolute bottom-6 left-4 right-4 h-0.5 bg-gray-700/80 dashed" />

                        {/* Onion Skin Past Frames (Red) */}
                        {demoOnionSkin && demoFrame > 0 && (
                          <div
                            className="absolute rounded-full border-2 border-red-500/60 bg-red-500/20 transition-all duration-300 pointer-events-none"
                            style={{
                              width: (demoFrame - 1) === 2 ? '54px' : '44px',
                              height: (demoFrame - 1) === 2 ? '30px' : '44px',
                              bottom: (demoFrame - 1) === 0 ? '110px' : (demoFrame - 1) === 1 ? '60px' : '24px',
                              transform: (demoFrame - 1) === 2 ? 'scaleY(0.7)' : 'none'
                            }}
                          />
                        )}

                        {/* Onion Skin Future Frames (Green) */}
                        {demoOnionSkin && demoFrame < 3 && (
                          <div
                            className="absolute rounded-full border-2 border-emerald-500/60 bg-emerald-500/20 transition-all duration-300 pointer-events-none"
                            style={{
                              width: (demoFrame + 1) === 2 ? '54px' : '44px',
                              height: (demoFrame + 1) === 2 ? '30px' : '44px',
                              bottom: (demoFrame + 1) === 0 ? '110px' : (demoFrame + 1) === 1 ? '60px' : (demoFrame + 1) === 2 ? '24px' : '75px',
                              transform: (demoFrame + 1) === 2 ? 'scaleY(0.7)' : 'none'
                            }}
                          />
                        )}

                        {/* Active Drawing Frame Object */}
                        <div
                          className="rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-orange-400 shadow-xl shadow-[var(--accent-color)]/30 border-2 border-white transition-all duration-200 flex items-center justify-center"
                          style={{
                            width: demoFrame === 2 ? '56px' : demoFrame === 1 ? '40px' : '46px',
                            height: demoFrame === 2 ? '28px' : demoFrame === 1 ? '50px' : '46px',
                            transform: demoFrame === 2 ? 'scaleY(0.65)' : demoFrame === 1 ? 'scaleY(1.15)' : 'scaleY(1)',
                            marginBottom: demoFrame === 0 ? '80px' : demoFrame === 1 ? '20px' : demoFrame === 2 ? '-40px' : '30px'
                          }}
                        >
                          <span className="text-[10px] font-black text-white/90">F{demoFrame + 1}</span>
                        </div>

                        {/* State Labels */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-gray-300 border border-gray-700/60 font-mono">
                          {demoFrame === 0 && 'Frame 1: High Apex (Anticipation)'}
                          {demoFrame === 1 && 'Frame 2: Rapid Descent (Stretch)'}
                          {demoFrame === 2 && 'Frame 3: Ground Impact (Squash)'}
                          {demoFrame === 3 && 'Frame 4: Rebound Flight (Decelerate)'}
                        </div>
                      </div>

                      {/* Interactive Controls for Demo */}
                      <div className="space-y-2 bg-gray-900 p-3 rounded-2xl border border-gray-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-medium">Scrub Frame Stepper:</span>
                          <span className="font-mono text-[var(--accent-color)] font-bold">Frame {demoFrame + 1} of 4</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map(f => (
                            <button
                              key={f}
                              onClick={() => setDemoFrame(f)}
                              className={`py-1.5 rounded-xl font-bold transition-all text-xs ${
                                demoFrame === f
                                  ? 'bg-[var(--accent-color)] text-white shadow'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              Frame {f + 1}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDemoPlaying(!demoPlaying)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-colors ${
                                demoPlaying ? 'bg-[var(--accent-color)] text-white shadow' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              {demoPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                              <span>{demoPlaying ? 'Pause' : 'Play Loop'}</span>
                            </button>

                            <button
                              onClick={() => setDemoOnionSkin(!demoOnionSkin)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-colors ${
                                demoOnionSkin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              <Icons.Ghost size={14} />
                              <span>Onion Skin: {demoOnionSkin ? 'ON' : 'OFF'}</span>
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              const next = (demoFrame + 1) % 4;
                              setDemoFrame(next);
                            }}
                            className="flex items-center gap-1 text-[var(--accent-color)] hover:underline font-bold"
                          >
                            <span>Step Frame</span>
                            <Icons.ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Layer Demo */}
                  {currentLesson.steps[activeStepIndex].demoType === 'layers' && (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-[4/3] bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center p-4">
                        
                        {/* Background Layer Visual */}
                        {(demoLayer === 'all' || demoLayer === 'background') && (
                          <div className="absolute inset-4 rounded-xl bg-gradient-to-b from-blue-900/30 to-indigo-950/40 border border-blue-500/20 flex items-start p-2">
                            <span className="text-[10px] font-mono text-blue-300">Layer 1: Background Sky</span>
                          </div>
                        )}

                        {/* Flat Color Layer Visual */}
                        {(demoLayer === 'all' || demoLayer === 'color') && (
                          <div className="absolute w-24 h-24 rounded-2xl bg-amber-500/80 shadow-lg border border-amber-300 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-black">Flat Color</span>
                          </div>
                        )}

                        {/* Lineart Layer Visual */}
                        {(demoLayer === 'all' || demoLayer === 'lineart') && (
                          <div className="absolute w-24 h-24 rounded-2xl border-4 border-white flex items-center justify-center pointer-events-none">
                            <span className="text-[9px] font-bold text-white bg-black/60 px-1 rounded">Ink Lineart</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => setDemoLayer('all')}
                          className={`p-2 rounded-xl font-bold transition-all ${demoLayer === 'all' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                          Composite Stack
                        </button>
                        <button
                          onClick={() => setDemoLayer('lineart')}
                          className={`p-2 rounded-xl font-bold transition-all ${demoLayer === 'lineart' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                          Lineart Only
                        </button>
                        <button
                          onClick={() => setDemoLayer('color')}
                          className={`p-2 rounded-xl font-bold transition-all ${demoLayer === 'color' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                          Flat Colors Only
                        </button>
                        <button
                          onClick={() => setDemoLayer('background')}
                          className={`p-2 rounded-xl font-bold transition-all ${demoLayer === 'background' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                          Background Only
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-900/60 rounded-2xl border border-gray-800/80 text-[11px] text-gray-400 flex items-center gap-2">
                    <Icons.Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Every tool shown here is fully functional in your project editor.</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Keyboard Shortcuts & Gestures */}
        {activeTab === 'shortcuts' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#181818]">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tools & Brushes */}
                <div className="bg-[#202020] border border-gray-800 rounded-3xl p-5 space-y-4">
                  <h4 className="font-bold text-sm text-[var(--accent-color)] uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Icons.Brush size={16} />
                    Creative Tool Keys
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <ShortcutRow label="Brush / Freehand Drawing" keyText="B" />
                    <ShortcutRow label="Eraser Tool" keyText="E" />
                    <ShortcutRow label="Fill Bucket Tool" keyText="G" />
                    <ShortcutRow label="Eyedropper Color Picker" keyText="I" />
                    <ShortcutRow label="Rectangular Marquee Selection" keyText="V" />
                    <ShortcutRow label="Lasso Selection Tool" keyText="L" />
                    <ShortcutRow label="Magic Wand Color Select" keyText="W" />
                    <ShortcutRow label="Geometric Shapes Tool" keyText="U" />
                    <ShortcutRow label="Text Caption Tool" keyText="T" />
                  </div>
                </div>

                {/* Canvas Navigation & Gestures */}
                <div className="bg-[#202020] border border-gray-800 rounded-3xl p-5 space-y-4">
                  <h4 className="font-bold text-sm text-[var(--accent-color)] uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Icons.Monitor size={16} />
                    Canvas Navigation & Playback
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <ShortcutRow label="Pan Canvas Around" keyText="Right-Click Drag / Space + Drag" />
                    <ShortcutRow label="Pinch Zoom / Precision Zoom" keyText="Ctrl + MouseWheel / Pinch" />
                    <ShortcutRow label="Play / Pause Animation Preview" keyText="Spacebar" />
                    <ShortcutRow label="Next Frame / Previous Frame" keyText="Right Arrow / Left Arrow" />
                    <ShortcutRow label="Toggle Onion Skinning" keyText="O" />
                    <ShortcutRow label="Toggle Alignment Grid" keyText="G (when brush idle)" />
                    <ShortcutRow label="Toggle Zen Focus Mode" keyText="F" />
                  </div>
                </div>

                {/* Edit & Transform Actions */}
                <div className="bg-[#202020] border border-gray-800 rounded-3xl p-5 space-y-4">
                  <h4 className="font-bold text-sm text-[var(--accent-color)] uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Icons.Scissors size={16} />
                    Editing & Selections
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <ShortcutRow label="Undo Last Stroke" keyText="Ctrl + Z" />
                    <ShortcutRow label="Redo Stroke" keyText="Ctrl + Shift + Z" />
                    <ShortcutRow label="Copy Selected Artwork" keyText="Ctrl + C" />
                    <ShortcutRow label="Paste Artwork / External Image" keyText="Ctrl + V" />
                    <ShortcutRow label="Delete Active Selection / Frame" keyText="Delete / Backspace" />
                    <ShortcutRow label="Commit Selection onto Layer" keyText="Enter / Double Click" />
                  </div>
                </div>

                {/* Project File Actions */}
                <div className="bg-[#202020] border border-gray-800 rounded-3xl p-5 space-y-4">
                  <h4 className="font-bold text-sm text-[var(--accent-color)] uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Icons.Save size={16} />
                    Project & Export Actions
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <ShortcutRow label="Save Project Instantly" keyText="Ctrl + S" />
                    <ShortcutRow label="Open Export Movie Dialog" keyText="Ctrl + Shift + E" />
                    <ShortcutRow label="Increase / Decrease Brush Size" keyText="] and [" />
                    <ShortcutRow label="Open Help & Tutorial Center" keyText="H or ?" />
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 3: FAQ & Pro Tips */}
        {activeTab === 'faq' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#181818]">
            <div className="max-w-3xl mx-auto space-y-4">
              
              {[
                {
                  q: 'What is the best frame rate (FPS) to animate at?',
                  a: '12 FPS is the classic hand-drawn animation standard (known in traditional studios as "animating on twos" for 24fps film). It gives natural motion without requiring you to draw 60 individual pictures per second! For snappy action or video games, 24 FPS is ideal.'
                },
                {
                  q: 'How can I paste images from other websites or apps?',
                  a: 'Simply copy any picture to your clipboard and press Ctrl+V in the editor (or tap the Paste icon in the top selection toolbar). On mobile phones, tapping Paste will open your gallery or clipboard seamlessly.'
                },
                {
                  q: 'What is the difference between Painting and Animation projects?',
                  a: 'Paintings are single-canvas illustrations optimized for digital drawing, concept art, and high-res illustration. Animations are multi-frame sequences with timelines, onion skinning, audio synchronization, and movie export.'
                },
                {
                  q: 'How do I lip-sync character dialogue with voice audio?',
                  a: 'Record or import your audio track in the Audio Studio. The visual waveform will show you exact speech peaks and syllable pauses so you can draw mouth phonemes matching each audio spike.'
                },
                {
                  q: 'Where are my animations saved?',
                  a: 'ClipAnim automatically saves all your projects into your browser\'s local database (IndexedDB). For long-term backups, use the "Project Backup" export in Settings to download your .canim JSON archive.'
                }
              ].map((faq, i) => (
                <div key={i} className="bg-[#202020] border border-gray-800 rounded-2xl p-5 space-y-2">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-color)] text-white text-xs flex items-center justify-center font-bold">
                      Q
                    </span>
                    {faq.q}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed pl-7">
                    {faq.a}
                  </p>
                </div>
              ))}

            </div>
          </div>
        )}

        {/* Bottom Footer Bar */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#202020] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Icons.Check size={16} className="text-emerald-400" />
            <span>Need more help? Press <kbd className="bg-black/50 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-mono font-bold">H</kbd> anytime to reopen this guide.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour();
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-gray-700"
            >
              <Icons.Compass size={15} />
              <span>Launch Live Spotlight Tour</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              {t('help.gotIt', 'Got it, Let\'s Animate!')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const ShortcutRow: React.FC<{ label: string; keyText: string }> = ({ label, keyText }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-800/80 last:border-0">
    <span className="text-gray-300 font-medium">{label}</span>
    <kbd className="bg-black/60 border border-gray-700 text-gray-200 px-2 py-0.5 rounded text-[11px] font-mono font-bold shadow-sm">
      {keyText}
    </kbd>
  </div>
);
