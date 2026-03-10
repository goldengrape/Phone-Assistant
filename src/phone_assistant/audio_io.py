import pyaudio
import asyncio

FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 24000 # Gemini 2.5 Flash Native Audio requires 24kHz Base

class AudioCaptureGenerator:
    """
    A unified Audio generator encapsulating Side Effects (IO).
    Follows DbC: Requires valid device index. Yields purely bytes.
    """
    def __init__(self, input_device_index: int | None = None, chunk_size: int = 1024):
        self.chunk_size = chunk_size
        self.pa = pyaudio.PyAudio()
        
        # Precondition (DbC)
        assert chunk_size > 0, "Chunk size must be strictly positive"
        
        self.stream = self.pa.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            input_device_index=input_device_index,
            frames_per_buffer=self.chunk_size
        )

    async def capture_loop(self):
        """Async generator yielding RAW PCM bytes from microphone."""
        while self.stream.is_active():
            # Run blocking PyAudio read in an executor so it doesn't block the asyncio event loop
            try:
                data = await asyncio.to_thread(self.stream.read, self.chunk_size, exception_on_overflow=False)
                # Postcondition
                assert isinstance(data, bytes)
                yield data
            except OSError:
                break

    def close(self):
        if self.stream.is_active():
            self.stream.stop_stream()
        self.stream.close()
        self.pa.terminate()


class AudioPlaybackConsumer:
    """
    Audio consumer fulfilling the Sink role.
    """
    def __init__(self, output_device_index: int | None = None):
        self.pa = pyaudio.PyAudio()
        self.stream = self.pa.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            output=True,
            output_device_index=output_device_index
        )
        
    async def play_chunk(self, data: bytes):
        """
        Write bytes to audio output.
        Contract: Data MUST be bytes.
        """
        assert isinstance(data, bytes), "AudioConsumer: Must provide raw bytes to write to stream"
        await asyncio.to_thread(self.stream.write, data)
        
    def close(self):
        if self.stream.is_active():
            self.stream.stop_stream()
        self.stream.close()
        self.pa.terminate()
