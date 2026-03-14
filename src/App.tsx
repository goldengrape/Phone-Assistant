import { useEffect, useRef, useState } from 'react';
import { 
  Play, Square, Download, Send, Mic, MessageSquare, 
  Settings, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Volume2
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { AudioCapture } from './audio/AudioCapture';
import { AudioPlayback } from './audio/AudioPlayback';
import { GeminiLiveClient } from './api/GeminiLiveClient';
import { AIClient, AIClientOptions } from './api/AIClient';
import guidanceData from './guidance.json';
import { resolveLocale, targetLanguageOptions, translations, uiLanguageOptions } from './i18n';
import { estimateTokens, getPcmLevel, mergeTranscriptText } from './lib/sessionUtils';
import { cn } from './lib/utils';
import { CUSTOM_SKILL_ID, getSkillPresetById, skillPresets, type SkillPresetId } from './skills';
import { geminiVoiceOptions, type GeminiVoiceName } from './voices';

const OUTPUT_ACTIVITY_RESET_MS = 250;
const GEMINI_CONTEXT_TRIGGER_TOKENS = 104857;
const GEMINI_CONTEXT_TARGET_TOKENS = 52428;
type TranscriptRole = 'AI' | 'User';

type LiveTranscriptPreview = {
  text: string;
  updatedAt: number;
};

export default function App() {
  const {
    language, setLanguage,
    uiLanguage, setUiLanguage,
    geminiVoice, setGeminiVoice,
    skillPresetId, setSkillPresetId,
    callPurpose, setCallPurpose,
    geminiApiKey, setGeminiApiKey,
    status, setStatus,
    messages, addMessage, clearMessages
  } = useAppStore();

  const locale = resolveLocale(uiLanguage, typeof navigator !== 'undefined' ? navigator.language : 'en');
  const text = translations[locale];
  const sessionContextText = {
    en: {
      title: 'Session Context',
      newSession: 'New session',
      disconnected: 'No active session',
      resumptionOff: 'Resumption off',
      resumptionOffHint: 'Reconnect starts a fresh Gemini session.',
      fullContext: 'Full context retained',
      fullContextHint: 'Estimate is below the compression trigger.',
      compressionPossible: 'Compression may have occurred',
      compressionPossibleHint: 'Gemini does not expose an exact compression event, so this is estimated from session length.',
      providerHint: 'Shown for Gemini because this app enables context window compression but not session resumption.',
      historyEstimate: 'History estimate',
      trigger: 'Compression trigger',
      target: 'Sliding target',
      sessionAge: 'Session age',
      estimateNote: 'Estimated, not exact',
    },
    zh: {
      title: '会话上下文',
      newSession: '新会话',
      disconnected: '当前无活动会话',
      resumptionOff: '未启用续接',
      resumptionOffHint: '重新连接会启动一个全新的 Gemini 会话。',
      fullContext: '上下文仍完整保留',
      fullContextHint: '按当前估算，尚未达到压缩触发阈值。',
      compressionPossible: '可能已发生滑窗压缩',
      compressionPossibleHint: 'Gemini 没有暴露精确的压缩触发事件，这里是按会话长度估算。',
      providerHint: '该提示仅针对 Gemini：当前应用启用了上下文压缩，但未启用 session resumption。',
      historyEstimate: '历史估算',
      trigger: '压缩触发阈值',
      target: '滑窗目标',
      sessionAge: '会话时长',
      estimateNote: '仅为估算，并非精确值',
    },
    ja: {
      title: 'セッション文脈',
      newSession: '新しいセッション',
      disconnected: 'アクティブなセッションなし',
      resumptionOff: '再開は無効',
      resumptionOffHint: '再接続すると新しい Gemini セッションが始まります。',
      fullContext: '文脈は保持中',
      fullContextHint: '推定ではまだ圧縮トリガー未満です。',
      compressionPossible: '圧縮が発生した可能性',
      compressionPossibleHint: 'Gemini は正確な圧縮イベントを返さないため、これは会話長からの推定です。',
      providerHint: 'この表示は Gemini 向けです。現在の実装は context window compression を有効化し、session resumption は無効です。',
      historyEstimate: '履歴推定',
      trigger: '圧縮トリガー',
      target: 'スライディング目標',
      sessionAge: 'セッション時間',
      estimateNote: '推定値であり正確値ではありません',
    },
    ko: {
      title: '세션 컨텍스트',
      newSession: '새 세션',
      disconnected: '활성 세션 없음',
      resumptionOff: '재개 비활성',
      resumptionOffHint: '다시 연결하면 새로운 Gemini 세션이 시작됩니다.',
      fullContext: '컨텍스트 유지 중',
      fullContextHint: '현재 추정치는 아직 압축 임계값 아래입니다.',
      compressionPossible: '압축이 발생했을 수 있음',
      compressionPossibleHint: 'Gemini는 정확한 압축 이벤트를 노출하지 않으므로 세션 길이 기반 추정입니다.',
      providerHint: '이 표시는 Gemini 기준입니다. 현재 앱은 context window compression 을 켰고 session resumption 은 끈 상태입니다.',
      historyEstimate: '히스토리 추정',
      trigger: '압축 임계값',
      target: '슬라이딩 목표',
      sessionAge: '세션 시간',
      estimateNote: '정확한 값이 아닌 추정치입니다',
    },
    fr: {
      title: 'Contexte de session',
      newSession: 'Nouvelle session',
      disconnected: 'Aucune session active',
      resumptionOff: 'Reprise désactivée',
      resumptionOffHint: 'Une reconnexion démarre une nouvelle session Gemini.',
      fullContext: 'Contexte encore conservé',
      fullContextHint: "L'estimation reste sous le seuil de compression.",
      compressionPossible: 'Compression possiblement déclenchée',
      compressionPossibleHint: "Gemini n'expose pas d'événement exact de compression ; cet état est donc estimé selon la longueur de la session.",
      providerHint: "Affiché pour Gemini : l'application active la compression de contexte, mais pas la reprise de session.",
      historyEstimate: 'Estimation historique',
      trigger: 'Seuil de compression',
      target: 'Cible glissante',
      sessionAge: 'Durée de session',
      estimateNote: 'Valeur estimée, non exacte',
    },
    es: {
      title: 'Contexto de sesión',
      newSession: 'Sesión nueva',
      disconnected: 'Sin sesión activa',
      resumptionOff: 'Reanudación desactivada',
      resumptionOffHint: 'Al reconectar se inicia una sesión Gemini nueva.',
      fullContext: 'Contexto aún conservado',
      fullContextHint: 'La estimación sigue por debajo del umbral de compresión.',
      compressionPossible: 'La compresión pudo activarse',
      compressionPossibleHint: 'Gemini no expone un evento exacto de compresión, así que este estado es una estimación por longitud de sesión.',
      providerHint: 'Se muestra para Gemini porque la app activa la compresión de contexto, pero no la reanudación de sesión.',
      historyEstimate: 'Estimación de historial',
      trigger: 'Umbral de compresión',
      target: 'Objetivo deslizante',
      sessionAge: 'Duración de la sesión',
      estimateNote: 'Estimado, no exacto',
    },
  }[locale];
  const settingsCopy = {
    en: {
      aiSpokenLanguage: 'AI Spoken Language',
      interfaceLanguage: 'Interface Language',
      voicePreset: 'Gemini Voice Preset',
      providerSettings: 'Voice behavior and language can be configured independently from the interface.',
      credentialsTitle: 'Credentials',
      credentialsSubtitle: 'Stored locally in your browser for this device only.',
    },
    zh: {
      aiSpokenLanguage: 'AI 语音语言',
      interfaceLanguage: '界面语言',
      voicePreset: 'Gemini 音色',
      providerSettings: 'AI 说话语言与界面语言彼此独立，可以分别设置。',
      credentialsTitle: '凭证',
      credentialsSubtitle: '仅保存在当前设备浏览器本地。',
    },
    ja: {
      aiSpokenLanguage: 'AI 音声言語',
      interfaceLanguage: '画面言語',
      voicePreset: 'Gemini 音声プリセット',
      providerSettings: 'AI の話す言語と UI 言語は別々に設定できます。',
      credentialsTitle: '認証情報',
      credentialsSubtitle: 'この端末のブラウザにのみ保存されます。',
    },
    ko: {
      aiSpokenLanguage: 'AI 음성 언어',
      interfaceLanguage: '인터페이스 언어',
      voicePreset: 'Gemini 음성 프리셋',
      providerSettings: 'AI가 말하는 언어와 UI 언어는 서로 독립적으로 설정됩니다.',
      credentialsTitle: '자격 증명',
      credentialsSubtitle: '현재 브라우저 로컬 저장소에만 보관됩니다.',
    },
    fr: {
      aiSpokenLanguage: "Langue parlée par l'IA",
      interfaceLanguage: "Langue de l'interface",
      voicePreset: 'Voix Gemini',
      providerSettings: "La langue parlée par l'IA et la langue de l'interface sont configurées séparément.",
      credentialsTitle: 'Identifiants',
      credentialsSubtitle: 'Stockés localement dans ce navigateur pour cet appareil.',
    },
    es: {
      aiSpokenLanguage: 'Idioma hablado por la IA',
      interfaceLanguage: 'Idioma de la interfaz',
      voicePreset: 'Voz de Gemini',
      providerSettings: 'El idioma hablado por la IA y el idioma de la interfaz se configuran por separado.',
      credentialsTitle: 'Credenciales',
      credentialsSubtitle: 'Se guardan solo en el navegador local de este dispositivo.',
    },
  }[locale];
  const providerBadge = 'Gemini API only';
  const guidanceCopy = guidanceData[locale];
  /*
  const legacyGuidanceCopy = false
    ? {
        appVersionLabel: 'v0.1.0 preview',
        quickHelpTitle: 'ä½¿ç”¨å¸®åŠ©',
        quickHelpIntro: 'è¿™ä¸ªç‰ˆæœ¬é€‚åˆéƒ¨ç½²åˆ° Renderï¼ŒæœåŠ¡å™¨åªè´Ÿè´£æ‰˜ç®¡é™æ€é¡µé¢ã€‚',
        helpSteps: [
          'å…ˆç‚¹å¼€ Settingsï¼Œå¡«å…¥ä½ è‡ªå·±çš„ Gemini API keyã€‚',
          'ä»Žä¸‹æ–¹ skill ç¤ºä¾‹é‡Œé€‰ä¸€ä¸ªæ¨¡æ¿ï¼Œæˆ–åˆ‡åˆ° Custom ç©ºç™½ç‰ˆæœ¬è‡ªå·±å†™ã€‚',
          'å¼€å§‹é€šè¯åŽï¼Œå¯ä»¥ç»§ç»­é€šè¿‡åº•éƒ¨è¾“å…¥æ¡†ç»™ AI å‘é€é™é»˜æŒ‡ä»¤ã€‚',
        ],
        disclaimers: [
          'BYOKï¼šAPI key ç”±ç”¨æˆ·è‡ªè¡Œæä¾›ï¼Œé»˜è®¤åªä¿å­˜åœ¨å½“å‰æµè§ˆå™¨çš„ localStorageã€‚',
          'è°ƒç”¨è´¹ç”¨ã€é€ŸçŽ‡é™åˆ¶å’Œè´¦å·é£ŽæŽ§éƒ½å½’å±žç”¨æˆ·è‡ªå·±çš„ Gemini è´¦æˆ·ã€‚',
          'è¿™æ˜¯æ—©æœŸç‰ˆæœ¬ï¼Œè¯·åœ¨çœŸå®žä¸šåŠ¡é€šè¯å‰å…ˆè‡ªè¡ŒéªŒè¯æç¤ºè¯å’Œæ¨¡åž‹è¡Œä¸ºã€‚',
        ],
        keyLinkLabel: 'åŽ»ç”³è¯· Gemini API key',
        keyHelper: 'Google å®˜æ–¹å…¥å£',
        skillPresetLabel: 'Skill ç¤ºä¾‹',
        skillPresetHint: 'é€‰æ‹©é¢„è®¾åŽå¯ä»¥ç›´æŽ¥ç¼–è¾‘ï¼›åªè¦ä½ å¼€å§‹æ”¹å†™å†…å®¹ï¼Œç³»ç»Ÿä¼šè‡ªåŠ¨åˆ‡åˆ° Customï¼Œå¹¶æŠŠå†…å®¹ä¿å­˜åˆ°å½“å‰æµè§ˆå™¨ã€‚',
        customOptionLabel: 'Custom (blank)',
        customHint: 'Custom é»˜è®¤æ˜¯ç©ºç™½ç‰ˆæœ¬ï¼Œé€‚åˆä½ ä»Žå¤´å†™è‡ªå·±çš„ skillã€‚',
        clearCustomLabel: 'æ¸…ç©º Custom',
        helpCardBody: 'è¿™ä¸ªç‰ˆæœ¬æ²¡æœ‰æœåŠ¡å™¨ç«¯è´¦å·ç³»ç»Ÿï¼Œä¹Ÿä¸ä¼šæ›¿ä½ æ‰˜ç®¡ Gemini keyã€‚',
        disclaimerCardTitle: 'å®‰å…¨ä¸Žè´£ä»»è¾¹ç•Œ',
        credentialHelp: 'å¯†é’¥ç”±ä½ è‡ªå·±è¾“å…¥ï¼Œä»…ä¿å­˜åœ¨æœ¬åœ°æµè§ˆå™¨ã€‚Render ç«¯ä¸ä¿å­˜ç”¨æˆ· keyã€‚',
      }
    : {
        appVersionLabel: 'v0.1.0 preview',
        quickHelpTitle: 'Help',
        quickHelpIntro: 'This build is designed for Render as a static frontend. The server only hosts static assets.',
        helpSteps: [
          'Open Settings and paste your own Gemini API key.',
          'Choose a sample skill below, or switch to the blank Custom option and write your own.',
          'Start the call, then use the whisper input at the bottom to steer the AI silently.',
        ],
        disclaimers: [
          'BYOK: the Gemini API key is provided by the user and stored only in this browser localStorage by default.',
          'Usage charges, quotas, and account policy enforcement stay under the user’s own Gemini account.',
          'This is an early preview. Review the prompt and model behavior before using it for real calls.',
        ],
        keyLinkLabel: 'Get a Gemini API key',
        keyHelper: 'Official Google AI Studio link',
        skillPresetLabel: 'Skill Example',
        skillPresetHint: 'Choose a preset as a starting point. As soon as you edit it, the app switches to Custom and saves that text locally in your browser.',
        customOptionLabel: 'Custom (blank)',
        customHint: 'Custom starts blank so you can write your own skill from scratch.',
        clearCustomLabel: 'Clear Custom',
        helpCardBody: 'This version has no server-side account system and does not host Gemini keys for users.',
        disclaimerCardTitle: 'Safety and Responsibility',
        credentialHelp: 'You enter the key yourself, and it stays in local browser storage on this device.',
      };
  */
  const modelLabel = text.misc.modelGemini;
  const surfaceClass = 'border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow)] backdrop-blur-xl';
  const surfaceStrongClass = 'border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] shadow-[var(--app-shadow)] backdrop-blur-xl';
  const fieldClass = 'border border-[color:var(--app-input-border)] bg-[var(--app-input)] text-[var(--app-text)] shadow-inner placeholder:text-[var(--app-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--app-ring)]';
  const subCardClass = 'rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)]/80 p-4';
  const selectedSkillPreset = getSkillPresetById(skillPresetId);
  const isCustomSkill = skillPresetId === CUSTOM_SKILL_ID;
  const geminiApiKeyUrl = 'https://aistudio.google.com/app/apikey';

  const getRoleLabel = (role: 'AI' | 'User' | 'Supervisor' | 'System') => {
    if (role === 'AI') return text.misc.roleAI;
    if (role === 'User') return text.misc.roleUser;
    if (role === 'Supervisor') return text.misc.roleSupervisor;
    return text.misc.roleSystem;
  };

  const [whisperText, setWhisperText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [showSessionContext, setShowSessionContext] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const [micState, setMicState] = useState<'idle' | 'monitoring' | 'speaking'>('idle');
  const [speakerState, setSpeakerState] = useState<'idle' | 'waiting' | 'playing'>('idle');
  const [inputConfirmed, setInputConfirmed] = useState(false);
  const [outputConfirmed, setOutputConfirmed] = useState(false);
  const [liveTranscriptPreviews, setLiveTranscriptPreviews] = useState<Partial<Record<TranscriptRole, LiveTranscriptPreview>>>({});
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionClock, setSessionClock] = useState<number | null>(null);

  const clientRef = useRef<AIClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakerResetTimerRef = useRef<number | null>(null);
  const inputObservedRef = useRef(false);
  const outputObservedRef = useRef(false);
  const ignoreNextDisconnectedRef = useRef(false);
  const liveTranscriptPreviewsRef = useRef<Partial<Record<TranscriptRole, LiveTranscriptPreview>>>({});

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveTranscriptPreviews, messages]);

  useEffect(() => {
    liveTranscriptPreviewsRef.current = liveTranscriptPreviews;
  }, [liveTranscriptPreviews]);

  useEffect(() => {
    if (status !== 'connected' || sessionStartedAt === null) {
      return;
    }

    const updateAge = () => setSessionClock(performance.now());
    const timer = window.setInterval(updateAge, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt, status]);

  useEffect(() => {
    return () => {
      if (speakerResetTimerRef.current !== null) {
        window.clearTimeout(speakerResetTimerRef.current);
      }
    };
  }, []);

  const clearLivePreview = (role: TranscriptRole) => {
    setLiveTranscriptPreviews((current) => {
      if (!current[role]) return current;

      const next = { ...current };
      delete next[role];
      return next;
    });
  };

  const updateLivePreview = (role: TranscriptRole, previewText: string) => {
    const normalizedText = previewText.trim();
    setLiveTranscriptPreviews((current) => {
      if (!normalizedText) {
        if (!current[role]) return current;

        const next = { ...current };
        delete next[role];
        return next;
      }

      const mergedText = mergeTranscriptText(current[role]?.text ?? '', normalizedText);
      if (current[role]?.text === mergedText) {
        return current;
      }

      return {
        ...current,
        [role]: {
          text: mergedText,
          updatedAt: Date.now(),
        },
      };
    });
  };

  const cleanupSession = ({ disconnectClient = false, includeCallEndedMessage = false } = {}) => {
    if (speakerResetTimerRef.current !== null) {
      window.clearTimeout(speakerResetTimerRef.current);
      speakerResetTimerRef.current = null;
    }

    inputObservedRef.current = false;
    outputObservedRef.current = false;

    const client = clientRef.current;
    clientRef.current = null;

    if (captureRef.current) {
      captureRef.current.onLevelChange = null;
      captureRef.current.stop();
      captureRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    if (disconnectClient && client) {
      ignoreNextDisconnectedRef.current = true;
      client.disconnect();
    }

    setMicLevel(0);
    setSpeakerLevel(0);
    setMicState('idle');
    setSpeakerState('idle');
    setInputConfirmed(false);
    setOutputConfirmed(false);
    setLiveTranscriptPreviews({});
    setStatus('disconnected');
    setSessionStartedAt(null);
    setSessionClock(null);

    if (includeCallEndedMessage) {
      addMessage({ role: 'System', text: text.system.callEnded });
    }
  };

  const handleStart = async (startMarker: number) => {
    if (status !== 'disconnected') return;

    const apiKey = geminiApiKey;
    if (!apiKey) {
      addMessage({ role: 'System', text: text.system.setApiKeyFirst(modelLabel) });
      setShowSettings(true);
      return;
    }

    clearMessages();
    setSessionStartedAt(startMarker);
    setSessionClock(startMarker);
    inputObservedRef.current = false;
    outputObservedRef.current = false;
    ignoreNextDisconnectedRef.current = false;
    setMicLevel(0);
    setSpeakerLevel(0);
    setMicState('monitoring');
    setSpeakerState('waiting');
    setInputConfirmed(false);
    setOutputConfirmed(false);
    setLiveTranscriptPreviews({});
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
        voiceName: geminiVoice,
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
        onTranscriptPreview: (role: TranscriptRole, text: string) => {
          updateLivePreview(role, text);
        },
        onTranscript: (role: string, text: string) => {
          const transcriptRole = role as TranscriptRole;
          const mergedText = mergeTranscriptText(liveTranscriptPreviewsRef.current[transcriptRole]?.text ?? '', text);
          clearLivePreview(transcriptRole);
          addMessage({ role: transcriptRole, text: mergedText });
        },
        onStateChange: (newState: 'disconnected' | 'connecting' | 'connected' | 'error') => {
          setStatus(newState);
          if (newState === 'connected') {
            addMessage({ role: 'System', text: text.system.connectedRealtimeApi(modelLabel) });
            setMicState('monitoring');
            setSpeakerState('waiting');
          } else if (newState === 'disconnected') {
            if (ignoreNextDisconnectedRef.current) {
              ignoreNextDisconnectedRef.current = false;
              return;
            }
            cleanupSession({ includeCallEndedMessage: true });
          } else if (newState === 'error') {
            addMessage({ role: 'System', text: text.system.connectionError });
            handleStop();
          }
        }
      };

      clientRef.current = new GeminiLiveClient(options);

      await clientRef.current.connect();

    } catch (err) {
      console.error(err);
      cleanupSession({ disconnectClient: true });
      addMessage({ role: 'System', text: `${text.system.errorPrefix}: ${(err as Error).message}` });
    }
  };

  const handleStop = () => {
    cleanupSession({ disconnectClient: true, includeCallEndedMessage: true });
  };

  const testApiKey = async () => {
    const apiKey = geminiApiKey;
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
        voiceName: geminiVoice,
        apiKey: apiKey
      };

      testClient = new GeminiLiveClient(options);
      
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

  const getLastTranscriptText = (role: TranscriptRole) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === role) {
        return messages[i].text.trim();
      }
    }

    return '';
  };

  const liveTranscriptEntries = (Object.entries(liveTranscriptPreviews) as Array<[TranscriptRole, LiveTranscriptPreview]>)
    .filter(([, preview]) => preview.text.trim().length > 0)
    .filter(([role, preview]) => preview.text.trim() !== getLastTranscriptText(role))
    .sort(([, a], [, b]) => a.updatedAt - b.updatedAt);

  const hasTranscriptContent = messages.length > 0 || liveTranscriptEntries.length > 0;
  const contextRelevantMessages = messages.filter((msg) => msg.role === 'AI' || msg.role === 'User' || msg.role === 'Supervisor');
  const transcriptPreviewTokenEstimate = liveTranscriptEntries.reduce((total, [, preview]) => total + estimateTokens(preview.text), 0);
  const contextTokenEstimate = estimateTokens(callPurpose)
    + contextRelevantMessages.reduce((total, msg) => total + estimateTokens(msg.text), 0)
    + transcriptPreviewTokenEstimate;
  const contextUsageRatio = Math.min(1, contextTokenEstimate / GEMINI_CONTEXT_TRIGGER_TOKENS);
  const contextCompressionLikely = contextTokenEstimate >= GEMINI_CONTEXT_TRIGGER_TOKENS;
  const sessionAgeMs = status === 'connected' && sessionStartedAt !== null && sessionClock !== null
    ? Math.max(0, Math.round(sessionClock - sessionStartedAt))
    : 0;
  const formatTokenCount = (value: number) => new Intl.NumberFormat().format(value);
  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
              <span className="ml-2 text-xs font-normal text-[var(--app-text-soft)]">{guidanceCopy.appVersionLabel}</span>
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
            <div className="hidden rounded-full border border-[color:var(--app-border)] bg-[var(--app-input)] px-3 py-2 text-xs font-medium text-[var(--app-text-soft)] sm:block">
              {providerBadge}
            </div>

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
            "mx-auto mt-4 max-w-6xl rounded-3xl p-4 animate-in slide-in-from-top-2 duration-200 sm:p-5",
            surfaceClass
          )}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className={cn("space-y-4", subCardClass)}>
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{text.settings.modelConfiguration}</h3>
                    <p className="mt-1 text-xs text-[var(--app-text-soft)]">{settingsCopy.providerSettings}</p>
                  </div>
                  <div className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-input)] px-3 py-1 text-[11px] font-medium text-[var(--app-text-soft)]">
                    {providerBadge}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[var(--app-text-soft)]">{settingsCopy.aiSpokenLanguage}</label>
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
                    <label className="text-xs font-medium text-[var(--app-text-soft)]">{settingsCopy.interfaceLanguage}</label>
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

                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-xs font-medium text-[var(--app-text-soft)]">{settingsCopy.voicePreset}</label>
                    <select
                      disabled={status !== 'disconnected'}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm", fieldClass)}
                      value={geminiVoice}
                      onChange={(e) => setGeminiVoice(e.target.value as GeminiVoiceName)}
                    >
                      {geminiVoiceOptions.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {`${voice.name} - ${voice.description}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-4", subCardClass)}>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{settingsCopy.credentialsTitle}</h3>
                  <p className="text-xs text-[var(--app-text-soft)]">{settingsCopy.credentialsSubtitle}</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={`${modelLabel} API Key`}
                      className={cn("w-full rounded-xl py-2 pl-3 pr-24 text-sm font-mono transition-all", fieldClass)}
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKey(e.target.value);
                        setTestResult(null);
                      }}
                    />
                    <div className="absolute right-1 top-1 flex items-center gap-1">
                      {testResult === 'success' && <CheckCircle2 size={16} className="text-green-500 mr-1" />}
                      {testResult === 'error' && <XCircle size={16} className="text-red-500 mr-1" />}
                      <button 
                        onClick={testApiKey}
                        disabled={testingKey || !geminiApiKey}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-neutral-700"
                      >
                        {testingKey ? <Loader2 size={12} className="animate-spin" /> : text.settings.test}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-input)] p-3 text-xs text-[var(--app-text-soft)]">
                    <p>{guidanceCopy.credentialHelp}</p>
                    <a
                      href={geminiApiKeyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                    >
                      {guidanceCopy.keyLinkLabel}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:py-6">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className={cn("rounded-2xl p-4", surfaceClass)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{guidanceCopy.quickHelpTitle}</h2>
                <p className="mt-2 text-sm text-[var(--app-text)]">{guidanceCopy.quickHelpIntro}</p>
              </div>
              <a
                href={geminiApiKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
              >
                {guidanceCopy.keyLinkLabel}
              </a>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-[var(--app-text-soft)]">
              {guidanceCopy.helpSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-[var(--app-text-soft)]">{guidanceCopy.helpCardBody}</p>
          </div>

          <div className={cn("rounded-2xl p-4", surfaceClass)}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{guidanceCopy.disclaimerCardTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--app-text-soft)]">
              {guidanceCopy.disclaimers.map((item) => (
                <li key={item} className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[var(--app-text-soft)]">{guidanceCopy.keyHelper}</p>
          </div>
        </section>
        
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
              <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,280px)_1fr]">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--app-text-soft)]">{guidanceCopy.skillPresetLabel}</label>
                  <select
                    disabled={status !== 'disconnected'}
                    value={skillPresetId}
                    onChange={(e) => setSkillPresetId(e.target.value as SkillPresetId)}
                    className={cn("w-full rounded-xl px-3 py-2 text-sm", fieldClass)}
                  >
                    {skillPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                    <option value={CUSTOM_SKILL_ID}>{guidanceCopy.customOptionLabel}</option>
                  </select>
                  <div className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] p-3 text-xs text-[var(--app-text-soft)]">
                    {isCustomSkill ? guidanceCopy.customHint : selectedSkillPreset?.summary}
                  </div>
                  {isCustomSkill && (
                    <button
                      type="button"
                      disabled={status !== 'disconnected'}
                      onClick={() => {
                        setSkillPresetId(CUSTOM_SKILL_ID);
                        setCallPurpose('');
                      }}
                      className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-input)] disabled:opacity-50"
                    >
                      {guidanceCopy.clearCustomLabel}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)]/60 p-3 text-xs text-[var(--app-text-soft)]">
                  {guidanceCopy.skillPresetHint}
                </div>
              </div>

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
          <div className={cn("rounded-2xl p-3.5", surfaceClass)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border",
                  micState === 'speaking'
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
                )}>
                  <Mic size={16} />
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
          </div>

          <div className={cn("rounded-2xl p-3.5", surfaceClass)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border",
                  speakerState === 'playing'
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-[var(--app-surface-muted)] border-[color:var(--app-border)] text-[var(--app-text-soft)]"
                )}>
                  <Volume2 size={16} />
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
          </div>
        </section>

        <section className={cn("rounded-2xl p-4", surfaceClass)}>
            <button
              onClick={() => setShowSessionContext((current) => !current)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-text-soft)]">{sessionContextText.title}</h2>
                <p className="mt-1 text-xs text-[var(--app-text-soft)]">
                  {showSessionContext ? sessionContextText.providerHint : sessionContextText.fullContextHint}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold",
                    contextCompressionLikely
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                  )}
                >
                  {contextCompressionLikely ? sessionContextText.compressionPossible : sessionContextText.fullContext}
                </span>
                {showSessionContext ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {showSessionContext && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-500">
                    {status === 'connected' ? sessionContextText.newSession : sessionContextText.disconnected}
                  </span>
                  <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--app-text-soft)]">
                    {sessionContextText.resumptionOff}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-text-soft)]">{sessionContextText.historyEstimate}</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                      {`${formatTokenCount(contextTokenEstimate)} / ${formatTokenCount(GEMINI_CONTEXT_TRIGGER_TOKENS)}`}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-300", contextCompressionLikely ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${Math.max(4, Math.round(contextUsageRatio * 100))}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-[var(--app-text-soft)]">{sessionContextText.estimateNote}</div>
                  </div>

                  <div className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-text-soft)]">{sessionContextText.trigger}</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--app-text)]">{formatTokenCount(GEMINI_CONTEXT_TRIGGER_TOKENS)}</div>
                    <div className="mt-2 text-xs text-[var(--app-text-soft)]">{contextCompressionLikely ? sessionContextText.compressionPossibleHint : sessionContextText.fullContextHint}</div>
                  </div>

                  <div className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-input)] p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-text-soft)]">{sessionContextText.sessionAge}</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--app-text)]">{status === 'connected' ? formatDuration(sessionAgeMs) : '--:--'}</div>
                    <div className="mt-2 text-xs text-[var(--app-text-soft)]">
                      {`${sessionContextText.target}: ${formatTokenCount(GEMINI_CONTEXT_TARGET_TOKENS)}. ${sessionContextText.resumptionOffHint}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

        {/* Transcript Area */}
        <div
          ref={scrollRef}
          className={cn(
            "relative flex-1 space-y-6 overflow-y-auto rounded-2xl p-4 shadow-inner sm:p-6",
            surfaceStrongClass
          )}
        >
          {!hasTranscriptContent ? (
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
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'Supervisor' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "relative max-w-[94%] rounded-2xl px-4 py-3 text-sm shadow-sm md:text-base sm:max-w-[85%]",
                    msg.role === 'AI' ? "rounded-tl-none border bg-[var(--app-bubble-ai-bg)] text-[var(--app-bubble-ai-text)] border-[color:var(--app-bubble-ai-border)]" :
                    msg.role === 'User' ? "rounded-tl-none border bg-[var(--app-bubble-user-bg)] text-[var(--app-bubble-user-text)] border-[color:var(--app-bubble-user-border)]" :
                    msg.role === 'Supervisor' ? "rounded-tr-none border bg-[var(--app-bubble-supervisor-bg)] text-[var(--app-bubble-supervisor-text)] border-[color:var(--app-bubble-supervisor-border)]" :
                    "mx-auto border-none bg-transparent py-1 text-center text-[10px] italic text-[var(--app-system-text)]"
                  )}>
                    {msg.role !== 'System' && (
                      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
                        <span>{getRoleLabel(msg.role)}</span>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                  </div>
                </div>
              ))}

              {liveTranscriptEntries.map(([role, preview]) => (
                <div key={`preview-${role}`} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div
                    className={cn(
                      "relative max-w-[94%] rounded-2xl border border-dashed px-4 py-3 text-sm shadow-sm md:text-base sm:max-w-[85%]",
                      role === 'AI'
                        ? "rounded-tl-none bg-[var(--app-bubble-ai-bg)] text-[var(--app-bubble-ai-text)] border-[color:var(--app-bubble-ai-border)]"
                        : "rounded-tl-none bg-[var(--app-bubble-user-bg)] text-[var(--app-bubble-user-text)] border-[color:var(--app-bubble-user-border)]"
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
                      <span>{getRoleLabel(role)}</span>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      <span className="font-mono">{new Date(preview.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed opacity-90">{preview.text}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>

      {/* Control Area */}
      <footer className="sticky bottom-0 z-20 shrink-0 border-t border-[color:var(--app-border)] bg-[var(--app-surface-strong)]/94 px-4 py-4 shadow-[var(--app-shadow)] backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            {status === 'disconnected' ? (
              <button
                onClick={(event) => {
                  void handleStart(event.timeStamp);
                }}
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
