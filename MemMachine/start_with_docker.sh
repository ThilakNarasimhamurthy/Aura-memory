#!/bin/bash
# Start MemMachine with Docker Compose (includes Neo4j and PostgreSQL)

set -e

echo "🚀 Starting MemMachine with Docker Compose..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is required but not installed."
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found in MemMachine directory"
    exit 1
fi

# Check for port conflicts
echo "Checking for port conflicts..."
echo ""

# Check port 8080 (frontend)
if lsof -i :8080 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  Port 8080 is in use (likely frontend/Vite)"
    echo "   MemMachine will use port 8090 instead"
fi

# Check port 8090 (MemMachine)
if lsof -i :8090 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  Port 8090 is already in use!"
    echo "   Please stop the process using port 8090 or set MEMORY_SERVER_PORT to a different port"
    exit 1
fi

# Set default port to 8090 to avoid conflict with frontend (8080) and other services
export MEMORY_SERVER_PORT=${MEMORY_SERVER_PORT:-8090}
export POSTGRES_PORT=${POSTGRES_PORT:-5433}
export NEO4J_PORT=${NEO4J_PORT:-7688}
export NEO4J_HTTP_PORT=${NEO4J_HTTP_PORT:-7475}
export NEO4J_HTTPS_PORT=${NEO4J_HTTPS_PORT:-7476}

# Load .env.docker if it exists
if [ -f ".env.docker" ]; then
    echo "Loading .env.docker configuration..."
    set -a
    source .env.docker
    set +a
fi

echo "Configuration:"
echo "  MemMachine MCP Server: http://localhost:${MEMORY_SERVER_PORT}"
echo "  PostgreSQL: localhost:${POSTGRES_PORT}"
echo "  Neo4j: localhost:${NEO4J_PORT} (HTTP: localhost:${NEO4J_HTTP_PORT}, HTTPS: localhost:${NEO4J_HTTPS_PORT})"
echo ""

echo "Starting databases (Neo4j and PostgreSQL) and MemMachine server..."
echo ""

# Start services
if command -v docker-compose &> /dev/null; then
    docker-compose --env-file .env.docker up -d 2>&1 || docker-compose up -d
else
    docker compose --env-file .env.docker up -d 2>&1 || docker compose up -d
fi

echo ""
echo "✅ Services started!"
echo ""
echo "MemMachine MCP server should be available at: http://localhost:${MEMORY_SERVER_PORT}"
echo "PostgreSQL is available at: localhost:${POSTGRES_PORT}"
echo "Neo4j Browser: http://localhost:${NEO4J_HTTP_PORT}"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f memmachine"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "To check status:"
echo "  docker-compose ps"

