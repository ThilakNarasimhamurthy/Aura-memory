"""LangChain/LangGraph RAG endpoints for FastAPI application."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.api.dependencies import (
    ELEVENLABS_AVAILABLE,
    LANGGRAPH_AVAILABLE,
    get_elevenlabs_service,
    get_langchain_rag_service,
    get_langgraph_workflow,
)
from app.models.schemas import (
    LangChainRAGQueryRequest,
    LangChainSearchDocumentsRequest,
    LangGraphRAGRequest,
    StoreDocumentsRequest,
)
from app.services.langchain_rag_service import LangChainRAGService

if ELEVENLABS_AVAILABLE:
    from app.services.elevenlabs_service import ElevenLabsService

router = APIRouter(prefix="/langchain-rag", tags=["LangChain RAG"])

@router.post("/documents", summary="Store documents using LangChain")
async def store_documents(
    request: StoreDocumentsRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Store documents in MongoDB vector store using LangChain.

    Documents will be chunked and embedded for semantic search.
    """
    try:
        result = rag_service.store_documents(
            texts=request.texts,
            metadatas=request.metadatas,
            source=request.source,
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "OPENAI_API_KEY" in error_msg or "API key" in error_msg or "AuthenticationError" in error_msg or "401" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Configuration error: {error_msg}. Please set OPENAI_API_KEY in your .env file."
            )
        raise HTTPException(status_code=500, detail=f"Failed to store documents: {error_msg}")
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        
        # Check for authentication errors (OpenAI, etc.)
        if "AuthenticationError" in error_type or "401" in error_msg or "API key" in error_msg.lower() or "OPENAI_API_KEY" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Authentication error: {error_msg}. Please check your OPENAI_API_KEY in your .env file."
            )
        
        # For other errors, return detailed error message
        import traceback
        error_trace = traceback.format_exc()
        error_detail = f"Failed to store documents: {error_msg}"

        # Return more detailed error in response as a string (FastAPI will serialize it)
        error_message = f"{error_detail}\nType: {error_type}\nDetails: {error_msg}"
        raise HTTPException(
            status_code=500,
            detail=error_message
        )

@router.post("/documents/search", summary="Search documents using LangChain")
async def search_documents(
    request: LangChainSearchDocumentsRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Search documents using vector similarity search.

    Returns relevant documents based on semantic similarity.
    """
    try:
        documents = rag_service.search_documents(
            query=request.query,
            k=request.k,
            filter=request.filter,
        )
        # Metadata should be normalized, but ensure it's done here as well
        from app.utils.data_normalization import normalize_metadata
        
        normalized_results = []
        for doc in documents:
            normalized_meta = normalize_metadata(doc.metadata)
            normalized_results.append({
                "content": doc.page_content,
                "metadata": normalized_meta,
            })
        
        return {
            "success": True,
            "query": request.query,
            "results": normalized_results,
            "total": len(normalized_results),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search documents: {str(e)}")

@router.get("/documents", summary="List stored documents")
async def list_documents(
    limit: int = 100,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """List all stored documents."""
    try:
        result = rag_service.list_documents(limit=limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@router.delete("/documents", summary="Delete documents")
async def delete_documents(
    source: Optional[str] = None,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Delete documents by source.

    Provide 'source' to delete all documents from that source.
    """
    try:
        result = rag_service.delete_documents(source=source)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete documents: {str(e)}")

@router.post("/retrieve", summary="Retrieve context for RAG")
async def retrieve_context(
    request: LangChainRAGQueryRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Retrieve relevant context for RAG (documents + memories).

    This endpoint combines document retrieval from MongoDB vector store
    with memory retrieval from MemMachine.
    
    **Note:** MemMachine is required. Ensure the MCP server is running.
    See MemMachine/README.md for setup instructions.
    """
    try:
        result = await rag_service.retrieve_context(
            query=request.query,
            k=request.k,
            include_memories=request.include_memories,
            user_id=request.user_id,
        )
        # Metadata is already normalized in the service
        return {
            "success": True,
            "query": request.query,
            "documents": [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,  # Already normalized
                }
                for doc in result["documents"]
            ],
            "memories": [
                {
                    "content": mem.page_content,
                    "metadata": mem.metadata,
                }
                for mem in result["memories"]
            ],
            "total_context": result["total_context"],
        }
    except ValueError as e:
        error_msg = str(e)
        if "not available" in error_msg.lower() or "not found" in error_msg.lower() or "Failed to connect" in error_msg:
            raise HTTPException(
                status_code=503,
                detail=f"MemMachine is required but unavailable: {error_msg}. "
                       f"Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions."
            )
        raise HTTPException(status_code=400, detail=f"Failed to retrieve context: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve context: {str(e)}")

@router.post("/query", summary="RAG query using LangChain")
async def rag_query(
    request: LangChainRAGQueryRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Perform a RAG query using LangChain.

    This endpoint:
    1. Retrieves relevant documents from MongoDB vector store
    2. Retrieves relevant memories from MemMachine (required)
    3. Generates an answer using an LLM
    
    **Note:** MemMachine is required. Ensure the MCP server is running.
    See MemMachine/README.md for setup instructions.
    """
    try:
        result = await rag_service.rag_query(
            query=request.query,
            k=request.k,
            include_memories=request.include_memories,
            user_id=request.user_id,
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "not available" in error_msg.lower() or "not found" in error_msg.lower() or "Failed to connect" in error_msg:
            raise HTTPException(
                status_code=503,
                detail=f"MemMachine is required but unavailable: {error_msg}. "
                       f"Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions."
            )
        raise HTTPException(status_code=400, detail=f"Failed to process RAG query: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process RAG query: {str(e)}")

@router.post("/query/campaign", summary="Campaign conversation query optimized for voice (ElevenLabs)")
async def campaign_conversation_query(
    request: LangChainRAGQueryRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
) -> dict[str, Any]:
    """
    Specialized RAG query for voice conversations about campaign effectiveness.
    
    Optimized for ElevenLabs voice conversations where an agent:
    - Targets the most active customers
    - Discusses campaign performance and effectiveness
    - Provides natural, conversational responses
    
    This endpoint:
    1. Retrieves relevant customer documents (uses higher k for finding active customers)
    2. Retrieves relevant memories from MemMachine (required)
    3. Generates a conversational answer optimized for voice TTS
    
    Use this endpoint when building voice conversations about campaigns.
    
    **Note:** MemMachine is required. Ensure the MCP server is running.
    See MemMachine/README.md for setup instructions.
    """
    try:
        # Allow higher k for finding active customers
        k = min(request.k, 20)  # Cap at 20 for performance
        result = await rag_service.campaign_conversation_query(
            query=request.query,
            k=k,
            include_memories=True,  # MemMachine is required - always include memories
            user_id=request.user_id,
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "not available" in error_msg.lower() or "not found" in error_msg.lower() or "Failed to connect" in error_msg or "unavailable" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail=f"MemMachine is required but unavailable: {error_msg}. "
                       f"Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions."
            )
        raise HTTPException(status_code=400, detail=f"Failed to process campaign conversation query: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process campaign conversation query: {str(e)}")

@router.post("/query/campaign/voice", summary="Campaign conversation with ElevenLabs voice output")
async def campaign_conversation_voice(
    request: LangChainRAGQueryRequest,
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
    voice_id: Optional[str] = None,
) -> Response:
    """
    Campaign conversation query with ElevenLabs Text-to-Speech audio output.
    
    This endpoint combines:
    1. RAG query to get campaign/customer information
    2. ElevenLabs TTS to convert the response to speech
    
    Returns audio file (MP3) ready for playback.
    
    Requires ELEVENLABS_API_KEY to be set in environment variables.
    See: https://elevenlabs.io/docs/quickstart
    """
    if not ELEVENLABS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs service is not available. Install with: pip install elevenlabs and set ELEVENLABS_API_KEY"
        )
    
    try:
        # Initialize ElevenLabs service
        elevenlabs_service = get_elevenlabs_service(voice_id=voice_id)
        
        # Get conversational response from RAG
        k = min(request.k, 20)
        result = await rag_service.campaign_conversation_query(
            query=request.query,
            k=k,
            include_memories=request.include_memories,
            user_id=request.user_id,
        )
        
        # Convert text to speech
        answer_text = result.get("answer", "I don't have information about that.")
        audio_bytes = elevenlabs_service.text_to_speech(
            text=answer_text,
            voice_id=voice_id,
        )
        
        # Return audio response
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=campaign_response.mp3",
                "X-Query": request.query,
                "X-Customers-Found": str(result.get("customers_found", 0)),
            }
        )
    except ValueError as e:
        error_msg = str(e)
        # Check if it's a quota error
        if "quota" in error_msg.lower() or "credits" in error_msg.lower():
            raise HTTPException(
                status_code=402,  # Payment Required
                detail=f"ElevenLabs quota exceeded: {error_msg}. The call will still work using Twilio's built-in TTS."
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        # Check if it's a quota error in the exception message
        if "quota" in error_msg.lower() or "credits" in error_msg.lower():
            raise HTTPException(
                status_code=402,  # Payment Required
                detail=f"ElevenLabs quota exceeded: {error_msg}. The call will still work using Twilio's built-in TTS."
            )
        raise HTTPException(status_code=500, detail=f"Failed to generate voice response: {str(e)}")

@router.post("/query/langgraph", summary="RAG query using LangGraph workflow")
async def langgraph_rag_query(
    request: LangGraphRAGRequest,
    workflow = Depends(get_langgraph_workflow),
) -> dict[str, Any]:
    """
    Perform a RAG query using LangGraph workflow.

    This endpoint uses a multi-stage LangGraph workflow:
    1. Retrieve documents from vector store
    2. Retrieve memories from MemMachine
    3. Combine context
    4. Generate answer using LLM

    LangGraph provides better control flow and state management.
    """
    if not LANGGRAPH_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="LangGraph is not available. Install it with: pip install langgraph"
        )
    
    try:
        result = await workflow.run(
            query=request.query,
            k=request.k,
            user_id=request.user_id,
        )
        return result
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"LangGraph is not available: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process LangGraph RAG query: {str(e)}")

