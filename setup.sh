#!/bin/bash
# Main setup script for Aura Memory Platform
# This script sets up all components: Backend, Frontend, and MemMachine

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
echo -e "${BLUE}  Aura Memory Platform Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.9+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Check MongoDB (optional check)
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB client found${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB client not found. Make sure MongoDB is installed and running${NC}"
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found${NC}"
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. MemMachine will need manual database setup${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setting up components...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Setup Backend
echo -e "${YELLOW}📦 Setting up Backend...${NC}"
if [ -f "backend/setup.sh" ]; then
    chmod +x backend/setup.sh
    cd backend
    ./setup.sh
    cd ..
else
    echo -e "${RED}❌ backend/setup.sh not found${NC}"
    exit 1
fi

echo ""

# Setup Frontend
echo -e "${YELLOW}📦 Setting up Frontend...${NC}"
if [ -f "frontend/setup.sh" ]; then
    chmod +x frontend/setup.sh
    cd frontend
    ./setup.sh
    cd ..
else
    echo -e "${RED}❌ frontend/setup.sh not found${NC}"
    exit 1
fi

echo ""

# Setup MemMachine (optional)
echo -e "${YELLOW}📦 Setting up MemMachine (optional)...${NC}"
read -p "Do you want to set up MemMachine? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "MemMachine/setup.sh" ]; then
        chmod +x MemMachine/setup.sh
        cd MemMachine
        ./setup.sh
        cd ..
    else
        echo -e "${YELLOW}⚠ MemMachine/setup.sh not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping MemMachine setup${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Start Backend:"
echo "   cd backend && ./start.sh"
echo ""
echo "2. Start MemMachine (optional):"
echo "   cd MemMachine && ./start_memmachine.sh"
echo ""
echo "3. Start Frontend:"
echo "   cd frontend && ./start.sh"
echo ""
echo "4. Import sample data:"
echo "   cd backend && python3 scripts/generate_and_import_synthetic_data.py"
echo ""
echo -e "${BLUE}Or use the run.sh script to start all services:${NC}"
echo "   ./run.sh"
echo ""

