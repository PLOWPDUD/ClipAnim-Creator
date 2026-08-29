import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

export interface SoundItem {
  id?: string | number;
  name: string;
  url: string;
  duration?: number;
  tags?: string[];
  description?: string;
  license?: string;
  username?: string;
  avg_rating?: number;
  num_downloads?: number;
  channels?: number;
  samplerate?: number;
  type?: string;
  waveformUrl?: string;
  spectralUrl?: string;
  isBuiltIn?: boolean;
}

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (url: string, name: string) => void;
  savedSounds: { name: string; url: string; duration?: number; tags?: string[] }[];
  onToggleSaveSound: (sound: { name: string; url: string; duration?: number; tags?: string[] }) => void;
}

// Rich Curated Built-in Sound Effects for instant offline / no-key access
const CURATED_CATEGORIES: { id: string; name: string; icon: keyof typeof Icons; sounds: SoundItem[] }[] = [
  {
    id: 'cartoon',
    name: 'Cartoon & Slapstick',
    icon: 'Sparkles',
    sounds: [
      { name: 'Pop Cork', url: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg', duration: 0.5, tags: ['pop', 'cartoon', 'bubble', 'cork'] },
      { name: 'Cartoon Boing', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg', duration: 1.2, tags: ['boing', 'spring', 'jump', 'bounce'] },
      { name: 'Slide Whistle Up', url: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg', duration: 1.8, tags: ['whistle', 'slide', 'up', 'funny'] },
      { name: 'Clang & Wobble', url: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg', duration: 2.1, tags: ['clang', 'metal', 'wobble', 'bonk'] },
      { name: 'Wood Plank Flicks', url: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg', duration: 1.4, tags: ['wood', 'flick', 'tap', 'rattle'] },
      { name: 'Cartoon Squeak', url: 'https://actions.google.com/sounds/v1/cartoon/squeaky_toy.ogg', duration: 0.8, tags: ['squeak', 'toy', 'pinch', 'cute'] },
      { name: 'Cartoon Zip / Dash', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_zip_run.ogg', duration: 1.5, tags: ['run', 'dash', 'zip', 'scramble'] },
      { name: 'Funny Horn Honk', url: 'https://actions.google.com/sounds/v1/cartoon/horn_honk.ogg', duration: 0.9, tags: ['horn', 'honk', 'clown', 'car'] },
    ]
  },
  {
    id: 'retro',
    name: '8-Bit & Retro Game',
    icon: 'Gamepad2',
    sounds: [
      { name: '8-Bit Jump', url: 'https://actions.google.com/sounds/v1/science_fiction/retro_game_jump.ogg', duration: 0.4, tags: ['retro', 'jump', '8bit', 'arcade'] },
      { name: 'Coin Pickup', url: 'https://actions.google.com/sounds/v1/science_fiction/coin_collect.ogg', duration: 0.6, tags: ['coin', 'collect', 'pickup', 'gold'] },
      { name: 'Power Up Chime', url: 'https://actions.google.com/sounds/v1/science_fiction/power_up.ogg', duration: 1.2, tags: ['powerup', 'level', 'bonus', 'shine'] },
      { name: 'Laser Blaster', url: 'https://actions.google.com/sounds/v1/science_fiction/laser_pew.ogg', duration: 0.5, tags: ['laser', 'pew', 'shoot', 'gun'] },
      { name: 'Arcade Explosion', url: 'https://actions.google.com/sounds/v1/science_fiction/retro_explosion.ogg', duration: 1.8, tags: ['explosion', 'boom', '8bit', 'destroy'] },
      { name: 'Game Over Buzz', url: 'https://actions.google.com/sounds/v1/science_fiction/game_over.ogg', duration: 2.0, tags: ['gameover', 'fail', 'buzz', 'defeat'] },
    ]
  },
  {
    id: 'scifi',
    name: 'Sci-Fi & Magic',
    icon: 'Zap',
    sounds: [
      { name: 'Robot Processing Code', url: 'https://actions.google.com/sounds/v1/science_fiction/robot_code.ogg', duration: 2.8, tags: ['robot', 'code', 'data', 'computer'] },
      { name: 'Sci-Fi Shield Hum', url: 'https://actions.google.com/sounds/v1/science_fiction/force_field_hum.ogg', duration: 3.5, tags: ['shield', 'hum', 'energy', 'force'] },
      { name: 'Teleport Warp', url: 'https://actions.google.com/sounds/v1/science_fiction/teleport_whoosh.ogg', duration: 1.6, tags: ['teleport', 'warp', 'portal', 'magic'] },
      { name: 'Magic Sparkle Wand', url: 'https://actions.google.com/sounds/v1/magic/magical_chime_sparkle.ogg', duration: 2.2, tags: ['magic', 'sparkle', 'spell', 'glitter'] },
      { name: 'Space Drone Hum', url: 'https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_drone.ogg', duration: 4.0, tags: ['space', 'drone', 'ambient', 'spaceship'] },
    ]
  },
  {
    id: 'impacts',
    name: 'Impacts & Action',
    icon: 'Zap',
    sounds: [
      { name: 'Heavy Crash Boom', url: 'https://actions.google.com/sounds/v1/impacts/crash.ogg', duration: 2.3, tags: ['crash', 'boom', 'smash', 'impact'] },
      { name: 'Metal Pipe Clang', url: 'https://actions.google.com/sounds/v1/impacts/metal_clang.ogg', duration: 1.1, tags: ['metal', 'clang', 'pipe', 'drop'] },
      { name: 'Fast Whoosh Swish', url: 'https://actions.google.com/sounds/v1/movement/fast_whoosh.ogg', duration: 0.7, tags: ['whoosh', 'swish', 'swing', 'speed'] },
      { name: 'Glass Break', url: 'https://actions.google.com/sounds/v1/impacts/glass_shatter.ogg', duration: 1.5, tags: ['glass', 'break', 'shatter', 'window'] },
      { name: 'Punch / Smack', url: 'https://actions.google.com/sounds/v1/impacts/punch_impact.ogg', duration: 0.6, tags: ['punch', 'hit', 'fight', 'smack'] },
      { name: 'Thunder Strike', url: 'https://actions.google.com/sounds/v1/weather/thunder_crack.ogg', duration: 3.2, tags: ['thunder', 'lightning', 'storm', 'strike'] },
    ]
  },
  {
    id: 'ui',
    name: 'UI, Clicks & Chimes',
    icon: 'Radio',
    sounds: [
      { name: 'Digital Beep Short', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg', duration: 0.4, tags: ['beep', 'alarm', 'digital', 'ui'] },
      { name: 'Soft Click Tap', url: 'https://actions.google.com/sounds/v1/cartoon/soft_click.ogg', duration: 0.3, tags: ['click', 'tap', 'button', 'ui'] },
      { name: 'Success Chime', url: 'https://actions.google.com/sounds/v1/cartoon/success_fanfare.ogg', duration: 1.7, tags: ['success', 'win', 'chime', 'fanfare'] },
      { name: 'Bubble Pop', url: 'https://actions.google.com/sounds/v1/cartoon/bubble_pop.ogg', duration: 0.4, tags: ['bubble', 'pop', 'water', 'cute'] },
      { name: 'Marimba Notification', url: 'https://actions.google.com/sounds/v1/alarms/marimba_ring.ogg', duration: 1.5, tags: ['marimba', 'ring', 'alert', 'chime'] },
    ]
  },
  {
    id: 'foley',
    name: 'Foley & Nature',
    icon: 'Wind',
    sounds: [
      { name: 'Footsteps on Wood', url: 'https://actions.google.com/sounds/v1/foley/footsteps_wood_floor.ogg', duration: 2.5, tags: ['footsteps', 'walk', 'wood', 'shoes'] },
      { name: 'Creaky Wooden Door', url: 'https://actions.google.com/sounds/v1/household/creaky_door_open.ogg', duration: 2.1, tags: ['door', 'creak', 'horror', 'open'] },
      { name: 'Forest Birds Singing', url: 'https://actions.google.com/sounds/v1/animals/forest_birds.ogg', duration: 4.8, tags: ['birds', 'forest', 'nature', 'ambient'] },
      { name: 'Gentle Rain on Roof', url: 'https://actions.google.com/sounds/v1/weather/rain_gentle.ogg', duration: 5.0, tags: ['rain', 'weather', 'water', 'calm'] },
      { name: 'Campfire Fire Crackle', url: 'https://actions.google.com/sounds/v1/ambiences/campfire_crackle.ogg', duration: 4.5, tags: ['fire', 'campfire', 'burn', 'crackle'] },
      { name: 'Clock Ticking', url: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg', duration: 3.0, tags: ['clock', 'tick', 'time', 'watch'] },
    ]
  }
];

const SEARCH_SUGGESTIONS = [
  'cartoon pop', 'laser', 'explosion', 'whoosh', 'footsteps',
  'retro jump', 'magic sparkle', 'rain ambient', 'door creak',
  'applause', 'glitch', 'punch', 'bubble', 'sword clash'
];

type DurationFilterPreset = 'all' | 'micro' | 'short' | 'medium' | 'long' | 'music' | 'custom';
type SortOption = 'score' | 'rating_desc' | 'downloads_desc' | 'duration_asc' | 'duration_desc' | 'created_desc';
type LicenseFilter = 'all' | 'cc0' | 'by';
type ChannelFilter = 'all' | 'stereo' | 'mono';

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectSound,
  savedSounds,
  onToggleSaveSound
}) => {
  const { t } = useTranslation();

  // Navigation tabs: 'freesound' | 'essentials' | 'saved' | 'recorder' | 'import'
  const [activeTab, setActiveTab] = useState<'freesound' | 'essentials' | 'saved' | 'recorder' | 'import'>('freesound');
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [durationPreset, setDurationPreset] = useState<DurationFilterPreset>('all');
  const [customMinDuration, setCustomMinDuration] = useState<string>('');
  const [customMaxDuration, setCustomMaxDuration] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('score');
  const [licenseFilter, setLicenseFilter] = useState<LicenseFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [loopOnly, setLoopOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [minSampleRate, setMinSampleRate] = useState<number>(0);

  // Freesound Results & Pagination
  const [searchResults, setSearchResults] = useState<SoundItem[]>([]);
  const [totalResultsCount, setTotalResultsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Search History
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('clipanim_sound_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Master Audio Playback States
  const [playingSoundUrl, setPlayingSoundUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(1);
  const [isLoopPreview, setIsLoopPreview] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Essentials category select
  const [selectedEssentialsCat, setSelectedEssentialsCat] = useState<string>('cartoon');

  // Saved sounds search filter
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  // Voice & Foley Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordingName, setRecordingName] = useState('Voice Note 1');
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Local file import drag/drop
  const [importedSounds, setImportedSounds] = useState<SoundItem[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (durationPreset !== 'all') count++;
    if (sortOption !== 'score') count++;
    if (licenseFilter !== 'all') count++;
    if (channelFilter !== 'all') count++;
    if (loopOnly) count++;
    if (minRating > 0) count++;
    if (minSampleRate > 0) count++;
    if (selectedTag) count++;
    return count;
  }, [categoryFilter, durationPreset, sortOption, licenseFilter, channelFilter, loopOnly, minRating, minSampleRate, selectedTag]);

  // Check Freesound API key on modal open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/test-freesound')
        .then(res => res.json())
        .then(data => {
          setHasApiKey(!!data.hasKey);
        })
        .catch(() => {
          setHasApiKey(true); // default optimistic
        });
    }
  }, [isOpen]);

  // Clean up audio playback on modal close
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSoundUrl(null);
      setCurrentTime(0);
      setCurrentDuration(0);
      
      // Stop recording if active
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  }, [isOpen, isRecording]);

  // Keep volume synced with active audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : masterVolume;
    }
  }, [masterVolume, isMuted]);

  // Keep loop preview synced with active audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLoopPreview;
    }
  }, [isLoopPreview]);

  // Audio Playback Handler
  const togglePlaySound = (url: string, duration?: number) => {
    if (playingSoundUrl === url) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      }
      return;
    }

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.volume = isMuted ? 0 : masterVolume;
    audio.loop = isLoopPreview;
    audioRef.current = audio;
    setPlayingSoundUrl(url);
    setCurrentTime(0);
    setCurrentDuration(duration || 0);

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setCurrentDuration(audio.duration);
      }
    };

    audio.onended = () => {
      if (!isLoopPreview) {
        setPlayingSoundUrl(null);
        setCurrentTime(0);
      }
    };

    audio.onerror = () => {
      console.warn("Direct audio preview failed, trying proxy url...");
      const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
      const proxyAudio = new Audio(proxyUrl);
      proxyAudio.volume = isMuted ? 0 : masterVolume;
      proxyAudio.loop = isLoopPreview;
      audioRef.current = proxyAudio;
      proxyAudio.ontimeupdate = () => {
        setCurrentTime(proxyAudio.currentTime);
        if (proxyAudio.duration && !isNaN(proxyAudio.duration)) {
          setCurrentDuration(proxyAudio.duration);
        }
      };
      proxyAudio.onended = () => {
        if (!isLoopPreview) {
          setPlayingSoundUrl(null);
          setCurrentTime(0);
        }
      };
      proxyAudio.play().catch(e => {
        console.error("Audio playback failed:", e);
        setPlayingSoundUrl(null);
      });
    };

    audio.play().catch(e => {
      if (e.name !== 'AbortError') console.error("Playback error:", e);
      setPlayingSoundUrl(null);
    });
  };

  const handleSeek = (soundUrl: string, clientX: number, targetRect: DOMRect, soundDur: number) => {
    const pos = Math.max(0, Math.min(1, (clientX - targetRect.left) / targetRect.width));
    const targetTime = pos * (soundDur || currentDuration || 1);

    if (playingSoundUrl === soundUrl && audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    } else {
      togglePlaySound(soundUrl, soundDur);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        }
      }, 50);
    }
  };

  // Build the advanced Freesound filter string from current settings
  const buildFreesoundFilterString = useCallback(() => {
    const filterTokens: string[] = [];

    // Duration filter
    if (durationPreset === 'micro') {
      filterTokens.push('duration:[0.0 TO 1.0]');
    } else if (durationPreset === 'short') {
      filterTokens.push('duration:[1.0 TO 5.0]');
    } else if (durationPreset === 'medium') {
      filterTokens.push('duration:[5.0 TO 15.0]');
    } else if (durationPreset === 'long') {
      filterTokens.push('duration:[15.0 TO 60.0]');
    } else if (durationPreset === 'music') {
      filterTokens.push('duration:[60.0 TO *]');
    } else if (durationPreset === 'custom') {
      const min = parseFloat(customMinDuration) || 0;
      const max = parseFloat(customMaxDuration);
      if (!isNaN(max) && max > 0) {
        filterTokens.push(`duration:[${min} TO ${max}]`);
      } else if (min > 0) {
        filterTokens.push(`duration:[${min} TO *]`);
      }
    }

    // Category tag filter
    if (categoryFilter !== 'all') {
      filterTokens.push(`tag:${categoryFilter}`);
    }

    // Explicit tag refinement
    if (selectedTag) {
      filterTokens.push(`tag:"${selectedTag}"`);
    }

    // License filter
    if (licenseFilter === 'cc0') {
      filterTokens.push('license:"Creative Commons 0"');
    } else if (licenseFilter === 'by') {
      filterTokens.push('license:"Attribution"');
    }

    // Channels
    if (channelFilter === 'stereo') {
      filterTokens.push('channels:2');
    } else if (channelFilter === 'mono') {
      filterTokens.push('channels:1');
    }

    // Loop filter
    if (loopOnly) {
      filterTokens.push('tag:loop');
    }

    // Rating filter
    if (minRating > 0) {
      filterTokens.push(`avg_rating:[${minRating} TO 5.0]`);
    }

    // Sample rate
    if (minSampleRate > 0) {
      filterTokens.push(`samplerate:[${minSampleRate} TO *]`);
    }

    return filterTokens.join(' ');
  }, [durationPreset, customMinDuration, customMaxDuration, categoryFilter, selectedTag, licenseFilter, channelFilter, loopOnly, minRating, minSampleRate]);

  // Execute Freesound Search
  const executeSearch = useCallback(async (pageToLoad: number = 1) => {
    setIsLoading(true);
    setError(null);

    const filterString = buildFreesoundFilterString();
    const queryTerm = searchQuery.trim() || (categoryFilter !== 'all' ? categoryFilter : 'sfx');

    console.log('[SoundLibrary] Executing search for:', queryTerm, 'filter:', filterString, 'page:', pageToLoad);

    // Save search history
    if (searchQuery.trim()) {
      setSearchHistory(prev => {
        const next = [searchQuery.trim(), ...prev.filter(q => q.toLowerCase() !== searchQuery.trim().toLowerCase())].slice(0, 10);
        try {
          localStorage.setItem('clipanim_sound_search_history', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `/api/search-sounds?query=${encodeURIComponent(queryTerm)}&page=${pageToLoad}&page_size=${pageSize}&sort=${encodeURIComponent(sortOption)}${filterString ? `&filter=${encodeURIComponent(filterString)}` : ''}`;
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { error: response.statusText };
        }
        throw new Error(errData.error || errData.detail || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      console.log('[SoundLibrary] Received data:', data);

      const items: SoundItem[] = (data.results || []).map((item: any) => {
        const previews = item.previews || {};
        const previewUrl = previews['preview-hq-mp3'] || 
                          previews['preview-lq-mp3'] || 
                          previews['preview-hq-ogg'] || 
                          previews['preview-lq-ogg'];

        const images = item.images || {};
        const waveformUrl = images['waveform_m'] || images['waveform_l'] || null;
        const spectralUrl = images['spectral_m'] || null;

        return {
          id: item.id,
          name: item.name || 'Untitled Sound',
          url: previewUrl,
          duration: item.duration || 0,
          tags: item.tags || [],
          description: item.description || '',
          license: item.license || '',
          username: item.username || '',
          avg_rating: item.avg_rating || 0,
          num_downloads: item.num_downloads || 0,
          channels: item.channels || 2,
          samplerate: item.samplerate || 44100,
          type: item.type || 'wav',
          waveformUrl,
          spectralUrl
        };
      }).filter((s: SoundItem) => s.url);

      setSearchResults(items);
      setTotalResultsCount(data.count || 0);
      setCurrentPage(data.page || pageToLoad);
      setTotalPages(data.total_pages || Math.ceil((data.count || 0) / pageSize) || 1);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[SoundLibrary] Search error:', err);
      if (err.name === 'AbortError') {
        setError('Search timed out. Freesound may be responding slowly. Please try again.');
      } else {
        setError(err.message || 'Failed to search sounds.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, buildFreesoundFilterString, categoryFilter, pageSize, sortOption]);

  // Trigger search when search form is submitted
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    executeSearch(1);
  };

  // Perform initial search or search when filters change
  useEffect(() => {
    if (isOpen && activeTab === 'freesound') {
      executeSearch(1);
    }
  }, [isOpen, activeTab, categoryFilter, durationPreset, sortOption, licenseFilter, channelFilter, loopOnly, minRating, minSampleRate, selectedTag, executeSearch]);

  // Reset all filters
  const handleResetFilters = () => {
    setCategoryFilter('all');
    setDurationPreset('all');
    setCustomMinDuration('');
    setCustomMaxDuration('');
    setSortOption('score');
    setLicenseFilter('all');
    setChannelFilter('all');
    setLoopOnly(false);
    setMinRating(0);
    setMinSampleRate(0);
    setSelectedTag(null);
    setSearchQuery('');
  };

  // Microphone Recording Methods
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];

      // Audio Context for Live VU Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        stream.getTracks().forEach(track => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setMicAudioLevel(0);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

    } catch (err: any) {
      console.error("Microphone access failed:", err);
      alert(t('audioRecord.micError', 'Could not access microphone. Please check permissions.'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Local File Drop / Import
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: SoundItem[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        const url = URL.createObjectURL(file);
        newItems.push({
          id: `local-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url,
          duration: 0,
          tags: ['imported', 'local'],
          type: file.type.split('/')[1] || 'audio'
        });
      }
    });

    if (newItems.length > 0) {
      setImportedSounds(prev => [...newItems, ...prev]);
    }
  };

  // Filter saved sounds
  const filteredSavedSounds = useMemo(() => {
    if (!savedSearchQuery.trim()) return savedSounds;
    const q = savedSearchQuery.toLowerCase();
    return savedSounds.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [savedSounds, savedSearchQuery]);

  // Format seconds to mm:ss or 0:00.0
  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '0.0s';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const remaining = (sec % 60).toFixed(1);
    return `${mins}:${remaining.padStart(4, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="bg-[#181818] rounded-3xl w-[1060px] max-w-[98vw] h-[88vh] max-h-[850px] shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden text-white">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#141414] border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-[var(--accent-color,#FF3B30)] flex items-center justify-center text-white shadow-lg">
              <Icons.Music size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {t('soundLibrary.title', 'Advanced Audio & SFX Studio')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Freesound API
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                500,000+ royalty-free sounds, precise faceted filtering, live waveforms & voice recording
              </p>
            </div>
          </div>

          {/* Master Volume & Loop Controls */}
          <div className="flex items-center gap-4">
            
            {/* Loop Toggle */}
            <button
              onClick={() => setIsLoopPreview(!isLoopPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isLoopPreview 
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700'
              }`}
              title="Toggle preview loop"
            >
              <Icons.Repeat size={14} />
              <span className="text-[11px] hidden sm:inline">Loop Preview</span>
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-xl border border-gray-700 text-xs">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="text-gray-400 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <Icons.VolumeX size={16} /> : <Icons.Volume2 size={16} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={isMuted ? 0 : masterVolume} 
                onChange={(e) => {
                  setMasterVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 sm:w-20 accent-[var(--accent-color,#FF3B30)] h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                title={`Preview Volume: ${Math.round((isMuted ? 0 : masterVolume) * 100)}%`}
              />
            </div>

            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
              title="Close (Esc)"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 bg-[#161616] border-b border-gray-800 shrink-0 overflow-x-auto no-scrollbar gap-2">
          
          <button 
            onClick={() => setActiveTab('freesound')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'freesound' 
                ? 'text-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] bg-white/5' 
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <Icons.Search size={15} />
            <span>Freesound Online Search</span>
            {searchResults.length > 0 && activeTab === 'freesound' && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--accent-color,#FF3B30)]/20 text-white font-mono">
                {totalResultsCount.toLocaleString()}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('essentials')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'essentials' 
                ? 'text-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] bg-white/5' 
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <Icons.Sparkles size={15} />
            <span>Curated Essentials</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
              Offline Ready
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('saved')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'saved' 
                ? 'text-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] bg-white/5' 
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <Icons.Star size={15} fill={savedSounds.length > 0 ? "currentColor" : "none"} />
            <span>My Saved Library</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
              {savedSounds.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('recorder')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'recorder' 
                ? 'text-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] bg-white/5' 
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <Icons.Mic size={15} />
            <span>Voice & Foley Recorder</span>
            {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
          </button>

          <button 
            onClick={() => setActiveTab('import')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'import' 
                ? 'text-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] bg-white/5' 
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <Icons.Upload size={15} />
            <span>Import Local Audio</span>
            {importedSounds.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                {importedSounds.length}
              </span>
            )}
          </button>

        </div>

        {/* TAB 1: FREESOUND SEARCH WITH PRECISE FACETED FILTERS */}
        {activeTab === 'freesound' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Search Input Bar & Filter Toggle */}
            <div className="p-4 sm:px-6 bg-[#1a1a1a] border-b border-gray-800 flex flex-col gap-3 shrink-0">
              
              <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 500,000+ sounds (e.g. cartoon pop, laser, footsteps, explosion, magic)..."
                    className="w-full bg-black/50 border border-gray-700 hover:border-gray-600 focus:border-[var(--accent-color,#FF3B30)] rounded-2xl py-2.5 pl-11 pr-24 text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner"
                  />
                  <Icons.Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        executeSearch(1);
                      }}
                      className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                    >
                      <Icons.X size={14} />
                    </button>
                  )}

                  <button 
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-[var(--accent-color,#FF3B30)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
                  >
                    Search
                  </button>
                </form>

                {/* Filter Drawer Toggle Button */}
                <button
                  onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm ${
                    isFilterDrawerOpen || activeFiltersCount > 0
                      ? 'bg-[var(--accent-color,#FF3B30)] text-white border-[var(--accent-color,#FF3B30)]'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
                  }`}
                  title="Toggle Advanced Search Filters"
                >
                  <Icons.Filter size={15} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Quick Search Suggestion Tags Strip & Recent Searches */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                {searchHistory.length > 0 && (
                  <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-gray-800 shrink-0">
                    <span className="text-gray-500 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                      <Icons.Clock size={12} /> Recent:
                    </span>
                    {searchHistory.slice(0, 3).map((item) => (
                      <button
                        key={`history-${item}`}
                        onClick={() => {
                          setSearchQuery(item);
                          setSelectedTag(null);
                          setCurrentPage(1);
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60 transition-colors shrink-0"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-gray-500 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                  <Icons.Sparkles size={12} /> Popular:
                </span>
                {SEARCH_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      setSelectedTag(null);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                      searchQuery.toLowerCase() === tag.toLowerCase()
                        ? 'bg-[var(--accent-color,#FF3B30)] text-white'
                        : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700/60'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Collapsible Advanced Filter Drawer */}
              {isFilterDrawerOpen && (
                <div className="p-4 bg-[#141414] border border-gray-800 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-150">
                  
                  {/* Row 1: Duration Filter & Sort By */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Duration Preset */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Duration Range
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {[
                          { id: 'all', label: 'All Lengths' },
                          { id: 'micro', label: '< 1s Micro' },
                          { id: 'short', label: '1–5s Short' },
                          { id: 'medium', label: '5–15s Med' },
                          { id: 'long', label: '15–60s Long' },
                          { id: 'music', label: '> 60s Music' },
                        ].map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setDurationPreset(d.id as DurationFilterPreset)}
                            className={`px-2 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                              durationPreset === d.id
                                ? 'bg-[var(--accent-color,#FF3B30)] border-[var(--accent-color,#FF3B30)] text-white shadow-sm'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Sort Results By
                      </label>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-color,#FF3B30)] cursor-pointer"
                      >
                        <option value="score">Most Relevant (Score)</option>
                        <option value="rating_desc">Highest Rated (★)</option>
                        <option value="downloads_desc">Most Downloaded (Popular)</option>
                        <option value="duration_asc">Shortest Duration First</option>
                        <option value="duration_desc">Longest Duration First</option>
                        <option value="created_desc">Newest Added</option>
                      </select>
                    </div>

                    {/* License & Channels */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        License & Channel
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={licenseFilter}
                          onChange={(e) => setLicenseFilter(e.target.value as LicenseFilter)}
                          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-color,#FF3B30)] cursor-pointer"
                        >
                          <option value="all">All Licenses</option>
                          <option value="cc0">Creative Commons 0 (Public Domain)</option>
                          <option value="by">Attribution (CC-BY)</option>
                        </select>

                        <select
                          value={channelFilter}
                          onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                          className="w-28 bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-color,#FF3B30)] cursor-pointer"
                        >
                          <option value="all">All Audio</option>
                          <option value="stereo">Stereo</option>
                          <option value="mono">Mono</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Row 2: Toggles for Loop, Min Rating, and Reset */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-800/80 gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      
                      {/* Loop Only checkbox */}
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={loopOnly}
                          onChange={(e) => setLoopOnly(e.target.checked)}
                          className="rounded bg-gray-900 border-gray-700 text-[var(--accent-color,#FF3B30)] focus:ring-0"
                        />
                        <span>Only Seamless Loops</span>
                      </label>

                      {/* Rating filter */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>Min Rating:</span>
                        {[0, 3, 4, 4.5].map((r) => (
                          <button
                            key={r}
                            onClick={() => setMinRating(r)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                              minRating === r 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            {r === 0 ? 'Any' : `${r}★+`}
                          </button>
                        ))}
                      </div>

                    </div>

                    <button
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-gray-400 hover:text-red-400 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Icons.RotateCcw size={13} />
                      <span>Reset Filters</span>
                    </button>

                  </div>

                </div>
              )}

              {/* Active Filter Badges Bar */}
              {activeFiltersCount > 0 && !isFilterDrawerOpen && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
                  
                  {durationPreset !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50 text-[11px] flex items-center gap-1">
                      Duration: {durationPreset}
                      <button onClick={() => setDurationPreset('all')} className="hover:text-white">✕</button>
                    </span>
                  )}

                  {sortOption !== 'score' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50 text-[11px] flex items-center gap-1">
                      Sort: {sortOption}
                      <button onClick={() => setSortOption('score')} className="hover:text-white">✕</button>
                    </span>
                  )}

                  {licenseFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-[11px] flex items-center gap-1">
                      License: {licenseFilter}
                      <button onClick={() => setLicenseFilter('all')} className="hover:text-white">✕</button>
                    </span>
                  )}

                  {loopOnly && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50 text-[11px] flex items-center gap-1">
                      Loops Only
                      <button onClick={() => setLoopOnly(false)} className="hover:text-white">✕</button>
                    </span>
                  )}

                  {selectedTag && (
                    <span className="px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/50 text-[11px] flex items-center gap-1">
                      Tag: #{selectedTag}
                      <button onClick={() => setSelectedTag(null)} className="hover:text-white">✕</button>
                    </span>
                  )}

                  <button 
                    onClick={handleResetFilters}
                    className="text-[11px] text-gray-400 hover:text-white underline ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}

            </div>

            {/* Results Grid Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#161616]">
              
              {/* Missing API Key Banner */}
              {!hasApiKey && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-3">
                    <Icons.Info size={20} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Freesound API Key Note</p>
                      <p className="text-amber-300/80 mt-0.5">
                        Add <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200">FREESOUND_API_KEY</code> in project settings to unlock 500k+ sounds, or use the <strong>Curated Essentials</strong> tab for instant offline sounds!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Icons.Loader2 size={36} className="animate-spin text-[var(--accent-color,#FF3B30)]" />
                  <span className="text-sm font-semibold text-white">Searching Freesound Catalog...</span>
                  <span className="text-xs text-gray-500">Applying precise audio filters and retrieving waveform data</span>
                </div>
              ) : error ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-4 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Icons.Info size={24} />
                  </div>
                  <p className="text-sm font-bold text-white">Freesound Search Error</p>
                  <p className="text-xs text-red-400/90">{error}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => executeSearch(currentPage)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all border border-gray-700"
                    >
                      Retry Search
                    </button>
                    <button
                      onClick={() => setActiveTab('essentials')}
                      className="px-4 py-2 bg-[var(--accent-color,#FF3B30)] text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Browse Curated Essentials
                    </button>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-center text-gray-400 max-w-md mx-auto">
                  <Icons.Music size={40} className="text-gray-600" />
                  <p className="text-base font-bold text-white">No sound effects matched your criteria</p>
                  <p className="text-xs text-gray-500">
                    Try broadening your search terms or clearing some duration/license filters.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold border border-gray-700 transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {searchResults.map((sound, idx) => {
                    const isSaved = savedSounds.some(s => s.url === sound.url);
                    const isPlaying = playingSoundUrl === sound.url;
                    
                    return (
                      <div 
                        key={sound.id || `${sound.name}-${idx}`} 
                        className={`bg-[#1e1e1e] border rounded-2xl p-4 flex flex-col justify-between transition-all group ${
                          isPlaying 
                            ? 'border-[var(--accent-color,#FF3B30)] shadow-[0_0_20px_rgba(255,59,48,0.2)] bg-[#222222]' 
                            : 'border-gray-800 hover:border-gray-700 hover:bg-[#202020]'
                        }`}
                      >
                        
                        {/* Top: Name & Quick Actions */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 
                                className="text-xs font-bold text-white line-clamp-1 group-hover:text-[var(--accent-color,#FF3B30)] transition-colors" 
                                title={sound.name}
                              >
                                {sound.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                {sound.username && (
                                  <span className="truncate">by <span className="text-gray-300 font-medium">{sound.username}</span></span>
                                )}
                                <span>•</span>
                                <span className="font-mono text-emerald-400 font-semibold">{formatSeconds(sound.duration || 0)}</span>
                              </div>
                            </div>

                            {/* Bookmark Star */}
                            <button 
                              onClick={() => onToggleSaveSound(sound)}
                              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                isSaved 
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' 
                                  : 'bg-black/40 text-gray-500 hover:text-white border border-gray-800 hover:bg-gray-700'
                              }`}
                              title={isSaved ? t('soundLibrary.removeFromSaved', 'Remove from Saved') : t('soundLibrary.saveToLibrary', 'Save to Library')}
                            >
                              <Icons.Star size={13} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                          </div>

                          {/* Waveform / Interactive Playbar */}
                          <div 
                            onClick={(e) => handleSeek(sound.url, e.clientX, e.currentTarget.getBoundingClientRect(), sound.duration || 0)}
                            className="relative h-12 bg-black/60 rounded-xl border border-gray-800/90 overflow-hidden cursor-pointer flex items-center group/wave mb-3"
                            title="Click or drag to seek in preview"
                          >
                            {/* Freesound waveform image if available */}
                            {sound.waveformUrl ? (
                              <img 
                                src={sound.waveformUrl} 
                                alt="waveform" 
                                className="w-full h-full object-cover opacity-60 invert group-hover/wave:opacity-80 transition-opacity" 
                              />
                            ) : (
                              /* CSS Simulated Waveform Bars */
                              <div className="w-full h-full flex items-center justify-around px-2 opacity-50">
                                {Array.from({ length: 28 }).map((_, barIdx) => {
                                  const heightPercent = Math.max(15, Math.sin((barIdx + (sound.name.length % 7)) * 0.7) * 85);
                                  return (
                                    <div 
                                      key={barIdx}
                                      className={`w-1 rounded-full transition-colors ${
                                        isPlaying ? 'bg-[var(--accent-color,#FF3B30)]' : 'bg-gray-600'
                                      }`}
                                      style={{ height: `${heightPercent}%` }}
                                    />
                                  );
                                })}
                              </div>
                            )}

                            {/* Progress Overlay */}
                            {isPlaying && (
                              <div 
                                className="absolute inset-y-0 left-0 bg-[var(--accent-color,#FF3B30)]/30 border-r-2 border-[var(--accent-color,#FF3B30)] pointer-events-none transition-all duration-75"
                                style={{
                                  width: `${Math.min(100, (currentTime / (sound.duration || currentDuration || 1)) * 100)}%`
                                }}
                              />
                            )}

                            {/* Center Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isPlaying 
                                  ? 'bg-[var(--accent-color,#FF3B30)] text-white shadow-lg scale-105' 
                                  : 'bg-black/70 text-gray-300 border border-white/20 group-hover/wave:scale-110 group-hover/wave:text-white'
                              }`}>
                                {isPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} className="ml-0.5" />}
                              </div>
                            </div>

                            {/* Timestamp Indicator */}
                            <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-gray-300 border border-gray-800">
                              {isPlaying ? `${currentTime.toFixed(1)}s / ` : ''}{formatSeconds(sound.duration || 0)}
                            </div>
                          </div>

                          {/* Tag Badges Strip */}
                          {sound.tags && sound.tags.length > 0 && (
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-3">
                              {sound.tags.slice(0, 4).map((t) => (
                                <button
                                  key={t}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(t);
                                    setCurrentPage(1);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white text-[10px] border border-gray-800 truncate"
                                  title={`Filter by tag: ${t}`}
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom: Specs & Add to Timeline Button */}
                        <div className="pt-2.5 border-t border-gray-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                            {sound.avg_rating && sound.avg_rating > 0 ? (
                              <span className="text-amber-400 font-bold">★ {sound.avg_rating.toFixed(1)}</span>
                            ) : null}
                            <span className="uppercase">{sound.type || 'WAV'}</span>
                            <span>•</span>
                            <span>{sound.channels === 1 ? 'Mono' : 'Stereo'}</span>
                          </div>

                          <button 
                            onClick={() => {
                              onSelectSound(sound.url, sound.name);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-[var(--accent-color,#FF3B30)] hover:opacity-90 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
                          >
                            <Icons.Plus size={13} />
                            <span>{t('soundLibrary.addToTimeline', 'Add to Canvas')}</span>
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Pagination Bottom Bar */}
            {searchResults.length > 0 && !isLoading && (
              <div className="px-6 py-3 bg-[#141414] border-t border-gray-800 flex items-center justify-between shrink-0 flex-wrap gap-2 text-xs">
                
                <div className="flex items-center gap-3">
                  <div className="text-gray-400 text-xs">
                    Showing <span className="font-bold text-white">{((currentPage - 1) * pageSize) + 1}–{Math.min(totalResultsCount, currentPage * pageSize)}</span> of <span className="font-bold text-white">{totalResultsCount.toLocaleString()}</span> sounds
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                    <span>Per page:</span>
                    {[24, 48].map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                          executeSearch(1);
                        }}
                        className={`px-2 py-0.5 rounded-md font-mono text-[11px] border ${
                          pageSize === size
                            ? 'bg-[var(--accent-color,#FF3B30)] text-white border-[var(--accent-color,#FF3B30)] font-bold'
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => {
                      const nextP = currentPage - 1;
                      setCurrentPage(nextP);
                      executeSearch(nextP);
                    }}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none text-gray-300 hover:text-white transition-colors border border-gray-700"
                    title="Previous Page"
                  >
                    <Icons.ChevronLeft size={16} />
                  </button>

                  <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg font-mono text-gray-300">
                    Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span>
                  </div>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      const nextP = currentPage + 1;
                      setCurrentPage(nextP);
                      executeSearch(nextP);
                    }}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none text-gray-300 hover:text-white transition-colors border border-gray-700"
                    title="Next Page"
                  >
                    <Icons.ChevronRight size={16} />
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: CURATED ESSENTIALS (INSTANT OFFLINE SFX PACK) */}
        {activeTab === 'essentials' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            
            {/* Category Side Navigation */}
            <div className="w-56 p-4 bg-[#141414] border-r border-gray-800 flex flex-col gap-1.5 shrink-0 overflow-y-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">
                SFX Categories
              </span>
              {CURATED_CATEGORIES.map((cat) => {
                const IconComponent = (Icons as any)[cat.icon] || Icons.Music;
                const isSelected = selectedEssentialsCat === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedEssentialsCat(cat.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-left ${
                      isSelected
                        ? 'bg-[var(--accent-color,#FF3B30)] text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {cat.sounds.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sound Cards Grid for Selected Category */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#161616]">
              {(() => {
                const currentCat = CURATED_CATEGORIES.find(c => c.id === selectedEssentialsCat) || CURATED_CATEGORIES[0];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{currentCat.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">High-quality royalty-free sound effects ready for immediate use</p>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                        {currentCat.sounds.length} sounds
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {currentCat.sounds.map((sound, idx) => {
                        const isSaved = savedSounds.some(s => s.url === sound.url);
                        const isPlaying = playingSoundUrl === sound.url;

                        return (
                          <div 
                            key={`${sound.name}-${idx}`}
                            className={`bg-[#1e1e1e] border rounded-2xl p-4 flex flex-col justify-between transition-all group ${
                              isPlaying 
                                ? 'border-[var(--accent-color,#FF3B30)] shadow-[0_0_20px_rgba(255,59,48,0.2)] bg-[#222222]' 
                                : 'border-gray-800 hover:border-gray-700 hover:bg-[#202020]'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <h4 className="text-xs font-bold text-white group-hover:text-[var(--accent-color,#FF3B30)] transition-colors">{sound.name}</h4>
                                  <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">{formatSeconds(sound.duration || 0)}</span>
                                </div>

                                <button 
                                  onClick={() => onToggleSaveSound(sound)}
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                    isSaved 
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' 
                                      : 'bg-black/40 text-gray-500 hover:text-white border border-gray-800 hover:bg-gray-700'
                                  }`}
                                  title="Save to favorites"
                                >
                                  <Icons.Star size={13} fill={isSaved ? "currentColor" : "none"} />
                                </button>
                              </div>

                              {/* Interactive Preview Playbar */}
                              <div 
                                onClick={(e) => handleSeek(sound.url, e.clientX, e.currentTarget.getBoundingClientRect(), sound.duration || 0)}
                                className="relative h-11 bg-black/60 rounded-xl border border-gray-800 overflow-hidden cursor-pointer flex items-center px-3 mb-3 group/playbar"
                              >
                                <div className="w-full h-full flex items-center justify-around opacity-40">
                                  {Array.from({ length: 24 }).map((_, barIdx) => (
                                    <div 
                                      key={barIdx}
                                      className={`w-1 rounded-full ${isPlaying ? 'bg-[var(--accent-color,#FF3B30)]' : 'bg-gray-500'}`}
                                      style={{ height: `${Math.max(20, Math.sin(barIdx * 0.8) * 80)}%` }}
                                    />
                                  ))}
                                </div>

                                {isPlaying && (
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-[var(--accent-color,#FF3B30)]/30 border-r-2 border-[var(--accent-color,#FF3B30)]"
                                    style={{ width: `${Math.min(100, (currentTime / (sound.duration || 1)) * 100)}%` }}
                                  />
                                )}

                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                    isPlaying ? 'bg-[var(--accent-color,#FF3B30)] text-white' : 'bg-black/80 text-gray-300 border border-white/20'
                                  }`}>
                                    {isPlaying ? <Icons.Pause size={13} /> : <Icons.Play size={13} className="ml-0.5" />}
                                  </div>
                                </div>
                              </div>

                              {sound.tags && (
                                <div className="flex gap-1 overflow-x-auto no-scrollbar mb-3">
                                  {sound.tags.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 text-[9px] border border-gray-800">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => {
                                onSelectSound(sound.url, sound.name);
                                onClose();
                              }}
                              className="w-full py-2 bg-gradient-to-r from-red-600 to-[var(--accent-color,#FF3B30)] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                            >
                              <Icons.Plus size={14} />
                              <span>{t('soundLibrary.addToTimeline', 'Add to Timeline')}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB 3: MY SAVED SOUNDS */}
        {activeTab === 'saved' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-6 bg-[#161616]">
            
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Icons.Star size={18} className="text-amber-400" fill="currentColor" />
                  <span>My Saved Library</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Your bookmarked and favorited audio clips</p>
              </div>

              {savedSounds.length > 0 && (
                <div className="w-64 relative">
                  <input
                    type="text"
                    value={savedSearchQuery}
                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                    placeholder="Search in saved sounds..."
                    className="w-full bg-black/50 border border-gray-700 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-color,#FF3B30)]"
                  />
                  <Icons.Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              )}
            </div>

            {savedSounds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center text-amber-400/40 mb-4">
                  <Icons.Star size={32} />
                </div>
                <h4 className="text-base font-bold text-white mb-1">No Saved Sounds Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mb-4">
                  Click the star icon (★) on any Freesound result or Curated SFX item to bookmark it for quick access here!
                </p>
                <button
                  onClick={() => setActiveTab('freesound')}
                  className="px-5 py-2.5 bg-[var(--accent-color,#FF3B30)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-md"
                >
                  Explore Freesound Library
                </button>
              </div>
            ) : filteredSavedSounds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <p className="text-xs">No saved sounds match "{savedSearchQuery}"</p>
                <button onClick={() => setSavedSearchQuery('')} className="text-xs text-[var(--accent-color,#FF3B30)] underline mt-2">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto pr-1">
                {filteredSavedSounds.map((sound, idx) => {
                  const isPlaying = playingSoundUrl === sound.url;

                  return (
                    <div 
                      key={`saved-${sound.name}-${idx}`}
                      className={`bg-[#1e1e1e] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                        isPlaying ? 'border-[var(--accent-color,#FF3B30)] bg-[#222222]' : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-xs font-bold text-white truncate" title={sound.name}>{sound.name}</h4>
                          <button 
                            onClick={() => onToggleSaveSound(sound)}
                            className="text-amber-400 hover:text-red-400 p-1 transition-colors"
                            title="Remove from saved"
                          >
                            <Icons.Star size={14} fill="currentColor" />
                          </button>
                        </div>

                        {/* Quick preview bar */}
                        <div 
                          onClick={() => togglePlaySound(sound.url, sound.duration)}
                          className="h-10 bg-black/60 rounded-xl border border-gray-800 flex items-center justify-between px-3 mb-3 cursor-pointer hover:bg-black/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                              isPlaying ? 'bg-[var(--accent-color,#FF3B30)]' : 'bg-gray-800'
                            }`}>
                              {isPlaying ? <Icons.Pause size={11} /> : <Icons.Play size={11} className="ml-0.5" />}
                            </div>
                            <span className="text-[11px] text-gray-300 font-medium">{isPlaying ? 'Playing...' : 'Click to preview'}</span>
                          </div>
                          {sound.duration && (
                            <span className="text-[10px] font-mono text-emerald-400">{formatSeconds(sound.duration)}</span>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          onSelectSound(sound.url, sound.name);
                          onClose();
                        }}
                        className="w-full py-2 bg-gradient-to-r from-red-600 to-[var(--accent-color,#FF3B30)] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Icons.Plus size={14} />
                        <span>Add to Animation</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: VOICE & FOLEY RECORDER STUDIO */}
        {activeTab === 'recorder' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 bg-[#161616] items-center justify-center text-center">
            
            <div className="max-w-md w-full bg-[#1e1e1e] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              
              <div>
                <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <Icons.Mic size={22} className="text-[var(--accent-color,#FF3B30)]" />
                  <span>Voice & Foley Studio</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Record custom voiceovers, dialogue, or sound effects directly from your microphone
                </p>
              </div>

              {/* Big Record VU Button / Level Indicator */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative">
                  {/* VU Level Outer Ring */}
                  <div 
                    className="absolute -inset-3 rounded-full bg-[var(--accent-color,#FF3B30)]/20 transition-transform duration-75"
                    style={{
                      transform: `scale(${1 + (micAudioLevel / 100) * 0.4})`,
                      opacity: isRecording ? 0.8 : 0
                    }}
                  />

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${
                      isRecording 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 animate-pulse' 
                        : 'bg-gradient-to-tr from-purple-600 to-[var(--accent-color,#FF3B30)]'
                    }`}
                  >
                    {isRecording ? <Icons.Square size={28} /> : <Icons.Mic size={32} />}
                  </button>
                </div>

                {/* Recording Timer */}
                <div className="mt-4 font-mono text-xl font-bold text-white tracking-widest">
                  {isRecording ? formatSeconds(recordingTime) : recordedBlobUrl ? 'Recording Ready' : '0.0s'}
                </div>

                {isRecording && (
                  <p className="text-xs text-red-400 font-semibold mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Recording live microphone audio...
                  </p>
                )}
              </div>

              {/* Recording Result Playback & Add Controls */}
              {recordedBlobUrl && !isRecording && (
                <div className="bg-black/60 rounded-2xl p-4 border border-gray-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={recordingName}
                      onChange={(e) => setRecordingName(e.target.value)}
                      placeholder="Recording name..."
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-color,#FF3B30)]"
                    />
                    <button
                      onClick={() => togglePlaySound(recordedBlobUrl, recordingTime)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-700"
                    >
                      {playingSoundUrl === recordedBlobUrl ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                      <span>{playingSoundUrl === recordedBlobUrl ? 'Pause' : 'Play'}</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (recordedBlobUrl) {
                          onSelectSound(recordedBlobUrl, recordingName || 'Voice Recording');
                          onClose();
                        }
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-red-600 to-[var(--accent-color,#FF3B30)] text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Icons.Plus size={16} />
                      <span>Add to Timeline</span>
                    </button>

                    <button
                      onClick={() => {
                        if (recordedBlobUrl) {
                          onToggleSaveSound({
                            name: recordingName || 'Voice Recording',
                            url: recordedBlobUrl,
                            duration: recordingTime,
                            tags: ['voice', 'recording']
                          });
                        }
                      }}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      title="Save to My Library"
                    >
                      <Icons.Star size={15} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 5: IMPORT LOCAL AUDIO */}
        {activeTab === 'import' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 bg-[#161616] items-center justify-center">
            
            <div className="max-w-lg w-full space-y-6">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDraggingFile 
                    ? 'border-[var(--accent-color,#FF3B30)] bg-[var(--accent-color,#FF3B30)]/10 scale-[1.02]' 
                    : 'border-gray-700 hover:border-gray-500 bg-[#1e1e1e]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mb-4">
                  <Icons.Upload size={28} />
                </div>

                <h4 className="text-base font-bold text-white mb-1">Import Custom Audio Files</h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  Drag and drop <code className="bg-black/50 px-1 py-0.5 rounded text-gray-300">.mp3</code>, <code className="bg-black/50 px-1 py-0.5 rounded text-gray-300">.wav</code>, <code className="bg-black/50 px-1 py-0.5 rounded text-gray-300">.ogg</code>, <code className="bg-black/50 px-1 py-0.5 rounded text-gray-300">.m4a</code> files here or browse from device
                </p>
              </div>

              {/* Imported Files List */}
              {importedSounds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Imported Sounds ({importedSounds.length})
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {importedSounds.map((sound, idx) => (
                      <div 
                        key={sound.id || idx}
                        className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => togglePlaySound(sound.url)}
                            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white shrink-0"
                          >
                            {playingSoundUrl === sound.url ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{sound.name}</p>
                            <span className="text-[10px] text-gray-400 uppercase">{sound.type}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectSound(sound.url, sound.name);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[var(--accent-color,#FF3B30)] text-white text-xs font-bold rounded-xl shrink-0 hover:opacity-90 shadow"
                        >
                          Add to Canvas
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
