# AI Phone Assistant（中文说明）

AI Phone Assistant 是一个实时语音通话监督（supervisor）应用，使用 `Vite + React + TypeScript` 构建。
它让浏览器直接连接到：

- Google Gemini Live API（通过官方 `@google/genai` SDK）
- 阿里 Qwen Realtime API（通过浏览器 WebSocket 客户端）

应用会用 Web Audio API 捕获麦克风音频，将 PCM 音频流式发送给所选模型，实时播放模型返回的音频，并在对话区显示转写预览；监督者还可以在通话过程中注入“静默文本指令”（不会被语音朗读）。

## 当前状态

本仓库目前是一个“前端优先”的实现：

- 运行环境：浏览器
- UI：响应式布局，自适应系统浅色/深色主题
- 状态管理：Zustand
- 模型：Gemini 与 Qwen
- 输入音频：16 kHz PCM
- 输出音频：流式 PCM 播放（支持动态采样率处理）
- UI 语言：英文、中文、日文、韩文、法文、西班牙文，另含“跟随系统”模式
- 目标输出语言：自动、英文、中文、日文、韩文、法文、西班牙文
- Gemini 语音：支持 30 个官方预置音色可选

## 关键特性

- 实时语音输入与语音输出
- 监督者“whisper”静默指令（不会被朗读出来）
- 对话区实时显示：用户、助手、监督者、系统消息（含转写预览与最终文本）
- 精简的 Voice Input / Voice Output 电平监控卡片
- API Key 在浏览器本地存储中持久化
- 可编辑的 system instructions / call purpose
- “界面语言”与“AI 口语语言”分离设置（两者可不同）
- 底部 whisper 指令栏固定（sticky），方便快速输入
- Gemini 会话上下文诊断信息（可折叠）
- 可导出会话日志
- 适配桌面与窄屏
- 根据系统配色方案自适应主题

## 架构概览

```text
Microphone
  -> AudioCapture (Web Audio API, PCM16 @ 16 kHz)
  -> AI client adapter
     -> GeminiLiveClient (@google/genai live session)
     -> QwenLiveClient (browser WebSocket)
  -> streamed model audio
  -> AudioPlayback (Web Audio API scheduling)
  -> speaker

UI (React)
  <-> Zustand store
  <-> AI client lifecycle
  <-> transcript / whisper / settings
```

## 重要实现说明

### Gemini

- 使用官方 `@google/genai` 的 live session API
- 当前模型：
  `models/gemini-2.5-flash-native-audio-preview-12-2025`
- 请求音频输出（audio modality）
- 启用输入与输出的音频转写
- 默认音色：`Zephyr`
- 通过 UI 支持选择全部 30 个官方预置音色

### Qwen

- 通过浏览器 WebSocket 连接到 DashScope realtime endpoint
- 使用 `input_audio_buffer.append` 发送音频
- 使用 `conversation.item.create` 发送监督者文本

## 本地开发

### 依赖

- Node.js 18+
- Gemini API Key 和/或 DashScope API Key

### 安装

```bash
npm install
```

### 运行

```bash
npm run dev
```

然后打开终端中显示的本地 Vite URL。

### 构建

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## 配置

目前 API Key 主要通过 UI 写入并存储在浏览器 local storage 中。

设置面板会区分：

- 监督者 UI 使用的界面语言（interface language）
- 模型输出行为使用的 AI 口语语言（AI spoken language）

客户端也支持从环境变量读取（可选）：

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_DASHSCOPE_API_KEY=your_qwen_api_key
```

## 主要源码结构

```text
src/
  api/
    AIClient.ts
    GeminiLiveClient.ts
    QwenLiveClient.ts
  audio/
    AudioCapture.ts
    AudioPlayback.ts
  store/
    useAppStore.ts
  i18n.ts
  App.tsx
  index.css
```

## 文档

- `docs/architecture_and_modules.md`：当前架构与模块职责
- `docs/audio_and_websocket_flow.md`：音频、转写、实时传输流程
- `docs/user_requirements.md`：产品层需求
- `docs/ADD.md`：从公理化设计视角给出的设计理由
- `docs/MDD.md`：模块设计文档
- `docs/algorithm_description.md`：实现层处理流程说明
- `docs/skill_evaluation_report.md`：是否应引入 AI skill 的评估
- `docs/skill_module_implementation.zh.md`：当前文档驱动 skill 模块的实现说明
- `docs/ui_design_principles.md`：后续前端迭代的 UI 设计原则

## 已知约束

- 相比原始协议实现，Gemini 官方 SDK 会显著增加前端 bundle 体积
- 受限于提供方的 WebSocket 鉴权模型，Qwen 的浏览器侧鉴权仍有约束
- 实际语音质量与转写准确性会受到浏览器权限、音频设备路由、以及模型实时行为影响
