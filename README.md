# Universal Agent Memory

Universal AI agent memory system for Claude Code, Factory.AI, VSCode, OpenCode, and web-based LLMs.

Provides:
- **CLAUDE.md template system** with automatic project analysis and generation
- **Memory system** with flexible backends:
  - **Desktop**: SQLite short-term + local Qdrant or cloud backends
  - **Web**: IndexedDB short-term + GitHub/Qdrant Cloud long-term
- **Git worktree workflow** automation for isolated development
- **Cross-platform compatibility** for all major AI coding assistants (desktop and web)

## Installation

### Desktop (CLI)

```bash
# Automatic installer with Docker detection
bash <(curl -fsSL https://universal-agent-memory.dev/install-desktop.sh)

# Or manually with npm
npm install -g @universal-agent-memory/cli

# Or use npx
npx @universal-agent-memory/cli init --desktop
```

### Web Browsers (claude.ai, factory.ai)

```bash
# Quick web setup
bash <(curl -fsSL https://universal-agent-memory.dev/install-web.sh)

# Or manually
npx @universal-agent-memory/cli init --web
```

Web installations use:
- **IndexedDB** for short-term memory (replaces SQLite)
- **GitHub** or **Qdrant Cloud** for long-term memory (opt-in via env vars)

## Quick Start

```bash
# Desktop initialization (default)
uam init --desktop

# Web initialization (for claude.ai, factory.ai)
uam init --web

# Interactive mode (asks questions)
uam init --interactive

# Or with specific options
uam init --platform factory --with-memory --with-worktrees
```

This will:
1. Analyze your project structure
2. Generate a customized `CLAUDE.md`
3. Set up platform-specific directories (`.factory/`, `.claude/`, etc.)
4. Optionally configure memory system and worktree workflow

## Commands

### Initialize Project

```bash
uam init [options]

Options:
  -p, --platform <platforms...>  Target platforms (claude, factory, vscode, opencode, claudeWeb, factoryWeb, all)
  --desktop                      Desktop mode (SQLite + local Qdrant)
  --web                          Web mode (IndexedDB + cloud backends)
  --interactive                  Interactive setup with prompts
  --with-memory                  Set up memory system
  --with-worktrees               Set up git worktree workflow
  --force                        Overwrite existing configuration
```

### Analyze Project

```bash
uam analyze [options]

Options:
  -o, --output <format>  Output format (json, yaml, md)
  --save                 Save analysis to file
```

### Generate Files

```bash
uam generate [options]

Options:
  -f, --force         Overwrite without confirmation
  -d, --dry-run       Preview without writing
  -p, --platform      Generate for specific platform only
```

**Smart Merging**: When a `CLAUDE.md` or `AGENT.md` file already exists, the CLI will offer to:
- **Merge** (recommended): Updates standard sections while preserving your custom sections
- **Overwrite**: Replace the entire file with newly generated content
- **Cancel/Skip**: Leave the existing file unchanged

The merge strategy:
- Updates the preamble (project name, description) from new analysis
- Replaces standard sections (Memory System, Browser Usage, Quick Reference, etc.) with updated versions
- Preserves any custom sections you've added
- Appends custom sections at the end of the file

### Memory Management

```bash
# Check status
uam memory status

# Start memory services (Qdrant)
uam memory start

# Stop services
uam memory stop

# Query long-term memory
uam memory query "search term" --limit 10

# Store a memory
uam memory store "lesson learned" --tags "tag1,tag2" --importance 8
```

### Git Worktrees

```bash
# Create new worktree
uam worktree create my-feature

# List worktrees
uam worktree list

# Create PR from worktree
uam worktree pr 001

# Cleanup after merge
uam worktree cleanup 001
```

### Droids/Agents

```bash
# List available droids
uam droids list

# Add a new droid
uam droids add my-droid --template code-reviewer

# Import from another platform
uam droids import ~/.claude/agents/
```

### Platform Sync

```bash
# Sync between platforms
uam sync --from claude --to factory
```

## Configuration

Configuration is stored in `.uam.json`:

```json
{
  "$schema": "https://universal-agent-memory.dev/schema.json",
  "version": "1.0.0",
  "project": {
    "name": "my-project",
    "description": "Project description",
    "defaultBranch": "main"
  },
  "platform": "claudeCode",
  "platforms": {
    "claudeCode": { "enabled": true },
    "claudeWeb": { "enabled": false },
    "factory": { "enabled": true },
    "factoryWeb": { "enabled": false },
    "vscode": { "enabled": false },
    "opencode": { "enabled": false }
  },
  "memory": {
    "shortTerm": {
      "enabled": true,
      "path": "./agents/data/memory/short_term.db",
      "maxEntries": 50,
      "webDatabase": "agentContext",
      "forceDesktop": false
    },
    "longTerm": {
      "enabled": true,
      "provider": "qdrant",
      "endpoint": "localhost:6333",
      "collection": "agent_memory",
      "github": {
        "enabled": false,
        "repo": "owner/repo",
        "path": ".uam/memory"
      },
      "qdrantCloud": {
        "enabled": false,
        "url": "https://xxxxx.aws.cloud.qdrant.io:6333",
        "collection": "agent_memory"
      }
    }
  },
  "worktrees": {
    "enabled": true,
    "directory": ".worktrees",
    "branchPrefix": "feature/"
  }
}
```

## Platform Support

| Platform | Environment | Context File | Agents | Commands |
|----------|-------------|--------------|--------|----------|
| Claude Code | Desktop | `CLAUDE.md` | `.claude/agents/` | `.claude/commands/` |
| claude.ai | Web | `CLAUDE.md` | Project context | N/A |
| Factory.AI | Desktop | `CLAUDE.md` | `.factory/droids/` | `.factory/commands/` |
| factory.ai | Web | `CLAUDE.md` | Project context | N/A |
| VSCode | Desktop | `CLAUDE.md` | Extension-based | Tasks |
| OpenCode | Desktop | `opencode.json` | `.opencode/agent/` | `.opencode/command/` |

## Built-in Droid Templates

- `code-reviewer` - Reviews diffs for correctness and risks
- `security-reviewer` - Finds security issues in code
- `performance-reviewer` - Identifies performance bottlenecks
- `test-writer` - Generates unit tests

## Memory System

### Desktop Environments

#### Short-term Memory (SQLite)

Stores the last 50 actions/observations for immediate context. Automatically pruned.

Location: `./agents/data/memory/short_term.db`

#### Long-term Memory

**Local Qdrant** (requires Docker):
```bash
uam memory start
```

**GitHub Backend** (opt-in):
```bash
export GITHUB_TOKEN=your_token
# Stores memories as JSON files in git repository
```

**Qdrant Cloud** (opt-in, 1GB free tier):
```bash
export QDRANT_API_KEY=your_key
export QDRANT_URL=https://xxxxx.aws.cloud.qdrant.io:6333
```

### Web Environments (claude.ai, factory.ai)

#### Short-term Memory (IndexedDB)

Browser-native storage for recent context. Per-project isolation with automatic pruning.

Database: `agentContext/memories`

#### Long-term Memory (Cloud Backends)

Requires environment variables for opt-in:

**GitHub**:
```bash
export GITHUB_TOKEN=your_token
```

**Qdrant Cloud** (1GB free tier):
```bash
export QDRANT_API_KEY=your_key
export QDRANT_URL=https://xxxxx.aws.cloud.qdrant.io:6333
```

### What Memory Stores

Vector database for semantic search of past learnings:
- Discoveries about environment/capabilities
- Successful strategies
- Failed approaches to avoid
- Important facts learned

## Development

```bash
# Clone and install
git clone https://github.com/DammianMiller/universal-agent-memory.git
cd universal-agent-memory
npm install

# Build
npm run build

# Run locally
npm start -- init

# Run tests
npm test
```

## License

MIT
