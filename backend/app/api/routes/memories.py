"""MemMachine memory endpoints."""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_memmachine_client
from app.config import get_settings
from app.models.schemas import AddMemoryRequest, SearchMemoryRequest
from app.services.memmachine_client import MemMachineMCPClient

router = APIRouter(prefix="/memories", tags=["Memories"])

settings = get_settings()


@router.post("", summary="Add memory to MemMachine")
async def add_memory(
    request: AddMemoryRequest,
    client: MemMachineMCPClient = Depends(get_memmachine_client),
) -> dict[str, Any]:
    """
    Add a memory to MemMachine using the MCP server.

    This endpoint stores user information in MemMachine's memory system,
    which can be retrieved later using the search endpoint.
    """
    try:
        result = await client.add_memory(
            content=request.content,
            user_id=request.user_id,
        )
        return {
            "success": True,
            "result": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add memory: {str(e)}")


@router.post("/search", summary="Search memories in MemMachine")
async def search_memory(
    request: SearchMemoryRequest,
    client: MemMachineMCPClient = Depends(get_memmachine_client),
) -> dict[str, Any]:
    """
    Search memories in MemMachine using the MCP server.

    This endpoint searches both episodic memory and profile memory
    to retrieve relevant context about the user.
    """
    try:
        result = await client.search_memory(
            query=request.query,
            limit=request.limit,
            user_id=request.user_id,
        )
        return {
            "success": True,
            "result": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search memory: {str(e)}")


@router.get("/health", summary="Check MemMachine MCP server health")
async def memmachine_health() -> dict[str, Any]:
    """Check if MemMachine MCP server is accessible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(f"{settings.memmachine_mcp_url}/health")
            if response.status_code == 200:
                return {
                    "status": "connected",
                    "memmachine_server": response.json(),
                }
            else:
                return {
                    "status": "error",
                    "message": f"MemMachine server returned {response.status_code}",
                }
    except Exception as e:
        return {
            "status": "disconnected",
            "message": str(e),
        }

