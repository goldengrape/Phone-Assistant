/**
 * Phone Assistant Core - Orchestrates audio routing and Gemini session
 */
import { AudioRouter } from './audio-router';
import { GeminiSession } from './gemini-session';
import { EventEmitter } from 'events';

export interface PhoneAssistantConfig {
    apiKey: string;
    voice?: string;
    language?: string;
    customInstruction?: string;
}

export interface PhoneAssistantEvents {
    'ready': () => void;
    'call-started': () => void;
    'call-ended': () => void;
    'ai-speaking': () => void;
    'ai-silent': () => void;
    'error': (error: Error) => void;
}

export class PhoneAssistant extends EventEmitter {
    private audioRouter: AudioRouter;
    private geminiSession: GeminiSession | null = null;
    private config: PhoneAssistantConfig;
    private isCallActive = false;

    constructor(config: PhoneAssistantConfig) {
        super();
        this.config = config;
        this.audioRouter = new AudioRouter();
    }

    /**
     * Check if VB-Cable is properly configured
     */
    get isReady(): boolean {
        return this.audioRouter.isReady;
    }

    get callActive(): boolean {
        return this.isCallActive;
    }

    getStatus() {
        return {
            vbCableReady: this.audioRouter.isReady,
            audioRouterStatus: this.audioRouter.getStatus(),
            geminiConnected: this.geminiSession?.connected ?? false,
            callActive: this.isCallActive
        };
    }

    /**
     * Start the phone call session
     * - Connects to Gemini Live API
     * - Starts audio routing through VB-Cable
     */
    async startCall(): Promise<void> {
        if (this.isCallActive) {
            console.warn("Call already active");
            return;
        }

        if (!this.isReady) {
            throw new Error("VB-Cable not ready. Please check audio device configuration.");
        }

        try {
            // Create and connect Gemini session
            this.geminiSession = new GeminiSession({
                apiKey: this.config.apiKey,
                voice: this.config.voice,
                customInstruction: this.config.customInstruction
            });

            // Wire up Gemini events
            this.geminiSession.on('audio-response', (pcmBuffer: Buffer) => {
                // Send AI's voice to phone via VB-Cable
                this.audioRouter.writeToPhone(pcmBuffer);
                this.emit('ai-speaking');
            });

            this.geminiSession.on('turn-complete', () => {
                this.emit('ai-silent');
            });

            this.geminiSession.on('interrupted', () => {
                this.emit('ai-silent');
            });

            this.geminiSession.on('error', (err) => {
                this.emit('error', err);
            });

            // Wire up audio router events
            this.audioRouter.on('audio-from-phone', (pcmBuffer: Buffer) => {
                // Send phone's audio to Gemini
                if (this.geminiSession) {
                    this.geminiSession.sendAudio(pcmBuffer);
                }
            });

            this.audioRouter.on('error', (err) => {
                this.emit('error', err);
            });

            // Connect to Gemini
            await this.geminiSession.connect();

            // Start audio routing
            this.audioRouter.start();

            this.isCallActive = true;
            this.emit('call-started');
            console.log("[PhoneAssistant] Call started - AI is now listening");

        } catch (error) {
            this.emit('error', error as Error);
            this.endCall();
            throw error;
        }
    }

    /**
     * Send a supervisor command to the AI
     */
    sendCommand(text: string): void {
        if (!this.geminiSession || !this.isCallActive) {
            console.warn("Cannot send command - no active call");
            return;
        }
        this.geminiSession.sendCommand(text);
    }

    /**
     * End the phone call session
     */
    endCall(): void {
        // Stop audio routing
        this.audioRouter.stop();

        // Disconnect from Gemini
        if (this.geminiSession) {
            this.geminiSession.disconnect();
            this.geminiSession = null;
        }

        this.isCallActive = false;
        this.emit('call-ended');
        console.log("[PhoneAssistant] Call ended");
    }
}
