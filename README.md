# AI Phone Assistant (Web & Desktop)

基于 **Google Gemini Multimodal Live API** 和 **Alibaba Qwen Realtime API** 的智能电话助手前端应用。它作为“监督者”界面，帮助用户通过实时语音（直连大模型）与外部人员沟通，并支持中途静默发送文字指令来干预 AI 对话走向。

## 架构概览 (纯前端 React 方案)

本应用已全面重构为纯前端架构（Vite + React + TypeScript），通过浏览器的 **Web Audio API** 捕获麦克风输入并转换为模型所需的 16kHz PCM，再通过原生 **WebSocket** 直接连接大模型 API。

*未来规划：本项目将使用 Tauri 封装为极简的跨平台单机软件。*

```
[ iPhone/外部来电 ] <---> [ Mac/PC (免提外放) ]
                               |
                     [ 浏览器 Web Audio API ]
                               |
             [ React GUI (Supervisor Interface) ]
                               |
                        [ WebSocket ]
                               |
        [ Gemini 2.5 Flash Native Audio / Qwen Omni Realtime ]
```

## 功能特性

- **纯前端架构**：无需 Python 后端环境，直接在浏览器中进行实时重采样（Resampling）和音频流媒体交互。
- **双引擎支持**：内置对接 **Gemini 2.5 Flash Native Audio** 和 **通义千问 Qwen3 Omni Realtime**。
- **Whisper 干预系统**：监督者可在通话中静默发送文字指令，即时改变 AI 对答方向。
- **实时转录与导出**：双向通话记录实时展示，支持挂断后一键导出文本。
- **响应式 UI 设计**：基于 Tailwind CSS + shadcn/ui，支持桌面端与移动端完美适配，深色模式。

## 前置条件 & 配置

1. **Node.js** 环境 (推荐 v18+)。
2. 在项目根目录创建 `.env.local`：

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_DASHSCOPE_API_KEY=your_aliyun_qwen_api_key
```

## 安装与启动

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev
```

打开 `http://localhost:5173` 开始使用。
