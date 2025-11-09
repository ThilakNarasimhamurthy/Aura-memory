#!/bin/bash
# Frontend start script for Aura Memory Platform

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
echo -e "${BLUE}  Starting Frontend Development Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not installed. Running setup...${NC}"
    ./setup.sh
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating default .env file...${NC}"
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Check if backend is running (optional)
echo -e "${YELLOW}Checking backend connection...${NC}"
if command -v curl &> /dev/null; then
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running${NC}"
    else
        echo -e "${YELLOW}⚠ Backend is not running at http://localhost:8000${NC}"
        echo -e "${YELLOW}   Start the backend in another terminal: cd ../backend && ./start.sh${NC}"
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Start development server
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Starting Vite development server...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Frontend will be available at:${NC}"
echo "  http://localhost:5173"
echo ""
echo -e "${YELLOW}Press CTRL+C to stop the server${NC}"
echo ""

# Start server
npm run dev

