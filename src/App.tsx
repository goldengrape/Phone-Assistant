import { useEffect, useRef, useState } from 'react';
import { Play, Square, Download, Send, Mic, MessageSquare } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { AudioCapture } from './audio/AudioCapture';
import { AudioPlayback } from './audio/AudioPlayback';
import { AIClient } from './api/AIClient';
import { GeminiLiveClient } from './api/GeminiLiveClient';
import { QwenLiveClient } from './api/QwenLiveClient';
import { cn } from './lib/utils';

export default function App() {
  const {
    model, setModel,
    language, setLanguage,
    callPurpose, setCallPurpose,
    status, setStatus,
    messages, addMessage, clearMessages
  } = useAppStore();

  const [whisperText, setWhisperText] = useState('');

  const clientRef = useRef<AIClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = async () => {
    if (status !== 'disconnected') return;

    clearMessages();
    addMessage({ role: 'System', text: 'Initializing audio devices...' });

    try {
      // 1. Init Audio
      playbackRef.current = new AudioPlayback(24000); // Output sample rate
      playbackRef.current.init();

      captureRef.current = new AudioCapture();
      captureRef.current.onAudioData = (pcm16) => {
        if (clientRef.current) {
          clientRef.current.sendAudio(pcm16);
        }
      };
      await captureRef.current.start();
      addMessage({ role: 'System', text: 'Microphone started.' });

      // 2. Init Model Client
      const options = {
        callPurpose,
        targetLanguage: language,
        onAudioData: (pcm16: Int16Array) => {
          if (playbackRef.current) {
            playbackRef.current.playChunk(pcm16);
          }
        },
        onTranscript: (role: string, text: string) => {
          addMessage({ role: role as 'AI' | 'User', text });
        },
        onStateChange: (newState: 'disconnected' | 'connecting' | 'connected' | 'error') => {
          setStatus(newState);
          if (newState === 'connected') {
            addMessage({ role: 'System', text: `Connected to ${model} Realtime API.` });
          } else if (newState === 'error') {
            addMessage({ role: 'System', text: 'Connection Error.' });
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
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (captureRef.current) {
      captureRef.current.stop();
      captureRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    setStatus('disconnected');
    addMessage({ role: 'System', text: 'Call ended.' });
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
      {/* Header & Config */}
      <header className="p-4 bg-neutral-950 border-b border-neutral-800 shrink-0 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mic className="text-blue-500" size={24} />
            <h1 className="text-xl font-bold tracking-tight">AI Phone Assistant</h1>
            <span className={cn(
              "px-2 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ml-2",
              status === 'connected' ? "bg-green-500/20 text-green-400" :
              status === 'connecting' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <input
              disabled={status !== 'disconnected'}
              placeholder="Call Purpose (e.g. Sales pitch)"
              className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex-1 min-w-[200px]"
              value={callPurpose}
              onChange={(e) => setCallPurpose(e.target.value)}
            />

            <select
              disabled={status !== 'disconnected'}
              className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={model}
              onChange={(e) => setModel(e.target.value as 'Gemini' | 'Qwen')}
            >
              <option value="Gemini">Gemini</option>
              <option value="Qwen">Qwen</option>
            </select>

            <select
              disabled={status !== 'disconnected'}
              className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
      </header>

      {/* Transcript Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-6xl w-full mx-auto p-4 md:p-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-4 shadow-inner"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2">
              <MessageSquare size={48} className="opacity-20" />
              <p>Ready to start the call. Transcript will appear here.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn(
                "p-3 rounded-lg max-w-[85%] text-sm md:text-base",
                msg.role === 'AI' ? "bg-blue-900/30 border border-blue-900/50 self-start text-blue-100" :
                msg.role === 'User' ? "bg-neutral-800/50 border border-neutral-700 self-start" :
                msg.role === 'Supervisor' ? "bg-purple-900/30 border border-purple-900/50 self-end ml-auto text-purple-100" :
                "bg-transparent text-neutral-500 text-xs text-center mx-auto"
              )}>
                <div className="font-semibold text-xs opacity-50 mb-1 flex items-center justify-between">
                  <span>{msg.role}</span>
                  <span className="ml-4 font-mono">{msg.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Control Area */}
      <footer className="p-4 bg-neutral-950 border-t border-neutral-800 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {status === 'disconnected' ? (
              <button
                onClick={handleStart}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-lg font-semibold w-full sm:w-auto text-white shadow-lg"
              >
                <Play size={20} fill="currentColor" />
                Start Call
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 transition-colors px-6 py-3 rounded-lg font-semibold w-full sm:w-auto text-white shadow-lg animate-pulse"
              >
                <Square size={20} fill="currentColor" />
                End Call
              </button>
            )}

            <button
              onClick={exportLog}
              disabled={messages.length === 0}
              className="p-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-neutral-300 transition-colors shrink-0"
              title="Export Log"
            >
              <Download size={20} />
            </button>
          </div>

          <form onSubmit={handleSendWhisper} className="flex-1 flex w-full relative group">
            <input
              type="text"
              placeholder="Whisper a command to the AI (e.g. 'Ask for their email address')"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-4 pr-12 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
              value={whisperText}
              onChange={(e) => setWhisperText(e.target.value)}
              disabled={status !== 'connected'}
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !whisperText.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-purple-400 disabled:opacity-50 disabled:hover:text-neutral-400 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
