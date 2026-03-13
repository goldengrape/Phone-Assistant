export type SupportedLocale = 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'es';
export type UiLanguage = SupportedLocale | 'auto';

export const uiLanguageOptions: UiLanguage[] = ['auto', 'en', 'zh', 'ja', 'ko', 'fr', 'es'];
export const targetLanguageOptions = ['Auto', 'English', 'Chinese', 'Japanese', 'Korean', 'French', 'Spanish'] as const;

type StatusKey = 'disconnected' | 'connecting' | 'connected' | 'error';

type Translation = {
  status: Record<StatusKey, string>;
  settings: {
    modelConfiguration: string;
    targetLanguage: string;
    interfaceLanguage: string;
    apiKeys: string;
    keysStoredLocal: string;
    test: string;
  };
  prompt: {
    title: string;
    placeholder: string;
    markdownSupported: string;
  };
  voice: {
    inputTitle: string;
    outputTitle: string;
    micIdle: string;
    speechDetected: string;
    micWaitingNext: string;
    micWaitingFirst: string;
    noSignalYet: string;
    confirmed: string;
    userSpeechPlaceholder: string;
    speakerIdle: string;
    playingAudio: string;
    playbackReady: string;
    waitingAudio: string;
    waiting: string;
    playing: string;
    assistantSpeechPlaceholder: string;
  };
  transcript: {
    emptyTitle: string;
    emptyBody: string;
  };
  controls: {
    startLiveCall: string;
    endSession: string;
    whisperConnected: string;
    whisperDisconnected: string;
    exportLog: string;
  };
  system: {
    setApiKeyFirst: (model: string) => string;
    initializingAudioDevices: string;
    microphoneStarted: string;
    detectedMicInput: string;
    receivedAiAudio: string;
    connectedRealtimeApi: (model: string) => string;
    connectionError: string;
    callEnded: string;
    cannotWhisper: string;
    errorPrefix: string;
  };
  languageLabels: Record<(typeof targetLanguageOptions)[number], string>;
  uiLanguageLabels: Record<UiLanguage, string>;
  misc: {
    appTitle: string;
    modelGemini: string;
    modelQwen: string;
    roleAI: string;
    roleUser: string;
    roleSupervisor: string;
    roleSystem: string;
  };
};

export function resolveLocale(uiLanguage: UiLanguage, browserLanguage?: string): SupportedLocale {
  if (uiLanguage !== 'auto') {
    return uiLanguage;
  }

  const normalized = (browserLanguage || 'en').toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
}

export const translations: Record<SupportedLocale, Translation> = {
  en: {
    status: {
      disconnected: 'Disconnected',
      connecting: 'Connecting',
      connected: 'Connected',
      error: 'Error',
    },
    settings: {
      modelConfiguration: 'Model Configuration',
      targetLanguage: 'Target Language',
      interfaceLanguage: 'Interface Language',
      apiKeys: 'API Keys',
      keysStoredLocal: "Keys are stored securely in your browser's local storage.",
      test: 'Test',
    },
    prompt: {
      title: 'System Instructions / Call Purpose',
      placeholder: "Define the AI's role and the goal of the call...",
      markdownSupported: 'Markdown supported',
    },
    voice: {
      inputTitle: 'Voice Input',
      outputTitle: 'Voice Output',
      micIdle: 'Microphone idle',
      speechDetected: 'Speech detected and streaming',
      micWaitingNext: 'Mic active, waiting for next speech',
      micWaitingFirst: 'Mic active, waiting for speech',
      noSignalYet: 'No Signal Yet',
      confirmed: 'Confirmed',
      userSpeechPlaceholder: 'Recognized user speech will appear here.',
      speakerIdle: 'Speaker idle',
      playingAudio: 'Playing AI audio',
      playbackReady: 'Playback ready for next response',
      waitingAudio: 'Waiting for AI audio',
      waiting: 'Waiting',
      playing: 'Playing',
      assistantSpeechPlaceholder: 'Recognized assistant speech will appear here.',
    },
    transcript: {
      emptyTitle: 'Ready to start the call',
      emptyBody: 'Transcript and events will appear here in real-time.',
    },
    controls: {
      startLiveCall: 'Start Live Call',
      endSession: 'End Session',
      whisperConnected: 'Whisper a command to the AI...',
      whisperDisconnected: 'Connect to whisper commands',
      exportLog: 'Export Log',
    },
    system: {
      setApiKeyFirst: (model) => `Please set the API key for ${model} in settings first.`,
      initializingAudioDevices: 'Initializing audio devices...',
      microphoneStarted: 'Microphone started.',
      detectedMicInput: 'Detected live microphone input.',
      receivedAiAudio: 'Received AI audio and started speaker playback.',
      connectedRealtimeApi: (model) => `Connected to ${model} Realtime API.`,
      connectionError: 'Connection Error. Please check your API key and network.',
      callEnded: 'Call ended.',
      cannotWhisper: 'Cannot whisper: Not connected.',
      errorPrefix: 'Error',
    },
    languageLabels: {
      Auto: 'Auto-detect Lang',
      English: 'English',
      Chinese: 'Chinese',
      Japanese: 'Japanese',
      Korean: 'Korean',
      French: 'French',
      Spanish: 'Spanish',
    },
    uiLanguageLabels: {
      auto: 'Follow system',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'AI Phone Assistant',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'AI',
      roleUser: 'User',
      roleSupervisor: 'Supervisor',
      roleSystem: 'System',
    },
  },
  zh: {
    status: {
      disconnected: '未连接',
      connecting: '连接中',
      connected: '已连接',
      error: '错误',
    },
    settings: {
      modelConfiguration: '模型配置',
      targetLanguage: '目标语言',
      interfaceLanguage: '界面语言',
      apiKeys: 'API 密钥',
      keysStoredLocal: '密钥安全保存在浏览器本地存储中。',
      test: '测试',
    },
    prompt: {
      title: '系统指令 / 通话目标',
      placeholder: '定义 AI 的角色与本次通话目标...',
      markdownSupported: '支持 Markdown',
    },
    voice: {
      inputTitle: '语音输入',
      outputTitle: '语音输出',
      micIdle: '麦克风空闲',
      speechDetected: '检测到语音，正在发送',
      micWaitingNext: '麦克风已激活，等待下一段语音',
      micWaitingFirst: '麦克风已激活，等待说话',
      noSignalYet: '尚无信号',
      confirmed: '已确认',
      userSpeechPlaceholder: '这里会显示识别到的用户语音。',
      speakerIdle: '扬声器空闲',
      playingAudio: '正在播放 AI 语音',
      playbackReady: '播放链路已就绪，等待下一次回复',
      waitingAudio: '等待 AI 音频',
      waiting: '等待中',
      playing: '播放中',
      assistantSpeechPlaceholder: '这里会显示识别到的助手语音。',
    },
    transcript: {
      emptyTitle: '准备开始通话',
      emptyBody: '实时转写与系统事件会显示在这里。',
    },
    controls: {
      startLiveCall: '开始实时通话',
      endSession: '结束会话',
      whisperConnected: '给 AI 静默下达指令...',
      whisperDisconnected: '连接后可发送静默指令',
      exportLog: '导出记录',
    },
    system: {
      setApiKeyFirst: (model) => `请先在设置中填写 ${model} 的 API Key。`,
      initializingAudioDevices: '正在初始化音频设备...',
      microphoneStarted: '麦克风已启动。',
      detectedMicInput: '已检测到实时麦克风输入。',
      receivedAiAudio: '已接收到 AI 音频并开始扬声器播放。',
      connectedRealtimeApi: (model) => `已连接到 ${model} 实时 API。`,
      connectionError: '连接出错，请检查 API Key 和网络。',
      callEnded: '通话已结束。',
      cannotWhisper: '无法发送静默指令：当前未连接。',
      errorPrefix: '错误',
    },
    languageLabels: {
      Auto: '自动识别',
      English: '英语',
      Chinese: '中文',
      Japanese: '日语',
      Korean: '韩语',
      French: '法语',
      Spanish: '西班牙语',
    },
    uiLanguageLabels: {
      auto: '跟随系统',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'AI 电话助手',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'AI',
      roleUser: '用户',
      roleSupervisor: '监督者',
      roleSystem: '系统',
    },
  },
  ja: {
    status: {
      disconnected: '未接続',
      connecting: '接続中',
      connected: '接続済み',
      error: 'エラー',
    },
    settings: {
      modelConfiguration: 'モデル設定',
      targetLanguage: '対象言語',
      interfaceLanguage: 'UI 言語',
      apiKeys: 'API キー',
      keysStoredLocal: 'キーはブラウザのローカルストレージに安全に保存されます。',
      test: 'テスト',
    },
    prompt: {
      title: 'システム指示 / 通話目的',
      placeholder: 'AI の役割と通話の目的を定義してください...',
      markdownSupported: 'Markdown 対応',
    },
    voice: {
      inputTitle: '音声入力',
      outputTitle: '音声出力',
      micIdle: 'マイク待機中',
      speechDetected: '音声を検出し送信中',
      micWaitingNext: 'マイク有効、次の発話を待機',
      micWaitingFirst: 'マイク有効、発話待機中',
      noSignalYet: '信号なし',
      confirmed: '確認済み',
      userSpeechPlaceholder: '認識されたユーザー音声がここに表示されます。',
      speakerIdle: 'スピーカー待機中',
      playingAudio: 'AI 音声を再生中',
      playbackReady: '再生準備完了、次の応答待ち',
      waitingAudio: 'AI 音声を待機中',
      waiting: '待機中',
      playing: '再生中',
      assistantSpeechPlaceholder: '認識されたアシスタント音声がここに表示されます。',
    },
    transcript: {
      emptyTitle: '通話を開始する準備ができました',
      emptyBody: '文字起こしとイベントがここにリアルタイム表示されます。',
    },
    controls: {
      startLiveCall: 'ライブ通話を開始',
      endSession: 'セッション終了',
      whisperConnected: 'AI にサイレント指示を送信...',
      whisperDisconnected: '接続後にサイレント指示が使えます',
      exportLog: 'ログを書き出す',
    },
    system: {
      setApiKeyFirst: (model) => `まず設定で ${model} の API キーを入力してください。`,
      initializingAudioDevices: '音声デバイスを初期化しています...',
      microphoneStarted: 'マイクを開始しました。',
      detectedMicInput: 'リアルタイムのマイク入力を検出しました。',
      receivedAiAudio: 'AI 音声を受信し、スピーカー再生を開始しました。',
      connectedRealtimeApi: (model) => `${model} Realtime API に接続しました。`,
      connectionError: '接続エラーです。API キーとネットワークを確認してください。',
      callEnded: '通話を終了しました。',
      cannotWhisper: 'サイレント指示を送信できません: 未接続です。',
      errorPrefix: 'エラー',
    },
    languageLabels: {
      Auto: '自動検出',
      English: '英語',
      Chinese: '中国語',
      Japanese: '日本語',
      Korean: '韓国語',
      French: 'フランス語',
      Spanish: 'スペイン語',
    },
    uiLanguageLabels: {
      auto: 'システム設定に従う',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'AI 電話アシスタント',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'AI',
      roleUser: 'ユーザー',
      roleSupervisor: 'スーパーバイザー',
      roleSystem: 'システム',
    },
  },
  ko: {
    status: {
      disconnected: '연결 안 됨',
      connecting: '연결 중',
      connected: '연결됨',
      error: '오류',
    },
    settings: {
      modelConfiguration: '모델 설정',
      targetLanguage: '대상 언어',
      interfaceLanguage: 'UI 언어',
      apiKeys: 'API 키',
      keysStoredLocal: '키는 브라우저 로컬 스토리지에 안전하게 저장됩니다.',
      test: '테스트',
    },
    prompt: {
      title: '시스템 지침 / 통화 목적',
      placeholder: 'AI의 역할과 통화 목표를 정의하세요...',
      markdownSupported: 'Markdown 지원',
    },
    voice: {
      inputTitle: '음성 입력',
      outputTitle: '음성 출력',
      micIdle: '마이크 대기 중',
      speechDetected: '음성을 감지해 전송 중',
      micWaitingNext: '마이크 활성화됨, 다음 발화 대기',
      micWaitingFirst: '마이크 활성화됨, 발화 대기',
      noSignalYet: '신호 없음',
      confirmed: '확인됨',
      userSpeechPlaceholder: '인식된 사용자 음성이 여기에 표시됩니다.',
      speakerIdle: '스피커 대기 중',
      playingAudio: 'AI 음성 재생 중',
      playbackReady: '재생 준비 완료, 다음 응답 대기',
      waitingAudio: 'AI 오디오 대기 중',
      waiting: '대기 중',
      playing: '재생 중',
      assistantSpeechPlaceholder: '인식된 어시스턴트 음성이 여기에 표시됩니다.',
    },
    transcript: {
      emptyTitle: '통화를 시작할 준비가 되었습니다',
      emptyBody: '실시간 전사와 이벤트가 여기에 표시됩니다.',
    },
    controls: {
      startLiveCall: '실시간 통화 시작',
      endSession: '세션 종료',
      whisperConnected: 'AI에게 조용히 지시 보내기...',
      whisperDisconnected: '연결 후 조용한 지시를 보낼 수 있습니다',
      exportLog: '로그 내보내기',
    },
    system: {
      setApiKeyFirst: (model) => `먼저 설정에서 ${model} API 키를 입력하세요.`,
      initializingAudioDevices: '오디오 장치를 초기화하는 중...',
      microphoneStarted: '마이크가 시작되었습니다.',
      detectedMicInput: '실시간 마이크 입력이 감지되었습니다.',
      receivedAiAudio: 'AI 오디오를 받아 스피커 재생을 시작했습니다.',
      connectedRealtimeApi: (model) => `${model} 실시간 API에 연결되었습니다.`,
      connectionError: '연결 오류입니다. API 키와 네트워크를 확인하세요.',
      callEnded: '통화가 종료되었습니다.',
      cannotWhisper: '조용한 지시를 보낼 수 없습니다: 연결되지 않았습니다.',
      errorPrefix: '오류',
    },
    languageLabels: {
      Auto: '자동 감지',
      English: '영어',
      Chinese: '중국어',
      Japanese: '일본어',
      Korean: '한국어',
      French: '프랑스어',
      Spanish: '스페인어',
    },
    uiLanguageLabels: {
      auto: '시스템 설정 따르기',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'AI 전화 도우미',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'AI',
      roleUser: '사용자',
      roleSupervisor: '감독자',
      roleSystem: '시스템',
    },
  },
  fr: {
    status: {
      disconnected: 'Déconnecté',
      connecting: 'Connexion',
      connected: 'Connecté',
      error: 'Erreur',
    },
    settings: {
      modelConfiguration: 'Configuration du modèle',
      targetLanguage: 'Langue cible',
      interfaceLanguage: "Langue de l'interface",
      apiKeys: 'Clés API',
      keysStoredLocal: 'Les clés sont stockées en toute sécurité dans le stockage local du navigateur.',
      test: 'Tester',
    },
    prompt: {
      title: "Instructions système / Objectif de l'appel",
      placeholder: "Définissez le rôle de l'IA et l'objectif de l'appel...",
      markdownSupported: 'Markdown pris en charge',
    },
    voice: {
      inputTitle: 'Entrée vocale',
      outputTitle: 'Sortie vocale',
      micIdle: 'Microphone inactif',
      speechDetected: 'Parole détectée et envoyée',
      micWaitingNext: 'Micro actif, en attente de la prochaine parole',
      micWaitingFirst: 'Micro actif, en attente de parole',
      noSignalYet: 'Aucun signal',
      confirmed: 'Confirmé',
      userSpeechPlaceholder: "La parole reconnue de l'utilisateur apparaîtra ici.",
      speakerIdle: 'Haut-parleur inactif',
      playingAudio: "Lecture de l'audio IA",
      playbackReady: 'Lecture prête pour la prochaine réponse',
      waitingAudio: "En attente de l'audio IA",
      waiting: 'En attente',
      playing: 'Lecture',
      assistantSpeechPlaceholder: "La parole reconnue de l'assistant apparaîtra ici.",
    },
    transcript: {
      emptyTitle: "Prêt à démarrer l'appel",
      emptyBody: 'La transcription et les événements apparaîtront ici en temps réel.',
    },
    controls: {
      startLiveCall: "Démarrer l'appel live",
      endSession: 'Terminer la session',
      whisperConnected: "Envoyer une consigne silencieuse à l'IA...",
      whisperDisconnected: 'Connectez-vous pour envoyer des consignes silencieuses',
      exportLog: 'Exporter le journal',
    },
    system: {
      setApiKeyFirst: (model) => `Veuillez d'abord définir la clé API ${model} dans les réglages.`,
      initializingAudioDevices: 'Initialisation des périphériques audio...',
      microphoneStarted: 'Microphone démarré.',
      detectedMicInput: 'Entrée micro en direct détectée.',
      receivedAiAudio: "Audio IA reçu et lecture sur le haut-parleur démarrée.",
      connectedRealtimeApi: (model) => `Connecté à l'API temps réel ${model}.`,
      connectionError: 'Erreur de connexion. Vérifiez votre clé API et le réseau.',
      callEnded: 'Appel terminé.',
      cannotWhisper: "Impossible d'envoyer la consigne silencieuse : non connecté.",
      errorPrefix: 'Erreur',
    },
    languageLabels: {
      Auto: 'Détection automatique',
      English: 'Anglais',
      Chinese: 'Chinois',
      Japanese: 'Japonais',
      Korean: 'Coréen',
      French: 'Français',
      Spanish: 'Espagnol',
    },
    uiLanguageLabels: {
      auto: 'Suivre le système',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'Assistant téléphonique IA',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'IA',
      roleUser: 'Utilisateur',
      roleSupervisor: 'Superviseur',
      roleSystem: 'Système',
    },
  },
  es: {
    status: {
      disconnected: 'Desconectado',
      connecting: 'Conectando',
      connected: 'Conectado',
      error: 'Error',
    },
    settings: {
      modelConfiguration: 'Configuración del modelo',
      targetLanguage: 'Idioma objetivo',
      interfaceLanguage: 'Idioma de la interfaz',
      apiKeys: 'Claves API',
      keysStoredLocal: 'Las claves se guardan de forma segura en el almacenamiento local del navegador.',
      test: 'Probar',
    },
    prompt: {
      title: 'Instrucciones del sistema / Objetivo de la llamada',
      placeholder: 'Define el rol de la IA y el objetivo de la llamada...',
      markdownSupported: 'Markdown compatible',
    },
    voice: {
      inputTitle: 'Entrada de voz',
      outputTitle: 'Salida de voz',
      micIdle: 'Micrófono inactivo',
      speechDetected: 'Voz detectada y transmitiéndose',
      micWaitingNext: 'Micrófono activo, esperando la siguiente voz',
      micWaitingFirst: 'Micrófono activo, esperando voz',
      noSignalYet: 'Sin señal',
      confirmed: 'Confirmado',
      userSpeechPlaceholder: 'Aquí aparecerá la voz reconocida del usuario.',
      speakerIdle: 'Altavoz inactivo',
      playingAudio: 'Reproduciendo audio de la IA',
      playbackReady: 'Reproducción lista para la siguiente respuesta',
      waitingAudio: 'Esperando audio de la IA',
      waiting: 'Esperando',
      playing: 'Reproduciendo',
      assistantSpeechPlaceholder: 'Aquí aparecerá la voz reconocida del asistente.',
    },
    transcript: {
      emptyTitle: 'Listo para iniciar la llamada',
      emptyBody: 'La transcripción y los eventos aparecerán aquí en tiempo real.',
    },
    controls: {
      startLiveCall: 'Iniciar llamada en vivo',
      endSession: 'Finalizar sesión',
      whisperConnected: 'Envía una orden silenciosa a la IA...',
      whisperDisconnected: 'Conéctate para enviar órdenes silenciosas',
      exportLog: 'Exportar registro',
    },
    system: {
      setApiKeyFirst: (model) => `Primero configura la clave API de ${model} en ajustes.`,
      initializingAudioDevices: 'Inicializando dispositivos de audio...',
      microphoneStarted: 'Micrófono iniciado.',
      detectedMicInput: 'Se detectó entrada de micrófono en vivo.',
      receivedAiAudio: 'Se recibió audio de la IA y comenzó la reproducción.',
      connectedRealtimeApi: (model) => `Conectado a la API en tiempo real de ${model}.`,
      connectionError: 'Error de conexión. Revisa tu clave API y la red.',
      callEnded: 'Llamada finalizada.',
      cannotWhisper: 'No se puede enviar la orden silenciosa: no hay conexión.',
      errorPrefix: 'Error',
    },
    languageLabels: {
      Auto: 'Detección automática',
      English: 'Inglés',
      Chinese: 'Chino',
      Japanese: 'Japonés',
      Korean: 'Coreano',
      French: 'Francés',
      Spanish: 'Español',
    },
    uiLanguageLabels: {
      auto: 'Seguir el sistema',
      en: 'English',
      zh: '简体中文',
      ja: '日本语',
      ko: '한국어',
      fr: 'Français',
      es: 'Español',
    },
    misc: {
      appTitle: 'Asistente telefónico IA',
      modelGemini: 'Gemini 2.5 Flash Native',
      modelQwen: 'Qwen Omni',
      roleAI: 'IA',
      roleUser: 'Usuario',
      roleSupervisor: 'Supervisor',
      roleSystem: 'Sistema',
    },
  },
};
