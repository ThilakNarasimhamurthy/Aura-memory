#!/bin/bash

# MemMachine Learning Tests
# This script provides interactive tests to learn about MemMachine

set -e

BASE_URL="http://localhost:8080"
USER_ID="alice"
SESSION_ID="learning-session-$(date +%s)"
GROUP_ID="learning-group"

echo "🧠 MemMachine Learning Tests"
echo "============================"
echo ""
echo "Base URL: $BASE_URL"
echo "User ID: $USER_ID"
echo "Session ID: $SESSION_ID"
echo "Group ID: $GROUP_ID"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "Checking if MemMachine is running..."
response=$(curl -s "$BASE_URL/health")
echo "$response" | jq '.'
echo ""

# Test 2: Store First Memory
echo -e "${BLUE}Test 2: Store First Memory (Episodic + Profile)${NC}"
echo "Storing: 'I love learning about AI and machine learning...'"
curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "I love learning about AI and machine learning. My favorite topics are neural networks and natural language processing.",
    "episode_type": "text",
    "metadata": {"test": "learning"}
  }' | jq '.'
echo ""

sleep 2

# Test 3: Store More Memories
echo -e "${BLUE}Test 3: Store Multiple Memories${NC}"

echo "Memory 1: Travel plans"
curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "I am planning a trip to Japan next month. I want to visit Tokyo and Kyoto. I am interested in traditional temples and modern technology.",
    "episode_type": "text"
  }' > /dev/null

echo "Memory 2: Programming"
curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "My favorite programming languages are Python and JavaScript. I use Python for data science and JavaScript for web development.",
    "episode_type": "text"
  }' > /dev/null

echo "Memory 3: Hobbies"
curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "I enjoy hiking and photography. Last summer I hiked in the Rocky Mountains and took amazing photos of wildlife.",
    "episode_type": "text"
  }' > /dev/null

echo -e "${GREEN}✓ Stored 3 memories${NC}"
echo ""

sleep 3

# Test 4: Search Memories
echo -e "${BLUE}Test 4: Search Memories - AI/ML Topic${NC}"
echo "Query: 'What are my interests in technology?'"
curl -s -X POST "$BASE_URL/v1/memories/search" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "query": "What are my interests in technology?",
    "limit": 5
  }' | jq '{
    episodic_results: .episodic_memory_results | length,
    profile_results: .profile_memory_results | length,
    top_episodic: .episodic_memory_results[0:2] | map({content: .content, relevance: .relevance})
  }'
echo ""

# Test 5: Search Travel
echo -e "${BLUE}Test 5: Search Memories - Travel Topic${NC}"
echo "Query: 'travel plans and destinations'"
curl -s -X POST "$BASE_URL/v1/memories/search" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "query": "travel plans and destinations",
    "limit": 3
  }' | jq '{
    episodic_results: .episodic_memory_results | length,
    top_results: .episodic_memory_results[0:2] | map({content: .content, relevance: .relevance})
  }'
echo ""

# Test 6: Search Programming
echo -e "${BLUE}Test 6: Search Memories - Programming Topic${NC}"
echo "Query: 'programming languages and development'"
curl -s -X POST "$BASE_URL/v1/memories/search" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "query": "programming languages and development",
    "limit": 3
  }' | jq '{
    episodic_results: .episodic_memory_results | length,
    top_results: .episodic_memory_results[0:2] | map({content: .content, relevance: .relevance})
  }'
echo ""

# Test 7: Store Episodic Only
echo -e "${BLUE}Test 7: Store to Episodic Memory Only${NC}"
echo "Storing temporary conversation note..."
curl -s -X POST "$BASE_URL/v1/memories/episodic" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "This is a temporary conversation note that should only be stored in episodic memory, not profile memory.",
    "episode_type": "text"
  }' | jq '.'
echo ""

sleep 2

# Test 8: Store Profile Only
echo -e "${BLUE}Test 8: Store to Profile Memory Only${NC}"
echo "Storing user fact..."
curl -s -X POST "$BASE_URL/v1/memories/profile" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "producer": "'$USER_ID'",
    "produced_for": "'$USER_ID'",
    "episode_content": "Alice is a software engineer who specializes in machine learning and full-stack web development. She works remotely and enjoys traveling.",
    "episode_type": "text"
  }' | jq '.'
echo ""

sleep 2

# Test 9: Search Profile Memory
echo -e "${BLUE}Test 9: Search Profile Memory${NC}"
echo "Query: 'What do I know about the user?'"
curl -s -X POST "$BASE_URL/v1/memories/search" \
  -H "Content-Type: application/json" \
  -H "user-id: $USER_ID" \
  -H "session-id: $SESSION_ID" \
  -H "group-id: $GROUP_ID" \
  -d '{
    "query": "What do I know about the user?",
    "limit": 5
  }' | jq '{
    profile_results_count: .profile_memory_results | length,
    profile_results: .profile_memory_results[0:3] | map({content: .content, relevance: .relevance})
  }'
echo ""

# Test 10: Multi-User Session
echo -e "${BLUE}Test 10: Multi-User Session${NC}"
echo "Creating conversation between alice and bob..."
curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: alice,bob" \
  -H "session-id: team-session-1" \
  -H "group-id: project-team" \
  -d '{
    "producer": "alice",
    "produced_for": "bob",
    "episode_content": "Hey Bob, let me know when you finish the API documentation. We need it for the client presentation.",
    "episode_type": "text"
  }' > /dev/null

curl -s -X POST "$BASE_URL/v1/memories" \
  -H "Content-Type: application/json" \
  -H "user-id: alice,bob" \
  -H "session-id: team-session-1" \
  -H "group-id: project-team" \
  -d '{
    "producer": "bob",
    "produced_for": "alice",
    "episode_content": "Sure Alice, I will finish it by tomorrow afternoon. I am working on the authentication section right now.",
    "episode_type": "text"
  }' > /dev/null

echo -e "${GREEN}✓ Created multi-user conversation${NC}"
echo ""

# Test 11: Search Multi-User Session
echo -e "${BLUE}Test 11: Search Multi-User Session${NC}"
echo "Query: 'What was discussed in the team session?'"
curl -s -X POST "$BASE_URL/v1/memories/search" \
  -H "Content-Type: application/json" \
  -H "user-id: alice,bob" \
  -H "session-id: team-session-1" \
  -H "group-id: project-team" \
  -d '{
    "query": "What was discussed in the team session?",
    "limit": 5
  }' | jq '{
    episodic_results: .episodic_memory_results | length,
    conversations: .episodic_memory_results | map({content: .content, producer: .producer, produced_for: .produced_for})
  }'
echo ""

# Summary
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}✅ Learning Tests Complete!${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo "What you learned:"
echo "1. ✓ Health check endpoint"
echo "2. ✓ Storing memories (episodic + profile)"
echo "3. ✓ Storing multiple memories"
echo "4. ✓ Semantic search across memories"
echo "5. ✓ Topic-specific searches"
echo "6. ✓ Episodic-only storage"
echo "7. ✓ Profile-only storage"
echo "8. ✓ Profile memory search"
echo "9. ✓ Multi-user sessions"
echo "10. ✓ Session-based memory organization"
echo ""
echo "Next steps:"
echo "- Check Neo4j Browser: http://localhost:7474"
echo "- Explore API docs: http://localhost:8080/docs"
echo "- Read LEARNING_GUIDE.md for more details"
echo ""

