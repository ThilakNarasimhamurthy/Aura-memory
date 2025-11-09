#!/bin/bash
# Frontend setup script for Aura Memory Platform

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
echo -e "${BLUE}  Frontend Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $NODE_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $NODE_VERSION${NC}"

# Check npm
echo ""
echo -e "${YELLOW}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"

# Check if node_modules exists
echo ""
echo -e "${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
    echo -e "${YELLOW}Updating dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies updated${NC}"
fi

# Create .env file if it doesn't exist (only one .env file per folder)
echo ""
echo -e "${YELLOW}Setting up environment variables...${NC}"

# Remove any backup or duplicate .env files
rm -f .env.example.tmp .env.backup .env.bak .env.tmp .env.old .env.*.bak 2>/dev/null

if [ ! -f ".env" ]; then
    # Check if .env.example exists and use it as template
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file and add your configuration if needed${NC}"
    else
        echo -e "${YELLOW}Creating .env file...${NC}"
        cat > .env << EOF
# API Base URL
VITE_API_BASE_URL=http://localhost:8000

# Optional: OpenAI API Key (for client-side features)
# VITE_OPENAI_API_KEY=your_openai_api_key_here
EOF
        echo -e "${GREEN}✓ .env file created${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Verify backend connection (optional)
echo ""
echo -e "${YELLOW}Checking backend connection...${NC}"
if command -v curl &> /dev/null; then
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running and accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Backend is not running or not accessible at http://localhost:8000${NC}"
        echo -e "${YELLOW}   Start the backend with: cd ../backend && ./start.sh${NC}"
    fi
else
    echo -e "${YELLOW}⚠ curl not found. Skipping backend connection check${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Frontend setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}To start the frontend development server:${NC}"
echo "  ./start.sh"
echo ""
echo -e "${GREEN}Or manually:${NC}"
echo "  npm run dev"
echo ""

