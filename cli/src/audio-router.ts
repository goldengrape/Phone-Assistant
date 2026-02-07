/**
 * Audio Router - Handles bidirectional audio streaming with VB-Cable
 * 
 * Data flow:
 * Phone speaks -> CABLE Output (input) -> This module -> Gemini API
 * Gemini responds -> This module -> CABLE Input (output) -> Phone hears
 */
import { EventEmitter } from 'events';
import { findVBCableDevices } from './list-devices';

// Lazy load naudiodon
let portAudio: typeof import('naudiodon') | null = null;
function getPortAudio(): typeof import('naudiodon') {
    if (!portAudio) {
        portAudio = require('naudiodon');
    }
    return portAudio!;
}

const SAMPLE_RATE = 16000;  // Gemini uses 16kHz for input
const OUTPUT_SAMPLE_RATE = 24000;  // Gemini outputs 24kHz
const CHANNELS = 1;

export interface AudioRouterEvents {
    'audio-from-phone': (pcmBuffer: Buffer) => void;
    'error': (error: Error) => void;
    'started': () => void;
    'stopped': () => void;
}

export class AudioRouter extends EventEmitter {
    private inputStream: any = null;
    private outputStream: any = null;
    private readDeviceId: number | null = null;
    private writeDeviceId: number | null = null;
    private isRunning = false;

    constructor() {
        super();
        const devices = findVBCableDevices();
        this.readDeviceId = devices.readDeviceId;
        this.writeDeviceId = devices.writeDeviceId;
    }

    get isReady(): boolean {
        return this.readDeviceId !== null && this.writeDeviceId !== null;
    }

    getStatus(): { inputDevice: number | null; outputDevice: number | null; running: boolean } {
        return {
            inputDevice: this.readDeviceId,
            outputDevice: this.writeDeviceId,
            running: this.isRunning
        };
    }

    /**
     * Start reading audio from VB-Cable (phone's voice)
     */
    start(): void {
        if (!this.isReady) {
            throw new Error("VB-Cable devices not found. Please install VB-Audio Virtual Cable.");
        }

        if (this.isRunning) {
            console.warn("AudioRouter already running");
            return;
        }

        try {
            const pa = getPortAudio();
            // Create input stream (read from CABLE Output = phone's audio)
            this.inputStream = pa.AudioIO({
                inOptions: {
                    channelCount: CHANNELS,
                    sampleFormat: pa.SampleFormat16Bit,
                    sampleRate: SAMPLE_RATE,
                    deviceId: this.readDeviceId!,
                    closeOnError: true
                }
            });

            // Create output stream (write to CABLE Input = AI's voice to phone)
            this.outputStream = pa.AudioIO({
                outOptions: {
                    channelCount: CHANNELS,
                    sampleFormat: pa.SampleFormat16Bit,
                    sampleRate: OUTPUT_SAMPLE_RATE,
                    deviceId: this.writeDeviceId!,
                    closeOnError: true
                }
            });

            // Handle incoming audio from phone
            this.inputStream.on('data', (buffer: Buffer) => {
                this.emit('audio-from-phone', buffer);
            });

            this.inputStream.on('error', (err: Error) => {
                this.emit('error', err);
            });

            this.outputStream.on('error', (err: Error) => {
                this.emit('error', err);
            });

            // Start streams
            this.inputStream.start();
            this.outputStream.start();
            this.isRunning = true;

            this.emit('started');
            console.log("[AudioRouter] Started - listening for phone audio");

        } catch (error) {
            this.emit('error', error as Error);
            throw error;
        }
    }

    /**
     * Write audio to VB-Cable (AI's voice to phone)
     */
    writeToPhone(pcmBuffer: Buffer): void {
        if (!this.isRunning || !this.outputStream) {
            console.warn("AudioRouter not running, cannot write audio");
            return;
        }

        this.outputStream.write(pcmBuffer);
    }

    /**
     * Stop all audio streams
     */
    stop(): void {
        if (this.inputStream) {
            try {
                this.inputStream.quit();
            } catch (e) {
                // Ignore cleanup errors
            }
            this.inputStream = null;
        }

        if (this.outputStream) {
            try {
                this.outputStream.quit();
            } catch (e) {
                // Ignore cleanup errors
            }
            this.outputStream = null;
        }

        this.isRunning = false;
        this.emit('stopped');
        console.log("[AudioRouter] Stopped");
    }
}

/**
 * Convert Float32Array to Int16 PCM Buffer (for sending to Gemini)
 */
export function float32ToInt16(float32Array: Float32Array): Buffer {
    const buffer = Buffer.alloc(float32Array.length * 2);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        buffer.writeInt16LE(Math.round(val), i * 2);
    }
    return buffer;
}

/**
 * Convert Int16 PCM Buffer to Float32Array
 */
export function int16ToFloat32(buffer: Buffer): Float32Array {
    const float32Array = new Float32Array(buffer.length / 2);
    for (let i = 0; i < float32Array.length; i++) {
        const val = buffer.readInt16LE(i * 2);
        float32Array[i] = val / (val < 0 ? 0x8000 : 0x7FFF);
    }
    return float32Array;
}
