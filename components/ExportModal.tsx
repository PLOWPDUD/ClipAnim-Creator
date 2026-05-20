import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-seq' | 'png' | 'avi' | 'project-zip';
export type ExportQuality = 'low' | 'medium' | 'high';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, quality: ExportQuality, transparent: boolean) => void;
  onCancel: () => void;
  isExporting: boolean;
  progress: number;
  projectName: string;
  setProjectName: (name: string) => void;
  projectType?: 'animation' | 'painting';
  frameCount: number;
  fps: number;
  exportedFile?: { url: string, name: string, blob: Blob } | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onCancel,
  isExporting, 
  progress,
  projectName,
  setProjectName,
  projectType = 'animation',
  frameCount,
  fps,
  exportedFile
}) => {
  const { t } = useTranslation();
  const [quality, setQuality] = React.useState<ExportQuality>('medium');
  const [transparent, setTransparent] = React.useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!exportedFile) return;
    const a = document.createElement('a');
    a.href = exportedFile.url;
    a.download = exportedFile.name;
    a.click();
  };

  const handleShare = async () => {
    if (!exportedFile) return;

    // 1. Try Median.co / GoNative Bridge (for Android/iOS native apps)
    const median = (window as any).median || (window as any).gonative;
    if (median?.share?.file) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Median expects base64 string without the data:mime;base64, prefix
          const base64 = base64data.split(',')[1];
          median.share.file({
            base64: base64,
            filename: exportedFile.name
          });
        };
        reader.readAsDataURL(exportedFile.blob);
        return;
      } catch (e) {
        console.error("Median share failed:", e);
      }
    }

    // 2. Try Web Share API
    try {
      if (navigator.share) {
        const file = new File([exportedFile.blob], exportedFile.name, { type: exportedFile.blob.type });
        
        // Check if sharing files is supported specifically
        const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
        
        if (canShareFiles) {
          await navigator.share({
            title: t('export.shareTitle'),
            text: t('export.shareTextDefault'),
            files: [file]
          });
        } else {
          // Fallback to sharing just text/url if files aren't supported but share API exists
          await navigator.share({
            title: t('export.shareTitle'),
            text: t('export.shareTextWithName', { name: projectName }),
            url: window.location.href
          });
        }
      } else {
        alert(t('export.shareNotSupported'));
      }
    } catch (e) {
      // Don't alert on user cancellation
      if ((e as Error).name === 'AbortError' || (e as Error).name === 'NotAllowedError') {
        return;
      }
      console.error("Share failed:", e);
      alert(t('export.shareFailed'));
    }
  };

  const allFormats: { id: ExportFormat; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { id: 'mp4', label: t('export.mp4'), icon: Icons.FileVideo, color: 'text-blue-400', desc: t('export.mp4Desc') },
    { id: 'webm', label: t('export.webm'), icon: Icons.FileVideo, color: 'text-emerald-400', desc: t('export.webmDesc') },
    { id: 'gif', label: t('export.gif'), icon: Icons.Image, color: 'text-amber-400', desc: t('export.gifDesc') },
    { id: 'png-seq', label: t('export.pngSeq'), icon: Icons.FileArchive, color: 'text-rose-400', desc: t('export.pngSeqDesc') },
    { id: 'png', label: t('export.png', 'PNG Image'), icon: Icons.Image, color: 'text-purple-400', desc: t('export.pngDesc', 'Export a static PNG image') },
    { id: 'project-zip', label: t('export.projectZip'), icon: Icons.FileArchive, color: 'text-purple-400', desc: t('export.projectZipDesc') },
    { id: 'avi', label: t('export.avi'), icon: Icons.FileVideo, color: 'text-indigo-400', desc: t('export.aviDesc') },
  ];

  const formats = projectType === 'painting' 
    ? allFormats.filter(f => f.id === 'png') 
    : allFormats.filter(f => f.id !== 'png');

  const qualityOptions: { id: ExportQuality; label: string; desc: string }[] = [
    { id: 'low', label: t('export.low'), desc: t('export.lowDesc') },
    { id: 'medium', label: t('export.medium'), desc: t('export.mediumDesc') },
    { id: 'high', label: t('export.high'), desc: t('export.highDesc') },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-[720px] max-w-[95vw] max-h-[90vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden relative">
        
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e]/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-[#FF3B30] animate-spin mb-6" />
             <h2 className="text-2xl font-bold mb-2">{t('export.rendering')}</h2>
             <p className="text-gray-400 mb-6">{t('export.renderingDesc')}</p>
             <div className="w-full max-w-md bg-gray-800 h-3 rounded-full overflow-hidden mb-2">
                <div 
                    className="h-full bg-[#FF3B30] transition-all duration-300 shadow-[0_0_10px_rgba(255,59,48,0.5)]" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
             <span className="text-xs font-mono text-gray-500 mb-6">{progress}% {t('common.done')}</span>
             <button 
                 onClick={onCancel}
                 className="px-6 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-bold transition-all border border-gray-700"
             >
                 {t('common.cancel')}
             </button>
          </div>
        )}

        {!isExporting && exportedFile && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                 <Icons.Check className="text-emerald-500" size={40} />
             </div>
             <h2 className="text-3xl font-bold mb-2">{t('export.success')}</h2>
             <p className="text-gray-400 mb-8">{t('export.successDesc')}</p>
             
             <div className="flex gap-4">
                 <button 
                     onClick={handleShare}
                     className="px-8 py-4 rounded-2xl bg-[#FF3B30] hover:bg-[#FF453A] text-white font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,48,0.3)] hover:scale-105 active:scale-95"
                 >
                     <Icons.Share2 size={20} />
                     {t('common.share')}
                 </button>
                 <button 
                     onClick={handleDownload}
                     className="px-8 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all flex items-center gap-2 border border-gray-700 hover:scale-105 active:scale-95"
                 >
                     <Icons.Download size={20} />
                     {t('common.download')}
                 </button>
             </div>
             
             <button 
                 onClick={onClose}
                 className="mt-8 px-6 py-2 rounded-full text-gray-500 hover:text-white text-sm font-bold transition-colors"
             >
                 {t('common.close')}
             </button>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* Left Panel: Settings */}
          <div className="w-1/2 p-8 border-r border-gray-700/50 flex flex-col">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{t('export.makeMovie')}</h2>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                  <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="bg-gray-800 text-white rounded px-2 py-1 text-sm font-medium border border-gray-700 hover:border-gray-500 focus:border-[var(--accent-color)] focus:outline-none transition-colors w-full max-w-[200px]"
                  />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">{frameCount} {t('timeline.frames')}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">{(frameCount / fps).toFixed(1)}s</span>
              </div>
            </div>

            <div className="mb-8">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">{t('export.quality')}</label>
                <div className="grid grid-cols-1 gap-3">
                    {qualityOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setQuality(opt.id)}
                            className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                                quality === opt.id 
                                ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-white shadow-[0_0_20px_rgba(255,59,48,0.1)]' 
                                : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${quality === opt.id ? 'border-[var(--accent-color)]' : 'border-gray-600'}`}>
                                {quality === opt.id && <div className="w-2 h-2 rounded-full bg-[var(--accent-color)]" />}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">{opt.label}</div>
                                <div className="text-[10px] opacity-60 leading-tight mt-0.5">{opt.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 border-b border-gray-700/50 pb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${transparent ? 'bg-[#FF3B30]' : 'bg-gray-700'}`}>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${transparent ? 'translate-x-6' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white group-hover:text-gray-300 transition-colors">{t('export.transparent', 'Transparent Background')}</div>
                    <div className="text-[10px] text-gray-500">{t('export.transparentDesc', 'Omit background for formats that support alpha channel (PNG, WebM, GIF)')}</div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                  />
                </label>
            </div>

            <div className="mt-auto pt-4">
                <button 
                    onClick={onClose}
                    className="w-full py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition-all border border-gray-700 hover:border-gray-600 flex items-center justify-center gap-2"
                >
                    <Icons.ChevronLeft size={18} />
                    {t('common.done')}
                </button>
            </div>
          </div>

          {/* Right Panel: Formats */}
          <div className="w-1/2 bg-black/20 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('export.format')}</label>
                <button onClick={onClose} className="text-gray-500 hover:text-white p-3 -mr-2 rounded-full hover:bg-gray-800 transition-colors">
                    <Icons.X size={20} />
                </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-2 no-scrollbar flex-1">
                {formats.map((format) => (
                    <button 
                        key={format.id}
                        onClick={() => onExport(format.id, quality, transparent)}
                        className="w-full group bg-gray-800/40 hover:bg-gray-800 border border-gray-700/30 hover:border-[#FF3B30] p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                    >
                        <div className={`p-3 rounded-xl bg-gray-900 group-hover:scale-110 transition-transform ${format.color}`}>
                            <format.icon size={28} />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-white text-base group-hover:text-[#FF3B30] transition-colors">{format.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{format.desc}</div>
                        </div>
                        <Icons.ChevronLeft size={20} className="text-gray-600 rotate-180 group-hover:text-white transition-colors" />
                    </button>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700/30">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                    {t('export.disclaimer')}
                    <br />
                    <span className="text-gray-500 italic">{t('help.about')}</span>
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
