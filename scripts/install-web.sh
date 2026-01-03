#!/bin/bash
set -e

REPO_URL="https://github.com/DammianMiller/universal-agent-memory"

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

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"

# Install CLI globally
echo ""
echo "📦 Installing universal-agent-memory CLI..."

# Try npm install first, fall back to git clone if package not published yet
if npm install -g @universal-agent-memory/cli 2>/dev/null; then
    echo "✅ Installed from npm registry"
else
    echo "⚠️  Package not yet on npm, installing from GitHub..."
    
    # Install to user's local directory
    INSTALL_DIR="${HOME}/.universal-agent-memory"
    
    # Remove old installation if exists
    if [ -d "$INSTALL_DIR" ]; then
        echo "Removing previous installation..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Clone and install
    git clone --depth 1 "$REPO_URL.git" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    npm install --production=false
    npm run build
    npm link
    
    echo "✅ Installed from GitHub to $INSTALL_DIR"
fi

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
echo "Documentation: ${REPO_URL}#readme"
