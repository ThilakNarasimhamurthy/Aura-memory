#!/bin/bash
# Quick start script for MemMachine MCP Server
# This script starts MemMachine on port 8081 to avoid conflict with Vite dev server (port 8080)

cd "$(dirname "$0")"
./run_mcp_server.sh 8081 localhost

