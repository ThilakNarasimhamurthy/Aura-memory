#!/bin/bash
# Simple wrapper to ensure correct module path

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Error: Virtual environment not found. Please run: python3 -m venv .venv"
    exit 1
fi

# Activate virtual environment and run server
source .venv/bin/activate
python3 run_server.py
