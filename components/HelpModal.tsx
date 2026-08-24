import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTutorial?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onOpenTutorial }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-[#1e1e1e] w-[600px] max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#252525]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icons.Help className="text-[#FF3B30]" />
            {t('help.title')}
          </h2>
          <div className="flex items-center gap-2">
            {onOpenTutorial && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-[var(--accent-color)] to-orange-500 hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              >
                <Icons.GraduationCap size={15} />
                <span>Open Tutorial</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
              <Icons.X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 no-scrollbar">
            {/* Interactive Tutorial Promo Banner */}
            {onOpenTutorial && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-800/80 border border-gray-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-color)]/20 text-[var(--accent-color)] flex items-center justify-center shrink-0">
                    <Icons.GraduationCap size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Interactive Animation Tutorial</h4>
                    <p className="text-[11px] text-gray-400">Step-by-step interactive lessons with live canvas simulations.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenTutorial();
                  }}
                  className="px-3.5 py-1.5 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow"
                >
                  Start Tutorial
                </button>
              </div>
            )}
            
            {/* Tools Section */}
            <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">{t('help.tools')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ShortcutItem icon={Icons.Pencil} label={t('toolbar.brush')} k="B" />
                    <ShortcutItem icon={Icons.Eraser} label={t('toolbar.eraser')} k="E" />
                    <ShortcutItem icon={Icons.PaintBucket} label={t('toolbar.fill')} k="G" />
                    <ShortcutItem icon={Icons.MousePointer2} label={t('toolbar.select')} k="V" />
                    <ShortcutItem icon={Icons.Lasso} label={t('toolbar.lasso')} k="L" />
                    <ShortcutItem icon={Icons.Wand2} label={t('toolbar.wand')} k="W" />
                    <ShortcutItem icon={Icons.Square} label={t('toolbar.shapes')} k="U" />
                    <ShortcutItem icon={Icons.Type} label={t('toolbar.text')} k="T" />
                </div>
            </section>

            {/* Canvas Control */}
            <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">{t('help.canvas')}</h3>
                <div className="space-y-3">
                    <KeyRow label={t('help.pan')} value={t('help.rightClickDrag')} />
                    <KeyRow label={t('help.zoom')} value={t('help.ctrlScrollPinch')} />
                    <KeyRow label={t('help.playPause')} value={t('help.spacebar')} />
                    <KeyRow label={t('help.nextPrev')} value={t('help.arrowKeys')} />
                    <KeyRow label={t('help.toggleGrid')} value="G" />
                </div>
            </section>

            {/* General Actions */}
             <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">{t('help.actions')}</h3>
                <div className="space-y-3">
                    <KeyRow label={t('help.undo')} value={`${t('keys.ctrl')} + Z`} />
                    <KeyRow label={t('help.redo')} value={`${t('keys.ctrl')} + ${t('keys.shift')} + Z`} />
                    <KeyRow label={t('help.copy')} value={`${t('keys.ctrl')} + C`} />
                    <KeyRow label={t('help.paste')} value={`${t('keys.ctrl')} + V`} />
                    <KeyRow label={t('help.delete')} value={t('help.delBackspace')} />
                    <KeyRow label={t('help.save')} value={`${t('keys.ctrl')} + S`} />
                    <KeyRow label={t('help.export')} value={`${t('keys.ctrl')} + ${t('keys.shift')} + E`} />
                </div>
            </section>

             {/* Features Guide */}
             <section>
                <h3 className="text-[#FF3B30] font-bold uppercase tracking-wider text-sm mb-4 border-b border-gray-700 pb-2">{t('help.howTo')}</h3>
                <div className="space-y-4 text-sm text-gray-300">
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Wand2 size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.magicWandTitle')}</p>
                            <p className="text-gray-400">
                                {t('help.magicWandDesc')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Image size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.importImageTitle')}</p>
                            <p className="text-gray-400">{t('help.importImageDesc')}</p>
                        </div>
                    </div>
                     <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Music size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.addAudioTitle')}</p>
                            <p className="text-gray-400">{t('help.addAudioDesc')}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.FolderDown size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.projectFileTitle')}</p>
                            <p className="text-gray-400">{t('help.projectFileDesc')}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.FileVideo size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.importVideoTitle')}</p>
                            <p className="text-gray-400">{t('help.importVideoDesc')}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg h-fit"><Icons.Music size={20} /></div>
                        <div>
                            <p className="font-bold text-white">{t('help.soundLibraryTitle')}</p>
                            <p className="text-gray-400">{t('help.soundLibraryDesc')}</p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
        
        <div className="p-6 border-t border-gray-700 bg-[#252525] text-center">
            <button onClick={onClose} className="w-full py-3 bg-[#FF3B30] text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
                {t('help.gotIt')}
            </button>
        </div>
      </div>
    </div>
  );
};

const ShortcutItem = ({ icon: Icon, label, k }: { icon: any, label: string, k: string }) => (
    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700">
        <Icon size={20} className="text-gray-400" />
        <div className="flex-1">
            <div className="font-bold text-white text-sm">{label}</div>
        </div>
        <kbd className="bg-black/50 px-2 py-1 rounded text-xs font-mono text-gray-300 font-bold min-w-[24px] text-center border border-gray-600">
            {k}
        </kbd>
    </div>
);

const KeyRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center border-b border-gray-800 last:border-0 pb-2 last:pb-0">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        <span className="text-xs font-mono text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-1 rounded border border-[#FF3B30]/20">
            {value}
        </span>
    </div>
);