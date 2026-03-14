# Skill 模块实现说明

## 1. 当前实现方向

项目目前已将 AI skill 实现为一层轻量、文档驱动的能力层。

这与前面的评估和方案文档保持一致：

- skill 保持轻量
- skill 位于 prompt 组装层之上
- 不引入重型 runtime skill engine

## 2. 源数据形式

每个内置 skill 的源数据都位于项目根目录下的 `skills/` 目录中，每个 skill 使用单独子目录：

```text
skills/
  negotiation/
    SKILL.md
  sales-follow-up/
    SKILL.md
  de-escalation/
    SKILL.md
  information-collection/
    SKILL.md
  scheduling/
    SKILL.md
```

每个 skill 都遵循标准 agent skill 结构：

- 一个 skill 对应一个目录
- 必须包含 `SKILL.md`
- `SKILL.md` 顶部使用 YAML frontmatter，包含 `name` 与 `description`
- 主体使用简洁 markdown，按统一章节组织内容

## 3. 运行时流程

前端不再把 skill 行为文本硬编码在 UI 常量中。

当前实现流程是：

1. 在构建时把 `skills/<id>/SKILL.md` 作为原始 markdown 读入
2. 将 skill 文档解析为运行时 `SkillProfile`
3. 生成最终 `sessionInstruction`
4. 将最终 instruction 传入 realtime provider client

主要实现文件：

- `src/skills/parseSkillDocument.ts`
- `src/skills/registry.ts`
- `src/lib/buildSessionInstruction.ts`
- `src/store/useAppStore.ts`
- `src/App.tsx`
- `src/api/AIClient.ts`

## 4. 当前 UI 与状态

当前版本已经支持：

- 单 skill 选择
- `selectedSkillId` 本地持久化
- prompt 区域内的 skill 摘要预览
- 保留可编辑的 `callPurpose`

当前最终 instruction 的组装顺序为：

1. 基础 realtime 电话策略
2. 当前选中的 skill profile
3. 可编辑 `callPurpose`
4. 输出语言约束

## 5. 第一批内置 Skills

当前内置的第一批 skill 包括：

- Negotiation
- Sales Follow-up
- Customer Support / De-escalation
- Information Collection
- Scheduling / Rescheduling

这些内容刻意保持简洁，以适应实时语音场景对延迟与 prompt 长度的约束。

## 6. 当前测试覆盖

当前代码已经覆盖以下测试面：

- skill 文档解析
- skill registry 加载
- session instruction 组装
- App 中 skill 选择到 provider 的接线
- Gemini provider 对 `sessionInstruction` 的处理

这样既保证了“文档是源数据”，也为后续扩展 skill 留下了自动化回归保护。
