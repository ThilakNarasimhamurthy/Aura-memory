"""Customer API endpoints for querying structured data directly from MongoDB."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.database import get_database

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", summary="Get customers from structured data")
async def get_customers(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of customers to return (default: 100, max: 1000 for performance)"),
    skip: int = Query(0, ge=0, description="Number of customers to skip"),
    segment: Optional[str] = Query(None, description="Filter by customer segment"),
    db: Database = Depends(get_database),
) -> dict[str, Any]:
    """
    Get customers from structured MongoDB collection.
    
    This endpoint queries the customers collection directly,
    not the RAG chunks collection.
    """
    try:
        collection = db["customers"]
        
        # Build query filter
        query_filter = {}
        if segment:
            query_filter["customer_segment"] = segment
        
        # Get total count with timeout protection
        try:
            total = collection.count_documents(query_filter, maxTimeMS=5000)  # 5 second max for count
        except Exception as count_error:
            # If count times out, estimate from sample or use a reasonable default
            try:
                total = collection.estimated_document_count()
            except Exception:
                total = limit + skip  # Fallback estimate
        
        # Get customers with timeout protection
        # Limit to prevent slow queries - MongoDB queries can hang without timeout
        cursor = collection.find(query_filter).sort("total_spent", -1).skip(skip).limit(limit)
        
        # Add timeout to prevent hanging on large queries
        customers = []
        try:
            # max_time_ms prevents the query from running indefinitely
            customers = list(cursor.max_time_ms(10000))  # 10 second max for query execution
        except Exception as query_error:
            # If query times out, return error with helpful message
            error_msg = str(query_error)
            if "operation exceeded time limit" in error_msg.lower() or "timed out" in error_msg.lower():
                raise HTTPException(
                    status_code=504,
                    detail=f"Query timeout: Requested {limit} customers but query took longer than 10 seconds. Try a smaller limit (max 1000) or use pagination with skip parameter."
                )
            # Re-raise other exceptions
            raise
        
        # Remove MongoDB _id and convert to dict
        for customer in customers:
            customer["id"] = str(customer.pop("_id"))
        
        return {
            "success": True,
            "customers": customers,
            "total": total,
            "limit": limit,
            "skip": skip,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customers: {str(e)}")


@router.get("/{customer_id}", summary="Get customer by ID")
async def get_customer(
    customer_id: str,
    db: Database = Depends(get_database),
) -> dict[str, Any]:
    """Get a specific customer by ID from structured data."""
    try:
        collection = db["customers"]
        customer = collection.find_one({"customer_id": customer_id})
        
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        
        customer["id"] = str(customer.pop("_id"))
        
        return {
            "success": True,
            "customer": customer,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer: {str(e)}")


@router.get("/stats/summary", summary="Get customer statistics")
async def get_customer_stats(
    db: Database = Depends(get_database),
) -> dict[str, Any]:
    """Get aggregated customer statistics from structured data."""
    try:
        collection = db["customers"]
        
        # Get total customers
        total_customers = collection.count_documents({})
        
        # Get customers by segment
        segments = collection.aggregate([
            {"$group": {"_id": "$customer_segment", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ])
        segment_counts = {seg["_id"]: seg["count"] for seg in segments}
        
        # Get total revenue
        revenue_stats = collection.aggregate([
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_spent"},
                "avg_revenue": {"$avg": "$total_spent"},
                "max_revenue": {"$max": "$total_spent"},
                "min_revenue": {"$min": "$total_spent"},
            }}
        ])
        revenue_data = list(revenue_stats)
        revenue = revenue_data[0] if revenue_data else {}
        
        # Get loyalty member stats
        loyalty_stats = collection.aggregate([
            {"$group": {
                "_id": "$loyalty_member",
                "count": {"$sum": 1},
                "avg_points": {"$avg": "$loyalty_points"},
            }}
        ])
        loyalty_data = {str(stat["_id"]): stat for stat in loyalty_stats}
        
        return {
            "success": True,
            "total_customers": total_customers,
            "segments": segment_counts,
            "revenue": {
                "total": revenue.get("total_revenue", 0),
                "average": revenue.get("avg_revenue", 0),
                "max": revenue.get("max_revenue", 0),
                "min": revenue.get("min_revenue", 0),
            },
            "loyalty": loyalty_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer stats: {str(e)}")

