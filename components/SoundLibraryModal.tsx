import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (url: string, name: string) => void;
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

const FREESOUND_API_KEY = 
  (import.meta as any).env.VITE_FREESOUND_API_KEY || 
  (import.meta as any).env.FREESOUND_API_KEY;

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({ isOpen, onClose, onSelectSound }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (!FREESOUND_API_KEY) {
      setError('Freesound API key is missing. Please add VITE_FREESOUND_API_KEY to your environment variables in the Settings menu.');
      console.error('Freesound API key is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call our own server-side proxy instead of Freesound directly to avoid CORS issues
      const url = `/api/search-sounds?query=${encodeURIComponent(searchQuery)}`;
      
      console.log('--- Proxy Search Debug ---');
      console.log('Query:', searchQuery);
      
      const response = await fetch(url);

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
      console.error('Search error:', err);
      setError(`Search failed: ${err.message}. Please ensure the API key is set in Settings.`);
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(e => {
      if (e.name !== 'AbortError') console.error(e);
    });
  };

  if (!isOpen) return null;

  const soundsToDisplay = searchResults.length > 0 ? searchResults : (searchQuery ? [] : DEFAULT_SOUNDS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Music size={20} className="text-[var(--accent-color)]" />
            Sound Library
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sounds (e.g. cartoon, pop, magic)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] transition-colors"
            />
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent-color)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
          {!FREESOUND_API_KEY && (
            <p className="mt-2 text-[10px] text-yellow-500/80 italic">
              * Freesound API key required for search.
            </p>
          )}
        </div>
        
        <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3 flex-1">
          {isLoading ? (
            <div className="col-span-2 py-10 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Searching Freesound...</span>
            </div>
          ) : error ? (
            <div className="col-span-2 py-10 text-center text-red-400 text-sm px-4">
              {error}
            </div>
          ) : soundsToDisplay.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-gray-400 text-sm">
              No sounds found for "{searchQuery}"
            </div>
          ) : (
            soundsToDisplay.map((sound, idx) => (
              <div key={`${sound.name}-${idx}`} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-white/5 transition-colors group">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{sound.name}</span>
                  <button 
                    onClick={() => playPreview(sound.url)}
                    className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-color)] transition-colors"
                  >
                    <Icons.Play size={12} className="ml-0.5" />
                  </button>
                </div>
                <button 
                  onClick={() => {
                    onSelectSound(sound.url, sound.name);
                    onClose();
                  }}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors mt-auto"
                >
                  Add to Timeline
                </button>
              </div>
            ))
          )}
        </div>

        {searchQuery && !isLoading && !error && searchResults.length > 0 && (
          <div className="p-2 text-center border-t border-white/10">
            <p className="text-[10px] text-gray-500">
              Results from <a href="https://freesound.org" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">freesound.org</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
