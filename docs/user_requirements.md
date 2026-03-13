# User Requirements

## 1. Product Summary

AI Phone Assistant is a realtime voice-call supervision interface.

The product is intended for a human operator who wants an AI model to conduct a phone-style conversation while the operator:

- monitors the call
- watches recognized speech
- quietly steers the AI through text
- adjusts prompt and language settings

## 2. Primary User

### Supervisor

The supervisor is the main user of this application.

The supervisor needs to:

- choose a provider
- provide API credentials
- define call purpose / system instructions
- choose target output language
- optionally choose UI language
- start and stop the live session
- monitor voice input and voice output
- read conversation transcript
- send silent steering instructions
- export the log after the session

## 3. Functional Requirements

- `FR-01`: The system must provide a browser-based supervisor UI.
- `FR-02`: The system must support Gemini and Qwen as selectable realtime providers.
- `FR-03`: The system must allow editing the main system instruction / call purpose before connection.
- `FR-04`: The system must store API keys locally in the browser for convenience.
- `FR-05`: The system must capture microphone audio and stream it to the active provider.
- `FR-06`: The system must play model audio output in realtime.
- `FR-07`: The system must surface recognized user speech and recognized assistant speech in the UI.
- `FR-08`: The system must maintain a transcript timeline with user, assistant, supervisor, and system messages.
- `FR-09`: The system must allow the supervisor to send silent whisper commands during the active session.
- `FR-10`: The system must allow transcript export.
- `FR-11`: The UI must remain usable on both desktop-width and narrower screens.
- `FR-12`: The UI must adapt to system light / dark preference.
- `FR-13`: The UI must support at least Chinese, Japanese, Korean, English, French, and Spanish.

## 4. Non-Functional Requirements

- `NFR-01`: Session startup must be simple enough for a non-developer operator.
- `NFR-02`: Provider-specific complexity should be hidden behind a stable UI.
- `NFR-03`: Monitoring signals should be clear enough that the supervisor can tell whether audio is entering and leaving the system.
- `NFR-04`: The system should minimize unnecessary infrastructure and avoid requiring a dedicated backend for the core local experience.
- `NFR-05`: The app should tolerate different model output sample rates during playback.

## 5. Current Scope Boundary

Included in current scope:

- browser runtime
- realtime audio call supervision
- prompt steering
- multilingual UI
- theme adaptation

Not yet a committed product feature:

- persistent cloud-side storage
- multi-user collaboration
- heavy skill engine
- CRM integration
- call analytics backend
