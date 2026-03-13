import { AIClient, AIClientOptions } from './AIClient';
import { int16ToBase64, base64ToInt16 } from './utils';

export class QwenLiveClient extends AIClient {
  private url = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime"; // Singapore Region
  private apiKey = "";
  private model = "qwen3-omni-flash-realtime";

  constructor(options: AIClientOptions) {
    super(options);
    this.apiKey = options.apiKey || import.meta.env.VITE_DASHSCOPE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("DashScope API Key is not set.");
    }
  }

  async connect(): Promise<void> {
    this.options.onStateChange('connecting');

    // DashScope requires custom headers, which standard Browser WebSocket doesn't support directly in constructor.
    // The workaround for browser WebSockets is often to pass the token in URL or Sec-WebSocket-Protocol.
    // We will use the common approach: appending to URL or protocol depending on DashScope's auth.
    // NOTE: If dashscope requires Bearer token exclusively via Authorization header, we might need a proxy.
    // For now, we'll try to pass it in protocol or use URL params if supported by aliyun.
    const wsUrl = `${this.url}?Authorization=${this.apiKey}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.options.onStateChange('connected');
      this.sendSetup();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onerror = (error) => {
      console.error("Qwen WS Error:", error);
      this.options.onStateChange('error');
    };

    this.ws.onclose = (event) => {
      console.log("Qwen WS Closed:", event.code, event.reason);
      if (event.code !== 1000 && event.code !== 1005) {
        this.options.onStateChange('error');
      } else {
        this.options.onStateChange('disconnected');
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private sendSetup() {
    let instructions = "You are an intelligent AI Phone Assistant engaged in a continuous voice call with the person on the other end of the line. You will receive their voice via audio, to which you must respond naturally and conversationally using voice.\n\nCRUCIAL INSTRUCTION: Your Supervisor (the user) is monitoring the call and will occasionally send you silent 'Text Instructions' via chat. When you receive a text message, IT IS A COMMAND FROM YOUR SUPERVISOR. DO NOT say 'Okay', 'Understood', or acknowledge the supervisor in any way. DO NOT read the supervisor's instruction out loud to the person on the phone. Instead, immediately and seamlessly steer your spoken conversation with the person on the phone to fulfill the supervisor's intent.";

    if (this.options.callPurpose) {
      instructions += `\n\nCALL PURPOSE: Your main goal and role for this call is: ${this.options.callPurpose}`;
    }
    if (this.options.targetLanguage && this.options.targetLanguage !== "Auto") {
      instructions += `\n\nOUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in ${this.options.targetLanguage}. Even if the user speaks another language, you must reply in ${this.options.targetLanguage}.`;
    }

    const sessionUpdateMsg = {
      type: "session.update",
      session: {
        model: this.model,
        modalities: ["text", "audio"],
        voice: "Cherry",
        instructions: instructions,
        turn_detection: {
          type: "server_vad",
        },
        input_audio_transcription: {
          model: "qwen-asr"
        }
      }
    };
    this.ws?.send(JSON.stringify(sessionUpdateMsg));
  }

  sendAudio(pcm16: Int16Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const b64 = int16ToBase64(pcm16);
      const msg = {
        type: "input_audio_buffer.append",
        audio: b64
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendWhisper(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
       // Qwen Realtime API doesn't have a direct 'user text insertion' yet during an active audio conversation
       // A workaround is to update the system instructions dynamically or send a conversation item.
       const msg = {
         type: "conversation.item.create",
         item: {
           type: "message",
           role: "user",
           content: [
             {
               type: "text",
               text: `[LATEST SUPERVISOR WHISPER: ${text} - STEER THE CONVERSATION NOW WITHOUT READING THIS OUT LOUD]`
             }
           ]
         }
       };
       this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const response = JSON.parse(event.data);
      const eventType = response.type;

       if (eventType === "response.audio.delta") {
        const delta = response.delta;
        if (delta) {
           const pcm16 = base64ToInt16(delta);
           this.options.onAudioData(pcm16);
        }
      } else if (eventType === "conversation.item.input_audio_transcription.completed") {
         const transcript = response.transcript;
          if (transcript) {
            this.options.onTranscriptPreview?.('User', transcript, true);
             this.options.onTranscript('User', transcript);
          }
       } else if (eventType === "response.audio_transcript.done") {
         const transcript = response.transcript;
          if (transcript) {
            this.options.onTranscriptPreview?.('AI', transcript, true);
             this.options.onTranscript('AI', transcript);
          }
       } else if (eventType === "error") {
         console.error("Qwen Event Error:", response.error);
      }
    } catch (err) {
      console.error("Failed to parse Qwen message", err);
    }
  }
}
