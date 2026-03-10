import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from phone_assistant.gemini_multimodal import GeminiSession

@pytest.fixture
def mock_genai_client():
    mock_client = MagicMock()
    mock_session = AsyncMock()
    
    # Mock receive response
    class MockResponse:
        data = b'Hello'
        text = None
        
    async def mock_turn():
        yield MockResponse()
        await asyncio.sleep(3600)  # Stop the generator from completing instantly and tight-looping
        
    mock_session.receive = MagicMock(return_value=mock_turn())
    
    
    # Mock context manager
    mock_client.aio.live.connect.return_value.__aenter__.return_value = mock_session
    mock_client.aio.live.connect.return_value.__aexit__.return_value = False
    
    return mock_client, mock_session

@pytest.mark.asyncio
async def test_gemini_session_flow(mock_genai_client):
    """
    Test the integration logic connecting queues to the GenAI SDK.
    DbC: Ensuring isolation between queues and network.
    """
    mock_client, mock_session = mock_genai_client
    
    audio_in_q = asyncio.Queue(maxsize=10)
    audio_out_q = asyncio.Queue(maxsize=10)
    text_in_q = asyncio.Queue()
    
    session = GeminiSession(
        api_key="test_key", 
        audio_in_q=audio_in_q, 
        audio_out_q=audio_out_q, 
        text_in_q=text_in_q
    )
    
    await text_in_q.put("Supervisor note")
    await audio_in_q.put(b'\x01')
    
    with patch('phone_assistant.gemini_multimodal.genai.Client', return_value=mock_client):
        # Hot swap the mocked client inside the already initialized session
        session.client = mock_client
        task = asyncio.create_task(session.run())
        
        await asyncio.sleep(0.1)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        # Verification 1: Did we send the text and audio we queued?
        assert mock_session.send.call_count >= 2
        
        # Verification 2: Did we receive and decode the server's audio?
        try:
            decoded_out = await asyncio.wait_for(audio_out_q.get(), timeout=1.0)
            assert decoded_out == b'Hello'
        except asyncio.TimeoutError:
            pytest.fail("Timeout waiting for audio queue")
