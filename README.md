# Gemini Phone Assistant (Mac + iPhone 版)

基于 **Google Gemini Multimodal Live API** 的智能电话助手，结合 Mac 连续互通接听 iPhone 来电功能，通过图形化 GUI 帮助用户（监督者）直观管理 AI 代理与来电者的通话。

## 架构概览

```
[ iPhone 来电 ] <---> [ Mac 连续互通 (免提) ]
                               |
                   [ 系统麦克风 / 扬声器 ]
                               |
               [ Python Kivy GUI 监督者界面 ]
                               |
                  (google-genai SDK / WebSocket)
                               |
              [ Gemini 2.5 Flash Native Audio API ]
```

**数据流**：系统麦克风采集通话音频 → 16-bit PCM 编码 → Gemini Live API → AI 语音合成（24000Hz）→ 系统扬声器输出。

## 功能特性

- **原生音频路由**：使用系统默认麦克风与扬声器，无需第三方虚拟声卡（告别 BlackHole）。
- **实时语音对话**：低延迟全双工音频流，支持打断响应（音频队列容积 maxsize=10）。
- **Whisper 干预系统**：监督者可在通话中静默发送文字指令，即时改变 AI 对答方向。
- **实时转录日志**：双向通话记录实时展示，挂断后一键导出文本。
- **通话参数配置**：接通前可设定【本次通话主旨】与【强制 AI 回复语言】。
- **Kivy GUI**：跨平台图形界面，原生支持苹方中文字体，消灭乱码。

## 前置条件

1. **Mac + iPhone**：iPhone 与 Mac 登录同一 Apple ID，并启用 **连续互通** 功能（支持 iPhone 接听来电转至 Mac）。
2. **Python 环境**：使用 `uv` 管理依赖。
3. **Google API Key**：需申请 Gemini API 密钥。

## 安装

```bash
# 克隆项目
git clone https://github.com/your-repo/Phone-Assistant.git
cd Phone-Assistant

# 使用 uv 安装依赖
uv sync
```

## 配置

在项目根目录创建 `.env` 文件：

```env
GEMINI_API_KEY=your_google_api_key_here
```

## 使用方法

```bash
# 启动 GUI 应用
uv run python main.py
```

**GUI 操作流程**：

1. 在通话开始前，填写【本次通话主旨】（可选）和【强制回复语言】（可选）。
2. iPhone 来电时，在 Mac 上通过连续互通接听（免提模式）。
3. 点击 **启动** 按钮，AI 代理开始监听并接管对话。
4. 在 Whisper 输入框键入干预文字，AI 将静默接收并调整对话方向。
5. 通话结束后点击 **停止**，可在日志区查看并导出转录记录。

## 工程原则

本项目遵循以下软件工程原则：

| 原则 | 应用 |
|------|------|
| **奥卡姆剃刀** | 使用物理麦克风/扬声器，放弃虚拟声卡路由 |
| **公理设计** | 功能与实现细节解耦，最简方案最优 |
| **函数式编程** | 音频编码、Prompt 合并等核心变换为纯函数 |
| **契约式编程** | 输入输出通过断言与类型注解验证前后置条件 |
| **测试驱动开发** | 使用 `pytest` 先写测试用例，再写实现 |

## 技术实现要点

- **模型**：`gemini-2.5-flash-preview-native-audio` （Gemini 2.5 Flash Native Audio Preview）
- **采样率**：系统全局 24000Hz（Gemini 强制要求）
- **SDK**：`google-genai` 官方 Python SDK
- **GUI 框架**：Kivy（macOS 原生苹方字体支持）
- **包管理**：`uv`

## 许可证

MIT
