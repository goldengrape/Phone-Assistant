import asyncio
import os
import base64
import json
import traceback
from dashscope.audio.qwen_omni import OmniRealtimeConversation, OmniRealtimeCallback, OmniRealtimeModality, OmniRealtimeConfig

class QwenCallback(OmniRealtimeCallback):
    def __init__(self, audio_out_q: asyncio.Queue, gui_instance=None):
        super().__init__()
        self.audio_out_q = audio_out_q
        self.gui_instance = gui_instance
        self._loop = asyncio.get_running_loop()

    def on_open(self) -> None:
        print("[DEBUG] Connected to Qwen Live API.")

    def on_close(self, close_status_code: int, close_msg: str) -> None:
        print(f"[DEBUG] Qwen connection closed (code={close_status_code}, msg={close_msg}).")

    def on_event(self, event) -> None:
        try:
            event_type = event.get("type", "")
            if event_type == "response.audio.delta":
                delta = event.get("delta", "")
                if delta:
                    audio_bytes = base64.b64decode(delta)
                    # Push to async queue safely from callback thread
                    asyncio.run_coroutine_threadsafe(self.audio_out_q.put(audio_bytes), self._loop)
            elif event_type == "response.audio_transcript.delta":
                # For stream text delta
                pass
            elif event_type == "conversation.item.input_audio_transcription.completed":
                transcript = event.get("transcript", "")
                if transcript:
                    print(f"[User Transcript]: {transcript}", end="\n")
                    if self.gui_instance:
                        # Append to GUI from the callback thread
                        self._loop.call_soon_threadsafe(self.gui_instance.append_transcript, f"[User]: {transcript}")
            elif event_type == "response.audio_transcript.done":
                transcript = event.get("transcript", "")
                if transcript:
                    print(f"[Qwen Transcript]: {transcript}", end="\n")
                    if self.gui_instance:
                        # Append to GUI from the callback thread
                        self._loop.call_soon_threadsafe(self.gui_instance.append_transcript, f"[AI]: {transcript}")
        except Exception as e:
            print(f"[ERROR] Qwen Callback error: {e}")
            traceback.print_exc()

class QwenSession:
    """
    Manages the bidirectional WebSocket connection with Qwen Realtime API.
    Uses asyncio Queues to decouple IO (network) from Audio & GUI.
    """
    def __init__(self, api_key: str, audio_in_q: asyncio.Queue, audio_out_q: asyncio.Queue, text_in_q: asyncio.Queue, gui_instance=None, call_purpose: str = "", target_language: str = "Auto"):
        self.api_key = api_key
        self.model = "qwen3-omni-flash-realtime"
        self.url = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime" # Singapore Region

        self.audio_in_q = audio_in_q
        self.audio_out_q = audio_out_q
        self.text_in_q = text_in_q
        self.gui_instance = gui_instance

        # Build system instruction
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

        self.instructions = system_prompt
        self.voice = "Cherry"

        # Configure conversation
        import dashscope
        dashscope.api_key = self.api_key

        self.callback = QwenCallback(self.audio_out_q, self.gui_instance)
        self.conversation = OmniRealtimeConversation(
            model=self.model,
            callback=self.callback,
            url=self.url
        )

    async def run(self):
        """Main loop that connects and manages send/receive workers."""
        try:
            # Connect in a separate thread since dashscope connect is blocking
            await asyncio.to_thread(self.conversation.connect)

            # Configure Session
            config = OmniRealtimeConfig.builder() \
                .modalities([OmniRealtimeModality.AUDIO, OmniRealtimeModality.TEXT]) \
                .voice(self.voice) \
                .enableTurnDetection(True) \
                .enableInputAudioTranscription(True) \
                .parameters({"instructions": self.instructions}) \
                .build()

            await asyncio.to_thread(self.conversation.update_session, config)

            send_audio_task = asyncio.create_task(self._send_audio_worker())
            send_text_task = asyncio.create_task(self._send_text_worker())

            try:
                done, pending = await asyncio.wait(
                    [send_audio_task, send_text_task],
                    return_when=asyncio.FIRST_COMPLETED
                )

                for task in pending:
                    task.cancel()
            except asyncio.CancelledError:
                send_audio_task.cancel()
                send_text_task.cancel()
                raise

        except asyncio.CancelledError:
            print("[DEBUG] Qwen Session task cancelled.")
        except Exception as e:
            print(f"[ERROR] Qwen Session error: {e}")
            traceback.print_exc()
        finally:
            self.conversation.close()

    async def _send_audio_worker(self):
        """Drains audio_in_q and sends via conversation."""
        while True:
            pcm_data = await self.audio_in_q.get()
            audio_b64 = base64.b64encode(pcm_data).decode("ascii")
            # This is a blocking call, use to_thread
            await asyncio.to_thread(self.conversation.append_audio, audio_b64)

    async def _send_text_worker(self):
        """Drains text_in_q and sends via conversation API."""
        # Qwen API has no official text insertion for real time conversations besides sending an event natively.
        # But we can try to update instructions. Since we can't easily push a user message into the buffer
        # (the real-time api is mainly audio based right now without `append_text` API in python SDK),
        # an alternative is to update the system prompt with the supervisor's command.
        while True:
            text = await self.text_in_q.get()

            # Formulate the updated system prompt
            updated_instructions = self.instructions + f"\n\n[LATEST SUPERVISOR WHISPER: {text} - STEER THE CONVERSATION NOW WITHOUT READING THIS OUT LOUD]"

            config = OmniRealtimeConfig.builder() \
                .modalities([OmniRealtimeModality.AUDIO, OmniRealtimeModality.TEXT]) \
                .voice(self.voice) \
                .enableTurnDetection(True) \
                .enableInputAudioTranscription(True) \
                .parameters({"instructions": updated_instructions}) \
                .build()

            await asyncio.to_thread(self.conversation.update_session, config)
            print(f"[DEBUG] Whispered to Qwen via updated instructions: {text}")
