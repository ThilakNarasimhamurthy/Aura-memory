"""Entry point for the FastAPI application."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, customers, email, health, langchain_rag, memories, phone_calls
from app.config import get_settings
from app.database import lifespan_context
from app.services.memmachine_client import close_memmachine_client

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context for managing resources."""
    # Startup - MongoDB
    async with lifespan_context(app):
        # Startup - Check MemMachine availability (optional but recommended)
        try:
            import httpx
            mcp_url = settings.memmachine_mcp_url
            async with httpx.AsyncClient(timeout=3.0) as client:
                # Try health endpoint first (more reliable)
                try:
                    health_response = await client.get(f"{mcp_url}/health", timeout=2.0)
                    if health_response.status_code != 200:
                        # Try MCP endpoint as fallback
                        response = await client.get(
                            f"{mcp_url}/mcp/",
                            headers={"Accept": "text/event-stream"},
                            timeout=3.0
                        )
                except httpx.HTTPStatusError:
                    # Health endpoint might not exist, try MCP endpoint
                    response = await client.get(
                        f"{mcp_url}/mcp/",
                        headers={"Accept": "text/event-stream"},
                        timeout=3.0
                    )
        except (httpx.ConnectError, Exception):
            # MemMachine is optional - continue without it
            pass

        # MemMachine client will be initialized on first use
        yield
        # Shutdown - MemMachine
        await close_memmachine_client()
    # MongoDB cleanup handled by lifespan_context

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Configure CORS
# For development: Allow all origins (including local network IPs)
# In production, restrict this to specific domains
import os
is_development = os.getenv("ENVIRONMENT", "development").lower() == "development"

# Get local network IP if available (for development)
# This allows access from mobile devices or other machines on the same network
local_origins = [
    "http://localhost:5173",  # Frontend (Vite default)
    "http://localhost:3000",  # Alternative frontend port
    "http://localhost:8080",  # Legacy frontend port
    "http://localhost:8090",  # MemMachine MCP
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8090",
]

if is_development:
    # Development: Allow common local network IPs (192.168.x.x and 10.x.x.x)
    # Also allow all origins but with credentials disabled (required for "*")
    # For development, we'll use a more permissive approach
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development (for local network access)
        allow_credentials=False,  # Must be False when using "*" (FastAPI requirement)
        allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
        allow_headers=["*"],  # Allow all headers
        expose_headers=["*"],  # Expose all headers
    )
else:
    # Production: Restrict to specific origins with credentials enabled
    app.add_middleware(
        CORSMiddleware,
        allow_origins=local_origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
        allow_headers=["*"],  # Allow all headers
        expose_headers=["*"],  # Expose all headers
    )

# Include routers
app.include_router(health.router)
app.include_router(memories.router)
app.include_router(langchain_rag.router)
app.include_router(phone_calls.router)
app.include_router(email.router)
app.include_router(customers.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

