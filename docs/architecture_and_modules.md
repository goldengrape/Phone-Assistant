# 架构与模块设计文档

## 1. 架构概览

本项目 (AI Phone Assistant) 是一个基于 **React + Vite + TypeScript** 构建的纯前端单页面应用 (SPA)。它设计为“移动端优先 (Mobile-First)”的响应式网页，并计划最终使用 **Tauri** 封装为跨平台桌面应用程序。

本系统的核心特点是 **无后端架构 (Serverless/Backendless)**。前端通过浏览器的 **Web Audio API** 直接捕获麦克风的音频输入，进行前端本地的音频格式转换（重采样为 PCM16），随后直接建立 **WebSocket (WSS)** 长连接，与支持实时多模态音频流的大语言模型（如 Google Gemini 2.5 Flash Native Audio Preview 和 Alibaba Qwen Omni Realtime API）进行全双工通信。

```mermaid
graph TD
    A[用户/Supervisor界面 (React + Tailwind)] <--> B(状态管理 Zustand)
    B <--> C{API 抽象层 (AIClient)}
    A --> D[麦克风采集 (AudioCapture)]
    E[扬声器播放 (AudioPlayback)] --> A

    D -- PCM16 Audio --> C
    C -- Base64 Audio Chunk --> F[(WebSocket 连接)]
    F -- Base64 Audio Chunk --> E

    F <--> G[Gemini Live API]
    F <--> H[Qwen Realtime API]
```

## 2. 核心模块说明

系统主要分为四大功能模块：UI 视图层、全局状态管理层、音频硬件 I/O 层、以及 AI 实时网络通信层。

### 2.1 UI 视图层 (`src/App.tsx`, `src/App.css`, `src/index.css`)
- **职责**：负责界面的渲染与用户交互，提供“监督者 (Supervisor)”控制台。
- **技术栈**：基于 **React** 构建组件树，使用 **Tailwind CSS** 和 **shadcn/ui** 提供美观、响应式且支持深色模式的界面。
- **核心组件功能**：
  - **参数配置**：配置 AI 模型切换 (Gemini/Qwen)、系统 API Key、对话主旨 (Call Purpose) 和目标语言 (Target Language)。
  - **状态指示器**：显示当前的连接状态 (Disconnected, Connecting, Connected, Error)。
  - **日志视图**：实时展示双向通话转录文本 (Transcript) 与系统日志。
  - **Whisper 打断控制**：提供一个文本输入框，允许监督者在语音通话期间静默发送“文字干预指令 (Whisper)”，强行控制 AI 的对话走向。

### 2.2 全局状态管理层 (`src/store/useAppStore.ts`)
- **职责**：管理应用级别的全局状态，使得复杂的组件间（例如跨越侧边栏配置与中央对话主体的变量）无需通过繁琐的 props 传递数据。
- **技术栈**：使用 **Zustand** 构建轻量级的状态树。
- **管理的状态包括**：
  - 当前选中的大模型 (`model`: 'Gemini' | 'Qwen')。
  - API 密钥的持久化存储与读取 (`localStorage`)。
  - 聊天记录/转录文本 (`messages` 数组)。
  - 通话目的与强制语言要求 (`callPurpose`, `language`)。
  - 当前网络连接状态 (`status`)。

### 2.3 音频硬件 I/O 层 (`src/audio/`)
由于大模型 API 对实时音频流的格式有严格要求（通常为 16kHz 或 24kHz、单声道、16位 PCM 小端序），浏览器原生的麦克风采集数据（通常为 44.1kHz 或 48kHz 的 Float32 格式）必须在前端实时转换。
- **`AudioCapture.ts` (音频采集与降频)**
  - **职责**：向用户申请麦克风权限（开启回声消除 `echoCancellation`、降噪 `noiseSuppression` 和自动增益 `autoGainControl`）。
  - **处理**：利用 `AudioContext` 设定采样率为 `16000Hz`（模型输入标准）。利用 `ScriptProcessorNode` 拦截麦克风的 `Float32Array` 数据流，并将其压缩量化为 `Int16Array` (PCM16)。
  - **输出**：通过回调函数 `onAudioData` 将 PCM16 数据块推送给 API 抽象层。

- **`AudioPlayback.ts` (音频解码与播放)**
  - **职责**：接收来自大模型的实时音频响应流并无缝播放。
  - **处理**：将接收到的 `Int16Array` 还原映射回 Web Audio API 所需的 `Float32Array`。
  - **输出**：根据 `sampleRate` (Gemini 默认为 24kHz，Qwen 默认为 16/24kHz) 创建 `AudioBuffer`，利用时间戳精准调度，实现无爆音的平滑拼接播放。

### 2.4 AI 网络通信层 (`src/api/`)
- **`AIClient.ts` (抽象接口)**
  - **职责**：定义统一的接口 `AIClient`，隐藏不同大模型 WebSocket 协议的差异。规定了 `connect`, `disconnect`, `sendAudio`, `sendWhisper` 等标准方法。
- **`GeminiLiveClient.ts` (Google Gemini 适配器)**
  - **职责**：建立与 `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent` 的双向连接。
  - **功能**：处理 Gemini 特有的 Setup 请求（包括系统提示词配置、语音强制配置）；拦截 `serverContent` (音频输出) 与 `callers` 转录事件；将输入输出的数据格式按 Base64 进行打包/解包。
- **`QwenLiveClient.ts` (Alibaba Qwen 适配器)**
  - **职责**：建立与 `wss://dashscope.aliyuncs.com/api-ws/v1/inference/` 的实时连接。
  - **功能**：处理 Qwen 兼容 OpenAI Realtime API 规范的 JSON 指令（如 `session.update`, `input_audio_buffer.append`）。处理 Qwen 返回的 `response.audio.delta` 与转录事件。

## 3. 设计原则总结

- **无后端/边缘计算**：剥离原本 Python/Node.js CLI 桥接层的复杂度，让客户端直接对接云端 AI，极大降低了部署成本和通信延迟。
- **单向数据流与清晰职责**：UI 触发 Action -> Zustand 更新状态 -> 实例化并配置 API Client -> API Client 开启 Audio IO -> Audio 产生的数据流直接供给 API Client 进行网络传输。模块之间相互解耦，符合高内聚低耦合标准。
