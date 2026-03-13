import { create } from 'zustand';

interface Message {
  id: string;
  role: 'AI' | 'User' | 'Supervisor' | 'System';
  text: string;
  timestamp: Date;
}

interface AppState {
  model: 'Gemini' | 'Qwen';
  setModel: (m: 'Gemini' | 'Qwen') => void;
  language: string;
  setLanguage: (l: string) => void;
  callPurpose: string;
  setCallPurpose: (cp: string) => void;

  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  qwenApiKey: string;
  setQwenApiKey: (key: string) => void;

  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  setStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;

  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
}

const DEFAULT_CALL_PURPOSE = 'You are an intelligent AI Phone Assistant...';

export const useAppStore = create<AppState>((set) => ({
  model: 'Gemini',
  setModel: (m) => set({ model: m }),
  language: 'Auto',
  setLanguage: (l) => set({ language: l }),
  callPurpose: localStorage.getItem('call_purpose') || DEFAULT_CALL_PURPOSE,
  setCallPurpose: (callPurpose) => {
    localStorage.setItem('call_purpose', callPurpose);
    set({ callPurpose });
  },

  geminiApiKey: localStorage.getItem('gemini_api_key') || '',
  setGeminiApiKey: (key) => {
    localStorage.setItem('gemini_api_key', key);
    set({ geminiApiKey: key });
  },
  qwenApiKey: localStorage.getItem('qwen_api_key') || '',
  setQwenApiKey: (key) => {
    localStorage.setItem('qwen_api_key', key);
    set({ qwenApiKey: key });
  },

  status: 'disconnected',
  setStatus: (s) => set({ status: s }),

  messages: [],
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: Math.random().toString(36).substring(7), timestamp: new Date() }]
  })),
  clearMessages: () => set({ messages: [] })
}));
