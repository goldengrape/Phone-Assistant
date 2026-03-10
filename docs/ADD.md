# 公理设计分析文档 (Axiomatic Design Document - ADD)

## 1. 设计哲学原则
根据 **奥卡姆剃刀 (Occam's Razor)**，我们只引入刚好能满足需求的层级。根据 **独立性公理(Axiom 1)**，每个 Functional Requirement (FR) 必须有独立的 Design Parameter (DP)。根据 **信息公理(Axiom 2)**，如果存在多个可行解，选择信息量（复杂度）最小的一个。

## 2. 顶层设计 (Top-Level Design)
- **FR0**: 利用 Mac Kivy 界面与 Gemini 多模态原生 SDK 桥连实时电话语境任务。
- **DP0**: 一个基于 `Kivy` 事件循环（集成 `asyncio`）和纯函数处理逻辑的轻量化中继器模块总线。

## 3. 核心分解与矩阵 (Decomposition)

- **FR1**: 界面展示及交互采集 (含高级语境传参、日志导出和全局中文字体支持)。
  - **DP1**: Kivy GUI 层中的状态绑定(State Bindings)、日志只读 TextInput 视图与配置收集器 (Spinner, TextInput)。
- **FR2**: 网络会话与多模态流交换及 V2 体验控制。
  - **DP2**: 独立挂载于 asyncio 循环的 SDK 会话 (`genai.Client.aio.live`)，具备高度可定制性的 `LiveConnectConfig` 以接收动态的主旨目的与语言限定。
- **FR3**: 本地原生音频硬件采集与低延迟播放。
  - **DP3**: 基于 24kHz 原生采样率和微小缓冲容量 (Queue maxsize=10) 的无状态音频回调系统，完全解绕对复杂虚拟录音栈的绑定。
- **FR4**: 业务逻辑与数据流转换。
  - **DP4**: 实现为纯函数的无状态数据处理管道（FP）。

### 设计矩阵验证
\[
\begin{bmatrix}
FR1 \\ FR2 \\ FR3 \\ FR4
\end{bmatrix}
=
\begin{bmatrix}
X & 0 & 0 & 0 \\
0 & X & 0 & X \\
0 & 0 & X & 0 \\
0 & X & X & X
\end{bmatrix}
\begin{bmatrix}
DP1 \\ DP2 \\ DP3 \\ DP4
\end{bmatrix}
\]
为了达成 FP 和 DbC 思想，DP4 (处理管道) 连接 DP2(网络) 与 DP3(音频)，从而成为核心数据泵。DP1(界面)发送事件指令给 DP4，通过严格的契约(Contracts)验证。这是一个经典的解耦(Uncoupled/Decoupled)系统设计。

## 4. 契约式编程 (DbC) 在设计中的体现
1. **纯粹的数据结构**: 核心配置及载荷打包方法保证状态幂等。
2. **前置条件验证**:
   - 音频采集时：缓冲帧大小必须符合 `>0`。
   - 输入系统时：参数化封装严格。
3. **后置条件验证**:
   - 必须向网络管道保证回掷结构体规范符合 Gemini 要求。

## 5. 函数式编程 (FP) 应用
所有复杂的业务规则（如何合并系统 Prompt、如何打包干预文本）均抽取为无副作用的 Pure Functions。比如：
`build_audio_message(pcm_bytes) -> dict` 和 `build_intervention_message(text: str) -> str`
此机制易于进行 **TDD** 隔离测试。网络发送动作剥离到外围函数的副作用中执行。由于转用官方 `genai` SDK，我们只需组装上行结构并处理下行的模型响应帧。
