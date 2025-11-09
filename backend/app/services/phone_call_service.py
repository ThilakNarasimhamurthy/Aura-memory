"""Phone calling service using Twilio and ElevenLabs for campaign testing."""

from __future__ import annotations

import os
import io
from pathlib import Path
from typing import Optional, Dict, Any
from enum import Enum

from dotenv import load_dotenv

# Load .env file
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

try:
    from twilio.rest import Client as TwilioClient
    from twilio.twiml.voice_response import VoiceResponse, Gather
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    TwilioClient = None
    VoiceResponse = None
    Gather = None

try:
    from app.services.elevenlabs_service import ElevenLabsService, get_elevenlabs_service
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    ElevenLabsService = None
    get_elevenlabs_service = None

class CallStatus(str, Enum):
    """Call status enumeration."""
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    CANCELED = "canceled"

class PhoneCallService:
    """Service for making phone calls using Twilio and ElevenLabs TTS."""

    def __init__(
        self,
        twilio_account_sid: Optional[str] = None,
        twilio_auth_token: Optional[str] = None,
        twilio_phone_number: Optional[str] = None,
        elevenlabs_service: Optional[ElevenLabsService] = None,
    ):
        """
        Initialize phone call service.

        Args:
            twilio_account_sid: Twilio Account SID
            twilio_auth_token: Twilio Auth Token
            twilio_phone_number: Twilio phone number to call from
            elevenlabs_service: ElevenLabs service instance
        """
        if not TWILIO_AVAILABLE:
            raise ImportError(
                "twilio package is not installed. Install it with: pip install twilio"
            )

        self.twilio_account_sid = twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_phone_number = twilio_phone_number or os.getenv("TWILIO_PHONE_NUMBER")

        if not all([self.twilio_account_sid, self.twilio_auth_token, self.twilio_phone_number]):
            raise ValueError(
                "Twilio credentials not set. Please set TWILIO_ACCOUNT_SID, "
                "TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file."
            )

        self.twilio_client = TwilioClient(self.twilio_account_sid, self.twilio_auth_token)
        
        # ElevenLabs is optional - phone calls will work with Twilio's built-in TTS
        try:
            self.elevenlabs_service = elevenlabs_service or (
                get_elevenlabs_service() if ELEVENLABS_AVAILABLE else None
            )
        except Exception as e:
            # If ElevenLabs fails to initialize, continue without it

            self.elevenlabs_service = None

        # Store active calls
        self.active_calls: Dict[str, Dict[str, Any]] = {}

    def make_call(
        self,
        to_phone_number: str,
        script_text: str,
        voice_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Make a phone call using Twilio and ElevenLabs TTS.

        Args:
            to_phone_number: Phone number to call (E.164 format: +1234567890)
            script_text: Text script to convert to speech and play during call
            voice_id: Optional ElevenLabs voice ID
            webhook_url: Optional webhook URL for call status updates

        Returns:
            Dictionary with call information
        """
        if not to_phone_number.startswith("+"):
            # Try to format phone number
            to_phone_number = self._format_phone_number(to_phone_number)

        # Generate audio from script using ElevenLabs
        if self.elevenlabs_service:
            try:
                audio_bytes = self.elevenlabs_service.text_to_speech(
                    text=script_text,
                    voice_id=voice_id,
                )
                
                # Save audio to temporary file or upload to Twilio
                # For now, we'll use Twilio's <Say> verb with the text
                # In production, you'd upload the audio to Twilio and use <Play>
                use_audio_file = False  # Set to True if you upload audio to Twilio
                
            except Exception as e:

                use_audio_file = False
        else:
            use_audio_file = False

        # Make the call using Twilio
        try:
            # Create TwiML for the call
            # In production, you'd host this as a webhook endpoint
            # For now, we'll use a simplified approach
            call = self.twilio_client.calls.create(
                to=to_phone_number,
                from_=self.twilio_phone_number,
                url=webhook_url or self._generate_twiml_url(script_text),
                method="POST",
            )

            call_info = {
                "call_sid": call.sid,
                "status": call.status,
                "to": to_phone_number,
                "from": self.twilio_phone_number,
                "script": script_text,
                "created_at": call.date_created.isoformat() if call.date_created else None,
            }

            self.active_calls[call.sid] = {
                "call_info": call_info,
                "script": script_text,
                "status": CallStatus.INITIATED,
            }

            return call_info

        except Exception as e:
            raise ValueError(f"Failed to make phone call: {str(e)}")

    def _format_phone_number(self, phone_number: str) -> str:
        """Format phone number to E.164 format."""
        # Remove all non-digit characters
        digits = "".join(filter(str.isdigit, phone_number))
        
        # Add country code if missing (assume US +1)
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits[0] == "1":
            return f"+{digits}"
        elif phone_number.startswith("+"):
            return phone_number
        
        return f"+{digits}"

    def _generate_twiml_url(self, script_text: str) -> str:
        """
        Generate TwiML URL for the call.
        
        In production, this should be a webhook endpoint that returns TwiML.
        For now, returns the webhook URL - you'll need to configure it in Twilio.
        """
        # Get webhook URL from environment or use default
        webhook_base = os.getenv("TWILIO_WEBHOOK_URL", "http://localhost:8000")
        # Store script temporarily for the webhook to access
        # In production, you'd store this in a database or cache
        return f"{webhook_base}/phone-call/twiml"

    def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """Get the status of a call."""
        try:
            call = self.twilio_client.calls(call_sid).fetch()
            
            status_map = {
                "queued": CallStatus.INITIATED,
                "ringing": CallStatus.RINGING,
                "in-progress": CallStatus.IN_PROGRESS,
                "completed": CallStatus.COMPLETED,
                "failed": CallStatus.FAILED,
                "busy": CallStatus.BUSY,
                "no-answer": CallStatus.NO_ANSWER,
                "canceled": CallStatus.CANCELED,
            }

            return {
                "call_sid": call.sid,
                "status": status_map.get(call.status, call.status),
                "duration": call.duration,
                "direction": call.direction,
                "to": call.to,
                "from": call.from_,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
            }
        except Exception as e:
            raise ValueError(f"Failed to get call status: {str(e)}")

    def generate_twiml_response(
        self,
        script_text: str,
        gather_input: bool = False,
        gather_timeout: int = 10,
        webhook_base: Optional[str] = None,
    ) -> str:
        """
        Generate TwiML XML response for the call.

        Args:
            script_text: Text to speak during the call
            gather_input: Whether to gather user input (DTMF or speech)
            gather_timeout: Timeout for gathering input
            webhook_base: Base URL for webhook endpoints

        Returns:
            TwiML XML string
        """
        if not VoiceResponse:
            raise ImportError("Twilio VoiceResponse not available")

        webhook_base = webhook_base or os.getenv("TWILIO_WEBHOOK_URL", "http://localhost:8000")
        response = VoiceResponse()

        if gather_input and webhook_base:
            gather = Gather(
                input="speech dtmf",
                timeout=gather_timeout,
                speech_timeout="auto",
                action=f"{webhook_base}/phone-call/handle-input",
                method="POST",
                num_digits=1,  # Allow single digit for quick responses
            )
            gather.say(script_text, voice="alice", language="en-US")
            response.append(gather)
            
            # If no input received, continue anyway
            response.say("I didn't catch that. Let me continue.", voice="alice", language="en-US")
            response.redirect(f"{webhook_base}/phone-call/handle-input", method="POST")
        else:
            response.say(script_text, voice="alice", language="en-US")
            # Add a goodbye message only if ending
            response.say("Thank you for your time and valuable feedback. Have a great day!", voice="alice", language="en-US")
            response.hangup()

        return str(response)

def get_phone_call_service(
    elevenlabs_service: Optional[ElevenLabsService] = None,
) -> PhoneCallService:
    """
    Get or create phone call service instance.

    Args:
        elevenlabs_service: Optional ElevenLabs service instance

    Returns:
        PhoneCallService instance
    """
    return PhoneCallService(elevenlabs_service=elevenlabs_service)

