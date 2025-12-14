#!/bin/bash

# Test script for Phase 4 Services via Edge Functions
# Tests services indirectly by testing Edge Functions that use them
# Usage: ./scripts/test-phase4-services.sh

echo "🧪 Testing Phase 4 Services (via Edge Functions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

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

echo "📍 Testing via: ${EDGE_FUNCTION_URL}"
echo ""

# Counters
PASSED=0
FAILED=0

# Test helper function
test_match() {
  local test_name="$1"
  local club_text="$2"
  local season_text="$3"
  local player_name="$4"
  local player_number="$5"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Test: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Build JSON payload
  local payload="{"
  payload+="\"clubText\": \"$club_text\","
  payload+="\"seasonText\": \"$season_text\""
  
  if [ -n "$player_name" ]; then
    payload+=",\"playerNameText\": \"$player_name\""
  fi
  
  if [ -n "$player_number" ]; then
    payload+=",\"playerNumberText\": \"$player_number\""
  fi
  
  payload+="}"
  
  # Make request
  local response=$(curl -s -X POST "${EDGE_FUNCTION_URL}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  # Check if response contains error
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    echo "❌ FAILED: $(echo "$response" | jq -r '.error')"
    echo "$response" | jq '.'
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Check for required fields
  local club_id=$(echo "$response" | jq -r '.clubId // empty')
  local season_id=$(echo "$response" | jq -r '.seasonId // empty')
  local confidence=$(echo "$response" | jq -r '.confidence // {}')
  
  if [ -z "$club_id" ] || [ "$club_id" = "null" ]; then
    echo "❌ FAILED: No clubId in response"
    echo "$response" | jq '.'
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  if [ -z "$season_id" ] || [ "$season_id" = "null" ]; then
    echo "❌ FAILED: No seasonId in response"
    echo "$response" | jq '.'
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Show results
  echo "✅ PASSED"
  echo "   Club ID: $club_id"
  echo "   Season ID: $season_id"
  echo "   Confidence: $(echo "$confidence" | jq -r 'to_entries | map("\(.key): \(.value)") | join(", ")')"
  
  if [ -n "$player_name" ] || [ -n "$player_number" ]; then
    local player_id=$(echo "$response" | jq -r '.playerId // empty')
    if [ -n "$player_id" ] && [ "$player_id" != "null" ]; then
      echo "   Player ID: $player_id"
    fi
  fi
  
  PASSED=$((PASSED + 1))
  echo ""
}

# Test 1: Basic club and season matching (MatchService.matchClub + matchSeason)
test_match \
  "FC København, season 22/23" \
  "FC København" \
  "22/23" \
  "" \
  ""

# Test 2: Tournament season format (MatchService.matchSeason - tournament type)
test_match \
  "France National Team, World Cup 2006" \
  "France" \
  "2006" \
  "" \
  ""

# Test 3: Single year calendar format (MatchService.matchSeason - calendar type)
test_match \
  "FC København, season 23" \
  "FC København" \
  "23" \
  "" \
  ""

# Test 4: Player matching by number (MatchService.matchPlayer)
test_match \
  "FC København, season 22/23, jersey #9" \
  "FC København" \
  "22/23" \
  "" \
  "9"

# Test 5: Player matching by name (MatchService.matchPlayer)
test_match \
  "FC København, season 22/23, player Jonas Wind" \
  "FC København" \
  "22/23" \
  "Jonas Wind" \
  ""

# Test 6: Player matching by name and number (MatchService.matchPlayer)
test_match \
  "FC København, season 22/23, player Jonas Wind #23" \
  "FC København" \
  "22/23" \
  "Jonas Wind" \
  "23"

# Test 7: Full range season format
test_match \
  "FC København, season 2023/2024" \
  "FC København" \
  "2023/2024" \
  "" \
  ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
  echo "❌ Some tests failed!"
  exit 1
else
  echo "🎉 All tests passed!"
  exit 0
fi

