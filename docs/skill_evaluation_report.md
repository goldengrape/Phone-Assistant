# Skill Evaluation Report

## 1. Question

Should AI Phone Assistant add an `AI skill` layer?

In this context, a skill means a reusable behavior package that helps the model act consistently in a specific call scenario, for example:

- negotiation
- customer support
- lead qualification
- scheduling
- escalation handling

## 2. Current Product Context

The current product is a realtime voice supervision tool, not a slow-turn chat agent.

That changes the tradeoff substantially:

- latency matters
- prompt size matters
- tone consistency matters more in speech than in text
- conflicting instructions are easier to notice in spoken output

The product already has one lightweight control surface:

- editable system instruction / call purpose

So the real question is not whether the system can accept more prompt logic. It can.
The real question is what form of skill system best fits a realtime voice product.

## 3. Benefits Of Adding Skills

### 3.1 Better Reuse

Many phone scenarios are repetitive. A skill can package the best-known strategy once and let the operator reuse it.

Examples:

- price negotiation
- appointment rescheduling
- customer calming
- information collection
- follow-up sales calls

### 3.2 More Stable Output

Without skills, the operator may rewrite the call-purpose prompt every time.

That leads to:

- inconsistent wording
- uneven quality
- higher setup effort before each call

A well-designed skill preset can make model behavior more predictable.

### 3.3 Better Onboarding

New users often do not know how to write effective prompt instructions for a live phone scenario.

Skills can reduce that burden by giving them a starting point.

### 3.4 Easier Evaluation

If the product uses named skill presets, it becomes easier to compare results and iterate:

- which opening works better
- which negotiation style is too aggressive
- which multilingual framing produces cleaner calls

## 4. Risks Of Adding Skills

### 4.1 Realtime Cost

A heavy skill system usually increases prompt length and orchestration complexity.

In a realtime voice app, that can hurt:

- startup speed
- response latency
- token cost
- stability

### 4.2 Instruction Conflict

The app already has multiple steering layers:

- base realtime phone policy
- editable call purpose
- target language constraint
- supervisor whisper during the session

If a skill layer becomes too strong, it can conflict with:

- the active call goal
- the target language rule
- last-second supervisor whisper instructions

### 4.3 Maintenance Overhead

A heavy skill framework is not just prompt text.

It tends to require:

- versioning
- testing
- per-language tuning
- per-model tuning
- UI management

That is a lot of surface area for a product that is still stabilizing its realtime audio path.

### 4.4 Voice-Mode Failure Mode

What sounds acceptable in chat can sound unnatural in speech.

A negotiation skill that is too explicit or manipulative may sound:

- robotic
- over-scripted
- emotionally off
- suspicious in live conversation

## 5. Assessment

The project should probably add skills, but not as a heavy framework right now.

Best-fit conclusion:

- `yes` to lightweight skill presets
- `no` to a heavy skill engine for the current phase

## 6. Recommended Product Direction

### Phase 1: Lightweight Skill Profiles

Implement skills as structured prompt presets layered on top of the current system instruction.

Each skill should stay small and explicit, for example:

- objective
- tone
- forbidden behaviors
- 3 to 5 operating strategies
- opening style
- closing style

This fits the current architecture well because it can compose with:

- `callPurpose`
- target language
- whisper commands

### Phase 2: Measured Expansion

Only after the base skill presets prove useful should the product consider:

- skill parameterization
- per-skill evaluation metrics
- imported skill library
- call-type templates

### Phase 3: Avoid Premature Heavy Systems

Do not start with:

- RAG-backed skill retrieval
- multi-skill planning chains
- complex tool graphs
- a large rules engine

Those approaches are powerful, but they are too heavy relative to the current product maturity and realtime constraints.

## 7. Recommended First Skills

If the project adds skills soon, these are the most practical first candidates:

- `Negotiation`
  - goal: improve price / terms while staying natural
- `Sales Follow-up`
  - goal: keep momentum, identify objections, move toward next step
- `Customer Support / De-escalation`
  - goal: calm the caller, gather facts, maintain trust
- `Information Collection`
  - goal: collect structured details efficiently
- `Scheduling / Rescheduling`
  - goal: confirm time windows and close the call cleanly

## 8. Architecture Fit

From the current codebase perspective, the cleanest place for skills is:

- a thin configuration layer above prompt assembly

Not inside:

- audio modules
- playback logic
- transport protocol code

That means a future implementation should likely live near:

- store configuration
- prompt composition
- UI preset selection

## 9. Final Recommendation

The project should add `AI skill` support only in a lightweight preset form for now.

That gives the product most of the practical upside:

- reuse
- consistency
- better onboarding
- easier scenario tuning

without paying the full cost of a heavy skill platform.
