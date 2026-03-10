# 模块设计文档 (Module Design Document - MDD) - V2版

## 1. 架构概览与依赖关系
基于 **奥卡姆剃刀** 原则，本架构摒除了一切无需加入的多设备虚拟分发，退回至最朴素的默认原生音频链路。系统划分为三个清晰无内蕴纠葛的顶层边界层： `GUI 界面控制台`，`网络状态与纯函数组`，与 `原生音频硬件采集播放 (Audio Hardware IO)`。

核心通信利用异步队列(`asyncio.Queue`)并在进出时由强类型的契约验证(pydantic/assert)。开发模式遵循测试驱动开发 (TDD)。

## 2. 软件模块与职责划分

### 2.1 模块 A：原生低延迟音频 IO (`audio_io.py`) - (副作用层)
- **职责 (DbC 契约)**:
  - **前置**: 流输入支持跨平台缺省麦克风/扬声器，采样率为 Gemini 强制要求的 `24kHz` 格式。
  - **后置**: 队列缓存体积极小以减少缓冲时延响应。流必须非阻塞、在停止后闭合安全释放。
- **模块设计 (FP 隔离)**:
  抛弃原硬编码的第三方虚拟声卡 (BlackHole) 依赖，由 `PyAudio` 统管系统物理发声器与收声器。纯副作(side-effect)模块，提供音频收集器(Generator)与网络降轨播放器(Consumer)函数协程。

### 2.2 模块 B：通信协议与纯参数函数层 (`domain_logic.py`) - (无副作用纯函数)
- **职责 (DbC 契约)**:
  - 去除一切全局状态，贯彻不可变性。
  - **输入**: 原始 PCM 字节或用户操作指令文本。
  - **输出**: JSON Schema / SDK 包裹约束验证。
- **模块设计**:
  - `build_audio_message(pcm_data: bytes) -> dict` 
  - `build_intervention_message(text: str) -> str`
- **验证策略**: 作为项目的最核心心智层，极易撰写针对输入和正确预期返回值的自动化测试。

### 2.3 模块 C：官方网络互联总线 (`gemini_multimodal.py`) - (副作用层)
- **职责**: 使用 `google-genai` SDK 包接通并实时管理双向音频通道，注入来自界面层的动态身份指令与限制。
- **模块设计**:
  提供 `GeminiSession(api_key, ..., call_purpose, target_language)` 对象。初始化时基于入参组合强大的 `system_instruction`（控制接线员行为、控制沉默不读后台指令、控制只说指定语言）。将远端 SDK 流抓取出的 `Transcript` 数据流同时传递给输出终端列与 UI 层视图显示。

### 2.4 模块 D：全能监控台 (GUI 视图 `gui_app.py`)
- **职责**: 显示直观状态和多维度干预。
- **模块设计**:
  基于 `Kivy` 引擎：
  1. 挂载了系统原生字体（以解决各操作系统差异下的中文文本显示故障）。
  2. 包含顶部拦截器（通话主旨输入、回复语言强制 Spinner）。
  3. 包含中央对话监控面板，并在拔线挂断时提供导出日志存档按钮。
  4. 置底打断执行栏 `Whisper Input`，通过主从队列向网络层发射参数。

### 2.5 模块 E：驱动启动器 (`main.py`)
- **职责**: 实例化各组件、创建异步事件容器、缩减缓冲容量并启动 Kivy 主入口。
- **模块设计**:
  将原始的 `50 Chunk` 队列改为 `10 Chunk`，极大加快响应链上的反馈感知速率(`to_thread` 执行切换)。通过 `AppRunner` 类管控 `start_pipeline` / `stop_pipeline` 周期的任务终结，防止泄露。

## 3. uv 包管理栈
采用 `uv root` 管理。包含核心依赖：
`kivy`, `pyaudio`, `google-genai`, `pytest`, `pytest-asyncio`, `python-dotenv`

## 4. TDD 工作流示意图
1. 观察产品需求或重构架构节点。
2. 撰写前置/后置条件的 `pytest` 自动化脚本断言。
3. 执行时抛出 Red (失败)。
4. 补充满足逻辑边界条件或 SDK 更新 API 支持的实现。
5. 测试通过并达成闭环 (Green)。
