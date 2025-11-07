# Complete User Flow Documentation

This document provides a comprehensive overview of the user flow across all components of the ELL (ElevenLabs + LangChain) system.

## System Architecture Overview

The system consists of three main components:
1. **Frontend** (React/TypeScript) - User interface
2. **Backend** (FastAPI/Python) - API server with RAG capabilities
3. **MemMachine** - Memory management system for persistent context

---

## 1. Initial Setup & Data Ingestion Flow

### 1.1 Data Upload Process

**Location**: `backend/scripts/upload_csv.py`

**Flow**:
```
CSV File (customer_data.csv)
    ↓
upload_csv.py script
    ↓
Converts CSV rows to text documents
    ↓
POST /langchain-rag/documents
    ↓
LangChainRAGService.store_documents()
    ↓
Text Splitter (chunks documents)
    ↓
MongoDB Atlas Vector Search
    ↓
Documents stored with embeddings
```

**Key Steps**:
1. User runs: `python backend/scripts/upload_csv.py backend/Data/customer_data_400_clean.csv`
2. Script reads CSV and converts each row to a searchable text document
3. Documents are chunked using `RecursiveCharacterTextSplitter` (chunk_size=2500)
4. Chunks are embedded using OpenAI `text-embedding-3-small`
5. Embedded documents stored in MongoDB Atlas Vector Search collection

**Data Format**:
- Each customer row becomes a text document with natural language description
- Metadata includes all CSV fields (customer_id, email, purchases, etc.)
- Documents are searchable via semantic similarity

---

## 2. Frontend User Interface Flow

### 2.1 Application Entry Point

**Location**: `frontent/src/App.tsx`

**Routes**:
- `/` - Dashboard (Index page)
- `/customers` - Customer Database view
- `/campaigns` - Campaign Analytics
- `/campaign-automation` - AI Campaign Generation
- `/analytics` - Advanced Analytics Dashboard

### 2.2 Dashboard Flow (Index Page)

**Location**: `frontent/src/pages/Index.tsx`

**Components**:
1. **Sidebar** - Navigation menu
2. **TopNav** - Date range selector and top navigation
3. **ExecutiveSummary** - High-level metrics cards
4. **CustomerInsights** - Predictive customer analytics
5. **CampaignPredictor** - Campaign performance predictions
6. **SocialBannerGenerator** - AI-generated social media banners
7. **SalesForecast** - Sales and footfall forecasting
8. **PredictiveInsightsSidebar** - Right sidebar with insights

**User Flow**:
```
User opens dashboard (/)
    ↓
Dashboard loads with date range selector
    ↓
Multiple components fetch data:
    - ExecutiveSummary: Aggregated metrics
    - CustomerInsights: Customer analytics (uses dateRange)
    - CampaignPredictor: Campaign predictions
    - SocialBannerGenerator: Banner generation (uses dateRange)
    - SalesForecast: Sales predictions
```

### 2.3 Customer Database Flow

**Location**: `frontent/src/pages/Customers.tsx`

**User Flow**:
```
User navigates to /customers
    ↓
Page loads, automatically calls loadCustomers()
    ↓
API Call: customersApi.findActive(20)
    ↓
POST /langchain-rag/query/campaign
    Query: "Who are our most active customers?"
    ↓
Backend RAG Query Processing
    ↓
Returns customer documents with metadata
    ↓
Frontend extracts customer data from documents
    ↓
Displays in table with:
    - Name, Email, Segment
    - Purchases, Total Spent, Lifetime Value
    - Churn Risk, Favorite Products
    - Contact Methods
```

**Features**:
- Search/filter customers by ID, segment, or product category
- Refresh button to reload from backend
- Displays top 50 customers
- Color-coded churn risk scores

### 2.4 Campaign Analytics Flow

**Location**: `frontent/src/pages/Campaigns.tsx`

**User Flow**:
```
User navigates to /campaigns
    ↓
Page loads and fetches marketing_data.csv
    ↓
Parses CSV data locally
    ↓
Displays:
    - Revenue by Channel (Bar Chart)
    - Revenue by Segment (Pie Chart)
    - Campaign Table with:
      * Campaign Name, Channel, Segment
      * Conversion Rate, ROI
      * Total Spend, Total Revenue
```

**Note**: This page currently uses local CSV data, not backend API.

### 2.5 Campaign Automation Flow

**Location**: `frontent/src/pages/CampaignAutomation.tsx`

**User Flow**:
```
User navigates to /campaign-automation
    ↓
User selects tab: 7 Days / 30 Days / Festivals
    ↓
User clicks "Generate [Period] Plan"
    ↓
API Call: supabase.functions.invoke("generate-campaign")
    Body: {
        type: "automation",
        period: "7days" | "30days" | "festival",
        historicalData: "..."
    }
    ↓
Supabase Edge Function generates campaigns
    ↓
Returns array of DayCampaign objects:
    - day, date, banner (AI-generated image)
    - caption, story, timing
    - channel, channelReason
    ↓
Frontend displays campaign cards in grid
```

**Features**:
- AI-generated campaign schedules
- AI-generated social media banners
- Optimal timing recommendations
- Channel selection with reasoning

### 2.6 Analytics Flow

**Location**: `frontent/src/pages/Analytics.tsx`

**User Flow**:
```
User navigates to /analytics
    ↓
Page loads and fetches:
    - marketing_data.csv
    - customer_data.csv
    ↓
Calculates summary metrics:
    - Total Revenue
    - Average ROI
    - Total Customers
    - Average Conversion
    ↓
Generates time series data (mock)
    ↓
Displays:
    - Summary cards (4 metrics)
    - Revenue Trend (Area Chart - 6 months)
    - Customer Growth (Line Chart)
    - ROI Performance (Line Chart)
```

**Note**: This page uses local CSV data and generates mock time series.

---

## 3. Backend API Flow

### 3.1 Application Startup

**Location**: `backend/app/main.py`

**Flow**:
```
FastAPI app starts
    ↓
Lifespan context manager:
    1. Startup: MongoDB connection
    2. Startup: MemMachine client (lazy init)
    3. Runtime: Handle requests
    4. Shutdown: Close MemMachine client
    ↓
Routers registered:
    - /health (health check)
    - /memories/* (MemMachine endpoints)
    - /langchain-rag/* (RAG endpoints)
```

### 3.2 RAG Query Flow

**Location**: `backend/app/api/routes/langchain_rag.py`

#### Standard RAG Query

**Endpoint**: `POST /langchain-rag/query`

**Flow**:
```
Client sends query
    ↓
rag_query() endpoint
    ↓
LangChainRAGService.rag_query()
    ↓
1. retrieve_context():
   a. search_documents() - MongoDB Vector Search
   b. search_memory() - MemMachine (if enabled)
    ↓
2. Combine documents + memories
    ↓
3. Build context string
    ↓
4. Create prompt with context
    ↓
5. LLM generates answer (OpenAI/Anthropic)
    ↓
6. Return response:
   {
     query, answer, sources,
     documents, total_context
   }
```

#### Campaign Conversation Query

**Endpoint**: `POST /langchain-rag/query/campaign`

**Flow**:
```
Client sends campaign query
    ↓
campaign_conversation_query() endpoint
    ↓
LangChainRAGService.campaign_conversation_query()
    ↓
1. retrieve_context() with higher k (up to 20)
    ↓
2. Extract customer summaries from metadata
    ↓
3. Build conversational context
    ↓
4. Use voice-optimized prompt
    ↓
5. LLM generates conversational answer
    ↓
6. Return response:
   {
     query, answer, sources,
     customers_found, customer_summaries,
     documents, total_context,
     conversation_ready: true
   }
```

#### Campaign Voice Query

**Endpoint**: `POST /langchain-rag/query/campaign/voice`

**Flow**:
```
Client sends campaign query with voice_id
    ↓
campaign_conversation_voice() endpoint
    ↓
1. Get conversational response (same as above)
    ↓
2. Extract answer text
    ↓
3. ElevenLabsService.text_to_speech()
    ↓
4. Convert text to MP3 audio
    ↓
5. Return audio/mpeg response
```

### 3.3 Document Management Flow

**Endpoints**:
- `POST /langchain-rag/documents` - Store documents
- `POST /langchain-rag/documents/search` - Search documents
- `GET /langchain-rag/documents` - List documents
- `DELETE /langchain-rag/documents` - Delete by source

**Store Documents Flow**:
```
Client sends texts + metadatas
    ↓
store_documents() endpoint
    ↓
LangChainRAGService.store_documents()
    ↓
1. Create Document objects from texts
    ↓
2. Split documents into chunks
    ↓
3. Generate embeddings (OpenAI)
    ↓
4. Store in MongoDB Atlas Vector Search
    ↓
5. Return: {success, document_count, chunk_count, ids}
```

**Search Documents Flow**:
```
Client sends query + k (number of results)
    ↓
search_documents() endpoint
    ↓
LangChainRAGService.search_documents()
    ↓
1. MongoDB Atlas Vector Search similarity_search()
    ↓
2. Returns top k similar documents
    ↓
3. Return: {success, query, results, total}
```

### 3.4 Memory Management Flow

**Location**: `backend/app/api/routes/memories.py`

**Endpoints**:
- `POST /memories` - Add memory
- `POST /memories/search` - Search memories
- `GET /memories/health` - Check MemMachine health

**Add Memory Flow**:
```
Client sends content + user_id
    ↓
add_memory() endpoint
    ↓
MemMachineMCPClient.add_memory()
    ↓
1. Initialize MCP session (if needed)
    ↓
2. Call MCP tool: "add_memory"
    ↓
3. MemMachine stores memory
    ↓
4. Return: {success, result}
```

**Search Memory Flow**:
```
Client sends query + limit + user_id
    ↓
search_memory() endpoint
    ↓
MemMachineMCPClient.search_memory()
    ↓
1. Initialize MCP session (if needed)
    ↓
2. Call MCP tool: "search_memory"
    ↓
3. MemMachine searches episodic + profile memory
    ↓
4. Return: {success, result}
```

---

## 4. Data Flow Architecture

### 4.1 Complete Query Flow (Frontend to Backend)

```
Frontend Component
    ↓
API Client (api.ts)
    ↓
HTTP Request to Backend
    ↓
FastAPI Route Handler
    ↓
Dependency Injection (Service)
    ↓
LangChainRAGService
    ↓
┌─────────────────┬──────────────────┐
│                 │                   │
MongoDB Vector    MemMachine MCP      LLM Service
Search            Client              (OpenAI/Anthropic)
│                 │                   │
│                 │                   │
Documents         Memories            Answer
│                 │                   │
└─────────────────┴──────────────────┘
    ↓
Combine Context
    ↓
Generate Response
    ↓
Return to Frontend
    ↓
Update UI
```

### 4.2 Data Storage Architecture

```
CSV Files
    ↓
upload_csv.py
    ↓
Text Documents
    ↓
Text Splitter (chunks)
    ↓
OpenAI Embeddings
    ↓
MongoDB Atlas Vector Search
    ├── Collection: "chunks"
    ├── Index: "vector_index"
    └── Fields: content, embedding, metadata
```

### 4.3 Memory Architecture

```
User Interactions
    ↓
MemMachine MCP Client
    ↓
MemMachine Server (localhost:8080)
    ├── Episodic Memory
    └── Profile Memory
    ↓
Retrieved during RAG queries
    ↓
Combined with document context
```

---

## 5. Key User Journeys

### 5.1 Journey: View Active Customers

```
1. User navigates to /customers
2. Page automatically loads customers
3. Backend query: "Who are our most active customers?"
4. RAG system searches MongoDB for high-value customers
5. Results displayed in table
6. User can search/filter customers
7. User can refresh to get latest data
```

### 5.2 Journey: Generate Campaign Schedule

```
1. User navigates to /campaign-automation
2. User selects time period (7/30 days or festivals)
3. User clicks "Generate Plan"
4. Supabase Edge Function generates campaigns
5. AI creates:
   - Daily campaign schedules
   - Social media banners
   - Captions and stories
   - Optimal timing
   - Channel recommendations
6. Campaigns displayed in cards
```

### 5.3 Journey: Voice Campaign Query

```
1. User/Agent sends voice query about campaigns
2. Frontend/Client calls /langchain-rag/query/campaign/voice
3. Backend:
   a. Retrieves relevant customer documents
   b. Retrieves relevant memories
   c. Generates conversational answer
   d. Converts to speech via ElevenLabs
4. Returns MP3 audio
5. Audio played to user
```

### 5.4 Journey: Upload Customer Data

```
1. User has CSV file with customer data
2. User runs: python backend/scripts/upload_csv.py data.csv
3. Script:
   a. Reads CSV rows
   b. Converts to text documents
   c. Splits into chunks
   d. Generates embeddings
   e. Stores in MongoDB
4. Data now searchable via RAG queries
```

---

## 6. Technology Stack

### Frontend
- **Framework**: React + TypeScript
- **Routing**: React Router
- **UI**: shadcn-ui + Tailwind CSS
- **Charts**: Recharts
- **State**: React Query (TanStack Query)
- **Build**: Vite

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB Atlas (with Vector Search)
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: OpenAI GPT-4o-mini / Anthropic Claude
- **RAG**: LangChain
- **Workflows**: LangGraph
- **Voice**: ElevenLabs (optional)

### Memory System
- **MemMachine**: MCP server for persistent memory
- **Protocol**: MCP (Model Context Protocol)
- **Storage**: MemMachine's internal storage

### External Services
- **Supabase**: Edge Functions for campaign generation
- **MongoDB Atlas**: Vector database
- **OpenAI**: Embeddings and LLM
- **ElevenLabs**: Text-to-speech (optional)

---

## 7. API Endpoints Summary

### Health
- `GET /health` - Service health check

### Documents (RAG)
- `POST /langchain-rag/documents` - Store documents
- `POST /langchain-rag/documents/search` - Search documents
- `GET /langchain-rag/documents` - List documents
- `DELETE /langchain-rag/documents` - Delete by source

### Queries (RAG)
- `POST /langchain-rag/query` - Standard RAG query
- `POST /langchain-rag/query/campaign` - Campaign conversation query
- `POST /langchain-rag/query/campaign/voice` - Voice response query
- `POST /langchain-rag/query/langgraph` - LangGraph workflow query
- `POST /langchain-rag/retrieve` - Retrieve context only

### Memories
- `POST /memories` - Add memory
- `POST /memories/search` - Search memories
- `GET /memories/health` - MemMachine health check

---

## 8. Environment Variables

### Backend (.env)
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ell_db

# MemMachine
MEMMACHINE_MCP_URL=http://localhost:8080
MEMMACHINE_USER_ID=default-user

# LLM
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key (optional)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# ElevenLabs (optional)
ELEVENLABS_API_KEY=your-key
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## 9. File Organization

### Backend Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Configuration
│   ├── database.py          # MongoDB connection
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   └── dependencies.py  # Dependency injection
│   ├── services/            # Business logic
│   ├── workflows/           # LangGraph workflows
│   └── models/              # Data schemas
├── scripts/                 # Utility scripts
├── Data/                    # CSV data files
└── docs/                    # Documentation
```

### Frontend Structure
```
frontent/
├── src/
│   ├── App.tsx              # Main app component
│   ├── pages/               # Page components
│   ├── components/
│   │   ├── dashboard/       # Dashboard components
│   │   └── ui/              # UI components
│   ├── lib/
│   │   └── api.ts           # API client
│   └── hooks/               # React hooks
└── public/
    └── data/                # Static CSV files
```

---

## 10. Key Features

1. **Semantic Search**: MongoDB Atlas Vector Search for customer data
2. **RAG (Retrieval Augmented Generation)**: Combines document retrieval with LLM generation
3. **Memory Integration**: MemMachine for persistent user context
4. **Voice Support**: ElevenLabs integration for voice responses
5. **Campaign Automation**: AI-generated campaign schedules
6. **Real-time Analytics**: Dashboard with charts and metrics
7. **Customer Insights**: Predictive analytics and segmentation

---

## 11. Development Workflow

### Starting Backend
```bash
cd backend
python3 scripts/setup_and_run.py
# Or
uvicorn app.main:app --reload
```

### Starting Frontend
```bash
cd frontent
npm install
npm run dev
```

### Uploading Data
```bash
cd backend
python3 scripts/upload_csv.py Data/customer_data_400_clean.csv
```

### Testing API
```bash
curl http://localhost:8000/health
curl http://localhost:8000/docs  # Swagger UI
```

---

This document provides a complete overview of the user flow across all components of the ELL system. For specific implementation details, refer to the individual files mentioned in each section.

