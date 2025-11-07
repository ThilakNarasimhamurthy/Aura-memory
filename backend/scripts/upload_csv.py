#!/usr/bin/env python3
"""Script to upload CSV data to MongoDB via the RAG API."""

import csv
import json
import os
import sys
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


def csv_row_to_text(row: dict[str, Any], include_all_fields: bool = True) -> str:
    """Convert a CSV row to a searchable text document."""
    # Build a natural language description of the customer
    parts = []
    
    # Basic info
    if "first_name" in row and "last_name" in row:
        name = f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
        if name:
            parts.append(f"Customer: {name}")
    
    if "email" in row and row.get("email"):
        parts.append(f"Email: {row['email']}")
    
    if "customer_id" in row:
        parts.append(f"Customer ID: {row['customer_id']}")
    
    # Customer segment and status
    if "customer_segment" in row and row.get("customer_segment"):
        parts.append(f"Segment: {row['customer_segment']}")
    
    if "loyalty_member" in row:
        loyalty_status = "Loyalty Member" if str(row.get("loyalty_member", "")).lower() == "true" else "Not a Loyalty Member"
        parts.append(loyalty_status)
        if "loyalty_points" in row and row.get("loyalty_points"):
            parts.append(f"Loyalty Points: {row['loyalty_points']}")
    
    # Purchase information
    if "total_purchases" in row and row.get("total_purchases"):
        parts.append(f"Total Purchases: {row['total_purchases']}")
    
    if "total_spent" in row and row.get("total_spent"):
        parts.append(f"Total Spent: ${row['total_spent']}")
    
    if "avg_order_value" in row and row.get("avg_order_value"):
        parts.append(f"Average Order Value: ${row['avg_order_value']}")
    
    if "lifetime_value" in row and row.get("lifetime_value"):
        parts.append(f"Lifetime Value: ${row['lifetime_value']}")
    
    # Preferences
    if "favorite_product_category" in row and row.get("favorite_product_category"):
        parts.append(f"Favorite Product Category: {row['favorite_product_category']}")
    
    if "preferred_contact_method" in row and row.get("preferred_contact_method"):
        parts.append(f"Preferred Contact Method: {row['preferred_contact_method']}")
    
    if "location" in row and row.get("location"):
        parts.append(f"Location: {row['location']}")
    
    if "age_range" in row and row.get("age_range"):
        parts.append(f"Age Range: {row['age_range']}")
    
    # Engagement metrics
    if "satisfaction_score" in row and row.get("satisfaction_score"):
        parts.append(f"Satisfaction Score: {row['satisfaction_score']}/5.0")
    
    if "churn_risk_score" in row and row.get("churn_risk_score"):
        churn_score = float(row['churn_risk_score']) if row['churn_risk_score'] else 0.0
        parts.append(f"Churn Risk Score: {churn_score:.2f}")
    
    if "purchase_frequency_days" in row and row.get("purchase_frequency_days"):
        parts.append(f"Purchase Frequency: Every {row['purchase_frequency_days']} days")
    
    # Campaign engagement (critical for campaign targeting and effectiveness)
    if "responded_to_campaigns" in row and row.get("responded_to_campaigns"):
        parts.append(f"Responded to {row['responded_to_campaigns']} campaigns")
    
    if "converted_campaigns" in row and row.get("converted_campaigns"):
        parts.append(f"Converted {row['converted_campaigns']} campaigns")
    
    if "clicked_campaigns" in row and row.get("clicked_campaigns"):
        parts.append(f"Clicked {row['clicked_campaigns']} campaigns")
    
    if "email_open_rate" in row and row.get("email_open_rate"):
        parts.append(f"Email Open Rate: {row['email_open_rate']}%")
    
    if "email_click_rate" in row and row.get("email_click_rate"):
        parts.append(f"Email Click Rate: {row['email_click_rate']}%")
    
    if "sms_response_rate" in row and row.get("sms_response_rate"):
        parts.append(f"SMS Response Rate: {row['sms_response_rate']}%")
    
    # Dates
    if "signup_date" in row and row.get("signup_date"):
        parts.append(f"Signup Date: {row['signup_date']}")
    
    if "last_purchase_date" in row and row.get("last_purchase_date"):
        parts.append(f"Last Purchase: {row['last_purchase_date']}")
    
    if "days_since_last_purchase" in row and row.get("days_since_last_purchase"):
        parts.append(f"Days Since Last Purchase: {row['days_since_last_purchase']}")
    
    # Include all other fields if requested
    if include_all_fields:
        other_fields = []
        excluded_fields = {
            "first_name", "last_name", "email", "customer_id", "customer_segment",
            "loyalty_member", "loyalty_points", "total_purchases", "total_spent",
            "avg_order_value", "lifetime_value", "favorite_product_category",
            "preferred_contact_method", "location", "age_range", "satisfaction_score",
            "churn_risk_score", "purchase_frequency_days", "responded_to_campaigns",
            "converted_campaigns", "clicked_campaigns", "email_open_rate", "email_click_rate",
            "sms_response_rate", "signup_date", "last_purchase_date", "days_since_last_purchase"
        }
        
        for key, value in row.items():
            if key not in excluded_fields and value and str(value).strip():
                other_fields.append(f"{key.replace('_', ' ').title()}: {value}")
        
        if other_fields:
            parts.append("\nAdditional Information:")
            parts.extend(other_fields)
    
    return "\n".join(parts)


def upload_csv(
    csv_file: str,
    source: Optional[str] = None,
    batch_size: int = 10,
    include_all_fields: bool = True,
) -> list[dict[str, Any]]:
    """Upload CSV file to MongoDB via RAG API.
    
    Args:
        csv_file: Path to CSV file
        source: Source identifier (defaults to filename)
        batch_size: Number of rows to upload per batch
        include_all_fields: Whether to include all CSV fields in the text
    
    Returns:
        List of upload results
    """
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file}")
    
    source = source or csv_path.stem
    
    # Read CSV file
    texts = []
    metadatas = []
    
    print(f"Reading CSV file: {csv_path.name}...")
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        total_rows = 0
        
        for i, row in enumerate(reader):
            # Convert row to text
            text = csv_row_to_text(row, include_all_fields=include_all_fields)
            texts.append(text)
            
            # Create metadata from row
            metadata = {
                "row_number": i + 1,
                "csv_source": str(csv_path.name),
                **{k: v for k, v in row.items() if v and str(v).strip()}
            }
            metadatas.append(metadata)
            total_rows += 1
    
    print(f"✓ Read {total_rows} rows from CSV")
    print(f"Uploading in batches of {batch_size}...")
    
    # Upload in batches
    results = []
    url = f"{API_BASE_URL}/langchain-rag/documents"
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(texts) + batch_size - 1) // batch_size
        
        try:
            print(f"Uploading batch {batch_num}/{total_batches} ({len(batch_texts)} rows)...")
            
            response = requests.post(
                url,
                json={
                    "texts": batch_texts,
                    "source": f"{source}-batch-{batch_num}",
                    "metadatas": batch_metadatas,
                },
                timeout=60.0,
            )
            
            response.raise_for_status()
            result = response.json()
            
            results.append({
                "batch": batch_num,
                "rows": len(batch_texts),
                "chunks": result.get("chunk_count", 0),
                "success": True,
            })
            
            print(f"✓ Batch {batch_num}: {result.get('chunk_count', 0)} chunks created")
        
        except Exception as e:
            print(f"✗ Error uploading batch {batch_num}: {e}")
            results.append({
                "batch": batch_num,
                "rows": len(batch_texts),
                "success": False,
                "error": str(e),
            })
    
    return results


def main():
    """Main function for command-line usage."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python upload_csv.py <csv_file> [--source source_name] [--batch-size N]")
        print("\nOptions:")
        print("  --source NAME        Source identifier (defaults to CSV filename)")
        print("  --batch-size N       Number of rows per batch (default: 10)")
        print("  --no-all-fields      Don't include all CSV fields in text")
        print("\nExamples:")
        print("  python upload_csv.py customer_data.csv")
        print("  python upload_csv.py customer_data.csv --source customers")
        print("  python upload_csv.py customer_data.csv --batch-size 20")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    source = None
    batch_size = 10
    include_all_fields = True
    
    # Parse arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--source" and i + 1 < len(sys.argv):
            source = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--batch-size" and i + 1 < len(sys.argv):
            batch_size = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--no-all-fields":
            include_all_fields = False
            i += 1
        else:
            i += 1
    
    try:
        print(f"Uploading CSV: {csv_file}")
        print(f"Batch size: {batch_size}")
        print(f"Include all fields: {include_all_fields}")
        print()
        
        results = upload_csv(
            csv_file,
            source=source,
            batch_size=batch_size,
            include_all_fields=include_all_fields,
        )
        
        # Summary
        successful = [r for r in results if r.get("success")]
        failed = [r for r in results if not r.get("success")]
        
        print()
        print("=" * 50)
        print("Upload Summary")
        print("=" * 50)
        print(f"Total batches: {len(results)}")
        print(f"Successful: {len(successful)}")
        print(f"Failed: {len(failed)}")
        
        if successful:
            total_chunks = sum(r.get("chunks", 0) for r in successful)
            total_rows = sum(r.get("rows", 0) for r in successful)
            print(f"Total rows uploaded: {total_rows}")
            print(f"Total chunks created: {total_chunks}")
        
        if failed:
            print(f"\nFailed batches: {[r['batch'] for r in failed]}")
        
        print()
        print("✓ Upload complete!")
        print(f"\nYou can now search your data at:")
        print(f"  POST {API_BASE_URL}/langchain-rag/documents/search")
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

