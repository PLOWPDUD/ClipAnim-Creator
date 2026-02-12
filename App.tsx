
import React, { useState, useEffect, useRef } from 'react';
import { Frame, ToolType, Layer, SelectionState, AudioTrack, ShapeType } from './types';
import { CanvasArea } from './components/CanvasArea';
import { Timeline } from './components/Timeline';
import { Toolbar } from './components/Toolbar';
import { Icons } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { LayerPanel } from './components/LayerPanel';
import { ExportModal, ExportFormat } from './components/ExportModal';
import { compositeLayers, drawSelectionOntoCanvas } from './utils/drawingUtils';

// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import gifshot from 'gifshot';

// Helper: Create default layer
const createDefaultLayer = (id = '1', name = 'Layer 1'): Layer => ({
  id,
  name,
  isVisible: true,
  isLocked: false,
  opacity: 1,
  blendMode: 'source-over'
});

// Helper: Create a blank frame with initial layers
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

interface ProjectMeta {
    id: string;
    name: string;
    lastModified: number;
    thumbnailUrl: string;
}

const COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];

export default function App() {
  // View State
  const [view, setView] = useState<'menu' | 'editor'>('menu');
  const [savedProjects, setSavedProjects] = useState<ProjectMeta[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Project Settings
  const [projectId, setProjectId] = useState<string>(crypto.randomUUID());
  const [projectName, setProjectName] = useState('My Animation');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Layers State
  const [layers, setLayers] = useState<Layer[]>([createDefaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  // Frames State
  const [frames, setFrames] = useState<Frame[]>([]);
  
  // History
  const [history, setHistory] = useState<Frame[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Editor State
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tool, setTool] = useState<ToolType>('pen');
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  
  // Tool Sizes (Separated)
  const [penSize, setPenSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(30);
  const [shapeSize, setShapeSize] = useState(5);

  const [onionSkin, setOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [fps, setFps] = useState(12);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Selection State
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [clipboard, setClipboard] = useState<SelectionState | null>(null);

  // Audio State (Multiple Tracks)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Import State
  const importFileRef = useRef<HTMLInputElement>(null);

  // Animation Loop Refs
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Derived Stroke Width Logic
  const currentStrokeWidth = tool === 'eraser' ? eraserSize : tool === 'shape' ? shapeSize : penSize;

  const handleStrokeWidthChange = (width: number) => {
      if (tool === 'eraser') setEraserSize(width);
      else if (tool === 'shape') setShapeSize(width);
      else setPenSize(width);
  };

  // --- Persistence & Initialization ---

  // Load project list on mount
  useEffect(() => {
      const metas = localStorage.getItem('clipanim_meta');
      if (metas) {
          setSavedProjects(JSON.parse(metas));
      }
  }, []);

  const saveProject = async () => {
      const projectData = {
          id: projectId,
          name: projectName,
          canvasSize,
          backgroundImage,
          layers,
          frames,
          fps,
          audioTracks
      };

      try {
        let thumb = '';
        if (frames.length > 0) {
            thumb = await compositeLayers(frames[0], layers, canvasSize.width, canvasSize.height, '#ffffff', backgroundImage);
        }

        localStorage.setItem(`clipanim_project_${projectId}`, JSON.stringify(projectData));

        const newMeta: ProjectMeta = {
            id: projectId,
            name: projectName,
            lastModified: Date.now(),
            thumbnailUrl: thumb
        };

        const existingIndex = savedProjects.findIndex(p => p.id === projectId);
        let newProjectList = [...savedProjects];
        if (existingIndex >= 0) {
            newProjectList[existingIndex] = newMeta;
        } else {
            newProjectList = [newMeta, ...newProjectList];
        }
        
        setSavedProjects(newProjectList);
        localStorage.setItem('clipanim_meta', JSON.stringify(newProjectList));
        setHasUnsavedChanges(false);
      } catch (e) {
          console.error(e);
          alert("Failed to save. Storage might be full.");
      }
  };

  const loadProject = (id: string) => {
      const dataStr = localStorage.getItem(`clipanim_project_${id}`);
      if (!dataStr) return;

      const data = JSON.parse(dataStr);
      
      setProjectId(data.id);
      setProjectName(data.name);
      setCanvasSize(data.canvasSize);
      setBackgroundImage(data.backgroundImage || null);
      setLayers(data.layers);
      setFrames(data.frames);
      setFps(data.fps);
      setAudioTracks(data.audioTracks || []);
      
      // Reset Editor State
      setCurrentFrameIndex(0);
      setHistory([data.frames]);
      setHistoryIndex(0);
      setSelection(null);
      setTool('pen');
      setHasUnsavedChanges(false);
      setView('editor');
  };

  const createNewProject = () => {
      const pid = crypto.randomUUID();
      setProjectId(pid);
      setProjectName("New Animation");
      setCanvasSize({ width: 800, height: 600 });
      setBackgroundImage(null);
      
      const defaultL = [createDefaultLayer()];
      setLayers(defaultL);
      setActiveLayerId(defaultL[0].id);
      
      const initialFrame = createBlankFrame(defaultL, 800, 600);
      initialFrame.thumbnailUrl = ''; 

      setFrames([initialFrame]);
      setHistory([[initialFrame]]);
      setHistoryIndex(0);
      
      setFps(12);
      setAudioTracks([]);
      setCurrentFrameIndex(0);
      setSelection(null);
      setHasUnsavedChanges(false);
      setView('editor');
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this project?")) {
          const newProjs = savedProjects.filter(p => p.id !== id);
          setSavedProjects(newProjs);
          localStorage.setItem('clipanim_meta', JSON.stringify(newProjs));
          localStorage.removeItem(`clipanim_project_${id}`);
      }
  }

  // --- IMPORT / EXPORT PROJECT FILE ---

  const handleBackupProject = () => {
    const projectData = {
        id: projectId,
        name: projectName,
        canvasSize,
        backgroundImage,
        layers,
        frames,
        fps,
        audioTracks
    };
    
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsSettingsOpen(false);
  };

  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // Basic validation
            if (!data.frames || !data.layers || !data.canvasSize) {
                alert("Invalid project file.");
                return;
            }

            // Assign a new ID to avoid conflict with existing local projects if it's a duplicate import
            const newId = crypto.randomUUID();
            setProjectId(newId);
            setProjectName(data.name || "Imported Project");
            setCanvasSize(data.canvasSize);
            setBackgroundImage(data.backgroundImage || null);
            setLayers(data.layers);
            setFrames(data.frames);
            setFps(data.fps || 12);
            setAudioTracks(data.audioTracks || []);

            // Re-init editor state
            setCurrentFrameIndex(0);
            setHistory([data.frames]);
            setHistoryIndex(0);
            setSelection(null);
            setTool('pen');
            setHasUnsavedChanges(true); // Mark as unsaved so user knows to save it to local list

            // Generate thumbnail for the list
            let thumb = '';
            if (data.frames.length > 0) {
                 thumb = await compositeLayers(data.frames[0], data.layers, data.canvasSize.width, data.canvasSize.height, '#ffffff', data.backgroundImage);
            }

            // Auto-add to saved projects list temporarily (persist will happen on manual save or exit)
            // But let's actually save it immediately so it appears in the list
            const newMeta: ProjectMeta = {
                id: newId,
                name: data.name || "Imported Project",
                lastModified: Date.now(),
                thumbnailUrl: thumb
            };

            // Save full data
            const fullData = { ...data, id: newId };
            localStorage.setItem(`clipanim_project_${newId}`, JSON.stringify(fullData));
            
            // Update meta list
            const newProjectList = [newMeta, ...savedProjects];
            setSavedProjects(newProjectList);
            localStorage.setItem('clipanim_meta', JSON.stringify(newProjectList));

            setHasUnsavedChanges(false);
            setView('editor');
        } catch (err) {
            console.error(err);
            alert("Failed to parse project file.");
        }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleGoHome = () => {
      if (hasUnsavedChanges) {
          setShowExitConfirm(true);
      } else {
          setView('menu');
      }
  };

  const confirmExit = (saveFirst: boolean) => {
      if (saveFirst) {
          saveProject().then(() => {
              setShowExitConfirm(false);
              setView('menu');
          });
      } else {
          setShowExitConfirm(false);
          setView('menu');
      }
  };

  useEffect(() => {
     if (view === 'editor' && frames.length > 0) {
         regenerateThumbnails(frames, layers);
     }
  }, [backgroundImage, canvasSize, view]);

  const handleCopy = () => {
    if (selection) setClipboard(selection);
  };

  const handlePaste = () => {
    if (clipboard) {
      const newX = (canvasSize.width - clipboard.width) / 2;
      const newY = (canvasSize.height - clipboard.height) / 2;
      setSelection({ ...clipboard, x: newX, y: newY });
      setTool('select');
      setHasUnsavedChanges(true);
    }
  };

  const handleDeleteSelection = () => {
    if (selection) { setSelection(null); setHasUnsavedChanges(true); }
  };

  useEffect(() => {
    if (view !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || isExporting || showExitConfirm || isExportModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { if (selection) { e.preventDefault(); handleCopy(); } }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { if (clipboard) { e.preventDefault(); handlePaste(); } }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selection) { e.preventDefault(); handleDeleteSelection(); } }

      if (e.key.toLowerCase() === 'b') setTool('pen');
      if (e.key.toLowerCase() === 'e') setTool('eraser');
      if (e.key.toLowerCase() === 'f') setTool('fill');
      if (e.key.toLowerCase() === 's') setTool('select');
      if (e.key.toLowerCase() === 'u') setTool('shape'); 
      if (e.key.toLowerCase() === 'g') setShowGrid(prev => !prev);
      
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(prev => !prev); }

      if (e.key === 'ArrowLeft') { if (currentFrameIndex > 0) handleSelectFrame(currentFrameIndex - 1); }
      if (e.key === 'ArrowRight') { if (currentFrameIndex < frames.length - 1) handleSelectFrame(currentFrameIndex + 1); }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFrameIndex, frames.length, isPlaying, isSettingsOpen, isExporting, historyIndex, history, selection, clipboard, view, layers, canvasSize, audioTracks, showExitConfirm, isExportModalOpen]);

  const animate = (timestamp: number) => {
    if (!isPlaying) return;
    let targetFrame = 0;
    const mainTrack = audioTracks[0];
    const mainAudio = mainTrack ? audioElementsRef.current.get(mainTrack.id) : null;
    if (mainAudio && !mainAudio.paused && mainAudio.duration > 0) {
        targetFrame = Math.floor(mainAudio.currentTime * fps);
    } else {
        if (startTimeRef.current === 0) startTimeRef.current = timestamp;
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        targetFrame = Math.floor(elapsed * fps);
    }
    if (targetFrame >= frames.length) { setIsPlaying(false); setCurrentFrameIndex(frames.length - 1); return; }
    if (targetFrame !== currentFrameIndex) setCurrentFrameIndex(targetFrame);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      const startTime = currentFrameIndex / fps;
      audioTracks.forEach(track => {
          const audio = audioElementsRef.current.get(track.id);
          if (audio) { audio.currentTime = startTime; audio.play().catch(console.error); }
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
    if (!isPlaying && audioTracks.length > 0) {
        const time = index / fps;
        audioTracks.forEach(track => {
            const audio = audioElementsRef.current.get(track.id);
            if (audio && Number.isFinite(time)) audio.currentTime = time;
        });
    }
  };

  const handleSelectionCreate = (newSelection: SelectionState) => { setSelection(newSelection); setHasUnsavedChanges(true); };
  const handleSelectionUpdate = (updatedSelection: SelectionState) => { setSelection(updatedSelection); setHasUnsavedChanges(true); };
  const handleFlipHorizontal = () => { if (selection) { setSelection({ ...selection, scaleX: selection.scaleX * -1 }); setHasUnsavedChanges(true); } };
  const handleFlipVertical = () => { if (selection) { setSelection({ ...selection, scaleY: selection.scaleY * -1 }); setHasUnsavedChanges(true); } };
  const handleRotate = () => { if (selection) { setSelection({ ...selection, rotation: (selection.rotation + 90) % 360 }); setHasUnsavedChanges(true); } };

  const handleSelectionCommit = async () => {
    if (!selection) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    const baseData = frames[currentFrameIndex].layers[activeLayerId];
    if (baseData) {
        await new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
            img.src = baseData;
        });
    }
    await drawSelectionOntoCanvas(ctx, selection);
    handleUpdateLayer(activeLayerId, tempCanvas.toDataURL());
    setSelection(null);
  };

  const handleImportImage = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
              const maxWidth = canvasSize.width * 0.5;
              const ratio = img.width / img.height;
              const width = Math.min(img.width, maxWidth);
              const height = width / ratio;
              const x = (canvasSize.width - width) / 2;
              const y = (canvasSize.height - height) / 2;
              setSelection({ x, y, width, height, dataUrl: result, rotation: 0, scaleX: 1, scaleY: 1 });
              setTool('select');
              setHasUnsavedChanges(true);
          };
          img.src = result;
      };
      reader.readAsDataURL(file);
  };

  const addLayer = () => {
    const newId = crypto.randomUUID();
    const newLayer = createDefaultLayer(newId, `Layer ${layers.length + 1}`);
    const newLayers = [...layers, newLayer]; 
    setLayers(newLayers);
    setActiveLayerId(newId);
    const newFrames = frames.map(f => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        return { ...f, layers: { ...f.layers, [newId]: canvas.toDataURL() } };
    });
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) setActiveLayerId(newLayers[newLayers.length - 1].id);
    regenerateThumbnails(frames, newLayers);
    setHasUnsavedChanges(true);
  };

  const toggleLayerVisibility = (id: string) => {
      const newLayers = layers.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l);
      setLayers(newLayers);
      regenerateThumbnails(frames, newLayers);
      setHasUnsavedChanges(true);
  };
  const toggleLayerLock = (id: string) => { setLayers(layers.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l)); setHasUnsavedChanges(true); };

  const updateLayerSettings = (id: string, opacity: number, blendMode: GlobalCompositeOperation) => {
      const newLayers = layers.map(l => l.id === id ? { ...l, opacity, blendMode } : l);
      setLayers(newLayers);
      regenerateThumbnails(frames, newLayers);
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
      setHistoryIndex(historyIndex - 1);
      const newFrames = history[historyIndex - 1];
      setFrames(newFrames);
      if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
      setHasUnsavedChanges(true);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const newFrames = history[historyIndex + 1];
      setFrames(newFrames);
      if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateLayer = async (layerId: string, dataUrl: string) => {
    const newFrames = [...frames];
    const currentFrame = { ...newFrames[currentFrameIndex] };
    currentFrame.layers = { ...currentFrame.layers, [layerId]: dataUrl };
    currentFrame.thumbnailUrl = await compositeLayers(currentFrame, layers, canvasSize.width, canvasSize.height, 'transparent', backgroundImage);
    newFrames[currentFrameIndex] = currentFrame;
    updateFramesWithHistory(newFrames);
    setHasUnsavedChanges(true);
  };

  const addFrame = async () => {
    const newFrame = createBlankFrame(layers, canvasSize.width, canvasSize.height);
    newFrame.thumbnailUrl = await compositeLayers(newFrame, layers, canvasSize.width, canvasSize.height, 'transparent', backgroundImage);
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
  const regenerateThumbnails = async (frames: Frame[], layers: Layer[]) => {
      const updated = await Promise.all(frames.map(async f => ({...f, thumbnailUrl: await compositeLayers(f, layers, canvasSize.width, canvasSize.height, 'transparent', backgroundImage)})));
      setFrames(updated);
  };

  const handleAddAudioTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          const id = crypto.randomUUID();
          const newTrack: AudioTrack = { id, url, name: file.name, color: COLORS[audioTracks.length % COLORS.length], volume: 1 };
          setAudioTracks([...audioTracks, newTrack]);
          audioElementsRef.current.set(id, new Audio(url));
          setHasUnsavedChanges(true);
      }
  };

  const handleRemoveAudioTrack = (id: string) => {
      setAudioTracks(audioTracks.filter(t => t.id !== id));
      const audio = audioElementsRef.current.get(id);
      if (audio) { audio.pause(); audioElementsRef.current.delete(id); }
      setHasUnsavedChanges(true);
  };

  const handleExportStart = async (format: ExportFormat) => {
    if (isExporting || frames.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);

    const width = canvasSize.width;
    const height = canvasSize.height;

    try {
        // 1. Render all frames to images first
        const compositeImages = await Promise.all(frames.map(async (f, idx) => {
            const url = await compositeLayers(f, layers, width, height, '#ffffff', backgroundImage);
            setExportProgress(Math.round(((idx + 1) / frames.length) * 30)); 
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            });
        }));

        // Handle ZIP and GIF
        if (format === 'png-seq') {
            try {
                const zip = new JSZip();
                const folder = zip.folder(`${projectName}_frames`);
                compositeImages.forEach((img, idx) => {
                    const data = img.src.split(',')[1];
                    folder?.file(`frame_${(idx + 1).toString().padStart(4, '0')}.png`, data, { base64: true });
                    setExportProgress(30 + Math.round(((idx + 1) / frames.length) * 60)); 
                });
                const content = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName}_sequence.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000); 
                setExportProgress(100);
            } catch (e) {
                alert("ZIP Export failed");
            }
            setIsExporting(false);
            setIsExportModalOpen(false);
            return;
        }

        if (format === 'gif') {
            try {
                const images = compositeImages.map(img => img.src);
                gifshot.createGIF({
                    images: images,
                    interval: 1 / fps,
                    gifWidth: width,
                    gifHeight: height,
                    progressCallback: (captureProgress: number) => {
                        setExportProgress(30 + Math.round(captureProgress * 70));
                    }
                }, (obj: any) => {
                    if (!obj.error) {
                        const a = document.createElement('a');
                        a.href = obj.image;
                        a.download = `${projectName}.gif`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } else {
                        alert("GIF Export failed: " + obj.error);
                    }
                    setIsExporting(false);
                    setIsExportModalOpen(false);
                });
            } catch (e) {
                alert("GIF Export failed");
                setIsExporting(false);
                setIsExportModalOpen(false);
            }
            return;
        }

        // 2. STABLE VIDEO EXPORT
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas context failed');

        // Force a supported type. Most browsers only support MP4 if passed 'video/webm' 
        // as the recorder and then renamed, UNLESS you use a library like ffmpeg.wasm.
        // @ts-ignore
        const stream = exportCanvas.captureStream(0); // Manual frame capture
        
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
             mimeType = 'video/webm'; // Fallback
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
             mimeType = 'video/mp4'; // Safari fallback?
        }
        
        const mediaRecorder = new MediaRecorder(stream, { 
            mimeType: mimeType,
            videoBitsPerSecond: 8000000 
        });

        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        mediaRecorder.onstop = () => {
             const blob = new Blob(chunks, { type: mimeType }); // Wrap as detected mime
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             
             // Detect correct extension to prevent browser download failure "Failed - Download error"
             let finalExtension = 'mp4'; // Default to mp4 as requested
             if (format === 'webm') finalExtension = 'webm';
             if (format === 'avi') finalExtension = 'avi';

             a.download = `${projectName}.${finalExtension}`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a); // Cleanup DOM
             URL.revokeObjectURL(url);
             setIsExporting(false);
             setIsExportModalOpen(false);
        };

        mediaRecorder.start();

        // 3. Manual Frame-by-Frame Push
        for (let i = 0; i < compositeImages.length; i++) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(compositeImages[i], 0, 0);
            
            // @ts-ignore - Manually request a frame capture
            const track = stream.getVideoTracks()[0];
            if ((track as any).requestFrame) {
                (track as any).requestFrame();
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 / fps));
            setExportProgress(30 + Math.round(((i + 1) / compositeImages.length) * 70));
        }

        setTimeout(() => mediaRecorder.stop(), 500);

    } catch (error: any) {
        console.error("Export failed", error);
        alert("Export failed: " + error.message);
        setIsExporting(false);
        setIsExportModalOpen(false);
    }
  };

  if (view === 'menu') {
      return (
        <div className="flex flex-col h-screen bg-[#121212] text-white p-6 overflow-hidden">
             <div className="mb-8 flex justify-between items-end">
                 <div>
                    <h1 className="text-3xl font-bold mb-2">My Animations</h1>
                    <p className="text-gray-400">Create, edit and share your stories.</p>
                 </div>
                 {/* Hidden Import Input */}
                 <input ref={importFileRef} type="file" accept=".json" onChange={handleImportProjectFile} className="hidden" />
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-10">
                 <button onClick={createNewProject} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-[#FF3B30] hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] mb-3 group-hover:scale-110 transition-transform"><Icons.Plus size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">New Animation</span>
                 </button>
                 
                 {/* Import Button */}
                 <button onClick={() => importFileRef.current?.click()} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform"><Icons.Upload size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">Import Project</span>
                 </button>

                 {savedProjects.map(project => (
                     <div key={project.id} onClick={() => loadProject(project.id)} className="relative group aspect-[4/3] bg-[#1e1e1e] rounded-2xl overflow-hidden cursor-pointer hover:ring-2 ring-[#FF3B30] transition-all shadow-lg">
                         {project.thumbnailUrl ? ( <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /> ) : ( <div className="w-full h-full flex items-center justify-center text-gray-700"><Icons.Image size={48} /></div> )}
                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                             <h3 className="font-bold truncate">{project.name}</h3>
                             <p className="text-[10px] text-gray-400">{new Date(project.lastModified).toLocaleDateString()}</p>
                         </div>
                         <button onClick={(e) => deleteProject(e, project.id)} className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash2 size={16} /></button>
                     </div>
                 ))}
             </div>
        </div>
      );
  }

  return (
    <div key={projectId} className="flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] bg-[#121212] text-white overflow-hidden relative">
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] rounded-3xl p-8 max-w-sm w-full border border-gray-700 shadow-2xl animate-in zoom-in-95 fade-in duration-200 text-center">
                <div className="w-16 h-16 bg-[#FF3B30]/20 rounded-full flex items-center justify-center text-[#FF3B30] mx-auto mb-6"> <Icons.Save size={32} /> </div>
                <h2 className="text-2xl font-bold mb-2">Unsaved Changes</h2>
                <p className="text-gray-400 mb-8">Do you want to save your progress before leaving?</p>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => confirmExit(true)} className="w-full py-4 bg-[#FF3B30] text-white font-bold rounded-2xl hover:bg-red-600 transition-colors">Save & Exit</button>
                    <button onClick={() => confirmExit(false)} className="w-full py-4 bg-gray-700 text-white font-bold rounded-2xl hover:bg-gray-600 transition-colors">Discard Changes</button>
                    <button onClick={() => setShowExitConfirm(false)} className="w-full py-4 bg-transparent text-gray-400 font-bold rounded-2xl hover:text-white transition-colors">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {isExportModalOpen && (
          <ExportModal 
            isOpen={isExportModalOpen} 
            onClose={() => !isExporting && setIsExportModalOpen(false)} 
            onExport={handleExportStart}
            isExporting={isExporting}
            progress={exportProgress}
          />
      )}

      {isLayerPanelOpen && (
          <LayerPanel layers={layers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} onAddLayer={addLayer} onRemoveLayer={removeLayer} onToggleVisibility={toggleLayerVisibility} onToggleLock={toggleLayerLock} onUpdateLayerSettings={updateLayerSettings} onClose={() => setIsLayerPanelOpen(false)} />
      )}

      {!isFocusMode && (
        <header className="h-14 bg-[#1e1e1e] flex items-center px-4 justify-between border-b border-gray-700 shrink-0 z-30">
            <div className="flex items-center space-x-2">
                <button onClick={handleGoHome} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white relative" title="Back to Menu">
                    <Icons.Home size={24} />
                    {hasUnsavedChanges && <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF3B30] rounded-full ring-2 ring-[#1e1e1e]" />}
                </button>
                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                <h1 className="font-bold text-lg tracking-wide hidden sm:block truncate max-w-[150px]">{projectName}</h1>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded-full ${historyIndex > 0 ? 'hover:bg-gray-700 text-white' : 'text-gray-600'}`}> <Icons.Undo size={20} /> </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-full ${historyIndex < history.length - 1 ? 'hover:bg-gray-700 text-white' : 'text-gray-600'}`}> <Icons.Redo size={20} /> </button>
                <div className="w-px h-6 bg-gray-700 mx-2" />
                <button onClick={handleCopy} disabled={!selection} className={`p-2 rounded-full ${selection ? 'text-white hover:bg-gray-700' : 'text-gray-600'}`} title="Copy (Ctrl+C)"><Icons.Copy size={20} /></button>
                <button onClick={handlePaste} disabled={!clipboard} className={`p-2 rounded-full ${clipboard ? 'text-white hover:bg-gray-700' : 'text-gray-600'}`} title="Paste (Ctrl+V)"><Icons.Clipboard size={20} /></button>
                {selection && <button onClick={handleDeleteSelection} className="p-2 rounded-full text-white hover:bg-red-900/50 hover:text-red-400" title="Delete Selection (Del)"><Icons.Trash2 size={20} /></button>}
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)} className={`p-2 rounded-full transition-colors ${isLayerPanelOpen ? 'bg-gray-700 text-white' : 'hover:bg-gray-700 text-gray-400'}`} title="Layers"><Icons.Layers size={20} /></button>
                <button onClick={saveProject} className={`p-2 hover:bg-gray-700 rounded-full transition-colors ${hasUnsavedChanges ? 'text-[#FF3B30]' : 'text-gray-400'}`} title="Save Project (Ctrl+S)"><Icons.Save size={20} /></button>
                <button onClick={() => setIsExportModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-[#FF3B30]" title="Export Movie"><Icons.Download size={20} /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"><Icons.Settings size={20} /></button>
            </div>
        </header>
      )}

      {/* Main Workspace Layout Fix */}
      <main className="flex-1 relative flex flex-row overflow-hidden min-h-0">
        <div className="h-full shrink-0">
          <Toolbar 
              currentTool={tool}
              onSelectTool={setTool}
              currentColor={color}
              onChangeColor={setColor}
              strokeWidth={currentStrokeWidth}
              onChangeStrokeWidth={handleStrokeWidthChange}
              onionSkin={onionSkin}
              onToggleOnionSkin={() => { setOnionSkin(!onionSkin); setHasUnsavedChanges(true); }}
              showGrid={showGrid}
              onToggleGrid={() => { setShowGrid(!showGrid); setHasUnsavedChanges(true); }}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
              onImportImage={handleImportImage}
              hasSelection={!!selection}
              onFlipHorizontal={handleFlipHorizontal}
              onFlipVertical={handleFlipVertical}
              onRotate={handleRotate}
              shapeType={shapeType}
              onSelectShapeType={setShapeType}
          />
        </div>
        <div className="flex-1 relative min-h-0 overflow-hidden bg-[#2a2a2a]">
            {/* Canvas Area takes full parent height now */}
            <div className="absolute inset-0">
                <CanvasArea 
                    currentFrame={frames[currentFrameIndex]}
                    layers={layers}
                    activeLayerId={activeLayerId}
                    onUpdateLayer={handleUpdateLayer}
                    tool={tool}
                    shapeType={shapeType}
                    color={color}
                    strokeWidth={currentStrokeWidth}
                    prevFrame={currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null}
                    nextFrame={currentFrameIndex < frames.length - 1 ? frames[currentFrameIndex + 1] : null}
                    onionSkin={onionSkin}
                    showGrid={showGrid}
                    isPlaying={isPlaying}
                    selection={selection}
                    onSelectionCreate={handleSelectionCreate}
                    onSelectionUpdate={handleSelectionUpdate}
                    onSelectionCommit={handleSelectionCommit}
                    canvasWidth={canvasSize.width}
                    canvasHeight={canvasSize.height}
                    backgroundImage={backgroundImage}
                />
            </div>
            {/* Timeline is now an absolute overlay at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
                <Timeline frames={frames} currentFrameIndex={currentFrameIndex} onSelectFrame={handleSelectFrame} onAddFrame={addFrame} onDeleteFrame={deleteFrame} onCopyFrame={copyFrame} isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} audioTracks={audioTracks} onAddAudioTrack={handleAddAudioTrack} onRemoveAudioTrack={handleRemoveAudioTrack} />
            </div>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        fps={fps} 
        setFps={(v) => { setFps(v); setHasUnsavedChanges(true); }} 
        projectName={projectName} 
        setProjectName={(v) => { setProjectName(v); setHasUnsavedChanges(true); }} 
        canvasSize={canvasSize} 
        setCanvasSize={(v) => { setCanvasSize(v); setHasUnsavedChanges(true); }} 
        backgroundImage={backgroundImage} 
        setBackgroundImage={(v) => { setBackgroundImage(v); setHasUnsavedChanges(true); }}
        onBackupProject={handleBackupProject} 
      />
    </div>
  );
}
