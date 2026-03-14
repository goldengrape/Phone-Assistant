# AI Phone Assistant

AI Phone Assistant is a realtime voice-call supervisor app built with `Vite + React + TypeScript`.
It connects the browser directly to:

- Google Gemini Live API through the official `@google/genai` SDK
- Alibaba Qwen Realtime API through a browser WebSocket client

The app captures microphone audio with the Web Audio API, streams PCM audio to the selected model, plays model audio replies in real time, shows transcript previews, and allows the supervisor to inject silent text instructions during the call.

## Current Status

This repository is currently a frontend-first implementation.

- Runtime: browser
- UI: responsive layout, adaptive light/dark theme
- State: Zustand
- Models: Gemini and Qwen
- Input audio: 16 kHz PCM
- Output audio: streamed PCM playback with dynamic sample-rate handling
- UI languages: English, Chinese, Japanese, Korean, French, Spanish, plus follow-system mode
- Target output languages: Auto, English, Chinese, Japanese, Korean, French, Spanish
- Gemini voices: 30 selectable official voice presets

## Key Features

- Realtime voice input and output
- Supervisor whisper commands that do not get spoken aloud
- Live transcript area with user, assistant, supervisor, and system messages
- Compact voice input and voice output level monitoring cards
- API key local persistence in browser storage
- Editable system instructions / call purpose
- Separate interface-language and AI-spoken-language settings
- Sticky whisper command bar at the bottom for fast supervision
- Collapsible session-context diagnostics for Gemini
- Exportable session log
- Responsive UI for desktop and narrow screens
- Adaptive visual theme based on system color scheme

## Architecture Summary

```text
Microphone
  -> AudioCapture (Web Audio API, PCM16 @ 16 kHz)
  -> AI client adapter
     -> GeminiLiveClient (@google/genai live session)
     -> QwenLiveClient (browser WebSocket)
  -> streamed model audio
  -> AudioPlayback (Web Audio API scheduling)
  -> speaker

UI (React)
  <-> Zustand store
  <-> AI client lifecycle
  <-> transcript / whisper / settings
```

## Important Implementation Notes

### Gemini

- Uses the official `@google/genai` live session API
- Current model:
  `models/gemini-2.5-flash-native-audio-preview-12-2025`
- Requests audio output modality
- Enables input and output audio transcription
- Default voice: `Zephyr`
- Supports all 30 official prebuilt Gemini voice options through the UI

### Qwen

- Uses a browser WebSocket connection to DashScope realtime endpoint
- Sends audio with `input_audio_buffer.append`
- Sends supervisor text with `conversation.item.create`

## Local Development

### Requirements

- Node.js 18+
- A Gemini API key and/or DashScope API key

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Configuration

API keys are currently stored in browser local storage through the UI.

The settings UI distinguishes between:

- interface language used by the supervisor UI
- AI spoken language used for model output behavior

Optional environment variables are also supported by the clients:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_DASHSCOPE_API_KEY=your_qwen_api_key
```

## Main Source Layout

```text
src/
  api/
    AIClient.ts
    GeminiLiveClient.ts
    QwenLiveClient.ts
  audio/
    AudioCapture.ts
    AudioPlayback.ts
  store/
    useAppStore.ts
  i18n.ts
  App.tsx
  index.css
```

## Documentation

- `docs/architecture_and_modules.md`: current architecture and module responsibilities
- `docs/audio_and_websocket_flow.md`: audio, transcript, and realtime transport flow
- `docs/user_requirements.md`: current product-level requirements
- `docs/ADD.md`: current design rationale from an axiomatic-design perspective
- `docs/MDD.md`: current module design document
- `docs/algorithm_description.md`: implementation-level processing description
- `docs/skill_evaluation_report.md`: evaluation of whether this product should add AI skills
- `docs/skill_module_implementation.md`: current document-driven skill module implementation
- `docs/ui_design_principles.md`: UI design principles for future frontend changes

## Known Constraints

- Gemini official SDK adds noticeable frontend bundle weight compared with a raw protocol implementation
- Qwen browser authentication is still constrained by the provider's WebSocket auth model
- Actual voice quality and transcription accuracy depend on browser audio permissions, device routing, and model-side realtime behavior
