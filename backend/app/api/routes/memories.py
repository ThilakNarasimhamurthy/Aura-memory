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
    
    **Note:** MemMachine is required. Ensure the MCP server is running.
    See MemMachine/README.md for setup instructions.
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
    except ValueError as e:
        error_msg = str(e)
        if "not available" in error_msg.lower() or "not found" in error_msg.lower() or "Failed to connect" in error_msg:
            raise HTTPException(
                status_code=503,
                detail=f"MemMachine is required but unavailable: {error_msg}. "
                       f"Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions."
            )
        raise HTTPException(status_code=400, detail=f"Failed to add memory: {error_msg}")
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
    
    **Note:** MemMachine is required. Ensure the MCP server is running.
    See MemMachine/README.md for setup instructions.
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
    except ValueError as e:
        error_msg = str(e)
        if "not available" in error_msg.lower() or "not found" in error_msg.lower() or "Failed to connect" in error_msg:
            raise HTTPException(
                status_code=503,
                detail=f"MemMachine is required but unavailable: {error_msg}. "
                       f"Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions."
            )
        raise HTTPException(status_code=400, detail=f"Failed to search memory: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search memory: {str(e)}")


@router.get("/health", summary="Check MemMachine MCP server health")
async def memmachine_health() -> dict[str, Any]:
    """
    Check if MemMachine MCP server is accessible.
    
    **Note:** MemMachine is required for this application to function properly.
    If this endpoint returns "disconnected", please start the MemMachine MCP server.
    See MemMachine/README.md for setup instructions.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            # Check MCP endpoint
            mcp_response = await http_client.get(
                f"{settings.memmachine_mcp_url}/mcp/",
                headers={"Accept": "text/event-stream"},
                timeout=5.0
            )
            
            # Also try health endpoint if available
            health_response = None
            try:
                health_response = await http_client.get(f"{settings.memmachine_mcp_url}/health", timeout=2.0)
            except:
                pass
            
            if mcp_response.status_code == 200 or mcp_response.status_code == 404:
                # 404 means server is running but endpoint might be different
                # 200 means server is accessible
                if health_response and health_response.status_code == 200:
                    return {
                        "status": "connected",
                        "memmachine_server": health_response.json(),
                        "mcp_endpoint": f"{settings.memmachine_mcp_url}/mcp/",
                        "message": "MemMachine MCP server is running",
                    }
                else:
                    return {
                        "status": "partial",
                        "mcp_endpoint": f"{settings.memmachine_mcp_url}/mcp/",
                        "message": "MemMachine server is accessible but MCP endpoint may need configuration. "
                                  "Status: " + ("404 - endpoint not found" if mcp_response.status_code == 404 else str(mcp_response.status_code)),
                    }
            else:
                return {
                    "status": "error",
                    "mcp_endpoint": f"{settings.memmachine_mcp_url}/mcp/",
                    "message": f"MemMachine server returned {mcp_response.status_code}. "
                              "Please check if the MCP server is running correctly.",
                }
    except httpx.ConnectError as e:
        return {
            "status": "disconnected",
            "mcp_url": settings.memmachine_mcp_url,
            "message": f"Failed to connect to MemMachine MCP server at {settings.memmachine_mcp_url}. "
                      f"Please start the server. See MemMachine/README.md for setup instructions.",
            "error": str(e),
        }
    except Exception as e:
        return {
            "status": "error",
            "mcp_url": settings.memmachine_mcp_url,
            "message": f"Error checking MemMachine server: {str(e)}",
            "error": str(e),
        }

