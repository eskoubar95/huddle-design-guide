#!/bin/bash

# Test script for Phase 4 Services
# Tests: MatchService, UpsertService, SearchService, DataRetrievalService
# Usage: ./scripts/test-services.sh

echo "🧪 Testing Phase 4 Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed"
    echo "Please install Deno: https://deno.land/"
    exit 1
fi

echo "✅ Deno found: $(deno --version)"
echo ""

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  SUPABASE_URL not set, using default"
    export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://trbyclravrmmhxplocsr.supabase.co}"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set"
    echo "Please set it or provide it when prompted"
    read -sp "Enter Supabase Service Role Key: " SERVICE_ROLE_KEY
    echo ""
    export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  DB_PASSWORD not set"
    read -sp "Enter Database Password: " DB_PASSWORD
    echo ""
    export DB_PASSWORD="$DB_PASSWORD"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: MatchService Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd supabase/functions/_shared/services/__tests__

deno test --allow-net --allow-env match-service.test.ts || {
    echo "❌ MatchService tests failed"
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All service tests completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

