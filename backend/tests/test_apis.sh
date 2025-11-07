#!/bin/bash
# Test script to verify all APIs are working

BASE_URL="http://localhost:8000"

echo "========================================="
echo "Testing Backend APIs"
echo "========================================="
echo ""

# Test Health Endpoint
echo "1. Testing Health Endpoint..."
HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH" | grep -v "HTTP_CODE")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "   Response: $BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
fi
echo ""

# Test API Docs
echo "2. Testing API Documentation..."
DOCS=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/docs")
HTTP_CODE=$(echo "$DOCS" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API docs accessible"
else
    echo "❌ API docs not accessible (HTTP $HTTP_CODE)"
fi
echo ""

# Test LangChain RAG Endpoints
echo "3. Testing LangChain RAG Endpoints..."
RAG_TEST=$(curl -s -X POST "$BASE_URL/langchain-rag/query" \
    -H "Content-Type: application/json" \
    -d '{"query": "test query", "k": 5}' \
    -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RAG_TEST" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RAG_TEST" | grep -v "HTTP_CODE" | head -3)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ RAG query endpoint working"
    echo "   Response preview: $BODY"
elif [ "$HTTP_CODE" = "422" ]; then
    echo "⚠️  RAG query endpoint exists but validation failed (might be expected)"
else
    echo "❌ RAG query endpoint failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test Campaign Query Endpoint
echo "4. Testing Campaign Query Endpoint..."
CAMPAIGN_TEST=$(curl -s -X POST "$BASE_URL/langchain-rag/query/campaign" \
    -H "Content-Type: application/json" \
    -d '{"query": "test campaign query", "k": 5}' \
    -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$CAMPAIGN_TEST" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$CAMPAIGN_TEST" | grep -v "HTTP_CODE" | head -3)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Campaign query endpoint working"
    echo "   Response preview: $BODY"
elif [ "$HTTP_CODE" = "422" ]; then
    echo "⚠️  Campaign query endpoint exists but validation failed (might be expected)"
else
    echo "❌ Campaign query endpoint failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test Phone Call Endpoints
echo "5. Testing Phone Call Endpoints..."
PHONE_TEST=$(curl -s -X GET "$BASE_URL/phone-call/twiml" \
    -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$PHONE_TEST" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "405" ]; then
    echo "✅ Phone call endpoints registered"
else
    echo "❌ Phone call endpoints not accessible (HTTP $HTTP_CODE)"
fi
echo ""

echo "========================================="
echo "API Testing Complete"
echo "========================================="

