# UAM Project Configuration

## Repository Structure

```
universal-agent-memory/
├── src/                           # Source code
│   ├── generators/                # CLAUDE.md generator
│   ├── memory/                    # Memory system
│   └── cli/                       # CLI commands
├── templates/                     # Template files
├── .factory/                      # Factory AI configuration
│   ├── droids/                    # Custom AI agents
│   └── skills/                    # Reusable skills
└── docs/                          # Documentation
```

## Quick Reference

### Commands
```bash
npm run build    # Build TypeScript
npm test         # Run tests
npm run lint     # Lint code
uam generate     # Regenerate CLAUDE.md
```

### Key Files
| File | Purpose |
|------|---------|
| `.uam.json` | UAM configuration |
| `templates/CLAUDE.template.md` | Main template |
| `.factory/PROJECT.md` | Project-specific content |

## Architecture

UAM provides:
1. **Memory System** - Short-term (SQLite) + Long-term (Qdrant)
2. **Template Generator** - Generates CLAUDE.md from templates
3. **Worktree Management** - Git worktree workflow automation
4. **Multi-Agent Coordination** - Agent overlap detection
