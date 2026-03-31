import React, { useState } from 'react';
import { Icons } from '../Icons';
import { BackpackItem } from '../types';

interface BackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BackpackItem[];
  onSelectItem: (item: BackpackItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, name: string) => void;
  onStartSelecting: () => void;
  onImportItems: (items: BackpackItem[]) => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onDeleteItem,
  onUpdateItem,
  onStartSelecting,
  onImportItems
}) => {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsDeleteMode(false);
    setEditingItemId(null);
    onClose();
  };

  const handleSaveName = (id: string) => {
    onUpdateItem(id, editingName);
    setEditingItemId(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipanim-backpack-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedItems = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedItems)) {
          // Basic validation: check if items have required properties
          const validItems = importedItems.filter(item => item.id && item.dataUrl);
          if (validItems.length > 0) {
            if (confirm(`Import ${validItems.length} items? This will add them to your current backpack.`)) {
              onImportItems([...items, ...validItems]);
            }
          } else {
            alert('No valid items found in the JSON file.');
          }
        } else {
          alert('Invalid JSON format. Expected an array of items.');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] border border-gray-700 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icons.Briefcase size={24} />
            Backpack
          </h2>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
              title="Import JSON"
            >
              <Icons.Upload size={18} />
            </button>
            <button 
              onClick={handleExport}
              disabled={items.length === 0}
              className={`p-2 rounded-lg transition-colors ${items.length === 0 ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'}`}
              title="Export JSON"
            >
              <Icons.Download size={18} />
            </button>
            <div className="w-px h-6 bg-gray-700 mx-1" />
            {items.length > 0 && (
              <button 
                onClick={() => setIsDeleteMode(!isDeleteMode)} 
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isDeleteMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                <Icons.Trash2 size={16} />
                {isDeleteMode ? 'Done' : 'Delete Items'}
              </button>
            )}
            <button onClick={handleClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <button 
              onClick={onStartSelecting}
              className="w-full py-3 px-4 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity"
            >
              <Icons.MousePointer2 size={18} />
              Select An Object
            </button>
            <p className="text-sm text-gray-400 text-center mt-2">
              Select an area on the canvas to save it to your backpack.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
              <Icons.Briefcase size={48} className="mb-4 opacity-20" />
              <p>Your backpack is empty.</p>
              <p className="text-sm mt-1">Save selections to reuse them later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className={`relative group bg-[#252525] rounded-lg border overflow-hidden flex flex-col transition-all ${isDeleteMode ? 'border-red-500/50 hover:border-red-500' : 'border-gray-700 hover:border-[var(--accent-color)]'}`}
                >
                  <div 
                    className="flex-1 flex items-center justify-center p-2 cursor-pointer"
                    onClick={() => {
                      if (isDeleteMode) {
                        onDeleteItem(item.id);
                        if (items.length === 1) setIsDeleteMode(false);
                      } else {
                        onSelectItem(item);
                      }
                    }}
                  >
                    <img src={item.dataUrl} alt="Saved item" className={`max-w-full max-h-full object-contain transition-opacity ${isDeleteMode ? 'opacity-50 group-hover:opacity-30' : ''}`} />
                    
                    {isDeleteMode ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-3 bg-red-500 text-white rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                          <Icons.Trash2 size={24} />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-3 bg-[var(--accent-color)] text-white rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Icons.Check size={24} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 bg-[#1a1a1a] border-t border-gray-700 flex items-center gap-2">
                    {editingItemId === item.id ? (
                      <>
                        <input 
                          type="text" 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 bg-black text-sm p-1 rounded border border-gray-600 focus:border-[var(--accent-color)] outline-none"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(item.id); }}
                        />
                        <button 
                          onClick={() => handleSaveName(item.id)} 
                          className="p-2 -m-1 text-[var(--accent-color)] hover:opacity-80 transition-opacity"
                          title="Save"
                        >
                          <Icons.Check size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs text-gray-300 truncate">{item.name || 'Unnamed'}</span>
                        <button 
                          onClick={() => { setEditingItemId(item.id); setEditingName(item.name || ''); }} 
                          className="p-2 -m-1 text-gray-500 hover:text-white transition-colors"
                          title="Rename"
                        >
                          <Icons.Settings size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
