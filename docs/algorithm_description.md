# Algorithm & Implementation Description - CLI Bridge

## 1. System Architecture
The application is a Node.js CLI process that acts as a real-time bridge between **Windows Phone Link** (via VB-Audio Virtual Cable) and the **Google Gemini Live API**.

**Data Flow**:
`Phone Call (In)` -> `CABLE Output (VB-Cable)` -> `Node.js (naudiodon)` -> `Gemini Live API` -> `Node.js (naudiodon)` -> `CABLE Input (VB-Cable)` -> `Phone Call (Out)`

## 2. Audio Processing Pipeline

### 2.1 Virtual Audio Routing (naudiodon)
- **Library**: Uses `naudiodon` (PortAudio bindings) for low-latency native audio I/O.
- **Input (Capture)**: 
  - Captures from the VB-Cable device marked "CABLE Output". 
  - Format: 16-bit PCM, Mono, 16000Hz (Native Gemini input requirement).
- **Output (Playback)**: 
  - Writes to the VB-Cable device marked "CABLE Input".
  - Format: 16-bit PCM, Mono, 24000Hz (Native Gemini output response).

### 2.2 Input Pipeline (Bridge to API)
- **Buffering**: Raw PCM chunks are emitted by `naudiodon` as Node.js `Buffer` objects.
- **Transmission**: 
  - Buffers are base64 encoded.
  - Sent via the WebSocket session using `session.sendRealtimeInput`.
  - MIME type: `audio/pcm;rate=16000`.

### 2.3 Output Pipeline (API to Phone)
- **Reception**: The bridge receives binary PCM chunks from the Gemini API.
- **Direct Pipelining**: Unlike a browser-based implementation, the Node.js bridge pipes the PCM stream directly to the `naudiodon` output stream for minimal latency.
- **Interruption Logic**: When Gemini emits an `interrupted` event, the output buffer is flushed to immediately stop AI speech.

## 3. Multimodal Control Logic

### 3.1 Supervisor Instructions
- **Modality Segregation**: 
  - Audio modality is treated as the conversation with the **Caller**.
  - Text modality is treated as **System Commands** from the **Supervisor**.
- **Implementation**: Text commands are wrapped in a `[SYSTEM_COMMAND]` prefix and sent as `text/plain` media chunks via the Live API session. This enables real-time behavior adjustment without interrupting the audio stream context.

## 4. Hardware Configuration Requirement

For the bridge to work, Windows must be configured to isolate application audio:
1. **Phone Link** must output to `CABLE Input`.
2. **Phone Link** must input (mic) from `CABLE Output`.
3. The Node.js bridge performs the "Inverse" operation: reading from `Output` and writing to `Input`.

## 5. Security & Stability
- **Environment Variables**: API keys are isolated in a `.env` file within the `cli/` directory.
- **Lazy Loading**: Native modules like `naudiodon` are lazy-loaded to ensure fast startup and easier debugging of environment-related load errors.
