#!/usr/bin/env bash
# UAM Pre-Compact Hook for Claude Code
# Writes a timestamp marker to the daily log before context compaction.
# Fails safely - never blocks the agent.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
DB_PATH="${PROJECT_DIR}/agents/data/memory/short_term.db"

if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Record a compaction marker in memory so sessions can detect context resets
sqlite3 "$DB_PATH" "
  INSERT OR IGNORE INTO memories (timestamp, type, content)
  VALUES ('$TIMESTAMP', 'action', '[pre-compact] Context compaction at $TIMESTAMP');
" 2>/dev/null || true
