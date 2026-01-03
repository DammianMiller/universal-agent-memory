#!/bin/bash
set -e

echo "🚀 Universal Agent Memory - Web Platform Setup"
echo ""

# Check for required tools
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Install from https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required. Install from https://nodejs.org"
    exit 1
fi

# Install CLI globally
echo "📦 Installing universal-agent-memory CLI..."
npm install -g @universal-agent-memory/cli

# Initialize in current directory
echo ""
echo "⚙️  Initializing project..."
uam init --web --interactive

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set environment variables:"
echo "     export GITHUB_TOKEN=<your-token>  # For GitHub memory"
echo "     export QDRANT_API_KEY=<your-key>  # For Qdrant Cloud"
echo "  2. Copy CLAUDE.md to your project context (claude.ai Projects)"
echo "  3. Start using memory: uam memory status"
echo ""
