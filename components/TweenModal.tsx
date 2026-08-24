import React, { useState } from 'react';
import { Icons } from '../Icons';

interface TweenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    numFrames: number, 
    easing: string, 
    includeOnionSkin: boolean, 
    interpolatePosition: boolean, 
    interpolateScale: boolean, 
    interpolateRotation: boolean,
    motionBlur: boolean,
    motionBlurStrength: number,
    motionBlurSamples: number,
    motionBlurShutterAngle: number
  ) => void;
}

export const TweenModal: React.FC<TweenModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [numFrames, setNumFrames] = useState(4);
  const [easing, setEasing] = useState('ease-in-out');
  const [includeOnionSkin, setIncludeOnionSkin] = useState(true);
  const [interpolatePosition, setInterpolatePosition] = useState(true);
  const [interpolateScale, setInterpolateScale] = useState(true);
  const [interpolateRotation, setInterpolateRotation] = useState(true);
  
  // Motion Blur effect state
  const [motionBlur, setMotionBlur] = useState(true);
  const [motionBlurStrength, setMotionBlurStrength] = useState(0.75); // 0.2 to 1.5
  const [motionBlurSamples, setMotionBlurSamples] = useState(7); // 5, 7, 9
  const [motionBlurShutterAngle, setMotionBlurShutterAngle] = useState(180); // 90, 180, 270, 360

  if (!isOpen) return null;

  const easingOptions = [
    { id: 'linear', label: 'Linear', desc: 'Constant speed' },
    { id: 'ease-in', label: 'Ease In', desc: 'Starts slow, speeds up' },
    { id: 'ease-out', label: 'Ease Out', desc: 'Starts fast, slows down' },
    { id: 'ease-in-out', label: 'Ease In-Out', desc: 'Slow start and end' },
  ];

  const blurPresets = [
    { label: 'Subtle', strength: 0.35, shutter: 90, desc: 'Slight softening' },
    { label: 'Cinematic', strength: 0.75, shutter: 180, desc: 'Film standard' },
    { label: 'Dynamic', strength: 1.1, shutter: 270, desc: 'High action' },
    { label: 'Extreme', strength: 1.5, shutter: 360, desc: 'Speed streak' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#18181b]/95 backdrop-blur-md z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Icons.Wand2 size={18} />
            </div>
            Tween & In-between Frames
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <Icons.X size={18} />
          </button>
        </div>
        
        <div className="p-5 space-y-5 text-gray-200 text-sm">
          {/* Frame count slider */}
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400">
              <span>In-between frames</span>
              <span className="text-purple-400 font-mono text-sm font-bold bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-500/30">
                +{numFrames} frames
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input 
                type="range" 
                min="1" 
                max="24" 
                value={numFrames} 
                onChange={(e) => setNumFrames(parseInt(e.target.value))}
                className="flex-1 accent-purple-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
              />
            </div>
          </div>

          {/* Easing Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Motion Smoothness (Easing)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {easingOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEasing(opt.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    easing === opt.id 
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm shadow-purple-500/10' 
                      : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-0.5">{opt.label}</div>
                  <div className="text-[11px] opacity-70 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Motion Blur Effect Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 via-black/40 to-black/20 border border-purple-500/30 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg transition-colors ${motionBlur ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40' : 'bg-gray-800 text-gray-400'}`}>
                  <Icons.Wind size={16} />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    Motion Blur Effect
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      PRO
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 leading-tight">
                    Smooths fast movement & eliminates stepping
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setMotionBlur(!motionBlur)} 
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${motionBlur ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-md ${motionBlur ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {motionBlur && (
              <div className="pt-2 border-t border-purple-500/20 space-y-3">
                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Blur Intensity Preset</span>
                    <span className="text-purple-300 font-mono font-bold">
                      {Math.round(motionBlurStrength * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {blurPresets.map((preset) => {
                      const isActive = Math.abs(motionBlurStrength - preset.strength) < 0.05 && motionBlurShutterAngle === preset.shutter;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setMotionBlurStrength(preset.strength);
                            setMotionBlurShutterAngle(preset.shutter);
                          }}
                          className={`py-1.5 px-1 rounded-lg text-center border transition-all text-xs ${
                            isActive
                              ? 'bg-purple-600 text-white font-bold border-purple-400 shadow-sm'
                              : 'bg-black/40 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fine slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Fine Tuning (Streak Length)</span>
                    <span className="font-mono text-gray-300">{(motionBlurStrength * 1.5).toFixed(1)}x exposure</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={motionBlurStrength}
                    onChange={(e) => setMotionBlurStrength(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                  />
                </div>

                {/* Quality & Shutter settings */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Shutter Angle
                    </label>
                    <select
                      value={motionBlurShutterAngle}
                      onChange={(e) => setMotionBlurShutterAngle(parseInt(e.target.value))}
                      className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-purple-500"
                    >
                      <option value={90}>90° (Crisp)</option>
                      <option value={180}>180° (Cinema standard)</option>
                      <option value={270}>270° (Smooth flow)</option>
                      <option value={360}>360° (Full exposure)</option>
                    </select>
                  </div>

                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Sample Passes
                    </label>
                    <select
                      value={motionBlurSamples}
                      onChange={(e) => setMotionBlurSamples(parseInt(e.target.value))}
                      className="w-full bg-[#242427] text-white text-xs rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-purple-500"
                    >
                      <option value={5}>5 passes (Fast)</option>
                      <option value={7}>7 passes (Balanced)</option>
                      <option value={9}>9 passes (Ultra Smooth)</option>
                      <option value={11}>11 passes (Studio Film)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interpolation Toggles */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Interpolation Channels
            </div>
            
            <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <label className="text-xs font-medium text-gray-300 cursor-pointer" onClick={() => setInterpolatePosition(!interpolatePosition)}>
                Position (X / Y translation)
              </label>
              <button 
                type="button" 
                onClick={() => setInterpolatePosition(!interpolatePosition)} 
                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolatePosition ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolatePosition ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <label className="text-xs font-medium text-gray-300 cursor-pointer" onClick={() => setInterpolateScale(!interpolateScale)}>
                Scale & Silhouette (Width / Height)
              </label>
              <button 
                type="button" 
                onClick={() => setInterpolateScale(!interpolateScale)} 
                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolateScale ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolateScale ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <label className="text-xs font-medium text-gray-300 cursor-pointer" onClick={() => setInterpolateRotation(!interpolateRotation)}>
                Rotation (Principal Orientation)
              </label>
              <button 
                type="button" 
                onClick={() => setInterpolateRotation(!interpolateRotation)} 
                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${interpolateRotation ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${interpolateRotation ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <label className="text-xs font-medium text-gray-300 cursor-pointer" onClick={() => setIncludeOnionSkin(!includeOnionSkin)}>
                Preserve Onion Skinning
              </label>
              <button 
                type="button" 
                onClick={() => setIncludeOnionSkin(!includeOnionSkin)} 
                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${includeOnionSkin ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeOnionSkin ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/30 sticky bottom-0 rounded-b-2xl backdrop-blur-md">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => {
              onGenerate(
                numFrames, 
                easing, 
                includeOnionSkin, 
                interpolatePosition, 
                interpolateScale, 
                interpolateRotation,
                motionBlur,
                motionBlurStrength,
                motionBlurSamples,
                motionBlurShutterAngle
              );
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Icons.Sparkles size={15} />
            Generate In-Betweens
          </button>
        </div>
      </div>
    </div>
  );
};

