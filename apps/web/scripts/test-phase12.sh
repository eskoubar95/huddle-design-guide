#!/bin/bash

# Phase 12: Testing & Polish - Endpoint Testing Script
# Tests all API endpoints for basic functionality

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api/v1"

echo "🧪 Testing Huddle API v1 Endpoints"
echo "===================================="
echo "Base URL: ${API_BASE}"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test helper function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4
  local data=$5
  
  local url="${API_BASE}${endpoint}"
  local response
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
  fi
  
  local status_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✅${NC} $description (${status_code})"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌${NC} $description (expected ${expected_status}, got ${status_code})"
    echo "   Response: $body" | head -c 200
    echo ""
    ((FAILED++))
    return 1
  fi
}

# Health Check
echo "📋 Health Check"
test_endpoint "GET" "/health" 200 "Health check endpoint"

# Jerseys
echo ""
echo "📋 Jerseys"
test_endpoint "GET" "/jerseys?limit=5" 200 "List jerseys (public)"
test_endpoint "GET" "/jerseys/invalid-id" 404 "Get non-existent jersey"

# Listings
echo ""
echo "📋 Sale Listings"
test_endpoint "GET" "/listings?limit=5" 200 "List listings (public)"
test_endpoint "GET" "/listings/invalid-id" 404 "Get non-existent listing"

# Auctions
echo ""
echo "📋 Auctions"
test_endpoint "GET" "/auctions?limit=5" 200 "List auctions (public)"
test_endpoint "GET" "/auctions/invalid-id" 404 "Get non-existent auction"

# Posts
echo ""
echo "📋 Posts"
test_endpoint "GET" "/posts?limit=5" 200 "List posts (public)"
test_endpoint "GET" "/posts/invalid-id" 404 "Get non-existent post"

# Profiles
echo ""
echo "📋 Profiles"
test_endpoint "GET" "/profiles/invalid-id" 404 "Get non-existent profile"

# Auth
echo ""
echo "📋 Auth"
test_endpoint "POST" "/auth" 401 "Check auth without token (should fail)"

# Error Format Test
echo ""
echo "📋 Error Format"
response=$(curl -s "${API_BASE}/jerseys/invalid-id")
if echo "$response" | grep -q '"error"'; then
  echo -e "${GREEN}✅${NC} Error format is consistent (has 'error' key)"
  ((PASSED++))
else
  echo -e "${RED}❌${NC} Error format is inconsistent"
  ((FAILED++))
fi

# Rate Limiting Test (basic)
echo ""
echo "📋 Rate Limiting"
# Make 5 requests quickly
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/health" > /dev/null
done
# Check if rate limit headers are present
response=$(curl -s -I "${API_BASE}/health" | grep -i "x-ratelimit" || true)
if [ -n "$response" ]; then
  echo -e "${GREEN}✅${NC} Rate limit headers present"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠️${NC}  Rate limit headers not found (may be normal for health endpoint)"
fi

# Summary
echo ""
echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

