# Universal Agent Memory (UAM)

[![npm version](https://img.shields.io/npm/v/universal-agent-memory.svg)](https://www.npmjs.com/package/universal-agent-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Give your AI coding assistant persistent memory and autonomous workflows.**

UAM transforms AI coding assistants (Claude Code, Factory.AI, etc.) into autonomous agents that remember context across sessions, coordinate with other agents, and follow consistent workflows.

## How It Works

1. **Install UAM** in your project
2. **Generate CLAUDE.md** - a context file your AI reads automatically
3. **The AI handles everything** - memory, tasks, worktrees, coordination

**You don't manage memory manually.** The AI agent reads CLAUDE.md and autonomously uses the memory system, creates worktrees, tracks tasks, and coordinates with other agents.

## Quick Start

```bash
# Install
npm install -g universal-agent-memory

# Initialize in your project
cd your-project
uam init --with-memory --with-worktrees

# Start memory services (optional, for persistent semantic memory)
uam memory start

# Generate the CLAUDE.md context file
uam generate
```

That's it! Your AI assistant now has:
- **Persistent memory** across sessions
- **Task tracking** with dependencies
- **Git worktree workflows** (never commits to main)
- **Multi-agent coordination** (prevents merge conflicts)

## Example: Working With an AI Agent

After setup, just talk to your AI assistant normally:

```
You: "Fix the authentication bug in the login handler"

AI: *Automatically:*
  1. Checks memory for past context on auth/login
  2. Creates task: "Fix auth bug in login handler"
  3. Creates worktree: feature/fix-auth-bug
  4. Makes changes, runs tests
  5. Creates PR
  6. Stores learnings in memory for next time
```

The AI follows the workflow defined in CLAUDE.md without you managing any of it.

## What Gets Generated

`uam generate` creates a `CLAUDE.md` file that includes:

- **Project structure** auto-detected from your codebase
- **Memory system** configuration (SQLite + Qdrant)
- **Workflow rules** (worktrees, testing, PR creation)
- **Agent coordination** protocols
- **Troubleshooting** from git history

The AI reads this file and follows the instructions autonomously.

## Installation Options

### npm (Recommended)

```bash
npm install -g universal-agent-memory
```

### One-Line Installers

```bash
# Desktop (includes Docker for Qdrant)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-desktop.sh)

# Web browsers (claude.ai, factory.ai)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-web.sh)
```

### npx (No Install)

```bash
npx universal-agent-memory init --interactive
```

## Commands

### Essential Commands

| Command | Description |
|---------|-------------|
| `uam init` | Initialize UAM in a project |
| `uam generate` | Generate/update CLAUDE.md |
| `uam memory start` | Start Qdrant (for semantic memory) |
| `uam memory status` | Check if services are running |

### Task Commands (Used by AI)

| Command | Description |
|---------|-------------|
| `uam task create` | Create a new task |
| `uam task list` | List all tasks |
| `uam task ready` | Show tasks with no blockers |
| `uam task claim <id>` | Claim a task for work |

### Worktree Commands (Used by AI)

| Command | Description |
|---------|-------------|
| `uam worktree create <name>` | Create isolated branch |
| `uam worktree pr <id>` | Create PR from worktree |
| `uam worktree cleanup <id>` | Remove worktree |

### Agent Coordination (Used by AI)

| Command | Description |
|---------|-------------|
| `uam agent overlaps` | Check for file conflicts |
| `uam agent announce` | Announce work on files |
| `uam agent status` | View active agents |

## Memory Architecture

UAM uses a 4-layer memory system, all managed automatically by the AI:

| Layer | Purpose | Storage |
|-------|---------|---------|
| Working | Recent actions (last 50) | SQLite |
| Session | Current session context | SQLite |
| Semantic | Reusable learnings | Qdrant |
| Knowledge Graph | Entity relationships | SQLite |

**You don't need to understand this** - the AI handles memory storage and retrieval automatically based on the CLAUDE.md instructions.

## Configuration

After `uam init`, configuration is in `.uam.json`:

```json
{
  "project": {
    "name": "my-project",
    "defaultBranch": "main"
  },
  "memory": {
    "shortTerm": { "enabled": true },
    "longTerm": { "enabled": true, "provider": "qdrant" }
  },
  "worktrees": {
    "enabled": true,
    "directory": ".worktrees"
  }
}
```

## Platform Support

| Platform | Context File | Works With |
|----------|--------------|------------|
| Claude Code | `CLAUDE.md` | Desktop app |
| Factory.AI | `CLAUDE.md` | Desktop/web |
| claude.ai | `CLAUDE.md` | Web browser |
| VSCode + Extensions | `CLAUDE.md` | Desktop |

## Built-in Droids

Quality review agents that run automatically before PRs:

| Droid | Purpose |
|-------|---------|
| `code-quality-guardian` | Code review, SOLID principles |
| `security-auditor` | OWASP, secrets detection |
| `performance-optimizer` | Algorithm efficiency |
| `documentation-expert` | Docs completeness |

## Requirements

- Node.js 18+
- Docker (optional, for persistent semantic memory)
- Git

## FAQ

**Q: Do I need to run memory commands manually?**  
A: No. The AI reads CLAUDE.md and manages memory automatically.

**Q: What if I don't have Docker?**  
A: UAM works without Docker. You lose semantic (long-term) memory, but short-term and session memory still work via SQLite.

**Q: Can multiple AI agents work on the same project?**  
A: Yes. UAM includes coordination protocols to prevent merge conflicts.

**Q: How do I update CLAUDE.md after project changes?**  
A: Run `uam generate` again. It will intelligently merge with your existing file.

## Development

```bash
git clone https://github.com/DammianMiller/universal-agent-memory.git
cd universal-agent-memory
npm install
npm run build
npm test
```

## License

MIT

## Links

- [GitHub](https://github.com/DammianMiller/universal-agent-memory)
- [npm](https://www.npmjs.com/package/universal-agent-memory)
- [Issues](https://github.com/DammianMiller/universal-agent-memory/issues)
