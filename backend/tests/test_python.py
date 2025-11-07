#!/usr/bin/env python3
"""Quick test to verify Python and dependencies are working."""

import sys

print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"Python path: {sys.path[:3]}...")

# Test imports
try:
    import fastapi
    print(f"✓ FastAPI {fastapi.__version__} installed")
except ImportError as e:
    print(f"✗ FastAPI not installed: {e}")

try:
    import pymongo
    print(f"✓ PyMongo {pymongo.__version__} installed")
except ImportError as e:
    print(f"✗ PyMongo not installed: {e}")

try:
    import pydantic
    print(f"✓ Pydantic {pydantic.__version__} installed")
except ImportError as e:
    print(f"✗ Pydantic not installed: {e}")

try:
    import pydantic_settings
    print(f"✓ Pydantic-settings installed")
except ImportError as e:
    print(f"✗ Pydantic-settings not installed: {e}")

try:
    import uvicorn
    print(f"✓ Uvicorn {uvicorn.__version__} installed")
except ImportError as e:
    print(f"✗ Uvicorn not installed: {e}")

# Test local imports
try:
    from config import get_settings
    print("✓ Local config module imports successfully")
except Exception as e:
    print(f"✗ Config import failed: {e}")

try:
    from database import get_client
    print("✓ Local database module imports successfully")
except Exception as e:
    print(f"✗ Database import failed: {e}")

print("\nPython is ready!" if "✗" not in open(__file__).read() else "\nSome issues found - check above")

