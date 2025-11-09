# Aura Memory - AI-Powered Marketing Analytics Platform

A comprehensive enterprise platform that combines AI-powered language processing, memory management, and customer engagement tools. Features RAG (Retrieval Augmented Generation), predictive analytics, campaign automation, and voice-enabled phone call integration.

## 🏗️ Architecture

The platform consists of three main components:

1. **Frontend** (React/TypeScript/Vite) - Modern web interface with dashboard and analytics
2. **Backend** (FastAPI/Python) - REST API with MongoDB, LangChain RAG, and MemMachine integration
3. **MemMachine** - Memory management system for episodic and profile memory storage

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+** (for backend)
- **Node.js 18+** and npm (for frontend)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git** (to clone the repository)
- **Docker & Docker Compose** (optional, for MemMachine databases)

### Optional (for full functionality):
- **Neo4j** (for MemMachine episodic memory) - Can use Docker
- **PostgreSQL** (for MemMachine profile memory) - Can use Docker
- **OpenAI API Key** (for AI predictions and RAG)
- **ElevenLabs API Key** (for voice synthesis - optional)
- **Twilio Account** (for phone calls - optional)

## ⚠️ Development Warning: Chrome Private Network Requests

When running the application in development mode, you may see a Chrome security warning about "private network requests". This is a **non-blocking warning** that appears because:

1. The frontend runs on `http://localhost:5173` (non-secure context)
2. It makes requests to the backend on `http://localhost:8000` (private network resource)
3. Chrome warns about potential CSRF risks with private network requests

### Current Status
- ✅ **The application works normally** - this is just a warning
- ⚠️ Chrome will start blocking these requests in milestone 92 (future version)
- ✅ **Production deployments with HTTPS are not affected**

### Solutions

#### For Development (Current)
The warning can be safely ignored for now. The application functions normally.

#### For Production
Deploy with HTTPS - this eliminates the warning entirely. The backend CORS is already configured to work with HTTPS origins.

#### For Development (Future-proof)
If you want to eliminate the warning in development:

1. **Use HTTPS in development** (recommended):
   ```bash
   # Backend: Use uvicorn with SSL
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
   
   # Frontend: Use Vite with HTTPS
   # Add to vite.config.ts:
   server: {
     https: true
   }
   ```

2. **Use Chrome flags** (development only, not recommended):
   ```bash
   chrome --disable-features=PrivateNetworkAccessSendPreflights
   ```

3. **Use a reverse proxy** (e.g., nginx) to serve both frontend and backend over HTTPS.

**Note**: For local development, the warning is harmless and can be ignored. The application will continue to work.

## 🚀 Quick Start Guide

### Option 1: Automated Setup (Recommended)

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ELL
```

#### Step 2: Run Setup Script

The easiest way to set up everything:

```bash
# Make setup script executable (if not already)
chmod +x setup.sh

# Run the main setup script
./setup.sh
```

This will:
- Check all prerequisites
- Set up backend (Python virtual environment, dependencies, .env file)
- Set up frontend (npm dependencies, .env file)
- Optionally set up MemMachine (if you choose to)

#### Step 3: Start All Services

```bash
# Make run script executable (if not already)
chmod +x run.sh

# Start all services in separate terminal windows
./run.sh
```

This will automatically start:
- Backend server on `http://localhost:8000`
- Frontend development server on `http://localhost:5173`
- MemMachine MCP server on `http://localhost:8090` (optional)

#### Step 4: Import Sample Data

```bash
cd backend
./import_data.sh
```

### Option 2: Manual Setup

If you prefer to set up each component manually:

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ELL
```

#### Step 2: Backend Setup

#### 2.1 Install Python Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 2.2 Configure Environment Variables

The setup script will automatically create a `.env` file from `.env.example`. You can also create it manually:

```bash
cd backend

# Option 1: Copy from example (recommended)
cp .env.example .env

# Option 2: Create manually
cat > .env << EOF
APP_NAME=Aura Memory Backend
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=aura_memory_db
MEMMACHINE_MCP_URL=http://localhost:8090
MEMMACHINE_USER_ID=default-user

# Optional: API Keys (add these if you want full functionality)
# OPENAI_API_KEY=your_openai_api_key_here
# ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_phone_number
EOF

# Edit the .env file with your actual values
nano .env  # or use your preferred editor
```

**Important:** 
- ⚠️ **Each folder has its own .env file** - backend uses `backend/.env`, frontend uses `frontend/.env`
- If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string
- If using local MongoDB, ensure MongoDB is running: `mongod` or `brew services start mongodb-community` (macOS)
- The setup script automatically cleans up duplicate .env files and creates from .env.example

#### 2.3 Start Backend Server

```bash
# Using the start script (recommended)
./start.sh

# OR using the setup script:
python3 scripts/setup_and_run.py

# OR manually:
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Step 3: MemMachine Setup (Optional but Recommended)

MemMachine provides persistent memory for conversations and customer profiles. The backend works without it, but with limited functionality.

#### 3.1 Using Docker Compose (Recommended)

```bash
cd MemMachine

# Start Neo4j and PostgreSQL using Docker Compose
docker-compose up -d

# Wait for databases to be ready (about 30 seconds)
sleep 30

# Start MemMachine MCP Server
./start_memmachine.sh
```

#### 3.2 Manual Setup (Without Docker)

If you have Neo4j and PostgreSQL installed locally:

1. **Run the setup script** (recommended):
   ```bash
   cd MemMachine
   ./setup.sh
   ```
   The setup script will:
   - Create `configuration.yml` from `configuration.yml.example`
   - Prompt you for API keys and passwords
   - Configure database hosts (Docker vs localhost)
   - Set up all required credentials

2. **Or manually edit `configuration.yml`**:
   ```bash
   cd MemMachine
   cp configuration.yml.example configuration.yml
   # Edit configuration.yml and add your API keys and passwords
   nano configuration.yml  # or use your preferred editor
   ```
   
   Update the following in `configuration.yml`:
   - Replace `YOUR_OPENAI_API_KEY_HERE` with your OpenAI API key
   - Replace `YOUR_NEO4J_PASSWORD_HERE` with your Neo4j password
   - Replace `YOUR_POSTGRES_PASSWORD_HERE` with your PostgreSQL password
   - Set `host: localhost` for both `my_storage_id` and `profile_storage` (if not using Docker)
   - Add AWS credentials if using AWS models (optional)

3. Start MemMachine:
   ```bash
   cd MemMachine
   ./start_memmachine.sh
   ```

The MemMachine MCP server will run on `http://localhost:8090`

**Note:** If you skip MemMachine setup, the backend will still work but memory features will be disabled.

### Step 4: Frontend Setup

#### 4.1 Install Dependencies

```bash
cd frontend

# Install npm packages
npm install
```

#### 4.2 Configure Environment Variables (Optional)

Create a `.env` file in the `frontend` directory if you need to customize the API URL:

```bash
cd frontend

# Option 1: Copy from example (recommended)
cp .env.example .env

# Option 2: Create manually
cat > .env << EOF
# API Base URL
VITE_API_BASE_URL=http://localhost:8000

# Optional: OpenAI API Key (for client-side features)
# VITE_OPENAI_API_KEY=your_openai_api_key_here
EOF

# Edit the .env file with your actual values
nano .env  # or use your preferred editor
```

**Important:**
- ⚠️ **Each folder has its own .env file** - frontend uses `frontend/.env`, backend uses `backend/.env`
- Frontend environment variables are exposed in the browser - only use public keys
- For sensitive operations, use the backend API instead of client-side keys
- The setup script automatically cleans up duplicate .env files and creates from .env.example
- All campaign generation is handled by the backend RAG API

#### 4.3 Start Frontend Development Server

```bash
# Using the start script (recommended)
./start.sh

# OR manually:
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in terminal)

### Step 5: Import Sample Data

To see the application with data, import synthetic sample data:

```bash
cd backend

# Using the import script (recommended)
./import_data.sh

# OR manually (make sure backend server is running):
source .venv/bin/activate
python3 scripts/generate_and_import_synthetic_data.py
```

This will:
- Generate 500 customers, 200 products, 2000 transactions, 1500 orders, and 50 campaigns
- Import structured data to MongoDB collections
- Create RAG chunks for vector search
- Populate all necessary collections for the dashboard

**Note:** The script requires the backend API to be running at `http://localhost:8000`

## 🎯 Running the Application

### Quick Start (Automated)

The easiest way to start all services:

```bash
# From the root directory
./run.sh
```

This will start all services in separate terminal windows automatically.

### Manual Start

You'll need **3 terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
./start.sh
```

**Terminal 2 - MemMachine (Optional):**
```bash
cd MemMachine
./start_memmachine.sh
```

**Terminal 3 - Frontend:**
```bash
cd frontend
./start.sh
```

### Individual Component Scripts

Each component has its own setup and start scripts:

**Backend:**
```bash
cd backend
./setup.sh   # First time setup
./start.sh   # Start server
./import_data.sh  # Import sample data
```

**Frontend:**
```bash
cd frontend
./setup.sh   # First time setup
./start.sh   # Start development server
```

**MemMachine:**
```bash
cd MemMachine
./setup.sh   # First time setup
./start_memmachine.sh  # Start MCP server
```

### Access the Application

- **Frontend Dashboard: `http://localhost:5173`**
- **Backend API Docs: `http://localhost:8000/docs`**
- **Backend Health: `http://localhost:8000/health`**

## 📖 Application Features

### 1. Dashboard (`/`)
- **Executive Summary**: High-level KPIs and metrics
   - **Predictive Customer Insights**: AI-powered customer behavior predictions
   - **Campaign Performance Predictor**: Forecast campaign success before launch
- **Sales & Footfall Forecast**: Predictive analytics for sales and traffic
- **AI Social Media Banner Generator**: Automated banner creation
- **Predictive Insights Sidebar**: Real-time AI-generated recommendations

### 2. Customer Management (`/customers`)
   - View customer database
   - Analyze customer segments
   - Access customer insights and profiles
- Filter and search customers

### 3. Campaign Management (`/campaigns`)
   - View campaign performance metrics
   - Analyze campaign effectiveness
- Revenue by channel and segment
- Campaign analytics and insights

### 4. Campaign Automation (`/campaign-automation`)
- Generate campaigns via chat
- Auto-generate email content
- Send bulk emails to top customers
- Make automated phone calls with AI scripts
- Store conversations in MemMachine

### 5. Analytics (`/analytics`)
   - Deep dive into business metrics
- Time series analytics
- Revenue analysis
- Customer engagement metrics

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | No | `aura_memory_db` |
| `MEMMACHINE_MCP_URL` | MemMachine server URL | No | `http://localhost:8090` |
| `OPENAI_API_KEY` | OpenAI API key for LLM | No | - |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS | No | - |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No | - |

### Frontend Configuration

- Default API URL: `http://localhost:8000`
- Can be customized via `VITE_API_BASE_URL` in `.env`

## 🚨 Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
```bash
# Check if MongoDB is running
mongosh  # or mongo

# If not running, start it:
# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod

# Windows:
net start MongoDB
```

**Port 8000 Already in Use:**
```bash
# Find and kill process on port 8000
# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### MemMachine Issues

**MemMachine Not Starting:**
- Check if Neo4j and PostgreSQL are running
- Verify `configuration.yml` has correct database credentials
- Check port 8090 is not in use: `lsof -i :8090`

**Database Connection Errors:**
- If using Docker, ensure containers are running: `docker-compose ps`
- If using local databases, verify they're accessible: `neo4j status`, `psql -U memmachine`

**Skip MemMachine:**
- The backend works without MemMachine, but memory features will be disabled
- Remove or comment out `MEMMACHINE_MCP_URL` in `.env` to disable

### Frontend Issues

**Cannot Connect to Backend:**
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/app/main.py`
- Verify `VITE_API_BASE_URL` in frontend `.env` matches backend URL

**Port 5173 Already in Use:**
```bash
# Vite will automatically use the next available port
# Or specify a different port:
npm run dev -- --port 3000
```

### Data Import Issues

**No Data Showing:**
- Run the data import script: `python3 backend/scripts/generate_and_import_synthetic_data.py`
- Ensure backend API is running before importing
- Check MongoDB connection in backend logs

**Import Script Fails:**
- Verify backend is running and accessible
- Check MongoDB connection string in `.env`
- Ensure MongoDB has write permissions

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

- `GET /health` - Health check
- `GET /api/customers` - Get customers
- `GET /api/analytics/campaigns` - Get campaign analytics
- `POST /langchain-rag/query/campaign` - RAG query
- `POST /memories` - Add memory to MemMachine
- `POST /email/send-bulk` - Send bulk emails
- `POST /phone-call/initiate` - Initiate phone call

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:8000/health
```

### MemMachine Health Check
```bash
curl http://localhost:8000/memories/health
```

### Test API Endpoints
```bash
cd backend/tests
./test_apis.sh
```

## 📁 Project Structure

```
ELL/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   └── workflows/      # LangGraph workflows
│   ├── scripts/            # Utility scripts
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── package.json        # Node dependencies
└── MemMachine/             # MemMachine memory system
    ├── src/memmachine/     # Core code
    └── configuration.yml   # Configuration
```

## 🔐 Security Notes

### Environment Variables and API Keys
- ⚠️ **NEVER commit `.env` files to version control** - they are automatically ignored by `.gitignore`
- Always use environment variables for sensitive data (API keys, passwords, tokens)
- Never hardcode API keys, passwords, or secrets in source code
- Use `.env.example` files as templates (these are safe to commit)
- Rotate API keys immediately if they are accidentally committed

### Best Practices
- Use environment variables for all sensitive configuration
- In production, use proper authentication and authorization
- Restrict CORS origins in production (development allows all origins)
- Use HTTPS in production to encrypt API requests
- Regularly audit and rotate API keys and credentials
- Never share `.env` files or commit them to public repositories

### If You Accidentally Commit Secrets
1. **Immediately rotate the exposed keys** - invalidate old keys and create new ones
2. **Remove from git history** - use `git filter-branch` or BFG Repo-Cleaner
3. **Update `.gitignore`** - ensure sensitive files are properly ignored
4. **Notify your team** - if working in a team, inform them to rotate keys

### Files Automatically Ignored
The following files and patterns are automatically ignored by `.gitignore`:
- `.env`, `.env.*`, `*.env` (actual .env files with real keys)
- `*.key`, `*.pem`, `*.cert`, `*.crt` (certificate files)
- `*secret*.env`, `*secret*.txt`, `*secret*.json` (secret files)
- `*.bak`, `*.backup` (backup files)
- All backup and temporary files

### .env File Structure
Each component has its own `.env` file in its directory:
- **Backend**: `backend/.env` (created from `backend/.env.example` by `backend/setup.sh`)
- **Frontend**: `frontend/.env` (created from `frontend/.env.example` by `frontend/setup.sh`)
- **MemMachine**: No `.env` file (uses `configuration.yml` instead)
- **Root**: No `.env` files (each component manages its own)

**Setup Scripts Automatically:**
- Clean up duplicate .env files (removes .env.backup, .env.bak, .env.tmp, etc.)
- Create .env from .env.example if it doesn't exist
- Ensure only one .env file exists per folder
- Remove any backup or temporary .env files

## 📝 License

See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review API documentation at `/docs`

## 📝 Setup Scripts Reference

### Root Directory Scripts

- `./setup.sh` - Set up all components (backend, frontend, MemMachine)
- `./run.sh` - Start all services in separate terminal windows

### Backend Scripts

- `backend/setup.sh` - Set up backend (virtual environment, dependencies, .env)
- `backend/start.sh` - Start backend server
- `backend/import_data.sh` - Import sample data to MongoDB

### Frontend Scripts

- `frontend/setup.sh` - Set up frontend (npm dependencies, .env)
- `frontend/start.sh` - Start frontend development server

### MemMachine Scripts

- `MemMachine/setup.sh` - Set up MemMachine (dependencies, Docker)
- `MemMachine/start_memmachine.sh` - Start MemMachine MCP server

## 🎉 You're All Set!

Once all services are running:
1. Open `http://localhost:5173` in your browser
2. Import sample data using `backend/import_data.sh`
3. Explore the dashboard and features
4. Check API docs at `http://localhost:8000/docs`

**Quick Commands:**
```bash
# Set up everything
./setup.sh

# Start all services
./run.sh

# Import data
cd backend && ./import_data.sh
```

Happy coding! 🚀
