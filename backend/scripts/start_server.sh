#!/bin/bash
# Script to start the FastAPI backend server

cd "$(dirname "$0")"

# Kill any existing process on port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Killing existing process on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Check if .env file exists and has required fields
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
APP_NAME=ELL Backend
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ell_db
EOF
    echo "✓ .env file created with default values"
    echo ""
    echo "⚠️  IMPORTANT: Update MONGODB_URI in .env with your MongoDB connection string"
    echo "   (You can get it from MongoDB Compass - copy the connection string)"
    echo ""
elif ! grep -q "MONGODB_URI=" .env || grep -q "^MONGODB_URI=$" .env; then
    echo "⚠️  .env file exists but MONGODB_URI is missing or empty"
    echo "   Please add: MONGODB_URI=your_connection_string"
    echo ""
else
    echo "✓ .env file exists"
fi

# Check if virtual environment exists
if [ ! -d .venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "✓ Virtual environment created"
    echo "Installing dependencies..."
    source .venv/bin/activate
    pip install -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "✓ Virtual environment exists"
    source .venv/bin/activate
fi

# Check if dependencies are installed
echo "Checking dependencies..."
python3 test_python.py 2>&1 | grep -E "✓|✗" || echo "Running dependency check..."

# Verify .env file has MONGODB_URI before starting
if ! grep -q "^MONGODB_URI=" .env || grep -q "^MONGODB_URI=$" .env; then
    echo ""
    echo "❌ ERROR: MONGODB_URI is not set in .env file"
    echo ""
    echo "Please edit .env and add your MongoDB connection string:"
    echo "  MONGODB_URI=mongodb://localhost:27017"
    echo "  or"
    echo "  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/"
    echo ""
    exit 1
fi

# Start the server
echo ""
echo "Starting FastAPI server..."
echo "Server will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo "Health check at: http://localhost:8000/health"
echo ""
echo "Press CTRL+C to stop the server"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

