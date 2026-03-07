# Changelog

All notable changes to Universal Agent Memory will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CLAUDE.md Adherence Hooks**: Enhanced session and pre-compact hooks to explicitly load and preserve CLAUDE.md architectural constraints, security rules, and quality gates
- **New Skills/Droids**: Added 5 new Claude skills for enhanced agent functionality:
  - `hooks-pre-compact` - Pre-compaction database optimization and CLAUDE.md compliance
  - `hooks-session-start` - Session initialization with stale agent cleanup and context injection
  - `session-context-preservation-droid` - Cross-session knowledge continuity specialist
  - `scripts-preload-memory` - Memory system preloading and context initialization
  - `scripts-tool-router` - Intelligent tool routing and pattern matching
- **Opencode Plugin Optimizations**: Reduced session context from 10 to 8 entries with truncated content (120 chars) for 3B model efficiency
- **Pattern RAG Improvements**: On-demand pattern injection with score threshold (0.35) and body truncation (~400 chars)

### Changed

- Updated `.claude/hooks/pre-compact.sh` to preserve CLAUDE.md constraints before context compaction
- Updated `.claude/hooks/session-start.sh` to inject CLAUDE.md adherence reminders
- Updated `.opencode/plugin/uam-session-hooks.ts` with optimized context loading
- Created `.claude/skills/` directory structure for skill-based droid organization

### Security

- Enhanced CLAUDE.md adherence tracking to ensure architectural consistency across sessions
- Improved stale agent cleanup with 24-hour heartbeat threshold

---

## [4.4.4] - 2026-03-03

### Added

- Qdrant integration for semantic pattern search
- Pattern-based RAG for on-demand context injection
- Worktree workflow automation

### Changed

- Updated dependencies to latest versions
- Improved TypeScript type safety

### Fixed

- Memory database initialization issues
- Pattern indexing performance

---

## [4.4.0] - 2026-01-15

### Added

- Multi-agent coordination system
- SQLite-based memory storage
- Session management with heartbeat tracking
- Open loops and task outcome recording

### Changed

- Refactored CLI interface
- Improved error handling and logging

---

## [4.0.0] - 2025-12-01

### Added

- Initial release
- Core memory system
- Basic CLI commands
- CLAUDE.md template support