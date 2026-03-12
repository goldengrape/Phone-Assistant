import { AIClient, AIClientOptions } from './AIClient';
import { int16ToBase64, base64ToInt16 } from './utils';

export class GeminiLiveClient extends AIClient {
  private model = "gemini-2.0-flash-exp";
  private apiKey = "";
  private url = "";

  constructor(options: AIClientOptions) {
    super(options);
    this.apiKey = options.apiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
    this.url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
    if (!this.apiKey) {
      console.warn("Gemini API Key is not set.");
    }
  }

  async connect(): Promise<void> {
    this.options.onStateChange('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.options.onStateChange('connected');
      this.sendSetup();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onerror = (error) => {
      console.error("Gemini WS Error:", error);
      this.options.onStateChange('error');
    };

    this.ws.onclose = () => {
      this.options.onStateChange('disconnected');
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private sendSetup() {
    const systemPrompt = `You are an intelligent AI Phone Assistant engaged in a continuous voice call with the person on the other end of the line. You will receive their voice via audio, to which you must respond naturally and conversationally using voice. CRUCIAL INSTRUCTION: Your Supervisor (the user) is monitoring the call and will occasionally send you silent 'Text Instructions' via chat. When you receive a text message, IT IS A COMMAND FROM YOUR SUPERVISOR. DO NOT say 'Okay', 'Understood', or acknowledge the supervisor in any way. DO NOT read the supervisor's instruction out loud to the person on the phone. Instead, immediately and seamlessly steer your spoken conversation with the person on the phone to fulfill the supervisor's intent.`;

    let instructions = systemPrompt;
    if (this.options.callPurpose) {
      instructions += `\n\nCALL PURPOSE: Your main goal and role for this call is: ${this.options.callPurpose}`;
    }
    if (this.options.targetLanguage && this.options.targetLanguage !== "Auto") {
      instructions += `\n\nOUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in ${this.options.targetLanguage}. Even if the user speaks another language, you must reply in ${this.options.targetLanguage}.`;
    }

    const setupMsg = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ["AUDIO", "TEXT"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: instructions }]
        }
      }
    };
    this.ws?.send(JSON.stringify(setupMsg));
  }

  sendAudio(pcm16: Int16Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const b64 = int16ToBase64(pcm16);
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ inlineData: { mimeType: "audio/pcm;rate=16000", data: b64 } }]
            }
          ],
          turnComplete: false
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendWhisper(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: `[LATEST SUPERVISOR WHISPER: ${text} - STEER THE CONVERSATION NOW WITHOUT READING THIS OUT LOUD]` }]
            }
          ],
          turnComplete: true
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      try {
        const response = JSON.parse(event.data);
        if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            // Check for Audio Output
            if (part.inlineData && part.inlineData.data) {
              const pcm16 = base64ToInt16(part.inlineData.data);
              this.options.onAudioData(pcm16);
            }
            // Check for Text Transcript
            if (part.text) {
              this.options.onTranscript('AI', part.text);
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse Gemini message", err);
      }
    } else {
      // Sometimes it sends raw bytes directly based on SDK, but typically it is JSON with base64 audio
    }
  }
}
