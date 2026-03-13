# Module Design Document

## 1. Scope

This document describes the current module boundaries of the frontend application.

## 2. Module Map

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

## 3. Module Responsibilities

### 3.1 `App.tsx`

Role:

- application shell
- session lifecycle coordinator
- UI event handling
- transcript rendering
- localized label selection

Main responsibilities:

- initialize audio capture and playback
- instantiate the selected model client
- handle connect / stop flow
- update transcript and preview states
- submit whisper instructions
- export logs

### 3.2 `useAppStore.ts`

Role:

- persistent global configuration and transcript state

Stored values:

- selected provider
- target language
- UI language
- call purpose
- Gemini key
- Qwen key
- connection state
- transcript messages

### 3.3 `i18n.ts`

Role:

- define translation schema
- expose supported locales
- map interface labels and status strings
- resolve `auto` locale from browser language

### 3.4 `AIClient.ts`

Role:

- abstract provider-specific realtime communication

Core contract:

- `connect(): Promise<void>`
- `disconnect(): void`
- `sendAudio(pcm16: Int16Array): void`
- `sendWhisper(text: string): void`

Callbacks:

- `onAudioData`
- `onTranscriptPreview`
- `onTranscript`
- `onStateChange`

### 3.5 `GeminiLiveClient.ts`

Role:

- implement the Gemini provider adapter

Key behaviors:

- create a live session through `@google/genai`
- assemble system instructions from base rules, call purpose, and target language
- send mic audio through `sendRealtimeInput`
- send whisper text through `sendClientContent`
- handle input transcript, output transcript, and streamed audio parts

### 3.6 `QwenLiveClient.ts`

Role:

- implement the Qwen provider adapter

Key behaviors:

- open browser WebSocket session
- send `session.update` on connection
- stream audio with `input_audio_buffer.append`
- inject whisper text with `conversation.item.create`
- handle transcript and audio delta events

### 3.7 `AudioCapture.ts`

Role:

- microphone acquisition and PCM chunk emission

Expected outputs:

- PCM16 audio chunks
- level meter updates
- speech-detection signal

### 3.8 `AudioPlayback.ts`

Role:

- streamed audio rendering

Key behaviors:

- ensure browser audio context is running
- convert PCM16 to float buffers
- schedule buffers continuously
- rebuild playback context if sample rate changes

### 3.9 `index.css`

Role:

- provide theme tokens and global responsive styling

Current design capabilities:

- system-adaptive light / dark mode
- gradient background and layered surface styling
- consistent inputs, cards, and footer controls

## 4. Current Module Interactions

- `App.tsx` is the only place that orchestrates end-to-end session lifecycle
- provider adapters do not directly manipulate UI
- audio modules do not know which provider is active
- the store does not know about Web Audio internals
- localization data stays in the translation layer

## 5. Extension Guidance

Future additions should preserve the current separation:

- add new providers behind `AIClient`
- add new UI locales inside `i18n.ts`
- add prompt presets or skills as configuration data, not transport logic
- keep heavy provider protocol logic out of `App.tsx`
