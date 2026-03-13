import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  captureInstances: [] as Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onAudioData: ((pcm16: Int16Array) => void) | null;
    onLevelChange: ((level: number, isSpeechDetected: boolean) => void) | null;
  }>,
  playbackInstances: [] as Array<{
    init: ReturnType<typeof vi.fn>;
    playChunk: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>,
  geminiInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    sendAudio: ReturnType<typeof vi.fn>;
    sendWhisper: ReturnType<typeof vi.fn>;
    options: {
      onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
    };
  }>,
  qwenInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    sendAudio: ReturnType<typeof vi.fn>;
    sendWhisper: ReturnType<typeof vi.fn>;
    options: {
      onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
    };
  }>,
  onGeminiConnect: null as null | ((client: { options: { onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void } }) => Promise<void> | void),
}));

vi.mock('./audio/AudioCapture', () => {
  class MockAudioCapture {
    onAudioData: ((pcm16: Int16Array) => void) | null = null;
    onLevelChange: ((level: number, isSpeechDetected: boolean) => void) | null = null;
    start = vi.fn(async () => {});
    stop = vi.fn(() => {});

    constructor() {
      mockState.captureInstances.push(this);
    }
  }

  return { AudioCapture: MockAudioCapture };
});

vi.mock('./audio/AudioPlayback', () => {
  class MockAudioPlayback {
    init = vi.fn(async () => {});
    playChunk = vi.fn(async () => {});
    stop = vi.fn(() => {});

    constructor() {
      mockState.playbackInstances.push(this);
    }
  }

  return { AudioPlayback: MockAudioPlayback };
});

vi.mock('./api/GeminiLiveClient', () => {
  class MockGeminiLiveClient {
    options;
    connect = vi.fn(async () => {
      if (mockState.onGeminiConnect) {
        await mockState.onGeminiConnect(this);
        return;
      }
      this.options.onStateChange('connected');
    });
    disconnect = vi.fn(() => {
      this.options.onStateChange('disconnected');
    });
    sendAudio = vi.fn();
    sendWhisper = vi.fn();

    constructor(options: { onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void }) {
      this.options = options;
      mockState.geminiInstances.push(this);
    }
  }

  return { GeminiLiveClient: MockGeminiLiveClient };
});

vi.mock('./api/QwenLiveClient', () => {
  class MockQwenLiveClient {
    options;
    connect = vi.fn(async () => {
      this.options.onStateChange('connected');
    });
    disconnect = vi.fn(() => {
      this.options.onStateChange('disconnected');
    });
    sendAudio = vi.fn();
    sendWhisper = vi.fn();

    constructor(options: { onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void }) {
      this.options = options;
      mockState.qwenInstances.push(this);
    }
  }

  return { QwenLiveClient: MockQwenLiveClient };
});

async function renderFreshApp() {
  vi.resetModules();
  cleanup();
  localStorage.clear();
  localStorage.setItem('gemini_api_key', 'test-key');
  mockState.captureInstances = [];
  mockState.playbackInstances = [];
  mockState.geminiInstances = [];
  mockState.qwenInstances = [];

  const { default: App } = await import('./App');
  return render(<App />);
}

describe('App session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    mockState.onGeminiConnect = null;
  });

  it('cleans up playback and capture when the provider disconnects remotely', async () => {
    const user = userEvent.setup();
    await renderFreshApp();

    await user.click(screen.getByRole('button', { name: 'Start Live Call' }));
    await screen.findByRole('button', { name: 'End Session' });

    const capture = mockState.captureInstances[0];
    const playback = mockState.playbackInstances[0];
    const client = mockState.geminiInstances[0];

    client.options.onStateChange('disconnected');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Live Call' })).toBeTruthy();
    });
    expect(capture.stop).toHaveBeenCalledTimes(1);
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(screen.getAllByText('Call ended.')).toHaveLength(1);
  });

  it('cleans up started resources if provider connect fails', async () => {
    const user = userEvent.setup();
    mockState.onGeminiConnect = async () => {
      throw new Error('boom');
    };

    await renderFreshApp();
    await user.click(screen.getByRole('button', { name: 'Start Live Call' }));

    await screen.findByText('Error: boom');

    expect(mockState.captureInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(mockState.playbackInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Start Live Call' })).toBeTruthy();
  });

  it('adds only one end-of-call message when the user stops the session', async () => {
    const user = userEvent.setup();
    await renderFreshApp();

    await user.click(screen.getByRole('button', { name: 'Start Live Call' }));
    await screen.findByRole('button', { name: 'End Session' });

    const client = mockState.geminiInstances[0];

    await user.click(screen.getByRole('button', { name: 'End Session' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Live Call' })).toBeTruthy();
    });
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Call ended.')).toHaveLength(1);
  });
});
