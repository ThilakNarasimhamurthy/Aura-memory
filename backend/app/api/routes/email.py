"""Email API endpoints for sending bulk emails."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import BulkEmailRequest
from app.services.email_service import EmailService

router = APIRouter(prefix="/email", tags=["Email"])

# Create a singleton email service instance
_email_service: EmailService | None = None


def get_email_service() -> EmailService:
    """Get or create email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


@router.post("/send-bulk", summary="Send bulk emails to multiple recipients")
async def send_bulk_email(
    request: BulkEmailRequest,
    email_service: EmailService = Depends(get_email_service),
) -> dict[str, Any]:
    """
    Send bulk emails to multiple recipients.
    
    This endpoint:
    1. Validates recipient email addresses
    2. Sends emails to all recipients
    3. Tracks email status
    4. Returns send results
    
    **Note:** In production, configure an email provider (SendGrid, AWS SES, etc.)
    by setting EMAIL_PROVIDER and EMAIL_API_KEY environment variables.
    """
    try:
        result = await email_service.send_bulk_email(
            recipients=request.recipients,
            subject=request.subject,
            body=request.body,
            campaign_id=request.campaign_id,
            campaign_name=request.campaign_name,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send bulk emails: {str(e)}"
        )


@router.get("/status/{message_id}", summary="Get email status by message ID")
async def get_email_status(
    message_id: str,
    email_service: EmailService = Depends(get_email_service),
) -> dict[str, Any]:
    """
    Get email status by message ID.
    
    Returns the current status of an email message (sent, delivered, opened, etc.).
    """
    try:
        result = email_service.get_email_status(message_id)
        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Email message not found")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get email status: {str(e)}"
        )

