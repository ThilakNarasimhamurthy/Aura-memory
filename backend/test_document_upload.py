#!/usr/bin/env python3
"""Test script to diagnose document upload errors."""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

print("Testing document upload...")
print(f"MONGODB_URI: {'Set' if os.getenv('MONGODB_URI') else 'NOT SET'}")
print(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")

try:
    from app.database import get_database
    print("✓ Database module imported")
    
    db = get_database()
    print(f"✓ Database connection: {db.name}")
    
    from app.services.langchain_rag_service import LangChainRAGService
    print("✓ LangChain RAG service module imported")
    
    # Try to initialize the service
    try:
        rag_service = LangChainRAGService(db=db)
        print("✓ LangChain RAG service initialized")
        
        # Try to store a test document
        try:
            result = rag_service.store_documents(
                texts=["Test document"],
                metadatas=[{"test": "metadata"}],
                source="test"
            )
            print(f"✓ Document stored successfully: {result}")
        except Exception as e:
            print(f"✗ Error storing document: {e}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"✗ Error initializing RAG service: {e}")
        import traceback
        traceback.print_exc()
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

