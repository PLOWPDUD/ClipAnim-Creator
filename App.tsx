import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Frame, ToolType, Layer, SelectionState, AudioTrack, ShapeType, ProjectData, ProjectMeta, BrushType, OnionSkinSettings, Shortcuts, BackpackItem, BackgroundSettings, SymmetryMode, Point } from './types';
import { CanvasArea, CanvasAreaHandle } from './components/CanvasArea';
import { Timeline } from './components/Timeline';
import { Toolbar } from './components/Toolbar';
import { Icons } from './Icons';
import { SettingsModal } from './components/SettingsModal';
import { LayerPanel } from './components/LayerPanel';
import { ExportModal, ExportFormat, ExportQuality } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { BackpackModal } from './components/BackpackModal';
import gifshot from 'gifshot';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { FrameManagerModal } from './components/FrameManagerModal';
import { AudioRecorderModal } from './components/AudioRecorderModal';
import { SoundLibraryModal } from './components/SoundLibraryModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { ChangelogModal } from './components/ChangelogModal';
import { VideoImportModal } from './components/VideoImportModal';
import { TweenModal } from './components/TweenModal';
import { compositeLayers, drawSelectionOntoCanvas } from './utils/drawingUtils';
import { saveProjectToDB, loadProjectFromDB, getProjectList, deleteProjectFromDB } from './utils/db';

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
    const CURRENT_VERSION = '1.0.9';
    const lastSeenVersion = localStorage.getItem('clipanim_last_seen_version');
    
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsChangelogOpen(true);
      localStorage.setItem('clipanim_last_seen_version', CURRENT_VERSION);
    }
  }, []);

  const [projectId, setProjectId] = useState<string>(crypto.randomUUID());
  const [projectName, setProjectName] = useState(t('app.defaultProjectName'));
  const [projectType, setProjectType] = useState<'animation' | 'painting'>('animation');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [background, setBackground] = useState<BackgroundSettings>({ type: 'color', color: '#ffffff' });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [layers, setLayers] = useState<Layer[]>([createDefaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  const [frames, setFrames] = useState<Frame[]>([]);
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
  const [isFrameManagerOpen, setIsFrameManagerOpen] = useState(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
  const [isSoundLibraryOpen, setIsSoundLibraryOpen] = useState(false);
  const [savedSounds, setSavedSounds] = useState<{ name: string; url: string }[]>(() => {
    const saved = localStorage.getItem('clipanim_saved_sounds');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFile, setExportedFile] = useState<{ url: string, name: string, blob: Blob } | null>(null);
  const [tweenTargetIndex, setTweenTargetIndex] = useState<number | null>(null);
  const isExportCancelledRef = useRef(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const importIntoSelectionRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
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
              const projects = await getProjectList();
              setSavedProjects(projects);
          } catch (e) {
              console.error("Failed to load project list", e);
          }
      };
      fetchProjects();
  }, []);

  const addLayer = () => {
    const newLayerId = crypto.randomUUID();
    const newLayer = createDefaultLayer(newLayerId, `${t('layers.newLayer')} ${layers.length + 1}`);
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
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(objectUrl);
      audio.onloadedmetadata = () => {
        const newTrack: AudioTrack = {
          id: crypto.randomUUID(),
          url: objectUrl,
          name: name,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          volume: 1,
          startTime: currentFrameIndex / fps,
          duration: audio.duration,
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

  const handleSelectionCreate = (newSelection: SelectionState) => {
    if (isSelectingForBackpack) {
      if (newSelection.dataUrl) {
        const newItem: BackpackItem = {
          id: crypto.randomUUID(),
          dataUrl: newSelection.dataUrl,
          createdAt: Date.now()
        };
        setBackpackItems(prev => [...prev, newItem]);
      }
      setIsSelectingForBackpack(false);
      setSelection(null);
      setIsBackpackOpen(true);
      setTool('pen');
    } else {
      setSelection(newSelection);
    }
  };

  const handleSelectionCommit = async () => {
      if (!selection) return;

      const canvas = document.createElement('canvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const layerData = frames[currentFrameIndex].layers[activeLayerId];
      if (layerData) {
          const currentImg = await new Promise<HTMLImageElement>((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.src = layerData;
          });
          ctx.drawImage(currentImg, 0, 0);
      }

      await drawSelectionOntoCanvas(ctx, selection);
      
      const newDataUrl = canvas.toDataURL();
      await handleUpdateLayer(activeLayerId, newDataUrl);
      setSelection(null);
  };

  const handleApplyMotionPath = async (path: Point[]) => {
      if (!selection || path.length < 5) return;
      setPendingMotionPath(path);
  };

  const finalizeMotionPath = async (path: Point[], numFrames: number, easing: string) => {
      if (!selection || path.length < 5) return;

      const numFramesToAnimate = numFrames;
      const updatedFrames = [...frames];
      const sampledPath: Point[] = [];
      
      const getEasingProgress = (t: number, type: string) => {
        switch (type) {
          case 'ease-in': return t * t;
          case 'ease-out': return t * (2 - t);
          case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          default: return t; // linear
        }
      };

      for (let i = 0; i < numFramesToAnimate; i++) {
          const t = i / (numFramesToAnimate - 1);
          const easedT = getEasingProgress(t, easing);
          const index = easedT * (path.length - 1);
          const low = Math.floor(index);
          const high = Math.ceil(index);
          const frac = index - low;
          
          if (low === high) {
              sampledPath.push(path[low]);
          } else {
              sampledPath.push({
                  x: path[low].x * (1 - frac) + path[high].x * frac,
                  y: path[low].y * (1 - frac) + path[high].y * frac
              });
          }
      }

      let frameIdx = currentFrameIndex;
      const initialLayerData = updatedFrames[currentFrameIndex].layers[activeLayerId];
      
      for (let i = 0; i < sampledPath.length; i++) {
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
          const point = sampledPath[i];

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

              const movedSelection = {
                  ...selection,
                  x: point.x - (selection.anchorX ?? selection.width / 2),
                  y: point.y - (selection.anchorY ?? selection.height / 2)
              };

              await drawSelectionOntoCanvas(ctx, movedSelection);
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
        try {
            // Ensure even dimensions for H.264
            const exportWidth = canvasSize.width % 2 === 0 ? canvasSize.width : canvasSize.width - 1;
            const exportHeight = canvasSize.height % 2 === 0 ? canvasSize.height : canvasSize.height - 1;

            // Using mp4-muxer for valid MP4 generation
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: exportWidth,
                    height: exportHeight
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => { console.error(e); alert(t('errors.exportError', { message: e.message })); }
            });

            const bitrateMap = {
                low: 1_000_000,
                medium: 4_000_000,
                high: 10_000_000
            };

            videoEncoder.configure({
                codec: 'avc1.42001f', // Standard AVC
                width: exportWidth,
                height: exportHeight,
                bitrate: bitrateMap[quality],
                framerate: fps
            });

            // Loop frames
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

                 const frame = new VideoFrame(canvas, { timestamp: i * 1000000 / fps });
                 videoEncoder.encode(frame);
                 frame.close();

                 setExportProgress(30 + Math.round(((i + 1) / total) * 60));
            }

            await videoEncoder.flush();
            muxer.finalize();

            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            setExportedFile({ url, name: `${projectName}.mp4`, blob });
            setIsExporting(false);
            setExportProgress(100);

        } catch (e: any) {
            console.error("MP4 Export failed", e);
            alert(t('errors.mp4Error'));
            setIsExporting(false);
            setIsExportModalOpen(false);
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
    } else {
      // Fallback for WebM/AVI using MediaRecorder
      try {
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvasSize.width;
          exportCanvas.height = canvasSize.height;
          const ctx = exportCanvas.getContext('2d');
          
          if(!ctx) throw new Error("Could not create canvas context");

          const stream = exportCanvas.captureStream(fps);
          
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
      let thumb = '';
      if (frames.length > 0) {
          thumb = await compositeLayers(frames[0], layers, canvasSize.width, canvasSize.height, background, backgroundImage);
      }
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: thumb,
          type: projectType,
          canvasSize,
          background,
          backgroundImage,
          layers,
          frames,
          fps,
          audioTracks,
          motionPaths: [],
          onionSkinSettings
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
        setCanvasSize(data.canvasSize);
        setBackground(data.background || { type: 'color', color: '#ffffff' });
        setBackgroundImage(data.backgroundImage || null);
        setLayers(data.layers);
        setFrames(data.frames);
        setFps(data.fps);
        setAudioTracks(data.audioTracks || []);
        if (data.onionSkinSettings) setOnionSkinSettings(data.onionSkinSettings);
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

  const createNewProject = async (type: 'animation' | 'painting' = 'animation') => {
      clearAudio();
      const pid = crypto.randomUUID();
      setProjectId(pid);
      setProjectName(type === 'animation' ? t('menu.newProject') : t('menu.newPainting', 'New Painting'));
      setProjectType(type);
      setCanvasSize({ width: 800, height: 600 });
      setBackground({ type: 'color', color: '#ffffff' });
      const defaultL = [createDefaultLayer('1', `${t('layers.newLayer')} 1`)];
      setLayers(defaultL);
      setActiveLayerId(defaultL[0].id);
      const initialFrame = createBlankFrame(defaultL, 800, 600);
      initialFrame.thumbnailUrl = await compositeLayers(initialFrame, defaultL, 800, 600, { type: 'color', color: '#ffffff' }, null, false);
      setFrames([initialFrame]);
      setHistory([[initialFrame]]);
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

  const handleBackupProject = () => {
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: frames[0]?.thumbnailUrl || '',
          canvasSize,
          background,
          backgroundImage,
          layers,
          frames,
          fps,
          audioTracks,
          motionPaths: [],
          onionSkinSettings
      };
      const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}_backup.json`;
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

  const handleCopy = () => { if (selection) setClipboard(selection); };
  const handleCut = () => {
    if (selection) {
      setClipboard(selection);
      setSelection(null);
      setHasUnsavedChanges(true);
    }
  };
  const handlePaste = async () => {
    if (clipboard) {
      if (selection) {
        await handleSelectionCommit();
      }
      const newX = (canvasSize.width - clipboard.width) / 2;
      const newY = (canvasSize.height - clipboard.height) / 2;
      setSelection({ ...clipboard, x: newX, y: newY });
      setTool('select');
      setHasUnsavedChanges(true);
    }
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
                    if (isPlaying && audio.paused) {
                        audio.play().catch(e => {
                            if (e.name !== 'AbortError') console.error(e);
                        });
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
    interpolateRotation: boolean = true
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

    const getEasingProgress = (t: number, type: string) => {
      switch (type) {
        case 'ease-in': return t * t;
        case 'ease-out': return t * (2 - t);
        case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default: return t; // linear
      }
    };

    const getLayerStats = (img: HTMLImageElement, width: number, height: number) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return null;
      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      let minX = width, minY = height, maxX = -1, maxY = -1;
      let m00 = 0, m10 = 0, m01 = 0, m11 = 0, m20 = 0, m02 = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 0) {
            const weight = alpha / 255;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            
            m00 += weight;
            m10 += x * weight;
            m01 += y * weight;
            m11 += x * y * weight;
            m20 += x * x * weight;
            m02 += y * y * weight;
          }
        }
      }
      
      if (m00 < 0.1) return null;
      
      const centerX = m10 / m00;
      const centerY = m01 / m00;
      const mu20 = m20 / m00 - centerX * centerX;
      const mu02 = m02 / m00 - centerY * centerY;
      const mu11 = m11 / m00 - centerX * centerY;
      
      // Orientation angle in radians (principal axis)
      const angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
      
      return { 
        x: minX, 
        y: minY, 
        w: Math.max(1, maxX - minX + 1), 
        h: Math.max(1, maxY - minY + 1),
        centerX,
        centerY,
        angle
      };
    };

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

    for (let i = 1; i <= numTweens; i++) {
      const t = i / (numTweens + 1);
      const progress = getEasingProgress(t, easing);
      const newLayers: Record<string, string> = {};
      
      if (compositeCtx) {
        compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        // Background is handled by Timeline and CanvasArea separately, 
        // thumbnails for onion skinning should be transparent.
      }

      for (const layer of layers) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const { imgA, imgB, statsA, statsB } = layerData[layer.id];

        if (imgA && imgB && statsA && statsB) {
          // Interpolate stats
          const centerX = interpolatePosition ? (statsA.centerX + (statsB.centerX - statsA.centerX) * progress) : statsA.centerX;
          const centerY = interpolatePosition ? (statsA.centerY + (statsB.centerY - statsA.centerY) * progress) : statsA.centerY;
          const width = interpolateScale ? (statsA.w + (statsB.w - statsA.w) * progress) : statsA.w;
          const height = interpolateScale ? (statsA.h + (statsB.h - statsA.h) * progress) : statsA.h;
          
          // Shortest path for principal axis angle (-PI/2 to PI/2)
          let angle = statsA.angle;
          if (interpolateRotation) {
            let diff = statsB.angle - statsA.angle;
            while (diff > Math.PI / 2) diff -= Math.PI;
            while (diff < -Math.PI / 2) diff += Math.PI;
            angle = statsA.angle + diff * progress;
          }

          // Cross-fade with smooth transformation
          // Draw imgA
          ctx.globalAlpha = 1 - progress;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle - statsA.angle);
          ctx.scale(width / statsA.w, height / statsA.h);
          ctx.translate(-statsA.centerX, -statsA.centerY);
          ctx.drawImage(imgA, 0, 0);
          ctx.restore();

          // Draw imgB
          ctx.globalAlpha = progress;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle - statsB.angle);
          ctx.scale(width / statsB.w, height / statsB.h);
          ctx.translate(-statsB.centerX, -statsB.centerY);
          ctx.drawImage(imgB, 0, 0);
          ctx.restore();
        } else if (imgA || imgB) {
          // Fade in or fade out if only one exists
          ctx.globalAlpha = imgA ? (1 - progress) : progress;
          const targetImg = imgA || imgB;
          if (targetImg) {
            ctx.drawImage(targetImg, 0, 0);
          }
        }

        ctx.globalAlpha = 1.0;
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
        case shortcuts.deleteFrame: 
        case 'Delete':
          if (selection) {
            setSelection(null);
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
        <div className="flex flex-col h-full p-6 overflow-hidden">
             <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{t('menu.myAnimations')}</h1>
                    <p className="text-gray-400">{t('menu.myAnimationsDesc')}</p>
                    <div className="flex gap-4 items-center mt-4">
                         <button 
                            onClick={() => setIsGlobalSettingsOpen(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full transition-colors font-bold text-sm"
                        >
                            <Icons.Settings size={16} />
                            {t('timeline.settings')}
                        </button>
                        <button 
                            onClick={() => setIsChangelogOpen(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full transition-colors font-bold text-sm"
                        >
                            <Icons.FileJson size={16} />
                            {t('changelog.fullChangelog')}
                        </button>
                        <a href="https://github.com/PLOWPDUD/ClipAnim-Creator" target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-[var(--accent-color)] hover:opacity-80 transition-opacity bg-white/5 px-3 py-1.5 rounded-full border border-[var(--accent-color)]/20">{t('app.openSource')}</a>
                    </div>
                 </div>
                 <input ref={importFileRef} type="file" accept=".json" onChange={handleImportProjectFile} className="hidden" />
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-10">
                 <button onClick={() => createNewProject('animation')} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-[#FF3B30] hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] mb-3 group-hover:scale-110 transition-transform"><Icons.Plus size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">{t('menu.newProject')}</span>
                 </button>
                 <button onClick={() => createNewProject('painting')} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-purple-500 hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 mb-3 group-hover:scale-110 transition-transform"><Icons.Brush size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">{t('menu.newPainting', 'New Painting')}</span>
                 </button>
                 <button onClick={() => importFileRef.current?.click()} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform"><Icons.Upload size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">{t('menu.importProject')}</span>
                 </button>
                 {savedProjects.map(project => (
                     <div key={project.id} onClick={() => loadProject(project.id)} className="relative group aspect-[4/3] bg-[#1e1e1e] rounded-2xl overflow-hidden cursor-pointer hover:ring-2 ring-[var(--accent-color)] transition-all shadow-lg">
                         {project.thumbnailUrl ? ( <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /> ) : ( <div className="w-full h-full flex items-center justify-center text-gray-700"><Icons.Image size={48} /></div> )}
                         <div className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white">
                             {(project.type === 'painting') ? <Icons.Brush size={14} /> : <Icons.Video size={14} />}
                         </div>
                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                             <h3 className="font-bold truncate">{project.name}</h3>
                             <p className="text-[10px] text-gray-400">{new Date(project.lastModified).toLocaleDateString()}</p>
                         </div>
                         <button 
                            onClick={(e) => deleteProject(e, project.id)} 
                            className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-100 transition-opacity z-10"
                            title={t('tooltips.deleteProject')}
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                     </div>
                 ))}
             </div>
             {isLoading && <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm"><Icons.Loader2 className="w-12 h-12 text-[var(--accent-color)] animate-spin" /></div>}
        </div>
      ) : (
        <div key={projectId} className="flex flex-col h-full overflow-hidden relative">
      {!isFocusMode && (
        <header className="h-14 bg-[#1e1e1e] border-b border-gray-700 shrink-0 z-30 overflow-x-auto overflow-y-hidden">
            <div className="flex items-center justify-between px-4 h-full min-w-max space-x-8">
                <div className="flex items-center space-x-2">
                    <button onClick={handleGoHome} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white relative"><Icons.Home size={24} />{hasUnsavedChanges && <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-color)] rounded-full ring-2 ring-[#1e1e1e]" />}</button>
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
                    <button onClick={handlePaste} disabled={!clipboard} className="p-2 text-gray-400 hover:text-white" title={t('tooltips.paste')}><Icons.Clipboard size={20} /></button>
                    <button 
                      onClick={handleSelectionCommit} 
                      disabled={!selection} 
                      className={`p-2 rounded-full ${selection ? 'text-green-400 hover:text-green-300' : 'text-gray-600'}`} 
                      title={t('tooltips.commitSelection')}
                    >
                      <Icons.Check size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (selection) {
                          setSelection(null);
                          setHasUnsavedChanges(true);
                        }
                      }} 
                      disabled={!selection} 
                      className={`p-2 rounded-full ${selection ? 'text-red-400 hover:text-red-300' : 'text-gray-600'}`} 
                      title={t('tooltips.deleteSelection')}
                    >
                      <Icons.Trash2 size={20} />
                    </button>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button onClick={() => setIsBackpackOpen(true)} className={`p-3 rounded-full ${isSelectingForBackpack ? 'text-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`} title={t('tooltips.backpack')}><Icons.Briefcase size={20} /></button>
                    <button onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.layers')}><Icons.Layers size={20} /></button>
                    <button onClick={saveProject} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.saveProject')}><Icons.Save size={20} /></button>
                    <button onClick={() => setIsExportModalOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.export')}><Icons.Download size={20} /></button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.projectSettings')}><Icons.LayoutGrid size={20} /></button>
                    <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-3 text-gray-400 hover:text-white" title={t('tooltips.globalSettings')}><Icons.Settings size={20} /></button>
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
            onSelectionDelete={() => setSelection(null)}
            shapeType={shapeType} 
            onSelectShapeType={setShapeType} 
            onOpenHelp={() => setIsHelpOpen(true)} 
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
        <div className="flex-1 relative min-h-0 overflow-visible bg-[#2a2a2a]">
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
                onSelectionDelete={() => setSelection(null)}
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
            />
            <TweenModal
                isOpen={tweenTargetIndex !== null}
                onClose={() => setTweenTargetIndex(null)}
                onGenerate={(numTweens, easing, includeOnionSkin, interpolatePosition, interpolateScale, interpolateRotation) => {
                    if (tweenTargetIndex !== null) {
                        executeTween(tweenTargetIndex, numTweens, easing, includeOnionSkin, interpolatePosition, interpolateScale, interpolateRotation);
                    }
                }}
            />
            <TweenModal
                isOpen={pendingMotionPath !== null}
                onClose={() => setPendingMotionPath(null)}
                onGenerate={(numTweens, easing) => {
                    if (pendingMotionPath) {
                        finalizeMotionPath(pendingMotionPath, numTweens, easing);
                        setPendingMotionPath(null);
                    }
                }}
            />
            {projectType === 'animation' && (
                <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
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
        />
      )}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      {isLayerPanelOpen && view === 'editor' && <LayerPanel layers={layers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} onAddLayer={addLayer} onDuplicateLayer={duplicateLayer} onRemoveLayer={removeLayer} onToggleVisibility={toggleLayerVisibility} onToggleLock={toggleLayerLock} onUpdateLayerSettings={updateLayerSettings} onRenameLayer={renameLayer} onReorderLayers={reorderLayers} onClose={() => setIsLayerPanelOpen(false)} />}

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
        onDeleteFrames={handleBulkDeleteFrames}
        onDuplicateFrames={handleBulkDuplicateFrames}
        onReorderFrames={handleReorderFrames}
        onUpdateFrameBackground={handleBulkUpdateFrameBackground}
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
        onSelectItem={(item) => {
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
        }}
        onDeleteItem={(id) => {
          setBackpackItems(prev => prev.filter(i => i.id !== id));
        }}
        onUpdateItem={(id, name) => {
          setBackpackItems(prev => prev.map(item => item.id === id ? { ...item, name } : item));
        }}
        onStartSelecting={() => {
          setIsBackpackOpen(false);
          setTool('select');
          setIsSelectingForBackpack(true);
        }}
        onImportItems={setBackpackItems}
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
      />
      <input 
        ref={importIntoSelectionRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImportIntoSelection}
      />
    </div>
  );
}