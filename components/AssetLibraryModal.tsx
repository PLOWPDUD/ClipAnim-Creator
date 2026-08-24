import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Actor, Frame, Layer } from '../types';
import { saveAssetToDB, getAssetsFromDB, deleteAssetFromDB, LibraryAsset } from '../utils/db';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onAddActor: (actor: Actor) => void;
  onAddSoundTrack: (url: string, name: string) => void;
  onSetBackgroundImage: (url: string | null) => void;
  onInsertImageToLayer: (url: string) => void;
}

interface AssetFolder {
  id: string;
  name: string;
  createdAt: number;
}

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
  isOpen,
  onClose,
  canvasWidth,
  canvasHeight,
  onAddActor,
  onAddSoundTrack,
  onSetBackgroundImage,
  onInsertImageToLayer,
}) => {
  // Library state
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'sound' | 'symbol'>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Preview / player state
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load assets and folders
  useEffect(() => {
    if (isOpen) {
      loadLibraryData();
    }
    return () => {
      stopAudioPreview();
      stopRecording();
    };
  }, [isOpen]);

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
        const defaultFolders = [
          { id: 'folder-bg', name: 'Backgrounds', createdAt: Date.now() },
          { id: 'folder-sfx', name: 'SFX & Music', createdAt: Date.now() + 1 },
          { id: 'folder-char', name: 'Characters', createdAt: Date.now() + 2 }
        ];
        setFolders(defaultFolders);
        localStorage.setItem('clipanim_asset_folders', JSON.stringify(defaultFolders));
      }
    } catch (e) {
      console.error('Failed to load asset library data:', e);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: AssetFolder = {
      id: `asset-folder-${crypto.randomUUID()}`,
      name: newFolderName.trim(),
      createdAt: Date.now()
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem('clipanim_asset_folders', JSON.stringify(updated));
    setNewFolderName('');
    setIsCreatingFolder(false);
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
    }
  };

  // Helper to parse stored local metadata in asset
  const getAssetMetadata = (asset: LibraryAsset) => {
    try {
      const savedMeta = localStorage.getItem(`clipanim_asset_meta_${asset.id}`);
      return savedMeta ? JSON.parse(savedMeta) : { folderId: undefined };
    } catch {
      return { folderId: undefined };
    }
  };

  const saveAssetMetadata = (asset: LibraryAsset, metadata: any) => {
    localStorage.setItem(`clipanim_asset_meta_${asset.id}`, JSON.stringify(metadata));
    return asset;
  };

  const handleAssignFolder = (assetId: string, folderId: string | undefined) => {
    const updated = assets.map(a => {
      if (a.id === assetId) {
        return saveAssetMetadata(a, { ...getAssetMetadata(a), folderId });
      }
      return a;
    });
    setAssets(updated);
  };

  const stopAudioPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAssetId(null);
  };

  const handlePlaySound = (asset: LibraryAsset) => {
    if (playingAssetId === asset.id) {
      stopAudioPreview();
    } else {
      stopAudioPreview();
      const audio = new Audio(asset.dataUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingAssetId(null);
      };
      setPlayingAssetId(asset.id);
      audio.play().catch(e => {
        console.error('Audio playback failed', e);
        stopAudioPreview();
      });
    }
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsImporting(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await processAndSaveFile(file);
      } catch (err) {
        console.error('Error importing file:', err);
      }
    }

    setIsImporting(false);
    loadLibraryData();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processAndSaveFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          let type: 'image' | 'sound' | 'symbol' = 'image';
          let duration: number | undefined = undefined;

          if (file.type.startsWith('audio/')) {
            type = 'sound';
            // Get duration if possible
            duration = await getAudioDuration(dataUrl);
          } else if (file.type.startsWith('image/')) {
            type = 'image';
          }

          const asset: LibraryAsset = {
            id: crypto.randomUUID(),
            name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            type,
            dataUrl,
            fileType: file.type,
            size: file.size,
            createdAt: Date.now(),
            duration
          };

          await saveAssetToDB(asset);
          
          // Optionally auto-assign to selected folder if viewing folder
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
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        resolve(0);
      };
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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await processAndSaveFile(file);
      } catch (err) {
        console.error('Drop error:', err);
      }
    }
    setIsImporting(false);
    loadLibraryData();
  };

  // Audio Recording (Microphone)
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
            name: `Recorded Audio ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
            type: 'sound',
            dataUrl,
            fileType: 'audio/webm',
            size: audioBlob.size,
            createdAt: Date.now(),
            duration
          };

          await saveAssetToDB(asset);
          if (selectedFolderId !== 'all' && selectedFolderId !== 'unassigned') {
            saveAssetMetadata(asset, { folderId: selectedFolderId });
          }
          loadLibraryData();
        };
        reader.readAsDataURL(audioBlob);

        // Turn off tracks
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

  // Delete Asset
  const handleDeleteAsset = async (asset: LibraryAsset) => {
    if (confirm(`Are you sure you want to delete "${asset.name}" from your local library?`)) {
      if (playingAssetId === asset.id) {
        stopAudioPreview();
      }
      await deleteAssetFromDB(asset.id);
      localStorage.removeItem(`clipanim_asset_meta_${asset.id}`);
      loadLibraryData();
    }
  };

  // Convert an Image asset to a Symbol
  const handleConvertToSymbol = async (asset: LibraryAsset) => {
    const isAnimated = confirm(`Do you want to create an Animated Symbol from "${asset.name}"?`);
    
    // Create first frame containing this image
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
      isAnimated,
      symbolFrames: [firstFrame],
      symbolLayers: [defaultLayer],
      symbolFps: 12,
      scripts: `// Custom Symbol Actions\nthis.onUpdate = function() {\n  // Custom behaviors\n};`
    };

    await saveAssetToDB(symbolAsset);
    loadLibraryData();
  };

  // Turn Symbol Asset into Canvas Actor
  const handlePlaceSymbolOnCanvas = (asset: LibraryAsset) => {
    const finalWidth = 150;
    const finalHeight = 150;

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
      scripts: asset.scripts || `// Code runs when game starts\nthis.onUpdate = function() {\n  // Runs every frame\n};`
    };

    onAddActor(newActor);
    onClose();
  };

  // Drawing-Based Blank Symbol Creation
  const handleCreateBlankSymbol = async () => {
    const name = prompt('Enter a name for the new custom symbol:', 'CustomSymbol');
    if (!name) return;

    // Blank 150x150 transparent canvas data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 150;
    tempCanvas.height = 150;
    const blankUrl = tempCanvas.toDataURL();

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
      layers: { [defaultLayerId]: blankUrl },
      script: ''
    };

    const symbolAsset: LibraryAsset = {
      id: crypto.randomUUID(),
      name,
      type: 'symbol',
      dataUrl: blankUrl,
      fileType: 'application/json',
      size: 500,
      createdAt: Date.now(),
      isAnimated: true,
      symbolFrames: [firstFrame],
      symbolLayers: [defaultLayer],
      symbolFps: 12,
      scripts: `// Custom Symbol Actions\nthis.onUpdate = function() {\n  // Custom behaviors\n};`
    };

    await saveAssetToDB(symbolAsset);
    loadLibraryData();
  };

  // Export Entire Library as JSON
  const handleExportLibrary = () => {
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
    link.download = `clipanim-local-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import Entire Library JSON Backup
  const handleImportLibraryBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup && Array.isArray(backup.assets)) {
          if (confirm(`Import ${backup.assets.length} assets and library configurations? This will merge with your current library.`)) {
            // Import assets to IndexedDB
            for (const asset of backup.assets) {
              await saveAssetToDB(asset);
              if (backup.assetMeta && backup.assetMeta[asset.id]) {
                localStorage.setItem(`clipanim_asset_meta_${asset.id}`, JSON.stringify(backup.assetMeta[asset.id]));
              }
            }

            // Merge folders
            if (Array.isArray(backup.folders)) {
              const existingIds = new Set(folders.map(f => f.id));
              const newFolders = backup.folders.filter((f: any) => f.id && f.name && !existingIds.has(f.id));
              const updatedFolders = [...folders, ...newFolders];
              setFolders(updatedFolders);
              localStorage.setItem('clipanim_asset_folders', JSON.stringify(updatedFolders));
            }

            loadLibraryData();
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

  // Filtering Logic
  const filteredAssets = assets.filter(asset => {
    // Tab Filter
    if (activeTab !== 'all' && asset.type !== activeTab) return false;

    // Folder Filter
    const meta = getAssetMetadata(asset);
    if (selectedFolderId === 'unassigned' && meta.folderId) return false;
    if (selectedFolderId !== 'all' && selectedFolderId !== 'unassigned' && meta.folderId !== selectedFolderId) return false;

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return asset.name.toLowerCase().includes(q) || (asset.fileType && asset.fileType.toLowerCase().includes(q));
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[85vh] border border-gray-800 relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Icons.Library size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Local Asset Library</h2>
              <p className="text-[11px] text-gray-400">Manage, organize, and drag-and-drop local sounds, images, and custom symbols</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export / Import Backup buttons */}
            <button
              onClick={handleExportLibrary}
              className="p-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Export Library Backup (.json)"
            >
              <Icons.FolderOutput size={14} />
              <span className="hidden sm:inline">Export Backup</span>
            </button>
            <label
              className="p-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Import Library Backup (.json)"
            >
              <Icons.FolderDown size={14} />
              <span className="hidden sm:inline">Restore Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportLibraryBackup}
                className="hidden"
              />
            </label>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left Sidebar - Folder Organization */}
          <div className="w-56 border-r border-gray-800 bg-[#141416] flex flex-col p-4 space-y-4 select-none shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Folders</span>
              <button 
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="p-1 text-gray-400 hover:text-indigo-400 rounded hover:bg-gray-850"
                title="Create Folder"
              >
                <Icons.FolderPlus size={16} />
              </button>
            </div>

            {isCreatingFolder && (
              <div className="p-2 rounded bg-gray-900 border border-indigo-500/20 space-y-2">
                <input
                  type="text"
                  placeholder="Folder Name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs bg-gray-800 text-white px-2 py-1.5 rounded outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => setIsCreatingFolder(false)} className="text-[9px] text-gray-400 hover:text-white px-1.5 py-0.5">Cancel</button>
                  <button onClick={handleCreateFolder} className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded font-bold">Create</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 no-scrollbar text-xs">
              <button
                onClick={() => setSelectedFolderId('all')}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  selectedFolderId === 'all'
                    ? 'bg-indigo-600/10 text-indigo-400 font-bold border-l-2 border-indigo-500'
                    : 'text-gray-300 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icons.Briefcase size={14} />
                  <span>All Assets</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">{assets.length}</span>
              </button>

              <button
                onClick={() => setSelectedFolderId('unassigned')}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  selectedFolderId === 'unassigned'
                    ? 'bg-indigo-600/10 text-indigo-400 font-bold border-l-2 border-indigo-500'
                    : 'text-gray-300 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icons.Help size={14} />
                  <span>Unassigned</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">
                  {assets.filter(a => !getAssetMetadata(a).folderId).length}
                </span>
              </button>

              <div className="h-px bg-gray-800/80 my-2" />

              {folders.map(folder => {
                const count = assets.filter(a => getAssetMetadata(a).folderId === folder.id).length;
                return (
                  <div key={folder.id} className="group flex items-center justify-between rounded-lg transition-colors hover:bg-gray-800/40">
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex-1 text-left px-2.5 py-2 rounded-lg flex items-center justify-between ${
                        selectedFolderId === folder.id
                          ? 'text-indigo-400 font-bold'
                          : 'text-gray-300 group-hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <Icons.Folder size={14} className={selectedFolderId === folder.id ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'} />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 group-hover:hidden">{count}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="hidden group-hover:flex p-1 hover:bg-red-500/25 hover:text-red-400 rounded text-gray-500 mr-1.5 transition-all"
                      title="Delete Folder"
                    >
                      <Icons.Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Micro Recording Button Panel */}
            <div className="pt-2 border-t border-gray-800">
              <div className="bg-[#121214] p-3 rounded-xl border border-gray-800 flex flex-col items-center gap-2 text-center">
                <span className="text-[10px] font-semibold text-gray-400">Microphone Input</span>
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 flex items-center justify-center gap-2 animate-pulse text-xs font-bold"
                  >
                    <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
                    <span>Stop ({recordingDuration}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-full bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                  >
                    <Icons.Mic size={14} />
                    <span>Record SFX</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Area - Asset Grid and Uploaders */}
          <div className="flex-1 bg-[#121214] flex flex-col overflow-hidden">
            
            {/* Toolbar - Search, Upload, Tab Switching */}
            <div className="p-4 bg-[#18181b] border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              
              {/* Tab Switching */}
              <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800 max-w-max">
                {(['all', 'image', 'sound', 'symbol'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'image' ? 'Images' : tab === 'sound' ? 'Sounds' : 'Symbols'}
                  </button>
                ))}
              </div>

              {/* Uploading, Blank symbol & Searching */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600"
                  />
                </div>

                {activeTab === 'symbol' && (
                  <button
                    onClick={handleCreateBlankSymbol}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                    title="Draw an empty symbol timeline"
                  >
                    <Icons.Plus size={14} />
                    <span>New Blank Symbol</span>
                  </button>
                )}

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
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Icons.Upload size={14} />
                  <span>Upload Files</span>
                </button>
              </div>
            </div>

            {/* Asset Drag Drop Area / Grid */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:p-6 text-gray-300"
              style={{ contentVisibility: 'auto' }}
            >
              {isImporting && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Icons.Loader2 size={36} className="animate-spin text-indigo-500" />
                  <span className="text-xs text-gray-400">Processing file import into Local IndexedDB...</span>
                </div>
              )}

              {!isImporting && filteredAssets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-2xl bg-black/10">
                  <Icons.Upload size={48} className="text-gray-600 mb-4 animate-bounce" />
                  <h3 className="font-bold text-white mb-1">Your Library is Empty</h3>
                  <p className="text-xs text-gray-500 max-w-sm text-center mb-6">
                    Drag-and-drop local PNG, JPG, SVG, GIF, MP3, or WAV files directly here to import them locally!
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold text-xs rounded-xl border border-indigo-500/20 transition-all"
                  >
                    Select Local Files
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredAssets.map(asset => {
                    const meta = getAssetMetadata(asset);
                    return (
                      <div 
                        key={asset.id} 
                        className="group bg-[#161618] rounded-xl border border-gray-800 hover:border-indigo-500/50 p-2.5 flex flex-col h-56 transition-all shadow hover:shadow-indigo-500/5 relative overflow-hidden"
                      >
                        {/* Quick Delete Overlay button */}
                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-lg text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
                          title="Delete asset"
                        >
                          <Icons.Trash2 size={12} />
                        </button>

                        {/* Top Preview Card Frame */}
                        <div className="h-28 bg-[#1f1f23] rounded-lg flex items-center justify-center relative overflow-hidden shrink-0 border border-gray-850">
                          {asset.type === 'image' && (
                            <img 
                              src={asset.dataUrl} 
                              alt={asset.name} 
                              className="max-w-full max-h-full object-contain pointer-events-none p-1"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {asset.type === 'symbol' && (
                            <div className="flex flex-col items-center justify-center p-2 text-center h-full w-full">
                              <img 
                                src={asset.dataUrl} 
                                alt={asset.name} 
                                className="max-w-full max-h-[70%] object-contain pointer-events-none mb-1 opacity-80"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1 py-0.2 rounded uppercase border border-indigo-500/30">
                                {asset.isAnimated ? 'Symbol (Timeline)' : 'Symbol'}
                              </span>
                            </div>
                          )}

                          {asset.type === 'sound' && (
                            <div className="flex flex-col items-center justify-center p-2 w-full h-full text-center">
                              <button
                                onClick={() => handlePlaySound(asset)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
                                  playingAssetId === asset.id 
                                    ? 'bg-red-600 text-white animate-pulse' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {playingAssetId === asset.id ? (
                                  <Icons.Pause size={18} />
                                ) : (
                                  <Icons.Play size={18} className="translate-x-0.5" />
                                )}
                              </button>
                              
                              {/* Simple mini waveform indicator */}
                              <div className="flex items-center gap-0.5 mt-2 h-3 justify-center">
                                {[3, 6, 4, 8, 5, 7, 3, 6, 2].map((h, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-0.5 rounded-full ${playingAssetId === asset.id ? 'bg-indigo-400 animate-pulse' : 'bg-gray-600'}`}
                                    style={{ 
                                      height: `${h * 1.5}px`,
                                      animationDelay: `${i * 0.1}s` 
                                    }} 
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Middle Info Block */}
                        <div className="mt-2.5 flex-1 min-w-0 flex flex-col justify-between">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate leading-tight mb-0.5" title={asset.name}>
                              {asset.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                              <span className="font-mono">{(asset.size / 1024).toFixed(1)} KB</span>
                              {asset.duration !== undefined && asset.duration > 0 && (
                                <span className="text-gray-400 bg-gray-800 px-1 rounded font-bold font-mono">
                                  {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Button Links */}
                          <div className="mt-2 pt-2 border-t border-gray-850 flex items-center justify-between gap-1 shrink-0">
                            
                            {/* Folder dropdown selector */}
                            <select
                              value={meta.folderId || ''}
                              onChange={(e) => handleAssignFolder(asset.id, e.target.value || undefined)}
                              className="text-[9px] bg-gray-900 text-gray-400 hover:text-white px-1 py-1 rounded max-w-[55px] outline-none border border-transparent hover:border-gray-800"
                              title="Assign to folder"
                            >
                              <option value="">Move...</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1">
                              {/* Action Placement Trigger */}
                              {asset.type === 'image' && (
                                <>
                                  <button
                                    onClick={() => handleConvertToSymbol(asset)}
                                    className="p-1 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded transition-all"
                                    title="Convert to Symbol"
                                  >
                                    <Icons.Wand2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onSetBackgroundImage(asset.dataUrl);
                                      alert('Project background set to this library image!');
                                    }}
                                    className="p-1 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded transition-all"
                                    title="Set as Background"
                                  >
                                    <Icons.Image size={13} />
                                  </button>
                                  <button
                                    onClick={() => onInsertImageToLayer(asset.dataUrl)}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95"
                                    title="Insert Image to current drawing layer"
                                  >
                                    Place
                                  </button>
                                </>
                              )}

                              {asset.type === 'sound' && (
                                <button
                                  onClick={() => onAddSoundTrack(asset.dataUrl, asset.name)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95 flex items-center gap-0.5"
                                  title="Add sound to timeline"
                                >
                                  <Icons.Music size={8} />
                                  <span>Timeline</span>
                                </button>
                              )}

                              {asset.type === 'symbol' && (
                                <button
                                  onClick={() => handlePlaceSymbolOnCanvas(asset)}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95"
                                  title="Add Symbol Instance on Canvas"
                                >
                                  Instantiate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
