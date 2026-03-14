import { create } from 'zustand';
import type { UiLanguage } from '../i18n';
import { DEFAULT_GEMINI_VOICE, type GeminiVoiceName } from '../voices';
import {
  CUSTOM_SKILL_ID,
  DEFAULT_CUSTOM_SKILL,
  DEFAULT_SKILL_PRESET_ID,
  getSkillPresetById,
  isSkillPresetId,
  type SkillPresetId,
} from '../skills';

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
  uiLanguage: UiLanguage;
  setUiLanguage: (language: UiLanguage) => void;
  geminiVoice: GeminiVoiceName;
  setGeminiVoice: (voice: GeminiVoiceName) => void;
  skillPresetId: SkillPresetId;
  setSkillPresetId: (skillPresetId: SkillPresetId) => void;
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

const CALL_PURPOSE_STORAGE_KEY = 'call_purpose';
const CUSTOM_CALL_PURPOSE_STORAGE_KEY = 'custom_call_purpose';
const SKILL_PRESET_STORAGE_KEY = 'skill_preset_id';

function getInitialSkillPresetId(): SkillPresetId {
  const storedPreset = localStorage.getItem(SKILL_PRESET_STORAGE_KEY);
  return isSkillPresetId(storedPreset) ? storedPreset : DEFAULT_SKILL_PRESET_ID;
}

function getCallPurposeForSkill(skillPresetId: SkillPresetId): string {
  if (skillPresetId === CUSTOM_SKILL_ID) {
    return localStorage.getItem(CUSTOM_CALL_PURPOSE_STORAGE_KEY) || DEFAULT_CUSTOM_SKILL;
  }

  return getSkillPresetById(skillPresetId)?.prompt || getSkillPresetById(DEFAULT_SKILL_PRESET_ID)?.prompt || '';
}

const initialSkillPresetId = getInitialSkillPresetId();
const initialCallPurpose = localStorage.getItem(CALL_PURPOSE_STORAGE_KEY) || getCallPurposeForSkill(initialSkillPresetId);

export const useAppStore = create<AppState>((set, get) => ({
  model: 'Gemini',
  setModel: (m) => set({ model: m }),
  language: localStorage.getItem('target_language') || 'Auto',
  setLanguage: (language) => {
    localStorage.setItem('target_language', language);
    set({ language });
  },
  uiLanguage: (localStorage.getItem('ui_language') as UiLanguage | null) || 'auto',
  setUiLanguage: (uiLanguage) => {
    localStorage.setItem('ui_language', uiLanguage);
    set({ uiLanguage });
  },
  geminiVoice: (localStorage.getItem('gemini_voice') as GeminiVoiceName | null) || DEFAULT_GEMINI_VOICE,
  setGeminiVoice: (geminiVoice) => {
    localStorage.setItem('gemini_voice', geminiVoice);
    set({ geminiVoice });
  },
  skillPresetId: initialSkillPresetId,
  setSkillPresetId: (skillPresetId) => {
    const nextCallPurpose = getCallPurposeForSkill(skillPresetId);
    localStorage.setItem(SKILL_PRESET_STORAGE_KEY, skillPresetId);
    localStorage.setItem(CALL_PURPOSE_STORAGE_KEY, nextCallPurpose);
    set({ skillPresetId, callPurpose: nextCallPurpose });
  },
  callPurpose: initialCallPurpose,
  setCallPurpose: (callPurpose) => {
    const { skillPresetId } = get();
    localStorage.setItem(CALL_PURPOSE_STORAGE_KEY, callPurpose);

    if (skillPresetId === CUSTOM_SKILL_ID) {
      localStorage.setItem(CUSTOM_CALL_PURPOSE_STORAGE_KEY, callPurpose);
      set({ callPurpose });
      return;
    }

    const preset = getSkillPresetById(skillPresetId);
    if (preset && preset.prompt !== callPurpose) {
      localStorage.setItem(SKILL_PRESET_STORAGE_KEY, CUSTOM_SKILL_ID);
      localStorage.setItem(CUSTOM_CALL_PURPOSE_STORAGE_KEY, callPurpose);
      set({ callPurpose, skillPresetId: CUSTOM_SKILL_ID });
      return;
    }

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
