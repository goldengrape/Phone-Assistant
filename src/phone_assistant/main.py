import asyncio
import os
import sys
from dotenv import load_dotenv

import kivy
from kivy.app import async_runTouchApp
from kivy.core.text import LabelBase, DEFAULT_FONT

# Fix Chinese font rendering on macOS
font_path = '/System/Library/Fonts/PingFang.ttc'
if os.path.exists(font_path):
    LabelBase.register(DEFAULT_FONT, font_path)

from phone_assistant.audio_io import AudioCaptureGenerator, AudioPlaybackConsumer
from phone_assistant.gemini_multimodal import GeminiSession
from phone_assistant.gui_app import PhoneAssistantGUI

kivy.require('2.3.0')

class AppRunner:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key or self.api_key == "your_google_gemini_api_key_here":
            print("ERROR: GEMINI_API_KEY is not set in .env")
            sys.exit(1)
            
        # These could be loaded from config/dotenv in a real setup
        self.input_device = int(os.getenv("INPUT_DEVICE_INDEX")) if os.getenv("INPUT_DEVICE_INDEX") else None
        self.output_device = int(os.getenv("OUTPUT_DEVICE_INDEX")) if os.getenv("OUTPUT_DEVICE_INDEX") else None
        
        # Decrease queue sizes to minimize latency
        # 10 chunks * 1024 frames / 24000Hz ≈ 0.42 seconds of total buffering
        self.audio_in_q = asyncio.Queue(maxsize=10) 
        self.audio_out_q = asyncio.Queue(maxsize=10)
        self.text_in_q = asyncio.Queue()
        
        self.audio_capture_generator = None
        self.audio_playback_consumer = None
        
        self.session_task = None
        self.audio_capture_task = None
        self.audio_playback_task = None
        
    async def start_pipeline(self, gui_instance, context_val: str = "", lang_val: str = "Auto"):
        gui_instance.update_status("Starting Audio Devices...")
        try:
            # 1. Start Audio I/O
            self.audio_capture_generator = AudioCaptureGenerator(input_device_index=self.input_device)
            self.audio_playback_consumer = AudioPlaybackConsumer(output_device_index=self.output_device)
            
            self.audio_capture_task = asyncio.create_task(self._capture_worker())
            self.audio_playback_task = asyncio.create_task(self._playback_worker())
            
            # 2. Start Gemini Network Session
            gui_instance.update_status("Connecting to Gemini...")
            gemini_session = GeminiSession(
                api_key=self.api_key,
                audio_in_q=self.audio_in_q,
                audio_out_q=self.audio_out_q,
                text_in_q=self.text_in_q,
                gui_instance=gui_instance, # Passing gui instance to pipe transcript logs
                call_purpose=context_val,
                target_language=lang_val
            )
            self.session_task = asyncio.create_task(gemini_session.run())
            
            gui_instance.update_status("Connected and Listening")
        except Exception as e:
            gui_instance.update_status(f"Error: {str(e)}")
            await self.stop_pipeline(gui_instance)
            
    async def stop_pipeline(self, gui_instance):
        if self.session_task:
            self.session_task.cancel()
        if self.audio_capture_task:
            self.audio_capture_task.cancel()
        if self.audio_playback_task:
            self.audio_playback_task.cancel()
            
        if self.audio_capture_generator:
            self.audio_capture_generator.close()
        if self.audio_playback_consumer:
            self.audio_playback_consumer.close()
            
        gui_instance.update_status("Disconnected")
        
    async def _capture_worker(self):
        async for chunk in self.audio_capture_generator.capture_loop():
            # Drop data if queue is full to prevent memory leak (Occam's approach)
            if not self.audio_in_q.full():
                await self.audio_in_q.put(chunk)
                
    async def _playback_worker(self):
        while True:
            chunk = await self.audio_out_q.get()
            await self.audio_playback_consumer.play_chunk(chunk)


async def main():
    runner = AppRunner()
    
    gui = PhoneAssistantGUI(
        text_in_q=runner.text_in_q,
        start_callback=runner.start_pipeline,
        stop_callback=runner.stop_pipeline
    )
    
    # Let Kivy take over the asyncio event loop
    await async_runTouchApp(gui)

def entry_point():
    asyncio.run(main())

if __name__ == "__main__":
    entry_point()
