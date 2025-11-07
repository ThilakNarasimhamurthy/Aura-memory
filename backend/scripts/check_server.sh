#!/bin/bash
# Script to check if the FastAPI server is running

echo "Checking if server is running..."
echo ""

# Check if process is running
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "✓ Uvicorn process is running"
else
    echo "✗ Uvicorn process not found"
    exit 1
fi

# Check if port is listening
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✓ Port 8000 is listening"
else
    echo "✗ Port 8000 is not listening"
    exit 1
fi

# Test health endpoint
echo ""
echo "Testing health endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)

if [ "$response" = "200" ]; then
    echo "✓ Health endpoint responding (HTTP $response)"
    echo ""
    echo "Health check response:"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health
    echo ""
    echo "✓ Server is up and running!"
    echo ""
    echo "Available endpoints:"
    echo "  - Health: http://localhost:8000/health"
    echo "  - API Docs: http://localhost:8000/docs"
    echo "  - Collections: http://localhost:8000/documents"
else
    echo "✗ Health endpoint returned HTTP $response"
    exit 1
fi

