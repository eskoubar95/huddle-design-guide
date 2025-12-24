#!/bin/bash

# Phase 3 Runtime Test Script
# Tests order creation endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_API="${BASE_URL}/api/test"

echo "🧪 Testing Phase 3: Order Creation Runtime"
echo "============================================"
echo "Base URL: ${BASE_URL}"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
  
  local url="${TEST_API}${endpoint}"
  local response
  
  echo -e "${BLUE}Testing:${NC} ${description}"
  
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
    echo -e "${GREEN}✅ PASS${NC} (${status_code})"
    echo "$body" | jq '.' 2>/dev/null || echo "$body" | head -c 200
    echo ""
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (expected ${expected_status}, got ${status_code})"
    echo "Response: $body" | head -c 300
    echo ""
    ((FAILED++))
    return 1
  fi
}

# Check if server is running
echo "📡 Checking server..."
if ! curl -s "${BASE_URL}/api/v1/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server not running at ${BASE_URL}${NC}"
  echo "   💡 Start server: cd apps/web && npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ Server running${NC}\n"

# Test data (update these with your test data)
LISTING_ID="${LISTING_ID:-e203ac85-196d-4aa3-9070-caaea6db4040}"
BUYER_ID="${BUYER_ID:-user_367ePcSlUHD6VCZDZ2UzEEDytOd}"

echo "📋 Test Data:"
echo "   Listing ID: ${LISTING_ID}"
echo "   Buyer ID: ${BUYER_ID}"
echo ""

# Test 1: createOrderFromSale
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: createOrderFromSale()"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "POST" "/create-order-sale" 200 \
  "Create order from sale listing" \
  "{\"listingId\": \"${LISTING_ID}\", \"buyerId\": \"${BUYER_ID}\", \"shippingMethodName\": \"Eurosender Standard\", \"shippingCost\": 1500}"

# Test 2: Webhook Simulation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Webhook Simulation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$TRANSACTION_ID" ]; then
  echo -e "${YELLOW}⚠️  TRANSACTION_ID not set${NC}"
  echo "   💡 Set TRANSACTION_ID environment variable or create test transaction:"
  echo "   INSERT INTO transactions (...) VALUES (...);"
  echo ""
else
  test_endpoint "POST" "/webhook-simulation" 200 \
    "Simulate webhook payment_intent.succeeded" \
    "{\"transactionId\": \"${TRANSACTION_ID}\"}"
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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

