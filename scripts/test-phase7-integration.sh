#!/bin/bash

# Integration tests for Phase 7 - Edge Functions
# Tests the full stack: Edge Functions → Services → Repositories → Database

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Phase 7: Integration Tests for Edge Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine Supabase URL and Service Role Key
if command -v supabase &> /dev/null; then
  SUPABASE_STATUS=$(supabase status --output json 2>/dev/null || echo '{}')
  SUPABASE_URL=$(echo "$SUPABASE_STATUS" | grep -o '"API URL":"[^"]*"' | cut -d'"' -f4 || echo "")
  SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | grep -o '"service_role key":"[^"]*"' | cut -d'"' -f4 || echo "")
fi

# Fallback to environment variables
SUPABASE_URL=${SUPABASE_URL:-${SUPABASE_PROJECT_URL:-"http://127.0.0.1:54321"}}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY}}

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
  echo "   Set it in your environment or run: supabase status"
  exit 1
fi

FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"
echo "📍 Testing against: ${FUNCTIONS_URL}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_function() {
  local name=$1
  local endpoint=$2
  local method=${3:-POST}
  local body=$4
  local expected_status=${5:-200}
  
  echo "🧪 Testing: ${name}"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      "${FUNCTIONS_URL}${endpoint}")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X "${method}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "${body}" \
      "${FUNCTIONS_URL}${endpoint}")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    echo "   ✅ PASSED (HTTP ${http_code})"
    echo "$body" | jq '.' 2>/dev/null || echo "$body" | head -5
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "   ❌ FAILED (Expected ${expected_status}, got ${http_code})"
    echo "$body" | head -10
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Test 1: match-jersey-metadata
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing match-jersey-metadata"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_function \
  "Match club and season" \
  "/match-jersey-metadata" \
  "POST" \
  '{"club": "FC Copenhagen", "season": "23/24"}' \
  200

# Test 2: search-metadata (if exists)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing search functionality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Note: This would require a search endpoint - skipping for now

# Test 3: backfill-metadata
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing backfill-metadata"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# First, get a valid club and season
test_function \
  "Backfill club season data" \
  "/backfill-metadata" \
  "POST" \
  '{"clubId": "190", "seasonLabel": "23/24"}' \
  200

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: ${TESTS_PASSED}"
echo "❌ Failed: ${TESTS_FAILED}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 All integration tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi

