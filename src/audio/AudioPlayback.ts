export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sampleRate: number;
  private nextStartTime: number = 0;
  private activeSources = new Set<AudioBufferSourceNode>();

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate; // Gemini default 24kHz, Qwen default 16/24kHz
  }

  async init() {
    if (!this.audioContext) {
      const AudioContextCtor = window.AudioContext
        || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      this.audioContext = new AudioContextCtor({
        sampleRate: this.sampleRate,
      });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1;
      this.gainNode.connect(this.audioContext.destination);
    }
    await this.ensureReady();
    this.nextStartTime = this.audioContext.currentTime;
  }

  async playChunk(pcm16Data: Int16Array) {
    if (!pcm16Data.length) return;
    if (!this.audioContext) {
      await this.init();
    } else {
      await this.ensureReady();
    }
    if (!this.audioContext || !this.gainNode) return;

    // Convert Int16Array to Float32Array for Web Audio API
    const float32Data = new Float32Array(pcm16Data.length);
    for (let i = 0; i < pcm16Data.length; i++) {
      float32Data[i] = pcm16Data[i] / (pcm16Data[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.onended = () => {
      this.activeSources.delete(source);
    };
    this.activeSources.add(source);

    // Schedule playback seamlessly to avoid clicks
    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  private async ensureReady() {
    if (this.audioContext && this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }
  }

  stop() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore sources that have already finished.
      }
    });
    this.activeSources.clear();
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.nextStartTime = 0;
    }
  }
}
