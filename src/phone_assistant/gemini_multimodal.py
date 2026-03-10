import asyncio
import os
import traceback
from google import genai
from google.genai import types

from phone_assistant.domain_logic import build_audio_message, build_intervention_message

class GeminiSession:
    """
    Manages the bidirectional WebSocket connection with Gemini Live.
    Uses asyncio Queues to decouple IO (network) from Audio & GUI.
    """
    def __init__(self, api_key: str, audio_in_q: asyncio.Queue, audio_out_q: asyncio.Queue, text_in_q: asyncio.Queue, gui_instance=None, call_purpose: str = "", target_language: str = "Auto"):
        self.api_key = api_key
        
        # You can toggle between models here
        self.model = "models/gemini-2.5-flash-native-audio-preview-12-2025"
        
        self.audio_in_q = audio_in_q
        self.audio_out_q = audio_out_q
        self.text_in_q = text_in_q
        self.gui_instance = gui_instance
        
        self.client = genai.Client(
            http_options={"api_version": "v1beta"},
            api_key=self.api_key,
        )

        voice_name = os.getenv("VOICE_NAME", "Puck")
        
        system_prompt = (
            "You are an intelligent AI Phone Assistant engaged in a continuous voice call with the person on the other end of the line. "
            "You will receive their voice via audio, to which you must respond naturally and conversationally using voice.\n\n"
            "CRUCIAL INSTRUCTION: Your Supervisor (the user) is monitoring the call and will occasionally send you silent 'Text Instructions' via chat. "
            "When you receive a text message, IT IS A COMMAND FROM YOUR SUPERVISOR. "
            "DO NOT say 'Okay', 'Understood', or acknowledge the supervisor in any way. "
            "DO NOT read the supervisor's instruction out loud to the person on the phone. "
            "Instead, immediately and seamlessly steer your spoken conversation with the person on the phone to fulfill the supervisor's intent."
        )
        
        if call_purpose:
            system_prompt += f"\n\nCALL PURPOSE: Your main goal and role for this call is: {call_purpose}"
            
        if target_language and target_language != "Auto":
            system_prompt += f"\n\nOUTPUT LANGUAGE CONSTRAINT: You MUST ALWAYS speak in {target_language}. Even if the user speaks another language, you must reply in {target_language}."

        self.config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                )
            ),
            system_instruction=types.Content(parts=[types.Part.from_text(text=system_prompt)])
        )

    async def run(self):
        """Main loop that connects and manages send/receive workers."""
        try:
            async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                print("[DEBUG] Connected to Gemini Live API.")
                send_audio_task = asyncio.create_task(self._send_audio_worker(session))
                send_text_task = asyncio.create_task(self._send_text_worker(session))
                receive_task = asyncio.create_task(self._receive_worker(session))
                
                try:
                    done, pending = await asyncio.wait(
                        [send_audio_task, send_text_task, receive_task],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    for task in pending:
                        task.cancel()
                except asyncio.CancelledError:
                    send_audio_task.cancel()
                    send_text_task.cancel()
                    receive_task.cancel()
                    raise
                    
        except asyncio.CancelledError:
            print("[DEBUG] Session task cancelled.")
        except Exception as e:
            print(f"[ERROR] Session error: {e}")

    async def _send_audio_worker(self, session):
        """Drains audio_in_q and sends via WS."""
        while True:
            pcm_data = await self.audio_in_q.get()
            payload = build_audio_message(pcm_data)
            await session.send(input=payload)
            
    async def _send_text_worker(self, session):
        """Drains text_in_q and sends via WS."""
        while True:
            text = await self.text_in_q.get()
            formatted_text = build_intervention_message(text)
            await session.send(input=formatted_text, end_of_turn=True)
            
    async def _receive_worker(self, session):
        """Receives messages from Gemini and pushed to audio_out_q."""
        while True:
            try:
                turn = session.receive()
                async for response in turn:
                    if data := response.data:
                        # Output comes as raw pcm bytes from response.data
                        await self.audio_out_q.put(data)
                        
                    if text := response.text:
                        print(f"[Gemini Transcript]: {text}", end="")
                        if self.gui_instance:
                            self.gui_instance.append_transcript(f"[AI]: {text}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ERROR] Receive worker error: {e}")
                break
