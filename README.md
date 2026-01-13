# Universal Agent Memory (UAM)

[![npm version](https://img.shields.io/npm/v/universal-agent-memory.svg)](https://www.npmjs.com/package/universal-agent-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Give your AI coding assistant persistent memory, intelligent task routing, and better code generation.**

UAM transforms AI coding assistants (Claude Code, Factory.AI, etc.) into autonomous agents with:

- **Endless Context** - Memory persists with the project, not the conversation
- **Intelligent Task Routing** - Tasks automatically route to specialized expert droids
- **Better Code Generation** - Code Field prompts produce 100% assumption stating
- **Safe Git Workflows** - Worktrees prevent direct commits to main
- **Complete Close-Out** - Merge → Deploy → Monitor → Fix loop ensures 100% completion

## It Just Works

```bash
# Install
npm install -g universal-agent-memory

# Initialize (auto-configures everything)
cd your-project
uam init

# That's it. Your AI now has superpowers.
```

No clicking through prompts. No manual configuration. It just works.

## Key Features

### 🧠 Endless Context Through Project Memory

**Your AI's context is NOT limited to the conversation.**

Memory persists with the project in SQLite databases that travel with the code:

```
agents/data/memory/
├── short_term.db      # Recent actions, fast lookup
├── session_memories   # Current session decisions
└── long_term.json     # Learnings for semantic search
```

This means:
- Recall decisions from weeks/months ago
- Learn from past mistakes (gotchas never repeated)
- Understand why code is the way it is
- Seamless handoff between sessions

**The AI queries memory before every task** - it never starts from zero.

### 🎯 Intelligent Task Routing

Tasks automatically route to specialized expert droids:

| Task Type | Routed To | Result |
|-----------|-----------|--------|
| TypeScript/JS | `typescript-node-expert` | Proper typing, async patterns |
| Security review | `security-auditor` | OWASP checks, secrets detection |
| Performance | `performance-optimizer` | Algorithm analysis, caching |
| Documentation | `documentation-expert` | Complete, accurate docs |
| Code quality | `code-quality-guardian` | SOLID, complexity checks |

**Missing an expert?** The AI generates one:
```bash
uam droids add rust-expert --capabilities "ownership,lifetimes,async" --triggers "*.rs"
```

### 🔒 Code Field - Better Code Generation

Based on [context-field research](https://github.com/NeoVertex1/context-field), UAM includes a 4-line prompt that dramatically improves code quality:

```
Do not write code before stating assumptions.
Do not claim correctness you haven't verified.
Do not handle only the happy path.
Under what conditions does this work?
```

**Results from 72 tests:**
- 100% assumption stating (vs 0% baseline)
- 89% bug detection in code review (vs 39% baseline)  
- 100% refusal of impossible requests (vs 0% baseline)
- 320% more hidden issues found in debugging

Every code generation task applies Code Field automatically.

### 🌳 Safe Git Workflows

**The AI never commits directly to main.**

All changes use worktrees:

```bash
# AI automatically does this for every change
uam worktree create my-feature
# → Creates .worktrees/001-my-feature/
# → Creates branch feature/001-my-feature
# → Works in isolation

uam worktree pr 001
# → Pushes, creates PR, triggers reviews

uam worktree cleanup 001
# → Removes worktree after merge
```

### ✅ Complete Close-Out Workflow

Work isn't "done" until it's deployed and verified:

```
MERGE → DEPLOY → MONITOR → FIX (repeat until 100%)
```

The AI follows this loop automatically:
1. Get PR approved, merge to main
2. Verify CI/CD runs, check deployment
3. Monitor logs, verify functionality
4. If issues: create hotfix worktree, repeat

**The AI stores learnings after every completed task** for future sessions.

## Installation

### npm (Recommended)

```bash
npm install -g universal-agent-memory
```

### One-Line Installers

```bash
# Desktop (includes Docker for semantic search)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-desktop.sh)

# Web browsers (claude.ai, factory.ai)
bash <(curl -fsSL https://raw.githubusercontent.com/DammianMiller/universal-agent-memory/main/scripts/install-web.sh)
```

## Commands

### Essential

| Command | Description |
|---------|-------------|
| `uam init` | Initialize/update UAM (auto-merges, never loses data) |
| `uam generate` | Regenerate CLAUDE.md from project analysis |
| `uam update` | Update templates while preserving customizations |

### Memory

| Command | Description |
|---------|-------------|
| `uam memory status` | Check memory system status |
| `uam memory query <search>` | Search memories |
| `uam memory store <content>` | Store a learning |
| `uam memory start` | Start Qdrant for semantic search |
| `uam memory prepopulate` | Populate from docs and git history |

### Tasks

| Command | Description |
|---------|-------------|
| `uam task create` | Create tracked task |
| `uam task list` | List all tasks |
| `uam task claim <id>` | Claim task (announces to other agents) |
| `uam task release <id>` | Complete task |

### Worktrees

| Command | Description |
|---------|-------------|
| `uam worktree create <name>` | Create isolated branch |
| `uam worktree pr <id>` | Create PR from worktree |
| `uam worktree cleanup <id>` | Remove worktree |

### Droids

| Command | Description |
|---------|-------------|
| `uam droids list` | List available expert droids |
| `uam droids add <name>` | Create new expert droid |

### Coordination

| Command | Description |
|---------|-------------|
| `uam agent status` | View active agents |
| `uam agent overlaps` | Check for file conflicts |
| `uam coord status` | Coordination overview |

## How It Works

1. **Install & Init**: `npm i -g universal-agent-memory && uam init`

2. **CLAUDE.md Generated**: Auto-populated with project structure, commands, droids

3. **AI Reads CLAUDE.md**: Follows the embedded workflows automatically

4. **Every Task**:
   - Query memory for context
   - Check for agent overlaps
   - Route to specialist droids if needed
   - Create worktree for changes
   - Apply Code Field for better code
   - Run tests, create PR
   - Store learnings in memory

5. **Close-Out**: Merge → Deploy → Monitor → Fix loop until 100%

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  L1: WORKING      │ Recent actions       │ 50 max  │ SQLite    │
│  L2: SESSION      │ Current session      │ Per run │ SQLite    │
│  L3: SEMANTIC     │ Long-term learnings  │ Qdrant  │ Vectors   │
│  L4: KNOWLEDGE    │ Entity relationships │ SQLite  │ Graph     │
└─────────────────────────────────────────────────────────────────┘
```

**Data is never deleted.** Memory databases persist with the project.

Update with `uam init` or `uam generate` always merges - nothing is lost.

## Configuration

Configuration in `.uam.json`:

```json
{
  "project": {
    "name": "my-project",
    "defaultBranch": "main"
  },
  "memory": {
    "shortTerm": { "enabled": true, "path": "./agents/data/memory/short_term.db" },
    "longTerm": { "enabled": true, "provider": "qdrant" }
  },
  "worktrees": {
    "enabled": true,
    "directory": ".worktrees"
  },
  "template": {
    "sections": {
      "codeField": true
    }
  }
}
```

## Platform Support

| Platform | Context File | Works With |
|----------|--------------|------------|
| Claude Code | `CLAUDE.md` | Desktop app |
| Factory.AI | `CLAUDE.md` | Desktop/web |
| claude.ai | `CLAUDE.md` | Web browser |
| VSCode | `CLAUDE.md` | Extensions |

## Built-in Expert Droids

| Droid | Specialization |
|-------|----------------|
| `code-quality-guardian` | SOLID, complexity, naming |
| `security-auditor` | OWASP, secrets, injection |
| `performance-optimizer` | Algorithms, memory, caching |
| `documentation-expert` | JSDoc, README, accuracy |

## Requirements

- Node.js 18+
- Git
- Docker (optional, for semantic search)

## FAQ

**Q: Do I need to manage memory manually?**
A: No. The AI queries and stores memory automatically per CLAUDE.md instructions.

**Q: What if I don't have Docker?**
A: UAM works without Docker. You lose semantic search but SQLite memory still works.

**Q: Can multiple AI agents work on the same project?**
A: Yes. UAM includes coordination protocols to prevent merge conflicts.

**Q: How do I update without losing my customizations?**
A: Run `uam init` or `uam generate`. Updates always merge - nothing is lost.

**Q: What's Code Field?**
A: A prompt technique that makes AI state assumptions before coding. Based on [context-field research](https://github.com/NeoVertex1/context-field).

## Attribution

Code Field prompts based on research from [NeoVertex1/context-field](https://github.com/NeoVertex1/context-field).

## License

MIT

## Links

- [GitHub](https://github.com/DammianMiller/universal-agent-memory)
- [npm](https://www.npmjs.com/package/universal-agent-memory)
- [Issues](https://github.com/DammianMiller/universal-agent-memory/issues)
- [Context Field Research](https://github.com/NeoVertex1/context-field)
