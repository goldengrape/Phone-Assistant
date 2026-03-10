import base64

def build_audio_message(pcm_data: bytes) -> dict:
    """
    Pure function (FP) to wrap RAW PCM bytes into Gemini's realtimeInput JSON format.
    Contract (DbC): Input MUST be bytes.
    """
    assert isinstance(pcm_data, bytes), "Precondition failed: pcm_data must be bytes"
    
    return {"mime_type": "audio/pcm", "data": pcm_data}

def build_intervention_message(text: str) -> str:
    """
    Pure function (FP) to wrap a Supervisor's string into an intervention packet.
    Contract (DbC): Input MUST be a non-empty string.
    """
    assert isinstance(text, str) and len(text.strip()) > 0, "Precondition failed: text must be non-empty string"
    
    # The Occam's razor way to inject a hidden supervisor prompt 
    # without breaking the current turn flow.
    wrapped_text = f"[SUPERVISOR WHISPER - DO NOT READ THIS OUT LOUD. FOLLOW THE INSTRUCTION MENTALLY]: {text}"
    
    return wrapped_text
