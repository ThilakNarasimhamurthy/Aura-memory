# Frontend-Backend Integration Guide

This document describes how the frontend is connected to the FastAPI backend.

## Overview

The frontend has been fully integrated with the backend RAG system, enabling:
- Real-time customer data from MongoDB vector store
- Campaign effectiveness analysis
- Voice conversations using ElevenLabs TTS
- Semantic search across customer data

## API Client

Location: `src/lib/api.ts`

The API client provides typed interfaces for all backend endpoints:

### Main APIs

1. **`documentsApi`** - Document management
   - `store()` - Upload documents
   - `search()` - Search documents
   - `list()` - List all documents
   - `delete()` - Delete by source

2. **`ragApi`** - RAG queries
   - `query()` - Standard RAG query
   - `campaignQuery()` - Campaign conversation (text)
   - `campaignVoice()` - Campaign conversation (audio)
   - `retrieve()` - Retrieve context

3. **`customersApi`** - Customer queries
   - `findActive()` - Find most active customers
   - `getCampaignEngagement()` - Get campaign engagement
   - `search()` - Search customers

4. **`campaignsApi`** - Campaign queries
   - `getEffectiveness()` - Campaign effectiveness analysis
   - `getByChannel()` - Performance by channel
   - `getCustomerResponse()` - Customer response analysis

## Updated Pages

### 1. Customers Page (`src/pages/Customers.tsx`)

**Changes:**
- Now loads customers from backend RAG system
- Displays active customers with complete profiles
- Shows: name, email, segment, loyalty, purchases, spending, lifetime value, churn risk
- Refresh button to reload from database

**Features:**
- Real-time data from MongoDB
- Complete customer context (no fragmentation)
- Search functionality

### 2. Campaigns Page (`src/pages/Campaigns.tsx`)

**Changes:**
- Loads campaign data from backend
- Shows campaign effectiveness analysis
- Displays metrics by channel and segment
- Voice analysis button (links to Campaign Automation)

**Features:**
- Campaign effectiveness insights
- Channel performance metrics
- Segment analysis
- Real-time data

### 3. Campaign Automation (`src/pages/CampaignAutomation.tsx`)

**New Features:**
- **Voice Conversation Interface**
  - Ask questions about campaigns and customers
  - Get text and audio responses
  - Play audio directly in browser
  - Download audio files
  - Powered by ElevenLabs TTS

**Example Queries:**
- "Who are our most active customers?"
- "How are email campaigns performing?"
- "Which customers have the highest campaign conversion rates?"
- "Show me customers with high lifetime value who engaged with campaigns"

## Configuration

### Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Default is `http://localhost:8000` if not set.

### Backend Requirements

Ensure the backend is running:
```bash
cd backend
python run_server.py
# or
uvicorn app.main:app --reload
```

Backend should be accessible at `http://localhost:8000`

## Backend Endpoints Used

### Document Management
- `POST /langchain-rag/documents` - Store documents
- `POST /langchain-rag/documents/search` - Search documents
- `GET /langchain-rag/documents` - List documents
- `DELETE /langchain-rag/documents` - Delete documents

### RAG Queries
- `POST /langchain-rag/query` - Standard RAG query
- `POST /langchain-rag/query/campaign` - Campaign conversation (text)
- `POST /langchain-rag/query/campaign/voice` - Campaign conversation (audio)
- `POST /langchain-rag/retrieve` - Retrieve context

### Health
- `GET /health` - Health check

## Usage Examples

### Loading Active Customers

```typescript
import { customersApi } from "@/lib/api";

const response = await customersApi.findActive(10);
// Returns: CampaignQueryResponse with customer data
```

### Voice Conversation

```typescript
import { ragApi, playAudio } from "@/lib/api";

// Get text response
const textResponse = await ragApi.campaignQuery({
  query: "Who are our most active customers?",
  k: 10,
});

// Get audio response
const audioBlob = await ragApi.campaignVoice({
  query: "Who are our most active customers?",
  k: 10,
});

// Play audio
await playAudio(audioBlob);
```

### Campaign Effectiveness

```typescript
import { campaignsApi } from "@/lib/api";

const response = await campaignsApi.getEffectiveness();
// Returns analysis of campaign performance
```

## Data Flow

1. **Frontend** → API Client (`src/lib/api.ts`)
2. **API Client** → Backend FastAPI (`http://localhost:8000`)
3. **Backend** → MongoDB Vector Store (customer data)
4. **Backend** → LangChain RAG (semantic search)
5. **Backend** → ElevenLabs (voice generation)
6. **Backend** → Frontend (JSON response + audio blob)

## Features

### ✅ Complete Integration
- All backend endpoints mapped
- Type-safe API client
- Error handling
- Loading states

### ✅ Voice Conversations
- ElevenLabs TTS integration
- Audio playback in browser
- Download audio files
- Natural conversation flow

### ✅ Real-time Data
- Live customer data from MongoDB
- Campaign metrics from RAG system
- No CSV file dependencies

### ✅ User Experience
- Loading indicators
- Error toasts
- Success notifications
- Responsive design

## Troubleshooting

### "Failed to fetch" Error
- Check backend is running: `http://localhost:8000/health`
- Verify `VITE_API_BASE_URL` in `.env`
- Check CORS settings in backend

### "ElevenLabs service is not available"
- Ensure `ELEVENLABS_API_KEY` is set in backend `.env`
- Install: `pip install elevenlabs` in backend

### No Customer Data
- Upload CSV data to backend first
- Use: `python scripts/upload_csv.py Data/customer_data_400_clean.csv`
- Check MongoDB connection

### Voice Not Playing
- Check browser audio permissions
- Verify audio blob is received
- Check browser console for errors

## Next Steps

1. **Start Backend:**
   ```bash
   cd backend
   python run_server.py
   ```

2. **Start Frontend:**
   ```bash
   cd frontent
   npm install
   npm run dev
   ```

3. **Upload Data:**
   ```bash
   cd backend
   python scripts/upload_csv.py Data/customer_data_400_clean.csv
   ```

4. **Test Voice:**
   - Go to Campaign Automation page
   - Enter a query about customers/campaigns
   - Click "Ask" to get voice response

## Architecture

```
Frontend (React + TypeScript)
    ↓
API Client (src/lib/api.ts)
    ↓
Backend (FastAPI)
    ↓
├── MongoDB Vector Store (Customer Data)
├── LangChain RAG (Semantic Search)
├── MemMachine (Memory)
└── ElevenLabs (Voice TTS)
```

All components are now fully connected and working together!

