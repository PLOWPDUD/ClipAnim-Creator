// Lightweight Procedural Sound Effects Synthesizer using Web Audio API

function audioBufferToWav(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferLength = 44 + length;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData.push(buffer.getChannelData(channel));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  // Convert to base64 data URL
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

export type SynthSoundType = 'coin' | 'laser' | 'jump' | 'explosion' | 'powerup' | 'click' | 'whoosh' | 'hit' | 'magic' | 'blip';

export function generateSynthesizedSound(type: SynthSoundType): { dataUrl: string; duration: number; name: string } {
  const sampleRate = 44100;
  
  let duration = 0.3;
  if (type === 'explosion') duration = 0.7;
  if (type === 'powerup') duration = 0.5;
  if (type === 'magic') duration = 0.6;
  if (type === 'whoosh') duration = 0.4;
  if (type === 'click' || type === 'blip') duration = 0.15;
  if (type === 'jump') duration = 0.25;
  if (type === 'coin') duration = 0.35;
  if (type === 'laser') duration = 0.25;
  if (type === 'hit') duration = 0.2;

  const length = Math.floor(sampleRate * duration);
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);

  const masterGain = offlineCtx.createGain();
  masterGain.connect(offlineCtx.destination);
  masterGain.gain.setValueAtTime(0.8, 0);

  const t0 = 0;

  if (type === 'coin') {
    const osc1 = offlineCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t0); // B5
    osc1.frequency.setValueAtTime(1318.51, t0 + 0.08); // E6
    
    masterGain.gain.setValueAtTime(0.7, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc1.connect(masterGain);
    osc1.start(t0);
    osc1.stop(t0 + duration);
  } else if (type === 'laser') {
    const osc = offlineCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.exponentialRampToValueAtTime(60, t0 + duration);

    masterGain.gain.setValueAtTime(0.8, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  } else if (type === 'jump') {
    const osc = offlineCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(600, t0 + duration * 0.7);

    masterGain.gain.setValueAtTime(0.6, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  } else if (type === 'powerup') {
    const osc = offlineCtx.createOscillator();
    osc.type = 'triangle';
    const notes = [330, 392, 523, 659, 784];
    notes.forEach((freq, idx) => {
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.08);
    });

    masterGain.gain.setValueAtTime(0.7, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  } else if (type === 'explosion') {
    // Noise buffer
    const bufferSize = sampleRate * duration;
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = offlineCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t0);
    filter.frequency.exponentialRampToValueAtTime(40, t0 + duration);

    masterGain.gain.setValueAtTime(0.9, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    whiteNoise.connect(filter);
    filter.connect(masterGain);
    whiteNoise.start(t0);
    whiteNoise.stop(t0 + duration);
  } else if (type === 'whoosh') {
    const bufferSize = sampleRate * duration;
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = offlineCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(200, t0);
    filter.frequency.exponentialRampToValueAtTime(1200, t0 + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(150, t0 + duration);

    masterGain.gain.setValueAtTime(0.01, t0);
    masterGain.gain.linearRampToValueAtTime(0.8, t0 + duration * 0.4);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    whiteNoise.connect(filter);
    filter.connect(masterGain);
    whiteNoise.start(t0);
    whiteNoise.stop(t0 + duration);
  } else if (type === 'hit') {
    const osc = offlineCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + duration);

    masterGain.gain.setValueAtTime(0.9, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  } else if (type === 'magic') {
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    freqs.forEach((f, idx) => {
      osc.frequency.setValueAtTime(f, t0 + idx * 0.08);
    });

    masterGain.gain.setValueAtTime(0.6, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  } else {
    // Click / blip
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.exponentialRampToValueAtTime(300, t0 + duration);

    masterGain.gain.setValueAtTime(0.6, t0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  // Create float buffer directly:
  const channelData = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (type === 'coin') {
      const f = t < 0.08 ? 987.77 : 1318.51;
      const env = Math.exp(-t * 9);
      sample = Math.sin(2 * Math.PI * f * t) * env;
    } else if (type === 'laser') {
      const f = 1200 * Math.exp(-t * 12);
      const env = Math.exp(-t * 10);
      sample = (Math.sin(2 * Math.PI * f * t) > 0 ? 0.7 : -0.7) * env;
    } else if (type === 'jump') {
      const f = 150 + 450 * (t / duration);
      const env = Math.exp(-t * 6);
      sample = (Math.sin(2 * Math.PI * f * t) > 0 ? 0.6 : -0.6) * env;
    } else if (type === 'powerup') {
      const step = Math.min(4, Math.floor(t / 0.08));
      const f = [330, 392, 523, 659, 784][step];
      const env = Math.exp(-t * 4);
      sample = Math.sin(2 * Math.PI * f * t) * env;
    } else if (type === 'explosion') {
      const env = Math.exp(-t * 5);
      sample = (Math.random() * 2 - 1) * env * 0.8;
    } else if (type === 'whoosh') {
      const env = Math.sin(Math.PI * (t / duration));
      sample = (Math.random() * 2 - 1) * env * 0.7;
    } else if (type === 'hit') {
      const f = 220 * Math.exp(-t * 15);
      const env = Math.exp(-t * 14);
      sample = Math.sin(2 * Math.PI * f * t) * env;
    } else if (type === 'magic') {
      const step = Math.min(5, Math.floor(t / 0.08));
      const f = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98][step];
      const env = Math.exp(-t * 3.5);
      sample = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * env * 0.6;
    } else {
      const f = 800 * Math.exp(-t * 20);
      const env = Math.exp(-t * 22);
      sample = Math.sin(2 * Math.PI * f * t) * env;
    }
    channelData[i] = sample;
  }

  // Create mock AudioBuffer
  const synthBuffer = {
    numberOfChannels: 1,
    sampleRate,
    length,
    duration,
    getChannelData: () => channelData
  } as unknown as AudioBuffer;

  const dataUrl = audioBufferToWav(synthBuffer);
  const titles: Record<SynthSoundType, string> = {
    coin: 'Retro Coin Collect',
    laser: 'Sci-Fi Laser Pew',
    jump: '8-Bit Jump Spring',
    explosion: 'Arcade Boom Explosion',
    powerup: 'Power Up Chime',
    whoosh: 'Fast Whoosh Swish',
    hit: 'Impact Punch Hit',
    magic: 'Magic Sparkle Chime',
    click: 'UI Button Click',
    blip: 'Mini Blip'
  };

  return {
    dataUrl,
    duration,
    name: titles[type] || 'Synthesized FX'
  };
}
