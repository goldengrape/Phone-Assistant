# Skill 模块方案计划

## 1. 背景

根据 `docs/skill_evaluation_report.md` 与 `docs/skill_evaluation_report.zh.md` 的结论，项目适合增加 `AI skill` 能力，但当前阶段不应引入重型 skill engine，而应采用轻量的 skill preset / profile 方案。

该结论与当前产品形态一致：

- 当前产品是实时语音通话助手，不是低频聊天代理
- 延迟、提示词长度、语音自然度比通用聊天场景更敏感
- 现有系统已经具备基础控制面：`callPurpose`、目标语言、会中 whisper 指令

因此第一版 skill 的目标不是增加复杂编排，而是在现有 prompt 体系上增加一层可复用、可组合、低成本的配置层。

## 2. 目标

第一版 skill 模块只解决以下问题：

- 复用高频电话场景中的成熟策略
- 提高模型表现的一致性和可预测性
- 降低新用户编写 `callPurpose` 的门槛
- 为后续场景评估和迭代提供统一命名入口

第一版不解决以下问题：

- RAG 检索式 skill
- 多 skill 自动规划
- 复杂规则引擎
- 外部 skill 市场或远程导入
- 针对不同模型的复杂分支调优系统

## 3. 核心设计原则

- `skill` 只是一层轻量配置，不是独立运行时
- `skill` 应位于 prompt 组装链路上层，不进入音频、播放、传输协议逻辑
- `skill` 文本必须短小、明确、语音友好
- `skill` 必须可以与 `callPurpose`、目标语言、whisper 自然组合
- 第一版只支持单 skill 选择，不支持多 skill 叠加

## 4. 模块定位

从当前代码结构看，skill 的最佳落点应在“配置与 prompt 组装层”，而不是 provider 或音频层。

建议遵循以下边界：

- `App.tsx` 继续作为会话编排入口
- `store` 持有 skill 选择状态
- 新增 `skill registry` 管理内置 skill 数据
- 新增 `instruction builder` 统一组装最终 session instruction
- `GeminiLiveClient` 与 `QwenLiveClient` 不再各自拼装 skill 片段，只消费组装后的最终指令

不应将 skill 放入以下区域：

- `audio/`
- 播放逻辑
- WebSocket 或 provider transport 协议适配逻辑

## 5. 推荐目录结构

建议新增如下结构：

```text
src/
  skills/
    types.ts
    registry.ts
    builtins/
      negotiation.ts
      salesFollowUp.ts
      deEscalation.ts
      informationCollection.ts
      scheduling.ts
  lib/
    buildSessionInstruction.ts
```

说明：

- `skills/types.ts`：定义 skill 数据结构
- `skills/registry.ts`：聚合内置 skill 列表
- `skills/builtins/*`：维护每个内置 skill 的内容
- `lib/buildSessionInstruction.ts`：统一生成最终 provider instructions

## 6. 数据模型设计

第一版 skill 定义建议保持固定结构，不做动态脚本化：

```ts
export interface SkillProfile {
  id: string;
  name: string;
  description: string;
  objective: string;
  tone: string;
  forbiddenBehaviors: string[];
  strategies: string[];
  openingStyle: string;
  closingStyle: string;
  recommendedCallPurposeHint?: string;
}
```

字段约束建议：

- `forbiddenBehaviors` 控制不该出现的表达方式
- `strategies` 控制 3 到 5 条操作策略
- `openingStyle` 和 `closingStyle` 保持简短，强调口语自然度
- 不加入条件分支脚本、变量模板、嵌套规则树

## 7. Prompt 组装方案

建议新增统一的 `buildSessionInstruction()`，把当前分散在 provider 内的字符串拼接抽离出来。

推荐组装顺序如下：

1. 基础 realtime phone policy
2. skill profile 片段
3. 用户填写的 `callPurpose`
4. 目标语言约束

这样可以明确优先级：

- 基础实时通话规则始终存在
- skill 提供场景化默认策略
- `callPurpose` 负责当前任务细化
- 目标语言约束作为输出硬约束
- whisper 继续作为会话中的高时效指令覆盖层

建议 skill 输出为紧凑文本，例如：

- `SKILL OBJECTIVE`
- `SKILL TONE`
- `FORBIDDEN BEHAVIORS`
- `OPERATING STRATEGIES`
- `OPENING STYLE`
- `CLOSING STYLE`

## 8. Store 改造计划

建议在 `src/store/useAppStore.ts` 中新增以下状态：

- `selectedSkillId: string`
- `setSelectedSkillId: (id: string) => void`

持久化策略建议与 `callPurpose` 保持一致：

- 使用 `localStorage`
- 默认值为空字符串或 `none`
- skill 选择在断开连接状态下可编辑

第一版暂不建议加入：

- 自定义 skill 编辑器
- 每个 skill 的局部参数覆盖
- 多 skill 组合状态

## 9. UI 改造计划

建议在现有 “System Instructions / Call Purpose” 区块附近增加 skill 入口，而不是新增复杂页面。

推荐 UI 组件：

- skill 下拉选择器
- skill 简介
- 适用场景说明
- 当前 skill 的摘要预览

交互原则：

- skill 只允许单选
- 保留手写 `callPurpose`
- 明确告诉用户：skill 是辅助 preset，不会屏蔽 whisper
- 已连接状态下延续当前限制，避免会话中途修改基础 instruction 带来不一致

## 10. 第一批内置 Skill

建议按评估报告优先落地以下 5 个：

- `Negotiation`
- `Sales Follow-up`
- `Customer Support / De-escalation`
- `Information Collection`
- `Scheduling / Rescheduling`

原因：

- 都是高频电话场景
- 策略边界相对清晰
- 容易写成简洁 prompt preset
- 更容易观察是否提升开场质量、收尾效率和话术稳定性

## 11. Provider 集成策略

当前 `GeminiLiveClient` 和 `QwenLiveClient` 内部都直接拼装 `callPurpose` 与语言约束。

建议改造方向：

- 将基础 prompt 与 skill prompt 的组装上移到共享 builder
- provider 只接收 `finalInstruction`
- provider 保留各自协议和连接差异，不再关心 skill 内容

这样可以减少：

- 重复拼接逻辑
- Gemini / Qwen 之间的提示词漂移
- 后续修改 skill 时需要双端同步的问题

## 12. 实施阶段

### Phase 1：最小闭环

目标：尽快验证 skill preset 是否有产品价值。

交付内容：

- 抽出统一 instruction builder
- 新增 `skills/` 目录和内置 skill registry
- store 支持 skill 选择与本地持久化
- UI 增加单 skill 选择入口
- provider 改为使用统一 `finalInstruction`

验收标准：

- 能稳定选择 skill 并进入会话
- 不明显增加连接时延
- 最终 instruction 长度可控
- 不影响现有音频链路和 whisper 能力

### Phase 2：轻量评估增强

前提：Phase 1 上线后确认 skill 使用频率和体验正向。

交付内容：

- skill 文本长度预算与提示
- 使用埋点或日志统计
- 对比不同 skill 的使用频率和会话结果
- 补充更多 UI 文案和国际化展示

### Phase 3：谨慎扩展

仅在前两阶段被证明有效时考虑：

- skill 参数化
- 用户自定义 skill
- skill 导入能力
- 面向不同场景的模板市场

仍不建议过早引入：

- RAG skill 检索
- 多 skill 自动规划链
- 重型规则引擎

## 13. 风险与控制措施

### 13.1 Prompt 过长

风险：

- 增加首轮成本
- 提高实时延迟

控制：

- skill 文本保持固定短结构
- 每个 skill 严格限制条目数
- 后续加入 token estimate 提示

### 13.2 指令冲突

风险：

- skill 与 `callPurpose` 冲突
- skill 与语言约束冲突
- skill 与 whisper 短期指令冲突

控制：

- 固定 instruction 拼装顺序
- skill 内容避免写死具体任务目标
- 把 skill 定位为行为框架，不替代当前 call goal

### 13.3 语音表达不自然

风险：

- 过度脚本化
- 话术生硬
- 情绪不合适

控制：

- skill 文案以口语化、自然对话为目标
- 明确 forbidden behaviors
- 首批 skill 优先选择边界清晰、自然度较高的场景

### 13.4 维护面扩大

风险：

- 新增 preset 后维护成本持续上升

控制：

- 第一版只做 5 个内置 skill
- 不引入参数化编辑器
- 不做多 skill 组合

## 14. 建议的审核结论

建议本项目按以下口径推进：

- 同意增加 `skill` 模块
- 第一版限定为轻量 preset/profile
- 第一版只支持单 skill
- 第一版只做内置 skill，不做用户自定义 skill
- provider 改为统一消费 `finalInstruction`
- skill 作为 prompt 配置层实现，不进入 transport 和 audio 层

## 15. 下一步实施建议

如果本方案通过审核，建议按以下顺序进入开发：

1. 先抽离 `buildSessionInstruction()`
2. 再补齐 `SkillProfile` 与内置 registry
3. 然后改 store 与 UI
4. 最后接入 Gemini / Qwen provider
5. 补充基础验证与回归检查

这样可以先稳定模块边界，再逐步接入界面和 provider，降低回归风险。
