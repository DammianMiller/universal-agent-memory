#!/usr/bin/env bash
# UAM Session Start Hook for Claude Code
# Injects open loops and recent daily context at session start.
# Fails safely - never blocks the agent.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
DB_PATH="${PROJECT_DIR}/agents/data/memory/short_term.db"

if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

output=""

# Recent memories (last 24h, high importance)
recent=$(sqlite3 "$DB_PATH" "
  SELECT type, content FROM memories
  WHERE timestamp >= datetime('now', '-1 day')
  ORDER BY id DESC
  LIMIT 10;
" 2>/dev/null || true)

if [ -n "$recent" ]; then
  output+="## Recent Memory Context"$'\n'
  output+="$recent"$'\n\n'
fi

# Open loops from session memories
open_loops=$(sqlite3 "$DB_PATH" "
  SELECT content FROM session_memories
  WHERE type IN ('action','goal','decision')
    AND importance >= 7
  ORDER BY id DESC
  LIMIT 5;
" 2>/dev/null || true)

if [ -n "$open_loops" ]; then
  output+="## Open Loops"$'\n'
  output+="$open_loops"$'\n'
fi

if [ -n "$output" ]; then
  echo "$output"
fi
