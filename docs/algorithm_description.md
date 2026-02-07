# Algorithm & Implementation Description

## 1. System Architecture
The application is a client-side React SPA (Single Page Application) that connects directly to the Google Gemini Live API via WebSockets. No intermediate backend server handles the media stream.

**Data Flow**:
`Microphone` -> `AudioContext` -> `Gemini SDK (WebSocket)` -> `AudioContext` -> `Speakers`

## 2. Audio Processing Pipeline

### 2.1 Input (Microphone to API)
- **Capture**: Uses `navigator.mediaDevices.getUserMedia({ audio: true })`.
- **Sampling**: Audio is captured at the hardware sample rate but downsampled/processed contextually. The `ScriptProcessorNode` (buffer size 4096) intercepts raw PCM data.
- **Format Conversion**: 
  - Raw `Float32Array` data from the Web Audio API is converted to a 16-bit PCM format (Little Endian).
  - Values are clamped between -1.0 and 1.0, then scaled to Int16 range (-32768 to 32767).
- **Transmission**: 
  - The PCM data is base64 encoded.
  - Sent via `session.sendRealtimeInput` as a chunk with mimeType `audio/pcm;rate=16000`.

### 2.2 Output (API to Speakers)
- **Reception**: The `onmessage` callback receives `LiveServerMessage` objects.
- **Buffering Strategy (Gapless Playback)**:
  - The system maintains a `nextStartTimeRef` pointer.
  - When a new audio chunk arrives, it is decoded into an `AudioBuffer` using `decodeAudioData`.
  - The playback start time is calculated as `Math.max(audioContext.currentTime, nextStartTimeRef.current)`.
  - `nextStartTimeRef` is incremented by the duration of the chunk.
  - This ensures that if chunks arrive faster than playback, they are queued sequentially. If they arrive slower, playback resumes immediately upon arrival.
- **Interruption**: If `message.serverContent.interrupted` is true, all currently scheduled `AudioBufferSourceNode`s are stopped immediately, and the `nextStartTimeRef` is reset.

## 3. Multimodal Interaction Logic

### 3.1 The "Proxy" Pattern (System Prompt)
To achieve the requirement where the AI talks to the Caller but obeys the Supervisor, we employ a specific Prompt Engineering strategy in `getDefaultInstruction`:

1.  **Role Definition**: "You are an AI Phone Assistant acting as a proxy."
2.  **Input Segregation**:
    - **Audio Modality**: Explicitly defined as "The Caller". The AI must respond to this naturally.
    - **Text Modality**: Explicitly defined as "System Commands". The AI is instructed **never** to read this text aloud, but to treat it as a meta-instruction to modify its next audio response.

### 3.2 Text Injection
Unlike standard chat apps where text is part of the conversation history, here text is a control signal.
- **Method**: We use `session.sendRealtimeInput`.
- **Payload**:
  ```javascript
  {
    media: {
      mimeType: "text/plain",
      data: btoa("[SYSTEM_COMMAND]: " + userText)
    }
  }
  ```
- **Why**: Sending it as a media chunk allows it to be injected into the live session context immediately without disrupting the audio input stream logic.

## 4. Document Parsing Algorithm

File content is extracted client-side to ensure privacy and speed.

- **Strategy**: 
  - Files are parsed into raw text strings.
  - These strings are appended to the `systemInstruction` configuration **before** the connection is established.
  - **Limitation**: Context cannot be updated mid-call; a disconnect/reconnect is required to change documents.

### 4.1 Parsers
- **PDF**: Uses `pdf.js` to iterate through pages and extract text items from the rendering layer.
- **EPUB**: Uses `jszip` to unzip the container, finds `.html/.xhtml` files, and strips HTML tags using `DOMParser`.
- **Text/MD**: Reads directly via `FileReader`.

## 5. State Management
- **ConnectionStatus**: Tracks the WebSocket state (`disconnected` -> `connecting` -> `connected`).
- **Refs**: heavily used for AudioContexts and WebSocket sessions to avoid React closure staleness during high-frequency audio processing callbacks (`onaudioprocess`).
