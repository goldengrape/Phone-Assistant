import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioPlayback } from './AudioPlayback';

class FakeGainNode {
  gain = { value: 0 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioBuffer {
  duration: number;
  private channelData: Float32Array;

  constructor(length: number, sampleRate: number) {
    this.duration = length / sampleRate;
    this.channelData = new Float32Array(length);
  }

  getChannelData() {
    return this.channelData;
  }
}

class FakeBufferSourceNode {
  buffer: FakeAudioBuffer | null = null;
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  connect = vi.fn();
  start = vi.fn((time: number) => {
    this.startedAt = time;
  });
  stop = vi.fn(() => {
    this.onended?.();
  });
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  destination = {};
  gainNode = new FakeGainNode();
  sources: FakeBufferSourceNode[] = [];
  sampleRate: number;
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {});

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 24000;
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return this.gainNode;
  }

  createBuffer(_channels: number, length: number, sampleRate: number) {
    return new FakeAudioBuffer(length, sampleRate);
  }

  createBufferSource() {
    const source = new FakeBufferSourceNode();
    this.sources.push(source);
    return source;
  }
}

function getPlaybackContext(playback: AudioPlayback): FakeAudioContext | null {
  return (playback as unknown as { audioContext: FakeAudioContext | null }).audioContext;
}

describe('AudioPlayback', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes the audio context and resumes playback', async () => {
    const playback = new AudioPlayback(24000);

    await playback.init();

    const context = getPlaybackContext(playback);
    expect(context).not.toBeNull();
    expect(context?.sampleRate).toBe(24000);
    expect(context?.resume).toHaveBeenCalled();
    expect(context?.gainNode.connect).toHaveBeenCalledWith(context?.destination);
  });

  it('schedules consecutive chunks without overlap', async () => {
    const playback = new AudioPlayback(24000);
    const oneSecondChunk = new Int16Array(24000);
    const halfSecondChunk = new Int16Array(12000);

    await playback.playChunk(oneSecondChunk, 24000);
    await playback.playChunk(halfSecondChunk, 24000);

    const context = getPlaybackContext(playback);
    expect(context?.sources).toHaveLength(2);
    expect(context?.sources[0].startedAt).toBe(0);
    expect(context?.sources[1].startedAt).toBe(1);
  });

  it('recreates the audio context when the input sample rate changes', async () => {
    const playback = new AudioPlayback(24000);

    await playback.playChunk(new Int16Array(2400), 24000);
    const firstContext = getPlaybackContext(playback);

    await playback.playChunk(new Int16Array(1600), 16000);
    const secondContext = getPlaybackContext(playback);

    expect(firstContext?.close).toHaveBeenCalled();
    expect(secondContext).not.toBe(firstContext);
    expect(secondContext?.sampleRate).toBe(16000);
  });

  it('stops active sources and tears down the context', async () => {
    const playback = new AudioPlayback(24000);

    await playback.playChunk(new Int16Array(2400), 24000);
    const context = getPlaybackContext(playback);
    const source = context?.sources[0];

    playback.stop();

    expect(source?.stop).toHaveBeenCalled();
    expect(context?.gainNode.disconnect).toHaveBeenCalled();
    expect(context?.close).toHaveBeenCalled();
    expect(getPlaybackContext(playback)).toBeNull();
  });
});
