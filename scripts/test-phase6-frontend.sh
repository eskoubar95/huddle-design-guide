#!/bin/bash

# Phase 6 Frontend Integration Test Script
# Tests API routes and frontend integration

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://trbyclravrmmhxplocsr.supabase.co}"
API_BASE="http://localhost:3000/api/v1/metadata"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Phase 6 Frontend Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_api() {
  local name=$1
  local method=$2
  local url=$3
  local expected_status=$4
  
  echo "📋 Test: $name"
  echo "   Method: $method"
  echo "   URL: $url"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url" || echo -e "\n000")
  else
    echo "   ⚠️  POST/PUT/DELETE tests not implemented"
    return
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo "   ✅ Status: $http_code (Expected: $expected_status)"
    echo "   📦 Response: $(echo "$body" | head -c 100)..."
    ((PASSED++))
  else
    echo "   ❌ Status: $http_code (Expected: $expected_status)"
    echo "   📦 Response: $(echo "$body" | head -c 200)"
    ((FAILED++))
  fi
  echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Clubs Search API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test FC Copenhagen (stored as English name in database)
test_api \
  "Clubs Search - FC Copenhagen" \
  "GET" \
  "$API_BASE/clubs/search?q=FC+Copenhagen" \
  "200"

test_api \
  "Clubs Search - Barcelona" \
  "GET" \
  "$API_BASE/clubs/search?q=Barcelona" \
  "200"

test_api \
  "Clubs Search - Empty query" \
  "GET" \
  "$API_BASE/clubs/search?q=" \
  "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Players Search API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: Requires clubId - using FC København ID (assuming it exists)
test_api \
  "Players Search - With clubId" \
  "GET" \
  "$API_BASE/players/search?clubId=test-club-id&q=Messi" \
  "200"

test_api \
  "Players Search - Missing clubId" \
  "GET" \
  "$API_BASE/players/search?q=Messi" \
  "400"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Seasons Search API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_api \
  "Seasons Search - 22/23" \
  "GET" \
  "$API_BASE/seasons/search?q=22/23" \
  "200"

test_api \
  "Seasons Search - 2023" \
  "GET" \
  "$API_BASE/seasons/search?q=2023" \
  "200"

test_api \
  "Seasons Search - Empty query (should return recent)" \
  "GET" \
  "$API_BASE/seasons/search?q=" \
  "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Existing Metadata Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_api \
  "Clubs - Get all" \
  "GET" \
  "$API_BASE/clubs" \
  "200"

test_api \
  "Seasons - Get all" \
  "GET" \
  "$API_BASE/seasons" \
  "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Check output above."
  exit 1
fi

