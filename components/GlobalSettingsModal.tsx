import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { Shortcuts } from '../types';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  uiFont: string;
  setUiFont: (font: string) => void;
  shortcuts: Shortcuts;
  setShortcuts: (shortcuts: Shortcuts) => void;
  deviceType: 'mobile' | 'pc' | null;
  setDeviceType: (type: 'mobile' | 'pc') => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  accentColor,
  setAccentColor,
  uiFont,
  setUiFont,
  shortcuts,
  setShortcuts,
  deviceType,
  setDeviceType
}) => {
  const { t, i18n } = useTranslation();
  const [recordingKey, setRecordingKey] = useState<keyof Shortcuts | null>(null);

  if (!isOpen) return null;

  const languages = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Italiano', value: 'it' },
    { label: 'Português', value: 'pt' },
    { label: '日本語', value: 'ja' },
    { label: '中文', value: 'zh' },
    { label: '한국어', value: 'ko' },
    { label: 'Русский', value: 'ru' },
    { label: 'العربية', value: 'ar' },
  ];

  const colors = [
    '#FF3B30', // Default Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FF2D55', // Pink
    '#00C7BE', // Teal
    '#FFCC00', // Yellow
  ];

  const fonts = [
    { label: t('globalSettings.systemDefault'), value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { label: t('globalSettings.monospace'), value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
    { label: t('globalSettings.serif'), value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
    { label: t('globalSettings.round'), value: '"Varela Round", "Nunito", "Arial Rounded MT Bold", sans-serif' },
  ];

  const shortcutLabels: Record<keyof Shortcuts, string> = {
    selectTool: t('toolbar.select'),
    lassoTool: t('toolbar.lasso'),
    wandTool: t('toolbar.wand'),
    penTool: t('toolbar.brush'),
    eraserTool: t('toolbar.eraser'),
    fillTool: t('toolbar.fill'),
    shapeTool: t('toolbar.shapes'),
    textTool: t('toolbar.text'),
    playPause: t('timeline.play'),
    nextFrame: t('timeline.nextFrame'),
    prevFrame: t('timeline.prevFrame'),
    addFrame: t('timeline.addFrame'),
    deleteFrame: t('timeline.deleteFrame'),
    undo: t('common.undo'),
    redo: t('common.redo'),
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: keyof Shortcuts) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setRecordingKey(null);
      return;
    }

    let keyStr = e.key;
    if (keyStr === ' ') keyStr = 'Space';
    if (keyStr.length === 1) keyStr = keyStr.toLowerCase();

    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const finalKey = [...modifiers, keyStr].join('+');
    
    setShortcuts({ ...shortcuts, [key]: finalKey });
    setRecordingKey(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="bg-[#1e1e1e] w-[500px] max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#252525] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Settings className="text-[var(--accent-color)]" />
            {t('globalSettings.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1 no-scrollbar">
          {/* Language Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('globalSettings.language')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => i18n.changeLanguage(lang.value)}
                  className={`p-2 rounded-xl text-sm transition-colors flex items-center justify-between ${i18n.language === lang.value ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  <span>{lang.label}</span>
                  {i18n.language === lang.value && <Icons.Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('globalSettings.accentColor')}</label>
            <div className="grid grid-cols-8 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`w-full aspect-square rounded-full border-2 flex items-center justify-center transition-all ${accentColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                >
                  {accentColor === c && <Icons.Check size={14} className="text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* Device Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('globalSettings.deviceOptimization')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeviceType('mobile')}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${deviceType === 'mobile' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <Icons.Smartphone size={20} />
                <span className="text-sm font-medium">{t('globalSettings.mobile')}</span>
                {deviceType === 'mobile' && <Icons.Check size={16} className="ml-auto" />}
              </button>
              <button
                onClick={() => setDeviceType('pc')}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${deviceType === 'pc' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <Icons.Monitor size={20} />
                <span className="text-sm font-medium">{t('globalSettings.pc')}</span>
                {deviceType === 'pc' && <Icons.Check size={16} className="ml-auto" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-500 italic">{t('globalSettings.mobileDesc')}</p>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* UI Font */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('globalSettings.appFont')}</label>
            <div className="grid grid-cols-2 gap-2">
              {fonts.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setUiFont(f.value)}
                  className={`w-full p-3 rounded-xl text-left transition-colors flex justify-between items-center ${uiFont === f.value ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  style={{ fontFamily: f.value }}
                >
                  <span className="text-sm">{f.label}</span>
                  {uiFont === f.value && <Icons.Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-gray-700" />

          {/* Shortcuts */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('globalSettings.shortcuts')}</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(Object.keys(shortcutLabels) as Array<keyof Shortcuts>).map((key) => (
                <div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                  <span className="text-sm text-gray-300">{shortcutLabels[key]}</span>
                  <button
                    onClick={() => setRecordingKey(key)}
                    onKeyDown={(e) => recordingKey === key ? handleKeyDown(e, key) : undefined}
                    onBlur={() => setRecordingKey(null)}
                    className={`min-w-[60px] px-2 py-1 rounded text-xs font-mono text-center transition-colors ${
                      recordingKey === key 
                        ? 'bg-[var(--accent-color)] text-white animate-pulse' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {recordingKey === key ? t('globalSettings.pressKeys') : shortcuts[key]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-[#252525] shrink-0">
            <button 
                onClick={onClose}
                className="w-full py-3 bg-[var(--accent-color)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
                {t('common.done')}
            </button>
        </div>

      </div>
    </div>
  );
};