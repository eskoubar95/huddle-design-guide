#!/bin/bash

# Test script for match-jersey-metadata Edge Function
# Usage: ./test-match-jersey-metadata.sh

# Get Supabase URL and Service Role Key from environment or prompt
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://trbyclravrmmhxplocsr.supabase.co}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set in environment"
  echo "Please set it or provide it when prompted"
  read -sp "Enter Supabase Service Role Key: " SERVICE_ROLE_KEY
  echo ""
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Service Role Key is required"
  exit 1
fi

EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/match-jersey-metadata"

echo "🧪 Testing match-jersey-metadata Edge Function"
echo "📍 URL: ${EDGE_FUNCTION_URL}"
echo ""

# Test 1: FC København, season 22/23, player number 9
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: FC København, season 22/23, jersey #9"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "${EDGE_FUNCTION_URL}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "22/23",
    "playerNumberText": "9"
  }' | jq '.'

echo ""
echo ""

# Test 2: FC København, season 23 (single year format)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: FC København, season 23 (single year)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "${EDGE_FUNCTION_URL}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "23",
    "playerNumberText": "10"
  }' | jq '.'

echo ""
echo ""

# Test 3: FC København, season 2023/2024 (full range format)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: FC København, season 2023/2024 (full range)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "${EDGE_FUNCTION_URL}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "2023/2024",
    "playerNameText": "Jonas Wind",
    "playerNumberText": "23"
  }' | jq '.'

echo ""
echo ""

# Test 4: Only club and season (no player info)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Only club and season (no player)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "${EDGE_FUNCTION_URL}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "22/23"
  }' | jq '.'

echo ""
echo ""

# Test 5: Player by name only (no number)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Player by name only"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "${EDGE_FUNCTION_URL}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "22/23",
    "playerNameText": "Jonas Wind"
  }' | jq '.'

echo ""
echo "✅ All tests completed!"

