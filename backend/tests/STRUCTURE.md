# Backend Project Structure

This document describes the organized structure of the backend application.

## Directory Structure

```
backend/
├── app/                          # Main application package
│   ├── __init__.py
│   ├── main.py                   # FastAPI application entry point
│   ├── config.py                 # Configuration settings
│   ├── database.py               # MongoDB database utilities
│   │
│   ├── api/                      # API package
│   │   ├── __init__.py
│   │   ├── dependencies.py       # Dependency injection functions
│   │   └── routes/               # API route modules
│   │       ├── __init__.py
│   │       ├── health.py         # Health check endpoints
│   │       ├── memories.py       # MemMachine memory endpoints
│   │       ├── rag.py            # RAG endpoints
│   │       └── langchain_rag.py  # LangChain/LangGraph RAG endpoints
│   │
│   ├── services/                 # Business logic services
│   │   ├── __init__.py
│   │   ├── memmachine_client.py  # MemMachine MCP client
│   │   ├── llm_service.py        # LLM service for answer generation
│   │   ├── rag_service.py        # RAG service (basic)
│   │   └── langchain_rag_service.py  # LangChain RAG service
│   │
│   ├── workflows/                # Workflow definitions
│   │   ├── __init__.py
│   │   └── langgraph_rag_workflow.py  # LangGraph RAG workflow
│   │
│   └── models/                   # Data models and schemas
│       ├── __init__.py
│       └── schemas.py            # Pydantic models for API
│
├── scripts/                      # Utility scripts
│   ├── check_server.sh
│   ├── set_mongodb_uri.sh
│   ├── start_server.sh
│   ├── setup_and_run.py
│   └── verify_running.py
│
├── tests/                        # Test files
│   ├── __init__.py
│   └── test_python.py
│
├── docs/                         # Documentation
│   ├── LANGCHAIN_RAG.md
│   └── RAG_PIPELINE.md
│
├── requirements.txt              # Python dependencies
├── README.md                     # Project README
└── .env                          # Environment variables (not in git)
```

## Package Organization

### `app/`
Main application package containing:
- **main.py**: FastAPI app initialization and router registration
- **config.py**: Application configuration using Pydantic Settings
- **database.py**: MongoDB client and database utilities

### `app/api/`
API layer with:
- **dependencies.py**: FastAPI dependency injection functions
- **routes/**: Separate route modules for different features
  - `health.py`: Health checks and utility endpoints
  - `memories.py`: MemMachine memory management endpoints
  - `rag.py`: Basic RAG endpoints
  - `langchain_rag.py`: LangChain/LangGraph RAG endpoints

### `app/services/`
Business logic services:
- **memmachine_client.py**: Client for MemMachine MCP server
- **llm_service.py**: LLM integration for answer generation
- **rag_service.py**: Basic RAG service with MongoDB + MemMachine
- **langchain_rag_service.py**: LangChain-based RAG with vector store

### `app/workflows/`
Workflow definitions:
- **langgraph_rag_workflow.py**: LangGraph multi-stage RAG workflow

### `app/models/`
Data models:
- **schemas.py**: Pydantic models for request/response validation

### `scripts/`
Utility scripts for development and deployment.

### `tests/`
Test files for the application.

### `docs/`
Documentation files.

## Import Patterns

### Absolute Imports
All imports use absolute paths starting with `app.`:

```python
from app.config import get_settings
from app.database import get_database
from app.services.memmachine_client import MemMachineMCPClient
from app.models.schemas import RAGRequest
```

### Dependency Injection
Services are injected via FastAPI dependencies:

```python
from app.api.dependencies import get_rag_service

@router.post("/query")
async def query(rag_service: RAGService = Depends(get_rag_service)):
    ...
```

## Running the Application

### Development
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload
```

### Production
```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health
- `GET /health` - Service health check
- `GET /documents` - List MongoDB collections

### Memories
- `POST /memories` - Add memory to MemMachine
- `POST /memories/search` - Search memories
- `GET /memories/health` - MemMachine server health

### RAG
- `POST /rag/documents` - Store document
- `POST /rag/documents/search` - Search documents
- `POST /rag/query` - RAG query
- `POST /rag/retrieve` - Retrieve context

### LangChain RAG
- `POST /langchain-rag/documents` - Store documents
- `POST /langchain-rag/documents/search` - Search documents
- `POST /langchain-rag/query` - LangChain RAG query
- `POST /langchain-rag/query/langgraph` - LangGraph RAG query
- `POST /langchain-rag/retrieve` - Retrieve context

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=aura_memory_db

# MemMachine
MEMMACHINE_MCP_URL=http://localhost:8081
MEMMACHINE_USER_ID=default-user

# LLM (optional)
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
```

## Benefits of This Structure

1. **Separation of Concerns**: Clear separation between API, services, and models
2. **Modularity**: Easy to add new features without affecting existing code
3. **Testability**: Services can be easily mocked and tested
4. **Scalability**: Structure supports growth and multiple developers
5. **Maintainability**: Clear organization makes code easy to understand and modify

