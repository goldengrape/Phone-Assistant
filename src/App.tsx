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
import { resolveLocale, targetLanguageOptions, translations, uiLanguageOptions } from './i18n';
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
    uiLanguage, setUiLanguage,
    callPurpose, setCallPurpose,
    geminiApiKey, setGeminiApiKey,
    qwenApiKey, setQwenApiKey,
    status, setStatus,
    messages, addMessage, clearMessages
  } = useAppStore();

  const locale = resolveLocale(uiLanguage, typeof navigator !== 'undefined' ? navigator.language : 'en');
  const text = translations[locale];
  const modelLabel = model === 'Gemini' ? text.misc.modelGemini : text.misc.modelQwen;
  const surfaceClass = 'border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow)] backdrop-blur-xl';
  const surfaceStrongClass = 'border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] shadow-[var(--app-shadow)] backdrop-blur-xl';
  const fieldClass = 'border border-[color:var(--app-input-border)] bg-[var(--app-input)] text-[var(--app-text)] shadow-inner placeholder:text-[var(--app-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--app-ring)]';

  const getRoleLabel = (role: 'AI' | 'User' | 'Supervisor' | 'System') => {
    if (role === 'AI') return text.misc.roleAI;
    if (role === 'User') return text.misc.roleUser;
    if (role === 'Supervisor') return text.misc.roleSupervisor;
    return text.misc.roleSystem;
  };

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
      addMessage({ role: 'System', text: text.system.setApiKeyFirst(modelLabel) });
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
    addMessage({ role: 'System', text: text.system.initializingAudioDevices });

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
          addMessage({ role: 'System', text: text.system.detectedMicInput });
        }
      };
      captureRef.current.onAudioData = (pcm16) => {
        if (clientRef.current) {
          clientRef.current.sendAudio(pcm16);
        }
      };
      await captureRef.current.start();
      addMessage({ role: 'System', text: text.system.microphoneStarted });

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
            addMessage({ role: 'System', text: text.system.receivedAiAudio });
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
            addMessage({ role: 'System', text: text.system.connectedRealtimeApi(modelLabel) });
            setMicState('monitoring');
            setSpeakerState('waiting');
          } else if (newState === 'error') {
            addMessage({ role: 'System', text: text.system.connectionError });
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
      addMessage({ role: 'System', text: `${text.system.errorPrefix}: ${(err as Error).message}` });
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
    addMessage({ role: 'System', text: text.system.callEnded });
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
      addMessage({ role: 'System', text: text.system.cannotWhisper });
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
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)] text-[var(--app-text)] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-[color:var(--app-border)] bg-[var(--app-surface-strong)]/90 px-4 py-4 shadow-[var(--app-shadow)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Mic className="text-blue-500" size={24} />
            <h1 className="min-w-0 text-lg font-bold tracking-tight sm:text-xl">
              {text.misc.appTitle}
              <span className="ml-2 text-xs font-normal text-[var(--app-text-soft)]">v1.1.0</span>
            </h1>
            <span className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:ml-2",
              status === 'connected' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
              status === 'connecting' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
              "bg-red-500/20 text-red-400 border border-red-500/30"
            )}>
              {text.status[status]}
            </span>
          </div>

          <div className="flex w-full items-center gap-3 sm:w-auto">
            <select
              disabled={status !== 'disconnected'}
              className={cn(
                "min-w-0 flex-1 rounded-xl px-3 py-2 text-sm disabled:opacity-50 sm:w-72 sm:flex-none",
                fieldClass
              )}
              value={model}
              onChange={(e) => {
                setModel(e.target.value as 'Gemini' | 'Qwen');
                setTestResult(null);
              }}
            >
              <option value="Gemini">{text.misc.modelGemini}</option>
              <option value="Qwen">{text.misc.modelQwen}</option>
            </select>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "rounded-xl border border-[color:var(--app-input-border)] p-2.5 transition-colors",
                showSettings
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--app-input)] text-[var(--app-text-soft)] hover:bg-[color:var(--app-surface-muted)]"
              )}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {showSettings && (
          <div className={cn(
            "mx-auto mt-4 max-w-6xl rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200",
            surfaceClass
          )}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{text.settings.modelConfiguration}</h3>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--app-text-soft)]">{text.settings.targetLanguage}</label>
                  <select
                    disabled={status !== 'disconnected'}
                    className={cn("w-full rounded-xl px-3 py-2 text-sm", fieldClass)}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {targetLanguageOptions.map((option) => (
                      <option key={option} value={option}>
                        {text.languageLabels[option]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--app-text-soft)]">{text.settings.interfaceLanguage}</label>
                  <select
                    className={cn("w-full rounded-xl px-3 py-2 text-sm", fieldClass)}
                    value={uiLanguage}
                    onChange={(e) => setUiLanguage(e.target.value as (typeof uiLanguageOptions)[number])}
                  >
                    {uiLanguageOptions.map((option) => (
                      <option key={option} value={option}>
                        {text.uiLanguageLabels[option]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{text.settings.apiKeys}</h3>
                  <p className="text-[11px] text-[var(--app-text-soft)]">{text.settings.keysStoredLocal}</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={`${modelLabel} API Key`}
                      className={cn("w-full rounded-xl py-2 pl-3 pr-24 text-sm font-mono transition-all", fieldClass)}
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
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-neutral-700"
                      >
                        {testingKey ? <Loader2 size={12} className="animate-spin" /> : text.settings.test}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:py-6">
        
        {/* System Prompt (Call Purpose) Section - AI Studio Style */}
        <section className={cn("overflow-hidden rounded-2xl transition-all duration-300", surfaceClass)}>
          <button 
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex w-full items-center justify-between bg-[color:var(--app-surface-muted)] px-4 py-4 transition-colors hover:bg-[color:var(--app-input)]"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <h2 className="text-sm font-bold text-[var(--app-text)]">{text.prompt.title}</h2>
            </div>
            {showPrompt ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showPrompt && (
            <div className="animate-in slide-in-from-top-1 fade-in border-t border-[color:var(--app-border)] p-4 duration-200">
              <textarea
                disabled={status !== 'disconnected'}
                value={callPurpose}
                onChange={(e) => setCallPurpose(e.target.value)}
                placeholder={text.prompt.placeholder}
                className={cn(
                  "h-32 w-full resize-none rounded-xl p-3 text-sm font-mono leading-relaxed transition-colors",
                  fieldClass
                )}
              />
              <div className="mt-2 flex justify-end">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-text-soft)]">{text.prompt.markdownSupported}</span>
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={cn("rounded-2xl p-4", surfaceClass)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border",
                  micState === 'speaking'
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
                )}>
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{text.voice.inputTitle}</p>
                  <p className="text-xs text-[var(--app-text-soft)]">
                    {status === 'disconnected'
                      ? text.voice.micIdle
                      : micState === 'speaking'
                        ? text.voice.speechDetected
                        : inputConfirmed
                          ? text.voice.micWaitingNext
                          : text.voice.micWaitingFirst}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                inputConfirmed
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
              )}>
                {inputConfirmed ? text.voice.confirmed : text.voice.noSignalYet}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)]">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-150",
                  micState === 'speaking' ? "bg-green-400" : "bg-blue-500"
                )}
                style={{ width: `${Math.round(micLevel * 100)}%` }}
              />
            </div>
            <div className="mt-3 min-h-10 rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] px-3 py-2 text-xs text-[var(--app-text-soft)]">
              {latestUserTranscript || text.voice.userSpeechPlaceholder}
            </div>
          </div>

          <div className={cn("rounded-2xl p-4", surfaceClass)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border",
                  speakerState === 'playing'
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
                )}>
                  <Volume2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{text.voice.outputTitle}</p>
                  <p className="text-xs text-[var(--app-text-soft)]">
                    {status === 'disconnected'
                      ? text.voice.speakerIdle
                      : speakerState === 'playing'
                        ? text.voice.playingAudio
                        : outputConfirmed
                          ? text.voice.playbackReady
                          : text.voice.waitingAudio}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                outputConfirmed
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
                  : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
              )}>
                {outputConfirmed ? text.voice.playing : text.voice.waiting}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)]">
              <div
                className="h-full rounded-full bg-blue-400 transition-[width] duration-150"
                style={{ width: `${Math.round(speakerLevel * 100)}%` }}
              />
            </div>
            <div className="mt-3 min-h-10 rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] px-3 py-2 text-xs text-[var(--app-text-soft)]">
              {latestAiTranscript || text.voice.assistantSpeechPlaceholder}
            </div>
          </div>
        </section>

        {/* Transcript Area */}
        <div
          ref={scrollRef}
          className={cn(
            "relative flex-1 space-y-6 overflow-y-auto rounded-2xl p-4 shadow-inner sm:p-6",
            surfaceStrongClass
          )}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-[var(--app-text-soft)]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] transition-colors duration-500">
                <MessageSquare size={32} className="opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--app-text)]">{text.transcript.emptyTitle}</p>
                <p className="text-xs">{text.transcript.emptyBody}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'Supervisor' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "relative max-w-[94%] rounded-2xl px-4 py-3 text-sm shadow-sm md:text-base sm:max-w-[85%]",
                  msg.role === 'AI' ? "bg-blue-600/10 border border-blue-500/20 text-blue-100 rounded-tl-none" :
                  msg.role === 'User' ? "rounded-tl-none border border-[color:var(--app-input-border)] bg-[var(--app-input)] text-[var(--app-text)]" :
                  msg.role === 'Supervisor' ? "bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tr-none" :
                  "mx-auto border-none bg-transparent py-1 text-center text-[10px] italic text-[var(--app-text-soft)]"
                )}>
                  {msg.role !== 'System' && (
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span>{getRoleLabel(msg.role)}</span>
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
      <footer className="shrink-0 border-t border-[color:var(--app-border)] bg-[var(--app-surface-strong)]/90 px-4 py-4 shadow-[var(--app-shadow)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            {status === 'disconnected' ? (
              <button
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 active:scale-95 sm:w-auto"
              >
                <Play size={20} fill="currentColor" />
                {text.controls.startLiveCall}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:bg-red-500 active:scale-95 sm:w-auto"
              >
                <Square size={20} fill="currentColor" />
                {text.controls.endSession}
              </button>
            )}

            <button
              onClick={exportLog}
              disabled={messages.length === 0}
              className={cn(
                "rounded-2xl border p-3.5 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30",
                fieldClass
              )}
              title={text.controls.exportLog}
            >
              <Download size={20} />
            </button>
          </div>

          <form onSubmit={handleSendWhisper} className="relative flex w-full flex-1">
            <input
              type="text"
              placeholder={status === 'connected' ? text.controls.whisperConnected : text.controls.whisperDisconnected}
              className={cn("w-full rounded-2xl py-3.5 pl-5 pr-14 text-sm md:text-base", fieldClass)}
              value={whisperText}
              onChange={(e) => setWhisperText(e.target.value)}
              disabled={status !== 'connected'}
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !whisperText.trim()}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--app-text-soft)] transition-all hover:bg-purple-500/10 hover:text-purple-400 disabled:opacity-0"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
