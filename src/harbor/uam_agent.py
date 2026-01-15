"""
UAM-Integrated Agent for Harbor/Terminal-Bench

This agent integrates Universal Agent Memory with Droid for enhanced
benchmark performance. It provides:
- Dynamic memory retrieval based on task classification
- Hierarchical prompting with recency bias
- Multi-turn execution with error feedback
"""

import os
import json
import subprocess
from pathlib import Path
from typing import Optional

from harbor.agents.base import BaseAgent
from harbor.environment.base import BaseEnvironment
from harbor.models.agent import AgentContext


class UAMAgent(BaseAgent):
    """
    UAM-enhanced agent that wraps Droid with persistent memory context.
    """
    
    def __init__(
        self,
        model: str = "claude-opus-4-5-20251101",
        use_memory: bool = True,
        max_turns: int = 3,
        project_root: Optional[str] = None,
    ):
        self._model = model
        self._use_memory = use_memory
        self._max_turns = max_turns
        self._project_root = project_root or os.getcwd()
        self._memory_context: str = ""
        self._task_category: str = "general"
        
    @staticmethod
    def name() -> str:
        return "uam-agent"
    
    def version(self) -> str:
        return "0.6.3"
    
    async def setup(self, environment: BaseEnvironment) -> None:
        """Initialize environment and load relevant memory context."""
        # Check droid is available
        result = await environment.exec("which droid || echo 'droid not found'")
        if "not found" in result.stdout:
            # Try to ensure droid is in PATH
            await environment.exec("export PATH=$HOME/.local/bin:$PATH")
        
        # Get environment info for memory context
        env_info = await self._gather_environment_info(environment)
        
        if self._use_memory:
            self._memory_context = await self._load_memory_context(env_info)
    
    async def _gather_environment_info(self, environment: BaseEnvironment) -> dict:
        """Gather system and environment information."""
        info = {}
        
        # System info
        result = await environment.exec("uname -a 2>/dev/null || echo 'unknown'")
        info["system"] = result.stdout.strip()
        
        # Current directory
        result = await environment.exec("pwd")
        info["cwd"] = result.stdout.strip()
        
        # List files
        result = await environment.exec("ls -la 2>/dev/null | head -20")
        info["files"] = result.stdout.strip()
        
        # Available tools
        result = await environment.exec(
            "which python python3 pip npm node go cargo git 2>/dev/null | head -10"
        )
        info["tools"] = result.stdout.strip()
        
        return info
    
    async def _load_memory_context(self, env_info: dict) -> str:
        """Load relevant memory context based on task and environment."""
        # Call UAM CLI to get memory context
        try:
            result = subprocess.run(
                [
                    "npx", "uam", "memory", "query",
                    "--category", self._task_category,
                    "--format", "prompt",
                    "--limit", "15"
                ],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self._project_root
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            pass
        
        # Fallback: read CLAUDE.md directly
        claude_md = Path(self._project_root) / "CLAUDE.md"
        if claude_md.exists():
            content = claude_md.read_text()
            # Extract relevant sections (first 2000 chars)
            return f"## Project Context\n\n{content[:2000]}..."
        
        return ""
    
    def _classify_task(self, instruction: str) -> str:
        """Classify task to route to appropriate memory context."""
        instruction_lower = instruction.lower()
        
        categories = {
            "sysadmin": ["kernel", "systemd", "network", "firewall", "dns", "cron", "qemu"],
            "security": ["hash", "crack", "exploit", "ssl", "certificate", "secret", "cve"],
            "ml-training": ["train", "model", "dataset", "pytorch", "tensorflow", "mteb", "gpu"],
            "debugging": ["fix", "debug", "error", "conflict", "broken", "pip", "conda"],
            "coding": ["implement", "function", "class", "refactor", "algorithm", "typescript"],
            "file-ops": ["download", "extract", "convert", "archive", "compress"],
        }
        
        for category, keywords in categories.items():
            if any(kw in instruction_lower for kw in keywords):
                return category
        
        return "general"
    
    def _build_prompt(self, instruction: str, attempt: int = 1, prev_error: str = "") -> str:
        """Build hierarchical prompt with memory context."""
        sections = []
        
        # Layer 1: System capabilities
        sections.append("""## Capabilities
You are an expert terminal agent with access to:
- Shell command execution (bash)
- File operations (read, write, create, modify)
- Package management (apt, pip, npm, cargo)
- Service control (systemctl, docker)
""")
        
        # Layer 2: Category-specific guidelines
        guidelines = self._get_category_guidelines()
        if guidelines:
            sections.append(f"## Guidelines\n\n{guidelines}")
        
        # Layer 3: Memory context (if available)
        if self._memory_context:
            sections.append(f"## Project Knowledge\n\n{self._memory_context}")
        
        # Layer 4: Task instruction
        sections.append(f"## Task\n\n{instruction}")
        
        # Layer 5: System notifications (at END for recency bias)
        notifications = ["## CRITICAL REMINDERS"]
        
        if attempt > 1:
            notifications.append(f"\n**ATTEMPT {attempt}**: Previous attempt failed.")
            if prev_error:
                notifications.append(f"Previous error: {prev_error[:500]}")
            notifications.append("Try a different approach.")
        
        notifications.extend([
            "\n**Before completing:**",
            "- Verify your solution works",
            "- Check for edge cases",
            "- Test the result if possible"
        ])
        
        sections.append("\n".join(notifications))
        
        return "\n\n".join(sections)
    
    def _get_category_guidelines(self) -> str:
        """Get category-specific guidelines."""
        guidelines = {
            "sysadmin": """- Use modern commands: `ip` over `ifconfig`, `ss` over `netstat`
- Check service status before modifications
- Backup configs before changing: `cp file file.bak`
- Use `make -j$(nproc)` for parallel builds""",
            
            "security": """- NEVER log or expose credentials
- Use parameterized commands
- Research CVE details before exploitation
- Verify permissions carefully""",
            
            "ml-training": """- Check GPU availability with `nvidia-smi`
- Use `CUDA_VISIBLE_DEVICES` for GPU selection
- Cache datasets to avoid re-downloads
- Monitor memory usage""",
            
            "debugging": """- Reproduce the error first
- Check logs and stack traces
- Use `pip check` / `conda list` for dependencies
- Try verbose flags (-v, --debug)""",
            
            "coding": """- Follow existing code style
- Handle errors explicitly
- Include necessary imports
- Test your solution""",
        }
        return guidelines.get(self._task_category, "")
    
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        """Execute task with multi-turn refinement."""
        # Classify task
        self._task_category = self._classify_task(instruction)
        
        # Reload memory for this specific task category
        if self._use_memory:
            env_info = await self._gather_environment_info(environment)
            self._memory_context = await self._load_memory_context(env_info)
        
        prev_error = ""
        
        for attempt in range(1, self._max_turns + 1):
            # Build prompt with memory and previous error feedback
            prompt = self._build_prompt(instruction, attempt, prev_error)
            
            # Write prompt to temp file
            prompt_file = f"/tmp/uam_prompt_{attempt}.txt"
            await environment.exec(f"cat > {prompt_file} << 'PROMPT_EOF'\n{prompt}\nPROMPT_EOF")
            
            # Execute with droid
            api_key = os.environ.get("FACTORY_API_KEY", os.environ.get("DROID_API_KEY", ""))
            
            cmd = f'FACTORY_API_KEY="{api_key}" droid exec --model "{self._model}" --auto high -f "{prompt_file}"'
            
            result = await environment.exec(cmd, timeout=300)
            
            # Log to context
            context.add_turn(
                prompt=prompt,
                response=result.stdout,
                metadata={
                    "attempt": attempt,
                    "category": self._task_category,
                    "memory_used": self._use_memory,
                    "exit_code": result.exit_code,
                }
            )
            
            # Check if successful
            if result.exit_code == 0 and not self._looks_like_error(result.stdout):
                # Success - store lesson if using memory
                if self._use_memory:
                    await self._store_lesson(instruction, "success", result.stdout)
                return
            
            # Extract error for next attempt
            prev_error = self._extract_error(result.stdout + result.stderr)
            
            # Store failure for learning
            if self._use_memory:
                await self._store_lesson(instruction, "failure", prev_error)
        
        # All attempts exhausted
        context.add_metadata("all_attempts_failed", True)
    
    def _looks_like_error(self, output: str) -> bool:
        """Check if output indicates an error."""
        error_patterns = [
            "error:", "Error:", "ERROR:",
            "failed", "Failed", "FAILED",
            "Traceback (most recent call last)",
            "command not found",
            "No such file or directory",
        ]
        return any(pattern in output for pattern in error_patterns)
    
    def _extract_error(self, output: str) -> str:
        """Extract the most relevant error message."""
        lines = output.strip().split("\n")
        
        # Look for error lines
        error_lines = []
        for line in lines:
            if any(p in line for p in ["error", "Error", "ERROR", "failed", "Failed"]):
                error_lines.append(line)
        
        if error_lines:
            return "\n".join(error_lines[-3:])  # Last 3 error lines
        
        # Return last few lines if no obvious error
        return "\n".join(lines[-5:])
    
    async def _store_lesson(self, task: str, outcome: str, details: str) -> None:
        """Store lesson learned for future reference."""
        try:
            lesson = {
                "task": task[:200],
                "outcome": outcome,
                "category": self._task_category,
                "details": details[:500],
            }
            
            subprocess.run(
                [
                    "npx", "uam", "memory", "store",
                    "--type", "lesson",
                    "--content", json.dumps(lesson),
                    "--importance", "7" if outcome == "failure" else "5"
                ],
                capture_output=True,
                timeout=10,
                cwd=self._project_root
            )
        except Exception:
            pass  # Don't fail the task if memory storage fails


class UAMAgentWithoutMemory(UAMAgent):
    """UAM Agent without memory for A/B testing."""
    
    def __init__(self, model: str = "claude-opus-4-5-20251101", **kwargs):
        super().__init__(model=model, use_memory=False, **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-agent-no-memory"


# Agent variants for different models
class UAMAgentOpus(UAMAgent):
    def __init__(self, **kwargs):
        super().__init__(model="claude-opus-4-5-20251101", **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-opus"


class UAMAgentGPT52(UAMAgent):
    def __init__(self, **kwargs):
        super().__init__(model="gpt-5.2-codex", **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-gpt52"


class UAMAgentGLM47(UAMAgent):
    def __init__(self, **kwargs):
        super().__init__(model="glm-4.7", **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-glm47"
