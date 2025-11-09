#!/bin/bash
# Quick start script for MemMachine MCP Server on port 8081

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting MemMachine MCP Server on port 8090..."
echo ""

# Check if already running
if lsof -i :8090 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  Port 8090 is already in use!"
    echo "   Please stop the existing process or use a different port."
    exit 1
fi

# Check if databases are available (for better error messages)
echo "Checking database requirements..."
echo ""

# Check Neo4j (from configuration.yml)
NEO4J_HOST=$(grep -A 5 "my_storage_id:" configuration.yml | grep "host:" | awk '{print $2}' | tr -d '"' || echo "neo4j")
NEO4J_PORT=$(grep -A 5 "my_storage_id:" configuration.yml | grep "port:" | awk '{print $2}' || echo "7687")

# Check PostgreSQL
POSTGRES_HOST=$(grep -A 5 "profile_storage:" configuration.yml | grep "host:" | awk '{print $2}' | tr -d '"' || echo "postgres")
POSTGRES_PORT=$(grep -A 5 "profile_storage:" configuration.yml | grep "port:" | awk '{print $2}' || echo "5432")

if [ "$NEO4J_HOST" = "neo4j" ] || [ "$POSTGRES_HOST" = "postgres" ]; then
    echo "⚠️  Warning: Configuration uses Docker hostnames ($NEO4J_HOST, $POSTGRES_HOST)"
    echo "   These only work when running in Docker Compose."
    echo ""
    echo "   Options:"
    echo "   1. Use Docker Compose: ./start_with_docker.sh"
    echo "   2. Update configuration.yml to use 'localhost' if databases are installed locally"
    echo "   3. Skip MemMachine (backend works without it!)"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Use './start_with_docker.sh' to start with Docker Compose."
        exit 1
    fi
fi

echo "Starting MemMachine MCP server..."
echo "   Note: Server will exit if databases are not accessible."
echo ""

# Run the MCP server script with port 8090
./run_mcp_server.sh 8090
