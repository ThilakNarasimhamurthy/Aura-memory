"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# MemMachine Models
class AddMemoryRequest(BaseModel):
    """Request model for adding memory."""

    content: str = Field(..., description="Memory content to store")
    user_id: Optional[str] = Field(None, description="User ID (optional, defaults to configured user)")


class SearchMemoryRequest(BaseModel):
    """Request model for searching memory."""

    query: str = Field(..., description="Search query")
    limit: int = Field(5, ge=1, le=50, description="Maximum number of results")
    user_id: Optional[str] = Field(None, description="User ID (optional, defaults to configured user)")


# LangChain RAG Models
class StoreDocumentsRequest(BaseModel):
    """Request model for storing documents."""

    texts: list[str] = Field(..., description="List of text documents to store")
    metadatas: Optional[list[dict[str, Any]]] = Field(None, description="Optional list of metadata dicts")
    source: Optional[str] = Field(None, description="Source identifier")


class LangChainSearchDocumentsRequest(BaseModel):
    """Request model for searching documents."""

    query: str = Field(..., description="Search query")
    k: int = Field(5, ge=1, le=50, description="Number of results to return")
    filter: Optional[dict[str, Any]] = Field(None, description="Optional metadata filter")


class LangChainRAGQueryRequest(BaseModel):
    """Request model for LangChain RAG query."""

    query: str = Field(..., description="User query")
    k: int = Field(5, ge=1, le=20, description="Number of documents to retrieve (max 20 for campaign queries)")
    include_memories: bool = Field(True, description="Include user memories in context")
    user_id: Optional[str] = Field(None, description="User ID for MemMachine")


class LangGraphRAGRequest(BaseModel):
    """Request model for LangGraph RAG query."""

    query: str = Field(..., description="User query")
    k: int = Field(5, ge=1, le=10, description="Number of documents to retrieve")
    user_id: Optional[str] = Field(None, description="User ID for MemMachine")


# Email Models
class EmailRecipient(BaseModel):
    """Email recipient model."""

    email: str = Field(..., description="Recipient email address")
    customer_id: Optional[str] = Field(None, description="Customer ID (optional)")
    name: Optional[str] = Field(None, description="Recipient name (optional)")
    personalization: Optional[dict[str, Any]] = Field(None, description="Personalization data (optional)")


class BulkEmailRequest(BaseModel):
    """Request model for sending bulk emails."""

    recipients: list[EmailRecipient] = Field(..., description="List of email recipients")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body (HTML or plain text)")
    campaign_id: Optional[str] = Field(None, description="Campaign ID (optional)")
    campaign_name: Optional[str] = Field(None, description="Campaign name (optional)")


class EmailStatusResponse(BaseModel):
    """Response model for email status."""

    success: bool = Field(..., description="Whether the request was successful")
    message_id: str = Field(..., description="Email message ID")
    status: str = Field(..., description="Email status (sent, delivered, opened, etc.)")
    recipient: Optional[str] = Field(None, description="Recipient email address")
    timestamp: Optional[str] = Field(None, description="Timestamp when email was sent")

