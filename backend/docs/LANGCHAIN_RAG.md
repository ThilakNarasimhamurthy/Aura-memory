# LangChain/LangGraph RAG Pipeline Documentation

This document describes the LangChain and LangGraph-based RAG (Retrieval-Augmented Generation) pipeline implementation.

## Overview

The LangChain RAG pipeline provides:
- **Vector Store**: MongoDB-based vector storage with semantic search
- **Document Chunking**: Automatic text splitting with LangChain
- **Embeddings**: OpenAI embeddings for semantic search
- **LLM Integration**: OpenAI or Anthropic LLMs for answer generation
- **MemMachine Integration**: Combines document retrieval with MemMachine memories
- **LangGraph Workflows**: Advanced multi-stage RAG workflows

## Architecture

```
User Query
    ↓
[LangChain RAG Service]
    ↓
[MongoDB Vector Store] ← Document Storage
    ↓
[MemMachine] ← Memory Retrieval
    ↓
[LLM] ← Answer Generation
    ↓
Response
```

## Components

### 1. LangChain RAG Service (`langchain_rag_service.py`)

Core service for document storage and retrieval:
- **Vector Store**: MongoDB with embeddings
- **Text Splitter**: Recursive character text splitter
- **Embeddings**: OpenAI embeddings
- **LLM**: OpenAI or Anthropic chat models

### 2. LangGraph Workflow (`langgraph_rag_workflow.py`)

Multi-stage RAG workflow:
1. **Retrieve Documents**: Search MongoDB vector store
2. **Retrieve Memories**: Get relevant memories from MemMachine
3. **Combine Context**: Merge documents and memories
4. **Generate Answer**: Use LLM to generate answer

### 3. API Endpoints (`langchain_rag_endpoints.py`)

FastAPI endpoints for LangChain RAG operations.

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
# Required for embeddings and LLM
export OPENAI_API_KEY="your-openai-api-key"
# or
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Optional: LLM provider selection
export LLM_PROVIDER="openai"  # or "anthropic"
export LLM_MODEL="gpt-4o-mini"  # or "claude-3-haiku-20240307"

# MongoDB (if not already set)
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DATABASE="ell_db"

# MemMachine (if not already set)
export MEMMACHINE_MCP_URL="http://localhost:8080"
export MEMMACHINE_USER_ID="default-user"
```

### 3. MongoDB Vector Search (Optional)

For MongoDB Atlas Vector Search:
1. Create a vector search index in MongoDB Atlas
2. Index name: `vector_index`
3. Field: `embedding`

For local MongoDB:
- The service will use a fallback approach with manual cosine similarity

## Usage

### 1. Store Documents

```bash
curl -X POST "http://localhost:8000/langchain-rag/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Your document content here...",
      "Another document..."
    ],
    "source": "documents.pdf",
    "metadatas": [
      {"title": "Document 1", "author": "John Doe"},
      {"title": "Document 2", "author": "Jane Smith"}
    ]
  }'
```

### 2. Search Documents

```bash
curl -X POST "http://localhost:8000/langchain-rag/documents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic?",
    "k": 5
  }'
```

### 3. RAG Query (LangChain)

```bash
curl -X POST "http://localhost:8000/langchain-rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did I learn about RAG?",
    "k": 5,
    "include_memories": true,
    "user_id": "user-123"
  }'
```

### 4. RAG Query (LangGraph)

```bash
curl -X POST "http://localhost:8000/langchain-rag/query/langgraph" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What documents mention AI?",
    "k": 5,
    "user_id": "user-123"
  }'
```

### 5. Retrieve Context Only

```bash
curl -X POST "http://localhost:8000/langchain-rag/retrieve" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "k": 5,
    "include_memories": true
  }'
```

### 6. List Documents

```bash
curl "http://localhost:8000/langchain-rag/documents?limit=100"
```

### 7. Delete Documents

```bash
curl -X DELETE "http://localhost:8000/langchain-rag/documents?source=documents.pdf"
```

## API Endpoints

### LangChain RAG Endpoints

- `POST /langchain-rag/documents`: Store documents
- `POST /langchain-rag/documents/search`: Search documents
- `GET /langchain-rag/documents`: List documents
- `DELETE /langchain-rag/documents`: Delete documents
- `POST /langchain-rag/retrieve`: Retrieve context
- `POST /langchain-rag/query`: RAG query (LangChain)
- `POST /langchain-rag/query/langgraph`: RAG query (LangGraph)

## Features

### Vector Search
- Semantic search using OpenAI embeddings
- MongoDB Atlas Vector Search (when available)
- Fallback to manual cosine similarity (local MongoDB)

### Document Processing
- Automatic text chunking (1000 chars, 200 overlap)
- Metadata support
- Source tracking

### Memory Integration
- Combines document retrieval with MemMachine memories
- Filters duplicate content
- Prioritizes relevant memories

### LLM Integration
- Supports OpenAI and Anthropic models
- Configurable temperature and model selection
- Context-aware prompting

### LangGraph Workflows
- Multi-stage processing pipeline
- State management
- Configurable workflow steps

## Comparison: LangChain vs LangGraph

### LangChain RAG (`/langchain-rag/query`)
- Simpler, linear pipeline
- Direct chain execution
- Faster for simple queries

### LangGraph RAG (`/langchain-rag/query/langgraph`)
- Multi-stage workflow
- Better state management
- More control over flow
- Better for complex queries

## Configuration

### Text Splitter
```python
chunk_size=1000  # Characters per chunk
chunk_overlap=200  # Overlap between chunks
```

### Embeddings
```python
model="text-embedding-3-small"  # OpenAI embedding model
```

### LLM
```python
provider="openai"  # or "anthropic"
model="gpt-4o-mini"  # or "claude-3-haiku-20240307"
temperature=0.7
```

## Limitations

- **MongoDB Atlas Required**: Full vector search requires MongoDB Atlas with vector search index
- **API Keys Required**: OpenAI or Anthropic API key required for embeddings and LLM
- **Local MongoDB**: Uses fallback cosine similarity (slower for large datasets)
- **Embedding Costs**: Each document and query requires embedding API calls

## Future Improvements

- [ ] Support for more embedding providers (Hugging Face, etc.)
- [ ] Support for more LLM providers (AWS Bedrock, etc.)
- [ ] Advanced chunking strategies (semantic chunking)
- [ ] Re-ranking of search results
- [ ] Streaming responses
- [ ] Multi-modal document support
- [ ] Hybrid search (vector + keyword)
- [ ] Query expansion and refinement

## Troubleshooting

### "OPENAI_API_KEY is required"
- Set the `OPENAI_API_KEY` environment variable
- Or set `ANTHROPIC_API_KEY` if using Anthropic

### "MongoDB Atlas Vector Search not available"
- This is expected for local MongoDB
- The service will use fallback cosine similarity
- For better performance, use MongoDB Atlas with vector search index

### "No relevant context found"
- Ensure documents are stored in the vector store
- Check if embeddings are generated correctly
- Verify query is semantically similar to stored documents

### "LLM generation failed"
- Check API key is valid
- Verify API quota/rate limits
- Check network connectivity

