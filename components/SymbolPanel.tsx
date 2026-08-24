import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Actor, SavedSymbol } from '../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [globalLibrary, setGlobalLibrary] = useState<SavedSymbol[]>([]);
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage on mount
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

  // Save to LocalStorage whenever library changes
  const saveLibrary = (newLib: SavedSymbol[]) => {
    setGlobalLibrary(newLib);
    try {
      localStorage.setItem('clipanim_symbols_library', JSON.stringify(newLib));
    } catch (e) {
      console.error('Failed to save global symbol library', e);
    }
  };

  // Save an existing project actor to global library
  const handleSaveToLibrary = (actor: Actor) => {
    // Check if already exists in global library with same name/data
    const isDuplicateName = globalLibrary.some(s => s.name.toLowerCase() === actor.name.toLowerCase());
    const finalName = isDuplicateName ? `${actor.name}_Copy` : actor.name;

    const newSymbol: SavedSymbol = {
      id: crypto.randomUUID(),
      name: finalName,
      dataUrl: actor.dataUrl,
      isAnimated: actor.isAnimated,
      symbolFrames: actor.symbolFrames,
      symbolLayers: actor.symbolLayers,
      symbolFps: actor.symbolFps,
      scripts: actor.scripts || '',
      createdAt: Date.now()
    };

    const updated = [newSymbol, ...globalLibrary];
    saveLibrary(updated);
  };

  // Instantiate a symbol from global library into the current project
  const handleInstantiateSymbol = (symbol: SavedSymbol) => {
    // Generate a unique name for the current project context
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

    // Default dimensions: handle bounds or default to 150x150
    const finalWidth = 120;
    const finalHeight = 120;

    const newActor: Actor = {
      id: crypto.randomUUID(),
      name: finalName,
      dataUrl: symbol.dataUrl,
      isAnimated: symbol.isAnimated,
      symbolFrames: symbol.symbolFrames,
      symbolLayers: symbol.symbolLayers,
      symbolFps: symbol.symbolFps,
      x: Math.round((canvasWidth - finalWidth) / 2),
      y: Math.round((canvasHeight - finalHeight) / 2),
      width: finalWidth,
      height: finalHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      scripts: symbol.scripts || `// Code runs when game starts\nthis.onUpdate = function() {\n  // custom code;\n};`
    };

    onAddActor(newActor);
  };

  // Rename a symbol in global library
  const handleStartRename = (symbol: SavedSymbol) => {
    setEditingSymbolId(symbol.id);
    setEditingName(symbol.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) return;
    const updated = globalLibrary.map(s => 
      s.id === id ? { ...s, name: editingName.trim() } : s
    );
    saveLibrary(updated);
    setEditingSymbolId(null);
  };

  // Delete from global library
  const handleDeleteFromLibrary = (id: string) => {
    if (confirm("Are you sure you want to delete this symbol from the global library? This cannot be undone.")) {
      const updated = globalLibrary.filter(s => s.id !== id);
      saveLibrary(updated);
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
            if (confirm(`Import ${valid.length} symbols into your library?`)) {
              // Merge, avoiding strict id collision
              const merged = [...valid, ...globalLibrary].reduce((acc: SavedSymbol[], current) => {
                if (!acc.some(item => item.id === current.id)) {
                  acc.push(current);
                } else {
                  acc.push({ ...current, id: crypto.randomUUID() });
                }
                return acc;
              }, []);
              saveLibrary(merged);
            }
          } else {
            alert("No valid symbols found in the file.");
          }
        } else {
          alert("Invalid file format. Must be an array of symbols.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
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
  };

  // Filters
  const filteredProjectActors = actors.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGlobalSymbols = globalLibrary.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute right-16 top-4 w-80 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="p-3 bg-[#252525] flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Icons.Library size={16} className="text-[#007AFF]" />
          <h3 className="font-bold text-sm text-white">Symbol Library</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenAssetLibrary && (
            <button
              onClick={onOpenAssetLibrary}
              className="p-1 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded transition-colors"
              title="Open Local Asset Library"
            >
              <Icons.Library size={14} />
            </button>
          )}
          {onOpenSpritesheetExport && (
            <button
              onClick={onOpenSpritesheetExport}
              className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors"
              title="Export Animated Symbols to Spritesheet + XML (Adobe Animate / FNF)"
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
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Import Library (.json)"
          >
            <Icons.Upload size={14} />
          </button>
          <button 
            onClick={handleExportLibrary}
            disabled={globalLibrary.length === 0}
            className={`p-1 rounded ${globalLibrary.length === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Export Library (.json)"
          >
            <Icons.FileJson size={14} />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5" />
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
            <Icons.X size={15} />
          </button>
        </div>
      </div>

      {/* Spritesheet & XML Quick Action Banner */}
      {onOpenSpritesheetExport && (actors.length > 0 || globalLibrary.length > 0) && (
        <div className="px-3 py-2 bg-gradient-to-r from-red-950/40 via-red-900/20 to-transparent border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center text-red-400">
              <Icons.Sparkles size={11} />
            </div>
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-white">Spritesheet & XML</span>
              <p className="text-[9px] text-gray-400">Adobe Animate & FNF Format</p>
            </div>
          </div>
          <button
            onClick={onOpenSpritesheetExport}
            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold shadow transition-all active:scale-95 flex items-center gap-1"
          >
            Export Atlas
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="p-2.5 border-b border-gray-800 bg-black/10">
        <div className="relative">
          <Icons.Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#007AFF] transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <Icons.X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] p-3 space-y-4 no-scrollbar">
        
        {/* SECTION 1: Current Project Symbols */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Project Symbols</span>
            <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{actors.length}</span>
          </div>

          {filteredProjectActors.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-gray-800 rounded-lg bg-black/5">
              <p className="text-[11px] text-gray-500">
                {searchQuery ? "No matching project symbols" : "No symbols in active project yet."}
              </p>
              {!searchQuery && (
                <p className="text-[9px] text-gray-600 mt-0.5">
                  Select a canvas drawing and click the box menu icon to turn it into a symbol.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredProjectActors.map(actor => (
                <div key={actor.id} className="group bg-black/20 rounded-lg border border-gray-800/80 overflow-hidden flex flex-col p-1.5 hover:border-gray-700 transition-colors">
                  <div className="aspect-square bg-gray-900/60 rounded-md flex items-center justify-center p-1.5 relative">
                    <img src={actor.dataUrl} alt={actor.name} className="max-w-full max-h-full object-contain" />
                    
                    {/* Hover action to save to global library */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5">
                      <button
                        onClick={() => handleSaveToLibrary(actor)}
                        className="p-1.5 bg-gray-800 hover:bg-[#007AFF] text-gray-300 hover:text-white rounded-md transition-colors"
                        title="Save to Global Library"
                      >
                        <Icons.Plus size={12} />
                      </button>
                      <button
                        onClick={() => onRemoveActor(actor.id)}
                        className="p-1.5 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-md transition-colors"
                        title="Remove Symbol"
                      >
                        <Icons.Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] px-0.5">
                    <span className="text-gray-300 truncate max-w-[85px]" title={actor.name}>{actor.name}</span>
                    <span className="text-[9px] text-gray-500">Proj</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Global Saved Library */}
        <div>
          <div className="flex items-center justify-between mb-2 border-t border-gray-800/80 pt-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Global Library</span>
            <span className="text-[10px] bg-[#007AFF]/20 px-1.5 py-0.5 rounded text-[#007AFF] font-bold">{globalLibrary.length}</span>
          </div>

          {filteredGlobalSymbols.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-gray-800 rounded-lg bg-black/5">
              <p className="text-[11px] text-gray-500">
                {searchQuery ? "No matching global symbols" : "Global library is empty"}
              </p>
              {!searchQuery && (
                <p className="text-[9px] text-gray-600 mt-0.5">
                  Click '+' on a project symbol above to save it into your global library for use in any animation!
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredGlobalSymbols.map(symbol => {
                const isEditing = editingSymbolId === symbol.id;
                return (
                  <div key={symbol.id} className="group bg-black/20 rounded-lg border border-gray-800/80 overflow-hidden flex flex-col p-1.5 hover:border-[#007AFF]/50 transition-colors">
                    <div className="aspect-square bg-gray-900/60 rounded-md flex items-center justify-center p-1.5 relative">
                      <img src={symbol.dataUrl} alt={symbol.name} className="max-w-full max-h-full object-contain" />
                      
                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5">
                        <button
                          onClick={() => handleInstantiateSymbol(symbol)}
                          className="px-2 py-1 bg-[#007AFF] hover:bg-blue-600 text-white rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                          title="Place on active frame"
                        >
                          Place
                        </button>
                        <button
                          onClick={() => handleStartRename(symbol)}
                          className="p-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors"
                          title="Rename"
                        >
                          <Icons.Settings size={10} />
                        </button>
                        <button
                          onClick={() => handleDeleteFromLibrary(symbol.id)}
                          className="p-1 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"
                          title="Delete from Library"
                        >
                          <Icons.Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 px-0.5 flex flex-col gap-0.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleSaveRename(symbol.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(symbol.id);
                              if (e.key === 'Escape') setEditingSymbolId(null);
                            }}
                            className="w-full bg-black text-[10px] text-white p-0.5 rounded outline-none border border-[#007AFF]"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-300 truncate max-w-[85px]" title={symbol.name}>{symbol.name}</span>
                          <span className="text-[8px] text-amber-500 font-bold" title="Persistent Global Library">GLOB</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
