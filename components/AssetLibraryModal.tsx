import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from '../Icons';
import { Actor, Frame, Layer } from '../types';
import { saveAssetToDB, getAssetsFromDB, deleteAssetFromDB, LibraryAsset } from '../utils/db';
import { CURATED_PRESET_ASSETS, PresetAsset } from '../utils/libraryPresets';
import { generateSynthesizedSound, SynthSoundType } from '../utils/soundSynth';
import JSZip from 'jszip';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onAddActor: (actor: Actor) => void;
  onAddSoundTrack: (url: string, name: string) => void;
  onSetBackgroundImage: (url: string | null) => void;
  onInsertImageToLayer: (url: string) => void;
  onApplyPalette?: (colors: string[]) => void;
}

interface AssetFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

type LibrarySource = 'local' | 'presets';
type AssetTab = 'all' | 'image' | 'sound' | 'symbol' | 'palette';
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'duration-desc';
type ViewMode = 'grid' | 'list';

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
  isOpen,
  onClose,
  canvasWidth,
  canvasHeight,
  onAddActor,
  onAddSoundTrack,
  onSetBackgroundImage,
  onInsertImageToLayer,
  onApplyPalette,
}) => {
  // Library mode & content state
  const [librarySource, setLibrarySource] = useState<LibrarySource>('local');
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Multi-selection & Batch
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Folder creation / management
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Audio preview & Synth state
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1);
  const [isAudioLooping, setIsAudioLooping] = useState<boolean>(false);
  const audioVolume = 0.9;
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSynthPanel, setShowSynthPanel] = useState(false);

  // Lightbox / Detail Inspector
  const [inspectedAsset, setInspectedAsset] = useState<LibraryAsset | PresetAsset | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState('');

  // Status & loading
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeUpdateRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load assets and folders
  useEffect(() => {
    if (isOpen) {
      loadLibraryData();
    } else {
      stopAudioPreview();
      stopRecording();
      setSelectedAssetIds(new Set());
      setIsSelectMode(false);
      setInspectedAsset(null);
    }
    return () => {
      stopAudioPreview();
      stopRecording();
    };
  }, [isOpen]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const loadLibraryData = async () => {
    try {
      // Load assets from IndexedDB
      const loadedAssets = await getAssetsFromDB();
      setAssets(loadedAssets);

      // Load folders from localStorage
      const savedFolders = localStorage.getItem('clipanim_asset_folders');
      if (savedFolders) {
        setFolders(JSON.parse(savedFolders));
      } else {
        const defaultFolders: AssetFolder[] = [
          { id: 'folder-bg', name: 'Backgrounds', color: '#6366f1', createdAt: Date.now() },
          { id: 'folder-sfx', name: 'SFX & Music', color: '#10b981', createdAt: Date.now() + 1 },
          { id: 'folder-char', name: 'Characters & Symbols', color: '#f59e0b', createdAt: Date.now() + 2 },
          { id: 'folder-vfx', name: 'VFX & Overlays', color: '#ec4899', createdAt: Date.now() + 3 }
        ];
        setFolders(defaultFolders);
        localStorage.setItem('clipanim_asset_folders', JSON.stringify(defaultFolders));
      }
    } catch (e) {
      console.error('Failed to load asset library data:', e);
    }
  };

  // Folder Operations
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];
    const newFolder: AssetFolder = {
      id: `asset-folder-${crypto.randomUUID()}`,
      name: newFolderName.trim(),
      color: colors[folders.length % colors.length],
      createdAt: Date.now()
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem('clipanim_asset_folders', JSON.stringify(updated));
    setNewFolderName('');
    setIsCreatingFolder(false);
    showStatus(`Folder "${newFolder.name}" created!`);
  };

  const handleSaveEditFolder = (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }
    const updated = folders.map(f => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f);
    setFolders(updated);
    localStorage.setItem('clipanim_asset_folders', JSON.stringify(updated));
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? The assets inside will be kept but set to unassigned.')) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      localStorage.setItem('clipanim_asset_folders', JSON.stringify(updatedFolders));

      // Update assets that had this folder
      const updatedAssets = assets.map(a => {
        const metadata = getAssetMetadata(a);
        if (metadata.folderId === folderId) {
          return saveAssetMetadata(a, { ...metadata, folderId: undefined });
        }
        return a;
      });
      setAssets(updatedAssets);
      if (selectedFolderId === folderId) {
        setSelectedFolderId('all');
      }
      showStatus('Folder deleted');
    }
  };

  // Metadata Helpers
  const getAssetMetadata = (asset: LibraryAsset) => {
    try {
      const savedMeta = localStorage.getItem(`clipanim_asset_meta_${asset.id}`);
      return savedMeta ? JSON.parse(savedMeta) : { folderId: asset.folderId, isFavorite: asset.isFavorite, tags: asset.tags };
    } catch {
      return { folderId: asset.folderId, isFavorite: asset.isFavorite, tags: asset.tags };
    }
  };

  const saveAssetMetadata = (asset: LibraryAsset, metadata: any) => {
    localStorage.setItem(`clipanim_asset_meta_${asset.id}`, JSON.stringify(metadata));
    return { ...asset, ...metadata };
  };

  const handleToggleFavorite = (asset: LibraryAsset) => {
    const meta = getAssetMetadata(asset);
    const updatedMeta = { ...meta, isFavorite: !meta.isFavorite };
    saveAssetMetadata(asset, updatedMeta);
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, ...updatedMeta } : a));
  };

  const handleAssignFolder = (assetId: string, folderId: string | undefined) => {
    const updated = assets.map(a => {
      if (a.id === assetId) {
        const meta = getAssetMetadata(a);
        return saveAssetMetadata(a, { ...meta, folderId });
      }
      return a;
    });
    setAssets(updated);
    showStatus(folderId ? 'Moved to folder' : 'Removed from folder');
  };

  const handleRenameAsset = async (asset: LibraryAsset, newName: string) => {
    if (!newName.trim() || newName === asset.name) {
      setEditingAssetId(null);
      return;
    }
    const updated: LibraryAsset = { ...asset, name: newName.trim() };
    await saveAssetToDB(updated);
    setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
    if (inspectedAsset && inspectedAsset.id === asset.id) {
      setInspectedAsset(updated);
    }
    setEditingAssetId(null);
    showStatus(`Renamed to "${newName}"`);
  };

  // Audio Playback Engine
  const stopAudioPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioTimeUpdateRef.current) {
      cancelAnimationFrame(audioTimeUpdateRef.current);
      audioTimeUpdateRef.current = null;
    }
    setPlayingAssetId(null);
    setAudioCurrentTime(0);
  };

  const handlePlaySound = (asset: LibraryAsset | PresetAsset) => {
    if (playingAssetId === asset.id) {
      stopAudioPreview();
    } else {
      stopAudioPreview();
      const audio = new Audio(asset.dataUrl);
      audio.playbackRate = audioPlaybackRate;
      audio.loop = isAudioLooping;
      audio.volume = audioVolume;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || asset.duration || 0);
      };

      const updateProgress = () => {
        if (audioRef.current) {
          setAudioCurrentTime(audioRef.current.currentTime);
          if (!audioRef.current.paused) {
            audioTimeUpdateRef.current = requestAnimationFrame(updateProgress);
          }
        }
      };

      audio.onplay = () => {
        audioTimeUpdateRef.current = requestAnimationFrame(updateProgress);
      };

      audio.onended = () => {
        if (!isAudioLooping) {
          setPlayingAssetId(null);
          setAudioCurrentTime(0);
        }
      };

      setPlayingAssetId(asset.id);
      audio.play().catch(e => {
        console.error('Audio playback failed', e);
        stopAudioPreview();
      });
    }
  };

  const handleSeekAudio = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  // Web Audio SFX Generation
  const handleGenerateSynthSound = async (type: SynthSoundType) => {
    const synthResult = generateSynthesizedSound(type);
    const newAsset: LibraryAsset = {
      id: crypto.randomUUID(),
      name: `${synthResult.name} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`,
      type: 'sound',
      dataUrl: synthResult.dataUrl,
      fileType: 'audio/wav',
      size: Math.round(synthResult.dataUrl.length * 0.75),
      createdAt: Date.now(),
      duration: synthResult.duration,
      tags: ['synth', '8bit', type, 'sfx'],
      category: 'SFX & Music'
    };

    await saveAssetToDB(newAsset);
    if (selectedFolderId !== 'all' && selectedFolderId !== 'unassigned') {
      saveAssetMetadata(newAsset, { folderId: selectedFolderId });
    }
    await loadLibraryData();
    showStatus(`Generated ${synthResult.name}!`);
    // Preview sound
    handlePlaySound(newAsset);
  };

  // Microphone Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const duration = await getAudioDuration(dataUrl);

          const asset: LibraryAsset = {
            id: crypto.randomUUID(),
            name: `Microphone Record ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
            type: 'sound',
            dataUrl,
            fileType: 'audio/webm',
            size: audioBlob.size,
            createdAt: Date.now(),
            duration,
            tags: ['mic', 'recording', 'custom', 'voice'],
            category: 'SFX & Music'
          };

          await saveAssetToDB(asset);
          if (selectedFolderId !== 'all' && selectedFolderId !== 'unassigned') {
            saveAssetMetadata(asset, { folderId: selectedFolderId });
          }
          await loadLibraryData();
          showStatus('Audio recorded & saved to library!');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Microphone access denied or error:', e);
      alert('Unable to access microphone. Please check system permissions.');
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsImporting(true);

    let importedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await processAndSaveFile(file);
        importedCount++;
      } catch (err) {
        console.error('Error importing file:', err);
      }
    }

    setIsImporting(false);
    await loadLibraryData();
    if (fileInputRef.current) fileInputRef.current.value = '';
    showStatus(`Imported ${importedCount} file(s) into Local Library!`);
  };

  const processAndSaveFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          let type: 'image' | 'sound' | 'symbol' | 'palette' = 'image';
          let duration: number | undefined = undefined;
          let width: number | undefined = undefined;
          let height: number | undefined = undefined;

          if (file.type.startsWith('audio/')) {
            type = 'sound';
            duration = await getAudioDuration(dataUrl);
          } else if (file.type.startsWith('image/')) {
            type = 'image';
            const dims = await getImageDimensions(dataUrl);
            width = dims.width;
            height = dims.height;
          }

          const asset: LibraryAsset = {
            id: crypto.randomUUID(),
            name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            type,
            dataUrl,
            fileType: file.type,
            size: file.size,
            createdAt: Date.now(),
            duration,
            width,
            height,
            tags: ['upload', type]
          };

          await saveAssetToDB(asset);
          if (selectedFolderId !== 'all' && selectedFolderId !== 'unassigned') {
            saveAssetMetadata(asset, { folderId: selectedFolderId });
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
    });
  };

  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 200, height: img.naturalHeight || 200 });
      img.onerror = () => resolve({ width: 200, height: 200 });
      img.src = url;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    let imported = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await processAndSaveFile(file);
        imported++;
      } catch (err) {
        console.error('Drop error:', err);
      }
    }
    setIsImporting(false);
    await loadLibraryData();
    showStatus(`Dropped & imported ${imported} file(s)!`);
  };

  // Convert Image asset to a Symbol
  const handleConvertToSymbol = async (asset: LibraryAsset | PresetAsset, animated: boolean = false) => {
    const defaultLayerId = crypto.randomUUID();
    const defaultLayer: Layer = {
      id: defaultLayerId,
      name: 'Layer 1',
      isVisible: true,
      isLocked: false,
      opacity: 1,
      blendMode: 'source-over'
    };

    const firstFrame: Frame = {
      id: crypto.randomUUID(),
      layers: { [defaultLayerId]: asset.dataUrl },
      script: ''
    };

    const symbolAsset: LibraryAsset = {
      id: crypto.randomUUID(),
      name: `${asset.name}_Symbol`,
      type: 'symbol',
      dataUrl: asset.dataUrl,
      fileType: 'application/json',
      size: asset.size + 1000,
      createdAt: Date.now(),
      isAnimated: animated,
      symbolFrames: [firstFrame],
      symbolLayers: [defaultLayer],
      symbolFps: 12,
      tags: ['symbol', animated ? 'animated' : 'static'],
      scripts: `// Custom Symbol Actions\nthis.onUpdate = function() {\n  // Custom behaviors\n};`
    };

    await saveAssetToDB(symbolAsset);
    await loadLibraryData();
    showStatus(`Created Symbol "${symbolAsset.name}"!`);
  };

  // Add Preset to Local Library
  const handleClonePresetToLocal = async (preset: PresetAsset) => {
    const newAsset: LibraryAsset = {
      id: crypto.randomUUID(),
      name: preset.name,
      type: preset.type,
      dataUrl: preset.dataUrl,
      fileType: preset.fileType,
      size: preset.size,
      createdAt: Date.now(),
      duration: preset.duration,
      isAnimated: preset.isAnimated,
      symbolFrames: preset.symbolFrames,
      symbolLayers: preset.symbolLayers,
      symbolFps: preset.symbolFps,
      scripts: preset.scripts,
      paletteColors: preset.paletteColors,
      tags: preset.tags,
      category: preset.category
    };

    await saveAssetToDB(newAsset);
    await loadLibraryData();
    showStatus(`Saved "${preset.name}" to My Library!`);
  };

  // Place Symbol On Canvas
  const handlePlaceSymbolOnCanvas = (asset: LibraryAsset | PresetAsset) => {
    const finalWidth = 140;
    const finalHeight = 140;

    const newActor: Actor = {
      id: crypto.randomUUID(),
      name: asset.name.replace(/[^a-zA-Z0-9_]/g, '_'),
      dataUrl: asset.dataUrl,
      isAnimated: asset.isAnimated,
      symbolFrames: asset.symbolFrames,
      symbolLayers: asset.symbolLayers,
      symbolFps: asset.symbolFps || 12,
      x: Math.round((canvasWidth - finalWidth) / 2),
      y: Math.round((canvasHeight - finalHeight) / 2),
      width: finalWidth,
      height: finalHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      scripts: asset.scripts || `// Runs every frame\nthis.onUpdate = function() {\n  // behaviors\n};`
    };

    onAddActor(newActor);
    onClose();
  };

  // Delete Asset
  const handleDeleteAsset = async (asset: LibraryAsset) => {
    if (confirm(`Are you sure you want to delete "${asset.name}" from your local library?`)) {
      if (playingAssetId === asset.id) {
        stopAudioPreview();
      }
      await deleteAssetFromDB(asset.id);
      localStorage.removeItem(`clipanim_asset_meta_${asset.id}`);
      setSelectedAssetIds(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
      if (inspectedAsset && inspectedAsset.id === asset.id) {
        setInspectedAsset(null);
      }
      await loadLibraryData();
      showStatus(`Deleted "${asset.name}"`);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedAssetIds.size === 0) return;
    if (confirm(`Are you sure you want to delete all ${selectedAssetIds.size} selected asset(s)?`)) {
      for (const id of selectedAssetIds) {
        await deleteAssetFromDB(id);
        localStorage.removeItem(`clipanim_asset_meta_${id}`);
      }
      setSelectedAssetIds(new Set());
      setIsSelectMode(false);
      await loadLibraryData();
      showStatus('Batch deletion complete');
    }
  };

  // Batch Move Folder
  const handleBatchMoveFolder = (folderId: string | undefined) => {
    if (selectedAssetIds.size === 0) return;
    const updated = assets.map(a => {
      if (selectedAssetIds.has(a.id)) {
        const meta = getAssetMetadata(a);
        return saveAssetMetadata(a, { ...meta, folderId });
      }
      return a;
    });
    setAssets(updated);
    setSelectedAssetIds(new Set());
    setIsSelectMode(false);
    showStatus(`Moved ${selectedAssetIds.size} items`);
  };

  // Batch Export as ZIP
  const handleBatchExportZip = async () => {
    const targetAssets = assets.filter(a => selectedAssetIds.has(a.id));
    if (targetAssets.length === 0) return;

    const zip = new JSZip();
    targetAssets.forEach((asset, idx) => {
      if (asset.dataUrl && asset.dataUrl.includes(',')) {
        const base64Data = asset.dataUrl.split(',')[1];
        let ext = 'png';
        if (asset.fileType.includes('svg')) ext = 'svg';
        else if (asset.fileType.includes('jpeg') || asset.fileType.includes('jpg')) ext = 'jpg';
        else if (asset.fileType.includes('gif')) ext = 'gif';
        else if (asset.fileType.includes('audio') || asset.fileType.includes('wav')) ext = 'wav';
        else if (asset.fileType.includes('webm')) ext = 'webm';
        else if (asset.fileType.includes('mp3')) ext = 'mp3';

        const safeName = (asset.name || `asset_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        zip.file(`${safeName}.${ext}`, base64Data, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-selected-assets-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus(`Exported ${targetAssets.length} assets in ZIP archive!`);
  };

  // Export Full Library Backup JSON
  const handleExportLibraryBackup = () => {
    const backup = {
      assets,
      folders,
      assetMeta: assets.reduce((acc: Record<string, any>, current) => {
        acc[current.id] = getAssetMetadata(current);
        return acc;
      }, {})
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-local-library-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus('Exported library backup JSON!');
  };

  // Import Full Library Backup JSON
  const handleImportLibraryBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup && Array.isArray(backup.assets)) {
          if (confirm(`Import ${backup.assets.length} assets and library folders? This will merge with your current library.`)) {
            for (const asset of backup.assets) {
              await saveAssetToDB(asset);
              if (backup.assetMeta && backup.assetMeta[asset.id]) {
                localStorage.setItem(`clipanim_asset_meta_${asset.id}`, JSON.stringify(backup.assetMeta[asset.id]));
              }
            }

            if (Array.isArray(backup.folders)) {
              const existingIds = new Set(folders.map(f => f.id));
              const newFolders = backup.folders.filter((f: any) => f.id && f.name && !existingIds.has(f.id));
              const updatedFolders = [...folders, ...newFolders];
              setFolders(updatedFolders);
              localStorage.setItem('clipanim_asset_folders', JSON.stringify(updatedFolders));
            }

            await loadLibraryData();
            showStatus(`Restored ${backup.assets.length} assets!`);
          }
        } else {
          alert('Invalid library backup file format.');
        }
      } catch (err) {
        console.error('Error importing library backup:', err);
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Apply Palette
  const handleApplyPalette = (colors: string[]) => {
    try {
      localStorage.setItem('clipanim_custom_palette', JSON.stringify(colors));
      if (onApplyPalette) {
        onApplyPalette(colors);
      }
      showStatus('Color palette applied to Toolbar!');
    } catch (e) {
      console.error(e);
    }
  };

  // Tag extraction for filter pills
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    const sourceList = librarySource === 'local' ? assets : CURATED_PRESET_ASSETS;
    sourceList.forEach(item => {
      const meta = librarySource === 'local' ? getAssetMetadata(item as LibraryAsset) : item;
      if (meta.tags && Array.isArray(meta.tags)) {
        meta.tags.forEach((t: string) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).slice(0, 10);
  }, [librarySource, assets]);

  // Unified Filtering & Sorting
  const displayItems = useMemo(() => {
    let list: (LibraryAsset | PresetAsset)[] = librarySource === 'local' ? assets : CURATED_PRESET_ASSETS;

    // 1. Tab Filter
    if (activeTab !== 'all') {
      list = list.filter(item => item.type === activeTab);
    }

    // 2. Folder Filter (Local only)
    if (librarySource === 'local') {
      list = list.filter(item => {
        const meta = getAssetMetadata(item as LibraryAsset);
        if (selectedFolderId === 'favorites') return !!meta.isFavorite;
        if (selectedFolderId === 'unassigned') return !meta.folderId;
        if (selectedFolderId !== 'all') return meta.folderId === selectedFolderId;
        return true;
      });
    }

    // 3. Tag Filter
    if (selectedTag) {
      list = list.filter(item => {
        const tags = (item as any).tags || getAssetMetadata(item as LibraryAsset).tags || [];
        return tags.includes(selectedTag);
      });
    }

    // 4. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        return (
          item.name.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.fileType && item.fileType.toLowerCase().includes(q)) ||
          ((item as any).tags && (item as any).tags.some((t: string) => t.toLowerCase().includes(q)))
        );
      });
    }

    // 5. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'duration-desc') return (b.duration || 0) - (a.duration || 0);
      if (sortBy === 'oldest') return ((a as any).createdAt || 0) - ((b as any).createdAt || 0);
      return ((b as any).createdAt || 0) - ((a as any).createdAt || 0);
    });
  }, [librarySource, assets, activeTab, selectedFolderId, selectedTag, searchQuery, sortBy]);

  // Compute storage statistics
  const storageStats = useMemo(() => {
    const totalBytes = assets.reduce((sum, a) => sum + (a.size || 0), 0);
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      count: assets.length,
      sizeFormatted: `${mb} MB`
    };
  }, [assets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[130] p-3 md:p-6 backdrop-blur-md animate-fade-in select-none">
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-[#141417] rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] border border-white/10 relative overflow-hidden text-gray-200"
      >
        {/* Top Header */}
        <div className="flex justify-between items-center px-6 py-3.5 border-b border-white/10 bg-[#19191d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Icons.Library size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Studio Asset Library</h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {librarySource === 'local' ? `${storageStats.count} Items (${storageStats.sizeFormatted})` : 'Curated Starter Packs'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Local drag & drop storage, sound synthesizer, vector backgrounds, and animated symbols</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Library Source Switcher */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mr-2">
              <button
                onClick={() => {
                  setLibrarySource('local');
                  setSelectedFolderId('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  librarySource === 'local' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icons.Briefcase size={13} />
                <span>My Library</span>
              </button>
              <button
                onClick={() => {
                  setLibrarySource('presets');
                  setSelectedFolderId('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  librarySource === 'presets' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icons.Sparkles size={13} />
                <span>Presets & Packs</span>
              </button>
            </div>

            {/* Export & Import Backup */}
            {librarySource === 'local' && (
              <>
                <button
                  onClick={handleExportLibraryBackup}
                  disabled={assets.length === 0}
                  className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10"
                  title="Export full JSON library backup"
                >
                  <Icons.FolderOutput size={14} />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                <label
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border border-white/10"
                  title="Restore library backup (.json)"
                >
                  <Icons.FolderDown size={14} />
                  <span className="hidden sm:inline">Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportLibraryBackup}
                    className="hidden"
                  />
                </label>
              </>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors ml-1"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {statusMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border border-indigo-400">
            {statusMessage}
          </div>
        )}

        {/* Main Workspace Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left Sidebar - Folders & Sound Tools */}
          <div className="w-60 border-r border-white/10 bg-[#111113] flex flex-col p-3.5 space-y-3.5 select-none shrink-0">
            
            {/* Mode: Folders (for My Library) */}
            {librarySource === 'local' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Folders</span>
                  <button 
                    onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                    className="p-1 text-gray-400 hover:text-indigo-400 rounded hover:bg-white/5"
                    title="Create New Folder"
                  >
                    <Icons.FolderPlus size={15} />
                  </button>
                </div>

                {isCreatingFolder && (
                  <div className="p-2 rounded-xl bg-black/60 border border-indigo-500/30 space-y-2">
                    <input
                      type="text"
                      placeholder="Folder Name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full text-xs bg-white/10 text-white px-2.5 py-1.5 rounded-lg outline-none border border-transparent focus:border-indigo-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setIsCreatingFolder(false)} className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5">Cancel</button>
                      <button onClick={handleCreateFolder} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md font-bold">Create</button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 no-scrollbar text-xs">
                  <button
                    onClick={() => setSelectedFolderId('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                      selectedFolderId === 'all'
                        ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icons.Briefcase size={14} className="text-indigo-400" />
                      <span>All Items</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">{assets.length}</span>
                  </button>

                  <button
                    onClick={() => setSelectedFolderId('favorites')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                      selectedFolderId === 'favorites'
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icons.Star size={14} className="text-amber-400" />
                      <span>Favorites</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {assets.filter(a => getAssetMetadata(a).isFavorite).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedFolderId('unassigned')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                      selectedFolderId === 'unassigned'
                        ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icons.Help size={14} className="text-gray-400" />
                      <span>Unassigned</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {assets.filter(a => !getAssetMetadata(a).folderId).length}
                    </span>
                  </button>

                  <div className="h-px bg-white/10 my-2" />

                  {folders.map(folder => {
                    const count = assets.filter(a => getAssetMetadata(a).folderId === folder.id).length;
                    const isEditing = editingFolderId === folder.id;

                    return (
                      <div key={folder.id} className="group flex items-center justify-between rounded-xl transition-colors hover:bg-white/5">
                        {isEditing ? (
                          <div className="flex-1 p-1 flex items-center gap-1">
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onBlur={() => handleSaveEditFolder(folder.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditFolder(folder.id)}
                              className="w-full bg-black/80 text-xs text-white px-2 py-0.5 rounded outline-none border border-indigo-500"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedFolderId(folder.id)}
                              className={`flex-1 text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between ${
                                selectedFolderId === folder.id
                                  ? 'text-indigo-400 font-bold'
                                  : 'text-gray-300 group-hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-1">
                                <Icons.Folder size={14} style={{ color: folder.color || '#6366f1' }} />
                                <span className="truncate">{folder.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-500 group-hover:hidden">{count}</span>
                            </button>
                            <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                              <button
                                onClick={() => {
                                  setEditingFolderId(folder.id);
                                  setEditingFolderName(folder.name);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                title="Rename Folder"
                              >
                                <Icons.Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-400"
                                title="Delete Folder"
                              >
                                <Icons.Trash2 size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Presets Pack Sidebar */
              <div className="flex-1 overflow-y-auto space-y-1.5 text-xs">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 block mb-2">Preset Categories</span>
                {['All', 'Backgrounds', 'VFX & Overlays', 'Props & UI', 'Color Palettes'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      if (cat === 'All') {
                        setActiveTab('all');
                        setSelectedTag(null);
                      } else if (cat === 'Backgrounds') {
                        setActiveTab('image');
                        setSelectedTag('sky');
                      } else if (cat === 'VFX & Overlays') {
                        setActiveTab('image');
                        setSelectedTag('vfx');
                      } else if (cat === 'Color Palettes') {
                        setActiveTab('palette');
                        setSelectedTag(null);
                      } else {
                        setActiveTab('all');
                        setSelectedTag(null);
                      }
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <span>{cat}</span>
                    <Icons.ChevronRight size={12} className="text-gray-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Audio Creation Dock */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Audio Tools</span>
              </div>
              
              {/* SFX Synth Generator trigger */}
              <button
                onClick={() => setShowSynthPanel(!showSynthPanel)}
                className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                  showSynthPanel 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icons.Sparkles size={13} className="text-amber-400" />
                  <span>8-Bit SFX Synth</span>
                </div>
                <Icons.ChevronDown size={12} className={`transition-transform ${showSynthPanel ? 'rotate-180' : ''}`} />
              </button>

              {/* Synth Dropdown Grid */}
              {showSynthPanel && (
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-black/60 rounded-xl border border-white/10 animate-in fade-in">
                  {(['coin', 'laser', 'jump', 'explosion', 'powerup', 'whoosh', 'hit', 'magic'] as SynthSoundType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => handleGenerateSynthSound(type)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-indigo-600 text-gray-200 hover:text-white rounded-lg text-[10px] font-bold capitalize transition-all text-center truncate shadow"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              {/* Microphone Recorder */}
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex flex-col gap-2 text-center">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-1.5 flex items-center justify-center gap-2 animate-pulse text-xs font-bold shadow-lg"
                  >
                    <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
                    <span>Stop ({recordingDuration}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-full bg-white/5 hover:bg-emerald-600 text-gray-300 hover:text-white rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border border-white/10"
                  >
                    <Icons.Mic size={13} className="text-emerald-400" />
                    <span>Record Mic SFX</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Right Main Grid Area */}
          <div className="flex-1 bg-[#151518] flex flex-col overflow-hidden">
            
            {/* Header Control Toolbar */}
            <div className="p-3.5 bg-[#19191d] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Asset Type Tabs */}
              <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10">
                {(['all', 'image', 'sound', 'symbol', 'palette'] as AssetTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All Items' : tab === 'image' ? 'Images' : tab === 'sound' ? 'Sounds' : tab === 'symbol' ? 'Symbols' : 'Palettes'}
                  </button>
                ))}
              </div>

              {/* Action Buttons & Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Search Bar */}
                <div className="relative">
                  <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                  <input
                    type="text"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-44 bg-black/40 border border-white/10 text-white text-xs rounded-xl pl-8 pr-6 py-1.5 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      <Icons.X size={11} />
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-black/40 border border-white/10 text-gray-300 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="size-desc">Largest Size</option>
                  <option value="duration-desc">Longest Audio</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Grid View"
                  >
                    <Icons.Grid size={13} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="List View"
                  >
                    <Icons.List size={13} />
                  </button>
                </div>

                {/* Batch Select Mode Toggle */}
                {librarySource === 'local' && (
                  <button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      if (isSelectMode) setSelectedAssetIds(new Set());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelectMode ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    <Icons.Check size={13} />
                    <span>{isSelectMode ? `Done (${selectedAssetIds.size})` : 'Select'}</span>
                  </button>
                )}

                {/* Upload Button */}
                {librarySource === 'local' && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/*,audio/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Icons.Upload size={13} />
                      <span>Upload Files</span>
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* Tag Quick-Filter Bar */}
            {availableTags.length > 0 && (
              <div className="px-4 py-2 bg-[#121214] border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
                <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">Tags:</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                    selectedTag === null ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  All Tags
                </button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1 ${
                      selectedTag === tag ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>#{tag}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Batch Action Banner */}
            {isSelectMode && selectedAssetIds.size > 0 && (
              <div className="px-4 py-2 bg-indigo-950/60 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                  <span>{selectedAssetIds.size} items selected</span>
                  <button 
                    onClick={() => setSelectedAssetIds(new Set(displayItems.map(i => i.id)))}
                    className="text-[11px] text-indigo-400 hover:underline ml-2"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setSelectedAssetIds(new Set())}
                    className="text-[11px] text-gray-400 hover:underline"
                  >
                    Deselect
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => handleBatchMoveFolder(e.target.value || undefined)}
                    className="bg-black/60 text-white text-xs rounded-lg px-2 py-1 border border-white/10 outline-none"
                  >
                    <option value="">Move to folder...</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBatchExportZip}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Icons.Download size={12} />
                    <span>Download ZIP</span>
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow"
                  >
                    <Icons.Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content Display Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              
              {isImporting && (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Icons.Loader2 size={36} className="animate-spin text-indigo-500" />
                  <span className="text-xs text-gray-400">Processing file import into IndexedDB...</span>
                </div>
              )}

              {!isImporting && displayItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 text-center">
                  <Icons.Upload size={44} className="text-gray-600 mb-3 animate-bounce" />
                  <h3 className="font-bold text-white mb-1">No Assets Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mb-6">
                    {searchQuery ? "Try changing your search terms or filter tags." : "Drag and drop PNG, SVG, GIF, MP3, or WAV files directly here!"}
                  </p>
                  {librarySource === 'local' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                    >
                      Choose Local Files
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {displayItems.map(item => {
                    const isLocal = librarySource === 'local';
                    const localAsset = isLocal ? (item as LibraryAsset) : null;
                    const meta = isLocal ? getAssetMetadata(localAsset!) : item;
                    const isSelected = selectedAssetIds.has(item.id);
                    const isPlaying = playingAssetId === item.id;
                    const isEditing = editingAssetId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelectMode && isLocal) {
                            setSelectedAssetIds(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }
                        }}
                        className={`group bg-[#1a1a1e] rounded-xl border p-2.5 flex flex-col h-60 transition-all shadow-md relative overflow-hidden ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'border-white/10 hover:border-indigo-500/50 hover:shadow-indigo-500/10'
                        }`}
                      >
                        {/* Selection Checkbox Overlay */}
                        {isSelectMode && isLocal && (
                          <div className="absolute top-2 left-2 z-20">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-indigo-600 bg-black/60 border-white/20"
                            />
                          </div>
                        )}

                        {/* Top Action Buttons Overlay */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {isLocal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(localAsset!);
                              }}
                              className={`p-1 rounded-lg backdrop-blur-md transition-all ${
                                meta.isFavorite ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-black/80 text-gray-300'
                              }`}
                              title={meta.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                            >
                              <Icons.Star size={12} fill={meta.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedAsset(item);
                            }}
                            className="p-1 bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white rounded-lg backdrop-blur-md"
                            title="Inspect Details"
                          >
                            <Icons.Maximize2 size={12} />
                          </button>
                          {isLocal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAsset(localAsset!);
                              }}
                              className="p-1 bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg backdrop-blur-md"
                              title="Delete Asset"
                            >
                              <Icons.Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {/* Card Visual Preview Box */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === 'sound') {
                              handlePlaySound(item);
                            } else {
                              setInspectedAsset(item);
                            }
                          }}
                          className="h-32 bg-[#212126] rounded-lg flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer border border-white/5"
                        >
                          {/* Checkerboard background for transparent graphics */}
                          {item.type === 'image' && (
                            <div className="w-full h-full flex items-center justify-center p-1 relative bg-[radial-gradient(#2d2d34_1px,transparent_1px)] [background-size:8px_8px]">
                              <img
                                src={item.dataUrl}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain pointer-events-none transition-transform group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {item.type === 'symbol' && (
                            <div className="flex flex-col items-center justify-center p-2 text-center h-full w-full bg-[radial-gradient(#2d2d34_1px,transparent_1px)] [background-size:8px_8px]">
                              <img
                                src={item.dataUrl}
                                alt={item.name}
                                className="max-w-full max-h-[70%] object-contain pointer-events-none mb-1 group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded uppercase border border-indigo-500/30">
                                {item.isAnimated ? 'Animated Symbol' : 'Symbol'}
                              </span>
                            </div>
                          )}

                          {item.type === 'sound' && (
                            <div className="flex flex-col items-center justify-center p-2 w-full h-full text-center">
                              <div
                                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                                  isPlaying
                                    ? 'bg-red-600 text-white animate-pulse'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {isPlaying ? <Icons.Pause size={18} /> : <Icons.Play size={18} className="translate-x-0.5" />}
                              </div>
                              
                              {/* Mini Waveform visualization */}
                              <div className="flex items-center gap-0.5 mt-2.5 h-3 justify-center">
                                {[4, 7, 5, 9, 6, 8, 4, 7, 3].map((h, i) => (
                                  <div
                                    key={i}
                                    className={`w-0.5 rounded-full ${isPlaying ? 'bg-indigo-400 animate-pulse' : 'bg-gray-600'}`}
                                    style={{
                                      height: `${h * 1.4}px`,
                                      animationDelay: `${i * 0.08}s`
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {item.type === 'palette' && (
                            <div className="flex flex-col items-center justify-center p-2 w-full h-full gap-2">
                              <div className="flex flex-wrap gap-1 items-center justify-center max-w-[120px]">
                                {(item.paletteColors || ['#ff007f', '#00f3ff', '#ffe600', '#7b2cbf']).map((c, i) => (
                                  <div key={i} className="w-4 h-4 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Palette</span>
                            </div>
                          )}
                        </div>

                        {/* Card Info & Actions */}
                        <div className="mt-2 flex-1 min-w-0 flex flex-col justify-between">
                          <div className="min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingAssetName}
                                onChange={(e) => setEditingAssetName(e.target.value)}
                                onBlur={() => handleRenameAsset(localAsset!, editingAssetName)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameAsset(localAsset!, editingAssetName)}
                                className="w-full bg-black text-xs text-white px-1 py-0.5 rounded outline-none border border-indigo-500"
                                autoFocus
                              />
                            ) : (
                              <h4
                                onDoubleClick={() => {
                                  if (isLocal) {
                                    setEditingAssetId(item.id);
                                    setEditingAssetName(item.name);
                                  }
                                }}
                                className="text-xs font-bold text-white truncate leading-tight mb-0.5"
                                title={item.name}
                              >
                                {item.name}
                              </h4>
                            )}
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                              <span className="font-mono">{((item.size || 0) / 1024).toFixed(1)} KB</span>
                              {item.duration !== undefined && item.duration > 0 && (
                                <span className="text-gray-300 bg-white/10 px-1 rounded font-bold font-mono">
                                  {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}s
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Insert / Placement Actions */}
                          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between gap-1">
                            {isLocal && (
                              <select
                                value={meta.folderId || ''}
                                onChange={(e) => handleAssignFolder(item.id, e.target.value || undefined)}
                                className="text-[9px] bg-black/40 text-gray-400 hover:text-white px-1 py-0.5 rounded max-w-[50px] outline-none border border-transparent"
                                title="Move to Folder"
                              >
                                <option value="">Folder...</option>
                                {folders.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                            )}

                            <div className="flex items-center gap-1 ml-auto">
                              {/* Clone preset to my library */}
                              {!isLocal && (
                                <button
                                  onClick={() => handleClonePresetToLocal(item as PresetAsset)}
                                  className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded text-[10px]"
                                  title="Save to My Library"
                                >
                                  <Icons.Copy size={13} />
                                </button>
                              )}

                              {item.type === 'image' && (
                                <>
                                  <button
                                    onClick={() => handleConvertToSymbol(item, false)}
                                    className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded transition-all"
                                    title="Convert to Symbol"
                                  >
                                    <Icons.Wand2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onSetBackgroundImage(item.dataUrl);
                                      showStatus('Set as Canvas Background!');
                                    }}
                                    className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded transition-all"
                                    title="Set as Project Background"
                                  >
                                    <Icons.Image size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onInsertImageToLayer(item.dataUrl);
                                      showStatus('Placed on Active Layer!');
                                    }}
                                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95"
                                    title="Insert Image to current layer"
                                  >
                                    Place
                                  </button>
                                </>
                              )}

                              {item.type === 'sound' && (
                                <button
                                  onClick={() => {
                                    onAddSoundTrack(item.dataUrl, item.name);
                                    showStatus('Added sound to Timeline!');
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95 flex items-center gap-1"
                                  title="Add to Timeline Audio Track"
                                >
                                  <Icons.Music size={10} />
                                  <span>Track</span>
                                </button>
                              )}

                              {item.type === 'symbol' && (
                                <button
                                  onClick={() => handlePlaceSymbolOnCanvas(item)}
                                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95"
                                  title="Instantiate Symbol Actor on Canvas"
                                >
                                  Place
                                </button>
                              )}

                              {item.type === 'palette' && (
                                <button
                                  onClick={() => handleApplyPalette(item.paletteColors || [])}
                                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95"
                                  title="Apply Colors to Palette"
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST / TABLE VIEW */
                <div className="bg-[#1a1a1e] rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#212126] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        {isSelectMode && <th className="p-3 w-8" />}
                        <th className="p-3">Asset</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Size / Length</th>
                        <th className="p-3">Folder / Tag</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {displayItems.map(item => {
                        const isLocal = librarySource === 'local';
                        const localAsset = isLocal ? (item as LibraryAsset) : null;
                        const meta = isLocal ? getAssetMetadata(localAsset!) : item;
                        const isSelected = selectedAssetIds.has(item.id);
                        const isPlaying = playingAssetId === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            {isSelectMode && (
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedAssetIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(item.id)) next.delete(item.id);
                                      else next.add(item.id);
                                      return next;
                                    });
                                  }}
                                  className="w-4 h-4 rounded text-indigo-600"
                                />
                              </td>
                            )}
                            <td className="p-3 flex items-center gap-3">
                              <div 
                                onClick={() => item.type === 'sound' ? handlePlaySound(item) : setInspectedAsset(item)}
                                className="w-9 h-9 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden shrink-0 cursor-pointer border border-white/10"
                              >
                                {item.type === 'image' || item.type === 'symbol' ? (
                                  <img src={item.dataUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                                ) : item.type === 'sound' ? (
                                  <button className={`text-white ${isPlaying ? 'text-red-400' : 'text-indigo-400'}`}>
                                    {isPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                                  </button>
                                ) : (
                                  <Icons.Palette size={14} className="text-amber-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate max-w-xs">{item.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{item.fileType}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {item.type}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-gray-400 text-[11px]">
                              {((item.size || 0) / 1024).toFixed(1)} KB
                              {item.duration !== undefined && ` (${item.duration.toFixed(1)}s)`}
                            </td>
                            <td className="p-3 text-gray-400 text-[11px]">
                              {meta.folderId ? folders.find(f => f.id === meta.folderId)?.name : 'Unassigned'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.type === 'image' && (
                                  <button
                                    onClick={() => onInsertImageToLayer(item.dataUrl)}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px]"
                                  >
                                    Place
                                  </button>
                                )}
                                {item.type === 'sound' && (
                                  <button
                                    onClick={() => onAddSoundTrack(item.dataUrl, item.name)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                                  >
                                    Add Track
                                  </button>
                                )}
                                {item.type === 'symbol' && (
                                  <button
                                    onClick={() => handlePlaceSymbolOnCanvas(item)}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px]"
                                  >
                                    Instantiate
                                  </button>
                                )}
                                {item.type === 'palette' && (
                                  <button
                                    onClick={() => handleApplyPalette(item.paletteColors || [])}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[10px]"
                                  >
                                    Apply
                                  </button>
                                )}
                                <button
                                  onClick={() => setInspectedAsset(item)}
                                  className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg"
                                  title="Inspect"
                                >
                                  <Icons.Maximize2 size={13} />
                                </button>
                                {isLocal && (
                                  <button
                                    onClick={() => handleDeleteAsset(localAsset!)}
                                    className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg"
                                    title="Delete"
                                  >
                                    <Icons.Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Audio Scrubbing Dock (When Playing) */}
            {playingAssetId && (
              <div className="px-5 py-2.5 bg-black/80 border-t border-white/10 flex items-center justify-between gap-4 animate-in fade-in shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const curr = displayItems.find(i => i.id === playingAssetId);
                      if (curr) handlePlaySound(curr);
                    }}
                    className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                  >
                    <Icons.Pause size={14} />
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate max-w-xs">
                      {displayItems.find(i => i.id === playingAssetId)?.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {audioCurrentTime.toFixed(1)}s / {audioDuration.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Progress Scrubber Slider */}
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={audioDuration || 1}
                    step="0.01"
                    value={audioCurrentTime}
                    onChange={(e) => handleSeekAudio(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Controls: Speed, Loop, Volume */}
                <div className="flex items-center gap-3 text-xs">
                  {/* Playback Rate */}
                  <select
                    value={audioPlaybackRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value);
                      setAudioPlaybackRate(rate);
                      if (audioRef.current) audioRef.current.playbackRate = rate;
                    }}
                    className="bg-black/60 text-gray-300 px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono outline-none"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>

                  {/* Loop Toggle */}
                  <button
                    onClick={() => {
                      const next = !isAudioLooping;
                      setIsAudioLooping(next);
                      if (audioRef.current) audioRef.current.loop = next;
                    }}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isAudioLooping ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                    title="Loop Audio"
                  >
                    <Icons.Repeat size={13} />
                  </button>

                  <button
                    onClick={stopAudioPreview}
                    className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg"
                    title="Stop Audio"
                  >
                    <Icons.X size={15} />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Lightbox / Asset Inspector Modal */}
        {inspectedAsset && (
          <div className="fixed inset-0 bg-black/90 z-[140] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-[#18181c] rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full p-6 flex flex-col space-y-4 relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase border border-indigo-500/30">
                    {inspectedAsset.type}
                  </span>
                  <h3 className="text-base font-bold text-white truncate max-w-md">{inspectedAsset.name}</h3>
                </div>
                <button
                  onClick={() => setInspectedAsset(null)}
                  className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg"
                >
                  <Icons.X size={18} />
                </button>
              </div>

              {/* Media Preview Stage */}
              <div className="h-64 bg-black/60 rounded-xl flex items-center justify-center p-3 relative overflow-hidden border border-white/10 bg-[radial-gradient(#2d2d34_1px,transparent_1px)] [background-size:12px_12px]">
                {inspectedAsset.type === 'image' || inspectedAsset.type === 'symbol' ? (
                  <img
                    src={inspectedAsset.dataUrl}
                    alt={inspectedAsset.name}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                ) : inspectedAsset.type === 'sound' ? (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={() => handlePlaySound(inspectedAsset)}
                      className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl"
                    >
                      {playingAssetId === inspectedAsset.id ? <Icons.Pause size={28} /> : <Icons.Play size={28} className="translate-x-1" />}
                    </button>
                    <span className="text-xs text-gray-400 font-mono">
                      Duration: {inspectedAsset.duration ? `${inspectedAsset.duration.toFixed(2)}s` : 'Unknown'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center justify-center max-w-xs">
                    {(inspectedAsset.paletteColors || []).map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded-xl border border-white/20 shadow" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata Details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-white/10 font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase">File Type</span>
                  <span className="text-gray-200">{inspectedAsset.fileType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase">File Size</span>
                  <span className="text-gray-200">{((inspectedAsset.size || 0) / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase">Dimensions / Length</span>
                  <span className="text-gray-200">
                    {(inspectedAsset as any).width ? `${(inspectedAsset as any).width}×${(inspectedAsset as any).height}px` : inspectedAsset.duration ? `${inspectedAsset.duration.toFixed(1)}s` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase">Created</span>
                  <span className="text-gray-200">
                    {(inspectedAsset as any).createdAt ? new Date((inspectedAsset as any).createdAt).toLocaleDateString() : 'Preset'}
                  </span>
                </div>
              </div>

              {/* Lightbox Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = inspectedAsset.dataUrl;
                    link.download = `${inspectedAsset.name}.${inspectedAsset.type === 'sound' ? 'wav' : 'png'}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Icons.Download size={13} />
                  <span>Download File</span>
                </button>

                <div className="flex items-center gap-2">
                  {inspectedAsset.type === 'image' && (
                    <>
                      <button
                        onClick={() => {
                          onSetBackgroundImage(inspectedAsset.dataUrl);
                          showStatus('Set as Canvas Background!');
                          setInspectedAsset(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all"
                      >
                        Set Background
                      </button>
                      <button
                        onClick={() => {
                          onInsertImageToLayer(inspectedAsset.dataUrl);
                          showStatus('Placed on Active Layer!');
                          setInspectedAsset(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                      >
                        Place on Layer
                      </button>
                    </>
                  )}

                  {inspectedAsset.type === 'sound' && (
                    <button
                      onClick={() => {
                        onAddSoundTrack(inspectedAsset.dataUrl, inspectedAsset.name);
                        showStatus('Added to Timeline Audio!');
                        setInspectedAsset(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                    >
                      Add to Timeline Track
                    </button>
                  )}

                  {inspectedAsset.type === 'symbol' && (
                    <button
                      onClick={() => {
                        handlePlaceSymbolOnCanvas(inspectedAsset);
                        setInspectedAsset(null);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                    >
                      Place Symbol on Canvas
                    </button>
                  )}

                  {inspectedAsset.type === 'palette' && (
                    <button
                      onClick={() => {
                        handleApplyPalette(inspectedAsset.paletteColors || []);
                        setInspectedAsset(null);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                    >
                      Apply Palette
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
