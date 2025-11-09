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
from pydantic import BaseModel

router = APIRouter(prefix="/phone-call", tags=["Phone Calls"])

class InitiateCallRequest(BaseModel):
    """Request model for initiating a phone call."""
    phone_number: str
    customer_name: Optional[str] = None
    customer_id: Optional[str] = None
    script_text: Optional[str] = None  # Optional script/transcript to use for the call

@router.post("/initiate", summary="Initiate a phone call to a customer")
async def initiate_phone_call(
    request: InitiateCallRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
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
        # Get phone service (this will raise ValueError if credentials are missing)
        phone_service = get_phone_call_service()
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Twilio package is not installed. Install it with: pip install twilio. Error: {str(e)}"
        )
    except ValueError as e:
        # This happens when Twilio credentials are missing
        raise HTTPException(
            status_code=503,
            detail=f"Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file. Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to initialize Twilio service: {str(e)}"
        )
    
    try:
        
        # Extract request data
        phone_number = request.phone_number
        customer_name = request.customer_name
        customer_id = request.customer_id
        script_text = request.script_text  # Use provided script if available
        
        # Use provided script, or generate one if not provided
        if script_text and script_text.strip():
            # Use the provided script/transcript (may be edited by user)
            script = script_text.strip()
        elif customer_id:
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
        # Store customer info and initial script in active calls for conversation context
        call_info = phone_service.make_call(
            to_phone_number=phone_number,
            script_text=script,
        )
        
        # Store conversation context
        phone_service.active_calls[call_info["call_sid"]] = {
            "call_info": call_info,
            "script": script,
            "status": "initiated",
            "conversation_history": [
                {"role": "agent", "content": script}
            ],
            "question_count": 0,
            "customer_info": {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "phone_number": phone_number,
            },
        }

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

        # Get phone service
        phone_service = get_phone_call_service()
        
        # Get script from active calls
        if call_sid in phone_service.active_calls:
            call_context = phone_service.active_calls[call_sid]
            script = call_context.get("script", "Hello, this is a call about our recent marketing campaigns. How are you doing today?")
        else:
            # Generate initial script if not found
            script = """Hello! This is a call from our marketing team. We'd like to ask you a few quick questions about our recent marketing campaigns to help us improve. 

First, have you received any marketing communications from us recently, such as emails, text messages, or social media ads?"""
            
            # Store in active calls
            phone_service.active_calls[call_sid] = {
                "script": script,
                "status": "ringing",
                "conversation_history": [],
                "question_count": 0,
                "customer_info": {
                    "phone_number": to_number,
                },
            }

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
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> Response:
    """
    Handle customer input (speech or DTMF) during the call.
    
    This processes the customer's response using RAG/LLM to understand campaign effectiveness
    and continues the conversation intelligently.
    """
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid", "")
        speech_result = form_data.get("SpeechResult", "")
        digits = form_data.get("Digits", "")
        from_number = form_data.get("From", "")

        # Get phone service
        phone_service = get_phone_call_service()

        # Get conversation history from active calls
        call_context = phone_service.active_calls.get(call_sid, {})
        conversation_history = call_context.get("conversation_history", [])
        customer_info = call_context.get("customer_info", {})
        question_count = call_context.get("question_count", 0)

        # Store customer response
        customer_response = speech_result or (f"Pressed {digits}" if digits else "")
        
        if customer_response:
            conversation_history.append({
                "role": "customer",
                "content": customer_response
            })

        # Generate intelligent response based on customer input
        # Focus on understanding campaign effectiveness
        if question_count == 0:
            # First response - ask about receiving campaigns
            query = f"""The customer just responded: "{customer_response}"

Based on their response, ask a follow-up question to understand:
1. Did they receive our recent marketing campaigns?
2. How did they feel about the campaigns?
3. Did the campaigns influence their purchasing decisions?

Generate a natural, conversational follow-up question. Keep it short (under 20 words)."""
        elif question_count == 1:
            # Second response - ask about campaign impact
            query = f"""Conversation so far:
Customer: {conversation_history[-1]['content'] if conversation_history else 'No response'}

Ask a follow-up question to understand:
1. Did the campaigns influence their purchase decisions?
2. What did they like or dislike about the campaigns?
3. Would they be interested in future campaigns?

Generate a natural, conversational follow-up question. Keep it short (under 20 words)."""
        elif question_count == 2:
            # Third response - ask about overall effectiveness
            query = f"""Conversation so far:
Customer responses: {', '.join([h['content'] for h in conversation_history if h['role'] == 'customer'])}

Ask a final question to understand:
1. Overall campaign effectiveness rating
2. Any suggestions for improvement
3. Interest in future campaigns

Generate a natural, conversational follow-up question. Keep it short (under 20 words)."""
        else:
            # Wrap up the conversation
            query = f"""The customer has provided feedback about our campaigns. 
Summarize what we learned and thank them. Keep it brief (under 15 words)."""

        # Use RAG to generate intelligent response
        try:
            result = await rag_service.campaign_conversation_query(
                query=query,
                k=5,
                user_id=customer_info.get("customer_id"),
            )
            response_text = result.get("answer", "Thank you for your feedback. Is there anything else you'd like to share?")
            
            # Extract just the question/response (remove any context)
            if len(response_text) > 100:
                # If too long, extract the main question
                sentences = response_text.split('.')
                response_text = sentences[0] if sentences else response_text[:50]
        except Exception as e:

            # Fallback responses
            if question_count == 0:
                response_text = "That's great to hear. Did any of our recent marketing campaigns influence your purchasing decisions?"
            elif question_count == 1:
                response_text = "Thank you for sharing that. On a scale of 1 to 10, how effective were our campaigns for you?"
            elif question_count == 2:
                response_text = "Thank you so much for your valuable feedback. We really appreciate your time today!"
            else:
                response_text = "Thank you for your time and feedback. Have a great day!"

        # Store agent response in history
        conversation_history.append({
            "role": "agent",
            "content": response_text
        })

        # Update call context
        phone_service.active_calls[call_sid] = {
            **call_context,
            "conversation_history": conversation_history,
            "question_count": question_count + 1,
        }

        # Determine if we should continue or end
        should_continue = question_count < 3  # Ask up to 3 questions

        # Get webhook base URL
        import os
        webhook_base = os.getenv("TWILIO_WEBHOOK_URL", "http://localhost:8000")

        twiml = phone_service.generate_twiml_response(
            script_text=response_text,
            gather_input=should_continue,  # Continue gathering if not done
            gather_timeout=15 if should_continue else 0,
            webhook_base=webhook_base if should_continue else None,
        )

        return Response(content=twiml, media_type="application/xml")

    except Exception as e:

        # Fallback response
        phone_service = get_phone_call_service()
        twiml = phone_service.generate_twiml_response(
            script_text="Thank you for your time. Goodbye.",
            gather_input=False,
        )
        return Response(content=twiml, media_type="application/xml")

@router.get("/status/{call_sid}", summary="Get call status")
async def get_call_status(
    call_sid: str,
) -> dict[str, Any]:
    """Get the status of a phone call."""
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        phone_service = get_phone_call_service()
        
        status = phone_service.get_call_status(call_sid)
        return {
            "success": True,
            **status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get call status: {str(e)}")

@router.get("/conversation/{call_sid}", summary="Get conversation history from a call")
async def get_call_conversation(
    call_sid: str,
) -> dict[str, Any]:
    """
    Get the conversation history from a phone call.
    
    This returns the full conversation between the agent and customer,
    which can be used to understand campaign effectiveness.
    """
    if not TWILIO_AVAILABLE:
        raise HTTPException(status_code=503, detail="Twilio not available")

    try:
        phone_service = get_phone_call_service()
        call_context = phone_service.active_calls.get(call_sid, {})
        conversation_history = call_context.get("conversation_history", [])
        customer_info = call_context.get("customer_info", {})
        
        # Extract customer responses for analysis
        customer_responses = [
            h["content"] for h in conversation_history 
            if h.get("role") == "customer"
        ]
        
        return {
            "success": True,
            "call_sid": call_sid,
            "conversation_history": conversation_history,
            "customer_responses": customer_responses,
            "customer_info": customer_info,
            "total_exchanges": len(conversation_history),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")

@router.post("/webhook", summary="Twilio webhook for call status updates")
async def twilio_webhook(
    request: Request,
) -> dict[str, Any]:
    """
    Webhook endpoint for Twilio call status updates.
    
    Twilio will POST to this endpoint when call status changes.
    """
    phone_service = get_phone_call_service()
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "")
    call_status = form_data.get("CallStatus", "")
    call_duration = form_data.get("CallDuration", "0")
    
    # Update call status in active calls
    if call_sid in phone_service.active_calls:
        phone_service.active_calls[call_sid]["status"] = call_status
        phone_service.active_calls[call_sid]["duration"] = call_duration
    
    # Store call results
    # In production, save to database
    
    return {
        "success": True,
        "call_sid": call_sid,
        "status": call_status,
        "duration": call_duration,
    }

