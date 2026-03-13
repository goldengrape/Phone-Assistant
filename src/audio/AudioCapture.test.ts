import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioCapture } from './AudioCapture';

class FakeTrack {
  stop = vi.fn();
}

class FakeMediaStream {
  track = new FakeTrack();

  getTracks() {
    return [this.track];
  }
}

class FakeMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeGainNode {
  gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeScriptProcessorNode {
  onaudioprocess: ((event: { inputBuffer: { getChannelData: (channel: number) => Float32Array } }) => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: 'suspended' | 'running' = 'suspended';
  destination = {};
  sourceNode = new FakeMediaStreamAudioSourceNode();
  gainNode = new FakeGainNode();
  processorNode = new FakeScriptProcessorNode();
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {});

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createMediaStreamSource() {
    return this.sourceNode;
  }

  createGain() {
    return this.gainNode;
  }

  createScriptProcessor() {
    return this.processorNode;
  }
}

describe('AudioCapture', () => {
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

  it('captures microphone audio and converts it to PCM16', async () => {
    const stream = new FakeMediaStream();
    const getUserMedia = vi.fn(async () => stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    const capture = new AudioCapture();
    const levelSpy = vi.fn();
    const audioSpy = vi.fn();
    capture.onLevelChange = levelSpy;
    capture.onAudioData = audioSpy;

    await capture.start();

    const context = FakeAudioContext.instances[0];
    context.processorNode.onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => Float32Array.from([0.5, -0.5, 0]),
      },
    });

    expect(getUserMedia).toHaveBeenCalled();
    expect(levelSpy).toHaveBeenCalledTimes(1);
    expect(levelSpy.mock.calls[0][0]).toBeGreaterThan(0);
    expect(levelSpy.mock.calls[0][1]).toBe(true);
    expect(Array.from(audioSpy.mock.calls[0][0] as Int16Array)).toEqual([16383, -16384, 0]);
  });

  it('releases nodes and tracks when stopped', async () => {
    const stream = new FakeMediaStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    });

    const capture = new AudioCapture();
    await capture.start();
    const context = FakeAudioContext.instances[0];

    capture.stop();

    expect(context.processorNode.disconnect).toHaveBeenCalled();
    expect(context.gainNode.disconnect).toHaveBeenCalled();
    expect(context.sourceNode.disconnect).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
    expect(stream.track.stop).toHaveBeenCalled();
  });

  it('cleans up the stream if startup fails after microphone access succeeds', async () => {
    const stream = new FakeMediaStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const capture = new AudioCapture();

    await expect(capture.start()).rejects.toThrow('Web Audio API is not supported in this browser.');
    expect(stream.track.stop).toHaveBeenCalled();
  });
});
