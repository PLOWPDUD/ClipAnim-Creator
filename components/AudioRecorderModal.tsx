import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number>(0);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
        // Cleanup
        stopStream();
        setAudioBlob(null);
        setRecordingTime(0);
        setIsRecording(false);
    }
  }, [isOpen]);

  const stopStream = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
      }
  };

  const startVisualizer = (stream: MediaStream) => {
      if (!canvasRef.current) return;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
          if (!isRecording && !analyserRef.current) return;
          
          animationFrameRef.current = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
              barHeight = dataArray[i] / 2;
              ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
              ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
              x += barWidth + 1;
          }
      };
      
      draw();
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          startVisualizer(stream);
          
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              setAudioBlob(blob);
              stopStream();
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingTime(0);
          setAudioBlob(null);

          timerRef.current = window.setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert(t('recorder.micError'));
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          clearInterval(timerRef.current);
      }
  };

  const handlePlayPreview = () => {
      if (!audioBlob) return;
      
      if (audioPreviewRef.current) {
          if (isPlaying) {
              audioPreviewRef.current.pause();
              setIsPlaying(false);
          } else {
              audioPreviewRef.current.src = URL.createObjectURL(audioBlob);
              audioPreviewRef.current.play().catch(e => {
                  if (e.name !== 'AbortError') console.error(e);
              });
              setIsPlaying(true);
              audioPreviewRef.current.onended = () => setIsPlaying(false);
          }
      } else {
          const audio = new Audio(URL.createObjectURL(audioBlob));
          audioPreviewRef.current = audio;
          audio.play().catch(e => {
              if (e.name !== 'AbortError') console.error(e);
          });
          setIsPlaying(true);
          audio.onended = () => setIsPlaying(false);
      }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1e1e1e] w-[400px] rounded-2xl border border-gray-700 shadow-2xl p-6 flex flex-col items-center">
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Icons.Mic size={24} className="text-[#FF3B30]" />
              {t('recorder.title')}
          </h2>

          {/* Visualizer / Placeholder */}
          <div className="w-full h-32 bg-black/50 rounded-xl mb-6 overflow-hidden border border-gray-700 relative flex items-center justify-center">
               <canvas ref={canvasRef} width={350} height={128} className="absolute inset-0 w-full h-full" />
               {!isRecording && !audioBlob && <span className="text-gray-500 text-sm relative z-10">{t('recorder.pressToStart')}</span>}
               {audioBlob && !isRecording && <span className="text-gray-300 text-sm relative z-10 font-bold">{t('recorder.complete')}</span>}
          </div>

          <div className="text-3xl font-mono font-bold text-white mb-8">
              {formatTime(recordingTime)}
          </div>

          <div className="flex items-center gap-6 mb-6">
              {!isRecording && !audioBlob && (
                  <button 
                    onClick={startRecording}
                    className="w-16 h-16 rounded-full bg-[#FF3B30] hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,59,48,0.3)]"
                  >
                      <Icons.Mic size={32} className="text-white" />
                  </button>
              )}

              {isRecording && (
                  <button 
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-gray-200 hover:bg-white flex items-center justify-center transition-all hover:scale-105 animate-pulse"
                  >
                      <Icons.Square size={32} className="text-red-600 fill-current" />
                  </button>
              )}

              {audioBlob && !isRecording && (
                  <>
                      <button 
                        onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                        className="p-4 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                        title={t('recorder.discard')}
                      >
                          <Icons.RotateCcw size={24} />
                      </button>

                      <button 
                        onClick={handlePlayPreview}
                        className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white transition-all shadow-lg"
                      >
                          {isPlaying ? <Icons.Pause size={32} fill="currentColor" /> : <Icons.Play size={32} fill="currentColor" className="ml-1" />}
                      </button>

                      <button 
                        onClick={() => onSave(audioBlob)}
                        className="p-4 rounded-full bg-green-500 text-white hover:bg-green-400 transition-all shadow-lg"
                        title={t('recorder.save')}
                      >
                          <Icons.Check size={24} />
                      </button>
                  </>
              )}
          </div>

          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">{t('common.cancel')}</button>
      </div>
    </div>
  );
};