import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Actor, SavedSymbol, Frame } from '../types';
import { PRESET_SYMBOLS } from '../utils/libraryPresets';

interface SymbolPanelProps {
  actors: Actor[];
  onAddActor: (actor: Actor) => void;
  onRemoveActor: (id: string) => void;
  canvasWidth: number;
  canvasHeight: number;
  onClose: () => void;
  onOpenSpritesheetExport?: () => void;
  onOpenAssetLibrary?: () => void;
}

type SymbolTab = 'project' | 'global' | 'presets';
type SymbolFilter = 'all' | 'animated' | 'static' | 'scripted';

export const SymbolPanel: React.FC<SymbolPanelProps> = ({
  actors,
  onAddActor,
  onRemoveActor,
  canvasWidth,
  canvasHeight,
  onClose,
  onOpenSpritesheetExport,
  onOpenAssetLibrary
}) => {
  const [activeTab, setActiveTab] = useState<SymbolTab>('project');
  const [activeFilter, setActiveFilter] = useState<SymbolFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalLibrary, setGlobalLibrary] = useState<SavedSymbol[]>([]);
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number>(0);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const animIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Global Library from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clipanim_symbols_library');
      if (saved) {
        setGlobalLibrary(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load global symbol library', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Save to LocalStorage whenever library changes
  const saveLibrary = (newLib: SavedSymbol[]) => {
    setGlobalLibrary(newLib);
    try {
      localStorage.setItem('clipanim_symbols_library', JSON.stringify(newLib));
    } catch (e) {
      console.error('Failed to save global symbol library', e);
    }
  };

  // Hover Animation Loop Engine
  const startHoverPreview = (symbol: { isAnimated?: boolean; symbolFrames?: Frame[] }, id: string) => {
    if (!symbol.isAnimated || !symbol.symbolFrames || symbol.symbolFrames.length <= 1) return;
    setHoveredSymbolId(id);
    setHoveredFrameIndex(0);

    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    animIntervalRef.current = setInterval(() => {
      setHoveredFrameIndex(prev => (prev + 1) % (symbol.symbolFrames?.length || 1));
    }, 100); // ~10fps preview
  };

  const stopHoverPreview = () => {
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
    setHoveredSymbolId(null);
    setHoveredFrameIndex(0);
  };

  // Save project actor to global library
  const handleSaveToGlobalLibrary = (actor: Actor) => {
    const isDuplicateName = globalLibrary.some(s => s.name.toLowerCase() === actor.name.toLowerCase());
    const finalName = isDuplicateName ? `${actor.name}_Copy` : actor.name;

    const newSymbol: SavedSymbol = {
      id: crypto.randomUUID(),
      name: finalName,
      dataUrl: actor.dataUrl,
      isAnimated: actor.isAnimated,
      symbolFrames: actor.symbolFrames,
      symbolLayers: actor.symbolLayers,
      symbolLayerFolders: actor.symbolLayerFolders,
      symbolFps: actor.symbolFps,
      scripts: actor.scripts || '',
      createdAt: Date.now()
    };

    const updated = [newSymbol, ...globalLibrary];
    saveLibrary(updated);
    showToast(`Saved "${newSymbol.name}" to Global Library!`);
  };

  // Duplicate an Actor in Project
  const handleDuplicateActor = (actor: Actor) => {
    let suffix = 1;
    let newName = `${actor.name}_copy`;
    while (actors.some(a => a.name === newName)) {
      suffix++;
      newName = `${actor.name}_copy${suffix}`;
    }

    const clonedActor: Actor = {
      ...actor,
      id: crypto.randomUUID(),
      name: newName,
      x: actor.x + 20,
      y: actor.y + 20
    };

    onAddActor(clonedActor);
    showToast(`Duplicated to "${clonedActor.name}"`);
  };

  // Duplicate in Global Library
  const handleDuplicateGlobal = (symbol: SavedSymbol) => {
    const cloned: SavedSymbol = {
      ...symbol,
      id: crypto.randomUUID(),
      name: `${symbol.name}_Copy`,
      createdAt: Date.now()
    };
    saveLibrary([cloned, ...globalLibrary]);
    showToast(`Cloned symbol in Global Library`);
  };

  // Instantiate symbol into current project
  const handleInstantiateSymbol = (symbol: SavedSymbol | typeof PRESET_SYMBOLS[0]) => {
    let instanceName = symbol.name.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z]/.test(instanceName)) {
      instanceName = 'Actor_' + instanceName;
    }
    
    let suffix = 1;
    let finalName = instanceName;
    while (actors.some(a => a.name === finalName)) {
      finalName = `${instanceName}_${suffix}`;
      suffix++;
    }

    const finalWidth = 140;
    const finalHeight = 140;

    const newActor: Actor = {
      id: crypto.randomUUID(),
      name: finalName,
      dataUrl: symbol.dataUrl,
      isAnimated: symbol.isAnimated,
      symbolFrames: symbol.symbolFrames,
      symbolLayers: symbol.symbolLayers,
      symbolLayerFolders: symbol.symbolLayerFolders,
      symbolFps: symbol.symbolFps || 12,
      x: Math.round((canvasWidth - finalWidth) / 2),
      y: Math.round((canvasHeight - finalHeight) / 2),
      width: finalWidth,
      height: finalHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      scripts: symbol.scripts || `// Custom behaviors\nthis.onUpdate = function() {\n  // Code loop\n};`
    };

    onAddActor(newActor);
    showToast(`Placed "${newActor.name}" on canvas!`);
  };

  // Rename a symbol in global library
  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) {
      setEditingSymbolId(null);
      return;
    }
    const updated = globalLibrary.map(s => 
      s.id === id ? { ...s, name: editingName.trim() } : s
    );
    saveLibrary(updated);
    setEditingSymbolId(null);
    showToast(`Renamed to "${editingName.trim()}"`);
  };

  // Delete from global library
  const handleDeleteFromLibrary = (id: string) => {
    if (confirm("Delete this symbol from your persistent Global Library?")) {
      const updated = globalLibrary.filter(s => s.id !== id);
      saveLibrary(updated);
      showToast('Symbol deleted from library');
    }
  };

  // Import global library JSON
  const handleImportLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const valid = imported.filter(s => s.id && s.name && s.dataUrl);
          if (valid.length > 0) {
            if (confirm(`Import ${valid.length} symbols into your Global Library?`)) {
              const merged = [...valid, ...globalLibrary].reduce((acc: SavedSymbol[], current) => {
                if (!acc.some(item => item.id === current.id)) {
                  acc.push(current);
                } else {
                  acc.push({ ...current, id: crypto.randomUUID() });
                }
                return acc;
              }, []);
              saveLibrary(merged);
              showToast(`Imported ${valid.length} symbols!`);
            }
          } else {
            alert("No valid symbols found in file.");
          }
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON symbol file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export global library JSON
  const handleExportLibrary = () => {
    if (globalLibrary.length === 0) return;
    const dataStr = JSON.stringify(globalLibrary, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-symbols-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported symbol library JSON!');
  };

  // Filtering list
  const getFilteredList = (list: any[]) => {
    return list.filter(item => {
      // Search
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Filter
      if (activeFilter === 'animated') return !!item.isAnimated;
      if (activeFilter === 'static') return !item.isAnimated;
      if (activeFilter === 'scripted') return !!(item.scripts && item.scripts.trim().length > 0);
      return true;
    });
  };

  const filteredProjectActors = getFilteredList(actors);
  const filteredGlobalSymbols = getFilteredList(globalLibrary);
  const filteredPresetSymbols = getFilteredList(PRESET_SYMBOLS);

  return (
    <div className="absolute right-16 top-4 w-96 bg-[#161619] border border-white/15 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 select-none backdrop-blur-md text-gray-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-2xl z-50 animate-in fade-in border border-blue-400">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="p-3 bg-[#1d1d22] flex justify-between items-center border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
            <Icons.Library size={16} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Symbols & Actors</h3>
            <span className="text-[10px] text-gray-400">
              {activeTab === 'project' ? `${actors.length} in project` : activeTab === 'global' ? `${globalLibrary.length} saved` : `${PRESET_SYMBOLS.length} presets`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAssetLibrary && (
            <button
              onClick={onOpenAssetLibrary}
              className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors"
              title="Open Full Asset Library"
            >
              <Icons.Briefcase size={14} />
            </button>
          )}

          {onOpenSpritesheetExport && (
            <button
              onClick={onOpenSpritesheetExport}
              className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors"
              title="Export Spritesheet & XML (Adobe Animate / FNF)"
            >
              <Icons.Sparkles size={14} />
            </button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportLibrary} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
            title="Import Symbol Library (.json)"
          >
            <Icons.Upload size={14} />
          </button>
          <button 
            onClick={handleExportLibrary}
            disabled={globalLibrary.length === 0}
            className={`p-1.5 rounded-lg ${globalLibrary.length === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            title="Export Symbol Library (.json)"
          >
            <Icons.FileJson size={14} />
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
            <Icons.X size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-black/40 p-1 border-b border-white/10 gap-1 shrink-0 text-xs font-bold">
        <button
          onClick={() => setActiveTab('project')}
          className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'project'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Icons.Layers size={13} />
          <span>Project</span>
          <span className="text-[9px] bg-black/40 px-1.5 py-0.2 rounded-full">{actors.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'global'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Icons.Briefcase size={13} />
          <span>Global</span>
          <span className="text-[9px] bg-black/40 px-1.5 py-0.2 rounded-full">{globalLibrary.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Icons.Sparkles size={13} />
          <span>Templates</span>
        </button>
      </div>

      {/* Search & Filter Chips Bar */}
      <div className="p-2.5 bg-[#121214] border-b border-white/10 space-y-2 shrink-0">
        <div className="relative">
          <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <Icons.X size={11} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] font-bold">
          {(['all', 'animated', 'static', 'scripted'] as SymbolFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-0.5 rounded-full capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'All Symbols' : filter === 'animated' ? 'Loops' : filter === 'static' ? 'Static' : 'Scripted'}
            </button>
          ))}
        </div>
      </div>

      {/* Spritesheet Export Quick Banner */}
      {onOpenSpritesheetExport && (
        <div className="px-3 py-2 bg-red-950/40 border-b border-red-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
              <Icons.Sparkles size={11} />
            </div>
            <div className="text-[10px] leading-tight">
              <span className="font-bold text-white">Adobe Animate Spritesheet</span>
              <p className="text-[9px] text-gray-400">Export Texture Atlas + XML</p>
            </div>
          </div>
          <button
            onClick={onOpenSpritesheetExport}
            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold shadow transition-all active:scale-95"
          >
            Export
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] p-3 space-y-3 no-scrollbar">
        
        {/* TAB 1: PROJECT SYMBOLS */}
        {activeTab === 'project' && (
          <div>
            {filteredProjectActors.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                <Icons.Layers size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-400">
                  {searchQuery ? "No matching project symbols" : "No actors in project"}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                  Turn any drawing layer into a symbol or instantiate from Global/Templates tabs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProjectActors.map(actor => {
                  const isHovered = hoveredSymbolId === actor.id;
                  const displayUrl = isHovered && actor.isAnimated && actor.symbolFrames && actor.symbolFrames[hoveredFrameIndex]
                    ? Object.values(actor.symbolFrames[hoveredFrameIndex].layers)[0] || actor.dataUrl
                    : actor.dataUrl;

                  return (
                    <div
                      key={actor.id}
                      onMouseEnter={() => startHoverPreview(actor, actor.id)}
                      onMouseLeave={stopHoverPreview}
                      className="group bg-[#1e1e23] rounded-xl border border-white/10 hover:border-blue-500/50 p-2 flex flex-col transition-all shadow-md relative overflow-hidden"
                    >
                      {/* Image Preview Box */}
                      <div className="aspect-square bg-[#27272e] rounded-lg flex items-center justify-center p-2 relative overflow-hidden bg-[radial-gradient(#3a3a44_1px,transparent_1px)] [background-size:8px_8px]">
                        <img src={displayUrl} alt={actor.name} className="max-w-full max-h-full object-contain pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          {actor.isAnimated && (
                            <span className="text-[8px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-md shadow">
                              {actor.symbolFrames?.length || 1}F
                            </span>
                          )}
                          {actor.scripts && actor.scripts.trim().length > 0 && (
                            <span className="text-[8px] bg-amber-500 text-black font-bold px-1 py-0.2 rounded shadow">
                              JS
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay Action Controls */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-1">
                          <button
                            onClick={() => handleSaveToGlobalLibrary(actor)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow"
                            title="Save to Global Library"
                          >
                            <Icons.Save size={12} />
                          </button>
                          <button
                            onClick={() => handleDuplicateActor(actor)}
                            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                            title="Duplicate Actor"
                          >
                            <Icons.Copy size={12} />
                          </button>
                          <button
                            onClick={() => onRemoveActor(actor.id)}
                            className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                            title="Remove Actor"
                          >
                            <Icons.Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Name & Subtitle */}
                      <div className="mt-1.5 flex items-center justify-between text-xs px-0.5">
                        <span className="font-bold text-white truncate max-w-[100px]" title={actor.name}>{actor.name}</span>
                        <span className="text-[9px] text-gray-400 font-mono">Actor</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GLOBAL LIBRARY */}
        {activeTab === 'global' && (
          <div>
            {filteredGlobalSymbols.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                <Icons.Briefcase size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-400">
                  {searchQuery ? "No matching global symbols" : "Global library is empty"}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                  Click the Save icon on any project symbol to store it permanently across all your animations!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredGlobalSymbols.map(symbol => {
                  const isEditing = editingSymbolId === symbol.id;
                  const isHovered = hoveredSymbolId === symbol.id;
                  const displayUrl = isHovered && symbol.isAnimated && symbol.symbolFrames && symbol.symbolFrames[hoveredFrameIndex]
                    ? Object.values(symbol.symbolFrames[hoveredFrameIndex].layers)[0] || symbol.dataUrl
                    : symbol.dataUrl;

                  return (
                    <div
                      key={symbol.id}
                      onMouseEnter={() => startHoverPreview(symbol, symbol.id)}
                      onMouseLeave={stopHoverPreview}
                      className="group bg-[#1e1e23] rounded-xl border border-white/10 hover:border-blue-500/50 p-2 flex flex-col transition-all shadow-md relative overflow-hidden"
                    >
                      {/* Image Preview Box */}
                      <div className="aspect-square bg-[#27272e] rounded-lg flex items-center justify-center p-2 relative overflow-hidden bg-[radial-gradient(#3a3a44_1px,transparent_1px)] [background-size:8px_8px]">
                        <img src={displayUrl} alt={symbol.name} className="max-w-full max-h-full object-contain pointer-events-none" />

                        {/* Badges */}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          {symbol.isAnimated && (
                            <span className="text-[8px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-md shadow">
                              {symbol.symbolFrames?.length || 1}F
                            </span>
                          )}
                          {symbol.scripts && symbol.scripts.trim().length > 0 && (
                            <span className="text-[8px] bg-amber-500 text-black font-bold px-1 py-0.2 rounded shadow">
                              JS
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-1">
                          <button
                            onClick={() => handleInstantiateSymbol(symbol)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shadow transition-all active:scale-95"
                            title="Place on Canvas"
                          >
                            Place
                          </button>
                          <button
                            onClick={() => handleDuplicateGlobal(symbol)}
                            className="p-1 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                            title="Duplicate"
                          >
                            <Icons.Copy size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteFromLibrary(symbol.id)}
                            className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                            title="Delete"
                          >
                            <Icons.Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Name & Rename */}
                      <div className="mt-1.5 px-0.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleSaveRename(symbol.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(symbol.id);
                              if (e.key === 'Escape') setEditingSymbolId(null);
                            }}
                            className="w-full bg-black text-xs text-white px-1.5 py-0.5 rounded outline-none border border-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span 
                              onDoubleClick={() => {
                                setEditingSymbolId(symbol.id);
                                setEditingName(symbol.name);
                              }}
                              className="font-bold text-white truncate max-w-[100px] cursor-pointer" 
                              title="Double click to rename"
                            >
                              {symbol.name}
                            </span>
                            <button
                              onClick={() => {
                                setEditingSymbolId(symbol.id);
                                setEditingName(symbol.name);
                              }}
                              className="text-gray-500 hover:text-white"
                            >
                              <Icons.Edit2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STARTER TEMPLATES */}
        {activeTab === 'presets' && (
          <div>
            <div className="grid grid-cols-2 gap-2.5">
              {filteredPresetSymbols.map(preset => {
                const isHovered = hoveredSymbolId === preset.id;
                const displayUrl = isHovered && preset.isAnimated && preset.symbolFrames && preset.symbolFrames[hoveredFrameIndex]
                  ? Object.values(preset.symbolFrames[hoveredFrameIndex].layers)[0] || preset.dataUrl
                  : preset.dataUrl;

                return (
                  <div
                    key={preset.id}
                    onMouseEnter={() => startHoverPreview(preset, preset.id)}
                    onMouseLeave={stopHoverPreview}
                    className="group bg-[#1e1e23] rounded-xl border border-white/10 hover:border-indigo-500/50 p-2 flex flex-col transition-all shadow-md relative overflow-hidden"
                  >
                    {/* Image Preview Box */}
                    <div className="aspect-square bg-[#27272e] rounded-lg flex items-center justify-center p-2 relative overflow-hidden bg-[radial-gradient(#3a3a44_1px,transparent_1px)] [background-size:8px_8px]">
                      <img src={displayUrl} alt={preset.name} className="max-w-full max-h-full object-contain pointer-events-none" />

                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="text-[8px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-md shadow">
                          {preset.symbolFrames?.length || 1}F
                        </span>
                        {preset.scripts && (
                          <span className="text-[8px] bg-amber-500 text-black font-bold px-1 py-0.2 rounded shadow">
                            JS
                          </span>
                        )}
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-1">
                        <button
                          onClick={() => handleInstantiateSymbol(preset)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow transition-all active:scale-95"
                          title="Place Preset on Canvas"
                        >
                          Use Symbol
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5 px-0.5">
                      <span className="font-bold text-xs text-white truncate block" title={preset.name}>
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-indigo-400 font-bold">Template Loop</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
