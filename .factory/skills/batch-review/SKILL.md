| name | description | argument-hint |
| --- | --- | --- |
| batch-review | Send non-urgent work to Claude Batch API at 50% cost. Use for code reviews, documentation, security audits, architecture analysis, and any task that can wait ~1hr. | task description or "check"/"status" |

# Batch Review (claude-batch-toolkit)

Send non-urgent analysis to Anthropic's Batch API at **50% cost reduction**.

## Setup
```bash
git clone git@github.com:s2-streamstore/claude-batch-toolkit.git
cd claude-batch-toolkit && ./install.sh --api-key $ANTHROPIC_API_KEY
```

## Good Batch Candidates
- Code reviews and security audits
- Documentation generation
- Architecture analysis
- Test generation for existing code
- Refactoring plans
- Changelog generation

## Bad Candidates (use real-time instead)
- Anything needed right now
- Interactive debugging
- Quick questions
- Tasks requiring back-and-forth

## Usage Pattern
1. Gather all context into a self-contained prompt file
2. Include full file contents (batch model has NO codebase access)
3. Submit via MCP tool `send_to_batch` with `packet_path`
4. Check results: `batch_list` then read from `~/.claude/batches/results/`

## Integration with Parallel Review Protocol
Instead of running security-auditor/code-quality-guardian synchronously as subagents,
submit reviews as batch jobs for 50% cost savings when time allows:

```bash
# Assemble review prompt with full diff
git diff --staged > /tmp/review_diff.txt
cat > /tmp/batch_prompt.md << 'EOF'
Review the following diff for security vulnerabilities and code quality issues.
## Diff
EOF
cat /tmp/review_diff.txt >> /tmp/batch_prompt.md

# Submit (via MCP or CLI)
uv run ~/.claude/mcp/claude_batch_mcp.py submit --packet-path /tmp/batch_prompt.md --label "pr-review"
```

## Cost Reference
| Model | Standard | Batch (50% off) |
|-------|----------|-----------------|
| Claude Opus 4 | $15/$75 per 1M | **$7.50/$37.50** |
| Claude Sonnet 4 | $3/$15 per 1M | **$1.50/$7.50** |
