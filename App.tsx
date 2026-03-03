import React, { useState, useEffect, useRef } from 'react';
import { Frame, ToolType, Layer, SelectionState, AudioTrack, ShapeType, ProjectData, ProjectMeta, BrushType, OnionSkinSettings } from './types';
import { CanvasArea, CanvasAreaHandle } from './components/CanvasArea';
import { Timeline } from './components/Timeline';
import { Toolbar } from './components/Toolbar';
import { Icons } from './Icons';
import { SettingsModal } from './components/SettingsModal';
import { LayerPanel } from './components/LayerPanel';
import { ExportModal, ExportFormat, ExportQuality } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import gifshot from 'gifshot';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { FrameManagerModal } from './components/FrameManagerModal';
import { AudioRecorderModal } from './components/AudioRecorderModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
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
  const [view, setView] = useState<'menu' | 'editor'>('menu');
  const [savedProjects, setSavedProjects] = useState<ProjectMeta[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Global Settings
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [accentColor, setAccentColor] = useState('#FF3B30');
  const [uiFont, setUiFont] = useState('ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif');

  const [projectId, setProjectId] = useState<string>(crypto.randomUUID());
  const [projectName, setProjectName] = useState('My Animation');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [layers, setLayers] = useState<Layer[]>([createDefaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  const [frames, setFrames] = useState<Frame[]>([]);
  const [history, setHistory] = useState<Frame[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tool, setTool] = useState<ToolType>('pen');
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  
  const [penSize, setPenSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(30);
  const [shapeSize, setShapeSize] = useState(5);
  const [textToolFont, setTextToolFont] = useState('sans-serif');

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
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [clipboard, setClipboard] = useState<SelectionState | null>(null);

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const importFileRef = useRef<HTMLInputElement>(null);
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
    const newLayer = createDefaultLayer(newLayerId, `Layer ${layers.length + 1}`);
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
        name: `${layerToCopy.name} Copy`,
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

  const updateLayerSettings = (id: string, opacity: number, blendMode: GlobalCompositeOperation) => {
    setLayers(layers.map(l => l.id === id ? { ...l, opacity, blendMode } : l));
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
                    
                    frameObj.thumbnailUrl = await compositeLayers(frameObj, layers, canvasSize.width, canvasSize.height, 'transparent', backgroundImage);
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
                alert("This GIF is not supported or the parser failed.");
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
              scaleY: 1
            });
            setTool('select');
            setHasUnsavedChanges(true);
        };
        img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddAudioTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = crypto.randomUUID();
      const newTrack: AudioTrack = {
          id,
          url,
          name: file.name,
          color: COLORS[audioTracks.length % COLORS.length],
          volume: 1
      };
      const audio = new Audio(url);
      audioElementsRef.current.set(id, audio);
      setAudioTracks([...audioTracks, newTrack]);
      setHasUnsavedChanges(true);
  };

  const handleAddRecordedAudio = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const id = crypto.randomUUID();
      const newTrack: AudioTrack = {
          id,
          url,
          name: `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          color: COLORS[audioTracks.length % COLORS.length],
          volume: 1
      };
      const audio = new Audio(url);
      audioElementsRef.current.set(id, audio);
      setAudioTracks([...audioTracks, newTrack]);
      setHasUnsavedChanges(true);
      setIsAudioRecorderOpen(false);
  };

  const handleRemoveAudioTrack = (id: string) => {
      const audio = audioElementsRef.current.get(id);
      if (audio) {
          audio.pause();
          URL.revokeObjectURL(audio.src);
          audioElementsRef.current.delete(id);
      }
      setAudioTracks(audioTracks.filter(t => t.id !== id));
      setHasUnsavedChanges(true);
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
      handleUpdateLayer(activeLayerId, newDataUrl);
      setSelection(null);
  };

  const handleExportStart = async (format: ExportFormat, quality: ExportQuality) => {
    setIsExporting(true);
    setExportProgress(0);

    const total = frames.length;
    const compositeFrames: string[] = [];

    // Pre-render all frames
    for (let i = 0; i < total; i++) {
      const dataUrl = await compositeLayers(frames[i], layers, canvasSize.width, canvasSize.height, '#ffffff', backgroundImage);
      compositeFrames.push(dataUrl);
      setExportProgress(Math.round(((i + 1) / total) * 30));
    }

    if (format === 'mp4') {
        try {
            // Using mp4-muxer for valid MP4 generation
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: canvasSize.width,
                    height: canvasSize.height
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => { console.error(e); alert("Video encoding error: " + e.message); }
            });

            const bitrateMap = {
                low: 1_000_000,
                medium: 4_000_000,
                high: 10_000_000
            };

            videoEncoder.configure({
                codec: 'avc1.42001f', // Standard AVC
                width: canvasSize.width,
                height: canvasSize.height,
                bitrate: bitrateMap[quality],
                framerate: fps
            });

            // Loop frames
            const canvas = document.createElement('canvas');
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No context");

            for (let i = 0; i < compositeFrames.length; i++) {
                 const img = new Image();
                 await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = compositeFrames[i]; });
                 
                 ctx.fillStyle = '#ffffff';
                 ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
                 ctx.drawImage(img, 0, 0);

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
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}.mp4`;
            a.click();
            
            setIsExporting(false);
            setExportProgress(100);
            setIsExportModalOpen(false);

        } catch (e: any) {
            console.error("MP4 Export failed", e);
            alert("MP4 Export failed. Your browser might not support WebCodecs or the format.");
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.gif`;
        a.click();

        setIsExporting(false);
        setExportProgress(100);
        setIsExportModalOpen(false);

      } catch (e: any) {
        console.error("GIF Export failed", e);
        alert("GIF Export failed: " + e.message);
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
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_frames.zip`;
      a.click();
      setIsExporting(false);
      setExportProgress(100);
      setIsExportModalOpen(false);
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
              const a = document.createElement('a');
              a.href = url;
              const ext = format === 'avi' ? 'avi' : 'webm';
              a.download = `${projectName}.${ext}`;
              a.click();
              
              setIsExporting(false);
              setExportProgress(100);
              setIsExportModalOpen(false);
          };

          mediaRecorder.start();

          for (let i = 0; i < compositeFrames.length; i++) {
              const img = new Image();
              await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.src = compositeFrames[i];
              });
              
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
              ctx.drawImage(img, 0, 0);
              
              await new Promise(r => setTimeout(r, 1000 / fps));
              setExportProgress(30 + Math.round(((i + 1) / total) * 70));
          }
          
          await new Promise(r => setTimeout(r, 200));
          mediaRecorder.stop();

      } catch (e: any) {
          console.error(e);
          alert("Export failed: " + e.message);
          setIsExporting(false);
          setIsExportModalOpen(false);
      }
    }
  };

  const saveProject = async () => {
      let thumb = '';
      if (frames.length > 0) {
          thumb = await compositeLayers(frames[0], layers, canvasSize.width, canvasSize.height, '#ffffff', backgroundImage);
      }
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: thumb,
          canvasSize,
          backgroundImage,
          layers,
          frames,
          fps,
          audioTracks,
          onionSkinSettings
      };
      try {
        await saveProjectToDB(projectData);
        const updatedList = await getProjectList();
        setSavedProjects(updatedList);
        setHasUnsavedChanges(false);
      } catch (e) {
          console.error(e);
          alert("Failed to save.");
      }
  };

  const loadProject = async (id: string) => {
      setIsLoading(true);
      try {
        const data = await loadProjectFromDB(id);
        if (!data) {
            alert("Project not found.");
            setIsLoading(false);
            return;
        }
        setProjectId(data.id);
        setProjectName(data.name);
        setCanvasSize(data.canvasSize);
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
          alert("Error loading project.");
      } finally {
          setIsLoading(false);
      }
  };

  const createNewProject = () => {
      const pid = crypto.randomUUID();
      setProjectId(pid);
      setProjectName("New Animation");
      setCanvasSize({ width: 800, height: 600 });
      const defaultL = [createDefaultLayer()];
      setLayers(defaultL);
      setActiveLayerId(defaultL[0].id);
      const initialFrame = createBlankFrame(defaultL, 800, 600);
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
      if (confirm("Are you sure you want to delete this project?")) {
          try {
              await deleteProjectFromDB(id);
              const updatedList = await getProjectList();
              setSavedProjects(updatedList);
          } catch (e) {
              console.error("Failed to delete", e);
          }
      }
  };

  const handleBackupProject = () => {
      const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          lastModified: Date.now(),
          thumbnailUrl: frames[0]?.thumbnailUrl || '',
          canvasSize,
          backgroundImage,
          layers,
          frames,
          fps,
          audioTracks,
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
                 thumb = await compositeLayers(data.frames[0], data.layers, data.canvasSize.width, data.canvasSize.height, '#ffffff', data.backgroundImage);
            }
            const fullData: ProjectData = { ...data, id: newId, lastModified: Date.now(), thumbnailUrl: thumb || '' };
            await saveProjectToDB(fullData);
            const updatedList = await getProjectList();
            setSavedProjects(updatedList);
            loadProject(newId);
        } catch (err) {
            alert("Failed to parse project file.");
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
  const handlePaste = () => {
    if (clipboard) {
      const newX = (canvasSize.width - clipboard.width) / 2;
      const newY = (canvasSize.height - clipboard.height) / 2;
      setSelection({ ...clipboard, x: newX, y: newY });
      setTool('select');
      setHasUnsavedChanges(true);
    }
  };

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
    if (targetFrame >= frames.length) { setIsPlaying(false); return; }
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

  const handleUpdateLayer = async (layerId: string, dataUrl: string) => {
    const newFrames = [...frames];
    const currentFrame = { ...newFrames[currentFrameIndex] };
    currentFrame.layers = { ...currentFrame.layers, [layerId]: dataUrl };
    currentFrame.thumbnailUrl = await compositeLayers(currentFrame, layers, canvasSize.width, canvasSize.height, 'transparent', backgroundImage);
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
      if (currentFrameIndex >= newFrames.length) setCurrentFrameIndex(newFrames.length - 1);
      setHasUnsavedChanges(true);
    }
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

  if (view === 'menu') {
      return (
        <div className="flex flex-col h-screen bg-[#121212] text-white p-6 overflow-hidden">
             <GlobalSettingsModal 
                isOpen={isGlobalSettingsOpen} 
                onClose={() => setIsGlobalSettingsOpen(false)} 
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                uiFont={uiFont}
                setUiFont={setUiFont}
             />
             <div className="mb-8 flex justify-between items-end">
                 <div>
                    <h1 className="text-3xl font-bold mb-2">My Animations</h1>
                    <p className="text-gray-400">Create, edit and share your stories.</p>
                    <div className="flex gap-4 items-center mt-4">
                        <button 
                            onClick={() => setIsGlobalSettingsOpen(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full transition-colors font-bold text-sm"
                        >
                            <Icons.Settings size={16} />
                            Settings
                        </button>
                        <a href="https://github.com/PLOWPDUD/ClipAnim-Creator" target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-[var(--accent-color)] hover:opacity-80 transition-opacity bg-white/5 px-3 py-1.5 rounded-full border border-[var(--accent-color)]/20">Visit The Open Source Here</a>
                    </div>
                 </div>
                 <input ref={importFileRef} type="file" accept=".json" onChange={handleImportProjectFile} className="hidden" />
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-10">
                 <button onClick={createNewProject} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-[#FF3B30] hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] mb-3 group-hover:scale-110 transition-transform"><Icons.Plus size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">New Animation</span>
                 </button>
                 <button onClick={() => importFileRef.current?.click()} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-white/5 flex flex-col items-center justify-center group transition-all">
                     <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform"><Icons.Upload size={32} /></div>
                     <span className="font-bold text-gray-300 group-hover:text-white">Import Project</span>
                 </button>
                 {savedProjects.map(project => (
                     <div key={project.id} onClick={() => loadProject(project.id)} className="relative group aspect-[4/3] bg-[#1e1e1e] rounded-2xl overflow-hidden cursor-pointer hover:ring-2 ring-[var(--accent-color)] transition-all shadow-lg">
                         {project.thumbnailUrl ? ( <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /> ) : ( <div className="w-full h-full flex items-center justify-center text-gray-700"><Icons.Image size={48} /></div> )}
                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                             <h3 className="font-bold truncate">{project.name}</h3>
                             <p className="text-[10px] text-gray-400">{new Date(project.lastModified).toLocaleDateString()}</p>
                         </div>
                         <button onClick={(e) => deleteProject(e, project.id)} className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash2 size={16} /></button>
                     </div>
                 ))}
             </div>
             {isLoading && <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm"><Icons.Loader2 className="w-12 h-12 text-[var(--accent-color)] animate-spin" /></div>}
        </div>
      );
  }

  return (
    <div key={projectId} className="flex flex-col h-screen bg-[#121212] text-white overflow-hidden relative">
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] rounded-3xl p-8 max-sm w-full border border-gray-700 shadow-2xl text-center">
                <div className="w-16 h-16 bg-[var(--accent-color)]/20 rounded-full flex items-center justify-center text-[var(--accent-color)] mx-auto mb-6"> <Icons.Save size={32} /> </div>
                <h2 className="text-2xl font-bold mb-2">Unsaved Changes</h2>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => confirmExit(true)} className="w-full py-4 bg-[var(--accent-color)] text-white font-bold rounded-2xl hover:opacity-90 transition-colors">Save & Exit</button>
                    <button onClick={() => confirmExit(false)} className="w-full py-4 bg-gray-700 text-white font-bold rounded-2xl hover:bg-gray-600 transition-colors">Discard Changes</button>
                    <button onClick={() => setShowExitConfirm(false)} className="w-full py-4 bg-transparent text-gray-400 font-bold rounded-2xl hover:text-white transition-colors">Cancel</button>
                </div>
            </div>
        </div>
      )}
      {isExportModalOpen && <ExportModal isOpen={isExportModalOpen} onClose={() => !isExporting && setIsExportModalOpen(false)} onExport={handleExportStart} isExporting={isExporting} progress={exportProgress} />}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      <FrameManagerModal 
        isOpen={isFrameManagerOpen}
        onClose={() => setIsFrameManagerOpen(false)}
        frames={frames}
        onDeleteFrames={handleBulkDeleteFrames}
        onDuplicateFrames={handleBulkDuplicateFrames}
      />

      <AudioRecorderModal 
        isOpen={isAudioRecorderOpen}
        onClose={() => setIsAudioRecorderOpen(false)}
        onSave={handleAddRecordedAudio}
      />

      {isLayerPanelOpen && <LayerPanel layers={layers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} onAddLayer={addLayer} onDuplicateLayer={duplicateLayer} onRemoveLayer={removeLayer} onToggleVisibility={toggleLayerVisibility} onToggleLock={toggleLayerLock} onUpdateLayerSettings={updateLayerSettings} onClose={() => setIsLayerPanelOpen(false)} />}
      {!isFocusMode && (
        <header className="h-14 bg-[#1e1e1e] flex items-center px-4 justify-between border-b border-gray-700 shrink-0 z-30">
            <div className="flex items-center space-x-2">
                <button onClick={handleGoHome} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white relative"><Icons.Home size={24} />{hasUnsavedChanges && <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-color)] rounded-full ring-2 ring-[#1e1e1e]" />}</button>
                <h1 className="font-bold text-lg hidden sm:block truncate max-w-[150px]">{projectName}</h1>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded-full ${historyIndex > 0 ? 'text-white' : 'text-gray-600'}`}> <Icons.Undo size={20} /> </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-full ${historyIndex < history.length - 1 ? 'text-gray-600' : 'text-white'}`}> <Icons.Redo size={20} /> </button>
                <button onClick={() => canvasRef.current?.resetView()} className="p-2 text-gray-400 hover:text-white rounded-full" title="Reset View"><Icons.RotateCcw size={20} /></button>
                <button onClick={handleCopy} disabled={!selection} className="p-2 text-gray-400 hover:text-white"><Icons.Copy size={20} /></button>
                <button onClick={handlePaste} disabled={!clipboard} className="p-2 text-gray-400 hover:text-white"><Icons.Clipboard size={20} /></button>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)} className="p-2 text-gray-400 hover:text-white"><Icons.Layers size={20} /></button>
                <button onClick={saveProject} className="p-2 text-gray-400 hover:text-white"><Icons.Save size={20} /></button>
                <button onClick={() => setIsExportModalOpen(true)} className="p-2 text-gray-400 hover:text-white"><Icons.Download size={20} /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white"><Icons.Settings size={20} /></button>
            </div>
        </header>
      )}
      <main className="flex-1 relative flex flex-row overflow-hidden min-h-0">
        <Toolbar 
            currentTool={tool} 
            onSelectTool={setTool} 
            currentBrushType={brushType} 
            onSelectBrushType={setBrushType} 
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
            onImportImage={handleImportImage} 
            hasSelection={!!selection} 
            onFlipHorizontal={() => setSelection(selection ? {...selection, scaleX: selection.scaleX * -1} : null)} 
            onFlipVertical={() => setSelection(selection ? {...selection, scaleY: selection.scaleY * -1} : null)} 
            onRotate={() => setSelection(selection ? {...selection, rotation: (selection.rotation + 90) % 360} : null)} 
            shapeType={shapeType} 
            onSelectShapeType={setShapeType} 
            onOpenHelp={() => setIsHelpOpen(true)} 
            textToolFont={textToolFont}
            onSelectTextToolFont={setTextToolFont}
        />
        <div className="flex-1 relative min-h-0 overflow-hidden bg-[#2a2a2a]">
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
                onSelectionCreate={setSelection} 
                onSelectionUpdate={setSelection} 
                onSelectionCommit={handleSelectionCommit} 
                canvasWidth={canvasSize.width} 
                canvasHeight={canvasSize.height} 
                backgroundImage={backgroundImage} 
                textToolFont={textToolFont} 
            />
            <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
                <Timeline frames={frames} currentFrameIndex={currentFrameIndex} onSelectFrame={handleSelectFrame} onAddFrame={addFrame} onDeleteFrame={deleteFrame} onCopyFrame={copyFrame} isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} audioTracks={audioTracks} onAddAudioTrack={handleAddAudioTrack} onRemoveAudioTrack={handleRemoveAudioTrack} isFocusMode={isFocusMode} onOpenFrameManager={() => setIsFrameManagerOpen(true)} onOpenRecorder={() => setIsAudioRecorderOpen(true)} />
            </div>
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} fps={fps} setFps={setFps} projectName={projectName} setProjectName={setProjectName} canvasSize={canvasSize} setCanvasSize={setCanvasSize} backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} onBackupProject={handleBackupProject} onionSkinSettings={onionSkinSettings} setOnionSkinSettings={setOnionSkinSettings} />
    </div>
  );
}