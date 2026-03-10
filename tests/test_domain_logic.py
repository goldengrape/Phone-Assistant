import pytest
from phone_assistant.domain_logic import build_audio_message, build_intervention_message

def test_build_audio_message_contract():
    """Test the DbC constraints and pure function output of audio builder."""
    pcm_data = b'\x00\x01' * 8000  # 16000 bytes of dummy PCM
    
    # 1. Test normal case
    result = build_audio_message(pcm_data)
    assert isinstance(result, dict)
    assert 'mime_type' in result
    assert result['data'] == pcm_data
    
    # 2. Test precondition (DbC): must be bytes
    with pytest.raises(AssertionError):
        build_audio_message("Not bytes data")

def test_build_intervention_message_contract():
    """Test the Whisper intervention builder."""
    text = "Speak slower"
    
    result = build_intervention_message(text)
    assert isinstance(result, str)
    assert "Speak slower" in result
    assert "DO NOT READ THIS OUT LOUD" in result
    
    # Test precondition (DbC): must not be empty
    with pytest.raises(AssertionError):
        build_intervention_message("")
