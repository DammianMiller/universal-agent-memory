<coding_guidelines>

# CLAUDE.md - @agent-context/cli Development Guide

You are an AI assistant helping with the @agent-context/cli project.

> Universal AI agent context system - CLAUDE.md templates, memory, worktrees for Claude Code, Factory.AI, VSCode, OpenCode

---

## MEMORY SYSTEM

### Short-term Memory (SQLite: `./agents/data/memory/short_term.db`)

Table: `memories`

- `id`: INTEGER PRIMARY KEY
- `timestamp`: TEXT (ISO8601)
- `type`: TEXT (action|observation|thought|goal)
- `content`: TEXT

**BEFORE EACH DECISION**: Query recent entries (last 50) to understand your context

```sql
SELECT * FROM memories ORDER BY id DESC LIMIT 50;
```

**AFTER EACH ACTION**: INSERT a new row describing what you did and the outcome

```sql
INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'Description of action and result');
```

### Long-term Memory (Qdrant: `localhost:6333`, collection: `agent_memory`)

**Start services**: `agent-context memory start`

**Query memories** (semantic search):
```bash
agent-context memory query "search term"
```

**Store new memory**:
```bash
agent-context memory store "Description" --tags tag1,tag2 --importance 8
```

---

## BROWSER USAGE

When using browser automation:

- ALWAYS save a screenshot after EVERY browser action
- Save screenshots to: `agents/data/screenshots/`
- Filename format: `{timestamp}_{action}.png`

---

## DECISION LOOP

1. **READ** short-term memory (recent context)
2. **QUERY** long-term memory (semantic search for relevant learnings)
3. **THINK** about what to do next
4. **ACT** - execute your decision
5. **RECORD** - write to short-term memory
6. **OPTIONALLY** - if significant learning, add to long-term memory

---

## GIT WORKTREE WORKFLOW (MANDATORY)

**ALL code changes MUST use isolated git worktrees:**

```bash
# Create worktree for new task
agent-context worktree create <slug>

# Work in the worktree
cd .worktrees/NNN-slug/

# Create PR when ready
agent-context worktree pr <id>

# Cleanup after merge
agent-context worktree cleanup <id>
```

---

## Quick Reference

### URLs

- **URL**: https://agent-context.dev/schema.json&quot;,

### Essential Commands

```bash
# Testing
npm test

# Linting
npm run lint

# Building
npm run build
```

---

## Augmented Agent Capabilities

## Completion Checklist

```
[ ] Tests updated and passing
[ ] Linting/type checking passed
[ ] Documentation updated
[ ] No secrets in code/commits
```

---

**Languages**: JavaScript, TypeScript
**Frameworks**: 

</coding_guidelines>
