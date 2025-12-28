#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Agent Context - Desktop Installation${NC}"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (you have $(node -v))${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm -v) detected"

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker detected - local Qdrant available"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Docker not found - will use cloud backends only"
    DOCKER_AVAILABLE=false
fi

# Install the CLI globally
echo ""
echo "Installing @agent-context/cli..."
npm install -g @agent-context/cli

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Initialize your project:"
echo "     $ cd /path/to/your/project"
echo "     $ agent-context init --desktop"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "  2. Start local memory services (optional):"
    echo "     $ agent-context memory start"
    echo ""
    echo "     Or use cloud backends:"
else
    echo "  2. Configure cloud memory backends:"
fi

echo "     - GitHub: export GITHUB_TOKEN=your_token"
echo "     - Qdrant Cloud: export QDRANT_API_KEY=your_key && export QDRANT_URL=your_url"
echo ""
echo "  3. Generate CLAUDE.md for your project:"
echo "     $ agent-context generate"
echo ""
echo "Documentation: https://agent-context.dev"
