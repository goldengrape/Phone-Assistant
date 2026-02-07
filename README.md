# Gemini Phone Assistant (Phone Link Edition)

A real-time AI voice agent designed to act as a proxy in phone conversations. This application integrates with **Windows Phone Link** via a **Node.js CLI Bridge** and **VB-Audio Virtual Cable** to handle phone calls directly from your PC.

The application leverages the **Google Gemini Live API** for low-latency multimodal interaction.

## Architecture

```
[ Phone ] <---> [ Windows Phone Link ]
                         |
           (VB-Cable) [ Audio Bridge ] (naudiodon)
                         |
                 [ Node.js CLI App ] <--- (WebSocket) ---> [ Gemini Live API ]
                         |
                 [ Supervisor (YOU) ]
```

## Features

- **Phone Link Integration**: Seamlessly route phone audio through the AI agent.
- **Real-time Voice Conversation**: Low-latency full-duplex audio streaming.
- **Stealth Supervision**: Send text instructions to the AI during the call via the CLI or web interface.
- **Document Context**: Feed the AI documents to reference during calls.
- **Desktop Audio Routing**: Use virtual cables to isolate phone audio from system audio.

## Prerequisites

1.  **VB-Audio Virtual Cable**: Required for routing audio between Phone Link and the Node.js bridge.
    - Download: [vb-audio.com/Cable/](https://vb-audio.com/Cable/)
2.  **Windows Phone Link**: Connected to an Android or iOS device.

## Setup

1.  **Environment Variables**:
    Create a `.env` file in the `cli/` directory:
    ```
    API_KEY=your_google_api_key_here
    ```

2.  **Installation**:
    ```bash
    cd cli
    npm install
    ```

3.  **Audio Configuration**:
    - Open **Windows Settings** -> **System** -> **Sound** -> **Volume Mixer**.
    - Set **Phone Link** Output to `CABLE Input`.
    - Set **Phone Link** Input to `CABLE Output`.

## Usage

1.  **List Devices**: 
    Confirm VB-Cable is detected.
    ```bash
    npm run list-devices
    ```

2.  **Test Audio Pipe**:
    Verify audio is routing correctly from Phone Link.
    ```bash
    npm run test-audio
    ```

3.  **Start Assistant**:
    Launch the interactive CLI.
    ```bash
    npm start
    ```

4.  **CLI Commands**:
    - `start [instruction]` - Start call handling.
    - `say <text>` - Tell the AI what to say next.
    - `status` - Check connection states.
    - `stop` - End the call.

## License

MIT
