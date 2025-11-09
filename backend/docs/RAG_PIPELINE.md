# RAG Pipeline Documentation

This document describes the RAG (Retrieval-Augmented Generation) pipeline implementation that combines MongoDB document storage with MemMachine memory retrieval and LLM generation.

## Architecture

The RAG pipeline consists of three main components:

1. **MongoDB**: Document storage and retrieval
2. **MemMachine**: Semantic memory search and contextual retrieval
3. **LLM Service**: Answer generation (optional, requires API key)

## Components

### 1. RAG Service (`rag_service.py`)

The `RAGService` class handles:
- **Document Storage**: Stores documents in MongoDB with chunking support
- **Document Search**: Semantic search using MemMachine
- **Context Retrieval**: Combines documents and memories for RAG

#### Key Methods:

- `store_document()`: Store documents with automatic chunking
- `search_documents()`: Search documents using semantic search
- `retrieve_for_rag()`: Retrieve context for RAG queries
- `list_documents()`: List stored documents
- `delete_documents()`: Delete documents

### 2. RAG Endpoints (`rag_endpoints.py`)

FastAPI endpoints for RAG operations:

#### Endpoints:

- `POST /rag/documents`: Store a document
- `POST /rag/documents/search`: Search documents
- `GET /rag/documents`: List stored documents
- `DELETE /rag/documents`: Delete documents
- `POST /rag/retrieve`: Retrieve context for RAG
- `POST /rag/query`: Full RAG query with LLM generation

### 3. LLM Service (`llm_service.py`)

Optional LLM service for answer generation. Supports:
- OpenAI API
- Anthropic API
- AWS Bedrock (placeholder)

## Usage

### 1. Store Documents

```bash
curl -X POST "http://localhost:8000/rag/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your document content here...",
    "source": "document.pdf",
    "metadata": {
      "title": "My Document",
      "author": "John Doe"
    }
  }'
```

### 2. Search Documents

```bash
curl -X POST "http://localhost:8000/rag/documents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic?",
    "limit": 5
  }'
```

### 3. RAG Query (with LLM)

```bash
curl -X POST "http://localhost:8000/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did I learn about RAG?",
    "limit": 5,
    "include_memories": true
  }'
```

### 4. Retrieve Context Only

```bash
curl -X POST "http://localhost:8000/rag/retrieve" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What documents mention AI?",
    "limit": 5
  }'
```

## Configuration

### Environment Variables

For LLM generation (optional):
```bash
export OPENAI_API_KEY="your-api-key"
# or
export ANTHROPIC_API_KEY="your-api-key"
export LLM_PROVIDER="openai"  # or "anthropic"
export LLM_MODEL="gpt-4o-mini"  # or "claude-3-haiku"
```

For MemMachine:
```bash
export MEMMACHINE_MCP_URL="http://localhost:8081"
export MEMMACHINE_USER_ID="default-user"
```

For MongoDB:
```bash
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DATABASE="ell_db"
```

## Pipeline Flow

1. **Document Ingestion**:
   - Document is chunked (default: 1000 chars, 200 overlap)
   - Chunks stored in MongoDB
   - Chunks indexed in MemMachine for semantic search

2. **Query Processing**:
   - User query received
   - Semantic search in MemMachine retrieves relevant documents
   - MongoDB text search as fallback
   - User memories retrieved from MemMachine
   - Context combined

3. **Answer Generation** (optional):
   - Context sent to LLM
   - LLM generates answer based on context
   - Answer returned with sources

## Features

- **Automatic Chunking**: Documents are automatically chunked for optimal retrieval
- **Semantic Search**: Uses MemMachine's embedding-based search
- **Hybrid Search**: Combines MemMachine semantic search with MongoDB text search
- **Memory Integration**: Includes user memories in context
- **Source Tracking**: Tracks document sources for citation
- **Metadata Support**: Store and retrieve document metadata

## Limitations

- LLM generation requires API key (optional feature)
- Vector search in MongoDB requires MongoDB Atlas (local MongoDB uses text search fallback)
- Document chunking is basic (sentence-based, no advanced NLP)

## Future Improvements

- [ ] Advanced chunking strategies (semantic chunking)
- [ ] MongoDB Atlas vector search integration
- [ ] AWS Bedrock LLM integration
- [ ] Re-ranking of search results
- [ ] Multi-modal document support
- [ ] Streaming responses for long answers

