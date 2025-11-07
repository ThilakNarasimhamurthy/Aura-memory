#!/usr/bin/env python3
"""Script to upload documents to MongoDB via the RAG API."""

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


def upload_text(text: str, source: str, metadata: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Upload a single text document."""
    url = f"{API_BASE_URL}/langchain-rag/documents"
    
    payload = {
        "texts": [text],
        "source": source,
    }
    
    if metadata:
        payload["metadatas"] = [metadata]
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()


def upload_file(file_path: str, source: Optional[str] = None, metadata: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Upload a text file."""
    file_path_obj = Path(file_path)
    
    if not file_path_obj.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Read file content
    with open(file_path_obj, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Use filename as source if not provided
    source = source or file_path_obj.name
    
    # Add file metadata
    file_metadata = {
        "filename": file_path_obj.name,
        "file_path": str(file_path_obj),
        "file_size": file_path_obj.stat().st_size,
        **(metadata or {})
    }
    
    return upload_text(content, source, file_metadata)


def upload_directory(directory_path: str, pattern: str = "*.txt", metadata: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
    """Upload all matching files from a directory."""
    dir_path = Path(directory_path)
    
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory_path}")
    
    files = list(dir_path.glob(pattern))
    results = []
    
    print(f"Found {len(files)} files to upload...")
    
    for file_path in files:
        try:
            print(f"Uploading: {file_path.name}...")
            result = upload_file(str(file_path), metadata=metadata)
            results.append({"file": str(file_path), "result": result})
            print(f"✓ Uploaded: {file_path.name} ({result.get('chunk_count', 0)} chunks)")
        except Exception as e:
            print(f"✗ Error uploading {file_path.name}: {e}")
            results.append({"file": str(file_path), "error": str(e)})
    
    return results


def upload_json_documents(json_file: str) -> list[dict[str, Any]]:
    """Upload documents from a JSON file.
    
    JSON format:
    [
        {
            "text": "Document content...",
            "source": "source-name",
            "metadata": {"title": "Document Title", ...}
        },
        ...
    ]
    """
    json_path = Path(json_file)
    
    if not json_path.exists():
        raise FileNotFoundError(f"File not found: {json_file}")
    
    with open(json_path, "r", encoding="utf-8") as f:
        documents = json.load(f)
    
    results = []
    
    print(f"Found {len(documents)} documents to upload...")
    
    for i, doc in enumerate(documents):
        try:
            text = doc.get("text") or doc.get("content")
            source = doc.get("source", f"document-{i}")
            metadata = doc.get("metadata", {})
            
            if not text:
                print(f"✗ Skipping document {i}: No text/content field")
                continue
            
            print(f"Uploading document {i+1}/{len(documents)}: {source}...")
            result = upload_text(text, source, metadata)
            results.append({"document": i, "source": source, "result": result})
            print(f"✓ Uploaded: {source} ({result.get('chunk_count', 0)} chunks)")
        except Exception as e:
            print(f"✗ Error uploading document {i}: {e}")
            results.append({"document": i, "error": str(e)})
    
    return results


def upload_batch(texts: list[str], source: str, metadatas: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
    """Upload multiple texts in a single batch."""
    url = f"{API_BASE_URL}/langchain-rag/documents"
    
    payload = {
        "texts": texts,
        "source": source,
    }
    
    if metadatas:
        payload["metadatas"] = metadatas
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()


def main():
    """Main function for command-line usage."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Upload single file:        python upload_documents.py <file_path>")
        print("  Upload directory:          python upload_documents.py --dir <directory> [--pattern '*.txt']")
        print("  Upload JSON documents:     python upload_documents.py --json <json_file>")
        print("  Upload text directly:      python upload_documents.py --text 'Your text here' --source 'source-name'")
        print("\nExamples:")
        print("  python upload_documents.py documents/sample.txt")
        print("  python upload_documents.py --dir documents/ --pattern '*.txt'")
        print("  python upload_documents.py --json documents.json")
        print("  python upload_documents.py --text 'FastAPI is great' --source 'fastapi-docs'")
        sys.exit(1)
    
    try:
        if sys.argv[1] == "--dir":
            # Upload directory
            directory = sys.argv[2] if len(sys.argv) > 2 else "."
            pattern = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--pattern" else "*.txt"
            results = upload_directory(directory, pattern)
            print(f"\n✓ Uploaded {len([r for r in results if 'result' in r])} files")
        
        elif sys.argv[1] == "--json":
            # Upload from JSON
            json_file = sys.argv[2] if len(sys.argv) > 2 else "documents.json"
            results = upload_json_documents(json_file)
            print(f"\n✓ Uploaded {len([r for r in results if 'result' in r])} documents")
        
        elif sys.argv[1] == "--text":
            # Upload text directly
            text = sys.argv[2] if len(sys.argv) > 2 else ""
            source = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--source" else "manual-upload"
            
            if not text:
                print("Error: --text requires text content")
                sys.exit(1)
            
            result = upload_text(text, source)
            print(f"\n✓ Uploaded: {result.get('chunk_count', 0)} chunks")
        
        else:
            # Upload single file
            file_path = sys.argv[1]
            result = upload_file(file_path)
            print(f"\n✓ Uploaded: {result.get('chunk_count', 0)} chunks")
            print(f"  Document count: {result.get('document_count', 0)}")
            print(f"  Chunk count: {result.get('chunk_count', 0)}")
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

