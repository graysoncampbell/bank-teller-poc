#!/bin/bash

echo "🚀 Unloan Content Scraper"
echo "========================="
echo ""

# Check if Google API key is set
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ Please set your Google API key first:"
    echo "   export GOOGLE_API_KEY=your_api_key_here"
    echo ""
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    exit 1
fi

echo "✅ Google API key is set"
echo ""

# Run setup check
echo "🔧 Running setup check..."
npm run setup

if [ $? -ne 0 ]; then
    echo "❌ Setup failed. Please fix the issues above."
    exit 1
fi

echo ""
echo "🎯 Ready to scrape! Choose your phase:"
echo ""
echo "Phase 1: Scrape content (4 pages/minute, ~1 hour for 250 pages)"
echo "   npm run scrape"
echo ""
echo "Phase 2: Generate embeddings (after scraping is complete)"
echo "   npm run generate-embeddings"
echo ""
echo "Check status anytime with:"
echo "   npm run status"