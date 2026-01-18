"""
UAM-Integrated Agent for Harbor/Terminal-Bench (v1.2.0)

This agent extends the standard ClaudeCode agent by prepending UAM patterns
to the task instruction. Since Terminal-Bench doesn't read CLAUDE.md,
we inject patterns directly into the prompt.

The agent inherits all ClaudeCode functionality (ATIF support, proper logging)
and just modifies the instruction.
"""

import os
import shlex
from pathlib import Path
from typing import Any

from harbor.agents.installed.claude_code import ClaudeCode
from harbor.agents.installed.base import ExecInput
from harbor.models.trial.paths import EnvironmentPaths


# =============================================================================
# UAM v10.5 PATTERNS - Injected into task instructions
# =============================================================================

UAM_PREAMBLE = """## UAM AGENT PROTOCOL (EXECUTE THESE STEPS)

### STEP 1: PATTERN ROUTER (MANDATORY FIRST)
Before ANY work, print this analysis:
```
=== PATTERN ROUTER ===
Task: [one-line summary]
SELECTED PATTERNS:
- Output Verification: [YES/NO] - Does task require creating files?
- Constraint Check: [YES/NO] - Does task have "exactly/only/single/must be"?
- Adversarial Mode: [YES/NO] - Does task involve "bypass/break/exploit/filter"?
ACTIVE: [list only YES items]
=== END ROUTER ===
```

### STEP 2: Task-First Execution
If creating files, create placeholders FIRST:
```bash
touch /app/expected_output.txt  # Create before implementing
```

### STEP 3: For Adversarial Tasks (bypass/exploit/filter)
```
=== ADVERSARIAL ANALYSIS ===
Target: [what to bypass]
Attack vectors to try:
1. <ScRiPt> (case variation)
2. <img onerror=alert(1)> (event handlers)
3. &#x3C;script&#x3E; (encoding)
TEST EACH until one works.
=== END ===
```

### STEP 4: Completion Gates (MANDATORY BEFORE "DONE")
```bash
# Gate 1: Verify ALL outputs exist
ls -la /app/*.* 2>&1
# If ANY missing: CREATE IT NOW

# Gate 2: Run tests if available
pytest /tests/ -v 2>&1 | tail -20
# If <100%: fix and re-run
```

---

## YOUR TASK:

"""


class UAMAgent(ClaudeCode):
    """UAM Agent v1.2.0 - ClaudeCode with UAM patterns prepended to instructions."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-agent"
    
    def version(self) -> str:
        # Return None so parent's install script uses latest Claude CLI
        return None
    
    def create_run_agent_commands(self, instruction: str) -> list[ExecInput]:
        """Override to prepend UAM patterns to the instruction."""
        # Prepend UAM patterns
        enhanced_instruction = UAM_PREAMBLE + instruction
        
        # Call parent's create_run_agent_commands with enhanced instruction
        escaped_instruction = shlex.quote(enhanced_instruction)

        env = {
            "ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", ""),
            "ANTHROPIC_BASE_URL": os.environ.get("ANTHROPIC_BASE_URL", None),
            "CLAUDE_CODE_OAUTH_TOKEN": os.environ.get("CLAUDE_CODE_OAUTH_TOKEN", ""),
            "CLAUDE_CODE_MAX_OUTPUT_TOKENS": os.environ.get(
                "CLAUDE_CODE_MAX_OUTPUT_TOKENS", None
            ),
            "FORCE_AUTO_BACKGROUND_TASKS": "1",
            "ENABLE_BACKGROUND_TASKS": "1",
        }

        env = {k: v for k, v in env.items() if v}

        if self.model_name:
            if "ANTHROPIC_BASE_URL" in env:
                env["ANTHROPIC_MODEL"] = self.model_name
            else:
                env["ANTHROPIC_MODEL"] = self.model_name.split("/")[-1]
        elif "ANTHROPIC_MODEL" in os.environ:
            env["ANTHROPIC_MODEL"] = os.environ["ANTHROPIC_MODEL"]

        if "ANTHROPIC_BASE_URL" in env and "ANTHROPIC_MODEL" in env:
            env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = env["ANTHROPIC_MODEL"]
            env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = env["ANTHROPIC_MODEL"]
            env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = env["ANTHROPIC_MODEL"]
            env["CLAUDE_CODE_SUBAGENT_MODEL"] = env["ANTHROPIC_MODEL"]

        env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1"

        if self._max_thinking_tokens is not None:
            env["MAX_THINKING_TOKENS"] = str(self._max_thinking_tokens)
        elif "MAX_THINKING_TOKENS" in os.environ:
            env["MAX_THINKING_TOKENS"] = os.environ["MAX_THINKING_TOKENS"]

        env["CLAUDE_CONFIG_DIR"] = (EnvironmentPaths.agent_dir / "sessions").as_posix()

        return [
            ExecInput(
                command=(
                    "mkdir -p $CLAUDE_CONFIG_DIR/debug $CLAUDE_CONFIG_DIR/projects/-app "
                    "$CLAUDE_CONFIG_DIR/shell-snapshots $CLAUDE_CONFIG_DIR/statsig "
                    "$CLAUDE_CONFIG_DIR/todos && "
                    "if [ -d ~/.claude/skills ]; then "
                    "cp -r ~/.claude/skills $CLAUDE_CONFIG_DIR/skills 2>/dev/null || true; "
                    "fi"
                ),
                env=env,
            ),
            ExecInput(
                command=(
                    f"claude --verbose --output-format stream-json "
                    f"-p {escaped_instruction} --allowedTools "
                    f"{' '.join(self.ALLOWED_TOOLS)} 2>&1 </dev/null | tee "
                    f"/logs/agent/claude-code.txt"
                ),
                env=env,
            ),
        ]


class UAMAgentWithoutMemory(ClaudeCode):
    """UAM Agent without patterns - baseline for A/B testing."""
    
    @staticmethod
    def name() -> str:
        return "uam-agent-no-memory"
    
    def version(self) -> str:
        return None
