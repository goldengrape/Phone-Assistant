import { useEffect, useRef, useState } from 'react';
import { 
  Play, Square, Download, Send, Mic, MessageSquare, 
  Settings, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Volume2
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { AudioCapture } from './audio/AudioCapture';
import { AudioPlayback } from './audio/AudioPlayback';
import { GeminiLiveClient } from './api/GeminiLiveClient';
import { QwenLiveClient } from './api/QwenLiveClient';
import { AIClient, AIClientOptions } from './api/AIClient';
import { cn } from './lib/utils';

const OUTPUT_ACTIVITY_RESET_MS = 250;

function getPcmLevel(samples: Int16Array): number {
  if (!samples.length) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const normalized = samples[i] / 32768;
    sumSquares += normalized * normalized;
  }

  return Math.min(1, Math.sqrt(sumSquares / samples.length) * 6);
}

export default function App() {
  const {
    model, setModel,
    language, setLanguage,
    callPurpose, setCallPurpose,
    geminiApiKey, setGeminiApiKey,
    qwenApiKey, setQwenApiKey,
    status, setStatus,
    messages, addMessage, clearMessages
  } = useAppStore();

  const [whisperText, setWhisperText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const [micState, setMicState] = useState<'idle' | 'monitoring' | 'speaking'>('idle');
  const [speakerState, setSpeakerState] = useState<'idle' | 'waiting' | 'playing'>('idle');
  const [inputConfirmed, setInputConfirmed] = useState(false);
  const [outputConfirmed, setOutputConfirmed] = useState(false);
  const [latestUserTranscript, setLatestUserTranscript] = useState('');
  const [latestAiTranscript, setLatestAiTranscript] = useState('');

  const clientRef = useRef<AIClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakerResetTimerRef = useRef<number | null>(null);
  const inputObservedRef = useRef(false);
  const outputObservedRef = useRef(false);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (speakerResetTimerRef.current !== null) {
        window.clearTimeout(speakerResetTimerRef.current);
      }
    };
  }, []);

  const handleStart = async () => {
    if (status !== 'disconnected') return;

    const apiKey = model === 'Gemini' ? geminiApiKey : qwenApiKey;
    if (!apiKey) {
      addMessage({ role: 'System', text: `Please set the API key for ${model} in settings first.` });
      setShowSettings(true);
      return;
    }

    clearMessages();
    inputObservedRef.current = false;
    outputObservedRef.current = false;
    setMicLevel(0);
    setSpeakerLevel(0);
    setMicState('monitoring');
    setSpeakerState('waiting');
    setInputConfirmed(false);
    setOutputConfirmed(false);
    setLatestUserTranscript('');
    setLatestAiTranscript('');
    if (speakerResetTimerRef.current !== null) {
      window.clearTimeout(speakerResetTimerRef.current);
      speakerResetTimerRef.current = null;
    }
    addMessage({ role: 'System', text: 'Initializing audio devices...' });

    try {
      playbackRef.current = new AudioPlayback(24000);
      await playbackRef.current.init();

      captureRef.current = new AudioCapture();
      captureRef.current.onLevelChange = (level, isSpeechDetected) => {
        setMicLevel(level);
        setMicState(isSpeechDetected ? 'speaking' : 'monitoring');

        if (isSpeechDetected && !inputObservedRef.current) {
          inputObservedRef.current = true;
          setInputConfirmed(true);
          addMessage({ role: 'System', text: 'Detected live microphone input.' });
        }
      };
      captureRef.current.onAudioData = (pcm16) => {
        if (clientRef.current) {
          clientRef.current.sendAudio(pcm16);
        }
      };
      await captureRef.current.start();
      addMessage({ role: 'System', text: 'Microphone started.' });

      const options = {
        callPurpose,
        targetLanguage: language,
        apiKey: apiKey,
        onAudioData: (pcm16: Int16Array, sampleRate?: number) => {
          const level = getPcmLevel(pcm16);
          setSpeakerLevel(level);
          setSpeakerState('playing');

          if (speakerResetTimerRef.current !== null) {
            window.clearTimeout(speakerResetTimerRef.current);
          }
          speakerResetTimerRef.current = window.setTimeout(() => {
            setSpeakerLevel(0);
            setSpeakerState('waiting');
          }, OUTPUT_ACTIVITY_RESET_MS);

          if (level > 0.01 && !outputObservedRef.current) {
            outputObservedRef.current = true;
            setOutputConfirmed(true);
            addMessage({ role: 'System', text: 'Received AI audio and started speaker playback.' });
          }

          if (playbackRef.current) {
            void playbackRef.current.playChunk(pcm16, sampleRate);
          }
        },
        onTranscriptPreview: (role: 'AI' | 'User', text: string) => {
          if (role === 'User') {
            setLatestUserTranscript(text);
          } else {
            setLatestAiTranscript(text);
          }
        },
        onTranscript: (role: string, text: string) => {
          if (role === 'User') {
            setLatestUserTranscript(text);
          } else if (role === 'AI') {
            setLatestAiTranscript(text);
          }
          addMessage({ role: role as 'AI' | 'User', text });
        },
        onStateChange: (newState: 'disconnected' | 'connecting' | 'connected' | 'error') => {
          setStatus(newState);
          if (newState === 'connected') {
            addMessage({ role: 'System', text: `Connected to ${model} Realtime API.` });
            setMicState('monitoring');
            setSpeakerState('waiting');
          } else if (newState === 'error') {
            addMessage({ role: 'System', text: 'Connection Error. Please check your API key and network.' });
            handleStop();
          }
        }
      };

      if (model === 'Gemini') {
        clientRef.current = new GeminiLiveClient(options);
      } else {
        clientRef.current = new QwenLiveClient(options);
      }

      await clientRef.current.connect();

    } catch (err) {
      console.error(err);
      addMessage({ role: 'System', text: `Error: ${(err as Error).message}` });
      setStatus('disconnected');
    }
  };

  const handleStop = () => {
    if (speakerResetTimerRef.current !== null) {
      window.clearTimeout(speakerResetTimerRef.current);
      speakerResetTimerRef.current = null;
    }
    inputObservedRef.current = false;
    outputObservedRef.current = false;
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (captureRef.current) {
      captureRef.current.onLevelChange = null;
      captureRef.current.stop();
      captureRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    setMicLevel(0);
    setSpeakerLevel(0);
    setMicState('idle');
    setSpeakerState('idle');
    setInputConfirmed(false);
    setOutputConfirmed(false);
    setLatestUserTranscript('');
    setLatestAiTranscript('');
    setStatus('disconnected');
    addMessage({ role: 'System', text: 'Call ended.' });
  };

  const testApiKey = async () => {
    const apiKey = model === 'Gemini' ? geminiApiKey : qwenApiKey;
    if (!apiKey) return;

    setTestingKey(true);
    setTestResult(null);

    try {
      let testClient: AIClient | null = null;
      const options: AIClientOptions = {
        onAudioData: () => {},
        onTranscript: () => {},
        onStateChange: (state) => {
          if (state === 'connected') {
            setTestResult('success');
            setTestingKey(false);
            setTimeout(() => {
              if (testClient) testClient.disconnect();
            }, 500);
          } else if (state === 'error') {
            setTestResult('error');
            setTestingKey(false);
          }
        },
        apiKey: apiKey
      };

      testClient = model === 'Gemini' 
        ? new GeminiLiveClient(options) 
        : new QwenLiveClient(options);
      
      await testClient.connect();
      
      // Auto-timeout if it takes too long
      setTimeout(() => {
        setTestingKey(false);
      }, 5000);

    } catch {
      setTestResult('error');
      setTestingKey(false);
    }
  };

  const handleSendWhisper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whisperText.trim()) return;

    if (clientRef.current && status === 'connected') {
      clientRef.current.sendWhisper(whisperText);
      addMessage({ role: 'Supervisor', text: whisperText });
      setWhisperText('');
    } else {
      addMessage({ role: 'System', text: 'Cannot whisper: Not connected.' });
    }
  };

  const exportLog = () => {
    const log = messages.map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.role}: ${m.text}`).join('\n');
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Header */}
      <header className="p-4 bg-neutral-950 border-b border-neutral-800 shrink-0 shadow-md z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mic className="text-blue-500" size={24} />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">AI Phone Assistant <span className="text-xs font-normal text-neutral-500 ml-1">v1.1.0</span></h1>
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ml-2",
              status === 'connected' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
              status === 'connecting' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
              "bg-red-500/20 text-red-400 border border-red-500/30"
            )}>
              {status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              disabled={status !== 'disconnected'}
              className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={model}
              onChange={(e) => {
                setModel(e.target.value as 'Gemini' | 'Qwen');
                setTestResult(null);
              }}
            >
              <option value="Gemini">Gemini 2.5 Flash Native</option>
              <option value="Qwen">Qwen Omni</option>
            </select>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showSettings ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              )}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {showSettings && (
          <div className="max-w-6xl mx-auto mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Model Configuration</h3>
                <div className="space-y-2">
                  <label className="text-xs text-neutral-500">Target Language</label>
                  <select
                    disabled={status !== 'disconnected'}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="Auto">Auto-detect Lang</option>
                    <option value="English">English</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">API Keys</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={`${model} API Key`}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded pl-3 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      value={model === 'Gemini' ? geminiApiKey : qwenApiKey}
                      onChange={(e) => {
                        if (model === 'Gemini') {
                          setGeminiApiKey(e.target.value);
                        } else {
                          setQwenApiKey(e.target.value);
                        }
                        setTestResult(null);
                      }}
                    />
                    <div className="absolute right-1 top-1 flex items-center gap-1">
                      {testResult === 'success' && <CheckCircle2 size={16} className="text-green-500 mr-1" />}
                      {testResult === 'error' && <XCircle size={16} className="text-red-500 mr-1" />}
                      <button 
                        onClick={testApiKey}
                        disabled={testingKey || !(model === 'Gemini' ? geminiApiKey : qwenApiKey)}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                      >
                        {testingKey ? <Loader2 size={12} className="animate-spin" /> : 'TEST'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500">Keys are stored securely in your browser's local storage.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-6xl w-full mx-auto p-4 gap-4">
        
        {/* System Prompt (Call Purpose) Section - AI Studio Style */}
        <section className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300">
          <button 
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full flex items-center justify-between p-4 bg-neutral-900/50 hover:bg-neutral-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <h2 className="text-sm font-bold text-neutral-300">System Instructions / Call Purpose</h2>
            </div>
            {showPrompt ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showPrompt && (
            <div className="p-4 border-t border-neutral-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <textarea
                disabled={status !== 'disconnected'}
                value={callPurpose}
                onChange={(e) => setCallPurpose(e.target.value)}
                placeholder="Define the AI's role and the goal of the call..."
                className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-neutral-300 font-mono leading-relaxed shadow-inner placeholder:text-neutral-700 focus:bg-neutral-800 transition-colors"
              />
              <div className="mt-2 flex justify-end">
                <span className="text-[10px] text-neutral-600 uppercase tracking-tighter">Markdown supported</span>
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  micState === 'speaking'
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                )}>
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Voice Input</p>
                  <p className="text-xs text-neutral-500">
                    {status === 'disconnected'
                      ? 'Microphone idle'
                      : micState === 'speaking'
                        ? 'Speech detected and streaming'
                        : inputConfirmed
                          ? 'Mic active, waiting for next speech'
                          : 'Mic active, waiting for speech'}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                inputConfirmed
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              )}>
                {inputConfirmed ? 'Confirmed' : 'No Signal Yet'}
              </span>
            </div>
            <div className="mt-4 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-150",
                  micState === 'speaking' ? "bg-green-400" : "bg-blue-500"
                )}
                style={{ width: `${Math.round(micLevel * 100)}%` }}
              />
            </div>
            <div className="mt-3 min-h-10 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-400">
              {latestUserTranscript || 'Recognized user speech will appear here.'}
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  speakerState === 'playing'
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                )}>
                  <Volume2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Voice Output</p>
                  <p className="text-xs text-neutral-500">
                    {status === 'disconnected'
                      ? 'Speaker idle'
                      : speakerState === 'playing'
                        ? 'Playing AI audio'
                        : outputConfirmed
                          ? 'Playback ready for next response'
                          : 'Waiting for AI audio'}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                outputConfirmed
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              )}>
                {outputConfirmed ? 'Playing' : 'Waiting'}
              </span>
            </div>
            <div className="mt-4 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full rounded-full bg-blue-400 transition-[width] duration-150"
                style={{ width: `${Math.round(speakerLevel * 100)}%` }}
              />
            </div>
            <div className="mt-3 min-h-10 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-400">
              {latestAiTranscript || 'Recognized assistant speech will appear here.'}
            </div>
          </div>
        </section>

        {/* Transcript Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl p-6 space-y-6 shadow-inner relative group"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
              <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 group-hover:border-blue-500/50 transition-colors duration-500">
                <MessageSquare size={32} className="opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-neutral-400">Ready to start the call</p>
                <p className="text-xs">Transcript and events will appear here in real-time.</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'Supervisor' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-3 rounded-2xl max-w-[85%] text-sm md:text-base shadow-sm relative group",
                  msg.role === 'AI' ? "bg-blue-600/10 border border-blue-500/20 text-blue-100 rounded-tl-none" :
                  msg.role === 'User' ? "bg-neutral-800/80 border border-neutral-700 text-neutral-100 rounded-tl-none" :
                  msg.role === 'Supervisor' ? "bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tr-none" :
                  "bg-transparent border-none text-neutral-500 text-[10px] text-center mx-auto py-1 italic"
                )}>
                  {msg.role !== 'System' && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-60 text-[10px] font-bold uppercase tracking-widest">
                      <span>{msg.role}</span>
                      <span className="w-1 h-1 bg-current rounded-full" />
                      <span className="font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Control Area */}
      <footer className="p-6 bg-neutral-950 border-t border-neutral-800 shrink-0 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {status === 'disconnected' ? (
              <button
                onClick={handleStart}
                className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-8 py-3.5 rounded-xl font-bold w-full sm:w-auto text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                <Play size={20} fill="currentColor" />
                Start Live Call
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 active:scale-95 transition-all px-8 py-3.5 rounded-xl font-bold w-full sm:w-auto text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse"
              >
                <Square size={20} fill="currentColor" />
                End Session
              </button>
            )}

            <button
              onClick={exportLog}
              disabled={messages.length === 0}
              className="p-3.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-neutral-300 transition-all active:scale-90 border border-neutral-700"
              title="Export Log"
            >
              <Download size={20} />
            </button>
          </div>

          <form onSubmit={handleSendWhisper} className="flex-1 flex w-full relative group">
            <input
              type="text"
              placeholder={status === 'connected' ? "Whisper a command to the AI..." : "Connect to whisper commands"}
              className="w-full bg-neutral-900 border border-neutral-800 group-hover:border-neutral-700 rounded-xl pl-5 pr-14 py-3.5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-inner placeholder:text-neutral-700"
              value={whisperText}
              onChange={(e) => setWhisperText(e.target.value)}
              disabled={status !== 'connected'}
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !whisperText.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-neutral-500 hover:text-purple-400 hover:bg-purple-500/10 disabled:opacity-0 transition-all"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
