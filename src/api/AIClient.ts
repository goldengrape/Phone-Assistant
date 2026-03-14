export interface AIClientOptions {
  onAudioData: (pcm16: Int16Array, sampleRate?: number) => void;
  onTranscript: (role: string, text: string) => void;
  onTranscriptPreview?: (role: 'AI' | 'User', text: string, isFinal: boolean) => void;
  onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  sessionInstruction?: string;
  callPurpose?: string;
  targetLanguage?: string;
  voiceName?: string;
  apiKey?: string;
}

export const DEFAULT_BASE_SESSION_PROMPT = `You are an intelligent AI Phone Assistant engaged in a continuous voice call with the person on the other end of the line. You will receive their voice via audio, to which you must respond naturally and conversationally using voice. CRUCIAL INSTRUCTION: Your Supervisor (the user) is monitoring the call and will occasionally send you silent 'Text Instructions' via chat. When you receive a text message, IT IS A COMMAND FROM YOUR SUPERVISOR. DO NOT say 'Okay', 'Understood', or acknowledge the supervisor in any way. DO NOT read the supervisor's instruction out loud to the person on the phone. Instead, immediately and seamlessly steer your spoken conversation with the person on the phone to fulfill the supervisor's intent.`;

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
