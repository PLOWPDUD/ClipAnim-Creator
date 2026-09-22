import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';
import { Frame, Layer, LayerFolder, BackgroundSettings } from '../types';
import { compositeLayers } from '../utils/drawingUtils';
import { processIconToResolutions, buildIcoFileBinary, generateDefaultGameIconCanvas, convertCustomHtmlToExe } from '../utils/windowsExeExporter';
import { generateDefaultAndroidIconCanvas, convertCustomHtmlToApk, generateResizedIconPngBytes, ApkExportOptions } from '../utils/androidApkExporter';
import JSZip from 'jszip';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-seq' | 'png' | 'avi' | 'project-zip' | 'html' | 'exe' | 'desktop-package' | 'apk' | 'android-project';
export type ExportQuality = 'low' | 'medium' | 'high';

export interface ExeExportOptions {
  customIconDataUrl?: string | null;
  customIconBlob?: Blob | null;
  publisher?: string;
  gameTitle?: string;
}

export type { ApkExportOptions };

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    format: ExportFormat, 
    quality: ExportQuality, 
    transparent: boolean, 
    exeOptions?: ExeExportOptions, 
    apkOptions?: ApkExportOptions
  ) => void;
  onCancel: () => void;
  isExporting: boolean;
  progress: number;
  projectName: string;
  setProjectName: (name: string) => void;
  projectType?: 'animation' | 'painting' | 'game';
  frameCount: number;
  fps: number;
  exportedFile?: { url: string, name: string, blob: Blob } | null;
  frames?: Frame[];
  layers?: Layer[];
  layerFolders?: LayerFolder[];
  canvasSize?: { width: number; height: number };
  background?: BackgroundSettings;
  backgroundImage?: string | null;
  onOpenSpritesheetExport?: () => void;
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
  exportedFile,
  frames,
  layers,
  layerFolders,
  canvasSize,
  background,
  backgroundImage,
  onOpenSpritesheetExport
}) => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [transparent, setTransparent] = useState(false);

  // Full Movie & Painting Preview States
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [previewDurations, setPreviewDurations] = useState<number[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100%' | '150%'>('fit');

  // Windows EXE Export & Icon States
  const [isExeMode, setIsExeMode] = useState(false);
  const [exeSubTab, setExeSubTab] = useState<'project' | 'converter'>('project');
  const [customIconDataUrl, setCustomIconDataUrl] = useState<string | null>(null);
  const [customIconBlob, setCustomIconBlob] = useState<Blob | null>(null);
  const [customIconFileName, setCustomIconFileName] = useState<string | null>(null);
  const [exePublisher, setExePublisher] = useState<string>('');
  const [defaultIconUrl, setDefaultIconUrl] = useState<string>('');
  const [isGeneratingIco, setIsGeneratingIco] = useState(false);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Android APK Export & Mobile Studio States
  const [isApkMode, setIsApkMode] = useState(false);
  const [apkSubTab, setApkSubTab] = useState<'project' | 'converter'>('project');
  const [apkPackageName, setApkPackageName] = useState<string>(() => {
    const clean = projectName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'game';
    return `com.clipanim.${clean}`;
  });
  const [apkAppName, setApkAppName] = useState<string>(projectName || 'My Interactive Game');
  const [apkOrientation, setApkOrientation] = useState<'landscape' | 'portrait' | 'sensorLandscape' | 'sensor' | 'unspecified'>('landscape');
  const [apkFullscreen, setApkFullscreen] = useState<boolean>(true);
  const [apkKeepScreenOn, setApkKeepScreenOn] = useState<boolean>(true);
  const [apkVersionName, setApkVersionName] = useState<string>('1.0.0');
  const [apkVersionCode, setApkVersionCode] = useState<number>(1);
  const [apkCustomIconDataUrl, setApkCustomIconDataUrl] = useState<string | null>(null);
  const [apkCustomIconBlob, setApkCustomIconBlob] = useState<Blob | null>(null);
  const [apkCustomIconFileName, setApkCustomIconFileName] = useState<string | null>(null);
  const [apkDefaultIconUrl, setApkDefaultIconUrl] = useState<string>('');
  const [isGeneratingApkIcons, setIsGeneratingApkIcons] = useState<boolean>(false);
  const [isDraggingApkIcon, setIsDraggingApkIcon] = useState<boolean>(false);
  const apkIconInputRef = useRef<HTMLInputElement>(null);

  // HTML to APK Converter States
  const [apkConverterHtmlFile, setApkConverterHtmlFile] = useState<File | null>(null);
  const [apkConverterHtmlContent, setApkConverterHtmlContent] = useState<string>('');
  const [apkConverterTitle, setApkConverterTitle] = useState<string>('MyMobileGame');
  const [apkConverterPackage, setApkConverterPackage] = useState<string>('com.indie.mymobilegame');
  const [apkConverterOrientation, setApkConverterOrientation] = useState<'landscape' | 'portrait' | 'sensor'>('landscape');
  const [apkConverterFullscreen, setApkConverterFullscreen] = useState<boolean>(true);
  const [isApkConverting, setIsApkConverting] = useState<boolean>(false);
  const [apkConversionProgress, setApkConversionProgress] = useState<number>(0);
  const [isDraggingApkConverterFile, setIsDraggingApkConverterFile] = useState<boolean>(false);
  const apkConverterFileInputRef = useRef<HTMLInputElement>(null);

  // HTML to EXE Converter States
  const [converterHtmlFile, setConverterHtmlFile] = useState<File | null>(null);
  const [converterHtmlContent, setConverterHtmlContent] = useState<string>('');
  const [converterTitle, setConverterTitle] = useState<string>('MyGame');
  const [converterWidth, setConverterWidth] = useState<number>(1280);
  const [converterHeight, setConverterHeight] = useState<number>(720);
  const [converterFullscreen, setConverterFullscreen] = useState<boolean>(false);
  const [converterResizable, setConverterResizable] = useState<boolean>(true);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionProgress, setConversionProgress] = useState<number>(0);
  const [isDraggingConverterFile, setIsDraggingConverterFile] = useState<boolean>(false);
  const converterFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const cvs = generateDefaultGameIconCanvas(256);
      setDefaultIconUrl(cvs.toDataURL('image/png'));
    } catch (e) {
      console.warn('Could not generate default icon preview:', e);
    }

    try {
      const apkCvs = generateDefaultAndroidIconCanvas(256);
      setApkDefaultIconUrl(apkCvs.toDataURL('image/png'));
    } catch (e) {
      console.warn('Could not generate default android icon preview:', e);
    }
  }, []);

  useEffect(() => {
    if (projectName) {
      setApkAppName(projectName);
      const clean = projectName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'game';
      setApkPackageName(`com.clipanim.${clean}`);
    }
  }, [projectName]);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingScrubberRef = useRef(false);

  // Safe frame counts and FPS
  const safeFps = fps > 0 ? fps : 12;
  const totalFramesCount = frames && frames.length > 0 ? frames.length : frameCount;

  // Calculate total duration in seconds from durations array or frame count
  const totalDurationSec = previewDurations.length > 0 
    ? previewDurations.reduce((acc, d) => acc + d, 0)
    : (totalFramesCount / safeFps);

  // Calculate current elapsed time up to previewIndex
  const currentElapsedSec = previewDurations.length > 0
    ? previewDurations.slice(0, previewIndex).reduce((acc, d) => acc + d, 0)
    : (previewIndex / safeFps);

  // Format seconds to mm:ss.s or ss.ss
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = (sec % 60).toFixed(1);
    if (mins > 0) {
      return `${mins}:${remainingSec.padStart(4, '0')}s`;
    }
    return `${remainingSec}s`;
  };

  // Generate crisp FULL animation preview of ALL frames
  const handleGenerateFullPreview = useCallback(async () => {
    if (!frames || frames.length === 0 || !layers) return;
    
    setIsPreviewLoading(true);
    setRenderProgress(0);

    try {
      const origW = canvasSize?.width || 800;
      const origH = canvasSize?.height || 600;
      // High-resolution preview: crisp rendering up to 1024px for pixel sharpness
      const renderW = Math.min(origW, 1024);
      const renderH = Math.max(1, Math.round(renderW * (origH / origW)));

      const compositedUrls: string[] = [];
      const durationsSec: number[] = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const dur = (frame.durationMultiplier || 1) / safeFps;
        durationsSec.push(dur);

        const url = await compositeLayers(
          frame,
          layers,
          renderW,
          renderH,
          background || { type: 'color', color: '#ffffff' },
          backgroundImage || null,
          !transparent,
          layerFolders
        );
        compositedUrls.push(url);
        setRenderProgress(Math.round(((i + 1) / frames.length) * 100));
      }

      setPreviewFrames(compositedUrls);
      setPreviewDurations(durationsSec);
      setPreviewIndex(0);
      setIsPreviewPlaying(true);
    } catch (e) {
      console.error("Failed to generate full preview", e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [frames, layers, layerFolders, canvasSize, safeFps, background, backgroundImage, transparent]);

  // Auto-generate full preview on modal open and whenever transparency setting changes
  useEffect(() => {
    if (isOpen) {
      handleGenerateFullPreview();
    }
  }, [isOpen, transparent, handleGenerateFullPreview]);

  // Animation loop playback ticker for full animation preview
  useEffect(() => {
    if (!isOpen || !isPreviewPlaying || previewFrames.length === 0 || isPreviewLoading) {
      return;
    }

    const currentDurationMs = ((previewDurations[previewIndex] || (1 / safeFps)) * 1000) / playbackSpeed;

    const timer = setTimeout(() => {
      setPreviewIndex((prev) => {
        if (prev >= previewFrames.length - 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPreviewPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, Math.max(15, currentDurationMs));

    return () => clearTimeout(timer);
  }, [isOpen, isPreviewPlaying, previewIndex, previewFrames, previewDurations, isPreviewLoading, safeFps, playbackSpeed, isLooping]);

  // Interactive scrubber click and drag handling
  const handleScrubberInteraction = (clientX: number) => {
    if (!scrubberRef.current || previewFrames.length <= 1) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetIdx = Math.min(previewFrames.length - 1, Math.floor(pos * previewFrames.length));
    setPreviewIndex(targetIdx);
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingScrubberRef.current = true;
    handleScrubberInteraction(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingScrubberRef.current) {
        handleScrubberInteraction(moveEvent.clientX);
      }
    };

    const onMouseUp = () => {
      isDraggingScrubberRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard navigation inside preview (Space = Play/Pause, Left/Right = Frame step, L = Loop, F = Theater, Esc = Exit)
  useEffect(() => {
    if (!isOpen || isExporting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPreviewPlaying(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPreviewPlaying(false);
        setPreviewIndex(prev => (prev - 1 + previewFrames.length) % Math.max(1, previewFrames.length));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPreviewPlaying(false);
        setPreviewIndex(prev => (prev + 1) % Math.max(1, previewFrames.length));
      } else if (e.key.toLowerCase() === 'l') {
        setIsLooping(prev => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        setIsTheaterMode(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isTheaterMode) {
          setIsTheaterMode(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, previewFrames.length, isTheaterMode, onClose]);

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

    const median = (window as any).median || (window as any).gonative;
    if (median?.share?.file) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
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

    try {
      if (navigator.share) {
        const file = new File([exportedFile.blob], exportedFile.name, { type: exportedFile.blob.type });
        const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
        
        if (canShareFiles) {
          await navigator.share({
            title: t('export.shareTitle', 'Exported Animation'),
            text: t('export.shareTextDefault', 'Check out my animation!'),
            files: [file]
          });
        } else {
          await navigator.share({
            title: t('export.shareTitle', 'Exported Animation'),
            text: t('export.shareTextWithName', { name: projectName }),
            url: window.location.href
          });
        }
      } else {
        alert(t('export.shareNotSupported', 'Direct sharing is not supported on this browser.'));
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError' || (e as Error).name === 'NotAllowedError') {
        return;
      }
      console.error("Share failed:", e);
      alert(t('export.shareFailed', 'Sharing failed.'));
    }
  };

  const handleIconFile = (file: File) => {
    if (!file) return;
    setCustomIconBlob(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCustomIconDataUrl(reader.result as string);
      setCustomIconFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleConverterFile = (file: File) => {
    if (!file) return;
    setConverterHtmlFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (baseName) setConverterTitle(baseName);

    const reader = new FileReader();
    reader.onload = () => {
      setConverterHtmlContent(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleConvertHtmlToExe = async () => {
    if (!converterHtmlContent.trim()) {
      alert('Please upload or provide HTML content first.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(10);
    try {
      const result = await convertCustomHtmlToExe({
        htmlContent: converterHtmlContent,
        gameTitle: converterTitle || 'MyConvertedApp',
        width: converterWidth,
        height: converterHeight,
        fullscreen: converterFullscreen,
        resizable: converterResizable,
        customIconBlob: customIconBlob,
        onProgress: (pct) => setConversionProgress(pct),
      });

      // Trigger download of the generated Windows App zip
      const a = document.createElement('a');
      a.href = result.url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(result.url), 10000);
    } catch (err) {
      console.error('Conversion failed:', err);
      alert('Failed to convert HTML to Windows Executable.');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const handleUseFrame1AsIcon = () => {
    if (previewFrames && previewFrames.length > 0) {
      setCustomIconDataUrl(previewFrames[0]);
      setCustomIconFileName('Frame1_Artwork.png');
    }
  };

  const handleApkIconFile = (file: File) => {
    if (!file) return;
    setApkCustomIconBlob(file);
    const reader = new FileReader();
    reader.onload = () => {
      setApkCustomIconDataUrl(reader.result as string);
      setApkCustomIconFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleUseFrame1AsApkIcon = () => {
    if (previewFrames && previewFrames.length > 0) {
      setApkCustomIconDataUrl(previewFrames[0]);
      setApkCustomIconFileName('Frame1_Artwork.png');
    }
  };

  const handleDownloadApkIconPack = async () => {
    setIsGeneratingApkIcons(true);
    try {
      const zip = new JSZip();
      const densities = [
        { folder: 'mipmap-mdpi', size: 48 },
        { folder: 'mipmap-hdpi', size: 72 },
        { folder: 'mipmap-xhdpi', size: 96 },
        { folder: 'mipmap-xxhdpi', size: 144 },
        { folder: 'mipmap-xxxhdpi', size: 192 },
      ];

      for (const d of densities) {
        const pngBytes = await generateResizedIconPngBytes(apkCustomIconDataUrl, d.size);
        zip.file(`res/${d.folder}/ic_launcher.png`, pngBytes);
        zip.file(`res/${d.folder}/ic_launcher_round.png`, pngBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'Game';
      a.download = `${cleanName}_Android_Icons.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('Failed to generate Android icon pack:', err);
      alert('Failed to generate Android icon pack.');
    } finally {
      setIsGeneratingApkIcons(false);
    }
  };

  const handleApkConverterFile = (file: File) => {
    if (!file) return;
    setApkConverterHtmlFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (baseName) {
      setApkConverterTitle(baseName);
      const cleanPkg = baseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'game';
      setApkConverterPackage(`com.indie.${cleanPkg}`);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setApkConverterHtmlContent(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleConvertHtmlToApk = async () => {
    if (!apkConverterHtmlContent.trim()) {
      alert('Please upload or provide HTML content first.');
      return;
    }

    setIsApkConverting(true);
    setApkConversionProgress(10);
    try {
      const result = await convertCustomHtmlToApk({
        htmlContent: apkConverterHtmlContent,
        gameTitle: apkConverterTitle || 'MyMobileGame',
        packageName: apkConverterPackage || 'com.indie.mymobilegame',
        orientation: apkConverterOrientation,
        fullscreen: apkConverterFullscreen,
        customIconBlob: apkCustomIconBlob,
        onProgress: (pct) => setApkConversionProgress(pct),
      });

      const a = document.createElement('a');
      a.href = result.url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(result.url), 10000);
    } catch (err) {
      console.error('APK conversion failed:', err);
      alert('Failed to convert HTML to Android APK.');
    } finally {
      setIsApkConverting(false);
      setApkConversionProgress(0);
    }
  };

  const handleDownloadStandaloneIco = async () => {
    setIsGeneratingIco(true);
    try {
      const resolutions = [16, 32, 48, 64, 128, 256];
      const icons = await processIconToResolutions(customIconDataUrl, resolutions);
      const icoBytes = buildIcoFileBinary(icons);
      const icoBlob = new Blob([icoBytes.buffer as ArrayBuffer], { type: 'image/x-icon' });
      const url = URL.createObjectURL(icoBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').trim() || 'Game';
      a.download = `${cleanName}.ico`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('Failed to generate .ico:', err);
      alert('Failed to generate .ico file.');
    } finally {
      setIsGeneratingIco(false);
    }
  };

  const allFormats: { id: ExportFormat; label: string; icon: React.ElementType; color: string; desc: string; badge?: string }[] = [
    { id: 'mp4', label: t('export.mp4', 'MP4 Video'), icon: Icons.FileVideo, color: 'text-blue-400', desc: t('export.mp4Desc', 'High quality H.264 standard video for YouTube, Instagram, and TikTok'), badge: 'Standard' },
    { id: 'webm', label: t('export.webm', 'WebM Video'), icon: Icons.FileVideo, color: 'text-emerald-400', desc: t('export.webmDesc', 'Lightweight modern web video format with optional alpha transparency'), badge: 'Alpha Ready' },
    { id: 'gif', label: t('export.gif', 'Animated GIF'), icon: Icons.Image, color: 'text-amber-400', desc: t('export.gifDesc', 'Looping animated GIF perfect for Discord, Reddit, and stickers'), badge: 'Looping' },
    { id: 'png-seq', label: t('export.pngSeq', 'PNG Sequence (.zip)'), icon: Icons.FileArchive, color: 'text-rose-400', desc: t('export.pngSeqDesc', 'Lossless transparent frame images zipped for Premiere, After Effects, Blender'), badge: 'Pro Zip' },
    { id: 'png', label: t('export.png', 'PNG Image'), icon: Icons.Image, color: 'text-purple-400', desc: t('export.pngDesc', 'Export full-resolution crisp static PNG artwork'), badge: 'Single Frame' },
    { id: 'apk', label: t('export.apk', 'Android Mobile App (.apk)'), icon: Icons.Smartphone, color: 'text-emerald-400', desc: t('export.apkDesc', 'Direct installable Android APK with custom launcher icon, touch controls, and full-screen immersive mode'), badge: 'Android APK' },
    { id: 'exe', label: t('export.exe', 'Windows Standalone Game (.exe)'), icon: Icons.Monitor, color: 'text-violet-400', desc: t('export.exeDesc', 'Native Windows binary executable (.exe) with custom icon for direct desktop launching'), badge: 'Desktop EXE' },
    { id: 'html', label: t('export.html', 'Playable HTML5 Game (.html)'), icon: Icons.Gamepad2, color: 'text-cyan-400', desc: t('export.htmlDesc', 'Self-contained offline playable interactive game file for itch.io or web sharing'), badge: 'Interactive' },
    { id: 'project-zip', label: t('export.projectZip', 'Project Backup (.zip)'), icon: Icons.FileArchive, color: 'text-purple-400', desc: t('export.projectZipDesc', 'Complete editable project archive with all frames, layers, audio, and settings'), badge: 'Full Source' },
    { id: 'avi', label: t('export.avi', 'AVI Video'), icon: Icons.FileVideo, color: 'text-indigo-400', desc: t('export.aviDesc', 'Raw video container for legacy desktop video editors') },
  ];

  const formats = projectType === 'painting' 
    ? allFormats.filter(f => f.id === 'png' || f.id === 'project-zip') 
    : allFormats.filter(f => f.id !== 'png');

  const qualityOptions: { id: ExportQuality; label: string; desc: string }[] = [
    { id: 'low', label: t('export.low', 'Fast / Compact'), desc: t('export.lowDesc', 'Lower bitrate, smallest file size for quick previews and chats') },
    { id: 'medium', label: t('export.medium', 'Standard HD (Recommended)'), desc: t('export.mediumDesc', 'Balanced crisp sharpness and efficient file size for web & social') },
    { id: 'high', label: t('export.high', 'Maximum Quality / Master'), desc: t('export.highDesc', 'Highest bitrate and crystal-clear frames for master archives') },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-2 sm:p-4 md:p-6 select-none">
      
      {/* Main Large Modal Container */}
      <div className={`bg-[#181818] w-[1120px] max-w-[98vw] ${isTheaterMode ? 'h-[96vh]' : 'max-h-[94vh]'} rounded-3xl shadow-2xl border border-gray-700/80 flex flex-col overflow-hidden relative transition-all duration-300`}>
        
        {/* Export Progress Overlay */}
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-[#141414]/98 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className="w-20 h-20 rounded-full border-4 border-gray-800 border-t-[#FF3B30] animate-spin mb-6 shadow-[0_0_30px_rgba(255,59,48,0.3)]" />
             <h2 className="text-3xl font-bold text-white mb-2">{t('export.rendering', 'Rendering Full Animation...')}</h2>
             <p className="text-gray-400 text-sm mb-6 max-w-md">{t('export.renderingDesc', 'Compositing all layers, audio, and encoding movie file with high-definition frames.')}</p>
             
             <div className="w-full max-w-md bg-gray-800 h-3.5 rounded-full overflow-hidden mb-3 border border-gray-700">
                <div 
                    className="h-full bg-gradient-to-r from-red-500 to-[#FF3B30] transition-all duration-300 shadow-[0_0_15px_rgba(255,59,48,0.7)]" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
             
             <div className="flex items-center gap-3 text-sm font-mono text-gray-400 mb-8">
               <span className="font-bold text-white">{progress}%</span>
               <span>•</span>
               <span>{frameCount} Frames Total</span>
             </div>

             <button 
                 onClick={onCancel}
                 className="px-8 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-all border border-gray-700 shadow-md"
             >
                 {t('common.cancel', 'Cancel Export')}
             </button>
          </div>
        )}

        {/* Success Finished Overlay */}
        {!isExporting && exportedFile && (
          <div className="absolute inset-0 z-50 bg-[#141414]/98 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
             <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
               exportedFile.name.endsWith('.exe') 
                 ? 'bg-violet-500/20 border border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.35)]' 
                 : exportedFile.name.endsWith('.apk')
                 ? 'bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
                 : 'bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
             }`}>
                 {exportedFile.name.endsWith('.exe') ? (
                   <Icons.Monitor className="text-violet-400" size={48} />
                 ) : exportedFile.name.endsWith('.apk') ? (
                   <Icons.Smartphone className="text-emerald-400" size={48} />
                 ) : (
                   <Icons.Check className="text-emerald-400" size={48} />
                 )}
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">
               {exportedFile.name.endsWith('.exe') 
                 ? 'Windows .exe Binary Generated!' 
                 : exportedFile.name.endsWith('.apk')
                 ? 'Android Package (.apk) Generated!'
                 : exportedFile.name.includes('AndroidStudio')
                 ? 'Android Studio Project Generated!'
                 : t('export.success', 'Export Complete!')}
             </h2>
             <p className="text-gray-400 text-sm mb-4 max-w-md">
               {exportedFile.name.endsWith('.exe')
                 ? 'Your native Windows game executable (.exe) has been built with your custom embedded icon. Double-click to launch and play on Windows!'
                 : exportedFile.name.endsWith('.apk')
                 ? 'Your ready-to-install Android APK has been built with your custom launcher icon, orientation lock, and hardware acceleration.'
                 : exportedFile.name.includes('AndroidStudio')
                 ? 'Complete Android Studio project with Gradle 8, Kotlin, and WebView runtime is ready for building release AAB packages for the Google Play Store.'
                 : t('export.successDesc', 'Your file has been rendered and is ready to download or share.')}
             </p>

             {exportedFile.name.endsWith('.apk') && (
               <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 max-w-md text-left mb-6 text-xs text-gray-300 space-y-1.5 shadow-inner">
                 <div className="flex items-center gap-2 text-emerald-400 font-bold">
                   <Icons.Info size={15} />
                   <span>How to Install on Android Device</span>
                 </div>
                 <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
                   <li>Download the <span className="font-mono text-emerald-300">.apk</span> onto your Android phone or tablet.</li>
                   <li>Open the file from notifications or <span className="font-semibold text-white">Files / Downloads</span>.</li>
                   <li>If prompted <span className="italic text-amber-300">"Install unknown apps"</span>, tap <span className="font-semibold text-white">Settings</span> and toggle <span className="font-semibold text-emerald-300">"Allow from this source"</span>.</li>
                   <li>Tap <span className="font-semibold text-emerald-400">Install</span> and your custom icon will appear right on your home screen!</li>
                 </ol>
               </div>
             )}
             
             <div className="flex flex-wrap gap-4 justify-center">
                 {!exportedFile.name.endsWith('.exe') && (
                   <button 
                       onClick={handleShare}
                       className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-[#FF3B30] hover:opacity-90 text-white font-bold transition-all flex items-center gap-2.5 shadow-[0_0_25px_rgba(255,59,48,0.4)] hover:scale-105 active:scale-95"
                   >
                       <Icons.Share2 size={20} />
                       <span>{t('common.share', 'Share File')}</span>
                   </button>
                 )}
                 <button 
                     onClick={handleDownload}
                     className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2.5 shadow-lg hover:scale-105 active:scale-95 text-white ${
                       exportedFile.name.endsWith('.exe')
                         ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(139,92,246,0.5)]'
                         : exportedFile.name.endsWith('.apk')
                         ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                         : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                     }`}
                 >
                     <Icons.Download size={20} />
                     <span>
                       {exportedFile.name.endsWith('.exe') 
                         ? 'Download Windows .exe' 
                         : exportedFile.name.endsWith('.apk')
                         ? 'Download Android .apk'
                         : t('common.download', 'Download File')}
                     </span>
                 </button>
             </div>
             
             <button 
                 onClick={onClose}
                 className="mt-8 px-6 py-2.5 rounded-full text-gray-400 hover:text-white text-xs font-bold transition-colors hover:bg-gray-800"
             >
                 {t('common.close', 'Return to Canvas')}
             </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#141414] border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-[#FF3B30] flex items-center justify-center text-white shadow-md">
              <Icons.Clapperboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {projectType === 'painting' ? 'Export Painting & Artwork' : t('export.makeMovie', 'Export Movie & Animation')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gray-800 text-gray-300 border border-gray-700">
                  {projectType === 'painting' ? 'Painting' : projectType === 'game' ? 'Game Project' : 'Full Movie'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Preview full composition, timeline playback, and select output format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTheaterMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isTheaterMode 
                  ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40 shadow-sm' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
              }`}
              title="Toggle Full Preview Theater Mode (F)"
            >
              {isTheaterMode ? <Icons.Minimize2 size={15} /> : <Icons.Maximize2 size={15} />}
              <span>{isTheaterMode ? 'Exit Theater' : 'Full Theater Preview'}</span>
            </button>

            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors"
              title="Close (Esc)"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body: Split between Full Cinema Preview (Left) and Export Formats & Options (Right) */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT PANEL: FULL PREVIEW CINEMA STAGE */}
          <div className={`${isTheaterMode ? 'w-full' : 'w-full lg:w-[58%]'} p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col bg-[#161616] overflow-y-auto no-scrollbar`}>
            
            {/* Viewport Header Bar with Project Info & Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs font-bold text-gray-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Full Preview
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/40 text-gray-400 text-[11px] font-mono border border-gray-800">
                  {canvasSize?.width || 800} × {canvasSize?.height || 600}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/40 text-gray-400 text-[11px] font-mono border border-gray-800">
                  {totalFramesCount} {totalFramesCount === 1 ? 'Frame' : 'Frames'} • {safeFps} FPS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-red-950/40 text-red-300 text-[11px] font-mono border border-red-800/40 font-semibold">
                  {formatTime(totalDurationSec)} Full Duration
                </span>
              </div>

              {/* Refresh / Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800 text-[10px] font-bold">
                  {(['fit', '100%', '150%'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setZoomLevel(lvl)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        zoomLevel === lvl 
                          ? 'bg-gray-700 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={`Zoom ${lvl}`}
                    >
                      {lvl === 'fit' ? 'Fit' : lvl}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateFullPreview}
                  disabled={isPreviewLoading}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  title="Re-render Full Preview"
                >
                  <Icons.RotateCw size={15} className={isPreviewLoading ? 'animate-spin text-[#FF3B30]' : ''} />
                </button>
              </div>
            </div>

            {/* Main Stage Viewport Box */}
            <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] md:min-h-[360px] max-h-[520px] rounded-2xl bg-[#0e0e0e] border border-gray-800/90 shadow-2xl flex items-center justify-center overflow-hidden group">
              
              {/* Checkerboard Pattern for Alpha Backgrounds */}
              <div 
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
                    linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
                    linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                }}
              />

              {/* Canvas Preview Image / Loading State */}
              {isPreviewLoading ? (
                <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
                  <Icons.Loader2 size={36} className="animate-spin text-[#FF3B30]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Rendering Full Preview...</p>
                    <p className="text-xs text-gray-400 font-mono">
                      Compositing high-res layers ({renderProgress}%)
                    </p>
                  </div>
                  <div className="w-48 bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700 mt-1">
                    <div className="bg-[#FF3B30] h-full transition-all duration-150" style={{ width: `${renderProgress}%` }} />
                  </div>
                </div>
              ) : previewFrames.length > 0 ? (
                <div className="relative z-10 w-full h-full flex items-center justify-center p-3">
                  <img 
                    src={previewFrames[previewIndex] || previewFrames[0]} 
                    alt={`Frame ${previewIndex + 1}`} 
                    className="max-w-full max-h-full object-contain select-none drop-shadow-2xl transition-transform duration-150"
                    style={{
                      transform: zoomLevel === '150%' ? 'scale(1.5)' : zoomLevel === '100%' ? 'scale(1.0)' : 'none'
                    }}
                  />

                  {/* Hover Floating Overlay Buttons for Fast Play / Pause */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPreviewPlaying(!isPreviewPlaying);
                      }}
                      className="p-3.5 rounded-full bg-[#FF3B30] hover:bg-[#FF453A] text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                      title={isPreviewPlaying ? "Pause (Space)" : "Play (Space)"}
                    >
                      {isPreviewPlaying ? <Icons.Pause size={22} /> : <Icons.Play size={22} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-2 text-gray-500 p-6 text-center">
                  <Icons.Clapperboard size={32} />
                  <p className="text-xs">No frames available to preview.</p>
                </div>
              )}

              {/* Top-Right Resolution & Format Stamp */}
              <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-300 tracking-wider uppercase shadow-lg">
                  {transparent ? 'Alpha / Transparent' : 'Composite RGB'}
                </span>
              </div>
            </div>

            {/* INTERACTIVE FULL TIMELINE SCRUBBER */}
            <div className="mt-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-3.5 space-y-3">
              
              {/* Scrubbing Bar with Frame Segments & Playhead */}
              <div 
                ref={scrubberRef}
                onMouseDown={handleScrubberMouseDown}
                className="relative h-6 bg-black/60 rounded-xl overflow-hidden cursor-pointer border border-gray-800 flex items-center group/scrubber select-none"
                title="Click or drag to scrub through all frames"
              >
                {/* Visual Segments for all frames */}
                <div className="absolute inset-0 flex">
                  {previewFrames.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-full flex-1 border-r border-black/40 transition-colors ${
                        idx <= previewIndex ? 'bg-gradient-to-r from-red-600/80 to-[#FF3B30]' : 'bg-gray-800/40 hover:bg-gray-700/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Draggable Playhead Pin */}
                {previewFrames.length > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] border border-gray-900 transition-all pointer-events-none z-10"
                    style={{
                      left: `${((previewIndex + 0.5) / Math.max(1, previewFrames.length)) * 100}%`
                    }}
                  />
                )}
              </div>

              {/* Master Playback Controls Deck */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                
                {/* Step / Play / Jump Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(0);
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Jump to Start"
                  >
                    <Icons.SkipBack size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(prev => (prev - 1 + previewFrames.length) % Math.max(1, previewFrames.length));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Previous Frame (Left Arrow)"
                  >
                    <Icons.ChevronLeft size={18} />
                  </button>

                  <button
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    className="px-4 py-2 rounded-xl bg-[#FF3B30] hover:bg-[#FF453A] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
                    title="Play/Pause (Spacebar)"
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Icons.Pause size={16} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Icons.Play size={16} className="ml-0.5" />
                        <span>Play Full</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(prev => (prev + 1) % Math.max(1, previewFrames.length));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Next Frame (Right Arrow)"
                  >
                    <Icons.ChevronRight size={18} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewIndex(Math.max(0, previewFrames.length - 1));
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Jump to End"
                  >
                    <Icons.SkipForward size={16} />
                  </button>
                </div>

                {/* Timecode & Frame Indicator */}
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-gray-800 font-mono text-xs text-gray-300">
                  <span className="font-bold text-white">
                    {formatTime(currentElapsedSec)}
                  </span>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-400">
                    {formatTime(totalDurationSec)}
                  </span>
                  <span className="text-gray-700">|</span>
                  <span className="text-red-400 font-semibold">
                    Frame {previewIndex + 1} / {totalFramesCount}
                  </span>
                </div>

                {/* Loop and Speed Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                      isLooping 
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm' 
                        : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                    }`}
                    title="Toggle Loop Playback (L)"
                  >
                    <Icons.Repeat size={14} />
                    <span className="text-[11px] hidden sm:inline">{isLooping ? 'Looping' : 'Once'}</span>
                  </button>

                  {/* Playback Speed Pill */}
                  <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700 text-[11px] font-bold">
                    {[0.5, 1, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          playbackSpeed === spd 
                            ? 'bg-[#FF3B30] text-white shadow' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Quick Keyboard Reference Banner */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 px-1">
              <span>Shortcuts: <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">Space</kbd> Play/Pause • <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">←</kbd> <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">→</kbd> Step Frame • <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">F</kbd> Theater</span>
              <span className="text-emerald-400/80 font-medium">100% Full Timeline Loaded</span>
            </div>

          </div>

          {/* RIGHT PANEL: EXPORT FORMATS & SETTINGS */}
          <div className={`${isTheaterMode ? 'hidden' : 'w-full lg:w-[42%]'} p-6 sm:p-7 flex flex-col bg-[#1a1a1a] overflow-y-auto no-scrollbar`}>
            
            {isApkMode ? (
              /* ANDROID MOBILE & APK CONFIGURATION STUDIO */
              <div className="space-y-4 flex flex-col h-full animate-in fade-in duration-200">
                {/* Header with Back button & Sub-tabs */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 flex-wrap gap-2">
                  <button
                    onClick={() => setIsApkMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800 transition-colors"
                  >
                    <Icons.ChevronLeft size={16} />
                    <span>Back to Formats</span>
                  </button>

                  {/* Mode Sub-Tabs */}
                  <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs font-semibold">
                    <button
                      onClick={() => setApkSubTab('project')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        apkSubTab === 'project'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Project to .APK
                    </button>
                    <button
                      onClick={() => setApkSubTab('converter')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                        apkSubTab === 'converter'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icons.Sparkles size={12} />
                      <span>HTML to APK Converter</span>
                    </button>
                  </div>
                </div>

                {apkSubTab === 'project' ? (
                  <>
                    {/* Title and Explanation */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Icons.Smartphone className="text-emerald-400" size={20} />
                          Android Mobile App (.apk)
                        </h3>
                        <span className="text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Icons.Check size={11} />
                          Universal: Phone, Tablet & TV
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Direct installable APK compatible with all Android versions (5.0+ to Android 15/16), phones, 7" & 10" tablets, and foldables.
                      </p>
                    </div>

                    {/* Compatibility Features Badges */}
                    <div className="grid grid-cols-3 gap-1.5 py-1 text-[10px]">
                      <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-800 px-2 py-1 rounded-lg text-gray-300">
                        <Icons.Check className="text-emerald-400 shrink-0" size={12} />
                        <span className="truncate">All Tablets & Phones</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-800 px-2 py-1 rounded-lg text-gray-300">
                        <Icons.Check className="text-emerald-400 shrink-0" size={12} />
                        <span className="truncate">Android 5.0 to 15+</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-800 px-2 py-1 rounded-lg text-gray-300">
                        <Icons.Check className="text-emerald-400 shrink-0" size={12} />
                        <span className="truncate">Hardware Accelerated</span>
                      </div>
                    </div>

                    {/* ICON UPLOAD & REALISTIC ANDROID SMARTPHONE SIMULATOR */}
                    <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-3.5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Icons.Sparkles size={13} className="text-emerald-400" />
                          Android Launcher Icon (Adaptive Squircle)
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {apkCustomIconDataUrl ? 'Custom Icon Active' : 'Default Android Icon'}
                        </span>
                      </div>

                      {/* Phone Simulator Display */}
                      <div className="relative rounded-2xl p-4 bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 border border-gray-800 shadow-xl overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                        {/* Android Status Bar Mockup */}
                        <div className="w-full flex items-center justify-between text-[10px] text-gray-400 font-mono px-2 pb-3 opacity-70">
                          <span>12:00</span>
                          <div className="w-2.5 h-2.5 rounded-full bg-black border border-gray-700 shadow-inner" />
                          <div className="flex items-center gap-1.5">
                            <span>5G</span>
                            <span className="text-emerald-400">100%</span>
                          </div>
                        </div>

                        {/* Interactive App Launcher Icon */}
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group/icon cursor-pointer" onClick={() => apkIconInputRef.current?.click()}>
                            <div className="w-16 h-16 rounded-[22%] bg-gradient-to-tr from-gray-800 to-gray-700 p-1 shadow-2xl ring-2 ring-emerald-500/40 group-hover/icon:ring-emerald-400 transition-all transform group-hover/icon:scale-105 flex items-center justify-center overflow-hidden">
                              <img 
                                src={apkCustomIconDataUrl || apkDefaultIconUrl} 
                                alt="Android Launcher Icon" 
                                className="w-full h-full object-cover rounded-[18%]"
                              />
                            </div>
                            <div className="absolute inset-0 rounded-[22%] bg-black/40 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-bold">
                              Change
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-white truncate max-w-[150px] text-center">
                            {apkAppName || projectName || 'My Game'}
                          </span>
                        </div>

                        {/* Density badges */}
                        <div className="w-full flex items-center justify-center gap-1.5 pt-3 text-[9px] text-gray-500 font-mono">
                          <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/60">xxxhdpi (192px)</span>
                          <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/60">xxhdpi</span>
                          <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/60">xhdpi</span>
                          <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/60">hdpi</span>
                        </div>
                      </div>

                      {/* Icon Upload Zone & Controls */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingApkIcon(true); }}
                        onDragLeave={() => setIsDraggingApkIcon(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingApkIcon(false);
                          if (e.dataTransfer.files?.[0]) {
                            handleApkIconFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => apkIconInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2.5 ${
                          isDraggingApkIcon 
                            ? 'border-emerald-400 bg-emerald-950/30' 
                            : 'border-gray-700 hover:border-emerald-500/70 hover:bg-gray-800/50'
                        }`}
                      >
                        <input 
                          ref={apkIconInputRef}
                          type="file" 
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleApkIconFile(e.target.files[0]);
                          }}
                          className="hidden" 
                        />
                        <Icons.Upload size={16} className="text-emerald-400 shrink-0" />
                        <div className="text-left text-xs">
                          <div className="font-semibold text-gray-200">
                            {apkCustomIconFileName ? `Selected: ${apkCustomIconFileName}` : 'Upload Custom Icon (PNG, JPG, WebP)'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Auto-scaled to all Android mipmap densities (192, 144, 96, 72, 48px)
                          </div>
                        </div>
                      </div>

                      {/* Quick Icon Helpers */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={handleUseFrame1AsApkIcon}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Icons.Image size={13} className="text-emerald-400" />
                          <span>Use Frame 1 Drawing</span>
                        </button>

                        {apkCustomIconDataUrl && (
                          <button
                            onClick={() => {
                              setApkCustomIconDataUrl(null);
                              setApkCustomIconBlob(null);
                              setApkCustomIconFileName(null);
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Icons.Trash2 size={13} />
                            <span>Reset</span>
                          </button>
                        )}

                        <button
                          onClick={handleDownloadApkIconPack}
                          disabled={isGeneratingApkIcons}
                          className="py-1.5 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-emerald-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          title="Download all Android icon resolutions in a ZIP"
                        >
                          {isGeneratingApkIcons ? (
                            <Icons.RotateCw size={13} className="animate-spin text-emerald-400" />
                          ) : (
                            <Icons.FileArchive size={13} />
                          )}
                          <span>Get Icons (.zip)</span>
                        </button>
                      </div>
                    </div>

                    {/* Android App Package Configuration */}
                    <div className="space-y-3 bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            App Name
                          </label>
                          <input 
                            type="text" 
                            value={apkAppName}
                            onChange={(e) => setApkAppName(e.target.value)}
                            placeholder="Game Name"
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-semibold border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Package ID (Java / Kotlin)
                          </label>
                          <input 
                            type="text" 
                            value={apkPackageName}
                            onChange={(e) => setApkPackageName(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                            placeholder="com.indie.game"
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Version Name & Code Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Version Name
                          </label>
                          <input 
                            type="text" 
                            value={apkVersionName}
                            onChange={(e) => setApkVersionName(e.target.value)}
                            placeholder="1.0.0"
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Version Code
                          </label>
                          <input 
                            type="number" 
                            min="1"
                            value={apkVersionCode}
                            onChange={(e) => setApkVersionCode(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Screen Orientation Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Screen Orientation Lock
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => setApkOrientation('landscape')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              apkOrientation === 'landscape' || apkOrientation === 'sensorLandscape'
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            Landscape (Game)
                          </button>
                          <button
                            onClick={() => setApkOrientation('portrait')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              apkOrientation === 'portrait'
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            Portrait (Vertical)
                          </button>
                          <button
                            onClick={() => setApkOrientation('sensor')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              apkOrientation === 'sensor' || apkOrientation === 'unspecified'
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            Auto-Rotate
                          </button>
                        </div>
                      </div>

                      {/* Immersive & WakeLock Toggles */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={apkFullscreen}
                            onChange={(e) => setApkFullscreen(e.target.checked)}
                            className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Immersive Fullscreen</span>
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={apkKeepScreenOn}
                            onChange={(e) => setApkKeepScreenOn(e.target.checked)}
                            className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Keep Screen Awake</span>
                        </label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 mt-auto space-y-2">
                      <button
                        onClick={() => onExport('apk', quality, transparent, undefined, {
                          customIconDataUrl: apkCustomIconDataUrl,
                          customIconBlob: apkCustomIconBlob,
                          packageName: apkPackageName,
                          appName: apkAppName,
                          versionName: apkVersionName,
                          versionCode: apkVersionCode,
                          orientation: apkOrientation,
                          fullscreen: apkFullscreen,
                          keepScreenOn: apkKeepScreenOn,
                        })}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Icons.Download size={18} />
                        <span>Compile & Export Android .apk</span>
                      </button>

                      <button
                        onClick={() => onExport('android-project', quality, transparent, undefined, {
                          customIconDataUrl: apkCustomIconDataUrl,
                          customIconBlob: apkCustomIconBlob,
                          packageName: apkPackageName,
                          appName: apkAppName,
                          versionName: apkVersionName,
                          versionCode: apkVersionCode,
                          orientation: apkOrientation,
                          fullscreen: apkFullscreen,
                          keepScreenOn: apkKeepScreenOn,
                        })}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 text-xs font-semibold flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Icons.Package size={15} className="text-emerald-400" />
                          <span>Complete Android Studio Project (.zip)</span>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Google Play / AAB</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* HTML TO APK CONVERTER INTERACTIVE TOOL */
                  <div className="space-y-3.5 flex flex-col h-full animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Icons.Sparkles className="text-emerald-400" size={20} />
                        HTML to Android APK Converter
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Convert any HTML5 game, animation, or web application into an installable Android APK (.apk).
                      </p>
                    </div>

                    {/* Drag & Drop HTML file */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingApkConverterFile(true); }}
                      onDragLeave={() => setIsDraggingApkConverterFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingApkConverterFile(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleApkConverterFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => apkConverterFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isDraggingApkConverterFile
                          ? 'border-emerald-400 bg-emerald-950/30'
                          : apkConverterHtmlFile
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'border-gray-700 hover:border-emerald-500/70 hover:bg-gray-800/50'
                      }`}
                    >
                      <input 
                        ref={apkConverterFileInputRef}
                        type="file" 
                        accept=".html,.htm,.txt" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleApkConverterFile(e.target.files[0]);
                        }}
                        className="hidden" 
                      />
                      {apkConverterHtmlFile ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                          <Icons.Check size={16} />
                          <span className="truncate max-w-[240px] font-mono">{apkConverterHtmlFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Icons.Code size={22} className="text-emerald-400" />
                          <div className="text-xs font-bold text-white">
                            Click or drag & drop HTML file to convert
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Supports .html, .htm files
                          </div>
                        </>
                      )}
                    </div>

                    {/* Android Settings for Converter */}
                    <div className="space-y-2.5 bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            App Title
                          </label>
                          <input 
                            type="text" 
                            value={apkConverterTitle}
                            onChange={(e) => setApkConverterTitle(e.target.value)}
                            placeholder="My Converted Game"
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-semibold border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Package ID
                          </label>
                          <input 
                            type="text" 
                            value={apkConverterPackage}
                            onChange={(e) => setApkConverterPackage(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                            placeholder="com.indie.game"
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Orientation
                          </label>
                          <select
                            value={apkConverterOrientation}
                            onChange={(e) => setApkConverterOrientation(e.target.value as any)}
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs border border-gray-700 hover:border-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
                          >
                            <option value="landscape">Landscape (Games)</option>
                            <option value="portrait">Portrait (Vertical)</option>
                            <option value="sensor">Auto-Rotate</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-gray-300 text-xs cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={apkConverterFullscreen}
                              onChange={(e) => setApkConverterFullscreen(e.target.checked)}
                              className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Fullscreen Mode</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Convert Button */}
                    <div className="pt-2 mt-auto">
                      <button
                        onClick={handleConvertHtmlToApk}
                        disabled={isApkConverting || !apkConverterHtmlContent}
                        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all ${
                          apkConverterHtmlContent && !isApkConverting
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        }`}
                      >
                        {isApkConverting ? (
                          <>
                            <Icons.RotateCw size={18} className="animate-spin text-emerald-300" />
                            <span>Converting to Android .apk ({apkConversionProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Icons.Sparkles size={18} />
                            <span>Convert & Download Android .apk</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isExeMode ? (
              /* WINDOWS STANDALONE EXE CONFIGURATION STUDIO */
              <div className="space-y-4 flex flex-col h-full animate-in fade-in duration-200">
                {/* Header with Back button & Sub-tabs */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 flex-wrap gap-2">
                  <button
                    onClick={() => setIsExeMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800 transition-colors"
                  >
                    <Icons.ChevronLeft size={16} />
                    <span>Back to Formats</span>
                  </button>

                  {/* Mode Sub-Tabs */}
                  <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs font-semibold">
                    <button
                      onClick={() => setExeSubTab('project')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        exeSubTab === 'project'
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Project to .EXE
                    </button>
                    <button
                      onClick={() => setExeSubTab('converter')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                        exeSubTab === 'converter'
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icons.Sparkles size={12} />
                      <span>HTML to EXE Converter</span>
                    </button>
                  </div>
                </div>

                {exeSubTab === 'project' ? (
                  <>
                    {/* Title and Explanation */}
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Icons.Monitor className="text-violet-400" size={20} />
                        Windows Game Executable (.exe)
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        100% Native Windows Application. Embeds your artwork into an isolated game window with zero Microsoft Edge browser UI, tabs, or address bars.
                      </p>
                    </div>

                    {/* ICON UPLOAD & REALISTIC WINDOWS DESKTOP SIMULATOR */}
                    <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-3.5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Icons.Sparkles size={13} className="text-violet-400" />
                          Application Icon (.ico / custom)
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {customIconDataUrl ? 'Custom Icon Active' : 'Default Gamepad Icon'}
                        </span>
                      </div>

                      {/* Windows Explorer & Desktop Realistic Preview Stage */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#161b22] to-[#0d1117] border border-gray-800 flex items-center justify-around gap-3">
                        {/* Windows Desktop Tile Simulation */}
                        <div className="flex flex-col items-center gap-1.5 group/tile">
                          <div className="relative w-16 h-16 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center shadow-lg group-hover/tile:scale-105 transition-transform">
                            <img 
                              src={customIconDataUrl || defaultIconUrl} 
                              alt="Desktop Icon" 
                              className="w-14 h-14 object-contain select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" 
                            />
                            <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border border-black shadow">
                              <Icons.Monitor size={10} />
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-gray-300 max-w-[90px] truncate text-center font-mono">
                            {projectName.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Game'}.exe
                          </span>
                        </div>

                        {/* Windows Taskbar Preview */}
                        <div className="flex flex-col items-center gap-2 border-l border-gray-800/80 pl-3">
                          <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Taskbar Preview</span>
                          <div className="flex items-center gap-2 bg-[#1f242c] px-3 py-1.5 rounded-lg border border-gray-700/60 shadow">
                            <img 
                              src={customIconDataUrl || defaultIconUrl} 
                              alt="Taskbar Icon" 
                              className="w-5 h-5 object-contain" 
                            />
                            <span className="text-[11px] font-semibold text-gray-200 max-w-[90px] truncate">
                              {projectName || 'Game'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-mono text-gray-400">
                            <span>256px</span>•<span>48px</span>•<span>32px</span>•<span>16px</span>
                          </div>
                        </div>
                      </div>

                      {/* Drag & Drop Upload Zone */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingIcon(true); }}
                        onDragLeave={() => setIsDraggingIcon(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingIcon(false);
                          if (e.dataTransfer.files?.[0]) {
                            handleIconFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => iconInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isDraggingIcon 
                            ? 'border-violet-400 bg-violet-950/30' 
                            : 'border-gray-700 hover:border-violet-500/70 hover:bg-gray-800/50'
                        }`}
                      >
                        <input 
                          ref={iconInputRef}
                          type="file" 
                          accept="image/*,.ico" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleIconFile(e.target.files[0]);
                          }}
                          className="hidden" 
                        />
                        <Icons.Upload size={20} className={isDraggingIcon ? 'text-violet-400 animate-bounce' : 'text-gray-400'} />
                        <div className="text-xs font-bold text-white">
                          {customIconFileName ? (
                            <span className="text-violet-300 font-mono truncate max-w-[220px] inline-block">{customIconFileName}</span>
                          ) : (
                            'Click to upload or drag & drop icon'
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Supports .ico, .png, .jpg, .webp, .svg (Embedded into native runner)
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {previewFrames.length > 0 && (
                          <button
                            onClick={handleUseFrame1AsIcon}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-700 transition-colors"
                            title="Use current Frame 1 artwork as application icon"
                          >
                            <Icons.Image size={13} className="text-emerald-400" />
                            <span>Use Frame 1 Drawing</span>
                          </button>
                        )}

                        {customIconDataUrl && (
                          <button
                            onClick={() => {
                              setCustomIconDataUrl(null);
                              setCustomIconBlob(null);
                              setCustomIconFileName(null);
                            }}
                            className="py-1.5 px-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 border border-gray-700 transition-colors"
                            title="Reset icon to default arcade gamepad"
                          >
                            <Icons.RotateCw size={13} />
                            <span>Reset</span>
                          </button>
                        )}

                        <button
                          onClick={handleDownloadStandaloneIco}
                          disabled={isGeneratingIco}
                          className="py-1.5 px-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-gray-700 transition-colors"
                          title="Download multi-resolution .ico file directly"
                        >
                          <Icons.Download size={13} className="text-violet-400" />
                          <span>{isGeneratingIco ? 'Generating...' : 'Get .ICO'}</span>
                        </button>
                      </div>
                    </div>

                    {/* METADATA SETTINGS */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          File Name
                        </label>
                        <input 
                          type="text" 
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="My Animation"
                          className="w-full bg-gray-900 text-white rounded-xl px-3.5 py-2 text-xs font-semibold border border-gray-700 hover:border-gray-500 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Publisher / Author (Optional)
                        </label>
                        <input 
                          type="text" 
                          value={exePublisher}
                          onChange={(e) => setExePublisher(e.target.value)}
                          placeholder="e.g. My Indie Game Studio"
                          className="w-full bg-gray-900 text-white rounded-xl px-3.5 py-2 text-xs font-medium border border-gray-700 hover:border-gray-500 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Architecture Spec Card */}
                      <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-900/40 text-[11px] text-violet-200/90 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-violet-300">
                          <Icons.Check size={14} className="text-emerald-400" />
                          Zero-Browser Native Window Engine
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Compiles into an actual Windows desktop application with its own native window, game icon, and taskbar entry. Never opens Microsoft Edge or web browser tabs.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 mt-auto space-y-2">
                      <button
                        onClick={() => onExport('exe', quality, transparent, {
                          customIconDataUrl,
                          customIconBlob,
                          publisher: exePublisher,
                          gameTitle: projectName
                        })}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Icons.Download size={18} />
                        <span>Compile & Export Windows .exe</span>
                      </button>

                      <button
                        onClick={() => onExport('desktop-package', quality, transparent, {
                          customIconDataUrl,
                          customIconBlob,
                          publisher: exePublisher,
                          gameTitle: projectName
                        })}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-violet-500/40 hover:border-violet-400 text-violet-200 text-xs font-semibold flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Icons.Package size={15} className="text-violet-400" />
                          <span>Zero-Browser Standalone Package (.zip)</span>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Steam / itch.io</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* HTML TO EXE CONVERTER INTERACTIVE TOOL */
                  <div className="space-y-3.5 flex flex-col h-full animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Icons.Sparkles className="text-violet-400" size={20} />
                        HTML to EXE Converter
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Convert any HTML5 game or webpage into a standalone Windows executable (.exe) application.
                      </p>
                    </div>

                    {/* Drag & Drop HTML file */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingConverterFile(true); }}
                      onDragLeave={() => setIsDraggingConverterFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingConverterFile(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleConverterFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => converterFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isDraggingConverterFile
                          ? 'border-violet-400 bg-violet-950/30'
                          : converterHtmlFile
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'border-gray-700 hover:border-violet-500/70 hover:bg-gray-800/50'
                      }`}
                    >
                      <input 
                        ref={converterFileInputRef}
                        type="file" 
                        accept=".html,.htm,.txt" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleConverterFile(e.target.files[0]);
                        }}
                        className="hidden" 
                      />
                      {converterHtmlFile ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                          <Icons.Check size={16} />
                          <span className="truncate max-w-[240px] font-mono">{converterHtmlFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Icons.Code size={22} className="text-violet-400" />
                          <div className="text-xs font-bold text-white">
                            Click or drag & drop HTML file to convert
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Supports .html, .htm files
                          </div>
                        </>
                      )}
                    </div>

                    {/* Window Configuration Settings */}
                    <div className="space-y-2.5 bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Application Title
                        </label>
                        <input 
                          type="text" 
                          value={converterTitle}
                          onChange={(e) => setConverterTitle(e.target.value)}
                          placeholder="e.g. My Standalone Game"
                          className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-semibold border border-gray-700 hover:border-gray-500 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Width (px)
                          </label>
                          <input 
                            type="number" 
                            value={converterWidth}
                            onChange={(e) => setConverterWidth(parseInt(e.target.value) || 1280)}
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-violet-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Height (px)
                          </label>
                          <input 
                            type="number" 
                            value={converterHeight}
                            onChange={(e) => setConverterHeight(parseInt(e.target.value) || 720)}
                            className="w-full bg-gray-950 text-white rounded-xl px-3 py-1.5 text-xs font-mono border border-gray-700 hover:border-gray-500 focus:border-violet-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={converterFullscreen}
                            onChange={(e) => setConverterFullscreen(e.target.checked)}
                            className="rounded border-gray-700 text-violet-600 focus:ring-violet-500"
                          />
                          <span>Launch in Fullscreen</span>
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={converterResizable}
                            onChange={(e) => setConverterResizable(e.target.checked)}
                            className="rounded border-gray-700 text-violet-600 focus:ring-violet-500"
                          />
                          <span>Resizable Window</span>
                        </label>
                      </div>
                    </div>

                    {/* Convert Button */}
                    <div className="pt-2 mt-auto">
                      <button
                        onClick={handleConvertHtmlToExe}
                        disabled={isConverting || !converterHtmlContent}
                        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all ${
                          converterHtmlContent && !isConverting
                            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        }`}
                      >
                        {isConverting ? (
                          <>
                            <Icons.RotateCw size={18} className="animate-spin text-violet-300" />
                            <span>Converting to Windows .exe ({conversionProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Icons.Sparkles size={18} />
                            <span>Convert & Download Windows .exe</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD FORMATS LIST */
              <>
                {/* Project Name & Resolution Summary */}
                <div className="mb-5 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                      File Name
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="My Animation"
                        className="flex-1 bg-gray-900 text-white rounded-xl px-3.5 py-2.5 text-sm font-semibold border border-gray-700 hover:border-gray-500 focus:border-[#FF3B30] focus:outline-none transition-colors shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Transparent Background Toggle */}
                  <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${transparent ? 'bg-[#FF3B30]' : 'bg-gray-700'}`}>
                        <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${transparent ? 'translate-x-5' : ''}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-gray-200 transition-colors">
                          {t('export.transparent', 'Transparent Background (Alpha Channel)')}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Omit solid background for WebM video, animated GIF, and PNG sequences
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={transparent}
                        onChange={(e) => setTransparent(e.target.checked)}
                      />
                    </label>
                  </div>

                  {/* Quality Preset Radio selector */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      {t('export.quality', 'Export Quality & Bitrate')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {qualityOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setQuality(opt.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            quality === opt.id 
                              ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white shadow-md' 
                              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                          }`}
                        >
                          <div className="font-bold text-xs capitalize">{opt.id}</div>
                          <div className="text-[9px] opacity-60 leading-tight mt-0.5 truncate">{opt.id === 'low' ? 'Small File' : opt.id === 'medium' ? 'Standard HD' : 'Maximum Bitrate'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Format Actions List */}
                <div className="space-y-2.5 flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Choose Format to Render
                  </label>

                  {/* Adobe Animate / FNF Spritesheet Button (if available) */}
                  {onOpenSpritesheetExport && (
                    <button 
                      onClick={() => {
                        onClose();
                        onOpenSpritesheetExport();
                      }}
                      className="w-full group bg-gradient-to-r from-red-950/50 via-red-900/30 to-gray-900 border border-red-500/40 hover:border-red-400 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-left shadow-lg"
                    >
                      <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 group-hover:scale-110 transition-transform">
                        <Icons.Sparkles size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm group-hover:text-red-300 transition-colors">Spritesheet + Starling XML</span>
                          <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-red-500/30">Adobe Animate / FNF</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Pack animated symbols into texture atlas with Sparrow / Starling XML</div>
                      </div>
                      <Icons.ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                    </button>
                  )}

                  {/* Format Cards */}
                  <div className="space-y-2">
                    {formats.map((format) => (
                      <button 
                        key={format.id}
                        onClick={() => {
                          if (format.id === 'apk') {
                            setIsApkMode(true);
                            setIsExeMode(false);
                          } else if (format.id === 'exe') {
                            setIsExeMode(true);
                            setIsApkMode(false);
                          } else {
                            onExport(format.id, quality, transparent);
                          }
                        }}
                        className="w-full group bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-[#FF3B30] p-3.5 rounded-2xl flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-left shadow-sm"
                      >
                        <div className={`p-2.5 rounded-xl bg-black/50 group-hover:scale-110 transition-transform ${format.color}`}>
                          <format.icon size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm group-hover:text-[#FF3B30] transition-colors">{format.label}</span>
                            {format.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                format.id === 'apk'
                                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                                  : format.id === 'exe' 
                                  ? 'bg-violet-950/70 text-violet-300 border-violet-700/60' 
                                  : 'bg-gray-800 text-gray-300 border-gray-700'
                              }`}>
                                {format.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 truncate">{format.desc}</div>
                        </div>
                        {format.id === 'exe' || format.id === 'apk' ? (
                          <Icons.ChevronRight size={18} className={`text-gray-500 transition-colors shrink-0 ${format.id === 'apk' ? 'group-hover:text-emerald-400' : 'group-hover:text-violet-400'}`} />
                        ) : (
                          <Icons.Download size={18} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Disclaimer and Tips */}
                <div className="mt-5 pt-4 border-t border-gray-800/80 text-[10px] text-gray-500 space-y-1">
                  <p>
                    💡 <span className="font-bold text-gray-400">Pro Tip:</span> All video, GIF, and sprite exports are processed 100% locally on your browser with hardware acceleration.
                  </p>
                </div>
              </>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
