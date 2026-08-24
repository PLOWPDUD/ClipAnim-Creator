import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { Icons } from '../Icons';
import { Actor, SavedSymbol } from '../types';
import {
  prepareSymbolFrames,
  packSpritesheetAndGenerateXml,
  SpritesheetResult,
} from '../utils/spritesheetPacker';

interface SpritesheetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  actors: Actor[];
  projectName: string;
}

export const SpritesheetExportModal: React.FC<SpritesheetExportModalProps> = ({
  isOpen,
  onClose,
  actors,
  projectName,
}) => {
  // Global symbols library from localStorage
  const [globalSymbols, setGlobalSymbols] = useState<SavedSymbol[]>([]);
  
  // Available items to pack
  const allAvailableSymbols = useMemo(() => {
    const projectItems: { item: Actor | SavedSymbol; isProject: boolean }[] = actors.map(a => ({
      item: a,
      isProject: true,
    }));

    // Also include global library symbols not already in project
    const globalItems = globalSymbols
      .filter(g => !actors.some(a => a.id === g.id || a.name === g.name))
      .map(g => ({
        item: g,
        isProject: false,
      }));

    return [...projectItems, ...globalItems];
  }, [actors, globalSymbols]);

  // Selected symbol IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Select all animated symbols by default, or all if none animated
    const initial = new Set<string>();
    actors.forEach(a => {
      if (a.isAnimated || (a.symbolFrames && a.symbolFrames.length > 1)) {
        initial.add(a.id);
      }
    });
    if (initial.size === 0 && actors.length > 0) {
      actors.forEach(a => initial.add(a.id));
    }
    return initial;
  });

  // Custom animation prefix overrides per symbol (e.g. "BF idle" or "singUP")
  const [prefixMap, setPrefixMap] = useState<Record<string, string>>({});

  // Packing options
  const [trim, setTrim] = useState(true);
  const [padding, setPadding] = useState(2);
  const [powerOfTwo, setPowerOfTwo] = useState(false);
  const [maxTextureSize, setMaxTextureSize] = useState(4096);
  const [imageFileName, setImageFileName] = useState(() => {
    const clean = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    return clean ? `${clean}_spritesheet.png` : 'character.png';
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [spritesheetResult, setSpritesheetResult] = useState<SpritesheetResult | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'xml' | 'player'>('preview');

  // Preview & overlays
  const [showOverlays, setShowOverlays] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedXml, setCopiedXml] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Animation player tab
  const [playerSymbolId, setPlayerSymbolId] = useState<string>('');
  const [playerFps, setPlayerFps] = useState(24);
  const [playerFrame, setPlayerFrame] = useState(0);
  const [playerPlaying, setPlayerPlaying] = useState(true);
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null);

  // Load global library
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clipanim_symbols_library');
      if (saved) {
        setGlobalSymbols(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  // Auto initialize selected symbols on open
  useEffect(() => {
    if (isOpen) {
      const selected = new Set<string>();
      actors.forEach(a => {
        if (a.isAnimated || (a.symbolFrames && a.symbolFrames.length > 1)) {
          selected.add(a.id);
        }
      });
      if (selected.size === 0 && actors.length > 0) {
        actors.forEach(a => selected.add(a.id));
      }
      setSelectedIds(selected);

      // Initialize prefixes
      const prefixes: Record<string, string> = {};
      actors.forEach(a => {
        prefixes[a.id] = a.name.replace(/[^a-zA-Z0-9_]/g, '_');
      });
      setPrefixMap(prefixes);
    }
  }, [isOpen, actors]);

  // Generate Spritesheet and XML whenever relevant settings change
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const selectedSymbols = allAvailableSymbols
        .filter(s => selectedIds.has(s.item.id))
        .map(s => s.item);

      if (selectedSymbols.length === 0) {
        setSpritesheetResult(null);
        setIsGenerating(false);
        return;
      }

      const preparedFrames = await prepareSymbolFrames(selectedSymbols, {
        trim,
        prefixMap,
      });

      const cleanImageName = imageFileName.endsWith('.png') ? imageFileName : `${imageFileName}.png`;

      const result = await packSpritesheetAndGenerateXml(preparedFrames, {
        padding,
        trim,
        powerOfTwo,
        maxTextureSize,
        imageFileName: cleanImageName,
        prefixMap,
      });

      setSpritesheetResult(result);

      if (!playerSymbolId && selectedSymbols.length > 0) {
        setPlayerSymbolId(selectedSymbols[0].id);
      }
    } catch (err) {
      console.error('Failed to generate spritesheet:', err);
      alert('Error generating spritesheet. See console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger initial generation once opened
  useEffect(() => {
    if (isOpen && selectedIds.size > 0) {
      handleGenerate();
    }
  }, [isOpen, selectedIds.size, trim, padding, powerOfTwo, maxTextureSize]);

  // Animation player loop
  const symbolSubTextures = useMemo(() => {
    if (!spritesheetResult || !playerSymbolId) return [];
    return spritesheetResult.subTextures.filter(st => st.symbolId === playerSymbolId);
  }, [spritesheetResult, playerSymbolId]);

  useEffect(() => {
    if (!playerPlaying || symbolSubTextures.length === 0 || activeTab !== 'player') return;
    const interval = 1000 / (playerFps > 0 ? playerFps : 24);
    const timer = setInterval(() => {
      setPlayerFrame(prev => (prev + 1) % symbolSubTextures.length);
    }, interval);
    return () => clearInterval(timer);
  }, [playerPlaying, playerFps, symbolSubTextures.length, activeTab]);

  // Render selected frame in player
  useEffect(() => {
    if (activeTab !== 'player' || !spritesheetResult || symbolSubTextures.length === 0) return;
    const currentSub = symbolSubTextures[playerFrame % symbolSubTextures.length];
    const canvas = canvasPreviewRef.current;
    if (!canvas || !currentSub) return;

    canvas.width = currentSub.frameWidth || currentSub.width;
    canvas.height = currentSub.frameHeight || currentSub.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw using frame offsets (frameX, frameY)
    const drawX = -currentSub.frameX;
    const drawY = -currentSub.frameY;

    ctx.drawImage(
      spritesheetResult.canvas,
      currentSub.x,
      currentSub.y,
      currentSub.width,
      currentSub.height,
      drawX,
      drawY,
      currentSub.width,
      currentSub.height
    );
  }, [activeTab, spritesheetResult, symbolSubTextures, playerFrame]);

  if (!isOpen) return null;

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(allAvailableSymbols.map(s => s.item.id)));
  };

  const handleSelectOnlyAnimated = () => {
    const next = new Set<string>();
    allAvailableSymbols.forEach(s => {
      if (s.item.isAnimated || (s.item.symbolFrames && s.item.symbolFrames.length > 1)) {
        next.add(s.item.id);
      }
    });
    setSelectedIds(next);
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  // Copy XML
  const handleCopyXml = async () => {
    if (!spritesheetResult) return;
    try {
      await navigator.clipboard.writeText(spritesheetResult.xml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Download PNG
  const handleDownloadPng = () => {
    if (!spritesheetResult) return;
    const link = document.createElement('a');
    link.download = spritesheetResult.imageFileName;
    link.href = spritesheetResult.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download XML
  const handleDownloadXml = () => {
    if (!spritesheetResult) return;
    const xmlName = spritesheetResult.imageFileName.replace(/\.png$/i, '') + '.xml';
    const blob = new Blob([spritesheetResult.xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = xmlName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download ZIP Bundle (PNG + XML)
  const handleDownloadZip = async () => {
    if (!spritesheetResult) return;
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const baseName = spritesheetResult.imageFileName.replace(/\.png$/i, '');

      // 1. Add XML
      zip.file(`${baseName}.xml`, spritesheetResult.xml);

      // 2. Add PNG
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        spritesheetResult.canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (pngBlob) {
        zip.file(spritesheetResult.imageFileName, pngBlob);
      }

      // 3. Add Readme with FNF usage instructions
      const readmeText = `ClipAnim - Adobe Animate / Friday Night Funkin' (FNF) Spritesheet Pack
========================================================================

Image Atlas: ${spritesheetResult.imageFileName} (${spritesheetResult.width}x${spritesheetResult.height}px)
XML Atlas:   ${baseName}.xml
Total SubTextures: ${spritesheetResult.subTextures.length}

FNF / HaxeFlixel / Psych Engine Integration:
-------------------------------------------
1. Place '${spritesheetResult.imageFileName}' and '${baseName}.xml' inside:
   'assets/shared/images/characters/' or your mod's images directory.

2. In character JSON or Haxe script:
   - image: "${baseName}"
   - animations:
${Array.from(new Set(spritesheetResult.subTextures.map(s => s.animationName)))
  .map(name => `     - anim: "${name}", name: "${name}", fps: 24, loop: false`)
  .join('\n')}

Generated with ClipAnim Creator.
`;
      zip.file('README_FNF_SETUP.txt', readmeText);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.download = `${baseName}_fnf_bundle.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to create ZIP bundle', e);
      alert('Failed to generate ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="bg-[#18181b] w-[1100px] max-w-[96vw] h-[90vh] max-h-[850px] rounded-2xl shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden text-gray-200">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-[#1f1f23] border-b border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Icons.Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-wide">
                  Spritesheet & XML Exporter
                </h2>
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-500/30">
                  Adobe Animate / FNF
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Pack animated symbols into a texture atlas with Sparrow / Starling XML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedIds.size === 0}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700 disabled:opacity-50"
              title="Refresh / Re-pack Texture Atlas"
            >
              <Icons.RotateCw size={13} className={isGenerating ? 'animate-spin text-blue-400' : ''} />
              Re-Pack
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Column: Symbol List & Configuration */}
          <div className="w-80 lg:w-96 border-r border-gray-800 flex flex-col bg-[#141416] shrink-0">
            
            {/* Symbol Selection Header */}
            <div className="p-3 border-b border-gray-800/80 bg-[#1a1a1e]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Icons.Film size={14} className="text-blue-400" />
                  Symbols to Export ({selectedIds.size}/{allAvailableSymbols.length})
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={handleSelectOnlyAnimated}
                    className="text-blue-400 hover:underline px-1 py-0.5"
                    title="Select only multi-frame animated symbols"
                  >
                    Animated
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={handleSelectAll}
                    className="text-gray-400 hover:text-white px-1 py-0.5"
                  >
                    All
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={handleSelectNone}
                    className="text-gray-400 hover:text-white px-1 py-0.5"
                  >
                    None
                  </button>
                </div>
              </div>
            </div>

            {/* Symbol Item List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
              {allAvailableSymbols.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs">
                  No symbols found. Create symbols in the editor or symbol library first.
                </div>
              ) : (
                allAvailableSymbols.map(({ item, isProject }) => {
                  const isSelected = selectedIds.has(item.id);
                  const frameCount = item.isAnimated && item.symbolFrames ? item.symbolFrames.length : 1;
                  const currentPrefix = prefixMap[item.id] ?? item.name.replace(/[^a-zA-Z0-9_]/g, '_');

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40 text-white'
                          : 'bg-[#1a1a1e]/60 border-gray-800/80 text-gray-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:ring-offset-0 bg-gray-800 border-gray-700 cursor-pointer accent-blue-500"
                        />
                        
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-gray-800 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={item.dataUrl}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-xs truncate max-w-[110px]" title={item.name}>
                                {item.name}
                              </span>
                              <span className={`text-[8px] px-1 py-0.2 rounded font-medium ${isProject ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                {isProject ? 'Project' : 'Library'}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                frameCount > 1
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {frameCount} frame{frameCount > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Animation Name Input for FNF (e.g. idle, singUP, etc.) */}
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-mono">Prefix:</span>
                            <input
                              type="text"
                              value={currentPrefix}
                              onChange={(e) => {
                                setPrefixMap(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }));
                              }}
                              placeholder="Animation prefix"
                              className="flex-1 bg-black/50 border border-gray-700/80 rounded px-1.5 py-0.5 text-[11px] font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                              title="Prefix used in XML, e.g. 'idle0000', 'singUP0000'"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Spritesheet Packing Settings */}
            <div className="p-3 border-t border-gray-800 bg-[#161619] space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Texture Atlas Settings
              </div>

              {/* Image Filename */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Image Asset Name (.png)</label>
                <input
                  type="text"
                  value={imageFileName}
                  onChange={(e) => setImageFileName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="character.png"
                />
              </div>

              {/* Trimming & Padding Controls */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 bg-gray-900/80 p-2 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700">
                  <input
                    type="checkbox"
                    checked={trim}
                    onChange={(e) => setTrim(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-[11px]" title="Crop whitespace & save frameX/frameY offsets (FNF standard)">
                    Trim Transparent
                  </span>
                </label>

                <label className="flex items-center gap-2 bg-gray-900/80 p-2 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700">
                  <input
                    type="checkbox"
                    checked={powerOfTwo}
                    onChange={(e) => setPowerOfTwo(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-[11px]" title="Force dimensions to 512, 1024, 2048, 4096">
                    Power of 2
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 text-[11px]">Sprite Padding:</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 4, 8].map(p => (
                    <button
                      key={p}
                      onClick={() => setPadding(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        padding === p
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {p}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 text-[11px]">Max Atlas Size:</span>
                <div className="flex gap-1">
                  {[1024, 2048, 4096, 8192].map(size => (
                    <button
                      key={size}
                      onClick={() => setMaxTextureSize(size)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        maxTextureSize === size
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Preview, XML Code & Export Actions */}
          <div className="flex-1 flex flex-col bg-[#18181b] overflow-hidden">
            
            {/* Tab Bar & Status */}
            <div className="px-4 py-2.5 bg-[#1f1f23] border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icons.Image size={13} />
                  Spritesheet ({spritesheetResult ? `${spritesheetResult.width}×${spritesheetResult.height}` : '0×0'})
                </button>

                <button
                  onClick={() => setActiveTab('xml')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'xml'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icons.Code size={13} />
                  Adobe Animate / Sparrow XML
                </button>

                <button
                  onClick={() => setActiveTab('player')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'player'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icons.Play size={13} />
                  Live Animation Test
                </button>
              </div>

              {/* View controls */}
              {activeTab === 'preview' && spritesheetResult && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOverlays(!showOverlays)}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border ${
                      showOverlays
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    <Icons.Grid size={12} />
                    {showOverlays ? 'Bounding Boxes ON' : 'Boxes OFF'}
                  </button>

                  <div className="flex items-center gap-1 bg-gray-800 rounded px-1.5 py-0.5 border border-gray-700 text-xs">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.25, prev - 0.25))}
                      className="p-1 hover:text-white text-gray-400"
                      title="Zoom Out"
                    >
                      <Icons.ZoomOut size={12} />
                    </button>
                    <span className="text-[11px] font-mono text-gray-300 w-10 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                      className="p-1 hover:text-white text-gray-400"
                      title="Zoom In"
                    >
                      <Icons.ZoomIn size={12} />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="text-[10px] text-blue-400 hover:underline ml-1"
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-[#121214]">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="font-semibold text-sm text-gray-300">Packing spritesheet & generating XML...</p>
                  <p className="text-xs text-gray-500 mt-1">Compositing frames, trimming alpha, and building TextureAtlas</p>
                </div>
              ) : !spritesheetResult || spritesheetResult.subTextures.length === 0 ? (
                <div className="text-center p-8 max-w-sm">
                  <Icons.FileArchive size={36} className="mx-auto text-gray-600 mb-3" />
                  <p className="font-bold text-gray-300 text-sm">No symbols selected</p>
                  <p className="text-xs text-gray-500 mt-1">Check at least one symbol on the left panel to pack.</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: Spritesheet Atlas Viewer */}
                  {activeTab === 'preview' && (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                      <div
                        className="relative bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] bg-[#1a1a1e] border border-gray-700 rounded shadow-2xl overflow-hidden transition-transform duration-100"
                        style={{
                          width: spritesheetResult.width * zoomLevel,
                          height: spritesheetResult.height * zoomLevel,
                        }}
                      >
                        <img
                          src={spritesheetResult.dataUrl}
                          alt="Packed Spritesheet"
                          className="w-full h-full object-contain pointer-events-none"
                          style={{ imageRendering: 'pixelated' }}
                        />

                        {/* Overlay SubTexture Boundary Boxes */}
                        {showOverlays &&
                          spritesheetResult.subTextures.map((st, i) => (
                            <div
                              key={i}
                              className="absolute border border-blue-400/80 bg-blue-500/10 hover:bg-blue-500/30 transition-colors group cursor-pointer"
                              style={{
                                left: st.x * zoomLevel,
                                top: st.y * zoomLevel,
                                width: st.width * zoomLevel,
                                height: st.height * zoomLevel,
                              }}
                              title={`${st.name} (${st.width}x${st.height})`}
                            >
                              <span className="absolute top-0.5 left-0.5 bg-black/80 text-[8px] font-mono text-blue-300 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                {st.name}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Adobe Animate / Sparrow XML Viewer */}
                  {activeTab === 'xml' && (
                    <div className="w-full h-full flex flex-col bg-[#141416] rounded-xl border border-gray-800 overflow-hidden">
                      <div className="p-3 bg-[#1a1a1e] border-b border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">
                            {spritesheetResult.imageFileName.replace(/\.png$/i, '')}.xml
                          </span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                            {spritesheetResult.subTextures.length} SubTextures
                          </span>
                        </div>
                        <button
                          onClick={handleCopyXml}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700"
                        >
                          {copiedXml ? <Icons.Check size={13} className="text-emerald-400" /> : <Icons.Copy size={13} />}
                          {copiedXml ? 'Copied XML!' : 'Copy XML'}
                        </button>
                      </div>
                      <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-emerald-300/90 leading-relaxed no-scrollbar select-text bg-[#0d0d0f]">
                        {spritesheetResult.xml}
                      </pre>
                    </div>
                  )}

                  {/* TAB 3: Live Animation Test */}
                  {activeTab === 'player' && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4">
                      {/* Symbol Selector */}
                      <div className="flex items-center gap-3 bg-[#1e1e24] px-4 py-2 rounded-xl border border-gray-800">
                        <span className="text-xs text-gray-400 font-medium">Test Animation:</span>
                        <select
                          value={playerSymbolId}
                          onChange={(e) => {
                            setPlayerSymbolId(e.target.value);
                            setPlayerFrame(0);
                          }}
                          className="bg-black/50 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
                        >
                          {allAvailableSymbols
                            .filter(s => selectedIds.has(s.item.id))
                            .map(({ item }) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.isAnimated && item.symbolFrames ? item.symbolFrames.length : 1} frames)
                              </option>
                            ))}
                        </select>

                        <div className="w-px h-4 bg-gray-700 mx-1" />

                        <button
                          onClick={() => setPlayerPlaying(!playerPlaying)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                          title={playerPlaying ? 'Pause' : 'Play'}
                        >
                          {playerPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                        </button>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span>FPS:</span>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={playerFps}
                            onChange={(e) => setPlayerFps(Number(e.target.value))}
                            className="w-12 bg-black/50 border border-gray-700 text-white rounded px-1.5 py-0.5 text-center font-mono"
                          />
                        </div>
                      </div>

                      {/* Display Canvas */}
                      <div className="w-80 h-80 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] bg-[#1a1a1e] border border-gray-700 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden p-4 relative">
                        <canvas ref={canvasPreviewRef} className="max-w-full max-h-full object-contain" />
                        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 border border-gray-800">
                          Frame {playerFrame + 1} / {symbolSubTextures.length || 1}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Export Actions Bar */}
            <div className="p-4 bg-[#1f1f23] border-t border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Ready to export for <strong className="text-white">Friday Night Funkin' (FNF)</strong>,{' '}
                  <strong className="text-white">HaxeFlixel</strong>, or <strong className="text-white">Adobe Animate</strong>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleDownloadPng}
                  disabled={!spritesheetResult}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700 disabled:opacity-50"
                  title="Download .PNG Spritesheet Image only"
                >
                  <Icons.Image size={14} />
                  Download PNG
                </button>

                <button
                  onClick={handleDownloadXml}
                  disabled={!spritesheetResult}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700 disabled:opacity-50"
                  title="Download .XML Atlas Descriptor only"
                >
                  <Icons.Code size={14} />
                  Download XML
                </button>

                <button
                  onClick={handleDownloadZip}
                  disabled={!spritesheetResult || isExportingZip}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 active:scale-95"
                  title="Download full FNF Bundle containing .PNG + .XML + README"
                >
                  <Icons.FileArchive size={15} />
                  {isExportingZip ? 'Packaging ZIP...' : 'Export FNF / XML Bundle (.ZIP)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
