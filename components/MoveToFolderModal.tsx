import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { ProjectFolder } from '../types';

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  currentFolderId?: string | null;
  folders: ProjectFolder[];
  onMove: (targetFolderId: string | null) => void;
  onCreateNewFolder?: () => void;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  onClose,
  projectName,
  currentFolderId = null,
  folders,
  onMove,
  onCreateNewFolder,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-gray-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Icons.FolderOutput size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('folders.moveToFolder', 'Move to Folder')}
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-[240px]">
                {projectName}
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

        {/* Options List */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] pr-1">
          {/* Root / Main Workspace option */}
          <button
            onClick={() => {
              onMove(null);
              onClose();
            }}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all group ${
              currentFolderId === null || currentFolderId === undefined
                ? 'bg-[var(--accent-color)]/15 border-[var(--accent-color)] text-white font-bold'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icons.Home size={18} className="text-gray-400 group-hover:text-white" />
              <span className="text-sm">{t('folders.rootLocation', 'Home (No Folder)')}</span>
            </div>
            {(currentFolderId === null || currentFolderId === undefined) && (
              <span className="text-xs font-bold text-[var(--accent-color)] bg-[var(--accent-color)]/20 px-2 py-0.5 rounded-full">
                {t('folders.current', 'Current')}
              </span>
            )}
          </button>

          {/* Folder items */}
          {folders.map((folder) => {
            const isSelected = currentFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  onMove(folder.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all group ${
                  isSelected
                    ? 'bg-blue-500/15 border-blue-500 text-white font-bold'
                    : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: `${folder.color || '#007AFF'}25`, color: folder.color || '#007AFF' }}
                  >
                    <Icons.Folder size={16} />
                  </div>
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                {isSelected && (
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                    {t('folders.current', 'Current')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-gray-700/50 flex items-center justify-between">
          {onCreateNewFolder && (
            <button
              onClick={() => {
                onClose();
                onCreateNewFolder();
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 py-2 px-1 transition-colors"
            >
              <Icons.FolderPlus size={16} />
              <span>{t('folders.createNewFolder', '+ Create New Folder')}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
