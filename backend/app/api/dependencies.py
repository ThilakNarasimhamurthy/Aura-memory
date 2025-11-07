"""API dependencies for dependency injection."""

from __future__ import annotations

from fastapi import Depends

from app.database import get_database
from app.services.langchain_rag_service import LangChainRAGService
from app.services.memmachine_client import MemMachineMCPClient, get_memmachine_client

try:
    from app.workflows.langgraph_rag_workflow import LangGraphRAGWorkflow
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    LangGraphRAGWorkflow = None

try:
    from app.services.elevenlabs_service import ElevenLabsService, get_elevenlabs_service
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    ElevenLabsService = None
    get_elevenlabs_service = None

# Cache the LangChain RAG service instance to avoid reinitializing on every request
_cached_rag_service: LangChainRAGService | None = None


def get_langchain_rag_service(
    memmachine_client: MemMachineMCPClient = Depends(get_memmachine_client),
) -> LangChainRAGService:
    """Get LangChain RAG service instance (cached per application lifecycle)."""
    global _cached_rag_service
    
    # Reuse cached instance if available
    # Note: We create a new instance if memmachine_client changes, but in practice
    # this should be stable for the application lifecycle
    if _cached_rag_service is None:
        _cached_rag_service = LangChainRAGService(
            db=get_database(),
            memmachine_client=memmachine_client
        )
    
    return _cached_rag_service


def get_langgraph_workflow(
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
    memmachine_client: MemMachineMCPClient = Depends(get_memmachine_client),
):
    """Get LangGraph RAG workflow instance."""
    if not LANGGRAPH_AVAILABLE or LangGraphRAGWorkflow is None:
        raise ImportError(
            "LangGraph is not available. Install it with: pip install langgraph"
        )
    return LangGraphRAGWorkflow(rag_service=rag_service, memmachine_client=memmachine_client)
