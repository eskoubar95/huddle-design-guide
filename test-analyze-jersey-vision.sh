#!/bin/bash

# Test script for analyze-jersey-vision Edge Function
# Usage: ./test-analyze-jersey-vision.sh
#
# Required environment variables:
#   - SUPABASE_URL: Your Supabase project URL
#   - SUPABASE_ANON_KEY: Your Supabase anonymous key (public, but should not be committed)

set -e

# Configuration - use environment variables
SUPABASE_URL="${SUPABASE_URL:-https://trbyclravrmmhxplocsr.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY}"

if [ -z "$ANON_KEY" ]; then
  echo "❌ Error: SUPABASE_ANON_KEY environment variable is not set"
  echo ""
  echo "Please set it in your environment or .env.local:"
  echo "  export SUPABASE_ANON_KEY='your-anon-key-here'"
  echo ""
  echo "Or add to .env.local:"
  echo "  SUPABASE_ANON_KEY=your-anon-key-here"
  exit 1
fi

# Test data
JERSEY_ID="96bf8365-ec0d-4a21-88c5-cb4cd4c54836"
USER_ID="user_367ePcSlUHD6VCZDZ2UzEEDytOd"

echo "🧪 Testing analyze-jersey-vision Edge Function"
echo "=============================================="
echo ""

# Step 1: Check for existing images
echo "Step 1: Checking for existing images in database..."
echo ""

# Query for images
IMAGE_URL=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_jersey_images" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jersey_id\": \"$JERSEY_ID\"}" 2>/dev/null || echo "")

if [ -z "$IMAGE_URL" ]; then
  echo "⚠️  No images found for jersey $JERSEY_ID"
  echo ""
  echo "📋 To test, you need to:"
  echo "   1. Upload an image via frontend upload flow"
  echo "   2. Or use upload-jersey-image Edge Function (if deployed)"
  echo ""
  echo "After uploading, get the image URL and update the test below."
  echo ""
  exit 1
fi

echo "✅ Found images for jersey"
echo ""

# Step 2: Test analyze-jersey-vision
echo "Step 2: Testing analyze-jersey-vision Edge Function"
echo "=================================================="
echo ""

# For now, we'll use a placeholder - user needs to provide actual image URL
echo "To test, run this command with a real image URL:"
echo ""
echo "curl -X POST $SUPABASE_URL/functions/v1/analyze-jersey-vision \\"
echo "  -H \"Authorization: Bearer $ANON_KEY\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"jerseyId\": \"$JERSEY_ID\","
echo "    \"imageUrls\": [\"IMAGE_URL_HERE\"],"
echo "    \"userId\": \"$USER_ID\""
echo "  }' | jq"
echo ""
echo "Replace IMAGE_URL_HERE with actual image URL from Storage."
echo ""
