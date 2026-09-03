import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { BackpackItem } from '../types';
import {
  autoTrimTransparentCanvas,
  flipImageDataUrl,
  rotateImageDataUrl,
  invertImageDataUrl,
  removeColorKeyBackground
} from '../utils/imageCropUtils';
import JSZip from 'jszip';

interface BackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BackpackItem[];
  onSelectItem: (item: BackpackItem) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onUpdateItem: (id: string, updates: Partial<BackpackItem> | string) => void;
  onStartSelecting: () => void;
  onImportItems: (items: BackpackItem[]) => void;
  onPackCurrentLayer?: () => void;
  onPackCurrentFrame?: () => void;
  onStampOnLayer?: (item: BackpackItem) => void;
  onPlaceAsNewLayer?: (item: BackpackItem) => void;
  onConvertToActor?: (item: BackpackItem) => void;
  onSetAsBackground?: (item: BackpackItem) => void;
  onToggleQuickDock?: () => void;
  isQuickDockOpen?: boolean;
}

type CategoryFilter = 'all' | 'favorites' | 'characters' | 'mouths' | 'faces' | 'vfx' | 'bubbles' | 'uncategorized';
type SortOrder = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc';

export const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onDeleteItem,
  onDeleteMultipleItems,
  onUpdateItem,
  onStartSelecting,
  onImportItems,
  onPackCurrentLayer,
  onPackCurrentFrame,
  onStampOnLayer,
  onPlaceAsNewLayer,
  onConvertToActor,
  onSetAsBackground,
  onToggleQuickDock,
  isQuickDockOpen
}) => {
  const { t } = useTranslation();

  // Navigation & Filtering
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Multi-select & Batch
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Inspector & Image Editing Studio
  const [inspectedItem, setInspectedItem] = useState<BackpackItem | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [keyColor, setKeyColor] = useState<string>('#ffffff');
  const [colorTolerance, setColorTolerance] = useState<number>(35);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [inspectorDimensions, setInspectorDimensions] = useState<{ width: number; height: number } | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Inputs
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const imageFilesInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Keep inspector dimensions up to date
  useEffect(() => {
    if (inspectedItem) {
      const url = editPreviewUrl || inspectedItem.dataUrl;
      const img = new Image();
      img.onload = () => {
        setInspectorDimensions({ width: img.width, height: img.height });
      };
      img.src = url;
    } else {
      setInspectorDimensions(null);
      setEditPreviewUrl(null);
    }
  }, [inspectedItem, editPreviewUrl]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsSelectionMode(false);
    setSelectedItemIds(new Set());
    setEditingItemId(null);
    setInspectedItem(null);
    setEditPreviewUrl(null);
    onClose();
  };

  const handleSaveItemName = (id: string) => {
    if (editingName.trim()) {
      if (typeof onUpdateItem === 'function') {
        onUpdateItem(id, { name: editingName.trim() });
      }
    }
    setEditingItemId(null);
    showToast('Name updated');
  };

  const handleToggleFavorite = (item: BackpackItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newFav = !item.isFavorite;
    onUpdateItem(item.id, { isFavorite: newFav });
    showToast(newFav ? 'Marked as Favorite ⭐' : 'Removed from Favorites');
  };

  const handleChangeCategory = (item: BackpackItem, category: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdateItem(item.id, { category });
    showToast(`Categorized as "${category}"`);
  };

  // Duplicate an item
  const handleDuplicateItem = (item: BackpackItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newItem: BackpackItem = {
      ...item,
      id: crypto.randomUUID(),
      name: `${item.name || 'Item'}_copy`,
      createdAt: Date.now()
    };
    onImportItems([...items, newItem]);
    showToast(`Duplicated "${newItem.name}"`);
  };

  // Multi-selection Helpers
  const toggleItemSelection = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (selectedItemIds.size === 0) return;
    if (confirm(`Permanently delete ${selectedItemIds.size} items from your Backpack?`)) {
      if (onDeleteMultipleItems) {
        onDeleteMultipleItems(Array.from(selectedItemIds));
      } else {
        const idsToDelete = new Set(selectedItemIds);
        const remaining = items.filter(i => !idsToDelete.has(i.id));
        onImportItems(remaining);
      }
      setSelectedItemIds(new Set());
      setIsSelectionMode(false);
      showToast('Items deleted');
    }
  };

  // Batch Download as ZIP
  const handleBatchExportZip = async () => {
    const targets = isSelectionMode && selectedItemIds.size > 0 
      ? items.filter(i => selectedItemIds.has(i.id))
      : items;

    if (targets.length === 0) return;

    if (targets.length === 1) {
      const item = targets[0];
      const link = document.createElement('a');
      link.href = item.dataUrl;
      link.download = `${item.name || 'backpack-item'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded PNG');
      return;
    }

    const zip = new JSZip();
    targets.forEach((item, idx) => {
      const parts = item.dataUrl.split(',');
      if (parts.length === 2) {
        const ext = item.dataUrl.includes('image/svg') ? 'svg' : 'png';
        const rawName = (item.name || `backpack_item_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        zip.file(`${rawName}.${ext}`, parts[1], { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-backpack-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${targets.length} items to ZIP`);
  };

  // Export Full JSON with Metadata
  const handleExportJSON = () => {
    if (items.length === 0) return;
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-backpack-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported backpack backup JSON');
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(item => item.id && item.dataUrl);
          if (valid.length > 0) {
            const merged = [...valid, ...items].reduce((acc: BackpackItem[], curr) => {
              if (!acc.some(i => i.id === curr.id)) acc.push(curr);
              else acc.push({ ...curr, id: crypto.randomUUID() });
              return acc;
            }, []);
            onImportItems(merged);
            showToast(`Imported ${valid.length} items into Backpack!`);
          } else {
            alert(t('backpack.invalidJson'));
          }
        }
      } catch (err) {
        console.error(err);
        alert(t('backpack.parseFailed'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import Image Files directly
  const handleImportImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newItems: BackpackItem[] = [];

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const name = file.name.replace(/\.[^/.]+$/, '');
          newItems.push({
            id: crypto.randomUUID(),
            name,
            dataUrl,
            createdAt: Date.now(),
            category: 'uncategorized'
          });
        }
        loadedCount++;
        if (loadedCount === fileList.length) {
          onImportItems([...newItems, ...items]);
          showToast(`Imported ${newItems.length} images to Backpack!`);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showToast('Clipboard access not supported');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let found = false;

      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              const newItem: BackpackItem = {
                id: crypto.randomUUID(),
                name: `Pasted_Image_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
                dataUrl,
                createdAt: Date.now(),
                category: 'uncategorized'
              };
              onImportItems([newItem, ...items]);
              showToast('Pasted image into Backpack!');
            }
          };
          reader.readAsDataURL(blob);
          found = true;
          break;
        }
      }
      if (!found) {
        showToast('No image in clipboard');
      }
    } catch (err) {
      console.warn('Clipboard read failed', err);
      showToast('Clipboard access denied or empty');
    }
  };

  // --- IMAGE STUDIO ACTIONS (INSPECTOR) ---
  const handleAutoTrim = async () => {
    if (!inspectedItem) return;
    setIsProcessingEdit(true);
    const currentUrl = editPreviewUrl || inspectedItem.dataUrl;
    const res = await autoTrimTransparentCanvas(currentUrl);
    setEditPreviewUrl(res.dataUrl);
    setInspectorDimensions({ width: res.width, height: res.height });
    setIsProcessingEdit(false);
    showToast(res.trimmed ? 'Auto-trimmed transparent margins!' : 'Already trimmed tightly');
  };

  const handleFlip = async (horizontal: boolean, vertical: boolean) => {
    if (!inspectedItem) return;
    setIsProcessingEdit(true);
    const currentUrl = editPreviewUrl || inspectedItem.dataUrl;
    const res = await flipImageDataUrl(currentUrl, horizontal, vertical);
    setEditPreviewUrl(res);
    setIsProcessingEdit(false);
    showToast(horizontal ? 'Flipped Horizontally' : 'Flipped Vertically');
  };

  const handleRotate = async (degrees: 90 | 180 | 270) => {
    if (!inspectedItem) return;
    setIsProcessingEdit(true);
    const currentUrl = editPreviewUrl || inspectedItem.dataUrl;
    const res = await rotateImageDataUrl(currentUrl, degrees);
    setEditPreviewUrl(res);
    setIsProcessingEdit(false);
    showToast(`Rotated ${degrees}°`);
  };

  const handleInvert = async () => {
    if (!inspectedItem) return;
    setIsProcessingEdit(true);
    const currentUrl = editPreviewUrl || inspectedItem.dataUrl;
    const res = await invertImageDataUrl(currentUrl);
    setEditPreviewUrl(res);
    setIsProcessingEdit(false);
    showToast('Inverted Colors');
  };

  const handleRemoveKeyColor = async () => {
    if (!inspectedItem) return;
    setIsProcessingEdit(true);
    const currentUrl = editPreviewUrl || inspectedItem.dataUrl;
    const res = await removeColorKeyBackground(currentUrl, keyColor, colorTolerance);
    setEditPreviewUrl(res);
    setIsProcessingEdit(false);
    showToast(`Removed background color ${keyColor}`);
  };

  const handleSaveInspectorChanges = (saveAsCopy: boolean = false) => {
    if (!inspectedItem || !editPreviewUrl) {
      setInspectedItem(null);
      return;
    }

    if (saveAsCopy) {
      const cloned: BackpackItem = {
        ...inspectedItem,
        id: crypto.randomUUID(),
        name: `${inspectedItem.name || 'Item'}_Edited`,
        dataUrl: editPreviewUrl,
        createdAt: Date.now()
      };
      onImportItems([cloned, ...items]);
      showToast(`Saved as new item "${cloned.name}"`);
    } else {
      onUpdateItem(inspectedItem.id, {
        dataUrl: editPreviewUrl,
        width: inspectorDimensions?.width,
        height: inspectorDimensions?.height
      });
      showToast(`Updated "${inspectedItem.name}"`);
    }

    setInspectedItem(null);
    setEditPreviewUrl(null);
  };

  // Filtering & Sorting
  const getFilteredBackpackList = () => {
    let list = items.filter(item => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (item.name && item.name.toLowerCase().includes(q)) || (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));
      if (!matchesSearch) return false;

      // Category match
      if (activeCategory === 'favorites') return !!item.isFavorite;
      if (activeCategory === 'uncategorized') return !item.category || item.category === 'uncategorized';
      if (activeCategory !== 'all') return item.category === activeCategory;
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortOrder === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortOrder === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortOrder === 'alpha-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortOrder === 'alpha-desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    return list;
  };

  const filteredItems = getFilteredBackpackList();

  const categoriesList: { id: CategoryFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All Items', icon: '🎒' },
    { id: 'favorites', label: 'Favorites', icon: '⭐' },
    { id: 'mouths', label: 'Lip Sync Mouths', icon: '👄' },
    { id: 'faces', label: 'Faces & Expressions', icon: '👀' },
    { id: 'vfx', label: 'VFX & Action', icon: '💥' },
    { id: 'bubbles', label: 'Bubbles & UI', icon: '💬' },
    { id: 'characters', label: 'Characters', icon: '🏃' },
    { id: 'uncategorized', label: 'Unsorted', icon: '📁' }
  ];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] max-h-[850px] border border-white/15 text-gray-200 overflow-hidden relative">

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border border-amber-300 flex items-center gap-1.5">
            <Icons.Check size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={jsonFileInputRef} 
          onChange={handleImportJSON} 
          accept=".json" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={imageFilesInputRef} 
          onChange={handleImportImageFiles} 
          accept="image/*" 
          multiple 
          className="hidden" 
        />

        {/* Modal Top Header */}
        <div className="p-3 sm:p-4 bg-[#1f1f24] flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 flex items-center justify-center">
              <Icons.Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Animation Backpack
                </h2>
                <span className="text-xs bg-white/10 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                  {items.length} stamps
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Stash reusable character parts, mouth shapes, expressions, and VFX to stamp onto any frame or project.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Floating Dock Toggle */}
            {onToggleQuickDock && (
              <button
                onClick={onToggleQuickDock}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                  isQuickDockOpen 
                    ? 'bg-amber-500 text-black border-amber-400 font-bold' 
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Floating Quick Dock on Canvas"
              >
                <Icons.Layers size={14} />
                <span className="hidden md:inline">Quick Stamp Dock</span>
              </button>
            )}

            {/* Paste from Clipboard */}
            <button
              onClick={handlePasteFromClipboard}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="Paste image from clipboard directly to Backpack"
            >
              <Icons.Clipboard size={16} />
            </button>

            {/* Import Images */}
            <button
              onClick={() => imageFilesInputRef.current?.click()}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="Upload PNG / JPG / SVG Images into Backpack"
            >
              <Icons.ImagePlus size={16} />
            </button>

            {/* Import JSON */}
            <button 
              onClick={() => jsonFileInputRef.current?.click()}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="Import JSON Backpack Backup"
            >
              <Icons.Upload size={16} />
            </button>

            {/* Export JSON */}
            <button 
              onClick={handleExportJSON}
              disabled={items.length === 0}
              className={`p-2 rounded-xl border border-white/10 transition-colors ${
                items.length === 0 
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
              }`}
              title="Export Full Backpack JSON Backup"
            >
              <Icons.FileJson size={16} />
            </button>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Action Bar: Quick Capture & Search */}
        <div className="p-3 bg-[#1c1c21] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Quick Capture Options */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                handleClose();
                onStartSelecting();
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
              title="Select marquee region on canvas to stash into Backpack"
            >
              <Icons.MousePointer2 size={14} />
              <span>Capture Selection</span>
            </button>

            {onPackCurrentLayer && (
              <button
                onClick={() => {
                  onPackCurrentLayer();
                  showToast('Packed active drawing layer!');
                }}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Stash entire active layer of current frame directly into Backpack"
              >
                <Icons.Layers size={13} className="text-amber-400" />
                <span>Pack Active Layer</span>
              </button>
            )}

            {onPackCurrentFrame && (
              <button
                onClick={() => {
                  onPackCurrentFrame();
                  showToast('Packed full flattened frame!');
                }}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Flatten visible layers of current frame and stash as stamp"
              >
                <Icons.Image size={13} className="text-emerald-400" />
                <span>Pack Full Frame</span>
              </button>
            )}
          </div>

          {/* Search, Sort & Batch controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stamps..."
                className="w-36 sm:w-48 bg-black/40 border border-white/10 rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
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

            {/* Sort Selector */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-amber-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha-asc">Name (A-Z)</option>
              <option value="alpha-desc">Name (Z-A)</option>
            </select>

            {/* Batch Selection Toggle */}
            {items.length > 0 && (
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedItemIds(new Set());
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border ${
                  isSelectionMode
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Icons.CheckSquare size={13} />
                <span>{isSelectionMode ? 'Cancel' : 'Select'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="px-3 py-2 bg-[#151518] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {categoriesList.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Batch Actions Floating Strip */}
        {isSelectionMode && (
          <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between shrink-0 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-xs text-amber-300 font-bold hover:underline"
              >
                {selectedItemIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-gray-300">
                {selectedItemIds.size} of {filteredItems.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchExportZip}
                disabled={selectedItemIds.size === 0}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  selectedItemIds.size === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                <Icons.Download size={13} />
                <span>Export ZIP</span>
              </button>

              <button
                onClick={handleBatchDelete}
                disabled={selectedItemIds.size === 0}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  selectedItemIds.size === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-500'
                }`}
              >
                <Icons.Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-black/20 p-8">
                <div className="p-4 bg-amber-500/10 rounded-full text-amber-400 mb-3">
                  <Icons.Briefcase size={36} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {searchQuery ? 'No matching stamps found' : 'Your Backpack is empty'}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                  Capture selections from canvas, pack layers, paste images, or import images directly into your backpack.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleClose();
                      onStartSelecting();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <Icons.MousePointer2 size={14} />
                    <span>Capture Canvas Area</span>
                  </button>
                  <button
                    onClick={() => imageFilesInputRef.current?.click()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Icons.ImagePlus size={14} className="text-amber-400" />
                    <span>Upload Images</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {filteredItems.map(item => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`group bg-[#202025] rounded-2xl border flex flex-col transition-all shadow-md relative overflow-hidden ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/30'
                            : 'border-white/10 hover:border-amber-400/60'
                        }`}
                      >
                        {/* Image Preview Canvas Area */}
                        <div
                          className="aspect-square bg-[#292930] rounded-t-xl flex items-center justify-center p-3 relative cursor-pointer overflow-hidden bg-[radial-gradient(#3a3a44_1px,transparent_1px)] [background-size:8px_8px]"
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleItemSelection(item.id);
                            } else {
                              onSelectItem(item);
                              handleClose();
                            }
                          }}
                        >
                          <img
                            src={item.dataUrl}
                            alt={item.name || 'Backpack Item'}
                            className="max-w-full max-h-full object-contain pointer-events-none transition-transform group-hover:scale-105"
                          />

                          {/* Top Badges (Favorite & Category) */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <button
                              onClick={(e) => handleToggleFavorite(item, e)}
                              className={`p-1 rounded-full text-xs transition-transform hover:scale-125 ${
                                item.isFavorite ? 'text-amber-400' : 'text-gray-500 hover:text-amber-300'
                              }`}
                              title={item.isFavorite ? 'Favorited' : 'Add to Favorites'}
                            >
                              {item.isFavorite ? '★' : '☆'}
                            </button>
                            {item.category && item.category !== 'uncategorized' && (
                              <span className="text-[9px] bg-black/60 backdrop-blur-sm text-gray-300 font-bold px-1.5 py-0.2 rounded-md">
                                {item.category}
                              </span>
                            )}
                          </div>

                          {/* Selection Checkbox in Selection Mode */}
                          {isSelectionMode && (
                            <div className="absolute top-2 right-2">
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-amber-500 border-amber-500' : 'bg-black/60 border-white/50'
                              }`}>
                                {isSelected && <Icons.Check size={12} className="text-black font-bold" />}
                              </div>
                            </div>
                          )}

                          {/* Hover Action Overlay */}
                          {!isSelectionMode && (
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              {/* Top Action Icons */}
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedItem(item);
                                    setEditPreviewUrl(null);
                                  }}
                                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                                  title="Inspect & Edit Image Studio (Crop, Invert, Rotate, Keying)"
                                >
                                  <Icons.Edit3 size={13} />
                                </button>
                                <button
                                  onClick={(e) => handleDuplicateItem(item, e)}
                                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                                  title="Duplicate Item"
                                >
                                  <Icons.Copy size={13} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(item.id);
                                    showToast('Item deleted');
                                  }}
                                  className="p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                                  title="Delete Item"
                                >
                                  <Icons.Trash2 size={13} />
                                </button>
                              </div>

                              {/* Center / Bottom Placement Options */}
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectItem(item);
                                    handleClose();
                                  }}
                                  className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold rounded-lg shadow transition-all"
                                  title="Transform & Place on Canvas"
                                >
                                  Transform & Stamp
                                </button>

                                <div className="grid grid-cols-2 gap-1">
                                  {onStampOnLayer && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStampOnLayer(item);
                                        showToast('Stamped directly on active layer');
                                      }}
                                      className="py-0.5 bg-white/20 hover:bg-white/30 text-white text-[10px] rounded font-medium"
                                      title="Paint onto current active layer without transform"
                                    >
                                      Direct Stamp
                                    </button>
                                  )}
                                  {onPlaceAsNewLayer && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPlaceAsNewLayer(item);
                                        showToast('Created new layer with stamp');
                                      }}
                                      className="py-0.5 bg-white/20 hover:bg-white/30 text-white text-[10px] rounded font-medium"
                                      title="Create new layer with this stamp"
                                    >
                                      New Layer
                                    </button>
                                  )}
                                </div>

                                {onSetAsBackground && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSetAsBackground(item);
                                      showToast('Set as Canvas Background');
                                    }}
                                    className="w-full py-0.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[9px] rounded font-medium"
                                    title="Set as Canvas Background Image"
                                  >
                                    Set as Background
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Item Metadata & Inline Rename */}
                        <div className="p-2 bg-[#19191d] border-t border-white/10 flex flex-col gap-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveItemName(item.id);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onBlur={() => handleSaveItemName(item.id)}
                                className="w-full bg-black text-xs text-white px-1.5 py-0.5 rounded border border-amber-500 outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveItemName(item.id)}
                                className="text-amber-400 hover:text-amber-300"
                              >
                                <Icons.Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs">
                              <span
                                onDoubleClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingName(item.name || '');
                                }}
                                className="font-bold text-white truncate max-w-[110px] cursor-pointer"
                                title="Double-click to rename"
                              >
                                {item.name || 'Unnamed Stamp'}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingName(item.name || '');
                                }}
                                className="text-gray-500 hover:text-white"
                                title="Rename"
                              >
                                <Icons.Edit2 size={11} />
                              </button>
                            </div>
                          )}

                          {/* Category Tag Selector */}
                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <select
                              value={item.category || 'uncategorized'}
                              onChange={(e) => handleChangeCategory(item, e.target.value)}
                              className="bg-black/30 border border-white/5 rounded px-1 py-0.5 text-gray-400 hover:text-white focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="characters">Character</option>
                              <option value="props">Prop</option>
                              <option value="mouths">Mouth (LipSync)</option>
                              <option value="faces">Face / Eye</option>
                              <option value="vfx">VFX</option>
                              <option value="bubbles">Bubble</option>
                              <option value="uncategorized">Uncategorized</option>
                            </select>

                            {onConvertToActor && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConvertToActor(item);
                                  showToast('Converted stamp to Symbol Actor!');
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                                title="Turn into interactive Actor / Symbol"
                              >
                                +Symbol
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>

        {/* IMAGE STUDIO INSPECTOR & CROPPING MODAL */}
        {inspectedItem && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in">
            {/* Inspector Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Icons.Edit3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Edit Stamp Studio: {inspectedItem.name || 'Backpack Item'}
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {inspectorDimensions ? `${inspectorDimensions.width} × ${inspectorDimensions.height} px` : 'Processing...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveInspectorChanges(false)}
                  disabled={isProcessingEdit || !editPreviewUrl}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow ${
                    !editPreviewUrl 
                      ? 'bg-white/10 text-gray-400 cursor-not-allowed' 
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  <Icons.Check size={14} />
                  <span>Save Changes</span>
                </button>

                <button
                  onClick={() => handleSaveInspectorChanges(true)}
                  disabled={isProcessingEdit || !editPreviewUrl}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 ${
                    !editPreviewUrl 
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Icons.Copy size={13} />
                  <span>Save as Copy</span>
                </button>

                <button
                  onClick={() => {
                    setInspectedItem(null);
                    setEditPreviewUrl(null);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                >
                  <Icons.X size={18} />
                </button>
              </div>
            </div>

            {/* Inspector Middle Body */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 py-4 min-h-0 overflow-y-auto">
              
              {/* Preview Stage */}
              <div className="md:col-span-2 bg-[#222228] border border-white/10 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(#3a3a44_1px,transparent_1px)] [background-size:12px_12px]">
                <img
                  src={editPreviewUrl || inspectedItem.dataUrl}
                  alt="Inspection"
                  className="max-w-full max-h-[450px] object-contain drop-shadow-2xl transition-all"
                />

                {isProcessingEdit && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-amber-400 gap-2 font-bold text-xs">
                    <Icons.RefreshCw size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {/* Editing Controls Palette */}
              <div className="bg-[#1b1b20] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto">
                
                {/* 1. Smart Cropping & Margins */}
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Icons.Crop size={14} className="text-amber-400" />
                    <span>Bounds & Framing</span>
                  </h4>
                  <button
                    onClick={handleAutoTrim}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/30 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icons.Scissors size={14} />
                    <span>Auto-Trim Transparent Margins</span>
                  </button>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Crops empty space around the drawing automatically.
                  </p>
                </div>

                {/* 2. Orientation & Transforms */}
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Icons.RotateCw size={14} className="text-amber-400" />
                    <span>Flip & Rotate</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFlip(true, false)}
                      className="py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Icons.FlipHorizontal size={13} />
                      <span>Flip X</span>
                    </button>
                    <button
                      onClick={() => handleFlip(false, true)}
                      className="py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Icons.FlipVertical size={13} />
                      <span>Flip Y</span>
                    </button>
                    <button
                      onClick={() => handleRotate(90)}
                      className="py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Icons.RotateCw size={13} />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      onClick={() => handleRotate(180)}
                      className="py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Icons.RefreshCw size={13} />
                      <span>Rotate 180°</span>
                    </button>
                  </div>
                </div>

                {/* 3. Lineart & Color Filters */}
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Icons.Palette size={14} className="text-amber-400" />
                    <span>Lineart & Colors</span>
                  </h4>
                  <button
                    onClick={handleInvert}
                    className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Icons.Sun size={13} />
                    <span>Invert Colors (Dark/Light Lineart)</span>
                  </button>
                </div>

                {/* 4. Magic Wand / Remove Background Color */}
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Icons.Wand2 size={14} className="text-amber-400" />
                    <span>Remove Solid Background</span>
                  </h4>
                  <div className="space-y-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Target Color:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={keyColor}
                          onChange={(e) => setKeyColor(e.target.value)}
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-[11px] text-gray-300">{keyColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Tolerance:</span>
                        <span>{colorTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={colorTolerance}
                        onChange={(e) => setColorTolerance(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <button
                      onClick={handleRemoveKeyColor}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"
                    >
                      <Icons.Eraser size={13} />
                      <span>Remove Color</span>
                    </button>
                  </div>
                </div>

                {/* Reset preview */}
                {editPreviewUrl && (
                  <button
                    onClick={() => {
                      setEditPreviewUrl(null);
                      showToast('Reverted to original image');
                    }}
                    className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs"
                  >
                    Revert to Original
                  </button>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
