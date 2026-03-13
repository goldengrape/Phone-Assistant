export interface AIClientOptions {
  onAudioData: (pcm16: Int16Array, sampleRate?: number) => void;
  onTranscript: (role: string, text: string) => void;
  onTranscriptPreview?: (role: 'AI' | 'User', text: string, isFinal: boolean) => void;
  onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  callPurpose?: string;
  targetLanguage?: string;
  voiceName?: string;
  apiKey?: string;
}

export abstract class AIClient {
  protected ws: WebSocket | null = null;
  protected options: AIClientOptions;

  constructor(options: AIClientOptions) {
    this.options = options;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract sendAudio(pcm16: Int16Array): void;
  abstract sendWhisper(text: string): void;
}
