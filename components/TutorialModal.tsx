import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import {
  SquashStretchSimulator,
  InteractiveMiniCanvas,
  TweeningCurveSimulator,
  GameScriptSimulator,
  LipSyncPhonemeSimulator,
  SymbolFrameBindingSimulator,
  SpritesheetAtlasSimulator
} from './tutorial/TutorialSimulators';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour: (mode?: 'all' | 'painting' | 'games') => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  category: 'basics' | 'drawing' | 'animation' | 'audio' | 'advanced';
  icon: any;
  duration: string;
  summary: string;
  keyTakeaways: string[];
  quiz?: QuizQuestion;
  steps: {
    title: string;
    description: string;
    tip?: string;
    demoType?: 'bouncingBall' | 'miniCanvas' | 'layers' | 'timeline' | 'tweening' | 'gameScript' | 'lipSync' | 'symbolBinding' | 'spritesheet';
  }[];
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onStartInteractiveTour,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'lessons' | 'sandbox' | 'shortcuts' | 'faq'>('lessons');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('quickstart');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Practice Sandbox mode state
  const [sandboxTool, setSandboxTool] = useState<'squash' | 'canvas' | 'tween' | 'game' | 'lipsync' | 'symbols' | 'spritesheet'>('squash');

  // Quiz state for the active lesson
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState<boolean>(false);

  // Completed lessons tracking
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('clipanim_tutorial_completed_lessons');
      return saved ? JSON.parse(saved) : ['quickstart'];
    } catch {
      return ['quickstart'];
    }
  });

  // Save completed lessons
  useEffect(() => {
    try {
      localStorage.setItem('clipanim_tutorial_completed_lessons', JSON.stringify(completedLessons));
    } catch (e) {
      console.error(e);
    }
  }, [completedLessons]);

  // Reset quiz state when switching lessons
  useEffect(() => {
    setSelectedQuizAnswer(null);
    setShowQuizFeedback(false);
  }, [selectedLessonId]);

  if (!isOpen) return null;

  const lessons: Lesson[] = [
    {
      id: 'quickstart',
      category: 'basics',
      title: 'Your First Animation in 3 Minutes',
      duration: '3 min',
      icon: Icons.Sparkles,
      summary: 'Learn the core workflow: draw, add frames, check onion skins, and preview your animated masterpiece.',
      keyTakeaways: [
        'Animations are sequences of frames played at rapid speed (FPS).',
        'Use the + button on the timeline to create new frames.',
        'Toggle Onion Skinning (O) to see the previous frame as a drawing guide.',
      ],
      quiz: {
        question: 'What is the primary benefit of Onion Skinning in 2D animation?',
        options: [
          'It saves file compression size on export.',
          'It displays faint outlines of previous/upcoming frames to guide smooth in-between drawing.',
          'It automatically fills shapes with gradient colors.'
        ],
        correctIndex: 1,
        explanation: 'Onion Skinning renders previous frames in faint red and upcoming frames in green, letting you trace smooth motion transitions without guessing!'
      },
      steps: [
        {
          title: '1. Create a Keyframe & Draw',
          description: 'Select the Brush (B) from the left toolbar, pick a vibrant color, and draw your first character or object on Canvas frame 1.',
          tip: 'Tip: Keep your initial sketches loose and simple to nail down key poses before adding intricate lines.',
          demoType: 'miniCanvas'
        },
        {
          title: '2. Add Next Frame with Onion Skinning',
          description: 'Click the "+" icon on the bottom timeline. Turn on Onion Skinning (or press O) to see a faint red ghost of your previous drawing.',
          tip: 'Onion skinning eliminates guesswork and ensures consistent volume between drawings.',
          demoType: 'bouncingBall'
        },
        {
          title: '3. Draw Progressive Motion',
          description: 'Draw the subject slightly shifted or deformed (e.g., a ball stretching down as it falls toward the ground).',
          tip: 'Use Squash & Stretch to convey weight, speed, and elasticity.',
          demoType: 'bouncingBall'
        },
        {
          title: '4. Preview and Set Frame Rate (FPS)',
          description: 'Hit the Play button (or press Spacebar) to loop your animation! Adjust the FPS slider (12 FPS is classic animation standard, 24 FPS is cinema smooth).',
          tip: 'You can adjust project frame rate anytime without losing any drawings.',
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
        'Enable Line Smoothing to remove stylus jitter and ink clean curves.',
        'Symmetry modes allow instant drawing of mirrored characters, mecha, and mandala patterns.',
      ],
      quiz: {
        question: 'Which shortcut keys allow you to quickly change brush size on the fly?',
        options: [
          'Bracket keys [ and ]',
          'Ctrl + Plus / Minus',
          'Shift + Space'
        ],
        correctIndex: 0,
        explanation: 'Pressing [ decreases brush size and ] increases brush size immediately while drawing.'
      },
      steps: [
        {
          title: '1. Choosing the Right Brush Engine',
          description: 'ClipAnim offers specialized brushes: Classic Inking Pen, Textured Pencil, Marker, Airbrush, Pixel Art Grid, Calligraphy Nib, and Spray Can. Click the brush icon to switch engines.',
          tip: 'For pixel art games, select the Pixel Brush and pick a low resolution canvas (e.g., 64x64 or 128x128).',
          demoType: 'miniCanvas'
        },
        {
          title: '2. Line Smoothing & Jitter Control',
          description: 'Use the Smoothing slider on the top brush options bar. Low smoothing gives raw responsive sketching; high smoothing calculates crisp bezier curves.',
          tip: 'High smoothing is perfect for professional inking and clean lineart.',
          demoType: 'miniCanvas'
        },
        {
          title: '3. Real-Time Symmetry Mirrors',
          description: 'Activate Symmetry in Vertical, Horizontal, Quad, or Radial modes. Every stroke you draw mirrors automatically across axes in real-time.',
          tip: 'Great for drawing vehicles, character faces, wings, and kaleidoscopic visual effects.',
          demoType: 'miniCanvas'
        },
        {
          title: '4. Fill Bucket with Tolerance & Opacity',
          description: 'Fill closed shapes with one click (G). Adjust Tolerance to fill anti-aliased sketches without leaving ugly white fringe pixels.',
          tip: 'Hold the eyedropper tool (I) on any canvas pixel to sample that exact color.',
          demoType: 'miniCanvas'
        }
      ]
    },
    {
      id: 'onionskin',
      category: 'animation',
      title: 'Onion Skinning & 12 Principles of Animation',
      duration: '5 min',
      icon: Icons.Ghost,
      summary: 'Harness color-coded ghosting and apply traditional Disney animation principles like Squash & Stretch, Anticipation, and Arcs.',
      keyTakeaways: [
        'Red ghosting shows previous frames; Green ghosting shows upcoming frames.',
        'Squash and stretch conveys weight, mass, and flexibility while maintaining consistent volume.',
        'Anticipation prepares the audience for a major movement (e.g. crouching before a jump).',
      ],
      quiz: {
        question: 'During Squash & Stretch, what must happen to the overall volume of the animated object?',
        options: [
          'Volume should shrink to zero on impact.',
          'Volume must stay consistent (compressing horizontally when squashed, elongating vertically when stretched).',
          'Volume should double every frame.'
        ],
        correctIndex: 1,
        explanation: 'Maintaining constant volume is the core rule of Squash & Stretch: an object widens as it squashes to maintain realistic mass!'
      },
      steps: [
        {
          title: '1. Reading the Color Coded Ghosts',
          description: 'When Onion Skin is enabled, past frames are tinted in red and future frames are tinted in green with customizable opacities.',
          tip: 'Open Project Settings to adjust ghost frame count (up to 5 frames before and after).',
          demoType: 'bouncingBall'
        },
        {
          title: '2. Squash and Stretch in Action',
          description: 'When an object speeds up or hits an obstacle, deform its shape along the trajectory. Elongate during rapid velocity and squash flat on contact.',
          tip: 'An elongated shape feels fast, while a squashed shape conveys strong impact.',
          demoType: 'bouncingBall'
        },
        {
          title: '3. Anticipation & Follow-Through',
          description: 'Before a character jumps or punches, draw 1-2 frames of winding backward (anticipation). After the peak action, add decaying overshoot frames (follow-through).',
          tip: 'Anticipation lets the viewer\'s eyes prepare for sudden rapid action.',
          demoType: 'bouncingBall'
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
        'Use Screen and Add blend modes for glowing magical effects and lighting.',
      ],
      quiz: {
        question: 'Which blend mode is best suited for painting realistic shadows over colored artwork?',
        options: [
          'Multiply',
          'Screen',
          'Difference'
        ],
        correctIndex: 0,
        explanation: 'Multiply multiplies color values together, creating deep, natural shadows that preserve underlying ink and flat color tones.'
      },
      steps: [
        {
          title: '1. Structuring Your Layer Stack',
          description: 'Open the Layer Panel on the right. Create separate layers for: Background (bottom), Flat Colors (middle), Ink Lineart (top), and Highlights/FX (topmost).',
          tip: 'Lock your Background layer so you never accidentally erase scenery while animating characters.',
          demoType: 'layers'
        },
        {
          title: '2. Blend Modes for Lighting & Shading',
          description: 'Change layer blend modes in the Layer Settings dropdown. Multiply blends shadows into underlying colors seamlessly; Screen/Overlay creates radiant highlights.',
          tip: 'Adjust layer opacity slider to make subtle transparent shadows or translucent water/glass.',
          demoType: 'layers'
        },
        {
          title: '3. Layer Visibility & Duplicate',
          description: 'Hide or isolate individual layers while sketching. Duplicate any layer to experiment with alternate color palettes without losing originals.',
          tip: 'Reorder layers anytime by dragging their grip handles up or down in the stack.',
          demoType: 'layers'
        }
      ]
    },
    {
      id: 'symbols-frame-targets',
      category: 'advanced',
      title: 'Symbol Architecture & Target Frame Placement',
      duration: '5 min',
      icon: Icons.Library,
      summary: 'Create reusable Graphic & MovieClip Symbols, instantiate them across specific timeline frames, and manage stage actor instances.',
      keyTakeaways: [
        'Symbols are saved in your project library and can be placed on stage multiple times without duplicating memory.',
        'Assign a targetFrame parameter to bind an actor to a specific level, dialogue frame, or game screen.',
        'Actors on "All Frames" persist across the entire timeline; actors with a target frame only appear when that frame is active.',
      ],
      quiz: {
        question: 'If you want a boss monster to appear ONLY on Frame 3 of your timeline, how do you configure its targetFrame?',
        options: [
          'Delete the symbol from frames 1 and 2 manually.',
          'Set its targetFrame dropdown in the Symbol Panel to "Frame 3".',
          'Create 3 separate project files.'
        ],
        correctIndex: 1,
        explanation: 'Setting targetFrame to Frame 3 binds the actor instance strictly to Frame 3. It will automatically hide on all other frames!'
      },
      steps: [
        {
          title: '1. Converting Drawings into Symbols',
          description: 'Select any drawing on stage and click "Convert to Symbol" (or press F8). Choose Graphic for static props and buttons, or MovieClip for animated character rigs.',
          tip: 'Symbols are saved in your Symbol Panel and persist with your project file.',
          demoType: 'symbolBinding'
        },
        {
          title: '2. Instantiating on Specific Target Frames',
          description: 'In the Symbol Panel, click "+ Frame X" to place the symbol directly onto the currently active timeline frame. You can also re-assign any actor\'s target frame anytime using the dropdown.',
          tip: 'Use "+ All Frames" for HUD elements, scoreboards, and player avatars that stay on screen throughout the game.',
          demoType: 'symbolBinding'
        },
        {
          title: '3. Filtering Symbols by Frame',
          description: 'Use the "Frame X Only" filter tab in the Symbol Panel to focus strictly on actors assigned to the active frame.',
          tip: 'Keeps large projects with dozens of level assets organized and easy to navigate.',
          demoType: 'symbolBinding'
        }
      ]
    },
    {
      id: 'audio-studio',
      category: 'audio',
      title: 'Audio Studio, Microphone & Lip-Syncing',
      duration: '4 min',
      icon: Icons.Music,
      summary: 'Add multi-track sound effects, record custom microphone voiceovers, view audio waveforms, and master phoneme lip-syncing.',
      keyTakeaways: [
        'Add multiple audio tracks for dialogue, sound effects, and background music.',
        'Record microphone voiceovers directly inside ClipAnim with countdown triggers.',
        'Match character mouth phonemes (A, E, O, U, M, F, L) to speech waveform peaks.',
      ],
      quiz: {
        question: 'Which mouth shape should be drawn when a character pronounces "M", "B", or "P" sounds?',
        options: [
          'Closed lips compressed together',
          'Wide open circle',
          'Teeth showing with mouth open wide'
        ],
        correctIndex: 0,
        explanation: 'Bilabial sounds (M, B, P) require the upper and lower lips to compress tightly together before releasing sound.'
      },
      steps: [
        {
          title: '1. Multi-Track Audio Timeline',
          description: 'Click the Music note icon in the top navigation bar. Add background music tracks, sound effects, and voice tracks synced to timeline frames.',
          tip: 'Drag the audio start marker to align sound effects (like a punch or footsteps) with exact visual action frames.',
          demoType: 'lipSync'
        },
        {
          title: '2. Live Microphone Recording',
          description: 'Click the Mic icon to record your voice. ClipAnim counts down and captures live audio, automatically generating a waveform track.',
          tip: 'Wear headphones while recording voiceovers to avoid audio feedback loops.',
          demoType: 'lipSync'
        },
        {
          title: '3. Phoneme Mouth Shapes for Lip-Sync',
          description: 'Animate character mouth shapes matching each phoneme sound: A/AH (open), E/EE (wide), O/OH (round), M/B/P (closed lips), F/V (teeth on lip).',
          tip: 'You only need 6-7 standard mouth phonemes to animate any spoken sentence in any language!',
          demoType: 'lipSync'
        }
      ]
    },
    {
      id: 'tweening',
      category: 'advanced',
      title: 'Tween Studio: Motion, Shape & Classic Tweens',
      duration: '4 min',
      icon: Icons.Wand2,
      summary: 'Generate automated in-betweens using Motion Tweens (transformations & motion blur), Shape Tweens (organic vector morphing), and Classic Tweens (Flash-style arcs & spins).',
      keyTakeaways: [
        'Motion Tween: Interpolates position, scale, and rotation with multi-sample studio motion blur.',
        'Shape Tween: Morphs vector contours and organic silhouettes using Liquify, Contour, and Dissolve modes.',
        'Classic Tween: Animates along parabolic arcs, anchor registration points, and multi-turn spins (CW/CCW).',
      ],
      quiz: {
        question: 'Which tween mode should you use if you want to morph a star into a circle or deform an organic blob?',
        options: [
          'Shape Tween (with Liquify or Contour morphing)',
          'Classic Tween (Straight Line)',
          'Static Frame Hold'
        ],
        correctIndex: 0,
        explanation: 'Shape Tweens analyze and morph vector contours, hulls, and organic silhouettes directly between keyframes!'
      },
      steps: [
        {
          title: '1. Choosing the Right Tween Mode',
          description: 'Click the Magic Wand icon on the timeline. Select between Motion Tween (for symbols and props), Shape Tween (for organic morphs and transforming vector drawings), or Classic Tween (for parabolic jumping arcs and multi-spin turns).',
          tip: 'Use the interactive simulation viewport to preview your exact motion curves before generating in-betweens.',
          demoType: 'tweening'
        },
        {
          title: '2. Motion Blur & Easing Curves',
          description: 'Enable Studio Motion Blur to automatically smooth high-velocity movements and eliminate visual stepping. Select easing curves like Ease-In-Out, Bounce, or Elastic.',
          tip: 'Choose from presets like "Action Streak" or "Smooth Float" for instant cinematic timing.',
          demoType: 'tweening'
        },
        {
          title: '3. Classic Arcs, Anchors & Spins',
          description: 'In Classic Tween mode, configure Trajectory Arcs (Jump Arc Up, Gravity Drop Down, S-Wave) and Anchor Points (Bottom ground contact, top pendulum, center of mass) to achieve traditional Disney-quality physics.',
          tip: 'Set Spin Count to +1 or +2 to animate 360°/720° rotations effortlessly.',
          demoType: 'tweening'
        }
      ]
    },
    {
      id: 'games-guide',
      category: 'advanced',
      title: 'How to Build Interactive Playable Games',
      duration: '5 min',
      icon: Icons.Gamepad2,
      summary: 'Transform your hand-drawn animations into playable interactive games with keyboard controls, movement scripting, and collisions.',
      keyTakeaways: [
        'Add custom update behaviors to Actors using JavaScript/ActionScript.',
        'Access keyboard states (keys["ArrowRight"]) to control player movements.',
        'Use bounding box equations or hitTest() to compute real-time collision detections.',
      ],
      quiz: {
        question: 'How do you check if the player is holding down the Right Arrow key inside an Actor update script?',
        options: [
          'if (keys["ArrowRight"]) { this.x += 5; }',
          'pressKey(Right)',
          'screen.moveRight()'
        ],
        correctIndex: 0,
        explanation: 'The global keys dictionary tracks active keyboard button states in real time: `keys["ArrowRight"]`, `keys["Space"]`, etc.'
      },
      steps: [
        {
          title: '1. Create Actors and Open Script Editor',
          description: 'Convert any visual drawing into a Symbol, place it on the stage to create a live Actor instance, then click the script icon in its properties to open the script console.',
          tip: 'Actors have unique state coordinates (this.x, this.y, this.rotation, this.opacity, this.scaleX).',
          demoType: 'gameScript'
        },
        {
          title: '2. Script Keyboard & Controller Input',
          description: 'Query raw key states directly inside the onUpdate loop. Example:\n\nthis.onUpdate = function() {\n  if (keys["ArrowRight"]) this.x += 5;\n  if (keys["ArrowLeft"]) this.x -= 5;\n};',
          tip: 'The keys dictionary tracks pressed state values globally in real-time.',
          demoType: 'gameScript'
        },
        {
          title: '3. Boundaries and Collision Math',
          description: 'Clamp coordinates to prevent leaving screen bounds:\n\nthis.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));',
          tip: 'Check for collisions with other actors using AABB bounding boxes or distance calculations.',
          demoType: 'gameScript'
        },
        {
          title: '4. Test Movie & Export Live .HTML Game',
          description: 'Click the Gamepad icon in the top bar to test-play your game immediately with live input, audio, and physics. When ready, export a standalone, offline-ready HTML5 file you can share or host anywhere!',
          tip: 'The exported .html file is 100% self-contained with no external dependencies required.',
          demoType: 'gameScript'
        }
      ]
    },
    {
      id: 'quizzes-guide',
      category: 'advanced',
      title: 'Building Interactive Quizzes & Buttons',
      duration: '4 min',
      icon: Icons.Code,
      summary: 'Construct clickable buttons, handle multiple-choice answer validation, score accumulation, and branching dialogue screens.',
      keyTakeaways: [
        'Hook into this.onClick to trigger actions when an actor is clicked or tapped.',
        'Store score counts, state indexes, and user responses in global variables.',
        'Utilize gotoAndStop(frameNumber) to branch users between Question and Success/Failure screens.',
      ],
      quiz: {
        question: 'Which statement navigates the animation playhead to Frame 3 and stops playback to wait for user interaction?',
        options: [
          'gotoAndStop(3)',
          'pauseTimelineNow()',
          'jumpTo(3)'
        ],
        correctIndex: 0,
        explanation: 'gotoAndStop(frameNumber) moves the timeline playhead to the specified frame and pauses playback, ideal for branching quiz questions!'
      },
      steps: [
        {
          title: '1. Lay Out Questions across Frames',
          description: 'Construct your quiz by drawing questions on dedicated individual frames (Frame 1 for Intro, Frame 2 for Question 1, Frame 3 for Correct, Frame 4 for Incorrect). Turn off Auto-Play so the timeline waits for user clicks.',
          tip: 'Use separate drawing layers for text headings, graphic questions, and decorative button backgrounds.',
          demoType: 'symbolBinding'
        },
        {
          title: '2. Program Clickable Button Triggers',
          description: 'Select an Actor element representing an option card and hook into its onClick script callback:\n\nthis.onClick = function() {\n  if (isCorrect) {\n    globalScore += 10;\n    gotoAndStop(3);\n  } else {\n    gotoAndStop(4);\n  }\n};',
          tip: 'Ensure touch/click hit areas are at least 44px so they are easy to tap on mobile screens.',
          demoType: 'gameScript'
        }
      ]
    },
    {
      id: 'spritesheet-xml-guide',
      category: 'advanced',
      title: 'Adobe Animate Spritesheet & XML Export',
      duration: '4 min',
      icon: Icons.FileArchive,
      summary: 'Master the asset workflow for game engines like Phaser, PixiJS, Unity, and Godot by packing frames into Starling XML texture atlases.',
      keyTakeaways: [
        'Spritesheets merge multiple animation frames into a single image to maximize GPU performance.',
        'The matching XML file maps exact sub-rectangles (x, y, width, height) of each frame.',
        'Compatible with Adobe Animate, Starling, Phaser, PixiJS, Unity, and Godot.',
      ],
      quiz: {
        question: 'Why are texture atlases (spritesheets + XML) preferred in game development over separate PNG files?',
        options: [
          'They combine hundreds of drawings into a single texture, drastically reducing GPU draw calls and boosting FPS.',
          'They prevent users from playing the game.',
          'They convert 2D drawings into 3D models.'
        ],
        correctIndex: 0,
        explanation: 'By bundling all frames into one image, the GPU only needs 1 draw call instead of hundreds, resulting in ultra-fast performance on mobile and web games.'
      },
      steps: [
        {
          title: '1. Export Spritesheet from ClipAnim',
          description: 'Click "Export" or open the Symbol panel and select "Export Spritesheet". ClipAnim automatically arranges all frames into a tight, rectangular grid using smart bin-packing algorithms.',
          tip: 'You can customize Padding (space between frames) and export transparent PNG sheets for clean overlays.',
          demoType: 'spritesheet'
        },
        {
          title: '2. Starling XML Metadata Format',
          description: 'ClipAnim generates a standard Starling XML file mapping frame subtextures:\n\n<TextureAtlas imagePath="spritesheet.png">\n  <SubTexture name="frame_00" x="0" y="0" width="64" height="64" />\n</TextureAtlas>',
          tip: 'Load directly into Phaser using scene.load.atlas("hero", "sheet.png", "sheet.xml").',
          demoType: 'spritesheet'
        }
      ]
    },
    {
      id: 'exporting',
      category: 'basics',
      title: 'Exporting Movies, GIFs & Standalone Games',
      duration: '2 min',
      icon: Icons.Download,
      summary: 'Render finished projects as MP4 videos, animated GIFs, standalone offline HTML5 games, or project archives.',
      keyTakeaways: [
        'MP4 (H.264) is universally supported for Instagram, TikTok, YouTube, and mobile devices.',
        'Interactive Game (.html) exports a standalone, offline-ready file playable in any browser.',
        'Project Backup (.canim) lets you back up raw projects with full layer history and audio.',
      ],
      quiz: {
        question: 'Where is your animation rendering processed when you click Export in ClipAnim?',
        options: [
          '100% locally inside your browser on your own device for complete privacy.',
          'Uploaded to a public cloud server.',
          'Sent via email.'
        ],
        correctIndex: 0,
        explanation: 'All video, GIF, and game rendering is processed client-side inside your browser, keeping your creative work completely private and offline-capable.'
      },
      steps: [
        {
          title: '1. Opening the Export Studio',
          description: 'Click "Export" in the top action bar or press Ctrl+Shift+E. Choose between MP4 Video, WebM, Animated GIF, PNG Sequence (ZIP), or Interactive Game (.html).',
          tip: 'Select High Quality for crystal-sharp lines or Balanced for quick web sharing.',
          demoType: 'timeline'
        },
        {
          title: '2. Project Backup & Archive (.canim)',
          description: 'Always download a .canim Project Backup before starting new projects so you can reopen and edit all layers, audio tracks, and symbols in the future.',
          tip: 'You can drag and drop any saved .canim file back into ClipAnim anytime to resume work.',
          demoType: 'timeline'
        }
      ]
    }
  ];

  const currentLesson = lessons.find(l => l.id === selectedLessonId) || lessons[0];
  const isCurrentCompleted = completedLessons.includes(currentLesson.id);

  const filteredLessons = lessons.filter(l => {
    const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter;
    const matchesSearch = searchQuery.trim() === '' ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.keyTakeaways.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const toggleCompleteLesson = (id: string) => {
    setCompletedLessons(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (activeStepIndex < currentLesson.steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    } else {
      // Automatically mark current as completed and advance
      if (!completedLessons.includes(currentLesson.id)) {
        setCompletedLessons(prev => [...prev, currentLesson.id]);
      }
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

  // Calculate user mastery rank
  const completionPercentage = Math.round((completedLessons.length / lessons.length) * 100);
  const getMasteryRank = () => {
    if (completionPercentage >= 100) return { title: 'Master Animation Director', color: 'from-amber-400 to-yellow-500', badge: '🏆 MASTER' };
    if (completionPercentage >= 70) return { title: 'Game & VFX Architect', color: 'from-purple-400 to-pink-500', badge: '⭐ EXPERT' };
    if (completionPercentage >= 40) return { title: 'Keyframe Virtuoso', color: 'from-blue-400 to-cyan-500', badge: '🔷 SKILLED' };
    if (completionPercentage >= 15) return { title: 'Junior Inker', color: 'from-emerald-400 to-teal-500', badge: '🌱 APPRENTICE' };
    return { title: 'Creative Novice', color: 'from-gray-400 to-gray-500', badge: '🎨 NOVICE' };
  };

  const rank = getMasteryRank();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-2 sm:p-4 md:p-6 select-none">
      <div className="bg-[#161618] w-[1140px] max-w-full h-[94vh] max-h-[880px] rounded-3xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden text-white relative">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-gray-800 bg-[#1f1f23]/95 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--accent-color)] to-amber-400 flex items-center justify-center text-white shadow-lg shadow-[var(--accent-color)]/20">
              <Icons.GraduationCap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  {t('tutorial.title', 'ClipAnim Academy & Master Guide')}
                </h2>
                <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${rank.color} text-black font-black text-[9px] uppercase tracking-wider shadow-sm`}>
                  {rank.badge}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{rank.title}</span>
                <span>•</span>
                <span className="text-amber-400 font-mono font-bold">
                  {completedLessons.length}/{lessons.length} Completed ({completionPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions & Spotlight Tours */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('painting');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Launch on-screen spotlight tour for Painting & Inking"
            >
              <Icons.Brush size={14} className="text-pink-400" />
              <span>Painting Tour</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('games');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Launch on-screen spotlight tour for Interactive Games & Scripting"
            >
              <Icons.Gamepad2 size={14} className="text-emerald-400" />
              <span>Game Dev Tour</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('all');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              title="Launch complete on-screen spotlight tour"
            >
              <Icons.Compass size={14} />
              <span>Full UI Tour</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-1"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-gray-800 bg-[#19191d] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'lessons'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.BookOpen size={14} />
              <span>Guided Curriculum ({lessons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.Sparkles size={14} className={activeTab === 'sandbox' ? 'text-black' : 'text-amber-400'} />
              <span>Interactive Sandbox Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.Monitor size={14} />
              <span>Hotkeys & Gestures</span>
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'faq'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icons.Help size={14} />
              <span>Animation FAQ</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-gray-400 text-xs font-mono">
            <div className="w-24 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="bg-[var(--accent-color)] h-full transition-all" style={{ width: `${completionPercentage}%` }} />
            </div>
            <span>{completionPercentage}% complete</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Tab 1: Guided Lessons Curriculum */}
        {/* ======================================================== */}
        {activeTab === 'lessons' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            
            {/* Left Sidebar: Lesson Directory */}
            <div className="w-full md:w-80 border-r border-gray-800 bg-[#131316] flex flex-col shrink-0">
              
              {/* Search & Filter */}
              <div className="p-3 border-b border-gray-800 space-y-2">
                <div className="relative">
                  <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lessons, topics, tools..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-color)]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      <Icons.X size={12} />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
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
                  const isCompleted = completedLessons.includes(lesson.id);
                  const IconComponent = lesson.icon;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setActiveStepIndex(0);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-start gap-3 border ${
                        isSelected
                          ? 'bg-gray-800/90 border-[var(--accent-color)]/60 text-white shadow-lg'
                          : 'bg-gray-900/40 border-transparent text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 relative ${
                        isSelected ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        <IconComponent size={16} />
                        {isCompleted && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Lesson {idx + 1}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                            {lesson.duration}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate leading-snug">
                          {lesson.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                          {lesson.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Stage: Selected Lesson Detail */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#161618] overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Lesson Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-gray-800/90 to-gray-900/90 border border-gray-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-color)]/20 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider border border-[var(--accent-color)]/30">
                      {currentLesson.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                      <Icons.Clock size={13} /> {currentLesson.duration}
                    </span>
                    {isCurrentCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                        <Icons.Check size={11} /> Completed
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    {currentLesson.title}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {currentLesson.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleCompleteLesson(currentLesson.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isCurrentCompleted
                        ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/40'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icons.Check size={14} className={isCurrentCompleted ? 'text-emerald-400' : 'text-gray-400'} />
                    <span>{isCurrentCompleted ? 'Completed' : 'Mark as Done'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      if (currentLesson.id === 'games-guide' || currentLesson.id === 'quizzes-guide' || currentLesson.id === 'spritesheet-xml-guide' || currentLesson.id === 'symbols-frame-targets') {
                        onStartInteractiveTour('games');
                      } else if (currentLesson.category === 'drawing' || currentLesson.category === 'basics') {
                        onStartInteractiveTour('painting');
                      } else {
                        onStartInteractiveTour('all');
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Icons.Compass size={14} />
                    <span>Try in Live Tour</span>
                  </button>
                </div>
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
                        <span className="truncate max-w-[130px]">{step.title.split('.')[1] || step.title}</span>
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs text-gray-400 font-mono px-3 shrink-0">
                  Step {activeStepIndex + 1} of {currentLesson.steps.length}
                </span>
              </div>

              {/* Active Step Content Card & Interactive Stage */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Step Details & Explanation */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#1f1f23] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-[var(--accent-color)]/20 text-[var(--accent-color)] flex items-center justify-center text-sm font-black border border-[var(--accent-color)]/30">
                        {activeStepIndex + 1}
                      </span>
                      {currentLesson.steps[activeStepIndex].title}
                    </h4>

                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line font-normal">
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
                        <span>{activeStepIndex === currentLesson.steps.length - 1 ? 'Complete Lesson' : 'Next Step'}</span>
                        <Icons.ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Key Takeaways Box */}
                  <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <Icons.Check size={16} className="text-emerald-400" />
                      Core Rules for this Lesson
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

                  {/* Interactive Knowledge Check Quiz */}
                  {currentLesson.quiz && (
                    <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                          <Icons.Help size={15} />
                          Quick Knowledge Check
                        </span>
                        <span className="text-[10px] font-mono text-indigo-400">Test Your Understanding</span>
                      </div>

                      <p className="text-xs font-bold text-white">
                        {currentLesson.quiz.question}
                      </p>

                      <div className="space-y-1.5">
                        {currentLesson.quiz.options.map((option, optIdx) => {
                          const isSelected = selectedQuizAnswer === optIdx;
                          const isCorrect = optIdx === currentLesson.quiz?.correctIndex;

                          let btnStyle = 'bg-gray-900/80 border-gray-800 text-gray-300 hover:border-gray-600';
                          if (showQuizFeedback) {
                            if (isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                            else if (isSelected) btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                          } else if (isSelected) {
                            btnStyle = 'bg-indigo-900/80 border-indigo-400 text-white font-bold';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                setSelectedQuizAnswer(optIdx);
                                setShowQuizFeedback(true);
                                if (isCorrect && !completedLessons.includes(currentLesson.id)) {
                                  setCompletedLessons(prev => [...prev, currentLesson.id]);
                                }
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2 ${btnStyle}`}
                            >
                              <span className="w-5 h-5 rounded-lg bg-black/40 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-snug">{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {showQuizFeedback && (
                        <div className={`p-3 rounded-2xl text-xs space-y-1 ${
                          selectedQuizAnswer === currentLesson.quiz.correctIndex
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        }`}>
                          <div className="font-bold flex items-center gap-1.5">
                            {selectedQuizAnswer === currentLesson.quiz.correctIndex ? (
                              <>
                                <Icons.Check size={14} className="text-emerald-400" />
                                <span>Correct! Great Job!</span>
                              </>
                            ) : (
                              <>
                                <Icons.Help size={14} className="text-amber-400" />
                                <span>Almost! Here is why:</span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed text-gray-300">
                            {currentLesson.quiz.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Interactive Simulators */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Select appropriate simulator according to active step / lesson */}
                  {currentLesson.steps[activeStepIndex].demoType === 'bouncingBall' && <SquashStretchSimulator />}
                  {currentLesson.steps[activeStepIndex].demoType === 'miniCanvas' && <InteractiveMiniCanvas />}
                  {currentLesson.steps[activeStepIndex].demoType === 'tweening' && <TweeningCurveSimulator />}
                  {currentLesson.steps[activeStepIndex].demoType === 'gameScript' && <GameScriptSimulator />}
                  {currentLesson.steps[activeStepIndex].demoType === 'lipSync' && <LipSyncPhonemeSimulator />}
                  {currentLesson.steps[activeStepIndex].demoType === 'symbolBinding' && <SymbolFrameBindingSimulator />}
                  {currentLesson.steps[activeStepIndex].demoType === 'spritesheet' && <SpritesheetAtlasSimulator />}
                  
                  {/* Fallback default simulator */}
                  {!currentLesson.steps[activeStepIndex].demoType && (
                    currentLesson.category === 'drawing' ? <InteractiveMiniCanvas /> : <SquashStretchSimulator />
                  )}

                  <div className="p-3.5 bg-gray-900/60 rounded-2xl border border-gray-800 text-[11px] text-gray-400 flex items-center gap-2">
                    <Icons.Check size={15} className="text-emerald-400 shrink-0" />
                    <span>Every simulator above runs live client-side so you can test concepts safely.</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 2: Interactive Sandbox Lab */}
        {/* ======================================================== */}
        {activeTab === 'sandbox' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#161618]">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Sandbox Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-900/90 rounded-2xl border border-gray-800">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Icons.Sparkles size={16} className="text-amber-400" />
                    Interactive Animation & Physics Sandbox
                  </h3>
                  <p className="text-xs text-gray-400">
                    Freely experiment with physics, easing algorithms, drawing engines, lip-sync phonemes, and spritesheet packers.
                  </p>
                </div>

                {/* Sandbox Tool Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold no-scrollbar">
                  {[
                    { id: 'squash', label: 'Squash & Stretch', icon: Icons.Sparkles },
                    { id: 'canvas', label: 'Drawing Canvas', icon: Icons.Brush },
                    { id: 'tween', label: 'Easing Curves', icon: Icons.Wand2 },
                    { id: 'game', label: 'Game Scripting', icon: Icons.Gamepad2 },
                    { id: 'lipsync', label: 'Lip-Sync Mouths', icon: Icons.Music },
                    { id: 'symbols', label: 'Frame Binding', icon: Icons.Library },
                    { id: 'spritesheet', label: 'Starling XML', icon: Icons.FileArchive },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSandboxTool(t.id as any)}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        sandboxTool === t.id
                          ? 'bg-amber-400 text-black shadow'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <t.icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sandbox Viewport */}
              <div className="bg-[#1f1f23] p-6 rounded-3xl border border-gray-800 shadow-2xl">
                {sandboxTool === 'squash' && <SquashStretchSimulator />}
                {sandboxTool === 'canvas' && <InteractiveMiniCanvas />}
                {sandboxTool === 'tween' && <TweeningCurveSimulator />}
                {sandboxTool === 'game' && <GameScriptSimulator />}
                {sandboxTool === 'lipsync' && <LipSyncPhonemeSimulator />}
                {sandboxTool === 'symbols' && <SymbolFrameBindingSimulator />}
                {sandboxTool === 'spritesheet' && <SpritesheetAtlasSimulator />}
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 3: Keyboard Shortcuts & Gestures */}
        {/* ======================================================== */}
        {activeTab === 'shortcuts' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#161618]">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tools & Brushes */}
                <div className="bg-[#1f1f23] border border-gray-800 rounded-3xl p-5 space-y-4">
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
                <div className="bg-[#1f1f23] border border-gray-800 rounded-3xl p-5 space-y-4">
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
                <div className="bg-[#1f1f23] border border-gray-800 rounded-3xl p-5 space-y-4">
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
                <div className="bg-[#1f1f23] border border-gray-800 rounded-3xl p-5 space-y-4">
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

        {/* ======================================================== */}
        {/* Tab 4: FAQ & Pro Tips */}
        {/* ======================================================== */}
        {activeTab === 'faq' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#161618]">
            <div className="max-w-3xl mx-auto space-y-4">
              
              {[
                {
                  q: 'What is the best frame rate (FPS) to animate at?',
                  a: '12 FPS is the classic hand-drawn animation standard (known in traditional studios as "animating on twos" for 24fps film). It gives natural motion without requiring you to draw 60 individual pictures per second! For snappy action or video games, 24 FPS is ideal.'
                },
                {
                  q: 'How do I place actors and buttons on specific frames only?',
                  a: 'Open the Symbol Panel, locate your symbol card, and click the "+ Frame X" button or adjust its targetFrame dropdown. This binds the actor strictly to that level or question frame.'
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
                <div key={i} className="bg-[#1f1f23] border border-gray-800 rounded-2xl p-5 space-y-2">
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
        <div className="px-6 py-3.5 border-t border-gray-800 bg-[#1f1f23] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Icons.Check size={16} className="text-emerald-400" />
            <span>Need more help? Press <kbd className="bg-black/50 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-mono font-bold">H</kbd> anytime to reopen this academy.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('painting');
              }}
              className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-pink-500/30"
            >
              <Icons.Brush size={14} className="text-pink-400" />
              <span>Painting Tour</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('games');
              }}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-emerald-500/30"
            >
              <Icons.Gamepad2 size={14} className="text-emerald-400" />
              <span>Game Dev Tour</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour('all');
              }}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-700"
            >
              <Icons.Compass size={14} />
              <span>Full UI Tour</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-md ml-2"
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
