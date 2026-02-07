export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  volume: number; // 0 to 1
  isUserSpeaking: boolean;
}

// Global augmentations for CDN libraries
declare global {
  interface Window {
    pdfjsLib: any;
    JSZip: any;
    webkitAudioContext: typeof AudioContext;
  }
}