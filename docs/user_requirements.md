# User Requirements Document (URD)

## 1. Introduction
The **Gemini Phone Assistant** is designed for scenarios where a user needs an AI intermediary to handle a voice conversation while retaining executive control over the AI's decisions. The primary metaphor is a "Phone Proxy" where the AI speaks on the phone, and the User passes notes to the AI.

## 2. User Roles

### 2.1 The Supervisor (User)
- The person operating the web application.
- **Goal**: Direct the outcome of the conversation without speaking directly to the Caller.
- **Capabilities**: Uploads files, configures settings, starts/stops connection, issues text commands.

### 2.2 The Agent (AI)
- The Gemini model instance.
- **Goal**: Execute the Supervisor's instructions while maintaining a natural, coherent voice conversation with the Caller.
- **Capabilities**: Speech-to-Speech interaction, Context retrieval from uploaded docs, Instruction following.

### 2.3 The Caller (External/Simulation)
- The entity communicating via audio input (Microphone).
- **Note**: In this single-device implementation, the User's microphone simulates the Caller's voice.

## 3. Functional Requirements

### 3.1 Session Management
- **FR-01**: The system MUST allow the User to connect and disconnect from the Gemini Live API.
- **FR-02**: The system MUST display the current connection status (Disconnected, Connecting, Connected, Error).
- **FR-03**: The system MUST handle connection errors gracefully and provide visual feedback.

### 3.2 Context Management
- **FR-04**: The User MUST be able to upload files (.txt, .md, .pdf, .epub).
- **FR-05**: The system MUST parse the text content of these files and inject them into the AI's System Instruction before the session starts.
- **FR-06**: The User MUST be able to remove uploaded files.

### 3.3 Audio Handling
- **FR-07**: The system MUST stream audio from the User's microphone to the AI (Input).
- **FR-08**: The system MUST play back audio received from the AI (Output).
- **FR-09**: The system MUST visualize audio activity (Volume/Waveform) to indicate liveness.
- **FR-10**: The User MUST be able to toggle the microphone (Mute/Unmute).

### 3.4 Live Direction (The "Whisper" Feature)
- **FR-11**: The User MUST be able to type text instructions during an active call.
- **FR-12**: The system MUST send these instructions to the AI without interrupting the current audio playback (unless the AI decides to stop).
- **FR-13**: The AI MUST interpret text input **exclusively** as behavioral commands, not as conversational text to be read aloud.

### 3.5 Configuration
- **FR-14**: The User MUST be able to select a Voice (Tone/Gender) from a predefined list.
- **FR-15**: The User MUST be able to select a primary Language.
- **FR-16**: The User MUST be able to view and edit the raw System Prompt to customize the Agent's persona.

## 4. Non-Functional Requirements
- **NFR-01 Latency**: Audio-to-audio response time should be minimized (target < 1s) for natural conversation.
- **NFR-02 Reliability**: Audio playback must be gapless.
- **NFR-03 Privacy**: API Keys must be handled securely (via environment variables).
