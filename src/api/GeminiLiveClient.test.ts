import { beforeEach, describe, expect, it, vi } from 'vitest';

const geminiMock = vi.hoisted(() => ({
  connectMock: vi.fn(),
  constructorArgs: [] as Array<{ apiKey: string }>,
}));

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    live = {
      connect: geminiMock.connectMock,
    };

    constructor(config: { apiKey: string }) {
      geminiMock.constructorArgs.push(config);
    }
  }

  return {
    GoogleGenAI,
    MediaResolution: {
      MEDIA_RESOLUTION_MEDIUM: 'MEDIA_RESOLUTION_MEDIUM',
    },
    Modality: {
      AUDIO: 'AUDIO',
    },
  };
});

import { DEFAULT_GEMINI_VOICE } from '../voices';
import { GeminiLiveClient } from './GeminiLiveClient';

type ConnectArgs = {
  model: string;
  config: {
    systemInstruction: string;
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
    };
  };
  callbacks: {
    onopen: () => void;
    onmessage: (message: unknown) => void;
    onerror: (event: { message: string }) => void;
    onclose: (event: { reason: string }) => void;
  };
};

function decodeBase64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function assertExists<T>(value: T, label: string): NonNullable<T> {
  if (!value) {
    throw new Error(`${label} missing`);
  }

  return value as NonNullable<T>;
}

function createSessionMock() {
  return {
    sendRealtimeInput: vi.fn(),
    sendClientContent: vi.fn(),
    close: vi.fn(),
  };
}

function createClient() {
  const options = {
    apiKey: 'gemini-test-key',
    callPurpose: 'Negotiate a lower monthly rate',
    targetLanguage: 'French',
    voiceName: 'Kore',
    onAudioData: vi.fn(),
    onTranscript: vi.fn(),
    onTranscriptPreview: vi.fn(),
    onStateChange: vi.fn(),
  };

  return {
    client: new GeminiLiveClient(options),
    options,
  };
}

describe('GeminiLiveClient', () => {
  beforeEach(() => {
    geminiMock.connectMock.mockReset();
    geminiMock.constructorArgs.length = 0;
  });

  it('assembles the realtime session config and reports connecting/connected', async () => {
    const session = createSessionMock();
    let connectArgs: ConnectArgs | null = null;
    geminiMock.connectMock.mockImplementation(async (args) => {
      connectArgs = args;
      args.callbacks.onopen();
      return session;
    });

    const { client, options } = createClient();
    await client.connect();

    expect(geminiMock.constructorArgs).toEqual([{ apiKey: 'gemini-test-key' }]);
    expect(options.onStateChange.mock.calls.map(([state]) => state)).toEqual(['connecting', 'connected']);
    const actualConnectArgs = assertExists(connectArgs, 'connect args') as ConnectArgs;
    expect(actualConnectArgs.model).toBe('models/gemini-2.5-flash-native-audio-preview-12-2025');
    expect(actualConnectArgs.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
    expect(actualConnectArgs.config.systemInstruction).toContain('CALL PURPOSE: Your main goal and role for this call is: Negotiate a lower monthly rate');
    expect(actualConnectArgs.config.systemInstruction).toContain('OUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in French.');
  });

  it('falls back to the default voice and skips the language constraint for Auto', async () => {
    const session = createSessionMock();
    let connectArgs: ConnectArgs | null = null;
    geminiMock.connectMock.mockImplementation(async (args) => {
      connectArgs = args;
      args.callbacks.onopen();
      return session;
    });

    const options = {
      apiKey: 'gemini-test-key',
      callPurpose: 'Book a follow-up meeting',
      targetLanguage: 'Auto',
      onAudioData: vi.fn(),
      onTranscript: vi.fn(),
      onTranscriptPreview: vi.fn(),
      onStateChange: vi.fn(),
    };
    const client = new GeminiLiveClient(options);

    await client.connect();

    const actualConnectArgs = assertExists(connectArgs, 'connect args') as ConnectArgs;
    expect(actualConnectArgs.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe(DEFAULT_GEMINI_VOICE);
    expect(actualConnectArgs.config.systemInstruction).not.toContain('OUTPUT LANGUAGE CONSTRAINT');
  });

  it('encodes only the selected audio view and sends whisper content after connect', async () => {
    const session = createSessionMock();
    geminiMock.connectMock.mockImplementation(async (args) => {
      args.callbacks.onopen();
      return session;
    });

    const { client } = createClient();
    await client.connect();

    const source = new Int16Array([100, 200, 300, 400]);
    client.sendAudio(source.subarray(1, 3));
    client.sendWhisper('Offer a two-year contract if needed');

    expect(session.sendRealtimeInput).toHaveBeenCalledTimes(1);
    const encodedAudio = session.sendRealtimeInput.mock.calls[0][0].media.data as string;
    expect(Array.from(decodeBase64ToInt16(encodedAudio))).toEqual([200, 300]);

    expect(session.sendClientContent).toHaveBeenCalledWith({
      turns: [
        '[LATEST SUPERVISOR WHISPER: Offer a two-year contract if needed - STEER THE CONVERSATION NOW WITHOUT READING THIS OUT LOUD]',
      ],
      turnComplete: true,
    });
  });

  it('ignores audio and whisper sends before the session is connected', () => {
    const { client } = createClient();

    expect(() => client.sendAudio(new Int16Array([1, 2]))).not.toThrow();
    expect(() => client.sendWhisper('Stay calm')).not.toThrow();
  });

  it('routes transcript previews, final transcripts, fallback text, and audio payloads from server messages', async () => {
    const session = createSessionMock();
    let callbacks: ConnectArgs['callbacks'] | null = null;
    geminiMock.connectMock.mockImplementation(async (args) => {
      callbacks = args.callbacks;
      args.callbacks.onopen();
      return session;
    });

    const { client, options } = createClient();
    await client.connect();
    const messageCallbacks = assertExists(callbacks, 'callbacks') as ConnectArgs['callbacks'];

    const audioData = btoa(String.fromCharCode(1, 0, 255, 127));
    messageCallbacks.onmessage({
      serverContent: {
        inputTranscription: {
          text: ' hello there ',
          finished: true,
        },
        outputTranscription: {
          text: ' bonjour ',
          finished: true,
        },
        modelTurn: {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/pcm;rate=24000',
                data: audioData,
              },
            },
          ],
        },
      },
    });
    messageCallbacks.onmessage({
      serverContent: {
        outputTranscription: {
          text: ' bonjour ',
          finished: true,
        },
      },
    });
    messageCallbacks.onmessage({
      serverContent: {
        modelTurn: {
          parts: [
            {
              text: 'Fallback text response',
            },
          ],
        },
      },
    });

    expect(options.onTranscriptPreview).toHaveBeenCalledWith('User', 'hello there', true);
    expect(options.onTranscriptPreview).toHaveBeenCalledWith('AI', 'bonjour', true);
    expect(options.onTranscriptPreview).toHaveBeenCalledWith('AI', 'Fallback text response', true);
    expect(options.onTranscript).toHaveBeenCalledWith('User', 'hello there');
    expect(options.onTranscript).toHaveBeenCalledWith('AI', 'bonjour');
    expect(options.onTranscript).toHaveBeenCalledWith('AI', 'Fallback text response');
    expect(options.onTranscript.mock.calls.filter(([role, text]) => role === 'AI' && text === 'bonjour')).toHaveLength(1);
    expect(options.onAudioData).toHaveBeenCalledTimes(1);
    expect(Array.from(options.onAudioData.mock.calls[0][0] as Int16Array)).toEqual([1, 32767]);
    expect(options.onAudioData.mock.calls[0][1]).toBe(24000);
  });

  it('reports error states from connect failures and runtime callbacks', async () => {
    const connectError = new Error('connect failed');
    geminiMock.connectMock.mockRejectedValueOnce(connectError);

    const { client, options } = createClient();
    await expect(client.connect()).rejects.toThrow('connect failed');
    expect(options.onStateChange.mock.calls.map(([state]) => state)).toEqual(['connecting', 'error']);

    const session = createSessionMock();
    let callbacks: ConnectArgs['callbacks'] | null = null;
    geminiMock.connectMock.mockImplementationOnce(async (args) => {
      callbacks = args.callbacks;
      args.callbacks.onopen();
      return session;
    });

    const runtime = createClient();
    await runtime.client.connect();
    const runtimeCallbacks = assertExists(callbacks, 'callbacks') as ConnectArgs['callbacks'];
    runtimeCallbacks.onerror({ message: 'socket broke' });
    runtimeCallbacks.onclose({ reason: 'normal close' });

    expect(runtime.options.onStateChange.mock.calls.map(([state]) => state)).toEqual([
      'connecting',
      'connected',
      'error',
      'disconnected',
    ]);
  });

  it('closes the active session on disconnect', async () => {
    const session = createSessionMock();
    geminiMock.connectMock.mockImplementation(async (args) => {
      args.callbacks.onopen();
      return session;
    });

    const { client } = createClient();
    await client.connect();
    client.disconnect();

    expect(session.close).toHaveBeenCalledTimes(1);
  });
});
