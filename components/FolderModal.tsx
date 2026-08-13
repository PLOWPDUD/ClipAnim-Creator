import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

const FOLDER_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#A2845E', // Brown
  '#8E8E93', // Gray
];

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  initialName?: string;
  initialColor?: string;
  isEditing?: boolean;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialColor = '#007AFF',
  isEditing = false,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setColor(initialColor || '#007AFF');
    }
  }, [isOpen, initialName, initialColor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-gray-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: `${color}25`, color }}
            >
              <Icons.FolderPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? t('folders.editFolder', 'Edit Folder') : t('folders.newFolder', 'Create New Folder')}
              </h2>
              <p className="text-xs text-gray-400">
                {t('folders.folderDesc', 'Group your animations and paintings together')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t('folders.folderName', 'Folder Name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('folders.namePlaceholder', 'e.g. Character Sketches, Ep 1')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-[var(--accent-color)] transition-colors"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t('folders.folderColor', 'Folder Theme Color')}
            </label>
            <div className="flex flex-wrap gap-2.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all transform hover:scale-110 flex items-center justify-center border-2 ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Icons.Check size={14} className="text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 transition-all shadow-lg flex items-center gap-2"
            >
              <Icons.Check size={16} />
              <span>{isEditing ? t('common.save', 'Save Changes') : t('folders.create', 'Create Folder')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
