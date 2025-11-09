#!/bin/bash
# Data import script for Aura Memory Platform

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
echo -e "${BLUE}  Importing Sample Data${NC}"
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

# Check if backend is running
echo ""
echo -e "${YELLOW}Checking if backend is running...${NC}"
if command -v curl &> /dev/null; then
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running${NC}"
    else
        echo -e "${RED}❌ Backend is not running at http://localhost:8000${NC}"
        echo -e "${YELLOW}   Please start the backend first: ./start.sh${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ curl not found. Skipping backend check${NC}"
    echo -e "${YELLOW}   Make sure the backend is running at http://localhost:8000${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if data import script exists
if [ ! -f "scripts/generate_and_import_synthetic_data.py" ]; then
    echo -e "${RED}❌ Data import script not found${NC}"
    exit 1
fi

# Check if faker is installed
echo ""
echo -e "${YELLOW}Checking dependencies...${NC}"
if python3 -c "import faker" 2>/dev/null; then
    echo -e "${GREEN}✓ faker is installed${NC}"
else
    echo -e "${YELLOW}⚠ faker is not installed. Installing...${NC}"
    pip install faker
    echo -e "${GREEN}✓ faker installed${NC}"
fi

# Run data import
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Importing sample data...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}This may take a few minutes...${NC}"
echo ""

python3 scripts/generate_and_import_synthetic_data.py

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Data import complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Sample data has been imported to MongoDB:${NC}"
echo "  - 500 customers"
echo "  - 200 products"
echo "  - 2000 transactions"
echo "  - 1500 orders"
echo "  - 50 campaigns"
echo "  - RAG chunks for vector search"
echo ""
echo -e "${GREEN}You can now view the data in the frontend dashboard!${NC}"
echo ""

