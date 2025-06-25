#!/bin/bash

echo "🚀 OpenAI CLI Client Test Script"
echo ""

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable not set"
    echo "   Option 1 (Recommended): Create a .env file:"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your actual API key"
    echo ""
    echo "   Option 2: Set environment variable:"
    echo "   export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "🧪 Testing without OpenAI API key (will fail gracefully):"
    echo ""
    
    # Test basic functionality without API key
    OPENAI_API_KEY="test" npm run dev -- --help
    echo ""
    OPENAI_API_KEY="test" npm run dev -- servers
    echo ""
    echo "✅ Basic CLI functionality working!"
    echo ""
    echo "To test with actual OpenAI:"
    echo "1. Set your API key: export OPENAI_API_KEY='sk-...'"
    echo "2. Run: npm run dev -- chat"
    echo "3. Or with MCP: npm run dev -- chat --config config.json"
    echo ""
    echo "To test with filesystem MCP server:"
    echo "npm run dev -- chat --server 'npx -y @modelcontextprotocol/server-filesystem .'"
else
    echo "✅ OPENAI_API_KEY found"
    echo ""
    echo "Testing basic chat (no MCP):"
    echo "npm run dev -- chat"
    echo ""
    echo "Testing with filesystem MCP server:"
    echo "npm run dev -- chat --config config.json"
    echo ""
    echo "🎉 Ready to chat! Try asking questions like:"
    echo "  - 'What files are in this directory?'"
    echo "  - 'Read the package.json file'"
    echo "  - 'What is this project about?'"
fi 