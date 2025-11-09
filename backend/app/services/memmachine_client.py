"""MemMachine MCP Client for connecting to MemMachine MCP server."""

from __future__ import annotations

import json
from typing import Any, Optional

import httpx

class MemMachineMCPClient:
    """Client for interacting with MemMachine MCP server via HTTP."""

    def __init__(self, base_url: str = "http://localhost:8090", user_id: str = "default-user"):
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
        self.client = httpx.AsyncClient(timeout=60.0)  # Increased timeout for MemMachine operations
        self._initialization_attempted = False
        self._initialization_failed = False
        self._failure_reason: Optional[str] = None

    async def _get_session_id(self, force_refresh: bool = False) -> str:
        """Get or retrieve a session ID from the MCP server."""
        if self.session_id and not force_refresh:
            return self.session_id

        try:
            # Increase timeout for session ID retrieval - MemMachine may be slow
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.mcp_url,
                    headers={"Accept": "text/event-stream"},
                    timeout=15.0,  # Increased from 5.0 to 15.0 seconds
                )
                
                # Check if the endpoint exists
                if response.status_code == 404:
                    raise ValueError(
                        f"MemMachine MCP server endpoint not found at {self.mcp_url}. "
                        f"Please ensure the MemMachine MCP server is running. "
                        f"See MemMachine/README.md for setup instructions."
                    )
                
                # Check if we got a session ID (even if status is not 200)
                self.session_id = response.headers.get("mcp-session-id")
                
                # If we have a session ID, use it even if status is not 200 (some servers return 400 but still provide session)
                # This is expected behavior - MemMachine may return 400 but still provide a valid session ID
                if self.session_id:
                    # Only log if it's unexpected (not 200 or 400)
                    if response.status_code not in (200, 400):
                        # Unexpected status code, but we have a session ID so continue
                        pass
                    return self.session_id
                
                # If no session ID and status is not 200, raise error
                if response.status_code != 200:
                    raise ValueError(
                        f"MemMachine MCP server returned status {response.status_code} without a session ID. "
                        f"Please check if the server is running at {self.base_url}"
                    )
                
                # Should not reach here, but handle it
                raise ValueError(
                    f"MemMachine MCP server at {self.mcp_url} did not return a session ID. "
                    f"The server may not be properly configured or may be using a different protocol version."
                )
        except httpx.ConnectError as e:
            # Clear session ID on connection error
            self.session_id = None
            raise ValueError(
                f"Failed to connect to MemMachine MCP server at {self.base_url}. "
                f"Please ensure the server is running. Error: {str(e)}"
            )
        except httpx.TimeoutException:
            # Clear session ID on timeout
            self.session_id = None
            raise ValueError(
                f"Timeout connecting to MemMachine MCP server at {self.base_url}. "
                f"The server may be slow to respond or not running."
            )

    async def _initialize_session(self) -> None:
        """Initialize the MCP session."""
        # Skip if we've already failed to initialize
        if self._initialization_failed:
            raise ValueError(
                f"MemMachine MCP server initialization previously failed: {self._failure_reason}. "
                f"Please check the server status at {self.base_url}"
            )
        
        # Mark that we're attempting initialization
        self._initialization_attempted = True
        
        try:
            session_id = await self._get_session_id()
        except Exception as e:
            self._initialization_failed = True
            self._failure_reason = str(e)
            raise

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "aura-memory-backend",
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
            timeout=60.0,  # Increased timeout for initialization - MemMachine can be slow
        ) as response:
            # MemMachine may return 400 even when initialization works - check for result in SSE stream
            initialized = False
            init_error = None
            
            # Parse SSE response to check if initialization succeeded
            async for line in response.aiter_lines():
                if line:
                    line_str = line.decode("utf-8") if isinstance(line, bytes) else line
                    if line_str.startswith("event: message"):
                        continue
                    elif line_str.startswith("data:"):
                        try:
                            data = json.loads(line_str[5:].strip())
                            if "result" in data:
                                initialized = True
                                # Store the result for debugging if needed
                                break
                            elif "error" in data:
                                # If there's an error, store it but continue to check for result
                                init_error = data["error"]
                        except json.JSONDecodeError:
                            continue
            
            # Check if initialization failed
            if init_error:
                raise ValueError(f"MCP initialization error: {init_error}")
            
            if not initialized:
                # If status is not 200/400 or we didn't get a result, it's an error
                if response.status_code not in (200, 400):
                    raise ValueError(f"Failed to initialize session: HTTP {response.status_code}")
                else:
                    raise ValueError("Failed to initialize session: No result received in SSE stream")

            # Send initialized notification (required by MCP protocol)
            try:
                notif_response = await self.client.post(
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
                    timeout=10.0,
                )
                # Notification response status 202 is expected (Accepted)
                if notif_response.status_code not in (200, 202):
                    # Unexpected status, but notification failure is not critical
                    pass
            except Exception:
                # Notification failure is not critical - don't fail initialization
                pass

    async def _call_tool(
        self, tool_name: str, arguments: dict[str, Any], request_id: int = 1, force_refresh: bool = False
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
        # Ensure we have an initialized session before calling tools
        # If we don't have a session ID, initialize the session first
        if not self.session_id:
            await self._initialize_session()
        
        # Use the stored session ID (should be set by _initialize_session)
        if not self.session_id:
            raise ValueError("No session ID available. Session initialization may have failed.")
        
        session_id = self.session_id

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
            timeout=60.0,  # Increased timeout for tool calls - MemMachine can be slow
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                error_message = error_text.decode() if error_text else ""
                
                # If we got a 400 or 401, the session might be invalid - clear it and retry once
                if response.status_code in (400, 401) and not force_refresh:
                    # Session might be invalid, attempting to refresh session
                    self.session_id = None  # Clear invalid session
                    # Retry with a fresh session (only once)
                    try:
                        new_session_id = await self._get_session_id(force_refresh=True)
                        # Retry the call with new session
                        return await self._call_tool(tool_name, arguments, request_id=request_id)
                    except Exception as retry_error:
                        raise ValueError(
                            f"Failed to call tool {tool_name} even after session refresh: {response.status_code}, {error_message}. Retry error: {str(retry_error)}"
                        )
                
                raise ValueError(
                    f"Failed to call tool {tool_name}: {response.status_code}, {error_message}"
                )

            # Parse SSE response - MemMachine returns results in SSE stream
            result_found = False
            error_found = None
            all_lines = []
            
            async for line in response.aiter_lines():
                if line:
                    line_str = line.decode("utf-8") if isinstance(line, bytes) else line
                    all_lines.append(line_str)
                    
                    if line_str.startswith("event: message"):
                        continue
                    elif line_str.startswith("data:"):
                        try:
                            data = json.loads(line_str[5:].strip())
                            
                            # Check for errors first
                            if "error" in data:
                                error_found = data["error"]
                                # Don't break immediately - continue to check for result
                                continue
                            
                            # Check for result
                            if "result" in data:
                                result_found = True
                                result = data["result"]
                                
                                # Handle different result formats from MemMachine
                                # Format 1: List with text content [{"type": "text", "text": "{\"status\":200,...}"}]
                                if isinstance(result, list) and len(result) > 0:
                                    text_content = result[0].get("text", "")
                                    if text_content:
                                        try:
                                            # Try to parse JSON from text content
                                            parsed = json.loads(text_content)
                                            return parsed
                                        except json.JSONDecodeError:
                                            # If not JSON, return the text content as dict
                                            return {"status": 200, "message": text_content}
                                    # If no text, return the list itself
                                    return result
                                
                                # Format 2: Direct dict - check for structuredContent first (MemMachine format)
                                elif isinstance(result, dict):
                                    # MemMachine returns structuredContent which contains the actual result
                                    if "structuredContent" in result:
                                        return result["structuredContent"]
                                    # Check if it has nested content
                                    if "content" in result:
                                        content = result["content"]
                                        # Content can be a list of objects with text fields
                                        if isinstance(content, list) and len(content) > 0:
                                            # Extract text from first item if it's a list
                                            text_content = content[0].get("text", "")
                                            if text_content:
                                                try:
                                                    return json.loads(text_content)
                                                except json.JSONDecodeError:
                                                    return {"status": 200, "message": text_content}
                                        elif isinstance(content, dict):
                                            return content
                                        elif isinstance(content, str):
                                            try:
                                                return json.loads(content)
                                            except json.JSONDecodeError:
                                                return {"status": 200, "message": content}
                                    # Return dict as-is if no nested structure
                                    return result
                                
                                # Format 3: Other formats - return as-is
                                return result
                                
                        except json.JSONDecodeError as e:
                            # Log but continue - might be partial data
                            continue
            
            # If we found an error, raise it with detailed information
            if error_found:
                error_code = error_found.get("code", -1)
                error_message = error_found.get("message", "Unknown error")
                error_data = error_found.get("data", "")
                
                # Provide helpful error messages based on error code
                if error_code == -32602:  # Invalid params
                    raise ValueError(
                        f"MCP error: Invalid request parameters for tool '{tool_name}'. "
                        f"Error code: {error_code}, Message: {error_message}. "
                        f"Data: {error_data}. "
                        f"Arguments sent: {json.dumps(arguments, indent=2)}. "
                        f"Please check that all required parameters are provided in the correct format."
                    )
                elif error_code == -32603:  # Internal error
                    raise ValueError(
                        f"MCP error: Internal server error for tool '{tool_name}'. "
                        f"Error: {error_message}. Data: {error_data}"
                    )
                else:
                    raise ValueError(f"MCP error for tool '{tool_name}': {error_found}")

            # If no result and no error, that's unexpected
            if not result_found:
                raise ValueError(
                    f"No result found in response for tool '{tool_name}'. "
                    f"Response status: {response.status_code}. "
                    f"Received {len(all_lines)} lines in SSE stream. "
                    f"The server may not have returned a valid response."
                )

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
        # Always ensure session is initialized before calling tools
        if not self.session_id or self._initialization_failed:
            try:
                # Clear failure state and retry initialization
                if self._initialization_failed:
                    self._initialization_failed = False
                    self._failure_reason = None
                    self.session_id = None
                await self._initialize_session()
            except Exception as e:
                self._initialization_failed = True
                self._failure_reason = str(e)
                raise ValueError(f"MemMachine unavailable: {e}") from e
        
        user_id = user_id or self.user_id

        # Ensure we have valid parameters
        if not content or not content.strip():
            raise ValueError("Memory content cannot be empty")
        if not user_id or not user_id.strip():
            raise ValueError("User ID cannot be empty")

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
        # Always ensure session is initialized before calling tools
        if not self.session_id or self._initialization_failed:
            try:
                # Clear failure state and retry initialization
                if self._initialization_failed:
                    self._initialization_failed = False
                    self._failure_reason = None
                    self.session_id = None
                await self._initialize_session()
            except Exception as e:
                self._initialization_failed = True
                self._failure_reason = str(e)
                raise ValueError(f"MemMachine unavailable: {e}") from e
        
        user_id = user_id or self.user_id

        # Ensure we have valid parameters
        if not query or not query.strip():
            raise ValueError("Search query cannot be empty")
        if not user_id or not user_id.strip():
            raise ValueError("User ID cannot be empty")
        if limit < 1 or limit > 50:
            limit = max(1, min(50, limit))  # Clamp to valid range

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
        # Don't initialize session eagerly - let it initialize on first use
        # This allows the app to start even if MemMachine is not available
    return _memmachine_client

async def close_memmachine_client() -> None:
    """Close the global MemMachine MCP client."""
    global _memmachine_client
    if _memmachine_client:
        await _memmachine_client.close()
        _memmachine_client = None

