#!/bin/bash
# Script to test API endpoints and show outputs

BASE_URL="http://localhost:8000"

echo "=== Testing API Endpoints ==="
echo ""

echo "1. Health Check:"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

echo "2. List Collections:"
curl -s "$BASE_URL/documents" | python3 -m json.tool
echo ""

echo "3. MemMachine Health:"
curl -s "$BASE_URL/memories/health" | python3 -m json.tool
echo ""

echo "4. Add Memory:"
curl -s -X POST "$BASE_URL/memories" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "user_id": "test-user"}' | python3 -m json.tool
echo ""

echo "5. Search Memories:"
curl -s -X POST "$BASE_URL/memories/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 3}' | python3 -m json.tool
echo ""

echo "=== API Tests Complete ==="
