export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private monitorNode: GainNode | null = null;

  // Model API requirements
  private targetSampleRate = 16000;

  public onAudioData: ((pcmData: Int16Array) => void) | null = null;
  public onLevelChange: ((level: number, isSpeechDetected: boolean) => void) | null = null;

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const AudioContextCtor = window.AudioContext
        || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      this.audioContext = new AudioContextCtor({
        sampleRate: this.targetSampleRate,
        latencyHint: 'interactive'
      });
      await this.audioContext.resume();

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.monitorNode = this.audioContext.createGain();
      this.monitorNode.gain.value = 0;

      // We use ScriptProcessorNode for simplicity and wide compatibility
      // In a production environment, AudioWorklet is preferred
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sumSquares = 0;

        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }

        const rms = Math.sqrt(sumSquares / inputData.length);
        const normalizedLevel = Math.min(1, rms * 8);
        this.onLevelChange?.(normalizedLevel, rms > 0.015);

        // Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        if (this.onAudioData) {
          this.onAudioData(pcm16);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.monitorNode);
      this.monitorNode.connect(this.audioContext.destination);

    } catch (error) {
      this.stop();
      console.error("Error starting audio capture:", error);
      throw error;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.monitorNode) {
      this.monitorNode.disconnect();
      this.monitorNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
