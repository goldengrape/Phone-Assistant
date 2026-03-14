# Skill Module Implementation

## 1. Current Direction

The project now implements AI skills as a lightweight, document-driven layer.

This matches the earlier evaluation and planning documents:

- keep skills lightweight
- keep them above prompt assembly
- avoid adding a heavy runtime skill engine

## 2. Source Of Truth

The source of truth for each built-in skill is a dedicated folder under the project-level `skills/` directory:

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

Each skill uses the standard agent-skill pattern:

- folder per skill
- required `SKILL.md`
- YAML frontmatter with `name` and `description`
- concise markdown body with structured sections

## 3. Runtime Flow

The frontend does not hardcode skill behavior text in the UI anymore.

Instead it uses this flow:

1. Load `skills/<id>/SKILL.md` as raw markdown at build time
2. Parse the skill document into a runtime `SkillProfile`
3. Build a final `sessionInstruction`
4. Pass the final instruction into the realtime provider client

Main implementation files:

- `src/skills/parseSkillDocument.ts`
- `src/skills/registry.ts`
- `src/lib/buildSessionInstruction.ts`
- `src/store/useAppStore.ts`
- `src/App.tsx`
- `src/api/AIClient.ts`

## 4. Current UI And State

The app currently supports:

- single active skill selection
- local persistence of `selectedSkillId`
- a compact skill preview in the prompt area
- continued use of editable `callPurpose`

The runtime instruction order is:

1. base realtime phone policy
2. selected skill profile
3. editable `callPurpose`
4. output language constraint

## 5. First-Wave Skills

The current built-in skills are:

- Negotiation
- Sales Follow-up
- Customer Support / De-escalation
- Information Collection
- Scheduling / Rescheduling

These are intentionally concise so the system stays compatible with realtime latency and prompt-size constraints.

## 6. Test Coverage

The codebase currently includes tests for:

- skill document parsing
- skill registry loading
- session instruction building
- App integration with selected skill
- Gemini provider handling of `sessionInstruction`

This keeps the skill system grounded in documents while still providing automated regression protection.
