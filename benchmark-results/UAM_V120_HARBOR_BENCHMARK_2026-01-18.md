# UAM v1.2.0 Harbor Benchmark Results

**Date**: 2026-01-18
**UAM Version**: 1.2.0 (patterns prepended to instruction)
**Baseline**: claude-code (standard Harbor agent)
**Model**: claude-sonnet-4-20250514
**Tasks**: 9 Terminal-Bench 2.0 tasks

## Summary

| Metric | UAM v1.2.0 | Baseline | Delta |
|--------|------------|----------|-------|
| **Tasks Passed** | 1/9 | 1/9 | 0 |
| **Pass Rate** | 11.1% | 11.1% | 0% |

## Detailed Results

| Task | UAM v1.2.0 | Baseline | Notes |
|------|------------|----------|-------|
| adaptive-rejection-sampler | 8/9 FAIL | 8/9 FAIL | 1 test failing |
| chess-best-move | 0/1 FAIL | 0/1 FAIL | Pre-computed solution needed |
| configure-git-webserver | 0/1 FAIL | 0/1 FAIL | |
| **headless-terminal** | **7/7 PASS** | **7/7 PASS** | Both passed |
| mteb-retrieve | 1/2 FAIL | 1/2 FAIL | Output exists, data mismatch |
| polyglot-rust-c | 0/1 FAIL | 0/1 FAIL | |
| pypi-server | 0/1 FAIL | 0/1 FAIL | |
| pytorch-model-cli | 3/6 FAIL | 3/6 FAIL | 3 tests passing |
| write-compressor | 2/3 FAIL | 2/3 FAIL | 1 test failing |

## Analysis

### Why No Improvement?

1. **Pattern Overhead**: The UAM preamble adds ~500 tokens to each prompt but doesn't change behavior for tasks that already have clear instructions.

2. **Same Underlying Model**: Both agents use the same Claude Sonnet 4 model with the same tools - the patterns don't fundamentally change Claude's capabilities.

3. **Task Difficulty**: These tasks require specific domain knowledge or solutions that patterns alone cannot provide:
   - `chess-best-move`: Needs Stockfish engine integration
   - `configure-git-webserver`: Complex system configuration
   - `polyglot-rust-c`: Requires specific compiler flags/knowledge

4. **Partial Success Unchanged**: Tasks like `adaptive-rejection-sampler` (8/9) and `pytorch-model-cli` (3/6) show the agent is capable but missing specific edge cases.

### What UAM Patterns DO Provide

1. **Structured Approach**: The Pattern Router forces explicit task classification before work begins.

2. **Output Verification**: P12 (OEV) ensures files are created before completion.

3. **Adversarial Thinking**: P20 (AT) provides attack vector enumeration for bypass tasks.

### Recommendations

1. **Pattern Integration**: Instead of prepending patterns to instructions, integrate them into CLAUDE.md for agents that support it.

2. **Task-Specific Patterns**: Some tasks need domain-specific guidance (e.g., "use Stockfish for chess").

3. **Longer Evaluation**: These 9 tasks may not capture scenarios where patterns provide significant value.

## UAM Agent Implementation

The UAM Agent (v1.2.0) extends Harbor's ClaudeCode agent:

```python
class UAMAgent(ClaudeCode):
    def create_run_agent_commands(self, instruction: str) -> list[ExecInput]:
        enhanced_instruction = UAM_PREAMBLE + instruction
        # ... rest uses standard ClaudeCode execution
```

**Key Fix**: `version()` returns `None` to use latest Claude CLI instead of a specific version.

## Conclusion

UAM v1.2.0 patterns show **no measurable improvement** on this 9-task sample compared to baseline. The patterns provide structured approach but don't fundamentally change task completion rates.

The value of UAM patterns may be more apparent in:
- Larger task sets (40+ tasks)
- Tasks with ambiguous requirements
- Multi-step workflows where state protection matters
- Security/adversarial tasks where attack mindset helps

Further testing recommended on full Terminal-Bench 2.0 (54 tasks) before drawing final conclusions.
