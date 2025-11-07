#!/usr/bin/env python3
"""Simple script to run the server with correct module path."""

import os
import sys
from pathlib import Path

if __name__ == "__main__":
    import uvicorn
    
    # Ensure we're in the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Add current directory to Python path
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    
    # Run uvicorn with correct module path
    print("Starting server with module: app.main:app")
    print(f"Working directory: {os.getcwd()}")
    print(f"Python path includes: {backend_dir}")
    print("\nServer starting at http://localhost:8000")
    print("API docs at http://localhost:8000/docs\n")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir / "app")],
    )

