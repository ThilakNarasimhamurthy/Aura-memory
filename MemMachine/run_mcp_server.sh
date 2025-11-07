#!/bin/bash
# Script to run MemMachine MCP Server in HTTP mode

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}MemMachine MCP Server Setup${NC}"
echo "================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: uv is not installed.${NC}"
    echo "Please install uv first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Check if Python 3.12+ is available
# Try to find Python 3.12 or higher
PYTHON_CMD=""
for py_cmd in python3.13 python3.12 python3; do
    if command -v $py_cmd &> /dev/null; then
        PYTHON_VERSION=$($py_cmd --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        
        if [ "$PYTHON_MAJOR" -gt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 12 ]); then
            PYTHON_CMD=$py_cmd
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}Error: Python 3.12+ is required but not found${NC}"
    echo "Please install Python 3.12 or higher"
    echo "You can use uv to install it: uv python install 3.12"
    exit 1
fi

echo -e "${GREEN}✓${NC} Python version: $($PYTHON_CMD --version)"
echo -e "${GREEN}✓${NC} uv is installed"


# Set default port if not provided
PORT=${1:-8080}
HOST=${2:-localhost}

# Set configuration file path (required for MCP HTTP mode)
# The HTTP mode defaults to 'cfg.yml' but the actual file is 'configuration.yml'
export MEMORY_CONFIG="${MEMORY_CONFIG:-configuration.yml}"

# Check if configuration file exists
if [ ! -f "$MEMORY_CONFIG" ]; then
    echo -e "${RED}Error: Configuration file '$MEMORY_CONFIG' not found${NC}"
    echo "Please make sure 'configuration.yml' exists in the MemMachine directory"
    exit 1
fi

echo -e "${GREEN}✓${NC} Using configuration file: $MEMORY_CONFIG"

echo ""
echo -e "${GREEN}Setting up virtual environment and installing dependencies...${NC}"

# Use uv to sync dependencies (this will create a venv if needed with correct Python)
echo "Syncing project dependencies with uv..."
uv sync --python "$PYTHON_CMD" 2>&1 | tail -30

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Trying alternative installation method...${NC}"
    # Fallback: create venv and install
    if [ ! -d ".venv" ]; then
        echo "Creating virtual environment..."
        $PYTHON_CMD -m venv .venv
    fi
    source .venv/bin/activate
    pip install -e . 2>&1 | tail -30
fi

echo ""
echo -e "${GREEN}Starting MemMachine MCP HTTP Server...${NC}"
echo "Server will be available at: http://${HOST}:${PORT}"
echo "MCP endpoint: http://${HOST}:${PORT}/mcp/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the MCP HTTP server using uv run (which handles the venv)
# Make sure MEMORY_CONFIG is exported so the server can find it
export MEMORY_CONFIG
uv run --python "$PYTHON_CMD" memmachine-mcp-http --host "$HOST" --port "$PORT"

