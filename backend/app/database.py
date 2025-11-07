"""MongoDB database utilities."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_mongo_uri, get_settings

_client: MongoClient | None = None


def _create_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(get_mongo_uri())


def get_client() -> MongoClient:
    """Return a singleton MongoClient instance."""

    global _client
    if _client is None:
        _client = _create_client()
    return _client


def get_database(db_name: str | None = None) -> Database:
    """Fetch a database handle using the configured default name."""

    name = db_name or get_settings().mongodb_database
    return get_client()[name]


@asynccontextmanager
async def lifespan_context(app) -> AsyncIterator[None]:
    """FastAPI lifespan context for managing MongoDB client lifecycle."""
    # Startup
    global _client
    if _client is None:
        _client = _create_client()
    
    yield
    
    # Shutdown
    if _client is not None:
        _client.close()
        _client = None

