import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Frame, ToolType, Layer, LayerFolder, SelectionState, AudioTrack, ShapeType, ProjectData, ProjectMeta, ProjectFolder, BrushType, OnionSkinSettings, Shortcuts, BackpackItem, BackgroundSettings, SymmetryMode, Point, Actor } from './types';
import { CanvasArea, CanvasAreaHandle } from './components/CanvasArea';
import { Timeline } from './components/Timeline';
import { Toolbar } from './components/Toolbar';
import { Icons } from './Icons';
import { ScriptEditorModal } from './components/ScriptEditorModal';
import { InteractivePlayer } from './components/InteractivePlayer';
import { SettingsModal } from './components/SettingsModal';
import { LayerPanel } from './components/LayerPanel';
import { SymbolPanel } from './components/SymbolPanel';
import { SpritesheetExportModal } from './components/SpritesheetExportModal';
import { ExportModal, ExportFormat, ExportQuality } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { TutorialModal } from './components/TutorialModal';
import { InteractiveTour } from './components/InteractiveTour';
import { BackpackModal } from './components/BackpackModal';
import { QuickBackpackDock } from './components/QuickBackpackDock';
import gifshot from 'gifshot';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { FrameManagerModal } from './components/FrameManagerModal';
import { AudioRecorderModal } from './components/AudioRecorderModal';
import { AudioEditorModal } from './components/AudioEditorModal';
import { SoundLibraryModal } from './components/SoundLibraryModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { AssetLibraryModal } from './components/AssetLibraryModal';
import { ChangelogModal } from './components/ChangelogModal';
import { VideoImportModal } from './components/VideoImportModal';
import { TweenModal } from './components/TweenModal';
import { FolderModal } from './components/FolderModal';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { compositeLayers, drawSelectionOntoCanvas } from './utils/drawingUtils';
import { getLayerStats, renderTweenLayer, renderMotionPathStep } from './utils/motionBlurUtils';
import { generateLiveHtmlGame } from './utils/htmlGameExporter';
import { saveProjectToDB, loadProjectFromDB, getProjectList, deleteProjectFromDB, updateProjectFolderInDB } from './utils/db';

// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import * as Mp4Muxer from 'mp4-muxer';

const createDefaultLayer = (id = '1', name = 'Layer 1'): Layer => ({
  id,
  name,
  isVisible: true,
  isLocked: false,
  opacity: 1,
  blendMode: 'source-over'
});

const createBlankFrame = (layers: Layer[], width: number, height: number, id: string = crypto.randomUUID()): Frame => {
  const layerData: Record<string, string> = {};
  layers.forEach(layer => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      layerData[layer.id] = canvas.toDataURL();
  });
  return { id, layers: layerData, thumbnailUrl: '' };
};

const COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];

export default function App() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.dir();
  }, [i18n.language]);

  const [view, setView] = useState<'menu' | 'editor'>('menu');
  const [savedProjects, setSavedProjects] = useState<ProjectMeta[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [deviceType, setDeviceType] = useState<'mobile' | 'pc' | null>(() => {
    const saved = localStorage.getItem('clipanim_device_type');
    return (saved as 'mobile' | 'pc' | null) || null;
  });

  useEffect(() => {
    if (deviceType) {
      localStorage.setItem('clipanim_device_type', deviceType);
    }
  }, [deviceType]);

  // Global Settings
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isVideoImportOpen, setIsVideoImportOpen] = useState(false);
  const [importingVideoFile, setImportingVideoFile] = useState<File | null>(null);
  const [accentColor, setAccentColor] = useState('#FF3B30');
  const [uiFont, setUiFont] = useState('ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    const saved = localStorage.getItem('clipanim_theme');
    return (saved as 'dark' | 'light' | 'system') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('clipanim_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  const [shortcuts, setShortcuts] = useState<Shortcuts>(() => {
    const defaultShortcuts: Shortcuts = {
      selectTool: 'v',
      lassoTool: 'l',
      wandTool: 'w',
      penTool: 'b',
      eraserTool: 'e',
      fillTool: 'g',
      shapeTool: 'u',
      textTool: 't',
      playPause: 'Space',
      nextFrame: 'ArrowRight',
      prevFrame: 'ArrowLeft',
      addFrame: 'n',
      deleteFrame: 'Backspace',
      undo: 'Ctrl+z',
      redo: 'Ctrl+y',
    };
    try {
      const saved = localStorage.getItem('clipanim_shortcuts');
      if (saved) {
        return { ...defaultShortcuts, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultShortcuts;
  });

  useEffect(() => {
    localStorage.setItem('clipanim_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    const CURRENT_VERSION = '1.3.3';
    const lastSeenVersion = localStorage.getItem('clipanim_last_seen_version');
    
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsChangelogOpen(true);
      localStorage.setItem('clipanim_last_seen_version', CURRENT_VERSION);
    }
  }, []);

  const [projectId, setProjectId] = useState<string>(crypto.randomUUID());
  const [projectName, setProjectName] = useState(t('app.defaultProjectName'));
  const [projectType, setProjectType] = useState<'animation' | 'painting' | 'game'>('animation');
  const [folderId, setFolderId] = useState<string | null>(null);

  // Folder system state
  const [folders, setFolders] = useState<ProjectFolder[]>(() => {
    try {
      const saved = localStorage.getItem('clipanim_folders');
      const parsed = saved ? JSON.parse(saved) : [
        { id: 'folder-animations', name: 'Animations', color: '#FF3B30', createdAt: Date.now() - 1000 },
        { id: 'folder-paintings', name: 'Paintings & Art', color: '#AF52DE', createdAt: Date.now() - 500 }
      ];
      if (!parsed.some((f: any) => f.id === 'folder-paint-example')) {
        parsed.push({ id: 'folder-paint-example', name: 'Paint Example', color: '#34C759', createdAt: Date.now() });
      }
      return parsed;
    } catch {
      return [
        { id: 'folder-animations', name: 'Animations', color: '#FF3B30', createdAt: Date.now() - 1000 },
        { id: 'folder-paintings', name: 'Paintings & Art', color: '#AF52DE', createdAt: Date.now() - 500 },
        { id: 'folder-paint-example', name: 'Paint Example', color: '#34C759', createdAt: Date.now() }
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('clipanim_folders', JSON.stringify(folders));
  }, [folders]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [homeFilter, setHomeFilter] = useState<'all' | 'animations' | 'paintings' | 'folders' | 'games'>('all');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [homeSortBy, setHomeSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [homeSortOrder, setHomeSortOrder] = useState<'asc' | 'desc'>('desc');

  // Folder Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ProjectFolder | null>(null);
  const [movingProject, setMovingProject] = useState<{ id: string; name: string; folderId?: string | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ProjectFolder | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [background, setBackground] = useState<BackgroundSettings>({ type: 'color', color: '#ffffff' });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [layers, setLayers] = useState<Layer[]>([createDefaultLayer()]);
  const [layerFolders, setLayerFolders] = useState<LayerFolder[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isSymbolPanelOpen, setIsSymbolPanelOpen] = useState(false);

  const [mainProjectBackup, setMainProjectBackup] = useState<any>(null);
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);

  const [frames, setFrames] = useState<Frame[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [projectScript, setProjectScript] = useState<string>('');
  const [history, setHistory] = useState<Frame[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [tool, setTool] = useState<ToolType>('pen');
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>('none');
  const [customBrushes, setCustomBrushes] = useState<string[]>([]);
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>(() => {
    const saved = localStorage.getItem('backpackItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [isSelectingForBackpack, setIsSelectingForBackpack] = useState(false);
  const [isQuickBackpackDockOpen, setIsQuickBackpackDockOpen] = useState(false);

  const [penSize, setPenSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(30);
  const [shapeSize, setShapeSize] = useState(5);
  const [pendingMotionPath, setPendingMotionPath] = useState<Point[] | null>(null);
  const [textToolFont, setTextToolFont] = useState('sans-serif');
  const [textToolBold, setTextToolBold] = useState(false);
  const [textToolItalic, setTextToolItalic] = useState(false);
  const [fillOpacity, setFillOpacity] = useState(1);
  const [fillTolerance, setFillTolerance] = useState(0);
  const [smoothing, setSmoothing] = useState(0);

  const [onionSkin, setOnionSkin] = useState(false);
  const [onionSkinSettings, setOnionSkinSettings] = useState<OnionSkinSettings>({
    beforeColor: '#FF3B30',
    afterColor: '#34C759',
    beforeOpacity: 0.3,
    afterOpacity: 0.3,
    numBefore: 1,
    numAfter: 1
  });
  const [showGrid, setShowGrid] = useState(false);
  const [fps, setFps] = useState(12);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  const [isTestingMovie, setIsTestingMovie] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isInteractiveTourActive, setIsInteractiveTourActive] = useState(false);
  const [interactiveTourMode, setInteractiveTourMode] = useState<'all' | 'painting' | 'games'>('all');
  const [isFrameManagerOpen, setIsFrameManagerOpen] = useState(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
  const [isAudioEditorOpen, setIsAudioEditorOpen] = useState(false);
  const [isSoundLibraryOpen, setIsSoundLibraryOpen] = useState(false);
  const [savedSounds, setSavedSounds] = useState<{ name: string; url: string }[]>(() => {
    const saved = localStorage.getItem('clipanim_saved_sounds');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleCreateOrUpdateFolder = (name: string, color: string) => {
    if (editingFolder) {
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? { ...f, name, color } : f));
      setEditingFolder(null);
    } else {
      const newF: ProjectFolder = {
        id: `folder-${crypto.randomUUID()}`,
        name,
        color,
        createdAt: Date.now()
      };
      setFolders(prev => [...prev, newF]);
    }
  };

  const handleDeleteFolder = async (folder: ProjectFolder) => {
    setFolders(prev => prev.filter(f => f.id !== folder.id));
    const affected = savedProjects.filter(p => p.folderId === folder.id);
    for (const p of affected) {
      await updateProjectFolderInDB(p.id, null);
    }
    const updatedList = await getProjectList();
    setSavedProjects(updatedList);
    if (currentFolderId === folder.id) {
      setCurrentFolderId(null);
    }
    setFolderToDelete(null);
  };

  const handleMoveProjectToFolder = async (projectId: string, targetFolderId: string | null) => {
    try {
      await updateProjectFolderInDB(projectId, targetFolderId);
      setSavedProjects(prev => prev.map(p => p.id === projectId ? { ...p, folderId: targetFolderId } : p));
    } catch (e) {
      console.error("Failed to move project", e);
    }
  };

  const currentFolder = useMemo(() => {
    return folders.find(f => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  const totalAnimationsCount = useMemo(() => savedProjects.filter(p => p.type === 'animation' || !p.type).length, [savedProjects]);
  const totalPaintingsCount = useMemo(() => savedProjects.filter(p => p.type === 'painting').length, [savedProjects]);
  const totalGamesCount = useMemo(() => savedProjects.filter(p => p.type === 'game').length, [savedProjects]);

  const displayProjects = useMemo(() => {
    let list = [...savedProjects];

    // Filter by current folder if inside one
    if (currentFolderId !== null) {
      list = list.filter(p => p.folderId === currentFolderId);
    }

    // Filter by category tab
    if (homeFilter === 'animations') {
      list = list.filter(p => p.type === 'animation' || !p.type);
    } else if (homeFilter === 'paintings') {
      list = list.filter(p => p.type === 'painting');
    } else if (homeFilter === 'games') {
      list = list.filter(p => p.type === 'game');
    }

    // Search query
    if (homeSearchQuery.trim()) {
      const q = homeSearchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      if (homeSortBy === 'date') {
        const valA = a.lastModified || 0;
        const valB = b.lastModified || 0;
        return homeSortOrder === 'desc' ? valB - valA : valA - valB;
      } else if (homeSortBy === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return homeSortOrder === 'desc' ? -cmp : cmp;
      } else if (homeSortBy === 'type') {
        const typeA = a.type === 'painting' ? 'Painting' : 'Animation';
        const typeB = b.type === 'painting' ? 'Painting' : 'Animation';
        const cmp = typeA.localeCompare(typeB);
        if (cmp !== 0) return homeSortOrder === 'desc' ? -cmp : cmp;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [savedProjects, currentFolderId, homeFilter, homeSearchQuery, homeSortBy, homeSortOrder]);

  const displayFolders = useMemo(() => {
    if (currentFolderId !== null && homeFilter !== 'folders') {
      return [];
    }
    let list = [...folders];
    if (homeSearchQuery.trim()) {
      const q = homeSearchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort folders
    list.sort((a, b) => {
      if (homeSortBy === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return homeSortOrder === 'desc' ? -cmp : cmp;
      } else {
        const valA = a.createdAt || 0;
        const valB = b.createdAt || 0;
        return homeSortOrder === 'desc' ? valB - valA : valA - valB;
      }
    });

    return list;
  }, [folders, currentFolderId, homeFilter, homeSearchQuery, homeSortBy, homeSortOrder]);
  
  // Auto-saver states (saves every 5 minutes = 300 seconds)
  const [autoSaveTimer, setAutoSaveTimer] = useState<number>(300);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'warning' | 'saved'>('idle');
  const saveProjectRef = useRef<(() => Promise<void>) | null>(null);
  
  
  useEffect(() => {
    localStorage.setItem('clipanim_saved_sounds', JSON.stringify(savedSounds));
  }, [savedSounds]);

  const handleToggleSaveSound = (sound: { name: string; url: string }) => {
    setSavedSounds(prev => {
      const exists = prev.find(s => s.url === sound.url);
      if (exists) {
        return prev.filter(s => s.url !== sound.url);
      }
      return [...prev, sound];
    });
  };

  const frameTimings = useMemo(() => {
    let currentTime = 0;
    return frames.map(f => {
      const duration = (f.durationMultiplier || 1) / fps;
      const start = currentTime;
      currentTime += duration;
      return { start, duration, end: currentTime };
    });
  }, [frames, fps]);

  const updateAllThumbnails = async (newBackground?: BackgroundSettings, newBgImage?: string | null) => {
    const bg = newBackground !== undefined ? newBackground : background;
    const bgImage = newBgImage !== undefined ? newBgImage : backgroundImage;
    
    const updatedFrames = await Promise.all(frames.map(async (f) => {
        const thumb = await compositeLayers(f, layers, canvasSize.width, canvasSize.height, bg, bgImage, false);
        return { ...f, thumbnailUrl: thumb };
    }));
    setFrames(updatedFrames);
  };

  useEffect(() => {
    if (!isSettingsOpen && view === 'editor' && frames.length > 0) {
        updateAllThumbnails();
    }
  }, [isSettingsOpen]);

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [clipboard, setClipboard] = useState<SelectionState | null>(null);

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSpritesheetExportOpen, setIsSpritesheetExportOpen] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFile, setExportedFile] = useState<{ url: string, name: string, blob: Blob } | null>(null);
  const [tweenTargetIndex, setTweenTargetIndex] = useState<number | null>(null);
  const isExportCancelledRef = useRef(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const importIntoSelectionRef = useRef<HTMLInputElement>(null);
  const importGeneralImageRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const scrubTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<CanvasAreaHandle>(null);

  const currentStrokeWidth = tool === 'eraser' ? eraserSize : tool === 'shape' ? shapeSize : penSize;

  const handleStrokeWidthChange = (width: number) => {
      if (tool === 'eraser') setEraserSize(width);
      else if (tool === 'shape') setShapeSize(width);
      else setPenSize(width);
  };

  useEffect(() => {
    localStorage.setItem('backpackItems', JSON.stringify(backpackItems));
  }, [backpackItems]);

  useEffect(() => {
    if (tool !== 'select' && isSelectingForBackpack) {
      setIsSelectingForBackpack(false);
    }
  }, [tool]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--ui-font', uiFont);
  }, [accentColor, uiFont]);

  useEffect(() => {
      const fetchProjects = async () => {
          try {
              if (!localStorage.getItem('clipanim_seeded_paint_example_v3')) {
                  const canvas = document.createElement('canvas');
                  canvas.width = 800;
                  canvas.height = 600;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.fillStyle = '#012169';
                      ctx.fillRect(0, 0, 800, 600);
                      ctx.strokeStyle = '#ffffff';
                      ctx.lineWidth = 120;
                      ctx.beginPath();
                      ctx.moveTo(0, 0); ctx.lineTo(800, 600);
                      ctx.moveTo(800, 0); ctx.lineTo(0, 600);
                      ctx.stroke();
                      ctx.strokeStyle = '#C8102E';
                      ctx.lineWidth = 80;
                      ctx.beginPath();
                      ctx.moveTo(0, 0); ctx.lineTo(800, 600);
                      ctx.moveTo(800, 0); ctx.lineTo(0, 600);
                      ctx.stroke();
                      ctx.strokeStyle = '#ffffff';
                      ctx.lineWidth = 160;
                      ctx.beginPath();
                      ctx.moveTo(400, 0); ctx.lineTo(400, 600);
                      ctx.moveTo(0, 300); ctx.lineTo(800, 300);
                      ctx.stroke();
                      ctx.strokeStyle = '#C8102E';
                      ctx.lineWidth = 100;
                      ctx.beginPath();
                      ctx.moveTo(400, 0); ctx.lineTo(400, 600);
                      ctx.moveTo(0, 300); ctx.lineTo(800, 300);
                      ctx.stroke();
                  }
                  const dataUrl = canvas.toDataURL();
                  const exampleProject = {
                      id: "345b4349-9a37-4252-b6d1-44ead85c868e",
                      name: "Union Jack - Painting Example",
                      lastModified: Date.now(),
                      thumbnailUrl: dataUrl,
                      type: 'painting' as const,
                      folderId: 'folder-paint-example',
                      canvasSize: { width: 800, height: 600 },
                      background: { type: 'color' as const, color: '#ffffff' },
                      backgroundImage: null,
                      layers: [{ id: '1', name: 'New Layer 1', isVisible: true, isLocked: false, opacity: 1, blendMode: 'source-over' as GlobalCompositeOperation }],
                      frames: [{ id: '11fe5d90-9470-4bb6-95e3-7ed5f2db6fb9', layers: { '1': dataUrl } }],
                      fps: 12,
                      audioTracks: [],
                      motionPaths: [],
                      onionSkinSettings: { beforeColor: '#FF3B30', afterColor: '#34C759', beforeOpacity: 0.3, afterOpacity: 0.3, numBefore: 1, numAfter: 1 }
                  };
                  await saveProjectToDB(exampleProject);
                  localStorage.setItem('clipanim_seeded_paint_example_v3', 'true');
              }
              const rawProjects = await getProjectList();
              const unionJackId = "345b4349-9a37-4252-b6d1-44ead85c868e";
              const projectsToKeep: ProjectMeta[] = [];

              for (const proj of rawProjects) {
                  const isUnionJack = proj.id === unionJackId || proj.name.toLowerCase().includes('union jack');
                  const isOtherExample = proj.id.startsWith('example-') ||
                                         proj.folderId === 'folder-examples' ||
                                         (proj.name.toLowerCase().includes('example') && !isUnionJack);
                  
                  if (isOtherExample) {
                      await deleteProjectFromDB(proj.id);
                  } else {
                      projectsToKeep.push(proj);
                  }
              }

              setSavedProjects(projectsToKeep);
          } catch (e) {
              console.error("Failed to load project list", e);
          }
      };
      fetchProjects();
  }, []);

  const addLayer = (folderId?: string | null) => {
    const newLayerId = crypto.randomUUID();
    const newLayer: Layer = {
      ...createDefaultLayer(newLayerId, `${t('layers.newLayer')} ${layers.length + 1}`),
      folderId: folderId || null
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newLayerId);

    const updatedFrames = frames.map(frame => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      return {
        ...frame,
        layers: { ...frame.layers, [newLayerId]: canvas.toDataURL() }
      };
    });
    updateFramesWithHistory(updatedFrames);
    setHasUnsavedChanges(true);
  };

  const addLayerFolder = (name?: string) => {
    const newFolderId = crypto.randomUUID();
    const folderColors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'];
    const assignedColor = folderColors[layerFolders.length % folderColors.length];
    const newFolder: LayerFolder = {
      id: newFolderId,
      name: name || `Folder ${layerFolders.length + 1}`,
      isExpanded: true,
      isVisible: true,
      isLocked: false,
      color: assignedColor
    };
    setLayerFolders([...layerFolders, newFolder]);
    setHasUnsavedChanges(true);
  };

  const removeLayerFolder = (folderId: string, deleteLayers: boolean = false) => {
    if (deleteLayers) {
      const remainingLayers = layers.filter(l => l.folderId !== folderId);
      if (remainingLayers.length === 0) {
        const fallbackLayer = createDefaultLayer(crypto.randomUUID(), `${t('layers.newLayer')} 1`);
        setLayers([fallbackLayer]);
        setActiveLayerId(fallbackLayer.id);
      } else {
        setLayers(remainingLayers);
        if (!remainingLayers.some(l => l.id === activeLayerId)) {
          setActiveLayerId(remainingLayers[remainingLayers.length - 1].id);
        }
      }
      const deletedLayerIds = new Set(layers.filter(l => l.folderId === folderId).map(l => l.id));
      const updatedFrames = frames.map(frame => {
        const newFrameLayers = { ...frame.layers };
        deletedLayerIds.forEach(id => delete newFrameLayers[id]);
        return { ...frame, layers: newFrameLayers };
      });
      updateFramesWithHistory(updatedFrames);
    } else {
      setLayers(layers.map(l => l.folderId === folderId ? { ...l, folderId: null } : l));
    }
    setLayerFolders(layerFolders.filter(f => f.id !== folderId));
    setHasUnsavedChanges(true);
  };

  const toggleLayerFolderVisibility = (folderId: string) => {
    setLayerFolders(layerFolders.map(f => f.id === folderId ? { ...f, isVisible: !f.isVisible } : f));
    setHasUnsavedChanges(true);
  };

  const toggleLayerFolderLock = (folderId: string) => {
    setLayerFolders(layerFolders.map(f => f.id === folderId ? { ...f, isLocked: !f.isLocked } : f));
    setHasUnsavedChanges(true);
  };

  const toggleLayerFolderExpanded = (folderId: string) => {
    setLayerFolders(layerFolders.map(f => f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f));
  };

  const renameLayerFolder = (folderId: string, name: string) => {
    setLayerFolders(layerFolders.map(f => f.id === folderId ? { ...f, name } : f));
    setHasUnsavedChanges(true);
  };

  const setLayerFolderColor = (folderId: string, color?: string) => {
    setLayerFolders(layerFolders.map(f => f.id === folderId ? { ...f, color } : f));
    setHasUnsavedChanges(true);
  };

  const moveLayerToFolder = (layerId: string, folderId: string | null) => {
    setLayers(layers.map(l => l.id === layerId ? { ...l, folderId } : l));
    setHasUnsavedChanges(true);
  };

  const reorderLayerFolders = (newFolders: LayerFolder[]) => {
    setLayerFolders(newFolders);
    setHasUnsavedChanges(true);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) setActiveLayerId(newLayers[newLayers.length - 1].id);

    const updatedFrames = frames.map(frame => {
      const { [id]: removed, ...rest } = frame.layers;
      return { ...frame, layers: rest };
    });
    updateFramesWithHistory(updatedFrames);
    setHasUnsavedChanges(true);
  };

  const duplicateLayer = (id: string) => {
    const layerIndex = layers.findIndex(l => l.id === id);
    if (layerIndex === -1) return;
    const layerToCopy = layers[layerIndex];

    const newLayerId = crypto.randomUUID();
    const newLayer: Layer = {
        ...layerToCopy,
        id: newLayerId,
        name: `${layerToCopy.name} ${t('common.copy')}`,
        isVisible: true
    };

    const newLayers = [...layers];
    newLayers.splice(layerIndex + 1, 0, newLayer);
    setLayers(newLayers);
    setActiveLayerId(newLayerId);

    const updatedFrames = frames.map(frame => {
        const sourceData = frame.layers[id];
        if (!sourceData) {
            const canvas = document.createElement('canvas');
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;
            return {
                ...frame,
                layers: { ...frame.layers, [newLayerId]: canvas.toDataURL() }
            };
        }
        return {
            ...frame,
            layers: { ...frame.layers, [newLayerId]: sourceData }
        };
    });
    
    updateFramesWithHistory(updatedFrames);
    setHasUnsavedChanges(true);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l));
    setHasUnsavedChanges(true);
  };

  const toggleLayerLock = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l));
    setHasUnsavedChanges(true);
  };

  const renameLayer = (id: string, newName: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, name: newName } : l));
    setHasUnsavedChanges(true);
  };

  const updateLayerSettings = (id: string, opacity: number, blendMode: GlobalCompositeOperation) => {
    setLayers(layers.map(l => l.id === id ? { ...l, opacity, blendMode } : l));
    setHasUnsavedChanges(true);
  };

  const reorderLayers = (newLayers: Layer[]) => {
    setLayers(newLayers);
    setHasUnsavedChanges(true);
  };

  // 2. Updated Handle Import Image with Correct GIF Parsing
  const handleImportImage = async (file: File) => {
    const reader = new FileReader();

    // --- GIF IMPORT LOGIC ---
    if (file.type === 'image/gif') {
        reader.onload = async (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            try {
                // Parse
                const gif = parseGIF(buffer);
                const framesData = decompressFrames(gif, true);
                
                const newFrames: Frame[] = await Promise.all(framesData.map(async (gifFrame: any) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasSize.width;
                    canvas.height = canvasSize.height;
                    const ctx = canvas.getContext('2d')!;
                    
                    // Create a temporary canvas to draw the GIF frame "patch"
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = gifFrame.dims.width;
                    tempCanvas.height = gifFrame.dims.height;
                    const tempCtx = tempCanvas.getContext('2d')!;
                    const imgData = tempCtx.createImageData(gifFrame.dims.width, gifFrame.dims.height);
                    
                    // Set the pixel data
                    imgData.data.set(gifFrame.patch);
                    tempCtx.putImageData(imgData, 0, 0);
                    
                    // Draw onto the main project-sized canvas
                    ctx.drawImage(tempCanvas, gifFrame.dims.left, gifFrame.dims.top);
                    const dataUrl = canvas.toDataURL();
                    
                    const layerData: Record<string, string> = {};
                    layers.forEach(l => {
                        // Put the GIF frame on the active layer, blank others
                        if (l.id === activeLayerId) {
                            layerData[l.id] = dataUrl;
                        } else {
                            const blank = document.createElement('canvas');
                            blank.width = canvasSize.width;
                            blank.height = canvasSize.height;
                            layerData[l.id] = blank.toDataURL();
                        }
                    });

                    const frameObj: Frame = {
                        id: crypto.randomUUID(),
                        layers: layerData,
                        thumbnailUrl: '' // Will be set below
                    };
                    
                    frameObj.thumbnailUrl = await compositeLayers(frameObj, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
                    return frameObj;
                }));

                // Insert all GIF frames into the timeline
                const updatedFrames = [...frames];
                updatedFrames.splice(currentFrameIndex + 1, 0, ...newFrames);
                
                // Update states
                setFrames(updatedFrames);
                setCurrentFrameIndex(currentFrameIndex + 1);
                setHasUnsavedChanges(true);
                
                console.log(`Successfully imported ${newFrames.length} GIF frames`);
            } catch (err) {
                console.error("GIF Error:", err);
                alert(t('errors.gifError'));
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // --- STANDARD IMAGE LOGIC (PNG/JPG) ---
    reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
            const maxWidth = canvasSize.width * 0.8;
            const ratio = img.width / img.height;
            const width = Math.min(img.width, maxWidth);
            const height = width / ratio;
            const x = (canvasSize.width - width) / 2;
            const y = (canvasSize.height - height) / 2;
            setSelection({
              x,
              y,
              width,
              height,
              dataUrl: result,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              anchorX: width / 2,
              anchorY: height / 2
            });
            setTool('select');
            setHasUnsavedChanges(true);
        };
        img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleInsertLibraryImage = (url: string) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = canvasSize.width * 0.8;
      const ratio = img.width / img.height;
      const width = Math.min(img.width, maxWidth);
      const height = width / ratio;
      const x = (canvasSize.width - width) / 2;
      const y = (canvasSize.height - height) / 2;
      setSelection({
        x,
        y,
        width,
        height,
        dataUrl: url,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: width / 2,
        anchorY: height / 2
      });
      setTool('select');
      setHasUnsavedChanges(true);
      setIsAssetLibraryOpen(false);
    };
    img.src = url;
  };

  const handleImportVideo = async (extractedFrames: string[], importAudio: boolean, trimStart: number, trimEnd: number) => {
    const file = importingVideoFile;
    setIsVideoImportOpen(false);
    setImportingVideoFile(null);
    if (extractedFrames.length === 0) return;

    const newFrames = [...frames];
    const insertedFrames: Frame[] = [];

    for (const frameDataUrl of extractedFrames) {
      const newFrame = createBlankFrame(layers, canvasSize.width, canvasSize.height);
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = frameDataUrl;
        });
        
        const scale = Math.min(canvasSize.width / img.width, canvasSize.height / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (canvasSize.width - drawWidth) / 2;
        const offsetY = (canvasSize.height - drawHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        newFrame.layers[activeLayerId] = canvas.toDataURL('image/png');
      }
      
      newFrame.thumbnailUrl = await compositeLayers(newFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
      insertedFrames.push(newFrame);
    }

    newFrames.splice(currentFrameIndex + 1, 0, ...insertedFrames);
    updateFramesWithHistory(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setHasUnsavedChanges(true);

    if (importAudio && file) {
      const url = URL.createObjectURL(file);
      const id = crypto.randomUUID();
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
          const newTrack: AudioTrack = {
              id,
              url,
              name: file.name + ' (Audio)',
              color: COLORS[audioTracks.length % COLORS.length],
              volume: 1,
              startTime: (currentFrameIndex + 1) / fps,
              duration: trimEnd - trimStart,
              offset: trimStart
          };
          audioElementsRef.current.set(id, audio);
          setAudioTracks(prev => [...prev, newTrack]);
      };
    }
  };

  const handleAddAudioTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = crypto.randomUUID();
      const audio = new Audio(url);
      audio.onloadedmetadata = async () => {
          console.log("Audio loaded, duration:", audio.duration, "fps:", fps);
          if (isNaN(audio.duration)) {
            console.error("Audio duration is NaN");
            return;
          }
          const numFrames = Math.max(1, Math.ceil(audio.duration * fps));
          console.log("Adding frames:", numFrames);
          await addBlankFrames(numFrames);
          
          const newTrack: AudioTrack = {
              id,
              url,
              name: file.name,
              color: COLORS[audioTracks.length % COLORS.length],
              volume: 1,
              startTime: 0,
              duration: audio.duration,
              offset: 0
          };
          audioElementsRef.current.set(id, audio);
          setAudioTracks(prev => [...prev, newTrack]);
          setHasUnsavedChanges(true);
      };
  };

  const handleAddRecordedAudio = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const id = crypto.randomUUID();
      const audio = new Audio(url);
      audio.onloadedmetadata = async () => {
          console.log("Audio loaded, duration:", audio.duration, "fps:", fps);
          if (isNaN(audio.duration)) {
            console.error("Audio duration is NaN");
            return;
          }
          const numFrames = Math.max(1, Math.ceil(audio.duration * fps));
          console.log("Adding frames:", numFrames);
          await addBlankFrames(numFrames);
          
          const newTrack: AudioTrack = {
              id,
              url,
              name: `${t('common.recording')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              color: COLORS[audioTracks.length % COLORS.length],
              volume: 1,
              startTime: 0,
              duration: audio.duration,
              offset: 0
          };
          audioElementsRef.current.set(id, audio);
          setAudioTracks(prev => [...prev, newTrack]);
          setHasUnsavedChanges(true);
          setIsAudioRecorderOpen(false);
      };
  };

  const handleUpdateAudioTrack = (id: string, updates: Partial<AudioTrack>) => {
    setAudioTracks(prev => prev.map(t => {
        if (t.id === id) {
            const updated = { ...t, ...updates };
            const audio = audioElementsRef.current.get(id);
            if (audio) {
                if (updates.volume !== undefined) audio.volume = updates.volume;
            }
            return updated;
        }
        return t;
    }));
    setHasUnsavedChanges(true);
  };

  const handleCutAudioTrack = (id: string, cutTime: number) => {
    const track = audioTracks.find(t => t.id === id);
    if (!track) return;

    const relativeCutTime = cutTime - track.startTime;
    if (relativeCutTime <= 0.1 || relativeCutTime >= track.duration - 0.1) return;

    const firstPart: AudioTrack = {
        ...track,
        duration: relativeCutTime
    };

    const secondPart: AudioTrack = {
        ...track,
        id: crypto.randomUUID(),
        startTime: cutTime,
        duration: track.duration - relativeCutTime,
        offset: track.offset + relativeCutTime
    };

    const audio2 = new Audio(track.url);
    audio2.onloadedmetadata = () => {
        audio2.volume = secondPart.volume;
        audioElementsRef.current.set(secondPart.id, audio2);
        setAudioTracks(prev => prev.flatMap(t => t.id === id ? [firstPart, secondPart] : [t]));
        setHasUnsavedChanges(true);
    };
  };

  const handleAddSoundLibraryTrack = async (url: string, name: string) => {
    try {
      let blob: Blob;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
      } catch (directErr) {
        console.warn("Direct sound fetch failed, using server proxy:", directErr);
        const proxyRes = await fetch(`/api/proxy-audio?url=${encodeURIComponent(url)}`);
        if (!proxyRes.ok) throw new Error(`Proxy error ${proxyRes.status}`);
        blob = await proxyRes.blob();
      }

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      
      audio.onloadedmetadata = () => {
        const trackDuration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 1;
        const newTrack: AudioTrack = {
          id: crypto.randomUUID(),
          url: objectUrl,
          name: name,
          color: `hsl(${Math.floor(Math.random() * 360)}, 75%, 55%)`,
          volume: 1,
          startTime: currentFrameIndex / fps,
          duration: trackDuration,
          offset: 0
        };
        setAudioTracks(prev => [...prev, newTrack]);
        audioElementsRef.current.set(newTrack.id, audio);
        setHasUnsavedChanges(true);
      };

      audio.onerror = () => {
        // Fallback track creation in case metadata load event fails
        const newTrack: AudioTrack = {
          id: crypto.randomUUID(),
          url: objectUrl,
          name: name,
          color: `hsl(${Math.floor(Math.random() * 360)}, 75%, 55%)`,
          volume: 1,
          startTime: currentFrameIndex / fps,
          duration: 2,
          offset: 0
        };
        setAudioTracks(prev => [...prev, newTrack]);
        audioElementsRef.current.set(newTrack.id, audio);
        setHasUnsavedChanges(true);
      };
    } catch (error) {
      console.error("Error adding sound library track:", error);
    }
  };

  const handleRemoveAudioTrack = (id: string) => {
      const trackToRemove = audioTracks.find(t => t.id === id);
      const audio = audioElementsRef.current.get(id);
      
      if (audio) {
          audio.pause();
          audioElementsRef.current.delete(id);
          
          // Only revoke if no other track uses this URL
          const isUrlShared = audioTracks.some(t => t.id !== id && t.url === trackToRemove?.url);
          if (!isUrlShared && trackToRemove) {
              URL.revokeObjectURL(trackToRemove.url);
          }
      }
      
      setAudioTracks(prev => prev.filter(t => t.id !== id));
      setHasUnsavedChanges(true);
  };

  const handleSelectBackpackItem = (item: BackpackItem) => {
    const img = new window.Image();
    img.onload = () => {
      if (selection) {
        const oldWidth = selection.width;
        const oldHeight = selection.height;
        const newAspect = img.width / img.height;
        const oldAspect = oldWidth / oldHeight;

        let newWidth = oldWidth;
        let newHeight = oldHeight;

        if (newAspect > oldAspect) {
          newWidth = oldWidth;
          newHeight = oldWidth / newAspect;
        } else {
          newHeight = oldHeight;
          newWidth = oldHeight * newAspect;
        }

        const oldAnchorX = selection.anchorX ?? oldWidth / 2;
        const oldAnchorY = selection.anchorY ?? oldHeight / 2;
        
        const relAnchorX = oldAnchorX / oldWidth;
        const relAnchorY = oldAnchorY / oldHeight;
        
        const newAnchorX = newWidth * relAnchorX;
        const newAnchorY = newHeight * relAnchorY;

        const newX = selection.x + oldAnchorX - newAnchorX;
        const newY = selection.y + oldAnchorY - newAnchorY;

        setSelection({
          ...selection,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          dataUrl: item.dataUrl,
          anchorX: newAnchorX,
          anchorY: newAnchorY
        });
      } else {
        setSelection({
          x: canvasSize.width / 2 - img.width / 2,
          y: canvasSize.height / 2 - img.height / 2,
          width: img.width,
          height: img.height,
          dataUrl: item.dataUrl,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: img.width / 2,
          anchorY: img.height / 2
        });
      }
      setTool('select');
      setIsBackpackOpen(false);
    };
    img.src = item.dataUrl;
  };

  const handlePackCurrentLayer = () => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;
    const layerData = currentFrame.layers[activeLayerId];
    if (!layerData) return;

    const activeLayerObj = layers.find(l => l.id === activeLayerId);
    const layerName = activeLayerObj ? activeLayerObj.name : `Layer_${activeLayerId}`;

    const newItem: BackpackItem = {
      id: crypto.randomUUID(),
      name: `${layerName}_F${currentFrameIndex + 1}`,
      dataUrl: layerData,
      createdAt: Date.now(),
      category: 'uncategorized'
    };
    setBackpackItems(prev => [newItem, ...prev]);
  };

  const handlePackCurrentFrame = () => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const loadPromises = layers
      .filter(layer => layer.isVisible)
      .map(layer => {
        const layerData = currentFrame.layers[layer.id];
        if (!layerData) return Promise.resolve(null);
        return new Promise<{ img: HTMLImageElement; layer: Layer }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ img, layer });
          img.onerror = () => resolve({ img: new Image(), layer });
          img.src = layerData;
        });
      });

    Promise.all(loadPromises).then(results => {
      results.forEach(res => {
        if (res && res.img.src) {
          ctx.save();
          ctx.globalAlpha = res.layer.opacity ?? 1;
          ctx.globalCompositeOperation = res.layer.blendMode || 'source-over';
          ctx.drawImage(res.img, 0, 0);
          ctx.restore();
        }
      });

      const dataUrl = tempCanvas.toDataURL('image/png');
      const newItem: BackpackItem = {
        id: crypto.randomUUID(),
        name: `Frame_${currentFrameIndex + 1}_Stamp`,
        dataUrl,
        createdAt: Date.now(),
        category: 'uncategorized'
      };
      setBackpackItems(prev => [newItem, ...prev]);
    });
  };

  const handleStampOnLayer = (item: BackpackItem) => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize.width;
      tempCanvas.height = canvasSize.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      const currentLayerData = currentFrame.layers[activeLayerId];
      const proceedDraw = () => {
        const x = (canvasSize.width - img.width) / 2;
        const y = (canvasSize.height - img.height) / 2;
        ctx.drawImage(img, x, y);

        const newLayerData = tempCanvas.toDataURL();
        const updatedFrames = [...frames];
        updatedFrames[currentFrameIndex] = {
          ...currentFrame,
          layers: {
            ...currentFrame.layers,
            [activeLayerId]: newLayerData
          }
        };
        updateFramesWithHistory(updatedFrames);
        setHasUnsavedChanges(true);
      };

      if (currentLayerData) {
        const bgImg = new Image();
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0);
          proceedDraw();
        };
        bgImg.src = currentLayerData;
      } else {
        proceedDraw();
      }
    };
    img.src = item.dataUrl;
  };

  const handlePlaceAsNewLayer = (item: BackpackItem) => {
    const newLayerId = crypto.randomUUID();
    const newLayerName = item.name || `Stamp Layer ${layers.length + 1}`;
    const newLayer: Layer = {
      ...createDefaultLayer(newLayerId, newLayerName),
      folderId: null
    };

    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newLayerId);

    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize.width;
      tempCanvas.height = canvasSize.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      const x = (canvasSize.width - img.width) / 2;
      const y = (canvasSize.height - img.height) / 2;
      ctx.drawImage(img, x, y);

      const stampDataUrl = tempCanvas.toDataURL();
      const updatedFrames = frames.map((frame, idx) => {
        if (idx === currentFrameIndex) {
          return {
            ...frame,
            layers: {
              ...frame.layers,
              [newLayerId]: stampDataUrl
            }
          };
        } else {
          return {
            ...frame,
            layers: {
              ...frame.layers,
              [newLayerId]: ''
            }
          };
        }
      });
      updateFramesWithHistory(updatedFrames);
      setHasUnsavedChanges(true);
    };
    img.src = item.dataUrl;
  };

  const handleConvertToActor = (item: BackpackItem) => {
    const img = new Image();
    img.onload = () => {
      const newActor: Actor = {
        id: crypto.randomUUID(),
        name: item.name || `Symbol_${actors.length + 1}`,
        x: canvasSize.width / 2 - img.width / 2,
        y: canvasSize.height / 2 - img.height / 2,
        width: img.width || 100,
        height: img.height || 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        dataUrl: item.dataUrl,
        opacity: 1,
        scripts: ''
      };
      setActors(prev => [...prev, newActor]);
      setHasUnsavedChanges(true);
    };
    img.src = item.dataUrl;
  };

  const handleSelectionCreate = (newSelection: SelectionState) => {
    if (isSelectingForBackpack) {
      if (newSelection.dataUrl) {
        const newItem: BackpackItem = {
          id: crypto.randomUUID(),
          name: `Canvas_Stamp_${backpackItems.length + 1}`,
          dataUrl: newSelection.dataUrl,
          createdAt: Date.now(),
          category: 'uncategorized'
        };
        setBackpackItems(prev => [newItem, ...prev]);
      }
      setIsSelectingForBackpack(false);
      setSelection(null);
      setIsBackpackOpen(true);
      setTool('pen');
    } else {
      setSelection(newSelection);
    }
  };

  const handleUpdateActorScript = (id: string, script: string) => {
    setActors(prev => prev.map(a => a.id === id ? { ...a, scripts: script } : a));
    setHasUnsavedChanges(true);
  };

  const handleUpdateFrameScript = (index: number, script: string) => {
    setFrames(prev => prev.map((f, i) => i === index ? { ...f, script } : f));
    setHasUnsavedChanges(true);
  };

  const handleUpdateProjectScript = (script: string) => {
    setProjectScript(script);
    setHasUnsavedChanges(true);
  };

  const enterSymbolEditMode = (actorId: string) => {
      const actor = actors.find(a => a.id === actorId);
      if (!actor) return;

      // Backup main project
      setMainProjectBackup({
          frames,
          layers,
          layerFolders,
          activeLayerId,
          actors,
          projectScript,
          history,
          historyIndex,
          currentFrameIndex,
          fps,
          projectId,
          projectName,
          canvasSize,
          background,
          onionSkinSettings
      });

      // Load symbol data
      setEditingSymbolId(actorId);
      setProjectName(`Editing: ${actor.name}`);
      setProjectId(`symbol-${crypto.randomUUID()}`); // prevent overwriting main project
      
      // Crucial: Set canvas to match symbol dimensions so it draws perfectly
      setCanvasSize({ width: actor.width, height: actor.height });
      setBackground({ type: 'color', color: 'transparent' });

      // If symbol has frames, load them, otherwise create one from dataUrl
      if (actor.isAnimated && actor.symbolFrames && actor.symbolFrames.length > 0) {
          setFrames(actor.symbolFrames);
          setLayers(actor.symbolLayers || [createDefaultLayer()]);
          setLayerFolders(actor.symbolLayerFolders || []);
          setActiveLayerId(actor.symbolLayers ? actor.symbolLayers[0].id : '1');
          setFps(actor.symbolFps || fps);
      } else {
          // Static or uninitialized animated symbol
          const defaultLayer = createDefaultLayer();
          const frame: Frame = {
              id: crypto.randomUUID(),
              layers: { [defaultLayer.id]: actor.dataUrl },
              script: ''
          };
          setFrames([frame]);
          setLayers([defaultLayer]);
          setLayerFolders([]);
          setActiveLayerId(defaultLayer.id);
          // Keep current fps
      }

      setActors([]); // Symbols don't have nested actors yet
      setProjectScript(actor.scripts);
      setCurrentFrameIndex(0);
      setHistory([]);
      setHistoryIndex(-1);
      setSelection(null);
      setHasUnsavedChanges(false);
  };

  const exitSymbolEditMode = async () => {
      if (!editingSymbolId || !mainProjectBackup) return;

      const currentLayerData = frames[0]?.thumbnailUrl || frames[0]?.layers[layers[0].id] || '';

      const updatedActors = mainProjectBackup.actors.map((a: Actor) => {
          if (a.id === editingSymbolId) {
              return {
                  ...a,
                  isAnimated: frames.length > 1,
                  symbolFrames: frames,
                  symbolLayers: layers,
                  layerFolders: layerFolders,
                  symbolFps: fps,
                  scripts: projectScript,
                  dataUrl: currentLayerData
              };
          }
          return a;
      });

      // Restore main project
      setFrames(mainProjectBackup.frames);
      setLayers(mainProjectBackup.layers);
      setLayerFolders(mainProjectBackup.layerFolders || []);
      setActiveLayerId(mainProjectBackup.activeLayerId);
      setActors(updatedActors);
      setProjectScript(mainProjectBackup.projectScript);
      setHistory(mainProjectBackup.history);
      setHistoryIndex(mainProjectBackup.historyIndex);
      setCurrentFrameIndex(mainProjectBackup.currentFrameIndex);
      setFps(mainProjectBackup.fps);
      setProjectId(mainProjectBackup.projectId);
      setProjectName(mainProjectBackup.projectName);
      setCanvasSize(mainProjectBackup.canvasSize);
      setBackground(mainProjectBackup.background);
      setOnionSkinSettings(mainProjectBackup.onionSkinSettings);

      setEditingSymbolId(null);
      setMainProjectBackup(null);
      setHasUnsavedChanges(true);
  };

  const handleMakeSymbol = (overrideSelection?: SelectionState) => {
      const activeSel = overrideSelection || selection;
      if (!activeSel) return;
      if (activeSel.actorId) {
          setActors(prev => prev.map(a => 
              a.id === activeSel.actorId 
                  ? { 
                      ...a, 
                      x: activeSel.x, 
                      y: activeSel.y, 
                      width: activeSel.width, 
                      height: activeSel.height, 
                      rotation: activeSel.rotation, 
                      scaleX: activeSel.scaleX, 
                      scaleY: activeSel.scaleY 
                    }
                  : a
          ));
          setSelection(null);
          setHasUnsavedChanges(true);
          return;
      }
      const newActor: Actor = {
          id: crypto.randomUUID(),
          name: `Symbol_${actors.length + 1}`,
          dataUrl: activeSel.dataUrl,
          x: activeSel.x,
          y: activeSel.y,
          width: activeSel.width,
          height: activeSel.height,
          rotation: activeSel.rotation || 0,
          scaleX: activeSel.scaleX ?? 1,
          scaleY: activeSel.scaleY ?? 1,
          opacity: 1,
          targetFrame: currentFrameIndex,
          isAnimated: false,
          scripts: `// Code runs when game starts\nthis.onUpdate = function() {\n  // Runs every frame\n};\n\nthis.onClick = function() {\n  // To control this symbol's timeline:\n  // this.play();\n  // this.gotoAndStop(2);\n\n  // To control the main game timeline:\n  // gotoAndStop(2);\n};`
      };
      setActors(prev => [...prev, newActor]);
      setSelection(null);
      setHasUnsavedChanges(true);
  };

  const handleSelectionDelete = () => {
      if (!selection) return;
      if (selection.actorId) {
          setActors(prev => prev.filter(a => a.id !== selection.actorId));
      }
      setSelection(null);
      setHasUnsavedChanges(true);
  };

  const handleSelectActor = (actorId: string) => {
      const actor = actors.find(a => a.id === actorId);
      if (!actor) return;
      setSelection({
          actorId: actor.id,
          x: actor.x,
          y: actor.y,
          width: actor.width,
          height: actor.height,
          dataUrl: actor.dataUrl,
          rotation: actor.rotation,
          scaleX: actor.scaleX,
          scaleY: actor.scaleY,
          type: 'image',
          selectionType: 'rectangle'
      });
  };

  const handleSelectionCommit = async (overrideSelection?: SelectionState) => {
      const activeSel = overrideSelection || selection;
      if (!activeSel) return;

      if (activeSel.actorId) {
          setActors(prev => prev.map(a => 
              a.id === activeSel.actorId 
                  ? { 
                      ...a, 
                      x: activeSel.x, 
                      y: activeSel.y, 
                      width: activeSel.width, 
                      height: activeSel.height, 
                      rotation: activeSel.rotation, 
                      scaleX: activeSel.scaleX, 
                      scaleY: activeSel.scaleY 
                    }
                  : a
          ));
          setSelection(null);
          setHasUnsavedChanges(true);
          return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const layerData = frames[currentFrameIndex]?.layers?.[activeLayerId];
      if (layerData) {
          try {
              const currentImg = await new Promise<HTMLImageElement>((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve(img);
                  img.onerror = () => resolve(img);
                  img.src = layerData;
              });
              if (currentImg.complete && currentImg.naturalWidth > 0) {
                  ctx.drawImage(currentImg, 0, 0);
              }
          } catch (e) {
              console.warn("Could not draw previous layer data:", e);
          }
      }

      try {
          await drawSelectionOntoCanvas(ctx, activeSel);
      } catch (e) {
          console.error("Error drawing selection onto canvas:", e);
      }
      
      const newDataUrl = canvas.toDataURL();
      await handleUpdateLayer(activeLayerId, newDataUrl);
      setSelection(null);
  };

  const handleApplyMotionPath = async (path: Point[]) => {
      if (!selection || path.length < 5) return;
      setPendingMotionPath(path);
  };

  const finalizeMotionPath = async (
    path: Point[], 
    numFrames: number, 
    easing: string,
    motionBlur: boolean = true,
    motionBlurStrength: number = 0.75,
    motionBlurSamples: number = 7,
    motionBlurShutterAngle: number = 180
  ) => {
      if (!selection || path.length < 5) return;

      const numFramesToAnimate = numFrames;
      const updatedFrames = [...frames];

      let frameIdx = currentFrameIndex;
      const initialLayerData = updatedFrames[currentFrameIndex].layers[activeLayerId];
      
      for (let i = 0; i < numFramesToAnimate; i++) {
          if (frameIdx >= updatedFrames.length) {
              const lastFrame = updatedFrames[updatedFrames.length - 1];
              const newFrame: Frame = {
                  ...lastFrame,
                  id: crypto.randomUUID(),
                  layers: { 
                      ...lastFrame.layers,
                      [activeLayerId]: initialLayerData // Use the "clean" layer with the hole
                  }
              };
              updatedFrames.push(newFrame);
          }

          const frame = updatedFrames[frameIdx];

          const canvas = document.createElement('canvas');
          canvas.width = canvasSize.width;
          canvas.height = canvasSize.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
              const layerData = frame.layers[activeLayerId];
              if (layerData) {
                  const img = await new Promise<HTMLImageElement>(r => {
                      const img = new Image();
                      img.onload = () => r(img);
                      img.src = layerData;
                  });
                  ctx.drawImage(img, 0, 0);
                  
                  // If this is an existing frame (other than the first one), 
                  // it might still have the object. Try to clear it.
                  if (frameIdx > currentFrameIndex && selection.originX !== undefined && selection.originY !== undefined) {
                      ctx.save();
                      ctx.globalCompositeOperation = 'destination-out';
                      if (selection.maskUrl) {
                          const maskImg = await new Promise<HTMLImageElement>(r => {
                              const img = new Image();
                              img.onload = () => r(img);
                              img.src = selection.maskUrl!;
                          });
                          ctx.drawImage(maskImg, selection.originX, selection.originY, selection.width, selection.height);
                      } else {
                          ctx.fillRect(selection.originX, selection.originY, selection.width, selection.height);
                      }
                      ctx.restore();
                  }
              }

              await renderMotionPathStep(
                ctx,
                path,
                selection,
                drawSelectionOntoCanvas,
                i,
                numFramesToAnimate,
                easing,
                motionBlur,
                motionBlurStrength,
                motionBlurSamples,
                motionBlurShutterAngle
              );

              updatedFrames[frameIdx] = {
                  ...updatedFrames[frameIdx],
                  layers: {
                      ...updatedFrames[frameIdx].layers,
                      [activeLayerId]: canvas.toDataURL()
                  }
              };
          }
          frameIdx++;
      }

      setFrames(updatedFrames);
      setSelection(null);
      setHasUnsavedChanges(true);
      setTool('pen');
  };

  const handleExportStart = async (format: ExportFormat, quality: ExportQuality, transparent: boolean = false) => {
    setIsExporting(true);
    setExportProgress(0);
    isExportCancelledRef.current = false;

    const total = frames.length;
    const compositeFrames: string[] = [];

    // Pre-render all frames
    for (let i = 0; i < total; i++) {
      if (isExportCancelledRef.current) {
          setIsExporting(false);
          return;
      }
      const dataUrl = await compositeLayers(frames[i], layers, canvasSize.width, canvasSize.height, background, backgroundImage, !transparent);
      compositeFrames.push(dataUrl);
      setExportProgress(Math.round(((i + 1) / total) * 30));
    }

    if (format === 'mp4') {
        const exportWidth = canvasSize.width % 2 === 0 ? canvasSize.width : canvasSize.width - 1;
        const exportHeight = canvasSize.height % 2 === 0 ? canvasSize.height : canvasSize.height - 1;
        const bitrateMap = {
            low: 1_000_000,
            medium: 4_000_000,
            high: 10_000_000
        };

        let mp4ExportSuccess = false;

        // 1. Attempt WebCodecs + mp4-muxer with feature detection & codec fallback (supports Firefox, Chrome, Safari)
        if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
            try {
                // Determine supported video codec for WebCodecs
                const videoCandidates = [
                    { encoderCodec: 'avc1.42001e', muxerCodec: 'avc' as const },
                    { encoderCodec: 'avc1.42001f', muxerCodec: 'avc' as const },
                    { encoderCodec: 'avc1.4d401f', muxerCodec: 'avc' as const },
                    { encoderCodec: 'avc1.4d002a', muxerCodec: 'avc' as const },
                    { encoderCodec: 'vp09.00.10.08', muxerCodec: 'vp9' as const },
                    { encoderCodec: 'av01.0.04M.08', muxerCodec: 'av1' as const }
                ];

                let selectedVideo: { encoderCodec: string; muxerCodec: 'avc' | 'hevc' | 'vp9' | 'av1' } | null = null;
                for (const cand of videoCandidates) {
                    try {
                        const support = await VideoEncoder.isConfigSupported({
                            codec: cand.encoderCodec,
                            width: exportWidth,
                            height: exportHeight,
                            bitrate: bitrateMap[quality],
                            framerate: fps
                        });
                        if (support.supported) {
                            selectedVideo = cand;
                            break;
                        }
                    } catch {
                        // ignore check error
                    }
                }

                if (selectedVideo) {
                    // Determine supported audio codec (if audio tracks exist)
                    let selectedAudio: { encoderCodec: string; muxerCodec: 'aac' | 'opus'; sampleRate: number } | null = null;
                    if (audioTracks.length > 0 && typeof AudioEncoder !== 'undefined') {
                        const audioCandidates = [
                            { encoderCodec: 'mp4a.40.2', muxerCodec: 'aac' as const, sampleRate: 44100 },
                            { encoderCodec: 'opus', muxerCodec: 'opus' as const, sampleRate: 48000 }
                        ];

                        for (const cand of audioCandidates) {
                            try {
                                const support = await AudioEncoder.isConfigSupported({
                                    codec: cand.encoderCodec,
                                    numberOfChannels: 2,
                                    sampleRate: cand.sampleRate,
                                    bitrate: 128_000
                                });
                                if (support.supported) {
                                    selectedAudio = cand;
                                    break;
                                }
                            } catch {
                                // ignore check error
                            }
                        }
                    }

                    const muxer = new Mp4Muxer.Muxer({
                        target: new Mp4Muxer.ArrayBufferTarget(),
                        video: {
                            codec: selectedVideo.muxerCodec,
                            width: exportWidth,
                            height: exportHeight
                        },
                        audio: selectedAudio ? {
                            codec: selectedAudio.muxerCodec,
                            numberOfChannels: 2,
                            sampleRate: selectedAudio.sampleRate
                        } : undefined,
                        fastStart: 'in-memory',
                        firstTimestampBehavior: 'offset',
                    });

                    const frameDurationMicroseconds = Math.round(1_000_000 / fps);

                    const videoEncoder = new VideoEncoder({
                        output: (chunk, meta) => {
                            if (chunk.duration === null || chunk.duration === undefined || isNaN(chunk.duration) || chunk.duration <= 0) {
                                const data = new Uint8Array(chunk.byteLength);
                                chunk.copyTo(data);
                                muxer.addVideoChunkRaw(
                                    data,
                                    chunk.type,
                                    chunk.timestamp,
                                    frameDurationMicroseconds,
                                    meta
                                );
                            } else {
                                muxer.addVideoChunk(chunk, meta);
                            }
                        },
                        error: (e) => { console.error("VideoEncoder error", e); }
                    });

                    videoEncoder.configure({
                        codec: selectedVideo.encoderCodec,
                        width: exportWidth,
                        height: exportHeight,
                        bitrate: bitrateMap[quality],
                        framerate: fps
                    });

                    let audioEncoder: AudioEncoder | null = null;
                    if (selectedAudio) {
                        const targetSampleRate = selectedAudio.sampleRate;
                        audioEncoder = new AudioEncoder({
                            output: (chunk, meta) => {
                                if (chunk.duration === null || chunk.duration === undefined || isNaN(chunk.duration) || chunk.duration <= 0) {
                                    const data = new Uint8Array(chunk.byteLength);
                                    chunk.copyTo(data);
                                    const fallbackDuration = Math.round((1024 / targetSampleRate) * 1_000_000);
                                    muxer.addAudioChunkRaw(
                                        data,
                                        chunk.type,
                                        chunk.timestamp,
                                        fallbackDuration,
                                        meta
                                    );
                                } else {
                                    muxer.addAudioChunk(chunk, meta);
                                }
                            },
                            error: (e) => console.error("AudioEncoder error", e)
                        });

                        audioEncoder.configure({
                            codec: selectedAudio.encoderCodec,
                            numberOfChannels: 2,
                            sampleRate: selectedAudio.sampleRate,
                            bitrate: 128_000,
                        });
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = exportWidth;
                    canvas.height = exportHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error("No context");

                    for (let i = 0; i < compositeFrames.length; i++) {
                         if (isExportCancelledRef.current) {
                             setIsExporting(false);
                             return;
                         }
                         const img = new Image();
                         await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = compositeFrames[i]; });
                         
                         ctx.clearRect(0, 0, exportWidth, exportHeight);
                         if (background.type === 'gradient3' && background.gradientColors) {
                            const gradient = ctx.createLinearGradient(0, 0, exportWidth, exportHeight);
                            gradient.addColorStop(0, background.gradientColors[0]);
                            gradient.addColorStop(0.5, background.gradientColors[1]);
                            gradient.addColorStop(1, background.gradientColors[2]);
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, exportWidth, exportHeight);
                         } else if (background.color !== 'transparent') {
                            ctx.fillStyle = background.color;
                            ctx.fillRect(0, 0, exportWidth, exportHeight);
                         }
                         ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

                         const frame = new VideoFrame(canvas, {
                             timestamp: Math.round((i * 1_000_000) / fps),
                             duration: frameDurationMicroseconds
                         });
                         videoEncoder.encode(frame);
                         frame.close();

                         setExportProgress(30 + Math.round(((i + 1) / total) * 50));
                    }

                    await videoEncoder.flush();

                    if (audioEncoder && selectedAudio) {
                        const totalDuration = frames.reduce((acc, f) => acc + (f.durationMultiplier || 1) / fps, 0);
                        const sampleRate = selectedAudio.sampleRate;
                        const offlineCtx = new OfflineAudioContext(2, Math.max(1, Math.ceil(totalDuration * sampleRate)), sampleRate);
                        
                        for (const track of audioTracks) {
                            try {
                                const response = await fetch(track.url);
                                const arrayBuffer = await response.arrayBuffer();
                                const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
                                
                                const source = offlineCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                
                                const gainNode = offlineCtx.createGain();
                                gainNode.gain.value = track.volume;
                                
                                if ((track.fadeIn ?? 0) > 0) {
                                    gainNode.gain.setValueAtTime(0, track.startTime);
                                    gainNode.gain.linearRampToValueAtTime(track.volume, track.startTime + (track.fadeIn ?? 0));
                                }
                                if ((track.fadeOut ?? 0) > 0) {
                                    gainNode.gain.setValueAtTime(track.volume, track.startTime + track.duration - (track.fadeOut ?? 0));
                                    gainNode.gain.linearRampToValueAtTime(0, track.startTime + track.duration);
                                }
                                
                                source.connect(gainNode);
                                gainNode.connect(offlineCtx.destination);
                                source.start(track.startTime, track.offset, track.duration);
                            } catch (e) {
                                console.error("Audio mixing error", e);
                            }
                        }
                        
                        const renderedBuffer = await offlineCtx.startRendering();
                        const channelData0 = renderedBuffer.getChannelData(0);
                        const channelData1 = renderedBuffer.getChannelData(1);
                        const bufferSize = 1024 * 8;
                        
                        for (let i = 0; i < renderedBuffer.length; i += bufferSize) {
                            const size = Math.min(bufferSize, renderedBuffer.length - i);
                            const interleaved = new Float32Array(size * 2);
                            for (let j = 0; j < size; j++) {
                                interleaved[j * 2] = channelData0[i + j];
                                interleaved[j * 2 + 1] = channelData1[i + j];
                            }
                            
                            const audioData = new AudioData({
                                format: 'f32',
                                sampleRate: sampleRate,
                                numberOfFrames: size,
                                numberOfChannels: 2,
                                timestamp: (i / sampleRate) * 1000000,
                                data: interleaved
                            });
                            audioEncoder.encode(audioData);
                            audioData.close();
                        }
                        await audioEncoder.flush();
                    }

                    muxer.finalize();

                    const { buffer } = muxer.target;
                    const blob = new Blob([buffer], { type: 'video/mp4' });
                    const url = URL.createObjectURL(blob);
                    
                    setExportedFile({ url, name: `${projectName}.mp4`, blob });
                    setIsExporting(false);
                    setExportProgress(100);
                    mp4ExportSuccess = true;
                }
            } catch (webcodecsError) {
                console.warn("WebCodecs MP4 export failed or unsupported in this browser environment, falling back to MediaRecorder", webcodecsError);
            }
        }

        // 2. Universal Fallback using MediaRecorder if WebCodecs was unsupported or threw an error
        if (!mp4ExportSuccess) {
            try {
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = exportWidth;
                exportCanvas.height = exportHeight;
                const ctx = exportCanvas.getContext('2d');
                
                if (!ctx) throw new Error("Could not create canvas context");

                const stream = exportCanvas.captureStream(fps);
                
                let audioContext: AudioContext | null = null;
                let destination: MediaStreamAudioDestinationNode | null = null;
                
                if (audioTracks.length > 0) {
                    audioContext = new AudioContext();
                    destination = audioContext.createMediaStreamDestination();
                    const audioTrack = destination.stream.getAudioTracks()[0];
                    if (audioTrack) {
                        stream.addTrack(audioTrack);
                    }
                }

                const mp4MimeTypes = [
                    'video/mp4;codecs=avc1',
                    'video/mp4;codecs=h264',
                    'video/mp4;codecs=vp9',
                    'video/mp4',
                    'video/webm;codecs=vp9',
                    'video/webm'
                ];

                const selectedMimeType = mp4MimeTypes.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || 'video/webm';

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: selectedMimeType,
                    videoBitsPerSecond: bitrateMap[quality]
                });

                const chunks: BlobPart[] = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const url = URL.createObjectURL(blob);
                    
                    setExportedFile({ url, name: `${projectName}.mp4`, blob });
                    setIsExporting(false);
                    setExportProgress(100);
                };

                mediaRecorder.start();

                if (audioContext && destination) {
                    for (const track of audioTracks) {
                        try {
                            const response = await fetch(track.url);
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            const source = audioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            const gain = audioContext.createGain();
                            gain.gain.value = track.volume;
                            
                            const startTime = audioContext.currentTime;
                            
                            if ((track.fadeIn ?? 0) > 0) {
                                gain.gain.setValueAtTime(0, startTime + track.startTime);
                                gain.gain.linearRampToValueAtTime(track.volume, startTime + track.startTime + (track.fadeIn ?? 0));
                            }
                            if ((track.fadeOut ?? 0) > 0) {
                                gain.gain.setValueAtTime(track.volume, startTime + track.startTime + track.duration - (track.fadeOut ?? 0));
                                gain.gain.linearRampToValueAtTime(0, startTime + track.startTime + track.duration);
                            }
                            
                            source.connect(gain);
                            gain.connect(destination);
                            source.start(startTime + track.startTime, track.offset, track.duration);
                        } catch (e) {
                            console.error("Audio mixing error in MP4 fallback", e);
                        }
                    }
                }

                for (let i = 0; i < compositeFrames.length; i++) {
                    if (isExportCancelledRef.current) {
                        mediaRecorder.stop();
                        setIsExporting(false);
                        return;
                    }
                    const img = new Image();
                    await new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.src = compositeFrames[i];
                    });
                    
                    ctx.clearRect(0, 0, exportWidth, exportHeight);
                    if (transparent) {
                        // transparent canvas
                    } else if (background.type === 'gradient3' && background.gradientColors) {
                        const gradient = ctx.createLinearGradient(0, 0, exportWidth, exportHeight);
                        gradient.addColorStop(0, background.gradientColors[0]);
                        gradient.addColorStop(0.5, background.gradientColors[1]);
                        gradient.addColorStop(1, background.gradientColors[2]);
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, exportWidth, exportHeight);
                    } else if (background.color !== 'transparent') {
                        ctx.fillStyle = background.color;
                        ctx.fillRect(0, 0, exportWidth, exportHeight);
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, exportWidth, exportHeight);
                    }
                    ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
                    
                    await new Promise(r => setTimeout(r, 1000 / fps));
                    setExportProgress(30 + Math.round(((i + 1) / total) * 70));
                }

                await new Promise(r => setTimeout(r, 200));
                mediaRecorder.stop();

            } catch (fallbackErr: any) {
                console.error("MP4 Fallback export failed", fallbackErr);
                alert(t('errors.mp4Error'));
                setIsExporting(false);
                setIsExportModalOpen(false);
            }
        }
    } else if (format === 'gif') {
      try {
        const qualityMap = {
            low: 30,
            medium: 10,
            high: 1
        };

        const gifBlob = await new Promise<Blob>((resolve, reject) => {
          gifshot.createGIF({
            images: compositeFrames,
            gifWidth: canvasSize.width,
            gifHeight: canvasSize.height,
            frameDuration: 1 / fps, // gifshot uses seconds per frame
            numWorkers: 2, // Use more workers for faster processing
            quality: qualityMap[quality]
          }, (obj: any) => {
            if (obj.error) {
              reject(obj.error);
            } else {
              fetch(obj.image).then(res => res.blob()).then(resolve).catch(reject);
            }
          });
        });

        const url = URL.createObjectURL(gifBlob);
        
        setExportedFile({ url, name: `${projectName}.gif`, blob: gifBlob });
        setIsExporting(false);
        setExportProgress(100);

      } catch (e: any) {
        console.error("GIF Export failed", e);
        alert(t('errors.exportError', { message: e.message }));
        setIsExporting(false);
        setIsExportModalOpen(false);
      }
    } else if (format === 'png-seq') {
      const zip = new JSZip();
      compositeFrames.forEach((data, i) => {
        const base64Data = data.split(',')[1];
        zip.file(`frame_${String(i + 1).padStart(4, '0')}.png`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' }, (metadata: any) => {
        setExportProgress(30 + Math.round(metadata.percent * 0.7));
      });
      const url = URL.createObjectURL(content);
      
      setExportedFile({ url, name: `${projectName}_frames.zip`, blob: content });
      setIsExporting(false);
      setExportProgress(100);
    } else if (format === 'png') {
        const dataUrl = compositeFrames[0];
        if (!dataUrl) {
            setIsExporting(false);
            return;
        }
        try {
            const base64Data = dataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            setExportedFile({ url, name: `${projectName}.png`, blob });
            setIsExporting(false);
            setExportProgress(100);
        } catch(e) {
            console.error("PNG export error", e);
            alert("Export error");
            setIsExporting(false);
        }
    } else if (format === 'html') {
      try {
        const { blob, url, filename } = await generateLiveHtmlGame({
          projectName,
          frames,
          layers,
          actors,
          projectScript,
          fps,
          canvasSize,
          background,
          backgroundImage,
          audioTracks,
          transparent,
          onProgress: (pct) => setExportProgress(pct)
        });

        setExportedFile({ url, name: filename, blob });
        setIsExporting(false);
        setExportProgress(100);
      } catch (e: any) {
        console.error("HTML Game export failed:", e);
        alert(t('errors.exportError', { message: e.message || 'Failed to export HTML game' }));
        setIsExporting(false);
        setIsExportModalOpen(false);
      }
    } else {
      // Fallback for WebM/AVI using MediaRecorder
      try {
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvasSize.width;
          exportCanvas.height = canvasSize.height;
          const ctx = exportCanvas.getContext('2d');
          
          if(!ctx) throw new Error("Could not create canvas context");

          const stream = exportCanvas.captureStream(fps);
          
          let audioContext: AudioContext | null = null;
          let destination: MediaStreamAudioDestinationNode | null = null;
          
          if (audioTracks.length > 0) {
              audioContext = new AudioContext();
              destination = audioContext.createMediaStreamDestination();
              const audioTrack = destination.stream.getAudioTracks()[0];
              if (audioTrack) {
                stream.addTrack(audioTrack);
              }
          }

          const mimeTypes: Record<string, string[]> = {
            webm: ['video/webm;codecs=vp9', 'video/webm'],
            avi: ['video/webm'] // Hack: Browsers don't support AVI encoding
          };

          const selectedMimeType = mimeTypes[format]?.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

          const bitrateMap = {
              low: 1_000_000,
              medium: 8_000_000,
              high: 20_000_000
          };

          const mediaRecorder = new MediaRecorder(stream, {
              mimeType: selectedMimeType,
              videoBitsPerSecond: bitrateMap[quality]
          });

          const chunks: BlobPart[] = [];
          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: selectedMimeType });
              const url = URL.createObjectURL(blob);
              const ext = format === 'avi' ? 'avi' : 'webm';
              
              setExportedFile({ url, name: `${projectName}.${ext}`, blob });
              setIsExporting(false);
              setExportProgress(100);
          };

          mediaRecorder.start();

          if (audioContext && destination) {
              for (const track of audioTracks) {
                  try {
                      const response = await fetch(track.url);
                      const arrayBuffer = await response.arrayBuffer();
                      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                      const source = audioContext.createBufferSource();
                      source.buffer = audioBuffer;
                      const gain = audioContext.createGain();
                      gain.gain.value = track.volume;
                      
                      const startTime = audioContext.currentTime;
                      
                      if ((track.fadeIn ?? 0) > 0) {
                          gain.gain.setValueAtTime(0, startTime + track.startTime);
                          gain.gain.linearRampToValueAtTime(track.volume, startTime + track.startTime + (track.fadeIn ?? 0));
                      }
                      if ((track.fadeOut ?? 0) > 0) {
                          gain.gain.setValueAtTime(track.volume, startTime + track.startTime + track.duration - (track.fadeOut ?? 0));
                          gain.gain.linearRampToValueAtTime(0, startTime + track.startTime + track.duration);
                      }
                      
                      source.connect(gain);
                      gain.connect(destination);
                      source.start(startTime + track.startTime, track.offset, track.duration);
                  } catch (e) {
                      console.error("WebM Audio error", e);
                  }
              }
          }

          for (let i = 0; i < compositeFrames.length; i++) {
              if (isExportCancelledRef.current) {
                  mediaRecorder.stop();
                  setIsExporting(false);
                  return;
              }
              const img = new Image();
              await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.src = compositeFrames[i];
              });
              
              if (transparent) {
                ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
              } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
              }
              ctx.drawImage(img, 0, 0);
              
              await new Promise(r => setTimeout(r, 1000 / fps));
              setExportProgress(30 + Math.round(((i + 1) / total) * 70));
          }
          
          await new Promise(r => setTimeout(r, 200));
          mediaRecorder.stop();

      } catch (e: any) {
          console.error(e);
          alert(t('errors.exportError', { message: e.message }));
          setIsExporting(false);
          setIsExportModalOpen(false);
      }
    }
  };

  const saveProject = async () => {
      if (editingSymbolId) {
          exitSymbolEditMode();
          return;
      }
      let thumb = '';
      if (frames.length > 0) {
          thumb = await compositeLayers(frames[0], layers, canvasSize.width, canvasSize.height, background, backgroundImage, true, layerFolders);
      }
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: thumb,
          type: projectType,
          folderId: folderId,
          canvasSize,
          background,
          backgroundImage,
          layers,
          layerFolders,
          frames,
          fps,
          audioTracks,
          motionPaths: [],
          onionSkinSettings,
          actors,
          projectScript
      };
      try {
        await saveProjectToDB(projectData);
        const updatedList = await getProjectList();
        setSavedProjects(updatedList);
        setHasUnsavedChanges(false);
      } catch (e) {
          console.error(e);
          alert(t('errors.saveFailed'));
      }
  };

  useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  useEffect(() => {
    if (view !== 'editor') {
      setAutoSaveTimer(300);
      setAutoSaveStatus('idle');
      return;
    }

    const interval = setInterval(() => {
      setAutoSaveTimer((prev) => {
        if (prev <= 1) {
          setAutoSaveStatus('saved');
          
          if (saveProjectRef.current) {
            saveProjectRef.current()
              .then(() => {
                setTimeout(() => {
                  setAutoSaveStatus('idle');
                }, 3000);
              })
              .catch((err) => {
                console.error("Auto-save failed:", err);
                setAutoSaveStatus('idle');
              });
          } else {
            setAutoSaveStatus('idle');
          }

          return 300; // Reset countdown to 5 minutes
        }

        const nextVal = prev - 1;
        if (nextVal <= 5) {
          setAutoSaveStatus('warning');
        } else {
          setAutoSaveStatus('idle');
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view]);

  const clearAudio = () => {
      audioElementsRef.current.forEach(audio => {
          audio.pause();
          URL.revokeObjectURL(audio.src);
      });
      audioElementsRef.current.clear();
  };

  const loadProject = async (id: string) => {
      setIsLoading(true);
      try {
        const data = await loadProjectFromDB(id);
        if (!data) {
            alert(t('errors.projectNotFound'));
            setIsLoading(false);
            return;
        }
        
        clearAudio();

        setProjectId(data.id);
        setProjectName(data.name);
        setProjectType(data.type || 'animation');
        setFolderId(data.folderId || null);
        setCanvasSize(data.canvasSize);
        setBackground(data.background || { type: 'color', color: '#ffffff' });
        setBackgroundImage(data.backgroundImage || null);
        setLayers(data.layers);
        setLayerFolders(data.layerFolders || []);
        setFrames(data.frames);
        setFps(data.fps);
        setAudioTracks(data.audioTracks || []);
        if (data.onionSkinSettings) setOnionSkinSettings(data.onionSkinSettings);
        
        // AI Assistant Auto-Migration based on user request
        let loadedActors = data.actors || [];
        loadedActors = loadedActors.map(a => {
            const name = a.name.toLowerCase();
            let tf = a.targetFrame;
            if ((name.includes('blue') || name.includes('playbutton') || name === 'play') && (tf === undefined || tf !== 0)) { tf = 0; }
            if ((name.includes('green') || name.includes('correctbutton') || name.includes('red') || name.includes('wrongbutton')) && (tf === undefined || tf !== 1)) { tf = 1; }
            return { ...a, targetFrame: tf };
        });
        
        setActors(loadedActors);
        setProjectScript(data.projectScript || '');
        setCurrentFrameIndex(0);
        setHistory([data.frames]);
        setHistoryIndex(0);
        setSelection(null);
        setTool('pen');
        setBrushType('pen');
        setHasUnsavedChanges(false);
        setView('editor');
      } catch (e) {
          console.error("Failed to load", e);
          alert(t('errors.loadError'));
      } finally {
          setIsLoading(false);
      }
  };

  const createNewProject = async (type: 'animation' | 'painting' | 'game' = 'animation', targetFolderId: string | null = currentFolderId) => {
      clearAudio();
      const pid = crypto.randomUUID();
      setProjectId(pid);
      
      let projName = t('menu.newProject');
      if (type === 'painting') {
        projName = t('menu.newPainting', 'New Painting');
      } else if (type === 'game') {
        projName = 'New Interactive Game';
      }
      setProjectName(projName);
      setProjectType(type);
      setFolderId(targetFolderId || null);
      setCanvasSize({ width: 800, height: 600 });
      setBackground({ type: 'color', color: '#ffffff' });
      
      const defaultL = [createDefaultLayer('1', `${t('layers.newLayer')} 1`)];
      setLayers(defaultL);
      setLayerFolders([]);
      setActiveLayerId(defaultL[0].id);

      if (type === 'game') {
        const drawTextOnLayer = (text: string, subtitle: string, color: string = '#1e293b'): string => {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = color;
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 400, 180);

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 18px system-ui, sans-serif';
            ctx.fillText(subtitle, 400, 240);
          }
          return canvas.toDataURL();
        };

        const frame1: Frame = {
          id: crypto.randomUUID(),
          layers: { '1': drawTextOnLayer('MY INTERACTIVE FLASH GAME', 'Click the Blue Play Button to Start the Quiz!') },
          script: '// === Frame 1: Main Menu ===\nstop();\nconsole.log("Game started! Waiting on Frame 1.");',
          thumbnailUrl: ''
        };
        const frame2: Frame = {
          id: crypto.randomUUID(),
          layers: { '1': drawTextOnLayer('CHALLENGE: CHOOSE WISELY', 'Click the Correct Symbol (Green Check) to win, or Incorrect (Red Cross) to fail!') },
          script: '// === Frame 2: Level 1 Quiz ===\nstop();\nconsole.log("On Level 1. Waiting for user response.");',
          thumbnailUrl: ''
        };
        const frame3: Frame = {
          id: crypto.randomUUID(),
          layers: { '1': drawTextOnLayer('CONGRATULATIONS - YOU WIN!', 'You successfully answered the quiz! Press play button to replay.') },
          script: '// === Frame 3: Victory Screen ===\nstop();\nconsole.log("Player succeeded!");',
          thumbnailUrl: ''
        };

        frame1.thumbnailUrl = await compositeLayers(frame1, defaultL, 800, 600, { type: 'color', color: '#ffffff' }, null, false);
        frame2.thumbnailUrl = await compositeLayers(frame2, defaultL, 800, 600, { type: 'color', color: '#ffffff' }, null, false);
        frame3.thumbnailUrl = await compositeLayers(frame3, defaultL, 800, 600, { type: 'color', color: '#ffffff' }, null, false);

        setFrames([frame1, frame2, frame3]);
        setHistory([[frame1, frame2, frame3]]);
        
        // Setup initial Symbols (Actors)
        const playBtn: Actor = {
          id: crypto.randomUUID(),
          name: 'playButton',
          dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="%23007AFF"/><polygon points="48,36 48,84 84,60" fill="white"/></svg>`,
          x: 340,
          y: 350,
          width: 120,
          height: 120,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          targetFrame: 0,
          scripts: '// Click the play button to start the game\nthis.onClick = function() {\n  gotoAndStop(2);\n};\nthis.onUpdate = function() {\n  // Only show play button on Frame 1 and Frame 3\n  this.visible = (this.currentFrame === 1 || this.currentFrame === 3);\n};'
        };

        const correctBtn: Actor = {
          id: crypto.randomUUID(),
          name: 'correctButton',
          dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="%2334C759"/><path d="M36,60 L50,74 L84,40" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
          x: 240,
          y: 350,
          width: 120,
          height: 120,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          targetFrame: 1,
          scripts: '// Click correct option to advance to victory screen\nthis.onClick = function() {\n  gotoAndStop(3);\n};\nthis.onUpdate = function() {\n  // Only show on Frame 2\n  this.visible = (this.currentFrame === 2);\n};'
        };

        const wrongBtn: Actor = {
          id: crypto.randomUUID(),
          name: 'wrongButton',
          dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="%23FF3B30"/><path d="M38,38 L82,82 M82,38 L38,82" stroke="white" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`,
          x: 440,
          y: 350,
          width: 120,
          height: 120,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          targetFrame: 1,
          scripts: '// Click wrong option to trigger reset and show message\nthis.onClick = function() {\n  alert("Wrong choice! Let\'s go back and try again.");\n  gotoAndStop(1);\n};\nthis.onUpdate = function() {\n  // Only show on Frame 2\n  this.visible = (this.currentFrame === 2);\n};'
        };

        setActors([playBtn, correctBtn, wrongBtn]);
        setProjectScript('// Global script runs on startup');
      } else {
        const initialFrame = createBlankFrame(defaultL, 800, 600);
        initialFrame.thumbnailUrl = await compositeLayers(initialFrame, defaultL, 800, 600, { type: 'color', color: '#ffffff' }, null, false);
        setFrames([initialFrame]);
        setHistory([[initialFrame]]);
        setActors([]);
        setProjectScript('');
      }

      setHistoryIndex(0);
      setFps(12);
      setAudioTracks([]);
      setOnionSkinSettings({
        beforeColor: '#FF3B30',
        afterColor: '#34C759',
        beforeOpacity: 0.3,
        afterOpacity: 0.3,
        numBefore: 1,
        numAfter: 1
      });
      setCurrentFrameIndex(0);
      setSelection(null);
      setHasUnsavedChanges(false);
      setView('editor');
  };

  const handleStartTour = (mode: 'all' | 'painting' | 'games' = 'all') => {
    setIsTutorialOpen(false);
    setIsHelpOpen(false);
    setInteractiveTourMode(mode);
    if (view === 'menu') {
      if (mode === 'painting') {
        createNewProject('painting');
      } else if (mode === 'games') {
        createNewProject('game');
      } else {
        createNewProject('animation');
      }
    }
    setTimeout(() => {
      setIsInteractiveTourActive(true);
    }, 300);
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setProjectToDelete(id);
  };

  const confirmDeleteProject = async () => {
      if (!projectToDelete) return;
      try {
          await deleteProjectFromDB(projectToDelete);
          const updatedList = await getProjectList();
          setSavedProjects(updatedList);
          setProjectToDelete(null);
      } catch (e) {
          console.error("Failed to delete", e);
      }
  };

  const handleBackupProject = (format: 'canim' | 'json' = 'canim') => {
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: frames[0]?.thumbnailUrl || '',
          canvasSize,
          background,
          backgroundImage,
          layers,
          layerFolders,
          frames,
          fps,
          audioTracks,
          motionPaths: [],
          onionSkinSettings
      };
      const ext = format === 'json' ? 'json' : 'canim';
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}_backup.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsSettingsOpen(false);
  };

  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string) as ProjectData;
            const newId = crypto.randomUUID();
            let thumb = data.thumbnailUrl;
            if (!thumb && data.frames.length > 0) {
                 thumb = await compositeLayers(data.frames[0], data.layers, data.canvasSize.width, data.canvasSize.height, data.background || { type: 'color', color: '#ffffff' }, data.backgroundImage, true);
            }
            // Also ensure all frames have transparent thumbnails if they don't have any
            const updatedFrames = await Promise.all(data.frames.map(async f => {
                if (!f.thumbnailUrl) {
                    return { ...f, thumbnailUrl: await compositeLayers(f, data.layers, data.canvasSize.width, data.canvasSize.height, data.background || { type: 'color', color: '#ffffff' }, data.backgroundImage, false) };
                }
                return f;
            }));

            const projectData: ProjectData = { ...data, id: newId, lastModified: Date.now(), thumbnailUrl: thumb || '', frames: updatedFrames };
            await saveProjectToDB(projectData);
            const updatedList = await getProjectList();
            setSavedProjects(updatedList);
            loadProject(newId);
        } catch (err) {
            alert(t('errors.parseError'));
        }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleGoHome = () => {
      if (hasUnsavedChanges) setShowExitConfirm(true);
      else setView('menu');
  };

  const confirmExit = (saveFirst: boolean) => {
      if (saveFirst) saveProject().then(() => { setShowExitConfirm(false); setView('menu'); });
      else { setShowExitConfirm(false); setView('menu'); }
  };

  useEffect(() => {
    const handleWindowPaste = async (e: ClipboardEvent) => {
      if (view !== 'editor') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (!dataUrl) return;

              const img = new Image();
              img.onload = () => {
                const width = img.width;
                const height = img.height;
                let targetWidth = width;
                let targetHeight = height;
                const maxW = canvasSize.width * 0.8;
                const maxH = canvasSize.height * 0.8;
                if (targetWidth > maxW || targetHeight > maxH) {
                  const scale = Math.min(maxW / targetWidth, maxH / targetHeight);
                  targetWidth = Math.round(targetWidth * scale);
                  targetHeight = Math.round(targetHeight * scale);
                }
                let finalDataUrl = dataUrl;
                if (targetWidth !== width || targetHeight !== height) {
                  const offCanvas = document.createElement('canvas');
                  offCanvas.width = targetWidth;
                  offCanvas.height = targetHeight;
                  const offCtx = offCanvas.getContext('2d');
                  if (offCtx) {
                    offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    finalDataUrl = offCanvas.toDataURL();
                  }
                }
                const newX = (canvasSize.width - targetWidth) / 2;
                const newY = (canvasSize.height - targetHeight) / 2;

                if (selection) {
                  handleSelectionCommit();
                }

                setSelection({
                  x: newX,
                  y: newY,
                  width: targetWidth,
                  height: targetHeight,
                  dataUrl: finalDataUrl,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  type: 'image',
                  selectionType: 'rectangle'
                });
                setTool('select');
                setHasUnsavedChanges(true);
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [view, canvasSize, selection]);

  const handleCopy = () => { if (selection) setClipboard(selection); };
  const handleCut = () => {
    if (selection) {
      setClipboard(selection);
      setSelection(null);
      setHasUnsavedChanges(true);
    }
  };
  const handlePaste = async () => {
    if (view !== 'editor') return;
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (!dataUrl) return;
              const img = new Image();
              img.onload = () => {
                const width = img.width;
                const height = img.height;
                let targetWidth = width;
                let targetHeight = height;
                const maxW = canvasSize.width * 0.8;
                const maxH = canvasSize.height * 0.8;
                if (targetWidth > maxW || targetHeight > maxH) {
                  const scale = Math.min(maxW / targetWidth, maxH / targetHeight);
                  targetWidth = Math.round(targetWidth * scale);
                  targetHeight = Math.round(targetHeight * scale);
                }
                let finalDataUrl = dataUrl;
                if (targetWidth !== width || targetHeight !== height) {
                  const offCanvas = document.createElement('canvas');
                  offCanvas.width = targetWidth;
                  offCanvas.height = targetHeight;
                  const offCtx = offCanvas.getContext('2d');
                  if (offCtx) {
                    offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    finalDataUrl = offCanvas.toDataURL();
                  }
                }
                const newX = (canvasSize.width - targetWidth) / 2;
                const newY = (canvasSize.height - targetHeight) / 2;
                if (selection) {
                  handleSelectionCommit();
                }
                setSelection({
                  x: newX,
                  y: newY,
                  width: targetWidth,
                  height: targetHeight,
                  dataUrl: finalDataUrl,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  type: 'image',
                  selectionType: 'rectangle'
                });
                setTool('select');
                setHasUnsavedChanges(true);
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Could not read clipboard via API:", err);
    }

    if (clipboard) {
      if (selection) {
        await handleSelectionCommit();
      }
      const newX = (canvasSize.width - clipboard.width) / 2;
      const newY = (canvasSize.height - clipboard.height) / 2;
      setSelection({ ...clipboard, x: newX, y: newY });
      setTool('select');
      setHasUnsavedChanges(true);
      return;
    }

    // Fallback for mobile / browsers where clipboard API requires manual file pick
    if (importGeneralImageRef.current) {
      importGeneralImageRef.current.click();
    }
  };

  const handleImportGeneralImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        let targetWidth = width;
        let targetHeight = height;
        const maxW = canvasSize.width * 0.8;
        const maxH = canvasSize.height * 0.8;
        if (targetWidth > maxW || targetHeight > maxH) {
          const scale = Math.min(maxW / targetWidth, maxH / targetHeight);
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        }
        let finalDataUrl = dataUrl;
        if (targetWidth !== width || targetHeight !== height) {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = targetWidth;
          offCanvas.height = targetHeight;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
            finalDataUrl = offCanvas.toDataURL();
          }
        }
        const newX = (canvasSize.width - targetWidth) / 2;
        const newY = (canvasSize.height - targetHeight) / 2;
        if (selection) {
          handleSelectionCommit();
        }
        setSelection({
          x: newX,
          y: newY,
          width: targetWidth,
          height: targetHeight,
          dataUrl: finalDataUrl,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          type: 'image',
          selectionType: 'rectangle'
        });
        setTool('select');
        setHasUnsavedChanges(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (importGeneralImageRef.current) importGeneralImageRef.current.value = '';
  };

  const handleImportIntoSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selection) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (err) => {
            console.error("Failed to load image:", src.substring(0, 50) + "...");
            reject(err);
          };
          img.src = src;
        });
      };

      try {
        const [importedImg, maskImg] = await Promise.all([
          loadImage(result),
          loadImage(selection.dataUrl)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = selection.width;
        canvas.height = selection.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Draw the imported image first (scaled to cover)
        const scale = Math.max(selection.width / importedImg.width, selection.height / importedImg.height);
        const drawWidth = importedImg.width * scale;
        const drawHeight = importedImg.height * scale;
        const offsetX = (selection.width - drawWidth) / 2;
        const offsetY = (selection.height - drawHeight) / 2;

        ctx.drawImage(importedImg, offsetX, offsetY, drawWidth, drawHeight);

        // 2. Load the mask image
        let maskImgToUse: HTMLImageElement | HTMLCanvasElement = maskImg;
        
        if (selection.selectionType === 'rectangle') {
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = selection.width;
          maskCanvas.height = selection.height;
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            maskCtx.fillStyle = '#000';
            maskCtx.fillRect(0, 0, selection.width, selection.height);
          }
          maskImgToUse = maskCanvas;
        } else if (selection.maskUrl) {
          try {
            maskImgToUse = await loadImage(selection.maskUrl);
          } catch (e) {
            console.warn("Failed to load maskUrl, falling back to dataUrl", e);
          }
        }

        // 3. Apply the mask using destination-in
        // This keeps the imported image only where the mask is opaque
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskImgToUse, 0, 0, selection.width, selection.height);

        // 4. Force a small delay to ensure canvas is updated before toDataURL
        // This can help on some mobile browsers
        await new Promise(resolve => setTimeout(resolve, 50));

        const newDataUrl = canvas.toDataURL('image/png');

        setSelection({
          ...selection,
          dataUrl: newDataUrl
        });
        setHasUnsavedChanges(true);
      } catch (err) {
        console.error("Error importing into selection:", err);
      }
    };
    reader.readAsDataURL(file);
    if (importIntoSelectionRef.current) importIntoSelectionRef.current.value = '';
  };

  const animate = (timestamp: number) => {
    if (!isPlaying) return;
    
    if (startTimeRef.current === 0) startTimeRef.current = timestamp;
    let elapsed = (timestamp - startTimeRef.current) / 1000;
    const totalDuration = frameTimings.length > 0 ? frameTimings[frameTimings.length - 1].end : 0;

    if (elapsed >= totalDuration) { 
      if (isLooping) {
        startTimeRef.current = timestamp;
        elapsed = 0;
        setCurrentFrameIndex(0);
      } else {
        setIsPlaying(false); 
        return; 
      }
    }

    const targetFrame = frameTimings.findIndex((t: { start: number, end: number }) => elapsed >= t.start && elapsed < t.end);
    if (targetFrame !== -1 && targetFrame !== currentFrameIndex) {
      setCurrentFrameIndex(targetFrame);
    }

    // Audio Sync
    audioTracks.forEach(track => {
        const audio = audioElementsRef.current.get(track.id);
        if (audio) {
            const trackEndTime = track.startTime + track.duration;
            if (elapsed >= track.startTime && elapsed < trackEndTime) {
                // Volume & Fade logic
                let volume = track.volume;
                const timeInTrack = elapsed - track.startTime;
                
                if (track.fadeIn && timeInTrack < track.fadeIn) {
                    volume *= (timeInTrack / track.fadeIn);
                } else if (track.fadeOut && (track.duration - timeInTrack) < track.fadeOut) {
                    volume *= ((track.duration - timeInTrack) / track.fadeOut);
                }
                
                if (audio.volume !== volume) {
                    // Smooth volume adjustment to avoid pops
                    audio.volume = Math.max(0, Math.min(1, volume));
                }

                if (audio.paused) {
                    audio.currentTime = track.offset + (elapsed - track.startTime);
                    audio.play().catch(e => {
                        if (e.name !== 'AbortError') console.error(e);
                    });
                } else {
                    const expectedTime = track.offset + (elapsed - track.startTime);
                    if (Math.abs(audio.currentTime - expectedTime) > 0.15) {
                        audio.currentTime = expectedTime;
                    }
                }
            } else {
                if (!audio.paused) audio.pause();
            }
        }
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      const startTime = frameTimings[currentFrameIndex]?.start || 0;
      audioTracks.forEach(track => {
          const audio = audioElementsRef.current.get(track.id);
          if (audio) { 
              const trackEndTime = track.startTime + track.duration;
              if (startTime >= track.startTime && startTime < trackEndTime) {
                  audio.currentTime = track.offset + (startTime - track.startTime);
                  audio.play().catch(e => {
                      if (e.name !== 'AbortError') console.error(e);
                  });
              } else {
                  audio.pause();
              }
          }
      });
      startTimeRef.current = performance.now() - (startTime * 1000);
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioElementsRef.current.forEach(audio => audio.pause());
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, fps]);

  const handleSelectFrame = (index: number) => {
    setCurrentFrameIndex(index);
    if (isPlaying) {
      startTimeRef.current = performance.now() - (index / fps * 1000);
    }
    if (audioTracks.length > 0) {
        const time = index / fps;
        audioTracks.forEach(track => {
            const audio = audioElementsRef.current.get(track.id);
            if (audio && Number.isFinite(time)) {
                const trackEndTime = track.startTime + track.duration;
                if (time >= track.startTime && time < trackEndTime) {
                    audio.currentTime = track.offset + (time - track.startTime);
                    if (isPlaying) {
                        if (audio.paused) {
                            audio.play().catch(e => {
                                if (e.name !== 'AbortError') console.error(e);
                            });
                        }
                    } else {
                        // Audio Scrubbing: Play a short burst
                        audio.play().catch(e => {
                            if (e.name !== 'AbortError') console.error(e);
                        });
                        
                        if (scrubTimeoutRef.current) clearTimeout(scrubTimeoutRef.current);
                        scrubTimeoutRef.current = setTimeout(() => {
                           if (!isPlaying) {
                               audioElementsRef.current.forEach(a => a.pause());
                           }
                        }, 100); // 100ms burst for scrubbing
                    }
                } else {
                    if (!audio.paused) audio.pause();
                }
            }
        });
    }
  };

  const handleUpdateLayer = async (layerId: string, dataUrl: string) => {
    const newFrames = [...frames];
    const currentFrame = { ...newFrames[currentFrameIndex] };
    currentFrame.layers = { ...currentFrame.layers, [layerId]: dataUrl };
    currentFrame.thumbnailUrl = await compositeLayers(currentFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
    newFrames[currentFrameIndex] = currentFrame;
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const updateFramesWithHistory = (newFrames: Frame[]) => {
    setFrames(newFrames);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newFrames);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setSelection(null);
      setHistoryIndex(historyIndex - 1);
      const newFrames = history[historyIndex - 1];
      setFrames(newFrames);
      if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
      setHasUnsavedChanges(true);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setSelection(null);
      setHistoryIndex(historyIndex + 1);
      const newFrames = history[historyIndex + 1];
      setFrames(newFrames);
      if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(newFrames.length - 1);
      setHasUnsavedChanges(true);
    }
  };

  const addFrame = async () => {
    const newFrame = createBlankFrame(layers, canvasSize.width, canvasSize.height);
    newFrame.thumbnailUrl = await compositeLayers(newFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    updateFramesWithHistory(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setHasUnsavedChanges(true);
  };
  const deleteFrame = (index: number) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== index);
    updateFramesWithHistory(newFrames);
    if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(newFrames.length - 1);
    setHasUnsavedChanges(true);
  };
  const copyFrame = async (index: number) => {
    const frameToCopy = frames[index];
    const newFrame = { ...frameToCopy, id: crypto.randomUUID(), layers: { ...frameToCopy.layers } };
    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, newFrame);
    updateFramesWithHistory(newFrames);
    setCurrentFrameIndex(index + 1);
    setHasUnsavedChanges(true);
  };

  const addBlankFrames = async (count: number) => {
      let newFrames = [...frames];
      for (let i = 0; i < count; i++) {
        const newFrame = createBlankFrame(layers, canvasSize.width, canvasSize.height);
        newFrame.thumbnailUrl = await compositeLayers(newFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
        newFrames.push(newFrame);
      }
      updateFramesWithHistory(newFrames);
      setHasUnsavedChanges(true);
  };

  const tweenFrame = (index: number) => {
    if (index >= frames.length - 1) return; // Cannot tween the last frame
    setTweenTargetIndex(index);
  };

  const executeTween = async (
    index: number, 
    numTweens: number, 
    easing: string = 'linear', 
    includeOnionSkin: boolean = true,
    interpolatePosition: boolean = true,
    interpolateScale: boolean = true,
    interpolateRotation: boolean = true,
    motionBlur: boolean = true,
    motionBlurStrength: number = 0.75,
    motionBlurSamples: number = 7,
    motionBlurShutterAngle: number = 180
  ) => {
    if (index >= frames.length - 1) return; // Cannot tween the last frame
    
    const originalOnionSkin = onionSkin;
    if (!includeOnionSkin) {
        setOnionSkin(false);
    }

    const frameA = frames[index];
    const frameB = frames[index + 1];
    
    const generatedFrames: Frame[] = [];

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        if (!includeOnionSkin) setOnionSkin(originalOnionSkin);
        return;
    }

    const layerData: Record<string, { 
      imgA: HTMLImageElement | null, 
      imgB: HTMLImageElement | null, 
      statsA: any, 
      statsB: any 
    }> = {};

    for (const layer of layers) {
      let imgA: HTMLImageElement | null = null;
      let imgB: HTMLImageElement | null = null;
      let statsA = null;
      let statsB = null;

      if (frameA.layers[layer.id]) {
        imgA = new Image();
        imgA.src = frameA.layers[layer.id];
        await new Promise(resolve => { imgA!.onload = resolve; });
        statsA = getLayerStats(imgA, canvasSize.width, canvasSize.height);
      }

      if (frameB.layers[layer.id]) {
        imgB = new Image();
        imgB.src = frameB.layers[layer.id];
        await new Promise(resolve => { imgB!.onload = resolve; });
        statsB = getLayerStats(imgB, canvasSize.width, canvasSize.height);
      }

      layerData[layer.id] = { imgA, imgB, statsA, statsB };
    }

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = canvasSize.width;
    compositeCanvas.height = canvasSize.height;
    const compositeCtx = compositeCanvas.getContext('2d');
    const deltaT = 1 / (numTweens + 1);

    for (let i = 1; i <= numTweens; i++) {
      const t = i / (numTweens + 1);
      const newLayers: Record<string, string> = {};
      
      if (compositeCtx) {
        compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        // Background is handled by Timeline and CanvasArea separately, 
        // thumbnails for onion skinning should be transparent.
      }

      for (const layer of layers) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const { imgA, imgB, statsA, statsB } = layerData[layer.id];

        renderTweenLayer(
          ctx,
          imgA,
          imgB,
          statsA,
          statsB,
          t,
          deltaT,
          easing,
          interpolatePosition,
          interpolateScale,
          interpolateRotation,
          motionBlur,
          motionBlurStrength,
          motionBlurSamples,
          motionBlurShutterAngle
        );

        const layerDataUrl = canvas.toDataURL();
        newLayers[layer.id] = layerDataUrl;
        
        if (compositeCtx && layer.isVisible) {
          compositeCtx.save();
          compositeCtx.globalAlpha = layer.opacity;
          // Use the canvas directly to avoid async image loading issues
          compositeCtx.drawImage(canvas, 0, 0);
          compositeCtx.restore();
        }
      }
      
      generatedFrames.push({
        id: crypto.randomUUID(),
        layers: newLayers,
        durationMultiplier: 1,
        background: frameA.background,
        backgroundImage: frameA.backgroundImage,
        thumbnailUrl: compositeCanvas.toDataURL('image/png')
      });
    }

    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, ...generatedFrames);
    updateFramesWithHistory(newFrames);
    setCurrentFrameIndex(index + numTweens + 1);
    setHasUnsavedChanges(true);

    if (!includeOnionSkin) {
        setOnionSkin(originalOnionSkin);
    }
  };

  // Bulk operations
  const handleBulkDeleteFrames = (indices: number[]) => {
      // If deleting all, keep one blank frame
      let newFrames = frames.filter((_, i) => !indices.includes(i));
      if (newFrames.length === 0) {
          newFrames = [createBlankFrame(layers, canvasSize.width, canvasSize.height)];
      }
      updateFramesWithHistory(newFrames);
      // Ensure index is valid
      if (currentFrameIndex >= newFrames.length) {
          setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
      }
      setHasUnsavedChanges(true);
  };

  const handleBulkUpdateFrameBackground = async (indices: number[], background: BackgroundSettings, backgroundImage: string | null) => {
    const newFrames = await Promise.all(frames.map(async (frame, index) => {
      if (indices.includes(index)) {
        const updatedFrame = { ...frame, background, backgroundImage };
        const thumbnailUrl = await compositeLayers(updatedFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false);
        return { ...updatedFrame, thumbnailUrl };
      }
      return frame;
    }));
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleBulkDuplicateFrames = (indices: number[]) => {
      if (indices.length === 0) return;
      const sortedIndices = [...indices].sort((a, b) => a - b);
      // We will append duplicates after the last selected frame
      const insertIndex = sortedIndices[sortedIndices.length - 1] + 1;
      
      const newFrames = [...frames];
      const copies = sortedIndices.map(i => {
          const f = frames[i];
          return { ...f, id: crypto.randomUUID(), layers: { ...f.layers } };
      });
      
      newFrames.splice(insertIndex, 0, ...copies);
      updateFramesWithHistory(newFrames);
      setHasUnsavedChanges(true);
  };

  const handleReorderFrames = (newFrames: Frame[]) => {
      updateFramesWithHistory(newFrames);
      setHasUnsavedChanges(true);
  };

  const handleUpdateFrameDuration = (index: number, multiplier: number) => {
    const newFrames = [...frames];
    newFrames[index] = { ...newFrames[index], durationMultiplier: multiplier };
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleBulkUpdateFrameDuration = (indices: number[], multiplier: number) => {
    const newFrames = frames.map((f, i) => indices.includes(i) ? { ...f, durationMultiplier: multiplier } : f);
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleBulkUpdateFrameLabel = (indices: number[], label: string, colorTag?: string) => {
    const newFrames = frames.map((f, i) => indices.includes(i) ? { ...f, label: label || undefined, colorTag: colorTag || undefined } : f);
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleReverseFrames = (indices?: number[]) => {
    if (!indices || indices.length <= 1) {
      const reversed = [...frames].reverse();
      updateFramesWithHistory(reversed);
      setHasUnsavedChanges(true);
      return;
    }
    const sortedIndices = [...indices].sort((a, b) => a - b);
    const subFrames = sortedIndices.map(i => frames[i]).reverse();
    const newFrames = [...frames];
    sortedIndices.forEach((idx, i) => {
      newFrames[idx] = subFrames[i];
    });
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleBulkFlipFrames = async (indices: number[], horizontal: boolean) => {
    const newFrames = await Promise.all(frames.map(async (frame, index) => {
      if (!indices.includes(index)) return frame;
      const updatedLayers: Record<string, string> = {};
      for (const [layerId, dataUrl] of Object.entries(frame.layers)) {
        if (!dataUrl) {
          updatedLayers[layerId] = dataUrl;
          continue;
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = await new Promise<HTMLImageElement>((res) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = () => res(i);
            i.src = dataUrl;
          });
          if (img.complete && img.naturalWidth > 0) {
            ctx.save();
            if (horizontal) {
              ctx.translate(canvasSize.width, 0);
              ctx.scale(-1, 1);
            } else {
              ctx.translate(0, canvasSize.height);
              ctx.scale(1, -1);
            }
            ctx.drawImage(img, 0, 0);
            ctx.restore();
          }
        }
        updatedLayers[layerId] = canvas.toDataURL();
      }
      const updatedFrame = { ...frame, layers: updatedLayers };
      updatedFrame.thumbnailUrl = await compositeLayers(updatedFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false, layerFolders);
      return updatedFrame;
    }));
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleBulkApplyFilterToFrames = async (indices: number[], filterType: 'grayscale' | 'invert' | 'sepia' | 'brightness') => {
    const newFrames = await Promise.all(frames.map(async (frame, index) => {
      if (!indices.includes(index)) return frame;
      const updatedLayers: Record<string, string> = {};
      for (const [layerId, dataUrl] of Object.entries(frame.layers)) {
        if (!dataUrl) {
          updatedLayers[layerId] = dataUrl;
          continue;
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = await new Promise<HTMLImageElement>((res) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = () => res(i);
            i.src = dataUrl;
          });
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              if (d[i + 3] === 0) continue;
              if (filterType === 'grayscale') {
                const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                d[i] = avg; d[i + 1] = avg; d[i + 2] = avg;
              } else if (filterType === 'invert') {
                d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
              } else if (filterType === 'sepia') {
                const r = d[i], g = d[i + 1], b = d[i + 2];
                d[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
              } else if (filterType === 'brightness') {
                d[i] = Math.min(255, d[i] * 1.25);
                d[i + 1] = Math.min(255, d[i + 1] * 1.25);
                d[i + 2] = Math.min(255, d[i + 2] * 1.25);
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
        }
        updatedLayers[layerId] = canvas.toDataURL();
      }
      const updatedFrame = { ...frame, layers: updatedLayers };
      updatedFrame.thumbnailUrl = await compositeLayers(updatedFrame, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false, layerFolders);
      return updatedFrame;
    }));
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleInsertBlankFrames = async (afterIndex: number, count: number) => {
    const blankFrames: Frame[] = [];
    for (let i = 0; i < count; i++) {
      const blank = createBlankFrame(layers, canvasSize.width, canvasSize.height);
      blank.thumbnailUrl = await compositeLayers(blank, layers, canvasSize.width, canvasSize.height, background, backgroundImage, false, layerFolders);
      blankFrames.push(blank);
    }
    const newFrames = [...frames];
    const insertAt = Math.max(0, Math.min(frames.length, afterIndex + 1));
    newFrames.splice(insertAt, 0, ...blankFrames);
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const handleCropFramesToSelection = (_indices: number[]) => {
    if (!selection) return;
    // Selection coordinates are canvas-space
  };

  useEffect(() => {
    if (view === 'menu') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      let keyStr = e.key;
      if (keyStr === ' ') keyStr = 'Space';
      if (keyStr.length === 1) keyStr = keyStr.toLowerCase();

      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');

      const finalKey = [...modifiers, keyStr].join('+');

      let handled = false;

      switch (finalKey) {
        case shortcuts.selectTool: setTool('select'); handled = true; break;
        case shortcuts.lassoTool: setTool('lasso'); handled = true; break;
        case shortcuts.wandTool: setTool('wand'); handled = true; break;
        case shortcuts.penTool: setTool('pen'); handled = true; break;
        case shortcuts.eraserTool: setTool('eraser'); handled = true; break;
        case shortcuts.fillTool: setTool('fill'); handled = true; break;
        case shortcuts.shapeTool: setTool('shape'); handled = true; break;
        case shortcuts.textTool: setTool('text'); handled = true; break;
        case shortcuts.playPause: setIsPlaying(p => !p); handled = true; break;
        case shortcuts.nextFrame: setCurrentFrameIndex(i => Math.min(frames.length - 1, i + 1)); handled = true; break;
        case shortcuts.prevFrame: setCurrentFrameIndex(i => Math.max(0, i - 1)); handled = true; break;
        case shortcuts.addFrame: addFrame(); handled = true; break;
        case 'Escape':
          if (selection) {
            handleSelectionCommit();
            handled = true;
          }
          break;
        case 'Enter':
          if (selection) {
            handleSelectionCommit();
            handled = true;
          }
          break;
        case shortcuts.deleteFrame: 
        case 'Delete':
        case 'Backspace':
          if (selection) {
            handleSelectionDelete();
            handled = true;
          } else if (finalKey === shortcuts.deleteFrame) {
            deleteFrame(currentFrameIndex); 
            handled = true;
          }
          break;
        case shortcuts.undo: undo(); handled = true; break;
        case shortcuts.redo: redo(); handled = true; break;
        case 'Ctrl+c': handleCopy(); handled = true; break;
        case 'Ctrl+v': handlePaste(); handled = true; break;
        case 'Ctrl+x': handleCut(); handled = true; break;
        case 'h':
        case 'H':
        case '?':
          setIsTutorialOpen(prev => !prev);
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [shortcuts, view, frames.length, currentFrameIndex, isPlaying, tool, history, historyIndex, selection]);

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-white overflow-hidden font-sans" style={{ '--accent-color': accentColor, fontFamily: uiFont } as any}>
      {deviceType === null && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] rounded-3xl p-10 max-w-lg w-full border border-gray-700 shadow-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">{t('menu.welcome')}</h2>
            <p className="text-gray-400 mb-8">{t('menu.welcomeDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => setDeviceType('mobile')}
                className="flex flex-col items-center gap-4 p-8 bg-gray-800 hover:bg-gray-700 rounded-3xl border border-gray-700 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Icons.Smartphone size={32} />
                </div>
                <span className="text-xl font-bold">{t('globalSettings.mobile')}</span>
              </button>
              <button 
                onClick={() => setDeviceType('pc')}
                className="flex flex-col items-center gap-4 p-8 bg-gray-800 hover:bg-gray-700 rounded-3xl border border-gray-700 transition-all group"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <Icons.Monitor size={32} />
                </div>
                <span className="text-xl font-bold">{t('globalSettings.pc')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => setIsChangelogOpen(false)} 
      />

      <VideoImportModal
        isOpen={isVideoImportOpen}
        videoFile={importingVideoFile}
        onClose={() => { setIsVideoImportOpen(false); setImportingVideoFile(null); }}
        onImport={handleImportVideo}
        targetFps={fps}
      />

      {view === 'menu' ? (
        <div className="flex flex-col h-full p-6 md:p-8 overflow-hidden max-w-7xl mx-auto w-full">
          {/* Header section */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF3B30] to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <Icons.Clapperboard size={22} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {t('menu.myAnimations', 'ClipAnim Workspace')}
                  </h1>
                  <p className="text-xs md:text-sm text-gray-400">
                    {t('menu.myAnimationsDesc', 'Organize your animations, paintings, and creative folders')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Icons.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={homeSearchQuery}
                  onChange={(e) => setHomeSearchQuery(e.target.value)}
                  placeholder={t('menu.searchPlaceholder', 'Search projects & folders...')}
                  className="w-full bg-gray-800/80 border border-gray-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                />
                {homeSearchQuery && (
                  <button
                    onClick={() => setHomeSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <Icons.X size={14} />
                  </button>
                )}
              </div>

              {/* Create Folder Button */}
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setIsFolderModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/80 text-white px-3.5 py-2 rounded-xl transition-all font-bold text-xs shadow-sm hover:border-gray-600"
              >
                <Icons.FolderPlus size={16} className="text-blue-400" />
                <span>{t('folders.newFolder', 'New Folder')}</span>
              </button>

              <button
                onClick={() => setIsTutorialOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--accent-color)] to-orange-500 hover:opacity-90 text-white px-3.5 py-2 rounded-xl transition-all font-bold text-xs shadow-md"
                title={t('tutorial.title', 'ClipAnim Academy & Tutorial')}
              >
                <Icons.GraduationCap size={16} />
                <span>{t('tutorial.button', 'Tutorial')}</span>
              </button>

              <button
                onClick={() => setIsGlobalSettingsOpen(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/80 rounded-xl text-gray-300 hover:text-white transition-colors"
                title={t('timeline.settings')}
              >
                <Icons.Settings size={18} />
              </button>

              <button
                onClick={() => setIsChangelogOpen(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/80 rounded-xl text-gray-300 hover:text-white transition-colors"
                title={t('changelog.fullChangelog')}
              >
                <Icons.FileJson size={18} />
              </button>
            </div>
          </div>

          {/* Breadcrumb Navigation Bar (when inside a folder) */}
          {currentFolder ? (
            <div className="mb-6 p-4 rounded-2xl bg-gray-800/60 border border-gray-700/80 flex items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="p-2 rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  <Icons.ChevronLeft size={16} />
                  <span>{t('folders.allFiles', 'All Workspace Items')}</span>
                </button>
                <span className="text-gray-600">/</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: `${currentFolder.color || '#007AFF'}30`, color: currentFolder.color || '#007AFF' }}
                  >
                    <Icons.FolderOpen size={16} />
                  </div>
                  <h2 className="font-bold text-base text-white">{currentFolder.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 font-mono">
                    {displayProjects.length} {displayProjects.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingFolder(currentFolder);
                    setIsFolderModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-medium flex items-center gap-1"
                >
                  <Icons.Edit2 size={14} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setFolderToDelete(currentFolder)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors text-xs font-medium flex items-center gap-1"
                >
                  <Icons.Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Category Filter Tabs & Sorting */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setHomeFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  homeFilter === 'all'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icons.LayoutGrid size={14} />
                <span>{t('menu.allTypes', 'All Items')}</span>
                <span className="ml-1 text-[10px] opacity-70 bg-black/10 px-1.5 py-0.5 rounded-full font-mono">
                  {savedProjects.length + folders.length}
                </span>
              </button>

              <button
                onClick={() => setHomeFilter('animations')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  homeFilter === 'animations'
                    ? 'bg-[#FF3B30] text-white shadow-md'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icons.Film size={14} className={homeFilter === 'animations' ? 'text-white' : 'text-[#FF3B30]'} />
                <span>{t('menu.animations', 'Animations')}</span>
                <span className="ml-1 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
                  {totalAnimationsCount}
                </span>
              </button>

              <button
                onClick={() => setHomeFilter('paintings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  homeFilter === 'paintings'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icons.Palette size={14} className={homeFilter === 'paintings' ? 'text-white' : 'text-purple-400'} />
                <span>{t('menu.paintings', 'Paintings & Art')}</span>
                <span className="ml-1 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
                  {totalPaintingsCount}
                </span>
              </button>

              <button
                onClick={() => setHomeFilter('games')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  homeFilter === 'games'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icons.Gamepad2 size={14} className={homeFilter === 'games' ? 'text-white' : 'text-cyan-400'} />
                <span>Games</span>
                <span className="ml-1 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
                  {totalGamesCount}
                </span>
              </button>

              <button
                onClick={() => setHomeFilter('folders')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  homeFilter === 'folders'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icons.Folder size={14} className={homeFilter === 'folders' ? 'text-white' : 'text-blue-400'} />
                <span>{t('menu.folders', 'Folders')}</span>
                <span className="ml-1 text-[10px] opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
                  {folders.length}
                </span>
              </button>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-gray-800/80 border border-gray-700/80 rounded-xl px-3 py-1.5">
                <Icons.ArrowUpDown size={14} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Sort by:</span>
                <select
                  value={homeSortBy}
                  onChange={(e) => setHomeSortBy(e.target.value as 'date' | 'name' | 'type')}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="date" className="bg-[#1e1e1e]">Date Modified</option>
                  <option value="name" className="bg-[#1e1e1e]">Name</option>
                  <option value="type" className="bg-[#1e1e1e]">Type</option>
                </select>
              </div>

              <button
                onClick={() => setHomeSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/80 rounded-xl text-gray-300 hover:text-white transition-colors flex items-center justify-center"
                title={homeSortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {homeSortOrder === 'asc' ? <Icons.ArrowUp size={14} /> : <Icons.ArrowDown size={14} />}
              </button>
            </div>
          </div>

          <input ref={importFileRef} type="file" accept=".canim,.json,.clipanim" onChange={handleImportProjectFile} className="hidden" />

          {/* Main Content Scroll Area */}
          <div className="flex-1 overflow-y-auto pb-12 pr-1 space-y-8">
            {/* FOLDERS SECTION */}
            {displayFolders.length > 0 && (homeFilter === 'all' || homeFilter === 'folders') && currentFolderId === null && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Icons.Folder size={14} className="text-blue-400" />
                    <span>{t('menu.foldersHeader', 'Folders')} ({displayFolders.length})</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayFolders.map((folder) => {
                    const itemsInFolder = savedProjects.filter(p => p.folderId === folder.id);
                    const animsInFolder = itemsInFolder.filter(p => p.type !== 'painting').length;
                    const paintingsInFolder = itemsInFolder.filter(p => p.type === 'painting').length;

                    return (
                      <div
                        key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="group bg-[#1e1e1e] hover:bg-[#252525] border border-gray-800 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all shadow-md hover:shadow-xl relative flex flex-col justify-between min-h-[110px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110 shrink-0"
                              style={{ backgroundColor: `${folder.color || '#007AFF'}25`, color: folder.color || '#007AFF' }}
                            >
                              <Icons.Folder size={22} />
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-white text-sm truncate group-hover:text-blue-400 transition-colors">
                                {folder.name}
                              </h4>
                              <span className="text-[10px] text-gray-400 font-medium block">
                                {itemsInFolder.length} {itemsInFolder.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                          </div>

                          {/* Options dropdown */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setIsFolderModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                              title="Edit Folder"
                            >
                              <Icons.Edit2 size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete(folder);
                              }}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white"
                              title="Delete Folder"
                            >
                              <Icons.Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-800/80 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1 text-[#FF3B30]">
                            <Icons.Film size={10} />
                            {animsInFolder}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-400">
                            <Icons.Palette size={10} />
                            {paintingsInFolder}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PROJECTS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Icons.LayoutGrid size={14} className="text-[var(--accent-color)]" />
                  <span>{t('menu.projectsHeader', 'Projects')} ({displayProjects.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Creation Quick Action Cards (only show if not searching) */}
                {!homeSearchQuery && (
                  <>
                    {/* New Animation Button */}
                    <button
                      onClick={() => createNewProject('animation')}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-800 hover:border-[#FF3B30] hover:bg-[#FF3B30]/5 flex flex-col items-center justify-center group transition-all p-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] mb-2.5 group-hover:scale-110 transition-transform shadow-md">
                        <Icons.Clapperboard size={24} />
                      </div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-white">{t('menu.newProject', 'New Animation')}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Multi-frame timeline</span>
                    </button>

                    {/* New Painting Button */}
                    <button
                      onClick={() => createNewProject('painting')}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-800 hover:border-purple-500 hover:bg-purple-500/5 flex flex-col items-center justify-center group transition-all p-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500 mb-2.5 group-hover:scale-110 transition-transform shadow-md">
                        <Icons.Palette size={24} />
                      </div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-white">{t('menu.newPainting', 'New Painting')}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Single canvas artwork</span>
                    </button>

                    {/* New Game Button */}
                    <button
                      onClick={() => createNewProject('game')}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-800 hover:border-cyan-500 hover:bg-cyan-500/5 flex flex-col items-center justify-center group transition-all p-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2.5 group-hover:scale-110 transition-transform shadow-md">
                        <Icons.Gamepad2 size={24} />
                      </div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-white">New Game</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Interactive scripted quiz</span>
                    </button>

                    {/* Import Button */}
                    <button
                      onClick={() => importFileRef.current?.click()}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-800 hover:border-blue-500 hover:bg-blue-500/5 flex flex-col items-center justify-center group transition-all p-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-2.5 group-hover:scale-110 transition-transform shadow-md">
                        <Icons.Upload size={24} />
                      </div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-white">{t('menu.importProject', 'Import File')}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">.canim or .json file</span>
                    </button>

                    {/* Interactive Tutorial Button */}
                    <button
                      onClick={() => setIsTutorialOpen(true)}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-800 hover:border-amber-500 hover:bg-amber-500/5 flex flex-col items-center justify-center group transition-all p-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2.5 group-hover:scale-110 transition-transform shadow-md">
                        <Icons.GraduationCap size={24} />
                      </div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-white">{t('tutorial.button', 'Tutorial')}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Interactive guide & tips</span>
                    </button>
                  </>
                )}

                {/* PROJECT CARDS */}
                {displayProjects.map((project) => {
                  const isPainting = project.type === 'painting';
                  const isGame = project.type === 'game';
                  const projectFolderObj = folders.find(f => f.id === project.folderId);

                  let ringClass = 'hover:ring-2 ring-[#FF3B30]/80';
                  if (isPainting) ringClass = 'hover:ring-2 ring-purple-500/80';
                  else if (isGame) ringClass = 'hover:ring-2 ring-cyan-500/80';

                  return (
                    <div
                      key={project.id}
                      onClick={() => loadProject(project.id)}
                      className={`relative group aspect-[4/3] bg-[#1e1e1e] rounded-2xl overflow-hidden cursor-pointer border border-gray-800 hover:border-gray-600 transition-all shadow-lg hover:shadow-2xl ${ringClass}`}
                    >
                      {/* Thumbnail Preview */}
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.name}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:12px_12px] bg-[#141414] flex items-center justify-center text-gray-700">
                          {isPainting ? (
                            <Icons.Palette size={40} />
                          ) : isGame ? (
                            <Icons.Gamepad2 size={40} className="text-cyan-400/60" />
                          ) : (
                            <Icons.Clapperboard size={40} />
                          )}
                        </div>
                      )}

                      {/* DISTINCT TYPE BADGE (Top Left) */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                        {isPainting ? (
                          <span className="bg-purple-600/95 text-white font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm border border-purple-400/40">
                            <Icons.Palette size={12} />
                            <span>Painting</span>
                          </span>
                        ) : isGame ? (
                          <span className="bg-cyan-600/95 text-white font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm border border-cyan-400/40">
                            <Icons.Gamepad2 size={12} />
                            <span>Game</span>
                          </span>
                        ) : (
                          <span className="bg-[#FF3B30]/95 text-white font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm border border-red-400/40">
                            <Icons.Film size={12} />
                            <span>Animation</span>
                          </span>
                        )}
                      </div>

                      {/* Top Right Action Buttons (Move Folder & Delete) */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingProject(project);
                          }}
                          className="p-1.5 bg-black/70 hover:bg-blue-600 text-white rounded-lg backdrop-blur-sm transition-colors shadow-md"
                          title={t('folders.moveToFolder', 'Move to Folder')}
                        >
                          <Icons.FolderOutput size={14} />
                        </button>
                        <button
                          onClick={(e) => deleteProject(e, project.id)}
                          className="p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition-colors shadow-md"
                          title={t('tooltips.deleteProject')}
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>

                      {/* Bottom Info Gradient Bar */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3.5 pt-10 flex flex-col justify-end">
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-[var(--accent-color)] transition-colors">
                          {project.name}
                        </h3>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                          <span>{new Date(project.lastModified).toLocaleDateString()}</span>

                          {/* Details or Folder Tag */}
                          {projectFolderObj && currentFolderId === null ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentFolderId(projectFolderObj.id);
                              }}
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20"
                            >
                              <Icons.Folder size={10} />
                              <span className="truncate max-w-[80px]">{projectFolderObj.name}</span>
                            </span>
                          ) : isPainting ? (
                            <span className="text-purple-300 font-mono">Single Frame</span>
                          ) : (
                            <span className="text-red-300 font-mono">
                              {project.frameCount || 1} {project.frameCount === 1 ? 'frame' : 'frames'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm">
              <Icons.Loader2 className="w-12 h-12 text-[var(--accent-color)] animate-spin" />
            </div>
          )}

          {/* Folder Modal for Create/Edit */}
          <FolderModal
            isOpen={isFolderModalOpen}
            onClose={() => setIsFolderModalOpen(false)}
            onSave={handleCreateOrUpdateFolder}
            initialName={editingFolder?.name || ''}
            initialColor={editingFolder?.color || '#007AFF'}
            isEditing={!!editingFolder}
          />

          {/* Move Project to Folder Modal */}
          <MoveToFolderModal
            isOpen={movingProject !== null}
            onClose={() => setMovingProject(null)}
            projectName={movingProject?.name || ''}
            currentFolderId={movingProject?.folderId || null}
            folders={folders}
            onMove={(targetFolderId) => {
              if (movingProject) {
                handleMoveProjectToFolder(movingProject.id, targetFolderId);
              }
            }}
            onCreateNewFolder={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
          />

          {/* Delete Folder Confirm Dialog */}
          {folderToDelete && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <div className="bg-[#1e1e1e] border border-gray-700/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center">
                    <Icons.Trash2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Delete Folder?</h3>
                    <p className="text-xs text-gray-400">Projects inside will be kept safely in your workspace home.</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 font-medium">
                  Are you sure you want to delete <span className="text-white font-bold">"{folderToDelete.name}"</span>?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setFolderToDelete(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folderToDelete)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md"
                  >
                    Delete Folder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div key={projectId} className="flex flex-col h-full overflow-hidden relative">
      {!isFocusMode && (
        <header className="h-14 bg-[#1e1e1e] border-b border-gray-700 shrink-0 z-30 overflow-x-auto overflow-y-hidden">
            <div className="flex items-center justify-between px-4 h-full min-w-max space-x-8">
                <div className="flex items-center space-x-2">
                    {editingSymbolId ? (
                        <button onClick={exitSymbolEditMode} className="flex items-center space-x-2 px-3 py-1.5 bg-[#007AFF] hover:bg-blue-600 rounded-lg text-white font-medium text-sm transition-colors shadow-lg">
                            <Icons.ChevronLeft size={16} />
                            <span>Return to Main Scene</span>
                        </button>
                    ) : (
                        <button onClick={handleGoHome} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white relative"><Icons.Home size={24} />{hasUnsavedChanges && <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-color)] rounded-full ring-2 ring-[#1e1e1e]" />}</button>
                    )}
                    <input 
                        type="text"
                        value={projectName}
                        onChange={(e) => {
                            setProjectName(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        className="font-bold text-lg hidden sm:block truncate max-w-[150px] bg-transparent hover:bg-gray-800 focus:bg-gray-800 rounded px-2 outline-none border border-transparent focus:border-gray-600 transition-colors cursor-text text-white"
                        title={t('settings.name')}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded-full ${historyIndex > 0 ? 'text-white' : 'text-gray-600'}`}> <Icons.Undo size={20} /> </button>
                    <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-full ${historyIndex < history.length - 1 ? 'text-gray-600' : 'text-white'}`}> <Icons.Redo size={20} /> </button>
                    <button 
                      onClick={() => canvasRef.current?.zoomOut()} 
                      className="p-2 rounded-full text-gray-400 hover:text-white" 
                      title={t('tooltips.zoomOut')}
                    >
                      <Icons.ZoomOut size={20} />
                    </button>
                    <button 
                      onClick={() => canvasRef.current?.resetView()} 
                      className="p-2 rounded-full text-gray-400 hover:text-white" 
                      title={t('tooltips.resetView')}
                    >
                      <Icons.RotateCcw size={20} />
                    </button>
                    <button 
                      onClick={() => canvasRef.current?.zoomIn()} 
                      className="p-2 rounded-full text-gray-400 hover:text-white" 
                      title={t('tooltips.zoomIn')}
                    >
                      <Icons.ZoomIn size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1" />
                    <button onClick={() => importIntoSelectionRef.current?.click()} disabled={!selection} className={`p-2 rounded-full ${selection ? 'text-gray-400 hover:text-white' : 'text-gray-600'}`} title={t('tooltips.importIntoSelection')}><Icons.Image size={20} /></button>
                    <button onClick={handleCut} disabled={!selection} className="p-2 text-gray-400 hover:text-white" title={t('tooltips.cut')}><Icons.Scissors size={20} /></button>
                    <button onClick={handleCopy} disabled={!selection} className="p-2 text-gray-400 hover:text-white" title={t('tooltips.copy')}><Icons.Copy size={20} /></button>
                    <button onClick={handlePaste} className="p-2 rounded-full text-gray-400 hover:text-white" title={t('tooltips.paste')}><Icons.Clipboard size={20} /></button>
                    <button 
                      onClick={() => handleSelectionCommit()} 
                      disabled={!selection} 
                      className={`p-2 rounded-full ${selection ? 'text-green-400 hover:text-green-300' : 'text-gray-600'}`} 
                      title={t('tooltips.commitSelection')}
                    >
                      <Icons.Check size={20} />
                    </button>
                    <button 
                      onClick={handleSelectionDelete} 
                      disabled={!selection} 
                      className={`p-2 rounded-full ${selection ? 'text-red-400 hover:text-red-300' : 'text-gray-600'}`} 
                      title={t('tooltips.deleteSelection')}
                    >
                      <Icons.Trash2 size={20} />
                    </button>
                    {selection && (
                      <button 
                        onClick={() => handleMakeSymbol()} 
                        className="p-2 ml-1 rounded-full text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20" 
                        title="Make Symbol"
                      >
                        <Icons.Box size={20} />
                      </button>
                    )}
                    {selection?.actorId && (
                      <button 
                        onClick={() => enterSymbolEditMode(selection.actorId!)} 
                        className="p-2 ml-1 rounded-full text-[#007AFF] hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20" 
                        title="Edit Symbol Timeline"
                      >
                        <Icons.Film size={20} />
                      </button>
                    )}
                </div>
                <div id="tour-right-actions" className="flex items-center space-x-1 sm:space-x-2">
                    <button id="tour-btn-tutorial" onClick={() => setIsTutorialOpen(true)} className="p-3 text-amber-400 hover:text-amber-300" title={t('tutorial.title', 'Tutorial')}><Icons.GraduationCap size={20} /></button>
                    <button id="tour-btn-test-movie" onClick={() => setIsTestingMovie(true)} className={`p-3 rounded-full transition-colors ${actors.length > 0 ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`} title="Test Interactive Movie"><Icons.Gamepad2 size={20} /></button>
                    <button 
                      id="tour-btn-backpack" 
                      onClick={() => setIsBackpackOpen(true)} 
                      className={`p-3 rounded-full transition-colors relative ${
                        isSelectingForBackpack || isBackpackOpen || isQuickBackpackDockOpen
                          ? 'text-amber-400 bg-amber-500/10' 
                          : 'text-gray-400 hover:text-white'
                      }`} 
                      title={t('tooltips.backpack')}
                    >
                      <Icons.Briefcase size={20} />
                      {backpackItems.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#18181b]" />
                      )}
                    </button>
                    <button id="tour-btn-layers" onClick={() => { setIsLayerPanelOpen(!isLayerPanelOpen); setIsSymbolPanelOpen(false); }} className={`p-3 rounded-full ${isLayerPanelOpen ? 'text-[#FF3B30]' : 'text-gray-400 hover:text-white'}`} title={t('tooltips.layers')}><Icons.Layers size={20} /></button>
                    <button id="tour-btn-symbols" onClick={() => { setIsSymbolPanelOpen(!isSymbolPanelOpen); setIsLayerPanelOpen(false); }} className={`p-3 rounded-full ${isSymbolPanelOpen ? 'text-[#007AFF]' : 'text-gray-400 hover:text-white'}`} title="Symbol Library"><Icons.Library size={20} /></button>
                    <button id="tour-btn-assets" onClick={() => setIsAssetLibraryOpen(true)} className="p-3 text-indigo-400 hover:text-indigo-300 rounded-full transition-colors" title="Asset Library"><Icons.Library size={20} /></button>
                    <button id="tour-btn-save" onClick={saveProject} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.saveProject')}><Icons.Save size={20} /></button>
                    <button id="tour-btn-export" onClick={() => setIsExportModalOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.export')}><Icons.Download size={20} /></button>
                    <button id="tour-btn-settings" onClick={() => setIsSettingsOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.projectSettings')}><Icons.LayoutGrid size={20} /></button>
                    <button id="tour-btn-global-settings" onClick={() => setIsGlobalSettingsOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.globalSettings')}><Icons.Settings size={20} /></button>
                </div>
            </div>
        </header>
      )}
      <main className="flex-1 relative flex flex-row overflow-visible min-h-0">
        <Toolbar 
            currentTool={tool} 
            onSelectTool={setTool} 
            currentBrushType={brushType} 
            onSelectBrushType={setBrushType} 
            symmetryMode={symmetryMode}
            onSelectSymmetryMode={setSymmetryMode}
            customBrushes={customBrushes}
            onAddCustomBrush={(brush) => setCustomBrushes([...customBrushes, brush])}
            currentColor={color} 
            onChangeColor={setColor} 
            strokeWidth={currentStrokeWidth} 
            onChangeStrokeWidth={handleStrokeWidthChange} 
            onionSkin={onionSkin} 
            onToggleOnionSkin={() => setOnionSkin(!onionSkin)} 
            showGrid={showGrid} 
            onToggleGrid={() => setShowGrid(!showGrid)} 
            isFocusMode={isFocusMode} 
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)} 
            isPainting={projectType === 'painting'}
            onImportImage={handleImportImage} 
            onImportVideo={(file) => { setImportingVideoFile(file); setIsVideoImportOpen(true); }}
            hasSelection={!!selection} 
            onFlipHorizontal={() => setSelection(selection ? {...selection, scaleX: selection.scaleX * -1} : null)} 
            onFlipVertical={() => setSelection(selection ? {...selection, scaleY: selection.scaleY * -1} : null)} 
            onRotate={() => setSelection(selection ? {...selection, rotation: (selection.rotation + 90) % 360} : null)} 
            onSelectionCommit={handleSelectionCommit}
            onSelectionDelete={handleSelectionDelete}
            onSelectionMakeSymbol={handleMakeSymbol}
            shapeType={shapeType} 
            onSelectShapeType={setShapeType} 
            onOpenHelp={() => setIsHelpOpen(true)} 
            onOpenCodeEditor={() => setIsScriptEditorOpen(true)}
            textToolFont={textToolFont}
            onSelectTextToolFont={setTextToolFont}
            textToolBold={textToolBold}
            setTextToolBold={setTextToolBold}
            textToolItalic={textToolItalic}
            setTextToolItalic={setTextToolItalic}
            fillOpacity={fillOpacity}
            onChangeFillOpacity={setFillOpacity}
            fillTolerance={fillTolerance}
            onChangeFillTolerance={setFillTolerance}
            smoothing={smoothing}
            onChangeSmoothing={setSmoothing}
        />
        <div id="tour-canvas" className="flex-1 relative min-h-0 overflow-visible bg-[#2a2a2a]">
            {/* Auto-save notification HUD */}
            {autoSaveStatus === 'warning' && (
                <div className="absolute top-4 left-4 z-[40] bg-[#1e1e1e]/90 border border-red-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl shadow-black/50 flex items-center gap-3 backdrop-blur-md pointer-events-none select-none animate-pulse">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="font-semibold text-xs tracking-wide text-gray-200">
                        Saving animation in <span className="text-red-400 font-bold font-mono text-sm">{autoSaveTimer}</span>s...
                    </span>
                </div>
            )}
            {autoSaveStatus === 'saved' && (
                <div className="absolute top-4 left-4 z-[40] bg-[#1e1e1e]/95 border border-emerald-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl shadow-black/50 flex items-center gap-2.5 backdrop-blur-md pointer-events-none select-none">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Icons.Check size={14} className="stroke-[3]" />
                    </div>
                    <span className="font-semibold text-xs tracking-wide text-gray-200">
                        Saved successfully!
                    </span>
                </div>
            )}

            <CanvasArea 
                ref={canvasRef} 
                currentFrame={frames[currentFrameIndex]} 
                layers={layers} 
                activeLayerId={activeLayerId} 
                onUpdateLayer={handleUpdateLayer} 
                tool={tool} 
                brushType={brushType} 
                shapeType={shapeType} 
                color={color} 
                strokeWidth={currentStrokeWidth} 
                beforeFrames={frames.slice(Math.max(0, currentFrameIndex - onionSkinSettings.numBefore), currentFrameIndex).reverse()} 
                afterFrames={frames.slice(currentFrameIndex + 1, currentFrameIndex + 1 + onionSkinSettings.numAfter)} 
                onionSkin={onionSkin} 
                onionSkinSettings={onionSkinSettings} 
                showGrid={showGrid} 
                isPlaying={isPlaying} 
                selection={selection} 
                onSelectionCreate={handleSelectionCreate} 
                onSelectionUpdate={setSelection} 
                onSelectionCommit={handleSelectionCommit} 
                onSelectionDelete={handleSelectionDelete}
                onSelectionMakeSymbol={handleMakeSymbol}
                canvasWidth={canvasSize.width} 
                canvasHeight={canvasSize.height} 
                background={background}
                backgroundImage={backgroundImage} 
                textToolFont={textToolFont} 
                fillOpacity={fillOpacity}
                fillTolerance={fillTolerance}
                smoothing={smoothing}
                deviceType={deviceType}
                onColorPick={setColor}
                cameraMode={cameraMode}
                onToggleCameraMode={() => setCameraMode(!cameraMode)}
                symmetryMode={symmetryMode}
                onApplyMotionPath={handleApplyMotionPath}
                actors={actors.filter(a => a.targetFrame === undefined || a.targetFrame === currentFrameIndex)}
                onSelectActor={handleSelectActor}
            />
            <TweenModal
                isOpen={tweenTargetIndex !== null}
                onClose={() => setTweenTargetIndex(null)}
                onGenerate={(numTweens, easing, includeOnionSkin, interpolatePosition, interpolateScale, interpolateRotation, motionBlur, motionBlurStrength, motionBlurSamples, motionBlurShutterAngle) => {
                    if (tweenTargetIndex !== null) {
                        executeTween(
                          tweenTargetIndex, 
                          numTweens, 
                          easing, 
                          includeOnionSkin, 
                          interpolatePosition, 
                          interpolateScale, 
                          interpolateRotation,
                          motionBlur,
                          motionBlurStrength,
                          motionBlurSamples,
                          motionBlurShutterAngle
                        );
                    }
                }}
            />
            <TweenModal
                isOpen={pendingMotionPath !== null}
                onClose={() => setPendingMotionPath(null)}
                onGenerate={(numTweens, easing, _includeOnionSkin, _interpolatePosition, _interpolateScale, _interpolateRotation, motionBlur, motionBlurStrength, motionBlurSamples, motionBlurShutterAngle) => {
                    if (pendingMotionPath) {
                        finalizeMotionPath(
                          pendingMotionPath, 
                          numTweens, 
                          easing,
                          motionBlur,
                          motionBlurStrength,
                          motionBlurSamples,
                          motionBlurShutterAngle
                        );
                        setPendingMotionPath(null);
                    }
                }}
            />
            {/* Quick Floating Backpack Stamp Dock */}
            <QuickBackpackDock
              isOpen={isQuickBackpackDockOpen}
              onClose={() => setIsQuickBackpackDockOpen(false)}
              items={backpackItems}
              onSelectItem={handleSelectBackpackItem}
              onStampOnLayer={handleStampOnLayer}
              onOpenFullModal={() => {
                setIsQuickBackpackDockOpen(false);
                setIsBackpackOpen(true);
              }}
              onQuickCaptureSelection={() => {
                setTool('select');
                setIsSelectingForBackpack(true);
              }}
              onQuickPackLayer={handlePackCurrentLayer}
              onQuickPackFrame={handlePackCurrentFrame}
            />

            {(projectType === 'animation' || projectType === 'game') && (
                <div id="tour-timeline" className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
                    <Timeline 
                      frames={frames} 
                      currentFrameIndex={currentFrameIndex} 
                      onSelectFrame={handleSelectFrame} 
                      onAddFrame={addFrame} 
                      onDeleteFrame={deleteFrame} 
                      onCopyFrame={copyFrame} 
                      onTweenFrame={tweenFrame}
                      isPlaying={isPlaying} 
                      onTogglePlay={() => setIsPlaying(!isPlaying)} 
                      isLooping={isLooping}
                      onToggleLoop={() => setIsLooping(!isLooping)}
                      audioTracks={audioTracks} 
                      onAddAudioTrack={handleAddAudioTrack} 
                      onRemoveAudioTrack={handleRemoveAudioTrack} 
                      onUpdateAudioTrack={handleUpdateAudioTrack}
                      onCutAudioTrack={handleCutAudioTrack}
                      onOpenAudioEditor={() => setIsAudioEditorOpen(true)}
                      onUpdateFrameDuration={handleUpdateFrameDuration}
                      fps={fps}
                      isFocusMode={isFocusMode} 
                      onOpenFrameManager={() => setIsFrameManagerOpen(true)} 
                      onOpenRecorder={() => setIsAudioRecorderOpen(true)} 
                      onOpenSoundLibrary={() => setIsSoundLibraryOpen(true)}
                      background={background}
                      backgroundImage={backgroundImage}
                    />
                </div>
            )}
        </div>
      </main>

      <SoundLibraryModal
        isOpen={isSoundLibraryOpen}
        onClose={() => setIsSoundLibraryOpen(false)}
        onSelectSound={handleAddSoundLibraryTrack}
        savedSounds={savedSounds}
        onToggleSaveSound={handleToggleSaveSound}
      />
        </div>
      )}

      {showExitConfirm && view === 'editor' && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl text-center">
                <div className="w-16 h-16 bg-[var(--accent-color)]/20 rounded-full flex items-center justify-center text-[var(--accent-color)] mx-auto mb-6"> <Icons.Save size={32} /> </div>
                <h2 className="text-2xl font-bold mb-2">{t('menu.unsavedTitle')}</h2>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => confirmExit(true)} className="w-full py-4 bg-[var(--accent-color)] text-white font-bold rounded-2xl hover:opacity-90 transition-colors">{t('menu.saveAndExit')}</button>
                    <button onClick={() => confirmExit(false)} className="w-full py-4 bg-gray-700 text-white font-bold rounded-2xl hover:bg-gray-600 transition-colors">{t('menu.discardChanges')}</button>
                    <button onClick={() => setShowExitConfirm(false)} className="w-full py-4 bg-transparent text-gray-400 font-bold rounded-2xl hover:text-white transition-colors">{t('common.cancel')}</button>
                </div>
            </div>
        </div>
      )}
      {isExportModalOpen && view === 'editor' && (
        <ExportModal 
          isOpen={isExportModalOpen} 
          onClose={() => {
            if (!isExporting) {
              setIsExportModalOpen(false);
              setExportedFile(null);
            }
          }} 
          onExport={handleExportStart} 
          onCancel={() => {
            isExportCancelledRef.current = true;
            setIsExporting(false);
            setIsExportModalOpen(false);
          }}
          isExporting={isExporting} 
          progress={exportProgress} 
          projectName={projectName}
          setProjectName={(name) => {
              setProjectName(name);
              setHasUnsavedChanges(true);
          }}
          projectType={projectType}
          frameCount={frames.length}
          fps={fps}
          exportedFile={exportedFile}
          frames={frames}
          layers={layers}
          canvasSize={canvasSize}
          background={background}
          backgroundImage={backgroundImage}
          onOpenSpritesheetExport={() => setIsSpritesheetExportOpen(true)}
        />
      )}
      {isSpritesheetExportOpen && (
        <SpritesheetExportModal
          isOpen={isSpritesheetExportOpen}
          onClose={() => setIsSpritesheetExportOpen(false)}
          actors={actors}
          projectName={projectName}
        />
      )}
      {isTestingMovie && (
        <InteractivePlayer
          frames={frames}
          layers={layers}
          actors={actors}
          projectScript={projectScript}
          fps={fps}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          background={background}
          backgroundImage={backgroundImage}
          audioTracks={audioTracks}
          projectName={projectName}
          onClose={() => setIsTestingMovie(false)}
        />
      )}

      <ScriptEditorModal
        isOpen={isScriptEditorOpen}
        onClose={() => setIsScriptEditorOpen(false)}
        actors={actors}
        onUpdateActorScript={handleUpdateActorScript}
        projectScript={projectScript}
        onUpdateProjectScript={handleUpdateProjectScript}
        frames={frames}
        onUpdateFrameScript={handleUpdateFrameScript}
      />

      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />
      
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
        onStartInteractiveTour={handleStartTour}
      />

      <InteractiveTour 
        isActive={isInteractiveTourActive} 
        initialMode={interactiveTourMode}
        onComplete={() => setIsInteractiveTourActive(false)} 
        onOpenLayers={() => { setIsLayerPanelOpen(true); setIsSymbolPanelOpen(false); }}
        onOpenSymbols={() => { setIsSymbolPanelOpen(true); setIsLayerPanelOpen(false); }}
        onOpenScripts={() => setIsScriptEditorOpen(true)}
        onOpenTestMovie={() => setIsTestingMovie(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />
      
      {isLayerPanelOpen && view === 'editor' && (
        <LayerPanel 
          layers={layers} 
          layerFolders={layerFolders}
          activeLayerId={activeLayerId} 
          onSelectLayer={setActiveLayerId} 
          onAddLayer={addLayer} 
          onAddLayerFolder={addLayerFolder}
          onDuplicateLayer={duplicateLayer} 
          onRemoveLayer={removeLayer} 
          onRemoveLayerFolder={removeLayerFolder}
          onToggleVisibility={toggleLayerVisibility} 
          onToggleLock={toggleLayerLock} 
          onToggleFolderVisibility={toggleLayerFolderVisibility}
          onToggleFolderLock={toggleLayerFolderLock}
          onToggleFolderExpanded={toggleLayerFolderExpanded}
          onRenameLayerFolder={renameLayerFolder}
          onSetLayerFolderColor={setLayerFolderColor}
          onMoveLayerToFolder={moveLayerToFolder}
          onUpdateLayerSettings={updateLayerSettings} 
          onRenameLayer={renameLayer} 
          onReorderLayers={reorderLayers} 
          onReorderLayerFolders={reorderLayerFolders}
          onClose={() => setIsLayerPanelOpen(false)} 
        />
      )}

      {isSymbolPanelOpen && view === 'editor' && (
        <SymbolPanel
          actors={actors}
          onAddActor={(newActor) => {
            setActors(prev => [...prev, newActor]);
            setHasUnsavedChanges(true);
          }}
          onRemoveActor={(id) => {
            setActors(prev => prev.filter(a => a.id !== id));
            setHasUnsavedChanges(true);
          }}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          onClose={() => setIsSymbolPanelOpen(false)}
          onOpenSpritesheetExport={() => setIsSpritesheetExportOpen(true)}
          onOpenAssetLibrary={() => { setIsAssetLibraryOpen(true); setIsSymbolPanelOpen(false); }}
        />
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"> <Icons.Trash2 size={32} /> </div>
                <h2 className="text-2xl font-bold mb-2">{t('menu.deleteTitle')}</h2>
                <p className="text-gray-400 mb-8">{t('menu.deleteDesc')}</p>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={confirmDeleteProject} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors">{t('menu.deletePermanently')}</button>
                    <button onClick={() => setProjectToDelete(null)} className="w-full py-4 bg-gray-700 text-white font-bold rounded-2xl hover:bg-gray-600 transition-colors">{t('common.cancel')}</button>
                </div>
            </div>
        </div>
      )}

      <FrameManagerModal 
        isOpen={isFrameManagerOpen}
        onClose={() => setIsFrameManagerOpen(false)}
        frames={frames}
        fps={fps}
        layers={layers}
        onDeleteFrames={handleBulkDeleteFrames}
        onDuplicateFrames={handleBulkDuplicateFrames}
        onReorderFrames={handleReorderFrames}
        onUpdateFrameBackground={handleBulkUpdateFrameBackground}
        onUpdateFrameDuration={handleBulkUpdateFrameDuration}
        onUpdateFrameLabel={handleBulkUpdateFrameLabel}
        onReverseFrames={handleReverseFrames}
        onFlipFrames={handleBulkFlipFrames}
        onApplyFilterToFrames={handleBulkApplyFilterToFrames}
        onInsertBlankFrames={handleInsertBlankFrames}
        onCropFramesToSelection={handleCropFramesToSelection}
        onSelectFrame={(idx) => { setCurrentFrameIndex(idx); setIsFrameManagerOpen(false); }}
      />

      <AudioRecorderModal 
        isOpen={isAudioRecorderOpen}
        onClose={() => setIsAudioRecorderOpen(false)}
        onSave={handleAddRecordedAudio}
      />

      <BackpackModal
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
        items={backpackItems}
        onSelectItem={handleSelectBackpackItem}
        onDeleteItem={(id) => {
          setBackpackItems(prev => prev.filter(i => i.id !== id));
        }}
        onDeleteMultipleItems={(ids) => {
          const idSet = new Set(ids);
          setBackpackItems(prev => prev.filter(i => !idSet.has(i.id)));
        }}
        onUpdateItem={(id, updates) => {
          if (typeof updates === 'string') {
            setBackpackItems(prev => prev.map(item => item.id === id ? { ...item, name: updates } : item));
          } else {
            setBackpackItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
          }
        }}
        onStartSelecting={() => {
          setIsBackpackOpen(false);
          setTool('select');
          setIsSelectingForBackpack(true);
        }}
        onImportItems={setBackpackItems}
        onPackCurrentLayer={handlePackCurrentLayer}
        onPackCurrentFrame={handlePackCurrentFrame}
        onStampOnLayer={handleStampOnLayer}
        onPlaceAsNewLayer={handlePlaceAsNewLayer}
        onConvertToActor={handleConvertToActor}
        onSetAsBackground={(item) => {
          setBackgroundImage(item.dataUrl);
          setHasUnsavedChanges(true);
        }}
        onToggleQuickDock={() => setIsQuickBackpackDockOpen(!isQuickBackpackDockOpen)}
        isQuickDockOpen={isQuickBackpackDockOpen}
      />

      <AudioEditorModal 
        isOpen={isAudioEditorOpen}
        onClose={() => setIsAudioEditorOpen(false)}
        audioTracks={audioTracks}
        onUpdateAudioTrack={handleUpdateAudioTrack}
        onRemoveAudioTrack={handleRemoveAudioTrack}
        onAddAudioTrack={handleAddAudioTrack}
        onCutAudioTrack={handleCutAudioTrack}
        fps={fps}
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        onSelectFrame={handleSelectFrame}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        fps={fps} 
        setFps={setFps} 
        projectName={projectName} 
        setProjectName={setProjectName} 
        projectType={projectType}
        setProjectType={setProjectType}
        canvasSize={canvasSize} 
        setCanvasSize={setCanvasSize} 
        background={background}
        setBackground={setBackground}
        backgroundImage={backgroundImage} 
        setBackgroundImage={setBackgroundImage} 
        onBackupProject={handleBackupProject} 
        onionSkinSettings={onionSkinSettings} 
        setOnionSkinSettings={setOnionSkinSettings} 
        frames={frames}
        layers={layers}
        layerFolders={layerFolders}
        actors={actors}
        audioTracks={audioTracks}
      />
      <GlobalSettingsModal 
        isOpen={isGlobalSettingsOpen} 
        onClose={() => setIsGlobalSettingsOpen(false)} 
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        uiFont={uiFont}
        setUiFont={setUiFont}
        shortcuts={shortcuts}
        setShortcuts={setShortcuts}
        deviceType={deviceType}
        setDeviceType={setDeviceType}
        theme={theme}
        setTheme={setTheme}
      />
      
      <AssetLibraryModal
        isOpen={isAssetLibraryOpen}
        onClose={() => setIsAssetLibraryOpen(false)}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        onAddActor={(newActor) => {
          setActors(prev => [...prev, newActor]);
          setHasUnsavedChanges(true);
        }}
        onAddSoundTrack={handleAddSoundLibraryTrack}
        onSetBackgroundImage={setBackgroundImage}
        onInsertImageToLayer={handleInsertLibraryImage}
      />
      <input 
        ref={importIntoSelectionRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImportIntoSelection}
      />
      <input 
        ref={importGeneralImageRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImportGeneralImage}
      />
    </div>
  );
}