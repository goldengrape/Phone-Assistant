# Axiomatic Design Notes

## 1. Design Intent

This document describes the current web implementation from an axiomatic-design perspective.

The key product goal is:

- enable a human supervisor to control and monitor an AI-led realtime phone conversation with low operational friction

## 2. Top-Level Functional Requirement

- `FR0`: Provide a realtime voice-call supervision interface that can listen, speak, monitor, and silently steer an AI phone assistant.

- `DP0`: A browser-based React application with local audio I/O, provider adapters, transcript monitoring, and editable prompt control.

## 3. Main Functional Decomposition

- `FR1`: Allow the supervisor to configure model, API key, prompt goal, interface language, and target output language.
  - `DP1`: Settings and prompt panels backed by Zustand and local storage persistence.

- `FR2`: Stream microphone audio to the active provider in realtime.
  - `DP2`: `AudioCapture` plus provider-specific audio input methods.

- `FR3`: Play returned model audio with sufficiently smooth realtime playback.
  - `DP3`: `AudioPlayback` with PCM conversion and scheduled chunk playback.

- `FR4`: Let the supervisor observe call state and recognized speech.
  - `DP4`: transcript timeline, input/output status cards, transcript preview callbacks, and system messages.

- `FR5`: Let the supervisor silently redirect the model during the call.
  - `DP5`: whisper command input mapped to provider-specific text injection.

- `FR6`: Support multiple providers without forcing provider logic into the UI layer.
  - `DP6`: `AIClient` abstraction with `GeminiLiveClient` and `QwenLiveClient`.

- `FR7`: Keep the product usable across different viewing contexts and user locales.
  - `DP7`: responsive CSS layout, adaptive theme tokens, and localized UI strings.

## 4. Independence Considerations

The current design is not perfectly uncoupled, but the core requirements are reasonably separated:

- UI configuration is mostly isolated from transport logic
- audio capture is isolated from provider transport details
- playback is isolated from transcript logic
- provider differences are concentrated in adapter classes
- localization is separated from view logic through a translation layer

The strongest coupling that remains is expected and acceptable:

- realtime connection state affects both UI controls and audio lifecycle
- prompt construction depends on both provider connection setup and user configuration

## 5. Information Minimization

The current implementation follows a lighter-weight architecture than earlier concepts:

- no mandatory backend service
- no desktop bridge requirement
- no Python runtime in the active frontend path
- no heavy orchestration layer between UI and provider

This lowers deployment and debugging complexity, which aligns with the information axiom.

## 6. Current Design Tradeoff

One deliberate exception to strict minimalism is the Gemini integration:

- the project now uses the official `@google/genai` SDK instead of a hand-maintained low-level protocol client

This increases bundle weight, but it reduces protocol drift risk and improves alignment with the provider's supported realtime interface.

## 7. Implication For Future Skill Design

If the product later adds `AI skill` support, that should preserve the same design principle:

- do not introduce a heavy skill engine unless it unlocks clear value
- prefer a thin, structured skill profile layer that composes cleanly with the existing prompt system
