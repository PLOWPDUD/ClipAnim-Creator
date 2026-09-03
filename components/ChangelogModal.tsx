import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../Icons';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch';
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.3',
    date: '2026-08-24',
    type: 'major',
    changes: [
      'Interactive Frame Scripting: Attach play(), stop(), and frame-navigation commands to specific timeline frames to create interactive stories, games, or quiz structures.',
      'Flash-style Navigation APIs: Full runtime support for play(), stop(), gotoAndStop(frameNum), and gotoAndPlay(frameNum) script actions.',
      'Persistent Symbol Library Sidebar: Save active symbols to a persistent Global Library using local storage. Filter, search, and import/export symbol collections as JSON.',
      'Interactive Project Templates: Launch game concepts immediately using the "New Game" starter project featuring custom preset frame scripts and interactive SVG actors.',
      'Multi-Language Tutorials: Expanded interactive guides and tutorials on creating reusable symbols and frame scripts.'
    ]
  },
  {
    version: '1.3.2',
    date: '2026-08-13',
    type: 'minor',
    changes: [
      'Workspace Folder System: Create, edit, rename, color-code, and delete custom folders to organize your projects',
      'Move Projects to Folders: Easily organize animations and paintings into custom workspace folders',
      'Distinct Visual Categorization: Dedicated badges, icons (Film vs Palette), and hover styling for multi-frame animations and single-frame paintings',
      'Workspace Search & Category Filters: Real-time search bar and filter tabs (All Items, Animations, Paintings, Folders)',
      'Firefox & Cross-Browser MP4 Export Fix: Multi-codec WebCodecs support (H.264, VP9, AV1) with Opus audio encoding fallback for Firefox',
      'MP4 Encoder Stability Fix: Resolved WebCodecs chunk duration error for error-free MP4 exports across all browsers'
    ]
  },
  {
    version: '1.3.1',
    date: '2026-05-20',
    type: 'minor',
    changes: [
      'Added transparent background support for PNG, WebM, and GIF exports',
      'Added static PNG image export format for paintings',
      'Improved touch-friendly UI for Android and mobile: enhanced range sliders and larger tap targets',
      'Implemented touch-safe text selection to prevent accidental canvas interaction blocks'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-05-18',
    type: 'major',
    changes: [
      'Added "New Painting" mode for creating static artworks without animation timelines',
      'Added visual badges (camera / brush) to project cards to differentiate between animations and paintings',
      'Customized editor interface to hide timeline and animation tools when in painting mode'
    ]
  },
  {
    version: '1.2.1',
    date: '2026-05-06',
    type: 'patch',
    changes: [
      'Expanded multilingual support for animation tools and project settings',
      'Updated changelog for translation updates'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-04-18',
    type: 'major',
    changes: [
      'Advanced Audio Editor: Fully integrated audio layer editing directly in the timeline',
      'Enhanced Timing Controls: Automatic frame expansion based on audio duration',
      'Timeline Snapping: Audio clips now snap to frame boundaries for easy alignment',
      'Custom Brush Engine: Import and use custom brushes for more artistic control',
      'Motion Path Tool: Animate objects along custom paths across frames'
    ]
  },
  {
    version: '1.1.8',
    date: '2026-03-31',
    type: 'minor',
    changes: [
      'Added Camera Mode to visualize canvas boundaries and workspace',
      'New Camera toggle button in the canvas area',
      'Dimmed workspace effect when Camera Mode is active'
    ]
  },
  {
    version: '1.1.7',
    date: '2026-03-31',
    type: 'minor',
    changes: [
      'Added Backpack Export Options: You can now export backpack items as PNG or ZIP files.',
      'Multi-select Export: Select multiple items in the backpack to download them all at once in a ZIP archive.',
      'Single Item Export: Download individual backpack items directly as PNG images.'
    ]
  },
  {
    version: '1.1.6',
    date: '2026-03-31',
    type: 'minor',
    changes: [
      'Added Eyedropper Tool: Select colors directly from the canvas by clicking or dragging.',
      'Improved Color Picking: The eyedropper samples from the composite view of all layers and the background.'
    ]
  },
  {
    version: '1.1.5',
    date: '2026-03-31',
    type: 'patch',
    changes: [
      'Fixed Backpack Rename Issue: Added event propagation protection to the rename button to prevent accidental item selection while renaming.',
      'Improved UI Stability: Ensured the rename controls are correctly layered and responsive on touch devices.'
    ]
  },
  {
    version: '1.1.4',
    date: '2026-03-31',
    type: 'patch',
    changes: [
      'Improved Background Controls: Added a prominent "Remove Background Image" button in settings for better accessibility on mobile devices.',
      'Enhanced UI Clarity: Background image removal is now always visible and easier to find when an image is set.'
    ]
  },
  {
    version: '1.1.3',
    date: '2026-03-31',
    type: 'patch',
    changes: [
      'Improved Backpack Accessibility: Increased the touch target and icon size for renaming saved selections in the backpack.',
      'Enhanced Mobile Usability: Made it easier to rename items on Android and other touch devices.'
    ]
  },
  {
    version: '1.1.2',
    date: '2026-03-31',
    type: 'patch',
    changes: [
      'Enabled Canvas Controls on Mobile: Zoom In, Zoom Out, and Reset View buttons are now available on Android and other mobile devices.',
      'Improved Header Accessibility: Fixed an issue where canvas position controls were locked/disabled on mobile platforms.'
    ]
  },
  {
    version: '1.1.1',
    date: '2026-03-31',
    type: 'patch',
    changes: [
      'Fixed Canvas Background Rendering: Frame-specific background settings now correctly override global project settings on the main canvas.',
      'Improved Thumbnail Consistency: Background colors, gradients, and images are now correctly rendered in both Frame Manager and Timeline thumbnails.',
      'Standardized Thumbnail Generation: Thumbnails are now generated with transparent backgrounds for better Onion Skinning support and UI consistency.',
      'Fixed Timeline Background Image Support: Background images are now correctly displayed behind frame thumbnails in the main timeline.'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-03-30',
    type: 'major',
    changes: [
      'Added Freesound Integration: Search and add thousands of high-quality sounds directly from Freesound.org',
      'Added Server-Side Proxy: Securely handle API requests and bypass browser CORS restrictions',
      'Added Vercel Support: Seamlessly deploy as a full-stack application with vercel.json configuration',
      'Improved Sound Previews: Support for multiple audio formats (MP3, OGG) with real-time playback'
    ]
  },
  {
    version: '1.0.9',
    date: '2026-03-30',
    type: 'major',
    changes: [
      'Added Frame-Specific Timing: Adjust the "Hold" value to make a frame last longer',
      'Added Tween Engine: Click the magic wand in the timeline to auto-generate crossfaded inbetweens',
      'Added Timeline Waveforms: Audio tracks now display visual waveforms',
      'Added Sound Library: Access a built-in library of sound effects directly from the timeline'
    ]
  },
  {
    version: '1.0.8',
    date: '2026-03-30',
    type: 'minor',
    changes: [
      'Added drag-and-drop frame reordering in the Frame Manager',
      'Added touch support for dragging frames on mobile devices',
      'Added ability to import audio tracks alongside video imports'
    ]
  },
  {
    version: '1.0.7',
    date: '2026-03-29',
    type: 'major',
    changes: [
      'Added Video Import functionality (MP4)',
      'Trim and cut videos before importing them into your animation',
      'Automatically extracts frames from the video and adds them to your project'
    ]
  },
  {
    version: '1.0.6',
    date: '2026-03-29',
    type: 'patch',
    changes: [
      'Fixed copy-paste bug where original objects would disappear',
      'Added Cut functionality (Ctrl+X)',
      'Added keyboard shortcuts for Copy (Ctrl+C) and Paste (Ctrl+V)',
      'Added Cut/Copy/Paste buttons to the top toolbar'
    ]
  },
  {
    version: '1.0.5',
    date: '2026-03-29',
    type: 'patch',
    changes: [
      'Fixed drawing inside Magic Wand selections (even transparent ones!)',
      'Improved image import reliability on Android devices',
      'Added automatic mask clipping for all selection tools',
      'Removed legacy Guide feature to streamline selection workflow',
      'Added this Update Log to keep you informed of new features'
    ]
  },
  {
    version: '1.0.4',
    date: '2026-03-28',
    type: 'patch',
    changes: [
      'Enhanced Magic Wand tool with better tolerance control',
      'Improved Lasso tool precision',
      'Added ability to import images directly into selections',
      'Fixed various UI scaling issues on mobile'
    ]
  },
  {
    version: '1.0.3',
    date: '2026-03-25',
    type: 'patch',
    changes: [
      'Added Frame Manager for bulk frame operations',
      'Improved timeline performance with many frames',
      'Added onion skinning customization'
    ]
  },
  {
    version: '1.0.2',
    date: '2026-03-20',
    type: 'patch',
    changes: [
      'Added audio track support for animations',
      'Implemented MP4 video export functionality',
      'Improved brush smoothing and pressure sensitivity'
    ]
  },
  {
    version: '1.0.1',
    date: '2026-03-15',
    type: 'patch',
    changes: [
      'Added shape tools (Rectangle, Circle, Line)',
      'Added text tool for adding captions',
      'Fixed layer opacity rendering bugs'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    type: 'major',
    changes: [
      'Initial stable release of ClipAnim Creator',
      'Added GIF export functionality',
      'Implemented full layer management system',
      'Added custom color palettes'
    ]
  },
  {
    version: 'beta 0.0.1',
    date: '2026-01-15',
    type: 'major',
    changes: [
      'Initial prototype release',
      'Basic drawing tools (Pencil, Eraser, Fill)',
      'Basic timeline and frame management',
      'Project saving and loading'
    ]
  }
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HighlightText: React.FC<{ text: string; search: string }> = ({ text, search }) => {
  if (!search) return <>{text}</>;
  const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-[var(--accent-color)]/25 text-[var(--accent-color)] font-semibold rounded-sm px-0.5 border-b border-[var(--accent-color)]/45">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'major' | 'minor' | 'patch'>('all');

  // Multi-dimensional Release statistics
  const stats = useMemo(() => {
    let totalChanges = 0;
    const typeCounts = { major: 0, minor: 0, patch: 0 };
    CHANGELOG.forEach(entry => {
      totalChanges += entry.changes.length;
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + entry.changes.length;
    });
    return {
      totalChanges,
      typeCounts,
      totalVersions: CHANGELOG.length,
      latestVersion: CHANGELOG[0]?.version || '1.0.0',
    };
  }, []);

  // Filter and Search process
  const filteredChangelog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return CHANGELOG.map(entry => {
      // If we are on a specific tab and the entry type doesn't match, we still want to filter changes
      const matchesTab = activeTab === 'all' || entry.type === activeTab;
      
      // Filter the individual changes in this entry based on search query
      const matchingChanges = entry.changes.filter(change => 
        change.toLowerCase().includes(query)
      );

      // We include this entry if:
      // 1. It matches the tab type AND
      // 2. Either there is no search query, OR there is at least one matching change (or the version matches the query)
      const matchesSearch = !query || 
        matchingChanges.length > 0 || 
        entry.version.toLowerCase().includes(query) ||
        entry.date.toLowerCase().includes(query);

      const finalChanges = query ? matchingChanges : entry.changes;

      return {
        ...entry,
        changes: finalChanges,
        isMatched: matchesTab && matchesSearch,
      };
    }).filter(entry => entry.isMatched && entry.changes.length > 0);
  }, [searchQuery, activeTab]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-2xl bg-[#1e1e1e] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-gray-200"
          >
            {/* Header Area */}
            <div className="p-5 sm:p-6 border-b border-gray-800/80 bg-[#252525]/30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    <Icons.Sparkles size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      {t('changelog.title', 'Release Changelog')}
                      <span className="text-[10px] py-0.5 px-2 bg-gray-800 border border-gray-700 text-gray-400 font-bold rounded-full">
                        v{stats.latestVersion}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                      Track latest features, engine upgrades, and platform bug fixes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800/80 rounded-full transition-all text-gray-400 hover:text-white"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              {/* Multi-Dimensional Release Statistics Row */}
              <div className="grid grid-cols-3 gap-2 bg-gray-900/60 p-2.5 rounded-2xl border border-gray-800/50 text-center">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Latest Release</div>
                  <div className="text-sm font-bold text-white mt-0.5">Aug 24, 2026</div>
                </div>
                <div className="border-x border-gray-800/85">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Versions</div>
                  <div className="text-sm font-bold text-white mt-0.5">{stats.totalVersions} Builds</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Enhancements</div>
                  <div className="text-sm font-bold text-white mt-0.5">{stats.totalChanges} Done</div>
                </div>
              </div>

              {/* Interactive Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search updates (e.g. mp4, layers, script, wand)..."
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-900/85 hover:bg-gray-900 focus:bg-gray-950 border border-gray-800 focus:border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Icons.X size={16} />
                  </button>
                )}
              </div>

              {/* Categorization Filter Pills */}
              <div className="flex flex-wrap gap-1.5 border-t border-gray-800/40 pt-3">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'bg-gray-900/60 text-gray-400 hover:bg-gray-850 hover:text-white border border-gray-800/80'
                  }`}
                >
                  All Updates
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === 'all' ? 'bg-gray-200 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>
                    {stats.totalChanges}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('major')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'major'
                      ? 'bg-purple-650 text-white shadow-md border-purple-500 shadow-purple-900/20'
                      : 'bg-gray-900/60 text-gray-400 hover:bg-gray-850 hover:text-white border border-gray-800/80'
                  }`}
                  style={activeTab === 'major' ? { backgroundColor: 'var(--accent-color)' } : {}}
                >
                  🚀 Major Upgrades
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === 'major' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {stats.typeCounts.major}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('minor')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'minor'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 border-blue-500'
                      : 'bg-gray-900/60 text-gray-400 hover:bg-gray-850 hover:text-white border border-gray-800/80'
                  }`}
                >
                  ✨ Features
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === 'minor' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {stats.typeCounts.minor}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('patch')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'patch'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 border-emerald-500'
                      : 'bg-gray-900/60 text-gray-400 hover:bg-gray-850 hover:text-white border border-gray-800/80'
                  }`}
                >
                  🔧 Fixes
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === 'patch' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {stats.typeCounts.patch}
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable Timeline Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 custom-scrollbar">
              {filteredChangelog.length > 0 ? (
                filteredChangelog.map((entry, index) => {
                  // Determine specific styles based on release category
                  const isMajor = entry.type === 'major';
                  const isMinor = entry.type === 'minor';
                  const isLatest = index === 0 && searchQuery === '' && activeTab === 'all';
                  
                  let badgeBg = 'bg-gray-800 border-gray-700 text-gray-400';
                  let bulletColor = 'bg-gray-500';
                  let ringColor = 'ring-gray-800';
                  
                  if (isMajor) {
                    badgeBg = 'bg-purple-950/40 border-purple-800/60 text-purple-300';
                    bulletColor = 'bg-purple-400';
                    ringColor = 'ring-purple-950';
                  } else if (isMinor) {
                    badgeBg = 'bg-blue-950/40 border-blue-800/60 text-blue-300';
                    bulletColor = 'bg-blue-400';
                    ringColor = 'ring-blue-950';
                  } else {
                    badgeBg = 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300';
                    bulletColor = 'bg-emerald-400';
                    ringColor = 'ring-emerald-950';
                  }

                  return (
                    <div key={entry.version} className="relative group">
                      {/* Timeline vertical connector rail */}
                      {index !== filteredChangelog.length - 1 && (
                        <div className="absolute left-4 top-11 bottom-0 w-0.5 bg-gray-800 -mb-8 group-hover:bg-gray-700 transition-colors" />
                      )}
                      
                      <div className="flex gap-4">
                        {/* Interactive Timeline Node */}
                        <div className={`mt-1.5 w-8.5 h-8.5 rounded-full flex items-center justify-center shrink-0 z-10 border transition-all ${
                          isLatest 
                            ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)] ring-4 ring-[var(--accent-color)]/20 shadow-lg shadow-[var(--accent-color)]/10'
                            : `${badgeBg} ring-4 ${ringColor}`
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-tight">
                            {isMajor ? 'MJ' : isMinor ? 'FT' : 'FX'}
                          </span>
                        </div>

                        {/* Details Card */}
                        <div className="space-y-3 pb-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-black text-base flex items-center gap-2 ${isLatest ? 'text-white' : 'text-gray-200'}`}>
                              v{entry.version}
                            </h3>
                            
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold bg-gray-900/40 px-2 py-0.5 rounded-md border border-gray-800/50">
                              <Icons.Clock size={11} />
                              {entry.date}
                            </span>

                            {isLatest && (
                              <span 
                                className="px-2 py-0.5 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-sm"
                                style={{ backgroundColor: 'var(--accent-color)' }}
                              >
                                {t('changelog.latest', 'LATEST')}
                              </span>
                            )}

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${badgeBg}`}>
                              {entry.type === 'major' ? 'Major Release' : entry.type === 'minor' ? 'Enhancement' : 'Maintenance'}
                            </span>
                          </div>

                          <ul className="space-y-2.5 bg-gray-900/20 hover:bg-gray-900/30 p-3.5 rounded-2xl border border-gray-800/40 hover:border-gray-800/75 transition-all">
                            {entry.changes.map((change, i) => (
                              <li key={i} className="flex gap-2.5 text-sm text-gray-300 leading-relaxed group/item">
                                <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 group-hover/item:scale-125 transition-transform ${bulletColor}`} />
                                <span className="flex-1">
                                  <HighlightText text={change} search={searchQuery} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-gray-900/80 border border-gray-800 flex items-center justify-center text-gray-500 shadow-inner">
                    <Icons.Help size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">No matching updates found</h3>
                    <p className="text-xs text-gray-500 max-w-xs mt-1">
                      No release notes match your query "<span className="text-gray-400 font-semibold">{searchQuery}</span>" under the selected category.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                    className="px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-xs font-bold text-white rounded-xl transition-all"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              )}
            </div>

            {/* Footer Action Strip */}
            <div className="p-5 border-t border-gray-800 bg-[#252525]/30 flex items-center justify-between gap-4">
              <span className="text-[11px] text-gray-500 font-semibold hidden sm:inline-block">
                Enjoying ClipAnim Creator? Keep animating!
              </span>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md hover:brightness-110 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                <Icons.Check size={18} />
                {t('changelog.gotIt', 'Dismiss Updates')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

