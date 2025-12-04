#!/bin/bash

# Test script for metadata schema via PostgREST API
# This tests if PostgREST can see the metadata schema

# Load environment variables
if [ -f "apps/web/.env.local" ]; then
  export $(grep -v '^#' apps/web/.env.local | grep SUPABASE | xargs)
else
  echo "Error: apps/web/.env.local not found"
  exit 1
fi

# Check if variables are set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

echo "Testing metadata schema via PostgREST API..."
echo "URL: $SUPABASE_URL"
echo ""

# Test 1: Try to query competitions table with Accept-Profile header
echo "=== Test 1: Query competitions with Accept-Profile: metadata ==="
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/competitions?select=id,name" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Accept-Profile: metadata" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 2: Try to query competitions without Accept-Profile (should fail)
echo "=== Test 2: Query competitions without Accept-Profile (should fail) ==="
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/competitions?select=id,name" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 3: Try to INSERT a test competition
echo "=== Test 3: Try to INSERT a test competition ==="
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/competitions" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Accept-Profile: metadata" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "test-competition-123",
    "name": "Test Competition"
  }' | jq '.' || echo "Failed"
echo ""

# Test 4: Check OpenAPI spec for metadata tables
echo "=== Test 4: Check OpenAPI spec for metadata tables ==="
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '.paths | keys | .[] | select(contains("competition") or contains("club") or contains("player") or contains("season"))' || echo "No metadata tables found in OpenAPI spec"
echo ""

echo "=== Done ==="
