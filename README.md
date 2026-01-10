# Universal Agent Memory (UAM)

[![npm version](https://img.shields.io/npm/v/universal-agent-memory.svg)](https://www.npmjs.com/package/universal-agent-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete autonomous agent operating system for AI coding assistants. Provides memory, task management, agent coordination, and workflow automation for Claude Code, Factory.AI, VSCode, OpenCode, and web-based LLMs.

## What It Does

UAM transforms AI coding assistants into autonomous agents with:

- **4-Layer Memory System** - Working, session, semantic, and knowledge graph memory
- **Task Management** - Git-backed issue tracking with dependency DAG (superior to Beads)
- **Agent Coordination** - Multi-agent overlap detection and merge conflict prevention
- **Deploy Batching** - Batch commits/pushes to save CI minutes
- **Git Worktree Automation** - Isolated development branches with PR workflows
- **CLAUDE.md Generation** - Auto-generated project context files

## Installation

### Quick Install (Recommended)

```bash
# Install globally
npm install -g universal-agent-memory

# Initialize in your project
cd your-project
uam init --interactive
```

### One-Line Installers

```bash
# Desktop (with Docker for Qdrant)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-desktop.sh)

# Web browsers (claude.ai, factory.ai)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-web.sh)
```

### Using npx (No Install)

```bash
npx universal-agent-memory init --interactive
```

## Quick Start

```bash
# 1. Initialize project
uam init --with-memory --with-worktrees

# 2. Start memory services (requires Docker)
uam memory start

# 3. Generate CLAUDE.md
uam generate

# 4. Create your first task
uam task create --title "My first task" --type task

# 5. Start working
uam task claim <task-id>
uam worktree create my-feature
```

## Core Features

### Task Management

A complete task tracking system integrated with memory and coordination.

```bash
# Create tasks
uam task create --title "Fix auth bug" --type bug --priority 0
uam task create --title "Add dark mode" --type feature --priority 2

# View tasks
uam task list                              # All open tasks
uam task ready                             # Tasks with no blockers
uam task blocked                           # Blocked tasks
uam task stats                             # Statistics

# Work on tasks
uam task claim <id>                        # Claim task (announces to other agents)
uam task show <id>                         # View details
uam task release <id> --reason "Fixed"     # Complete task

# Dependencies
uam task dep --from <child> --to <parent>  # Add blocker
uam task undep --from <child> --to <parent># Remove blocker

# Git sync (version control your tasks)
uam task sync                              # Export to JSONL
uam task compact --days 90                 # Archive old tasks
```

**Task Types**: `task`, `bug`, `feature`, `chore`, `epic`, `story`

**Priority Levels**: P0 (critical) → P4 (backlog)

### Memory System

4-layer architecture for complete context retention.

```bash
# Start services
uam memory start                           # Start Qdrant (Docker)
uam memory status                          # Check status
uam memory stop                            # Stop services

# Query memories
uam memory query "authentication JWT"      # Semantic search

# Store learnings
uam memory store "lesson learned" --tags "auth,security" --importance 8
```

**Layers:**

| Layer | Storage | Purpose | Speed |
|-------|---------|---------|-------|
| L1: Working | SQLite | Recent actions (last 50) | ~0.15ms |
| L2: Session | SQLite | Session decisions | ~0.2ms |
| L3: Semantic | Qdrant | Reusable learnings | ~1-2ms |
| L4: Knowledge Graph | SQLite | Entity relationships | ~0.17ms |

### Agent Coordination

Multi-agent support with overlap detection and messaging.

```bash
# Register agent
uam agent register --name "feature-agent" --capabilities "coding,review"

# Announce work (enables overlap detection)
uam agent announce --id <agent-id> --resource "src/auth/" --intent editing

# Check for conflicts
uam agent overlaps --resource "src/auth/"

# Complete work
uam agent complete --id <agent-id> --resource "src/auth/"

# Status
uam agent status                           # View all agents
uam coord status                           # Coordination overview
```

**Conflict Risk Levels**: `none`, `low`, `medium`, `high`, `critical`

### Deploy Batching

Batch multiple commits/pushes to reduce CI runs.

```bash
# Queue commits
uam deploy queue --agent-id <id> --action-type commit \
  --message "feat: add feature" --files "src/feature.ts"

# View queue
uam deploy status

# Execute batched deploys
uam deploy flush                           # Squashes commits, single push
```

### Git Worktrees

Isolated development branches with automated PR workflow.

```bash
# Create worktree
uam worktree create my-feature             # Creates feature/NNN-my-feature

# List worktrees
uam worktree list

# Create PR
uam worktree pr <id>                       # Push + create PR

# Cleanup
uam worktree cleanup <id>                  # Remove worktree + delete branch
```

### CLAUDE.md Generation

Auto-generate context files for AI assistants.

```bash
# Analyze project
uam analyze --output json

# Generate CLAUDE.md
uam generate                               # Interactive merge with existing
uam generate --force                       # Overwrite
uam generate --dry-run                     # Preview only
```

## Command Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `uam init` | Initialize UAM in a project |
| `uam analyze` | Analyze project structure |
| `uam generate` | Generate CLAUDE.md |
| `uam sync` | Sync between platforms |

### Task Commands

| Command | Description |
|---------|-------------|
| `uam task create` | Create a new task |
| `uam task list` | List tasks (with filters) |
| `uam task show <id>` | Show task details |
| `uam task claim <id>` | Claim task for work |
| `uam task release <id>` | Complete and release task |
| `uam task ready` | Show unblocked tasks |
| `uam task blocked` | Show blocked tasks |
| `uam task dep` | Add dependency |
| `uam task stats` | Show statistics |
| `uam task sync` | Sync with JSONL |

### Memory Commands

| Command | Description |
|---------|-------------|
| `uam memory start` | Start Qdrant (Docker) |
| `uam memory stop` | Stop memory services |
| `uam memory status` | Check service status |
| `uam memory query` | Semantic search |
| `uam memory store` | Store a learning |

### Agent Commands

| Command | Description |
|---------|-------------|
| `uam agent register` | Register new agent |
| `uam agent announce` | Announce work on resource |
| `uam agent overlaps` | Check for conflicts |
| `uam agent complete` | Mark work complete |
| `uam agent status` | Show agent status |
| `uam agent broadcast` | Send to all agents |
| `uam agent send` | Direct message |
| `uam agent receive` | Get pending messages |

### Coordination Commands

| Command | Description |
|---------|-------------|
| `uam coord status` | Overview of coordination |
| `uam coord flush` | Execute pending deploys |
| `uam coord cleanup` | Clean stale data |

### Deploy Commands

| Command | Description |
|---------|-------------|
| `uam deploy queue` | Queue a deploy action |
| `uam deploy status` | View deploy queue |
| `uam deploy batch` | Create batch from queue |
| `uam deploy execute` | Execute a batch |
| `uam deploy flush` | Batch and execute all |

### Worktree Commands

| Command | Description |
|---------|-------------|
| `uam worktree create` | Create feature worktree |
| `uam worktree list` | List all worktrees |
| `uam worktree pr` | Create PR from worktree |
| `uam worktree cleanup` | Remove worktree |

### Droids Commands

| Command | Description |
|---------|-------------|
| `uam droids list` | List available droids |
| `uam droids add` | Add a new droid |
| `uam droids import` | Import from path |

## Configuration

Configuration is stored in `.uam.json`:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-project",
    "defaultBranch": "main"
  },
  "memory": {
    "shortTerm": {
      "enabled": true,
      "path": "./agents/data/memory/short_term.db",
      "maxEntries": 50
    },
    "longTerm": {
      "enabled": true,
      "provider": "qdrant",
      "endpoint": "localhost:6333",
      "collection": "agent_memory"
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

| Platform | Environment | Context File | Agents/Droids |
|----------|-------------|--------------|---------------|
| Claude Code | Desktop | `CLAUDE.md` | `.claude/agents/` |
| claude.ai | Web | `CLAUDE.md` | Project context |
| Factory.AI | Desktop | `CLAUDE.md` | `.factory/droids/` |
| factory.ai | Web | `CLAUDE.md` | Project context |
| VSCode | Desktop | `CLAUDE.md` | Extension-based |
| OpenCode | Desktop | `opencode.json` | `.opencode/agent/` |

## Workflow Engine

UAM enforces a 5-phase workflow for every agent action:

```
START → TASK → CONTEXT → WORK → COMPLETE
```

1. **START**: Check existing tasks, read memory
2. **TASK**: Create/claim task before any work
3. **CONTEXT**: Query memory, check skills
4. **WORK**: Create worktree, make changes, test, PR
5. **COMPLETE**: Update memory, release task

Each phase has **gates** that must pass before proceeding.

## Memory Backends

### Desktop

- **Short-term**: SQLite (local file)
- **Long-term**: Qdrant (Docker) or Qdrant Cloud

### Web (claude.ai, factory.ai)

- **Short-term**: IndexedDB (browser)
- **Long-term**: GitHub or Qdrant Cloud

```bash
# Cloud backends (optional)
export QDRANT_API_KEY=your_key
export QDRANT_URL=https://xxx.aws.cloud.qdrant.io:6333
export GITHUB_TOKEN=your_token
```

## Built-in Droids

| Droid | Purpose |
|-------|---------|
| `code-quality-guardian` | Code review, complexity, SOLID |
| `security-auditor` | OWASP, secrets, injection |
| `performance-optimizer` | Algorithms, memory, caching |
| `documentation-expert` | JSDoc, README, accuracy |

## Development

```bash
# Clone
git clone https://github.com/DammianMiller/universal-agent-memory.git
cd universal-agent-memory

# Install
npm install

# Build
npm run build

# Test
npm test

# Run locally
npm start -- init --interactive
```

## Requirements

- Node.js 18+
- Docker (for local Qdrant)
- Git

## License

MIT

## Links

- [GitHub Repository](https://github.com/DammianMiller/universal-agent-memory)
- [npm Package](https://www.npmjs.com/package/universal-agent-memory)
- [Issue Tracker](https://github.com/DammianMiller/universal-agent-memory/issues)
