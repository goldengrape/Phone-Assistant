# 模块设计文档

## 1. 范围

本文描述前端应用当前的模块边界与职责划分。

## 2. 模块地图

```text
App.tsx
  -> store/useAppStore.ts
  -> i18n.ts
  -> api/AIClient.ts
     -> api/GeminiLiveClient.ts
     -> api/QwenLiveClient.ts
  -> audio/AudioCapture.ts
  -> audio/AudioPlayback.ts
  -> index.css
```

## 3. 模块职责

### 3.1 `App.tsx`

角色：

- 应用壳（application shell）
- 会话生命周期协调器
- UI 事件处理
- 转写渲染
- 本地化文案选择

主要职责：

- 初始化音频采集与播放
- 实例化当前选择的模型 client
- 处理 connect / stop 流程
- 更新转写与预览状态
- 发送静默指令
- 导出日志

### 3.2 `useAppStore.ts`

角色：

- 持久化的全局配置与转写状态

保存的值：

- 当前 provider
- AI 输出语言
- UI 语言
- call purpose
- Gemini key
- Qwen key
- 连接状态
- 转写消息列表

### 3.3 `i18n.ts`

角色：

- 定义翻译 schema
- 暴露支持的 locale
- 提供 UI 标签与状态文案映射
- 将 `auto` locale 解析为浏览器语言

### 3.4 `AIClient.ts`

角色：

- 抽象厂商特定的实时通信

核心契约：

- `connect(): Promise<void>`
- `disconnect(): void`
- `sendAudio(pcm16: Int16Array): void`
- `sendWhisper(text: string): void`

回调：

- `onAudioData`
- `onTranscriptPreview`
- `onTranscript`
- `onStateChange`

### 3.5 `GeminiLiveClient.ts`

角色：

- 实现 Gemini provider 适配器

关键行为：

- 通过 `@google/genai` 创建 live session
- 将基础规则、call purpose、输出语言约束组装为 system instructions
- 通过 `sendRealtimeInput` 上行麦克风音频
- 通过 `sendClientContent` 发送静默指令
- 处理输入转写、输出转写与流式音频 parts

### 3.6 `QwenLiveClient.ts`

角色：

- 实现 Qwen provider 适配器

关键行为：

- 建立浏览器 WebSocket 会话
- 连接后发送 `session.update`
- 通过 `input_audio_buffer.append` 流式发送音频
- 通过 `conversation.item.create` 注入静默指令
- 处理转写与音频 delta 事件

### 3.7 `AudioCapture.ts`

角色：

- 获取麦克风并输出 PCM 分片

预期输出：

- PCM16 音频分片
- 电平更新
- 语音检测信号

### 3.8 `AudioPlayback.ts`

角色：

- 渲染并播放流式音频输出

关键行为：

- 确保浏览器 audio context 处于 running
- PCM16 转 float buffers
- 连续调度播放
- 采样率变化时重建播放 context

### 3.9 `index.css`

角色：

- 提供主题 token 与全局响应式样式

当前能力：

- 系统自适应浅色/深色模式
- 渐变背景与分层 surface 风格
- 输入、卡片、底部控件风格一致

## 4. 当前模块交互

- `App.tsx` 负责端到端会话生命周期编排
- provider 适配器不直接操作 UI
- 音频模块不知道当前使用哪个 provider
- store 不感知 Web Audio 细节
- 本地化数据留在翻译层中

## 5. 扩展建议

未来扩展应保持当前分离方式：

- 新 provider 通过 `AIClient` 接入
- 新 UI 语言在 `i18n.ts` 中扩展
- prompt presets 或 skill 以配置数据形式加入，而非传输逻辑
- 避免将厂商协议逻辑塞进 `App.tsx`

