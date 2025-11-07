"""MemMachine MCP Client for connecting to MemMachine MCP server."""

from __future__ import annotations

import json
from typing import Any, Optional

import httpx


class MemMachineMCPClient:
    """Client for interacting with MemMachine MCP server via HTTP."""

    def __init__(self, base_url: str = "http://localhost:8080", user_id: str = "default-user"):
        """
        Initialize the MemMachine MCP client.

        Args:
            base_url: Base URL of the MemMachine MCP server
            user_id: Default user ID for memory operations
        """
        self.base_url = base_url.rstrip("/")
        self.mcp_url = f"{self.base_url}/mcp/"
        self.user_id = user_id
        self.session_id: Optional[str] = None
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _get_session_id(self) -> str:
        """Get or retrieve a session ID from the MCP server."""
        if self.session_id:
            return self.session_id

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.mcp_url,
                headers={"Accept": "text/event-stream"},
                timeout=5.0,
            )
            self.session_id = response.headers.get("mcp-session-id")
            if not self.session_id:
                raise ValueError("Failed to get session ID from MCP server")
            return self.session_id

    async def _initialize_session(self) -> None:
        """Initialize the MCP session."""
        session_id = await self._get_session_id()

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "ell-backend",
                    "version": "1.0.0",
                },
            },
        }

        async with self.client.stream(
            "POST",
            self.mcp_url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "mcp-session-id": session_id,
                "user-id": self.user_id,
            },
            json=payload,
        ) as response:
            if response.status_code != 200:
                raise ValueError(f"Failed to initialize session: {response.status_code}")

            # Send initialized notification
            await self.client.post(
                self.mcp_url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "mcp-session-id": session_id,
                    "user-id": self.user_id,
                },
                json={
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized",
                },
            )

    async def _call_tool(
        self, tool_name: str, arguments: dict[str, Any], request_id: int = 1
    ) -> dict[str, Any]:
        """
        Call an MCP tool and return the result.

        Args:
            tool_name: Name of the tool to call
            arguments: Arguments for the tool
            request_id: JSON-RPC request ID

        Returns:
            Tool result as a dictionary
        """
        session_id = await self._get_session_id()

        payload = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        async with self.client.stream(
            "POST",
            self.mcp_url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "mcp-session-id": session_id,
                "user-id": self.user_id,
            },
            json=payload,
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise ValueError(
                    f"Failed to call tool {tool_name}: {response.status_code}, {error_text.decode()}"
                )

            # Parse SSE response
            async for line in response.aiter_lines():
                if line:
                    line_str = line.decode("utf-8") if isinstance(line, bytes) else line
                    if line_str.startswith("event: message"):
                        continue
                    elif line_str.startswith("data:"):
                        try:
                            data = json.loads(line_str[5:].strip())
                            if "result" in data:
                                return data["result"]
                            elif "error" in data:
                                raise ValueError(f"MCP error: {data['error']}")
                        except json.JSONDecodeError:
                            continue

            raise ValueError(f"No result found in response for tool {tool_name}")

    async def add_memory(
        self, content: str, user_id: Optional[str] = None
    ) -> dict[str, Any]:
        """
        Add a memory to MemMachine.

        Args:
            content: The memory content to store
            user_id: User ID (defaults to instance user_id)

        Returns:
            Result dictionary with status and message
        """
        # Ensure session is initialized
        if not self.session_id:
            await self._initialize_session()
        
        user_id = user_id or self.user_id

        result = await self._call_tool(
            "add_memory",
            {
                "param": {
                    "user_id": user_id,
                    "content": content,
                }
            },
            request_id=1,
        )

        # Parse the result (may be in different formats)
        if isinstance(result, list) and len(result) > 0:
            text_content = result[0].get("text", "")
            if text_content:
                return json.loads(text_content)
        elif isinstance(result, dict) and "content" in result:
            return result["content"]
        return result

    async def search_memory(
        self, query: str, limit: int = 5, user_id: Optional[str] = None
    ) -> dict[str, Any]:
        """
        Search memories in MemMachine.

        Args:
            query: Search query string
            limit: Maximum number of results
            user_id: User ID (defaults to instance user_id)

        Returns:
            Search results dictionary
        """
        # Ensure session is initialized
        if not self.session_id:
            await self._initialize_session()
        
        user_id = user_id or self.user_id

        result = await self._call_tool(
            "search_memory",
            {
                "param": {
                    "user_id": user_id,
                    "query": query,
                    "limit": limit,
                }
            },
            request_id=2,
        )

        # Parse the result (may be in different formats)
        if isinstance(result, list) and len(result) > 0:
            text_content = result[0].get("text", "")
            if text_content:
                return json.loads(text_content)
        elif isinstance(result, dict) and "content" in result:
            return result["content"]
        return result

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()


# Global client instance
_memmachine_client: Optional[MemMachineMCPClient] = None


async def get_memmachine_client() -> MemMachineMCPClient:
    """Get or create the global MemMachine MCP client instance."""
    global _memmachine_client
    if _memmachine_client is None:
        from app.config import get_settings

        settings = get_settings()
        mcp_url = settings.memmachine_mcp_url
        user_id = settings.memmachine_user_id
        _memmachine_client = MemMachineMCPClient(base_url=mcp_url, user_id=user_id)
        # Initialize session on first use (lazy initialization)
        try:
            await _memmachine_client._initialize_session()
        except Exception:
            # If initialization fails, we'll retry on first tool call
            pass
    return _memmachine_client


async def close_memmachine_client() -> None:
    """Close the global MemMachine MCP client."""
    global _memmachine_client
    if _memmachine_client:
        await _memmachine_client.close()
        _memmachine_client = None

