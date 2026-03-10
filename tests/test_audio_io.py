import pytest
import asyncio
from unittest.mock import Mock, patch
from phone_assistant.audio_io import AudioCaptureGenerator, AudioPlaybackConsumer

@pytest.mark.asyncio
async def test_audio_capture_generator_contract():
    """Ensure generator adheres to DbC yielding bytes."""
    # Mock PyAudio Stream to emit fake bytes
    fake_stream = Mock()
    fake_stream.read.return_value = b'\x01' * 1024
    
    with patch('pyaudio.PyAudio') as mock_pa:
        mock_pa_instance = mock_pa.return_value
        mock_pa_instance.open.return_value = fake_stream
        
        generator = AudioCaptureGenerator(input_device_index=1, chunk_size=1024)
        
        async for chunk in generator.capture_loop():
            assert isinstance(chunk, bytes)
            assert len(chunk) == 1024
            break # only test one execution
        
        generator.close()
        mock_pa_instance.terminate.assert_called_once()


@pytest.mark.asyncio
async def test_audio_playback_consumer_contract():
    """Ensure playback consumer accepts and writes bytes properly."""
    fake_stream = Mock()
    
    with patch('pyaudio.PyAudio') as mock_pa:
        mock_pa_instance = mock_pa.return_value
        mock_pa_instance.open.return_value = fake_stream
        
        consumer = AudioPlaybackConsumer(output_device_index=2)
        
        # Test input Contract: It should accept bytes
        await consumer.play_chunk(b'\x00' * 512)
        fake_stream.write.assert_called_once_with(b'\x00' * 512)
        
        # Test failure Contract: should reject non-bytes
        with pytest.raises(AssertionError):
            await consumer.play_chunk("string chunk")
            
        consumer.close()
        mock_pa_instance.terminate.assert_called_once()
