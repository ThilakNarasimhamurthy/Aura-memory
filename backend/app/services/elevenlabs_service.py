"""ElevenLabs Text-to-Speech service for voice conversations."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env file
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import VoiceSettings
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    ElevenLabs = None
    VoiceSettings = None


class ElevenLabsService:
    """Service for ElevenLabs Text-to-Speech integration."""

    def __init__(self, api_key: Optional[str] = None, voice_id: Optional[str] = None):
        """
        Initialize ElevenLabs service.

        Args:
            api_key: ElevenLabs API key (defaults to ELEVENLABS_API_KEY env var)
            voice_id: Default voice ID to use (defaults to a professional voice)
        """
        if not ELEVENLABS_AVAILABLE:
            raise ImportError(
                "elevenlabs package is not installed. Install it with: pip install elevenlabs"
            )

        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError(
                "ELEVENLABS_API_KEY not set. Please set it in your .env file or pass it directly."
            )

        # Default to a professional, conversational voice
        # You can change this to any voice ID from ElevenLabs
        self.default_voice_id = voice_id or os.getenv(
            "ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"  # Default professional voice
        )
        self.default_model = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
        self.default_output_format = os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")

        self.client = ElevenLabs(api_key=self.api_key)

    def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        output_format: Optional[str] = None,
        voice_settings: Optional[dict] = None,
    ) -> bytes:
        """
        Convert text to speech using ElevenLabs TTS.

        Args:
            text: Text to convert to speech
            voice_id: Voice ID to use (defaults to configured voice)
            model_id: Model ID to use (defaults to eleven_multilingual_v2)
            output_format: Output audio format (defaults to mp3_44100_128)
            voice_settings: Optional voice settings (stability, similarity_boost, etc.)

        Returns:
            Audio data as bytes
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        voice_id = voice_id or self.default_voice_id
        model_id = model_id or self.default_model
        output_format = output_format or self.default_output_format

        # Default voice settings for conversational agent
        default_settings = {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        }
        if voice_settings:
            default_settings.update(voice_settings)

        try:
            audio = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=model_id,
                output_format=output_format,
                voice_settings=VoiceSettings(**default_settings) if VoiceSettings else None,
            )

            # Convert generator to bytes
            audio_bytes = b"".join(audio)
            return audio_bytes

        except Exception as e:
            raise ValueError(f"Failed to generate speech: {str(e)}")

    def text_to_speech_stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        output_format: Optional[str] = None,
    ):
        """
        Convert text to speech with streaming (for real-time conversations).

        Args:
            text: Text to convert to speech
            voice_id: Voice ID to use
            model_id: Model ID to use
            output_format: Output audio format

        Yields:
            Audio chunks as bytes
        """
        voice_id = voice_id or self.default_voice_id
        model_id = model_id or self.default_model
        output_format = output_format or self.default_output_format

        try:
            audio_stream = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=model_id,
                output_format=output_format,
            )
            return audio_stream
        except Exception as e:
            raise ValueError(f"Failed to generate speech stream: {str(e)}")

    def get_available_voices(self) -> list[dict]:
        """
        Get list of available voices.

        Returns:
            List of voice dictionaries
        """
        try:
            voices = self.client.voices.get_all()
            return [
                {
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category,
                }
                for voice in voices.voices
            ]
        except Exception as e:
            raise ValueError(f"Failed to get voices: {str(e)}")


def get_elevenlabs_service(
    api_key: Optional[str] = None, voice_id: Optional[str] = None
) -> ElevenLabsService:
    """
    Get or create ElevenLabs service instance.

    Args:
        api_key: Optional API key
        voice_id: Optional voice ID

    Returns:
        ElevenLabsService instance
    """
    return ElevenLabsService(api_key=api_key, voice_id=voice_id)

