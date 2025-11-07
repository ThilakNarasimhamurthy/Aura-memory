#!/usr/bin/env python3
"""Quick script to verify the server is running."""

import requests
import sys

try:
    response = requests.get("http://localhost:8000/health", timeout=2)
    if response.status_code == 200:
        print("✓ Server is running!")
        print(f"  Response: {response.json()}")
        print("\nAvailable endpoints:")
        print("  - Health: http://localhost:8000/health")
        print("  - API Docs: http://localhost:8000/docs")
        print("  - Collections: http://localhost:8000/documents")
        sys.exit(0)
    else:
        print(f"✗ Server returned status {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("✗ Server is not running or not accessible on port 8000")
    print("\nTo start the server, run:")
    print("  cd /Users/thilaknarasimhamurthy/Desktop/ELL/backend")
    print("  python3 -m uvicorn app.main:app --reload")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

