# User Requirements Document (URD) - Phone Link Edition

## 1. Introduction
The **Gemini Phone Assistant** is a solution for delegating phone call interactions to an AI while maintaining supervisor control. It uses virtual audio routing to bridge **Windows Phone Link** with the **Google Gemini Live API**.

## 2. User Roles

### 2.1 The Supervisor (User)
- **Goal**: Direct the AI's conversation with the Caller.
- **Capabilities**: Configures audio routing, issues text commands via CLI, monitors call status.

### 2.2 The Agent (AI)
- **Goal**: Handle vocal interactions with the Phone Caller based on the Supervisor's instructions.
- **Capabilities**: Low-latency voice interaction, real-time command processing.

### 2.3 The Caller
- The person on the other end of the phone call, connected via Windows Phone Link.

## 3. Functional Requirements

### 3.1 Audio Routing & Bridging
- **FR-01**: The system MUST detect and utilize **VB-Audio Virtual Cable** devices.
- **FR-02**: The system MUST capture audio from `CABLE Output` (the Caller's voice) and stream it to Gemini.
- **FR-03**: The system MUST route AI-generated audio to `CABLE Input` (the Agent's voice to be heard by the Caller).
- **FR-04**: The system MUST support an optional "Monitor" output to local speakers so the Supervisor can hear the conversation.

### 3.2 Session Management (CLI)
- **FR-05**: The system MUST provide an interactive CLI to start/stop call handling.
- **FR-06**: The system MUST validate API credentials and audio device availability on startup.
- **FR-07**: The system MUST reconnect to the Live API automatically or allow manual restart upon failure.

### 3.3 Live Direction (The "Whisper" Feature)
- **FR-08**: The Supervisor MUST be able to send text commands during an active call.
- **FR-09**: The AI MUST interpret these commands as behavioral changes without reading the command text aloud.

### 3.4 persona & Configuration
- **FR-10**: The system MUST support customization of the AI's voice (e.g., Zephyr, Puck).
- **FR-11**: The system MUST support custom system instructions (prompts) to define the Agent's role.

## 4. Non-Functional Requirements
- **NFR-01 Latency**: Minimizing round-trip latency to maintain human-like conversation Flow.
- **NFR-02 Precision**: 16-bit 16kHz PCM audio handling for optimal Gemini performance.
- **NFR-03 Stability**: The bridge process must handle long-duration calls without audio buffer overflow.
