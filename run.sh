#!/bin/bash
# Run script to start all services for Aura Memory Platform
# This script starts Backend, MemMachine (optional), and Frontend in separate terminal windows

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
echo -e "${BLUE}  Starting Aura Memory Platform${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TERMINAL_APP="Terminal.app"
    OPEN_CMD="open -a Terminal"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        TERMINAL_APP="gnome-terminal"
        OPEN_CMD="gnome-terminal"
    elif command -v xterm &> /dev/null; then
        TERMINAL_APP="xterm"
        OPEN_CMD="xterm"
    else
        echo -e "${RED}❌ No terminal emulator found. Please start services manually${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Unsupported OS. Please start services manually${NC}"
    exit 1
fi

# Function to start service in new terminal
start_service() {
    local service_name=$1
    local script_path=$2
    local dir=$3
    
    echo -e "${YELLOW}Starting $service_name...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell application \"Terminal\"" \
                  -e "do script \"cd '$SCRIPT_DIR/$dir' && $script_path\"" \
                  -e "end tell" > /dev/null
    elif [[ "$TERMINAL_APP" == "gnome-terminal" ]]; then
        # Linux - GNOME Terminal
        gnome-terminal -- bash -c "cd '$SCRIPT_DIR/$dir' && $script_path; exec bash" > /dev/null 2>&1
    elif [[ "$TERMINAL_APP" == "xterm" ]]; then
        # Linux - xterm
        xterm -e "cd '$SCRIPT_DIR/$dir' && $script_path" > /dev/null 2>&1 &
    fi
    
    sleep 2
    echo -e "${GREEN}✓ $service_name started${NC}"
}

# Check if services are set up
echo -e "${YELLOW}Checking if services are set up...${NC}"

# Check Backend
if [ ! -f "backend/.venv/bin/activate" ]; then
    echo -e "${YELLOW}⚠ Backend not set up. Running setup...${NC}"
    cd backend
    ./setup.sh
    cd ..
fi

# Check Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠ Frontend not set up. Running setup...${NC}"
    cd frontend
    ./setup.sh
    cd ..
fi

echo ""

# Start Backend
start_service "Backend" "./start.sh" "backend"

# Ask about MemMachine
echo ""
read -p "Do you want to start MemMachine? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "MemMachine/start_memmachine.sh" ]; then
        start_service "MemMachine" "./start_memmachine.sh" "MemMachine"
    else
        echo -e "${YELLOW}⚠ MemMachine start script not found${NC}"
    fi
fi

# Start Frontend
start_service "Frontend" "./start.sh" "frontend"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Services are running in separate terminal windows:${NC}"
echo ""
echo "  📦 Backend:   http://localhost:8000"
echo "  📦 Frontend:  http://localhost:5173"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  📦 MemMachine: http://localhost:8090"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Import sample data: cd backend && python3 scripts/generate_and_import_synthetic_data.py"
echo "  2. Open frontend: http://localhost:5173"
echo "  3. Check API docs: http://localhost:8000/docs"
echo ""

