#!/bin/bash
# Backend start script for Aura Memory Platform

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
echo -e "${BLUE}  Starting Backend Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${RED}❌ Virtual environment not found. Please run ./setup.sh first${NC}"
    exit 1
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating default .env file...${NC}"
    cat > .env << EOF
APP_NAME=Aura Memory Backend
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=aura_memory_db
MEMMACHINE_MCP_URL=http://localhost:8090
MEMMACHINE_USER_ID=default-user
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Kill any process on port 8000
echo ""
echo -e "${YELLOW}Checking port 8000...${NC}"
if lsof -ti:8000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 8000 is in use. Killing existing process...${NC}"
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ Port 8000 cleared${NC}"
fi

# Start server
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Starting FastAPI server...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Server will be available at:${NC}"
echo "  API: http://localhost:8000"
echo "  Docs: http://localhost:8000/docs"
echo "  Health: http://localhost:8000/health"
echo ""
echo -e "${YELLOW}Press CTRL+C to stop the server${NC}"
echo ""

# Start server using setup_and_run.py
python3 scripts/setup_and_run.py

