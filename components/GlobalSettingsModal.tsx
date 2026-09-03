import React, { useState, useMemo } from 'react';
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
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

type GlobalTab = 'appearance' | 'shortcuts' | 'device' | 'language';

const DEFAULT_SHORTCUTS: Shortcuts = {
  selectTool: 'v',
  lassoTool: 'l',
  wandTool: 'w',
  penTool: 'b',
  eraserTool: 'e',
  fillTool: 'g',
  shapeTool: 'u',
  textTool: 't',
  playPause: 'Space',
  nextFrame: '.',
  prevFrame: ',',
  addFrame: 'n',
  deleteFrame: 'Delete',
  undo: 'Ctrl+z',
  redo: 'Ctrl+y',
};

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
  setDeviceType,
  theme,
  setTheme
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<GlobalTab>('appearance');
  const [recordingKey, setRecordingKey] = useState<keyof Shortcuts | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');

  const languages = [
    { label: 'English', native: 'English', value: 'en' },
    { label: 'Spanish', native: 'Español', value: 'es' },
    { label: 'French', native: 'Français', value: 'fr' },
    { label: 'German', native: 'Deutsch', value: 'de' },
    { label: 'Italian', native: 'Italiano', value: 'it' },
    { label: 'Portuguese', native: 'Português', value: 'pt' },
    { label: 'Japanese', native: '日本語', value: 'ja' },
    { label: 'Chinese', native: '中文', value: 'zh' },
    { label: 'Korean', native: '한국어', value: 'ko' },
    { label: 'Russian', native: 'Русский', value: 'ru' },
    { label: 'Arabic', native: 'العربية', value: 'ar' },
  ];

  const colors = [
    '#FF3B30', // ClipAnim Red
    '#007AFF', // iOS Blue
    '#34C759', // Emerald Green
    '#FF9500', // Amber Orange
    '#AF52DE', // Electric Purple
    '#FF2D55', // Hot Pink
    '#00C7BE', // Teal Cyan
    '#FFCC00', // Solar Yellow
  ];

  const fonts = [
    { id: 'sans', label: t('globalSettings.systemDefault', 'System Sans-Serif'), value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { id: 'mono', label: t('globalSettings.monospace', 'Developer Monospace'), value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
    { id: 'serif', label: t('globalSettings.serif', 'Editorial Serif'), value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
    { id: 'round', label: t('globalSettings.round', 'Creative Rounded'), value: '"Varela Round", "Nunito", "Arial Rounded MT Bold", sans-serif' },
  ];

  const shortcutLabels: Record<keyof Shortcuts, { name: string; category: string }> = {
    selectTool: { name: t('toolbar.select', 'Select Tool'), category: 'Tools' },
    lassoTool: { name: t('toolbar.lasso', 'Lasso Select'), category: 'Tools' },
    wandTool: { name: t('toolbar.wand', 'Magic Wand'), category: 'Tools' },
    penTool: { name: t('toolbar.brush', 'Brush / Pen'), category: 'Tools' },
    eraserTool: { name: t('toolbar.eraser', 'Eraser'), category: 'Tools' },
    fillTool: { name: t('toolbar.fill', 'Paint Bucket'), category: 'Tools' },
    shapeTool: { name: t('toolbar.shapes', 'Shape Tool'), category: 'Tools' },
    textTool: { name: t('toolbar.text', 'Text Tool'), category: 'Tools' },
    playPause: { name: t('timeline.play', 'Play / Pause Animation'), category: 'Playback' },
    nextFrame: { name: t('timeline.nextFrame', 'Next Frame'), category: 'Playback' },
    prevFrame: { name: t('timeline.prevFrame', 'Previous Frame'), category: 'Playback' },
    addFrame: { name: t('timeline.addFrame', 'New Keyframe'), category: 'Timeline' },
    deleteFrame: { name: t('timeline.deleteFrame', 'Delete Frame'), category: 'Timeline' },
    undo: { name: t('common.undo', 'Undo Action'), category: 'Edit' },
    redo: { name: t('common.redo', 'Redo Action'), category: 'Edit' },
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

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  // Duplicate keybinding detection
  const duplicateKeys = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(shortcuts || {}).forEach(val => {
      const lower = (val || '').toLowerCase();
      if (lower) counts[lower] = (counts[lower] || 0) + 1;
    });
    return Object.keys(counts).filter(k => counts[k] > 1);
  }, [shortcuts]);

  const filteredShortcuts = useMemo(() => {
    const keys = Object.keys(shortcutLabels) as Array<keyof Shortcuts>;
    if (!searchQuery.trim()) return keys;
    const q = searchQuery.toLowerCase();
    return keys.filter(k => {
      const item = shortcutLabels[k];
      const code = shortcuts[k] || '';
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || code.toLowerCase().includes(q);
    });
  }, [searchQuery, shortcuts]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return languages;
    const q = searchQuery.toLowerCase();
    return languages.filter(l => l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.value.includes(q));
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-3 sm:p-6">
      <div className="bg-[#181818] w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden text-gray-200 font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-[#202020] border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              <Icons.Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">{t('globalSettings.title', 'App Preferences')}</h2>
              <p className="text-xs text-gray-400">Customize theme, accent color, shortcuts, font, and language.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search */}
            <div className="relative flex-1 sm:w-56">
              <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search preferences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#121212] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-color)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <Icons.X size={12} />
                </button>
              )}
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#1c1c1c] border-b border-gray-800 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'appearance'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icons.Palette size={14} />
            <span>Appearance & Theme</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'shortcuts'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icons.Code size={14} />
            <span>Hotkeys & Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveTab('device')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'device'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icons.Monitor size={14} />
            <span>Device & Typography</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'language'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icons.Help size={14} />
            <span>Language ({i18n.language?.toUpperCase() || 'EN'})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 no-scrollbar bg-[#141414]">
          
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Theme Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t('globalSettings.theme', 'Application Theme')}</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-lg shadow-black/40' 
                        : 'border-gray-800 bg-[#1e1e1e] text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Icons.Moon size={22} className={theme === 'dark' ? 'text-[var(--accent-color)]' : ''} />
                    <span className="text-xs font-bold">{t('globalSettings.dark', 'Dark Mode')}</span>
                    <span className="text-[10px] text-gray-500">Pro Studio Dark</span>
                  </button>

                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      theme === 'light' 
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-lg shadow-black/40' 
                        : 'border-gray-800 bg-[#1e1e1e] text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Icons.Sun size={22} className={theme === 'light' ? 'text-[var(--accent-color)]' : ''} />
                    <span className="text-xs font-bold">{t('globalSettings.light', 'Light Canvas')}</span>
                    <span className="text-[10px] text-gray-500">High Contrast</span>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      theme === 'system' 
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-lg shadow-black/40' 
                        : 'border-gray-800 bg-[#1e1e1e] text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Icons.Laptop size={22} className={theme === 'system' ? 'text-[var(--accent-color)]' : ''} />
                    <span className="text-xs font-bold">{t('globalSettings.system', 'System Sync')}</span>
                    <span className="text-[10px] text-gray-500">Auto OS Theme</span>
                  </button>
                </div>
              </div>

              {/* Accent Color Selection */}
              <div className="space-y-3 pt-3 border-t border-gray-800/80">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t('globalSettings.accentColor', 'UI Accent Color')}</label>
                  <span className="text-xs font-mono font-bold text-gray-400">{accentColor}</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className={`w-full aspect-square rounded-2xl border-2 flex items-center justify-center transition-all shadow-md ${
                        accentColor.toLowerCase() === c.toLowerCase() ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Select accent color ${c}`}
                    >
                      {accentColor.toLowerCase() === c.toLowerCase() && <Icons.Check size={16} className="text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    placeholder="#HEX color..."
                    value={customColorInput || accentColor}
                    onChange={(e) => {
                      setCustomColorInput(e.target.value);
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        setAccentColor(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-gray-700 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-color)]"
                  />
                </div>
              </div>

              {/* Live Accent UI Preview Box */}
              <div className="bg-[#1c1c1c] p-4 rounded-2xl border border-gray-800 space-y-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Live UI Theme Preview</span>
                <div className="flex items-center gap-3">
                  <button 
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-shadow shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    Primary Action Button
                  </button>
                  <span 
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold"
                    style={{ backgroundColor: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}50` }}
                  >
                    Active Tag
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-gray-800 relative overflow-hidden">
                    <div className="h-full rounded-full w-2/3" style={{ backgroundColor: accentColor }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <div>
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Custom Tool Hotkeys</h3>
                  <p className="text-[11px] text-gray-400">Click a hotkey pill, then press your preferred key combination on your keyboard.</p>
                </div>
                <button
                  onClick={resetShortcuts}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  title="Reset shortcuts to original defaults"
                >
                  <Icons.RotateCcw size={13} />
                  <span>Reset Defaults</span>
                </button>
              </div>

              {duplicateKeys.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <Icons.Info size={16} className="shrink-0 text-amber-400" />
                  <span>Conflict Warning: Duplicate hotkeys assigned for <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-200">{duplicateKeys.join(', ')}</code>.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredShortcuts.map((key) => {
                  const item = shortcutLabels[key];
                  const code = shortcuts[key];
                  const isRec = recordingKey === key;
                  const isDup = duplicateKeys.includes((code || '').toLowerCase());

                  return (
                    <div 
                      key={key} 
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isRec 
                          ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] shadow-lg' 
                          : isDup 
                            ? 'bg-amber-950/20 border-amber-500/40' 
                            : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{item.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{item.category}</span>
                      </div>

                      <button
                        onClick={() => setRecordingKey(key)}
                        onKeyDown={(e) => recordingKey === key ? handleKeyDown(e, key) : undefined}
                        onBlur={() => setRecordingKey(null)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold min-w-[70px] text-center transition-all ${
                          isRec 
                            ? 'bg-[var(--accent-color)] text-white animate-pulse shadow-md' 
                            : 'bg-[#252525] text-gray-200 border border-gray-700 hover:border-gray-500 hover:bg-gray-800'
                        }`}
                      >
                        {isRec ? 'Press key...' : code}
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No matching hotkeys found for "{searchQuery}".
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEVICE & TYPOGRAPHY */}
          {activeTab === 'device' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Device Mode */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t('globalSettings.deviceOptimization', 'Device Workspace Mode')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeviceType('pc')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                      deviceType === 'pc' 
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-lg' 
                        : 'border-gray-800 bg-[#1e1e1e] text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Icons.Monitor size={22} className={deviceType === 'pc' ? 'text-[var(--accent-color)]' : ''} />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-white">{t('globalSettings.pc', 'Desktop / Laptop PC')}</span>
                      <span className="text-[10px] text-gray-400">Optimized for precise mouse, pen tablet & full keyboard shortcuts.</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setDeviceType('mobile')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                      deviceType === 'mobile' 
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-lg' 
                        : 'border-gray-800 bg-[#1e1e1e] text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Icons.Smartphone size={22} className={deviceType === 'mobile' ? 'text-[var(--accent-color)]' : ''} />
                    <div className="text-left">
                      <span className="text-xs font-bold block text-white">{t('globalSettings.mobile', 'Mobile / Tablet Touch')}</span>
                      <span className="text-[10px] text-gray-400">Enlarged touch targets, touch gestures, and compact toolbars.</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* UI Typography */}
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t('globalSettings.appFont', 'Interface Typography Font')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setUiFont(f.value)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        uiFont === f.value 
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-white shadow-md' 
                          : 'border-gray-800 bg-[#1a1a1a] text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{f.label}</span>
                        {uiFont === f.value && <Icons.Check size={16} className="text-[var(--accent-color)]" />}
                      </div>
                      <span className="text-xs opacity-70" style={{ fontFamily: f.value }}>
                        ClipAnim Studio 2026 (ABC 123)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="pb-2 border-b border-gray-800">
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">{t('globalSettings.language', 'Language & Locale')}</h3>
                <p className="text-[11px] text-gray-400">Select interface display language. Applied across all toolbars and modals.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredLanguages.map((lang) => {
                  const isSel = i18n.language === lang.value;
                  return (
                    <button
                      key={lang.value}
                      onClick={() => i18n.changeLanguage(lang.value)}
                      className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border ${
                        isSel 
                          ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-lg' 
                          : 'bg-[#1a1a1a] text-gray-300 border-gray-800 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="text-left">
                        <span className="block font-bold">{lang.native}</span>
                        <span className="text-[10px] opacity-60 font-mono uppercase">{lang.label} ({lang.value})</span>
                      </div>
                      {isSel && <Icons.Check size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#202020] shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-mono">ClipAnim v1.3.3 System Preferences</span>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {t('common.done', 'Done')}
          </button>
        </div>

      </div>
    </div>
  );
};
