import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Upload, Mic, MicOff, FileText, Trash2, StopCircle, PlayCircle, Loader2, Info, Settings, Volume2, Send, Activity, RotateCcw } from 'lucide-react';
import { parseFile } from './file-utils';
import { ProcessedFile, ConnectionStatus } from './types';
import { createPcmBlob, decodeAudioData, base64ToBytes } from './audio-utils';
import AudioVisualizer from './components/AudioVisualizer';

const VOICES = [
  { name: 'Puck', label: 'Puck (Tenor - Male)' },
  { name: 'Charon', label: 'Charon (Deep - Male)' },
  { name: 'Kore', label: 'Kore (Alto - Female)' },
  { name: 'Fenrir', label: 'Fenrir (Bass - Male)' },
  { name: 'Zephyr', label: 'Zephyr (Soprano - Female)' },
];

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Chinese (Mandarin)', label: 'Chinese (Mandarin) / 中文' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'German', label: 'German' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Korean', label: 'Korean' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Portuguese', label: 'Portuguese' },
];

const getDefaultInstruction = (lang: string) => `You are an AI Phone Assistant acting as a proxy.

CRITICAL PROTOCOLS:
1. **AUDIO INPUT**: Treat all audio input as the "Caller" (the person on the other end of the line). Converse with them naturally in ${lang}.
2. **TEXT INPUT**: Treat all text input as "SYSTEM COMMANDS" from the User (your boss). 
   - Text input is NOT part of the conversation. 
   - Text input is a direct order. 
   - When you receive text, IMMEDIATELLY change your behavior/tone/topic according to the text. 
   - DO NOT read the text out loud.
   - DO NOT reply to the text directly. Just execute it in your next spoken response to the Caller.

Example:
- Audio: "Why is the price so high?"
- Text Input: "Offer a 20% discount."
- Your Spoken Output: "I understand your concern. I can actually offer you a 20% discount right now."`;

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // Settings State
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);

  // Instruction State
  const [instructionText, setInstructionText] = useState('');
  const [systemInstruction, setSystemInstruction] = useState(getDefaultInstruction('English'));
  const [isInstructionModified, setIsInstructionModified] = useState(false);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize API
  const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Update default instruction when language changes (if not modified)
  useEffect(() => {
    if (!isInstructionModified) {
      setSystemInstruction(getDefaultInstruction(selectedLanguage));
    }
  }, [selectedLanguage, isInstructionModified]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: ProcessedFile[] = [];
      setError(null);
      for (let i = 0; i < event.target.files.length; i++) {
        const file = event.target.files[i];
        try {
          const processed = await parseFile(file);
          newFiles.push(processed);
        } catch (e) {
          setError(`Failed to process ${file.name}`);
        }
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const stopAudioPlayback = () => {
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsAiSpeaking(false);
  };

  const disconnect = () => {
    // Close audio context and stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    // Close session
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            try {
                session.close();
            } catch (e) {
                console.warn("Error closing session", e);
            }
        });
        sessionPromiseRef.current = null;
    }

    stopAudioPlayback();
    
    setStatus(ConnectionStatus.DISCONNECTED);
    setAudioVolume(0);
  };

  const handleVoicePreview = async () => {
    if (isPreviewLoading || status !== ConnectionStatus.DISCONNECTED) return;
    setIsPreviewLoading(true);

    try {
      const ai = getAiClient();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const previewCtx = new AudioContextClass({ sampleRate: 24000 });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
          parts: [{ text: `Hello, this is the ${selectedVoice} voice. I am ready for the call.` }],
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
          base64ToBytes(base64Audio),
          previewCtx,
          24000,
          1
        );
        
        const source = previewCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(previewCtx.destination);
        source.start();
        
        source.onended = () => {
          setTimeout(() => previewCtx.close(), 1000);
        };
      }
    } catch (e) {
      console.error("Preview error", e);
      setError("Failed to play preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const sendInstruction = async () => {
    if (!instructionText.trim() || status !== ConnectionStatus.CONNECTED || !sessionPromiseRef.current) return;
    
    const textToSend = instructionText.trim();
    setInstructionText('');
    
    // We do NOT stop audio here, allowing the AI to seamlessly integrate the instruction.

    try {
        const session = await sessionPromiseRef.current;
        // Using sendRealtimeInput with text/plain mimeType is a reliable way to inject text
        // into the multimodal context when direct client content methods are ambiguous in the SDK.
        await session.sendRealtimeInput({
          media: {
            mimeType: "text/plain",
            data: btoa(`[SYSTEM_COMMAND]: ${textToSend}`)
          }
        });
    } catch (e) {
        console.error("Failed to send instruction", e);
        setError("Failed to send instruction. Connection may be unstable.");
    }
  };

  const connect = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) return;
    
    setStatus(ConnectionStatus.CONNECTING);
    setError(null);

    try {
      const ai = getAiClient();
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Construct final system prompt with files
      let finalSystemInstruction = systemInstruction;
      if (files.length > 0) {
        finalSystemInstruction += `\n\nREFERENCE DOCUMENTS (Use these to answer Caller's questions if applicable):\n\n`;
        files.forEach(f => {
          finalSystemInstruction += `--- START OF FILE ${f.name} ---\n${f.content.substring(0, 20000)}\n--- END OF FILE ---\n\n`;
        });
      }

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        systemInstruction: finalSystemInstruction,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
      };

      // Connect to Gemini
      const sessionPromise = ai.live.connect({
        model: config.model,
        config: {
           responseModalities: config.responseModalities,
           speechConfig: config.speechConfig,
           systemInstruction: config.systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            
            // Start input streaming
            const source = inputCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!isMicOn) return; 

              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setAudioVolume(rms * 5); 

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const outputCtx = audioContextRef.current;
            if (!outputCtx) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAiSpeaking(true);
              try {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(
                  base64ToBytes(base64Audio),
                  outputCtx,
                  24000,
                  1
                );
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                const gainNode = outputCtx.createGain();
                source.connect(gainNode);
                gainNode.connect(outputCtx.destination);
                source.onended = () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (e) {
                console.error("Error decoding audio", e);
              }
            }
            
            if (message.serverContent?.interrupted) {
                 stopAudioPlayback();
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error("Session error", err);
            setError("Connection error.");
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to connect");
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  const resetSystemInstruction = () => {
      setSystemInstruction(getDefaultInstruction(selectedLanguage));
      setIsInstructionModified(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Mic className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Gemini Phone Assistant
                </h1>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="uppercase text-slate-400">{status}</span>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Settings & Files (Takes 4 cols) */}
        <section className="lg:col-span-4 flex flex-col space-y-4 h-full">
            {/* Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-4">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Call Settings</h2>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Conversation Language</label>
                        <select 
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            disabled={status !== ConnectionStatus.DISCONNECTED}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Assistant Voice</label>
                        <div className="flex space-x-2">
                            <select 
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                disabled={status !== ConnectionStatus.DISCONNECTED}
                                className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {VOICES.map(voice => (
                                    <option key={voice.name} value={voice.name}>{voice.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleVoicePreview}
                                disabled={status !== ConnectionStatus.DISCONNECTED || isPreviewLoading}
                                className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[42px]"
                            >
                                {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* System Instruction Toggle */}
                    <div>
                        <button 
                            onClick={() => setShowSystemInstruction(!showSystemInstruction)}
                            className="flex items-center justify-between w-full text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors py-1"
                        >
                            <span>System Instructions</span>
                            <span>{showSystemInstruction ? 'Hide' : 'Edit'}</span>
                        </button>
                        
                        {showSystemInstruction && (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={systemInstruction}
                                    onChange={(e) => {
                                        setSystemInstruction(e.target.value);
                                        setIsInstructionModified(true);
                                    }}
                                    disabled={status !== ConnectionStatus.DISCONNECTED}
                                    rows={8}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono leading-relaxed"
                                    placeholder="Enter system instructions..."
                                />
                                <div className="flex justify-end">
                                    <button 
                                        onClick={resetSystemInstruction}
                                        disabled={status !== ConnectionStatus.DISCONNECTED}
                                        className="flex items-center space-x-1 text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-30"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset to Default</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Files */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col flex-1 shadow-sm backdrop-blur-sm min-h-[250px]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Reference Docs (Optional)</h2>
                    <span className="text-xs text-slate-500">{files.length} docs</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
                    {files.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl min-h-[100px]">
                            <FileText className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-sm">Upload documents</span>
                        </div>
                    )}
                    {files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-transparent hover:border-slate-700">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="text-sm font-medium truncate text-slate-200">{file.name}</span>
                            </div>
                            <button onClick={() => removeFile(file.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>

                <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all cursor-pointer">
                    <div className="flex items-center space-x-2 text-slate-400 hover:text-indigo-400">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-medium">Add PDF/EPUB/TXT</span>
                    </div>
                    <input type="file" multiple accept=".txt,.md,.pdf,.epub" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>
        </section>

        {/* Right Column: Interaction (Takes 8 cols) */}
        <section className="lg:col-span-8 flex flex-col h-full space-y-4">
            
            {/* Main Visualizer Area */}
            <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col min-h-[400px]">
                 <div className="absolute top-0 left-0 right-0 p-3 bg-slate-900/95 border-b border-slate-800 z-10 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-indigo-400">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-wider uppercase">Live Audio</span>
                    </div>
                    {isAiSpeaking && <span className="text-xs text-blue-400 animate-pulse">AI Speaking...</span>}
                </div>
                
                <div className="flex-1 relative bg-slate-950">
                    {/* Visualizer */}
                     <div className="absolute inset-0 z-0">
                        {status === ConnectionStatus.CONNECTED ? (
                            <AudioVisualizer isPlaying={isAiSpeaking} volume={audioVolume} isUserSpeaking={isMicOn && audioVolume > 0.01} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                                <div className="p-4 rounded-full bg-slate-900 border border-slate-800">
                                   <Activity className="w-12 h-12 opacity-50" />
                                </div>
                                <span className="text-sm font-medium opacity-50">Ready to connect</span>
                            </div>
                        )}
                     </div>

                     {/* Overlay Controls */}
                     <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto">
                           {status !== ConnectionStatus.CONNECTED ? (
                                <button 
                                    onClick={connect}
                                    disabled={status === ConnectionStatus.CONNECTING}
                                    className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-xl shadow-indigo-600/20 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    {status === ConnectionStatus.CONNECTING ? <Loader2 className="w-6 h-6 animate-spin"/> : <PlayCircle className="w-6 h-6" />}
                                    <span className="text-lg">Start Call</span>
                                </button>
                            ) : (
                                <div className="flex items-center space-x-8">
                                    <button 
                                        onClick={toggleMic}
                                        className={`p-6 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-xl ${isMicOn ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
                                    >
                                        {isMicOn ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                                    </button>
                                    <button 
                                        onClick={disconnect}
                                        className="p-6 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-xl shadow-red-600/20 transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        <StopCircle className="w-8 h-8" />
                                    </button>
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            </div>

            {/* Instruction Input Bar */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        value={instructionText}
                        onChange={(e) => setInstructionText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendInstruction()}
                        placeholder={status === ConnectionStatus.CONNECTED ? "Type an instruction for the AI (e.g., 'Ask about the price')..." : "Start call to send instructions"}
                        disabled={status !== ConnectionStatus.CONNECTED}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-600 disabled:opacity-50 text-sm"
                    />
                    <button 
                        onClick={sendInstruction}
                        disabled={!instructionText.trim() || status !== ConnectionStatus.CONNECTED}
                        className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                    <p className="text-[10px] text-slate-500 flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        Instructions are processed silently by the AI to guide the conversation.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-900/30 text-red-400 text-sm rounded-lg text-center">
                    {error}
                </div>
            )}
        </section>
      </main>
    </div>
  );
};

export default App;