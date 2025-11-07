#!/usr/bin/env python3
"""Test script to debug document upload."""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

print("Testing LangChain RAG Service...")
print(f"OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")

try:
    from app.services.langchain_rag_service import LangChainRAGService
    from app.database import get_database
    
    print("\n1. Testing service initialization...")
    service = LangChainRAGService(db=get_database())
    print(f"   ✓ Service initialized")
    print(f"   Collection: {service.collection_name}")
    
    print("\n2. Testing embedding generation...")
    test_text = "This is a test document"
    embedding = service.embeddings.embed_query(test_text)
    print(f"   ✓ Embedding generated: {len(embedding)} dimensions")
    
    print("\n3. Testing document storage...")
    result = service.store_documents(
        texts=[test_text],
        source="test"
    )
    print(f"   ✓ Document stored: {result}")
    
    print("\n✅ All tests passed!")
    
except Exception as e:
    import traceback
    print(f"\n❌ Error: {e}")
    print(f"\nTraceback:\n{traceback.format_exc()}")
    sys.exit(1)

