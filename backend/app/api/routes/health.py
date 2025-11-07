"""Health check and utility endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.database import get_client, get_database

router = APIRouter(tags=["Health"])

settings = get_settings()


@router.get("/health", summary="Service health check")
async def health() -> dict[str, str]:
    """Return application health and MongoDB connectivity status."""
    try:
        get_client().admin.command("ping")
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=503, detail="MongoDB unavailable") from exc

    return {"status": "ok", "database": settings.mongodb_database}


@router.get("/documents", summary="List collection names")
async def list_collections() -> dict[str, list[str]]:
    """Example endpoint that lists all collection names in the configured database."""
    db = get_database()
    return {"collections": db.list_collection_names()}

