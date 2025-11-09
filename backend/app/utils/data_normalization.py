"""Data normalization utilities for ensuring consistent data types in API responses."""

from __future__ import annotations

from typing import Any


def normalize_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize metadata to ensure consistent data types.
    
    Converts:
    - Numeric strings to numbers
    - Booleans to appropriate string format
    - Ensures customer_id is string
    - Normalizes loyalty_member to "Yes"/"No"
    
    Args:
        metadata: Raw metadata dictionary from MongoDB
        
    Returns:
        Normalized metadata with proper types
    """
    normalized = metadata.copy()
    
    # Float fields (monetary values, rates, scores)
    float_fields = [
        "total_spent",
        "lifetime_value",
        "avg_order_value",
        "churn_risk_score",
        "satisfaction_score",
        "email_open_rate",
        "email_click_rate",
        "sms_response_rate",
        "video_completion_rate",
        "repeat_purchase_rate",
    ]
    
    # Integer fields (counts)
    int_fields = [
        "total_purchases",
        "converted_campaigns",
        "responded_to_campaigns",
        "clicked_campaigns",
        "referrals_made",
        "app_downloads",
        "store_visits",
        "phone_calls",
        "social_shares",
        "loyalty_points",
        "purchase_frequency_days",
        "days_since_last_purchase",
    ]
    
    # Convert float fields
    for field in float_fields:
        if field in normalized:
            value = normalized[field]
            if value is not None:
                try:
                    normalized[field] = float(value)
                except (ValueError, TypeError):
                    # If conversion fails, keep original value
                    pass
    
    # Convert integer fields
    for field in int_fields:
        if field in normalized:
            value = normalized[field]
            if value is not None:
                try:
                    normalized[field] = int(float(value))
                except (ValueError, TypeError):
                    # If conversion fails, keep original value
                    pass
    
    # Normalize loyalty_member: Convert boolean to "Yes"/"No" string
    if "loyalty_member" in normalized:
        value = normalized["loyalty_member"]
        if isinstance(value, bool):
            normalized["loyalty_member"] = "Yes" if value else "No"
        elif isinstance(value, str):
            # Handle string booleans
            if value.lower() in ["true", "yes", "1"]:
                normalized["loyalty_member"] = "Yes"
            elif value.lower() in ["false", "no", "0"]:
                normalized["loyalty_member"] = "No"
        elif value:
            normalized["loyalty_member"] = "Yes"
        else:
            normalized["loyalty_member"] = "No"
    
    # Ensure customer_id is string
    if "customer_id" in normalized:
        normalized["customer_id"] = str(normalized["customer_id"])
    
    # Normalize boolean fields to strings where needed
    boolean_string_fields = [
        "newsletter_subscriber",
        "push_notifications_enabled",
        "social_media_follower",
    ]
    
    for field in boolean_string_fields:
        if field in normalized:
            value = normalized[field]
            if isinstance(value, bool):
                normalized[field] = "Yes" if value else "No"
            elif isinstance(value, str):
                if value.lower() in ["true", "yes", "1"]:
                    normalized[field] = "Yes"
                elif value.lower() in ["false", "no", "0"]:
                    normalized[field] = "No"
    
    return normalized


def normalize_customer_summary(metadata: dict[str, Any]) -> dict[str, Any]:
    """
    Create a normalized customer summary from metadata.
    
    Args:
        metadata: Customer metadata dictionary
        
    Returns:
        Dictionary with id, name, email fields
    """
    normalized_meta = normalize_metadata(metadata)
    
    summary: dict[str, Any] = {}
    
    # Always include id if available
    if "customer_id" in normalized_meta:
        summary["id"] = str(normalized_meta["customer_id"])
    
    # Include name if available
    if "first_name" in normalized_meta and "last_name" in normalized_meta:
        summary["name"] = f"{normalized_meta['first_name']} {normalized_meta['last_name']}"
    elif "first_name" in normalized_meta:
        summary["name"] = normalized_meta["first_name"]
    elif "last_name" in normalized_meta:
        summary["name"] = normalized_meta["last_name"]
    
    # Always include email if available
    if "email" in normalized_meta:
        summary["email"] = normalized_meta["email"]
    
    return summary

