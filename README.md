# Gemini Phone Assistant (Live DocTalk)

A real-time AI voice agent designed to act as a proxy in phone conversations. This application allows a user ("Supervisor") to guide the AI ("Agent") via text commands while the AI converses vocally with a third party ("Caller").

The application leverages the **Google Gemini Live API** (via `@google/genai`) for low-latency multimodal interaction.

## Features

- **Real-time Voice Conversation**: Low-latency full-duplex audio streaming using WebSockets.
- **Stealth Supervision**: Send text instructions to the AI during the call. The AI processes these as system commands to adjust its behavior/tone immediately without reading the text aloud to the caller.
- **Document Context**: Upload PDF, EPUB, TXT, or Markdown files. The AI ingests these documents into its system context to answer questions or reference specific information during the call.
- **Audio Visualization**: Real-time waveform visualization distinguishing between User (Microphone) and AI (Playback) activity.
- **Customizable Persona**: Change voice, language, and the core System Instruction (prompt) on the fly.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS.
- **AI SDK**: `@google/genai` (Gemini 2.5/3.0 models).
- **Audio**: Native Web Audio API (`AudioContext`, `ScriptProcessorNode`) for PCM streaming and buffering.
- **File Parsing**: `pdf.js` for PDFs, `jszip` for EPUBs.

## Setup

1. **Environment Variables**:
   Ensure you have a valid Google GenAI API Key.
   Create a `.env` file (or configure your deployment environment):
   ```
   API_KEY=your_google_api_key_here
   ```

2. **Installation**:
   ```bash
   npm install
   ```

3. **Run**:
   ```bash
   npm start
   ```

## Usage Guide

1. **Upload Context**: Before connecting, upload any relevant documents (e.g., a price list, a resume, or a policy document) using the upload panel on the left.
2. **Configure**: Select the desired language and voice. You can also edit the "System Instructions" to give the AI a specific role (e.g., "Negotiator", "Tech Support").
3. **Connect**: Click "Start Call". Grant microphone permissions.
4. **Interact**:
   - **Speak**: Your microphone input is treated as the "Caller".
   - **Type**: Use the bottom input bar to send "System Commands" (e.g., "Be more polite", "Offer a 10% discount", "Wrap up the call").
5. **Disconnect**: Click the Stop button to end the session and close the WebSocket connection.

## License

MIT
