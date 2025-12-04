#!/bin/bash

# Test script for auto-linking metadata to existing jersey
# Usage: ./scripts/test-auto-link.sh [jersey-id]

JERSEY_ID="${1:-d0c44d4d-4004-4d62-9c46-3e44d32c8d58}"

echo "Testing auto-link metadata for jersey: $JERSEY_ID"
echo ""

# Load environment variables
if [ -f "apps/web/.env.local" ]; then
  export $(grep -v '^#' apps/web/.env.local | xargs)
else
  echo "Error: apps/web/.env.local not found"
  exit 1
fi

# Test auto-link endpoint
echo "=== Step 1: Auto-link metadata ==="
echo "POST /api/v1/jerseys/$JERSEY_ID/auto-link-metadata"
echo ""

# Note: This requires authentication. In production, you'd need a valid Clerk token.
# For testing, you can use the API directly from the browser console when logged in.

echo "To test this endpoint:"
echo "1. Log in to the app"
echo "2. Open browser console"
echo "3. Run:"
echo ""
echo "fetch('/api/v1/jerseys/$JERSEY_ID/auto-link-metadata', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' }"
echo "}).then(r => r.json()).then(console.log)"
echo ""

# Test auto-link service directly (without auth)
echo "=== Step 2: Test auto-link service (direct) ==="
echo "POST /api/v1/metadata/auto-link"
echo ""

curl -s -X POST http://localhost:3000/api/v1/metadata/auto-link \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "2019/2021",
    "playerNameText": "Jonas Wind",
    "playerNumberText": "23"
  }' | jq '.'

echo ""
echo "Expected result:"
echo "- clubId: '190' (FC Copenhagen)"
echo "- seasonId: UUID for '19/20'"
echo "- playerId: '391004' (Jonas Wind)"
echo "- confidence: 100"

