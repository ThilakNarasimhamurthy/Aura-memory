"""API dependencies for dependency injection."""

from __future__ import annotations

from fastapi import Depends

from app.database import get_database
from app.services.langchain_rag_service import LangChainRAGService
from app.services.memmachine_client import MemMachineMCPClient, get_memmachine_client
from app.workflows.langgraph_rag_workflow import LangGraphRAGWorkflow

try:
    from app.services.elevenlabs_service import ElevenLabsService, get_elevenlabs_service
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    ElevenLabsService = None
    get_elevenlabs_service = None


def get_langchain_rag_service(
    memmachine_client: MemMachineMCPClient = Depends(get_memmachine_client),
) -> LangChainRAGService:
    """Get LangChain RAG service instance."""
    return LangChainRAGService(db=get_database(), memmachine_client=memmachine_client)


def get_langgraph_workflow(
    rag_service: LangChainRAGService = Depends(get_langchain_rag_service),
    memmachine_client: MemMachineMCPClient = Depends(get_memmachine_client),
) -> LangGraphRAGWorkflow:
    """Get LangGraph RAG workflow instance."""
    return LangGraphRAGWorkflow(rag_service=rag_service, memmachine_client=memmachine_client)
