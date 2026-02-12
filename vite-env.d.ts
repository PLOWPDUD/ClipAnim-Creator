
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// WebCodecs API Type Definitions for Audio
// These are added to fix "Cannot find name 'AudioEncoder'" and related errors

interface EncodedAudioChunk {
  readonly type: "key" | "delta";
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;
  copyTo(destination: BufferSource): void;
}

interface EncodedAudioChunkMetadata {
  decoderConfig?: {
    codec: string;
    sampleRate: number;
    numberOfChannels: number;
    description?: BufferSource;
  };
}

interface AudioEncoderInit {
  output: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;
  error: (error: DOMException) => void;
}

interface AudioEncoderConfig {
  codec: string;
  sampleRate?: number;
  numberOfChannels?: number;
  bitrate?: number;
}

declare class AudioEncoder {
  constructor(init: AudioEncoderInit);
  readonly state: "unconfigured" | "configured" | "closed";
  readonly encodeQueueSize: number;
  configure(config: AudioEncoderConfig): void;
  encode(data: AudioData): void;
  flush(): Promise<void>;
  reset(): void;
  close(): void;
  static isConfigSupported(config: AudioEncoderConfig): Promise<boolean>;
}

type AudioSampleFormat = "u8" | "s16" | "s32" | "f32" | "u8-planar" | "s16-planar" | "s32-planar" | "f32-planar";

interface AudioDataInit {
  format: AudioSampleFormat;
  sampleRate: number;
  numberOfFrames: number;
  numberOfChannels: number;
  timestamp: number;
  data: BufferSource;
}

interface AudioDataCopyToOptions {
  planeIndex: number;
  frameOffset?: number;
  frameCount?: number;
  format?: AudioSampleFormat;
}

declare class AudioData {
  constructor(init: AudioDataInit);
  readonly format: AudioSampleFormat;
  readonly sampleRate: number;
  readonly numberOfFrames: number;
  readonly numberOfChannels: number;
  readonly duration: number;
  readonly timestamp: number;
  allocationSize(options: AudioDataCopyToOptions): number;
  copyTo(destination: BufferSource, options: AudioDataCopyToOptions): void;
  clone(): AudioData;
  close(): void;
}
