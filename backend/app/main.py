"""Entry point for the FastAPI application."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, langchain_rag, memories, phone_calls
from app.config import get_settings
from app.database import lifespan_context
from app.services.memmachine_client import close_memmachine_client

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context for managing resources."""
    # Startup - MongoDB
    async with lifespan_context(app):
        # Startup - Check MemMachine availability (MemMachine is required)
        try:
            import httpx
            mcp_url = settings.memmachine_mcp_url
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{mcp_url}/mcp/",
                    headers={"Accept": "text/event-stream"},
                    timeout=5.0
                )
                if response.status_code in [200, 404]:
                    print(f"✅ MemMachine MCP server is accessible at {mcp_url}")
                else:
                    print(f"⚠️  Warning: MemMachine MCP server at {mcp_url} returned status {response.status_code}")
                    print(f"   MemMachine is required. Please ensure the server is running correctly.")
        except httpx.ConnectError:
            print(f"❌ ERROR: MemMachine MCP server is not accessible at {settings.memmachine_mcp_url}")
            print(f"   MemMachine is REQUIRED for this application.")
            print(f"   Please start the MemMachine MCP server. See MemMachine/QUICK_START.md for setup instructions.")
        except Exception as e:
            print(f"⚠️  Warning: Could not verify MemMachine MCP server: {e}")
            print(f"   MemMachine is required. Please ensure the server is running at {settings.memmachine_mcp_url}")
        
        # MemMachine client will be initialized on first use
        yield
        # Shutdown - MemMachine
        await close_memmachine_client()
    # MongoDB cleanup handled by lifespan_context


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],  # Frontend origins
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

