"""Phone call endpoints for making actual calls to customers."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import Response, PlainTextResponse

from app.api.dependencies import get_langchain_rag_service
from app.models.schemas import LangChainRAGQueryRequest
from app.services.langchain_rag_service import LangChainRAGService
from app.services.phone_call_service import (
    PhoneCallService,
    get_phone_call_service,
    TWILIO_AVAILABLE,
    ELEVENLABS_AVAILABLE,
)

router = APIRouter(prefix="/phone-call", tags=["Phone Calls"])


@router.post("/initiate", summary="Initiate a phone call to a customer")
async def initiate_phone_call(
    phone_number: str,
    customer_name: Optional[str] = None,
    customer_id: Optional[str] = None,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
    phone_service: Optional[PhoneCallService] = None,
) -> dict[str, Any]:
    """
    Initiate an actual phone call to a customer to test campaign effectiveness.
    
    This endpoint:
    1. Generates a personalized call script based on customer data
    2. Converts script to speech using ElevenLabs
    3. Makes an actual phone call using Twilio
    4. Plays the script during the call
    
    Args:
        phone_number: Phone number to call (E.164 format or will be formatted)
        customer_name: Optional customer name
        customer_id: Optional customer ID to fetch customer data
    
    Returns:
        Call information including call SID and status
    """
    if not TWILIO_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Twilio service is not available. Install with: pip install twilio and set TWILIO credentials"
        )
    
    try:
        # Get phone service
        if phone_service is None:
            phone_service = get_phone_call_service()
        
        # Generate call script
        if customer_id:
            # Fetch customer data and generate personalized script
            query = f"Generate a phone conversation script to call customer {customer_id} ({customer_name or ''}) at {phone_number} to ask about campaign effectiveness."
            result = await rag_service.campaign_conversation_query(
                query=query,
                k=5,
            )
            script = result.get("answer", f"Hello, this is a call about our recent campaigns. How are you doing?")
        else:
            # Generic script for manual number
            script = f"""Hello, this is a call from our marketing team. We'd like to ask you a few questions about our recent marketing campaigns. 
            
Have you received any marketing communications from us recently? 
How would you rate your experience with our campaigns?
Did any of our campaigns influence your purchasing decisions?
            
Thank you for your time and feedback!"""

        # Make the actual phone call
        # Store script in phone service before making call so webhook can access it
        if phone_service is None:
            phone_service = get_phone_call_service()
        
        call_info = phone_service.make_call(
            to_phone_number=phone_number,
            script_text=script,
        )

        return {
            "success": True,
            "call_sid": call_info["call_sid"],
            "status": call_info["status"],
            "phone_number": phone_number,
            "script_preview": script[:200] + "..." if len(script) > 200 else script,
            "message": "Call initiated successfully. The customer will receive the call shortly.",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")


@router.post("/twiml", summary="TwiML webhook for call handling")
@router.get("/twiml", summary="TwiML webhook for call handling (GET fallback)")
async def handle_twiml(
    request: Request,
    phone_service: Optional[PhoneCallService] = None,
) -> Response:
    """
    TwiML webhook endpoint for handling incoming call events.
    
    This endpoint is called by Twilio during the call to get instructions.
    Supports both GET and POST methods for Twilio compatibility.
    """
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        # Get call parameters from request (works for both GET and POST)
        if request.method == "POST":
            form_data = await request.form()
            call_sid = form_data.get("CallSid", "")
            from_number = form_data.get("From", "")
            to_number = form_data.get("To", "")
        else:
            # GET request - get from query params
            call_sid = request.query_params.get("CallSid", "")
            from_number = request.query_params.get("From", "")
            to_number = request.query_params.get("To", "")

        # Get script from active calls or generate default
        if phone_service is None:
            phone_service = get_phone_call_service()
        
        script = "Hello, this is a call about our recent marketing campaigns. How are you doing today?"
        
        if call_sid in phone_service.active_calls:
            script = phone_service.active_calls[call_sid].get("script", script)

        # Get webhook base URL
        import os
        webhook_base = os.getenv("TWILIO_WEBHOOK_URL", "http://localhost:8000")
        
        # Generate TwiML response
        twiml = phone_service.generate_twiml_response(
            script_text=script,
            gather_input=True,  # Gather customer responses
            gather_timeout=10,
            webhook_base=webhook_base,
        )

        return Response(content=twiml, media_type="application/xml")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate TwiML: {str(e)}")


@router.post("/handle-input", summary="Handle customer input during call")
async def handle_call_input(
    request: Request,
    phone_service: Optional[PhoneCallService] = None,
) -> Response:
    """
    Handle customer input (speech or DTMF) during the call.
    
    This processes the customer's response and can continue the conversation.
    """
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid", "")
        speech_result = form_data.get("SpeechResult", "")
        digits = form_data.get("Digits", "")

        if phone_service is None:
            phone_service = get_phone_call_service()

        # Process the input and generate response
        # In a full implementation, you'd use RAG/LLM to generate a response
        response_text = "Thank you for that feedback. Is there anything else you'd like to share about our campaigns?"

        twiml = phone_service.generate_twiml_response(
            script_text=response_text,
            gather_input=False,  # End after this response
        )

        return Response(content=twiml, media_type="application/xml")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle input: {str(e)}")


@router.get("/status/{call_sid}", summary="Get call status")
async def get_call_status(
    call_sid: str,
    phone_service: Optional[PhoneCallService] = None,
) -> dict[str, Any]:
    """Get the status of a phone call."""
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        if phone_service is None:
            phone_service = get_phone_call_service()
        
        status = phone_service.get_call_status(call_sid)
        return {
            "success": True,
            **status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get call status: {str(e)}")


@router.post("/webhook", summary="Twilio webhook for call status updates")
async def twilio_webhook(
    request: Request,
) -> dict[str, Any]:
    """
    Webhook endpoint for Twilio call status updates.
    
    Twilio will POST to this endpoint when call status changes.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "")
    call_status = form_data.get("CallStatus", "")
    call_duration = form_data.get("CallDuration", "0")
    
    # Store call results
    # In production, save to database
    
    return {
        "success": True,
        "call_sid": call_sid,
        "status": call_status,
        "duration": call_duration,
    }

