declare module 'gifshot' {
  interface GifshotOptions {
    images?: string[];
    gifWidth?: number;
    gifHeight?: number;
    frameDuration?: number;
    numWorkers?: number;
    quality?: number;
    webWorkersPath?: string;
  }

  interface GifshotResult {
    image?: string;
    error?: boolean;
    errorCode?: string;
    errorMsg?: string;
  }

  function createGIF(options: GifshotOptions, callback: (obj: GifshotResult) => void): void;
  function isSupported(): boolean;
}
