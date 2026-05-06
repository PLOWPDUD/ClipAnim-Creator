import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (url: string, name: string) => void;
  savedSounds: { name: string; url: string }[];
  onToggleSaveSound: (sound: { name: string; url: string }) => void;
}

const DEFAULT_SOUNDS = [
  { name: 'Pop', url: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg' },
  { name: 'Boing', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg' },
  { name: 'Slide Whistle', url: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg' },
  { name: 'Beep', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
  { name: 'Wood Planks', url: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg' },
  { name: 'Clang', url: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg' },
  { name: 'Crash', url: 'https://actions.google.com/sounds/v1/impacts/crash.ogg' },
  { name: 'Robot Code', url: 'https://actions.google.com/sounds/v1/science_fiction/robot_code.ogg' },
];

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectSound,
  savedSounds,
  onToggleSaveSound
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [playingSoundUrl, setPlayingSoundUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setActiveTab('search');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingSoundUrl(null);
      }
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('[SoundLibrary] Starting search for:', searchQuery);
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[SoundLibrary] Frontend timeout triggered');
      controller.abort();
    }, 15000); // 15 second frontend timeout

    try {
      // Call our own server-side proxy instead of Freesound directly to avoid CORS issues
      const url = `/api/search-sounds?query=${encodeURIComponent(searchQuery)}`;
      console.log('[SoundLibrary] Fetching from:', url);
      
      const response = await fetch(url, { signal: controller.signal });
      console.log('[SoundLibrary] Response received, status:', response.status);

      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.detail || errorMsg;
        } catch (e) {
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('[SoundLibrary] Data parsed, results count:', data.results?.length || 0);
      clearTimeout(timeoutId);
      
      if (!data.results || data.results.length === 0) {
        setSearchResults([]);
        return;
      }

      const results = data.results
        .map((item: any) => {
          const previews = item.previews || {};
          const previewUrl = previews['preview-hq-mp3'] || 
                           previews['preview-lq-mp3'] || 
                           previews['preview-hq-ogg'] ||
                           previews['preview-lq-ogg'];
          
          return {
            name: item.name || 'Untitled Sound',
            url: previewUrl
          };
        })
        .filter((item: any) => item.url);

      setSearchResults(results);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[SoundLibrary] Search error:', err);
      
      // Check if API key is missing by calling our test route
      try {
        const testRes = await fetch('/api/test-freesound');
        const testData = await testRes.json();
        if (!testData.hasKey) {
          setError('Freesound API key is missing. Please add VITE_FREESOUND_API_KEY to your environment variables in Settings.');
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // Ignore test route errors
      }

      if (err.name === 'AbortError') {
        setError('Search timed out. The server or Freesound might be slow. Please try again.');
      } else {
        setError(`Search failed: ${err.message}. Please check your API key in Settings.`);
      }
    } finally {
      console.log('[SoundLibrary] Search operation complete');
      setIsLoading(false);
    }
  };

  const togglePlay = (url: string) => {
    if (playingSoundUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingSoundUrl(null);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingSoundUrl(null);
        audioRef.current = null;
      };
      audio.play().catch(e => {
        if (e.name !== 'AbortError') console.error(e);
        setPlayingSoundUrl(null);
        audioRef.current = null;
      });
      setPlayingSoundUrl(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Music size={20} className="text-[var(--accent-color)]" />
            {t('soundLibrary.title')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'search' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
          >
            {t('soundLibrary.search')}
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'saved' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
          >
            {t('soundLibrary.saved')} ({savedSounds.length})
          </button>
        </div>

        {activeTab === 'search' && (
          <div className="p-4 border-b border-white/10">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('soundLibrary.searchPlaceholder')}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] transition-colors"
              />
              <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent-color)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                {t('soundLibrary.search')}
              </button>
            </form>
          </div>
        )}
        
        <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3 flex-1">
          {activeTab === 'search' ? (
            isLoading ? (
              <div className="col-span-2 py-10 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{t('soundLibrary.searching')}</span>
              </div>
            ) : error ? (
              <div className="col-span-2 py-10 text-center text-red-400 text-sm px-4">
                {error}
              </div>
            ) : (searchResults.length > 0 ? searchResults : (searchQuery ? [] : DEFAULT_SOUNDS)).length === 0 ? (
              <div className="col-span-2 py-10 text-center text-gray-400 text-sm">
                {t('soundLibrary.noSoundsFound', { query: searchQuery })}
              </div>
            ) : (
              (searchResults.length > 0 ? searchResults : (searchQuery ? [] : DEFAULT_SOUNDS)).map((sound, idx) => {
                const isSaved = savedSounds.some(s => s.url === sound.url);
                return (
                  <div key={`${sound.name}-${idx}`} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-white/5 transition-colors group">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{sound.name}</span>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => togglePlay(sound.url)}
                          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-color)] transition-colors"
                        >
                          {playingSoundUrl === sound.url ? <Icons.Pause size={12} /> : <Icons.Play size={12} className="ml-0.5" />}
                        </button>
                        <button 
                          onClick={() => onToggleSaveSound(sound)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isSaved ? 'bg-[var(--accent-color)] text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
                          title={isSaved ? t('soundLibrary.removeFromSaved') : t('soundLibrary.saveToLibrary')}
                        >
                          <Icons.Star size={12} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onSelectSound(sound.url, sound.name);
                        onClose();
                      }}
                      className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors mt-auto"
                    >
                      {t('soundLibrary.addToTimeline')}
                    </button>
                  </div>
                );
              })
            )
          ) : (
            savedSounds.length === 0 ? (
              <div className="col-span-2 py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <Icons.Star size={32} className="opacity-20" />
                <span>{t('soundLibrary.noSavedSounds')}</span>
                <button 
                  onClick={() => setActiveTab('search')}
                  className="text-[var(--accent-color)] hover:underline mt-2"
                >
                  {t('soundLibrary.goToSearch')}
                </button>
              </div>
            ) : (
              savedSounds.map((sound, idx) => (
                <div key={`saved-${sound.name}-${idx}`} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-white/5 transition-colors group">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{sound.name}</span>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button 
                        onClick={() => togglePlay(sound.url)}
                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-color)] transition-colors"
                      >
                        {playingSoundUrl === sound.url ? <Icons.Pause size={12} /> : <Icons.Play size={12} className="ml-0.5" />}
                      </button>
                      <button 
                        onClick={() => onToggleSaveSound(sound)}
                        className="w-7 h-7 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center transition-colors"
                        title={t('soundLibrary.removeFromSaved')}
                      >
                        <Icons.Star size={12} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      onSelectSound(sound.url, sound.name);
                      onClose();
                    }}
                    className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors mt-auto"
                  >
                    {t('soundLibrary.addToTimeline')}
                  </button>
                </div>
              ))
            )
          )}
        </div>

        {activeTab === 'search' && searchQuery && !isLoading && !error && searchResults.length > 0 && (
          <div className="p-2 text-center border-t border-white/10">
            <p className="text-[10px] text-gray-500">
              {t('soundLibrary.resultsFrom')} <a href="https://freesound.org" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">freesound.org</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
