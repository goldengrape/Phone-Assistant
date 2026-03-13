# 算法与实现说明

## 1. 当前运行模型

当前实现是一个前端实时语音应用。

它不再以旧的 CLI bridge 架构为主路径。

核心运行步骤：

1. 从 UI 与持久化 store 获取配置
2. 创建播放链路
3. 创建麦克风采集链路
4. 连接选中的厂商
5. 流式发送音频输入
6. 接收音频与转写事件
7. 持续更新 UI 状态
8. 允许监督者在会话中静默引导

## 2. Prompt 组装

建立连接时，所选 client 会从以下内容构建模型指令块：

- 一份基础的“实时电话助手”策略
- 可编辑的 call purpose
- 可选的“强制输出语言约束”

这样既保留 UI 的可编辑性，又能维持对厂商稳定的提示词结构。

## 3. 音频输入转换

浏览器采集到的音频格式更适合 Web Audio 处理，但模型 API 通常需要 PCM16 分片。

因此输入路径会：

1. 采集麦克风音频帧
2. 将其转换/准备为 PCM16
3. 将分片交给当前 client 上行

UI 同时会收到音频活动信息，用于判断是否存在输入信号。

## 4. 音频输出转换

模型输出通常是分片式的 PCM payload。

因此输出路径会：

1. 需要时先进行 base64 解码
2. 将 PCM16 转为 `Float32Array`
3. 写入 `AudioBuffer`
4. 按滚动时间游标调度播放

这是避免明显爆音与分片间间隙的核心技术手段。

## 5. 转写处理

应用区分两类转写用途：

- 监控用途的“预览文本”
- 会话时间线中的“最终文本”

该区分很重要，因为实时 API 常会在句子/轮次最终落地前输出中间态。

## 6. 厂商特定逻辑

### 6.1 Gemini

Gemini 使用官方 live SDK session。

关键行为：

- 通过 `GoogleGenAI().live.connect(...)` 连接
- 使用 `sendRealtimeInput` 上行麦克风音频
- 使用 `sendClientContent` 发送静默指令
- 消费：
  - input transcription
  - output transcription
  - model audio parts

### 6.2 Qwen

Qwen 使用浏览器 WebSocket client。

关键行为：

- 连接后发送 `session.update`
- 通过 `input_audio_buffer.append` 上行麦克风音频
- 通过 `conversation.item.create` 注入静默指令文本
- 消费：
  - audio deltas
  - user transcript completion
  - assistant transcript completion

## 7. 播放采样率策略

播放层不会永久假设单一的输出采样率。

如果收到的音频分片标识了与当前播放 context 不同的采样率，播放层会重建 context 后继续播放。

这样可以提升在不同厂商与不同输出配置下的鲁棒性。

## 8. 当前可观测信号

UI 当前会呈现：

- 连接状态
- 麦克风电平
- 扬声器电平
- 是否已观察到输入音频
- 是否已观察到输出音频
- 会话转写时间线

这些信号用于帮助监督者快速区分：

- 没有麦克风权限
- 没有输入活动
- 没有转写识别
- 模型没有返回音频
- 返回了音频但不可听或很弱

