# AI Phone Assistant

AI Phone Assistant is a `0.1.0` early preview built with `Vite + React + TypeScript`.
It is currently intended for `Render Static Site` style deployment.

## What It Is

- A browser-based realtime call supervisor UI
- BYOK (`bring your own key`) for `Gemini API`
- Pure frontend in the current repo; there is no required backend service
- `Qwen` code is still present as future work, but it is currently hidden in the UI

## Current Product Direction

- Recommended provider: `Gemini API`
- API keys are entered by the user in the browser UI
- Keys are stored in the user's own browser `localStorage`
- Skill instructions can be selected from sample presets or written from scratch
- Custom skill edits are stored in the user's own browser `localStorage`

## Local Development

### Requirements

- Node.js 18+
- Your own Gemini API key

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## Render Deployment

Deploy this project as a `Static Site`.

- Build command: `npm run build`
- Publish directory: `dist`

Because this is a frontend-only BYOK app, Render only serves the static files.
The app does not need a backend server for its current behavior.

## Notes

- Gemini uses the official `@google/genai` SDK from the frontend
- The current Gemini live model in the app is `models/gemini-2.5-flash-native-audio-preview-12-2025`
- This is an early preview and should be validated before real-world call workflows

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
  skills.ts
  i18n.ts
  App.tsx
  index.css
```
