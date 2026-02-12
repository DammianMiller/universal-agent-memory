#!/usr/bin/env bash
# UAM Pre-Compact Hook for Claude Code
# 1. Writes a timestamp marker to the daily log before context compaction
# 2. Marks any agents registered by this session as completed
# Fails safely - never blocks the agent.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
DB_PATH="${PROJECT_DIR}/agents/data/memory/short_term.db"
COORD_DB="${PROJECT_DIR}/agents/data/coordination/coordination.db"

if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Record a compaction marker in memory so sessions can detect context resets
sqlite3 "$DB_PATH" "
  INSERT OR IGNORE INTO memories (timestamp, type, content)
  VALUES ('$TIMESTAMP', 'action', '[pre-compact] Context compaction at $TIMESTAMP');
" 2>/dev/null || true

# Clean up agents with recent heartbeats (likely from this session being compacted)
# Mark as completed, release their claims
if [ -f "$COORD_DB" ]; then
  sqlite3 "$COORD_DB" "
    DELETE FROM work_claims WHERE agent_id IN (
      SELECT id FROM agent_registry
      WHERE status='active' AND last_heartbeat >= datetime('now','-5 minutes')
    );
    UPDATE work_announcements SET completed_at='$TIMESTAMP'
      WHERE completed_at IS NULL AND agent_id IN (
        SELECT id FROM agent_registry
        WHERE status='active' AND last_heartbeat >= datetime('now','-5 minutes')
      );
    UPDATE agent_registry SET status='completed'
      WHERE status='active' AND last_heartbeat >= datetime('now','-5 minutes');
  " 2>/dev/null || true
fi
