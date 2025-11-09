#!/bin/bash
# Backend setup script for Aura Memory Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Backend Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.9+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
echo ""
echo -e "${YELLOW}Setting up virtual environment...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo ""
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Upgrade pip
echo ""
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet
echo -e "${GREEN}✓ pip upgraded${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}❌ requirements.txt not found${NC}"
    exit 1
fi

# Create .env file if it doesn't exist (only one .env file per folder)
echo ""
echo -e "${YELLOW}Setting up environment variables...${NC}"

# Remove any backup or duplicate .env files
rm -f .env.backup .env.bak .env.tmp .env.old .env.*.bak 2>/dev/null

if [ ! -f ".env" ]; then
    # Check if .env.example exists and use it as template
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file and add your MongoDB URI and API keys${NC}"
    else
        echo -e "${YELLOW}Creating .env file...${NC}"
        cat > .env << EOF
APP_NAME=Aura Memory Backend
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=aura_memory_db
MEMMACHINE_MCP_URL=http://localhost:8090
MEMMACHINE_USER_ID=default-user

# Optional: Add your API keys below
# OPENAI_API_KEY=your_openai_api_key_here
# ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_phone_number
EOF
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file and add your MongoDB URI and API keys if needed${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Verify MongoDB connection (optional)
echo ""
echo -e "${YELLOW}Verifying MongoDB connection...${NC}"
if command -v mongosh &> /dev/null; then
    # Try to connect to MongoDB
    if mongosh --eval "db.runCommand('ping')" --quiet > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MongoDB is running and accessible${NC}"
    else
        echo -e "${YELLOW}⚠ MongoDB connection failed. Please ensure MongoDB is running${NC}"
        echo -e "${YELLOW}   Start MongoDB with: mongod (or brew services start mongodb-community on macOS)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ mongosh not found. Skipping MongoDB connection check${NC}"
fi

# Test configuration
echo ""
echo -e "${YELLOW}Testing configuration...${NC}"
if python3 -c "from app.config import get_settings; get_settings()" 2>/dev/null; then
    echo -e "${GREEN}✓ Configuration is valid${NC}"
else
    echo -e "${YELLOW}⚠ Configuration test failed. This is normal if MongoDB is not running${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}To start the backend server:${NC}"
echo "  ./start.sh"
echo ""
echo -e "${GREEN}Or manually:${NC}"
echo "  source .venv/bin/activate"
echo "  python3 scripts/setup_and_run.py"
echo ""

