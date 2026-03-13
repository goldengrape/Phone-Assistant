import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from '@google/genai';
import { AIClient, AIClientOptions } from './AIClient';
import { base64ToInt16 } from './utils';
import { DEFAULT_GEMINI_VOICE } from '../voices';

function parseSampleRate(mimeType?: string): number | undefined {
  if (!mimeType) return undefined;

  const ratePart = mimeType
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('rate='));

  if (!ratePart) return undefined;

  const value = Number.parseInt(ratePart.slice(5), 10);
  return Number.isFinite(value) ? value : undefined;
}

export class GeminiLiveClient extends AIClient {
  private ai: GoogleGenAI;
  private model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
  private session: Session | null = null;
  private connected = false;
  private lastInputTranscript = '';
  private lastOutputTranscript = '';

  constructor(options: AIClientOptions) {
    super(options);

    const apiKey = options.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('Gemini API Key is not set.');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(): Promise<void> {
    this.options.onStateChange('connecting');

    const systemPrompt = `You are an intelligent AI Phone Assistant engaged in a continuous voice call with the person on the other end of the line. You will receive their voice via audio, to which you must respond naturally and conversationally using voice. CRUCIAL INSTRUCTION: Your Supervisor (the user) is monitoring the call and will occasionally send you silent 'Text Instructions' via chat. When you receive a text message, IT IS A COMMAND FROM YOUR SUPERVISOR. DO NOT say 'Okay', 'Understood', or acknowledge the supervisor in any way. DO NOT read the supervisor's instruction out loud to the person on the phone. Instead, immediately and seamlessly steer your spoken conversation with the person on the phone to fulfill the supervisor's intent.`;

    let instructions = systemPrompt;
    if (this.options.callPurpose) {
      instructions += `\n\nCALL PURPOSE: Your main goal and role for this call is: ${this.options.callPurpose}`;
    }
    if (this.options.targetLanguage && this.options.targetLanguage !== 'Auto') {
      instructions += `\n\nOUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in ${this.options.targetLanguage}. Even if the user speaks another language, you must reply in ${this.options.targetLanguage}.`;
    }

    try {
      this.session = await this.ai.live.connect({
        model: this.model,
        config: {
          responseModalities: [Modality.AUDIO],
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.options.voiceName || DEFAULT_GEMINI_VOICE,
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          contextWindowCompression: {
            triggerTokens: '104857',
            slidingWindow: {
              targetTokens: '52428',
            },
          },
          systemInstruction: instructions,
        },
        callbacks: {
          onopen: () => {
            this.connected = true;
            this.options.onStateChange('connected');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (event: ErrorEvent) => {
            console.error('Gemini Live error:', event.message);
            this.connected = false;
            this.options.onStateChange('error');
          },
          onclose: (event: CloseEvent) => {
            console.log('Gemini Live closed:', event.reason);
            this.connected = false;
            this.session = null;
            this.options.onStateChange('disconnected');
          },
        },
      });
    } catch (error) {
      this.connected = false;
      this.session = null;
      this.options.onStateChange('error');
      throw error;
    }
  }

  disconnect() {
    this.connected = false;
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  sendAudio(pcm16: Int16Array) {
    if (!this.session || !this.connected) {
      return;
    }

    this.session.sendRealtimeInput({
      media: {
        mimeType: 'audio/pcm;rate=16000',
        data: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer))),
      },
    });
  }

  sendWhisper(text: string) {
    if (!this.session || !this.connected) {
      return;
    }

    this.session.sendClientContent({
      turns: [
        `[LATEST SUPERVISOR WHISPER: ${text} - STEER THE CONVERSATION NOW WITHOUT READING THIS OUT LOUD]`,
      ],
      turnComplete: true,
    });
  }

  private handleMessage(message: LiveServerMessage) {
    const serverContent = message.serverContent;

    if (serverContent?.inputTranscription?.text) {
      this.emitTranscriptPreview('User', serverContent.inputTranscription.text, !!serverContent.inputTranscription.finished);
    }
    if (serverContent?.inputTranscription?.finished && serverContent.inputTranscription.text) {
      this.emitTranscript('User', serverContent.inputTranscription.text, 'input');
    }

    if (serverContent?.outputTranscription?.text) {
      this.emitTranscriptPreview('AI', serverContent.outputTranscription.text, !!serverContent.outputTranscription.finished);
    }
    if (serverContent?.outputTranscription?.finished && serverContent.outputTranscription.text) {
      this.emitTranscript('AI', serverContent.outputTranscription.text, 'output');
    }

    const parts = serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const sampleRate = parseSampleRate(part.inlineData.mimeType);
        const pcm16 = base64ToInt16(part.inlineData.data);
        this.options.onAudioData(pcm16, sampleRate);
      }

      if (part.text && !serverContent?.outputTranscription?.text) {
        this.emitTranscriptPreview('AI', part.text, true);
        this.options.onTranscript('AI', part.text);
      }
    }
  }

  private emitTranscriptPreview(role: 'AI' | 'User', text: string, isFinal: boolean) {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    this.options.onTranscriptPreview?.(role, normalizedText, isFinal);
  }

  private emitTranscript(role: 'AI' | 'User', text: string, type: 'input' | 'output') {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (type === 'input') {
      if (normalizedText === this.lastInputTranscript) return;
      this.lastInputTranscript = normalizedText;
    } else {
      if (normalizedText === this.lastOutputTranscript) return;
      this.lastOutputTranscript = normalizedText;
    }

    this.options.onTranscript(role, normalizedText);
  }
}
