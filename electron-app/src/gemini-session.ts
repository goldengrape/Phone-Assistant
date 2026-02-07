/**
 * Gemini Live Session - Real-time voice conversation with Gemini API
 */
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { EventEmitter } from 'events';

const SYSTEM_INSTRUCTION = `You are an AI Phone Assistant acting as a proxy for phone calls.

CRITICAL PROTOCOLS:
1. **AUDIO INPUT (Phone Caller)**: All audio you receive is from the person on the phone call. 
   - Converse with them naturally.
   - Be helpful, professional, and conversational.
   
2. **TEXT INPUT (System Commands)**: Any text input is a command from your supervisor.
   - Do NOT read the text aloud.
   - Execute the instruction in your next spoken response.
   - Common commands: "wrap up the call", "offer a discount", "be more polite", "ask about X"

3. **BEHAVIOR**:
   - Keep responses concise for phone conversations.
   - Speak naturally with appropriate pauses.
   - If the caller asks who you are, say you are an AI assistant.

You are now connected to a live phone call. The caller's voice will come through as audio.`;

export interface GeminiSessionEvents {
    'connected': () => void;
    'audio-response': (pcmBuffer: Buffer) => void;
    'turn-complete': () => void;
    'interrupted': () => void;
    'error': (error: Error) => void;
    'disconnected': () => void;
}

export interface GeminiSessionConfig {
    apiKey: string;
    voice?: string;
    language?: string;
    customInstruction?: string;
}

export class GeminiSession extends EventEmitter {
    private session: any = null;
    private ai: GoogleGenAI;
    private config: GeminiSessionConfig;
    private isConnected = false;

    constructor(config: GeminiSessionConfig) {
        super();
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    get connected(): boolean {
        return this.isConnected;
    }

    /**
     * Connect to Gemini Live API
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.warn("Already connected to Gemini");
            return;
        }

        const instruction = this.config.customInstruction || SYSTEM_INSTRUCTION;
        const voice = this.config.voice || 'Zephyr';

        try {
            this.session = await this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice }
                        },
                    },
                    systemInstruction: instruction,
                },
                callbacks: {
                    onopen: () => {
                        this.isConnected = true;
                        this.emit('connected');
                        console.log('[GeminiSession] Connected');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        this.handleMessage(message);
                    },
                    onclose: () => {
                        this.isConnected = false;
                        this.emit('disconnected');
                        console.log('[GeminiSession] Disconnected');
                    },
                    onerror: (err: any) => {
                        console.error('[GeminiSession] Error:', err);
                        this.emit('error', new Error(String(err)));
                    }
                }
            });
        } catch (error) {
            this.emit('error', error as Error);
            throw error;
        }
    }

    /**
     * Handle incoming messages from Gemini
     */
    private handleMessage(message: LiveServerMessage): void {
        // Handle audio output from AI
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            // Gemini returns base64 encoded PCM audio
            const pcmBuffer = Buffer.from(audioData, 'base64');
            this.emit('audio-response', pcmBuffer);
        }

        // Handle turn completion
        if (message.serverContent?.turnComplete) {
            this.emit('turn-complete');
        }

        // Handle interruption (user started speaking while AI was talking)
        if (message.serverContent?.interrupted) {
            this.emit('interrupted');
        }
    }

    /**
     * Send audio from phone to Gemini (16kHz 16-bit PCM)
     */
    sendAudio(pcmBuffer: Buffer): void {
        if (!this.session || !this.isConnected) {
            return;
        }

        const base64Audio = pcmBuffer.toString('base64');
        this.session.sendRealtimeInput({
            media: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Audio
            }
        });
    }

    /**
     * Send a text command (supervisor instruction)
     */
    sendCommand(text: string): void {
        if (!this.session || !this.isConnected) {
            console.warn("Cannot send command - not connected");
            return;
        }

        const commandText = `[SYSTEM_COMMAND]: ${text}`;
        const base64Text = Buffer.from(commandText).toString('base64');

        this.session.sendRealtimeInput({
            media: {
                mimeType: 'text/plain',
                data: base64Text
            }
        });

        console.log(`[GeminiSession] Sent command: ${text}`);
    }

    /**
     * Disconnect from Gemini
     */
    disconnect(): void {
        if (this.session) {
            try {
                this.session.close();
            } catch (e) {
                // Ignore cleanup errors
            }
            this.session = null;
        }
        this.isConnected = false;
        this.emit('disconnected');
    }
}
