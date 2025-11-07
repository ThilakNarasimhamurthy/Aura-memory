# Aura Memory

A comprehensive enterprise platform that combines AI-powered language processing, memory management, and customer engagement tools. The platform features RAG (Retrieval Augmented Generation), predictive analytics, campaign automation, and voice-enabled phone call integration.

## 🏗️ Architecture

The platform consists of three main components:

1. **Frontend** (React/TypeScript/Vite) - Modern web interface with dashboard and analytics
2. **Backend** (FastAPI/Python) - REST API with MongoDB, LangChain RAG, and MemMachine integration
3. **MemMachine** - Memory management system for episodic and profile memory storage

## 📋 Prerequisites

- **Python 3.9+** for backend
- **Node.js 18+** and npm for frontend
- **MongoDB** (local or cloud instance)
- **MemMachine MCP Server** (included in repo)
- **Neo4j & PostgreSQL** (for MemMachine, can use Docker Compose)

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Create .env file
cat > .env << EOF
APP_NAME=ELL Backend
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ell_db
MEMMACHINE_MCP_URL=http://localhost:8081
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
EOF

# Install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start backend server
python3 scripts/setup_and_run.py
```

The backend will run on `http://localhost:8000`

### 2. MemMachine Setup

```bash
cd MemMachine

# Start MemMachine MCP server (on port 8081 to avoid conflict with frontend)
./start_memmachine.sh
```

See `MEMSERVER_START.md` for detailed MemMachine setup instructions.

### 3. Frontend Setup

```bash
cd frontent

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:8080`

## 📖 User Flow

### 1. **Dashboard Overview** (`/`)
   - **Executive Summary**: High-level metrics and KPIs
   - **Predictive Customer Insights**: AI-powered customer behavior predictions
   - **Campaign Performance Predictor**: Forecast campaign success before launch
   - **Sales & Footfall Forecast**: Predictive analytics for sales and customer traffic
   - **AI Social Media Banner Generator**: Automated banner creation for campaigns
   - **Predictive Insights Sidebar**: Real-time AI-generated insights and recommendations

### 2. **Customer Management** (`/customers`)
   - View customer database
   - Analyze customer segments
   - Access customer insights and profiles
   - Manage customer data and relationships

### 3. **Campaign Management** (`/campaigns`)
   - Create and manage marketing campaigns
   - View campaign performance metrics
   - Analyze campaign effectiveness
   - Optimize campaign strategies

### 4. **Campaign Automation** (`/campaign-automation`)
   - Set up automated campaign workflows
   - Configure AI-powered campaign triggers
   - Manage campaign scheduling and execution
   - Monitor automated campaign performance

### 5. **Analytics** (`/analytics`)
   - Deep dive into business metrics
   - Generate custom reports
   - View historical trends
   - Export analytics data

## 🔌 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /memories/health` - MemMachine connection status

### Document Management (RAG)
- `POST /langchain-rag/documents` - Upload documents for RAG
- `POST /langchain-rag/documents/search` - Search documents
- `GET /langchain-rag/documents` - List all documents
- `DELETE /langchain-rag/documents` - Delete documents

### Query & Retrieval
- `POST /langchain-rag/query` - General RAG query
- `POST /langchain-rag/query/campaign` - Campaign-specific query
- `POST /langchain-rag/query/campaign/voice` - Voice-enabled campaign query (ElevenLabs)
- `POST /langchain-rag/query/langgraph` - Advanced LangGraph workflow query
- `POST /langchain-rag/retrieve` - Retrieve context for RAG

### Memory Management
- `POST /memories` - Add memory to MemMachine
- `POST /memories/search` - Search memories (episodic + profile)

### Phone Calls
- `POST /phone-call/initiate` - Initiate automated phone call
- `GET /phone-call/status/{call_sid}` - Get call status
- `GET /phone-call/conversation/{call_sid}` - Get conversation history
- `POST /phone-call/webhook` - Twilio webhook for call events

## 🛠️ Key Features

### 1. **RAG (Retrieval Augmented Generation)**
   - Document storage and vector search using MongoDB
   - LangChain integration for document processing
   - LangGraph workflows for multi-stage reasoning
   - Context-aware query responses

### 2. **Memory Management (MemMachine)**
   - Episodic memory for event storage
   - Profile memory for user/customer profiles
   - Persistent memory across sessions
   - Fast memory search and retrieval

### 3. **Voice Integration (ElevenLabs)**
   - Text-to-speech for campaign conversations
   - Voice-enabled phone calls
   - Natural language voice interactions

### 4. **Phone Call Automation (Twilio)**
   - Automated outbound calls to customers
   - AI-powered conversation during calls
   - Call status tracking and conversation logging
   - TwiML webhook integration

### 5. **Predictive Analytics**
   - Customer behavior prediction
   - Campaign performance forecasting
   - Sales and footfall predictions
   - AI-powered insights generation

## 📁 Project Structure

```
ELL/
├── backend/                 # FastAPI backend service
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models and schemas
│   │   └── workflows/      # LangGraph workflows
│   ├── scripts/            # Utility scripts
│   └── docs/               # Backend documentation
├── frontent/               # React frontend application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # React components
│   │   └── lib/            # Utility functions
│   └── public/             # Static assets
└── MemMachine/             # MemMachine memory system
    ├── src/memmachine/     # Core MemMachine code
    └── configuration.yml   # MemMachine configuration
```

## 🔧 Configuration

### Backend Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DATABASE` - Database name
- `MEMMACHINE_MCP_URL` - MemMachine MCP server URL (default: http://localhost:8081)
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice synthesis
- `OPENAI_API_KEY` - OpenAI API key for LLM services
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

### Frontend Configuration
- Frontend runs on port 8080 by default
- API base URL: `http://localhost:8000`
- See `frontent/src/lib/api.ts` for API configuration

## 📚 Documentation

- **Backend API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **MemMachine Setup**: See `MEMSERVER_START.md`
- **Backend Structure**: See `backend/STRUCTURE.md`
- **Troubleshooting**: See `backend/TROUBLESHOOTING.md`

## 🧪 Testing

### Backend API Testing
```bash
cd backend
./test_apis.sh
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# MemMachine health
curl http://localhost:8000/memories/health
```

## 🚨 Troubleshooting

### MemMachine Connection Issues
- Ensure MemMachine is running on port 8081: `curl http://localhost:8081/mcp/`
- Check backend logs for connection errors
- Verify `MEMMACHINE_MCP_URL` in backend `.env` file

### MongoDB Connection Issues
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` in backend `.env` file
- Ensure database is accessible

### Frontend-Backend Connection
- Verify backend is running on port 8000
- Check CORS settings in `backend/app/main.py`
- Verify API base URL in frontend configuration

## 📝 License

See LICENSE file for details.

## 🤝 Contributing

See CONTRIBUTING.md for contribution guidelines.

## 📧 Support

For issues and questions, please open an issue on the repository.
