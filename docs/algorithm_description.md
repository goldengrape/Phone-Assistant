# Algorithm And Implementation Description

## 1. Current Runtime Model

The current implementation is a frontend realtime voice application.

It is not primarily the older CLI bridge architecture.

Core runtime steps:

1. gather configuration from UI and persisted store
2. create playback pipeline
3. create microphone capture pipeline
4. connect selected provider
5. stream audio input
6. receive audio and transcript events
7. update UI state continuously
8. allow silent supervisor steering during the session

## 2. Prompt Assembly

At connection time, the selected client builds a model instruction block from:

- a base realtime phone-assistant policy
- the editable call purpose
- an optional forced output language constraint

This keeps the UI editable while preserving a stable provider-facing prompt structure.

## 3. Audio Input Conversion

The browser captures audio in formats suitable for Web Audio processing, while model APIs expect PCM16 chunks.

The input path therefore:

1. captures microphone frames
2. converts / prepares them into PCM16
3. forwards chunks to the active client

The UI also receives audio activity values so the operator can see whether input audio is present.

## 4. Audio Output Conversion

Model output arrives as streamed PCM payloads.

The output path therefore:

1. decodes base64 audio payloads when required
2. converts PCM16 to `Float32Array`
3. writes the data into `AudioBuffer`
4. schedules playback against a rolling time cursor

This is the main technique used to avoid obvious clicks and gaps between chunks.

## 5. Transcript Handling

The application distinguishes two transcript usages:

- preview text for monitoring cards
- finalized transcript for the session timeline

This distinction matters because realtime APIs often emit intermediate transcript states before a turn or segment is finalized.

## 6. Provider-Specific Logic

### 6.1 Gemini

Gemini uses the official live SDK session.

Key implementation behaviors:

- connect via `GoogleGenAI().live.connect(...)`
- send microphone data with `sendRealtimeInput`
- send whisper text with `sendClientContent`
- consume:
  - input transcription
  - output transcription
  - model audio parts

### 6.2 Qwen

Qwen uses a browser WebSocket client.

Key implementation behaviors:

- send `session.update` after opening
- append microphone audio with `input_audio_buffer.append`
- create whisper text messages with `conversation.item.create`
- consume:
  - audio deltas
  - user transcript completion
  - assistant transcript completion

## 7. Playback Sample-Rate Strategy

The playback layer does not permanently assume a single output sample rate.

If a received chunk indicates a different rate than the active playback context, the playback layer rebuilds the context at the new sample rate before continuing.

This makes the output path more robust across provider differences.

## 8. Current Observability Signals

The UI currently surfaces:

- connection status
- microphone level
- speaker level
- whether input audio has been observed
- whether output audio has been observed
- latest recognized user text
- latest recognized assistant text
- session transcript timeline

These signals exist to help the supervisor distinguish:

- no mic permission
- no input activity
- no transcript recognition
- no model audio returned
- audio returned but not clearly audible
