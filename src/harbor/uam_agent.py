"""
UAM-Integrated Agent for Harbor/Terminal-Bench (Hybrid Adaptive - Option 4)

This agent integrates Universal Agent Memory with Droid using a hybrid adaptive
context system that:
1. Classifies tasks to determine if UAM context would help
2. Assesses time pressure to avoid timeouts
3. Uses historical benefit tracking to optimize context loading
4. Supports progressive context escalation on retry

Key improvement: Reasoning/scheduling tasks skip UAM to avoid timeout regression.

Architecture inspired by top Terminal-Bench agents:
- Factory Droid (64.9%): Hierarchical prompting, recency bias, environment bootstrapping
- Apex2 (64.5%): Prediction phase, strategy synthesis, risk-aware category prompting
"""

import os
import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from harbor.agents.base import BaseAgent
from harbor.environment.base import BaseEnvironment
from harbor.models.agent import AgentContext


@dataclass
class ContextDecision:
    """Decision about what context level to use."""
    level: str  # 'none', 'minimal', 'full'
    sections: list
    reason: str
    estimated_overhead_ms: int
    task_type: str
    time_pressure: str
    historical_benefit: float


# Task categories that don't benefit from UAM context (pure reasoning)
LOW_BENEFIT_CATEGORIES = {
    'reasoning', 'scheduling', 'constraint-satisfaction',
    'games', 'pure-logic', 'mathematical'
}

# Keywords for task classification
SKIP_UAM_KEYWORDS = [
    'schedule', 'scheduling', 'calendar', 'meeting',
    'constraint', 'satisfy', 'optimize',
    'chess move', 'best move', 'game theory',
    'mathematical proof', 'prove that', 'logic puzzle',
]

HIGH_BENEFIT_KEYWORDS = [
    'password', 'hash', 'crack', 'decrypt',
    'elf', 'binary', 'executable', 'extract',
    'xss', 'injection', 'sanitize', 'filter',
    'sqlite', 'database', 'recovery', 'wal',
    'compile', 'build', 'makefile',
    'cobol', 'modernize', 'legacy',
]

# Context content by section (optimized based on Apex2/Droid insights)
CONTEXT_SECTIONS = {
    'security': {
        'tokens': 150,
        'content': """### Security
- XSS: Use bleach.clean() or DOMPurify. Remove script, onclick, onerror, javascript:
- Password cracking: hashcat -m 11600 for 7z, -m 0 MD5, john for CPU
- Binary secrets: strings, objdump -d, check .rodata section
- CVE exploitation: Research exact steps before attempting, some operations irreversible
- Always validate and sanitize user input"""
    },
    'file_formats': {
        'tokens': 120,
        'content': """### File Formats
- ELF: Program headers at e_phoff. Use struct.unpack('<HH...') for parsing
- SQLite WAL: Header 32 bytes, frames follow. PRAGMA wal_checkpoint(TRUNCATE) to recover
- 7z: Install p7zip-full, use 7z x -p'password' for password protected archives"""
    },
    'coding': {
        'tokens': 80,
        'content': """### Coding
- Use absolute paths (/app/...) not relative
- Verify file exists before reading
- Handle edge cases in parsing
- Match exact output format required"""
    },
    'tools': {
        'tokens': 100,
        'content': """### Tools
- hashcat: GPU password cracking, -m flag for hash type (11600=7z, 0=MD5, 1000=NTLM)
- john: CPU password cracking, flexible format support
- readelf -a / objdump -d: Binary analysis
- strings: Extract printable strings from binaries"""
    },
    'legacy': {
        'tokens': 90,
        'content': """### Legacy Code
- COBOL: Fixed-format columns (1-6 sequence, 7 indicator, 8-72 code)
- WORKING-STORAGE SECTION for variables
- Modernization: Preserve business logic, update data structures
- Test with original inputs to verify behavior matches"""
    },
    'ml': {
        'tokens': 100,
        'content': """### ML Training (Risk-Aware)
- CRITICAL: Test with small epochs/batch first before full runs
- Training can exceed 5 minutes - verify shapes and configs early
- Check GPU: nvidia-smi, CUDA_VISIBLE_DEVICES for GPU selection
- Cache datasets to avoid re-downloads"""
    },
}

# Historical benefit data (in production, load from SQLite)
HISTORICAL_BENEFIT = {
    'security': 0.8,
    'file-ops': 0.7,
    'legacy': 0.6,
    'coding': 0.4,
    'debugging': 0.5,
    'scheduling': 0.05,
    'games': 0.05,
    'constraint-satisfaction': 0.05,
    'pure-logic': 0.05,
    'reasoning': 0.05,
    'general': 0.3,
}


class HybridAdaptiveContext:
    """Hybrid Adaptive Context System (Option 4)."""
    
    @staticmethod
    def classify_task(instruction: str) -> str:
        """Classify task type from instruction text."""
        lower = instruction.lower()
        
        # Check skip keywords first (pure reasoning tasks)
        for kw in SKIP_UAM_KEYWORDS:
            if kw in lower:
                if 'schedule' in lower or 'calendar' in lower or 'meeting' in lower:
                    return 'scheduling'
                if 'chess' in lower or 'game' in lower or 'move' in lower:
                    return 'games'
                if 'constraint' in lower or 'satisfy' in lower:
                    return 'constraint-satisfaction'
                if 'prove' in lower or 'proof' in lower or 'logic' in lower:
                    return 'pure-logic'
                return 'reasoning'
        
        # Check high-benefit keywords
        for kw in HIGH_BENEFIT_KEYWORDS:
            if kw in lower:
                if any(k in lower for k in ['password', 'hash', 'crack', 'xss', 'injection', 'sanitize', 'secret']):
                    return 'security'
                if any(k in lower for k in ['elf', 'sqlite', 'binary', 'extract']):
                    return 'file-ops'
                if any(k in lower for k in ['cobol', 'legacy', 'modernize']):
                    return 'legacy'
        
        return 'general'
    
    @staticmethod
    def assess_time_pressure(timeout_sec: float, task_type: str, difficulty: str = 'medium') -> str:
        """Assess time pressure based on timeout and task complexity."""
        difficulty_mult = {'easy': 0.5, 'medium': 1.0, 'hard': 2.0}.get(difficulty, 1.0)
        base_duration = {
            'security': 120, 'file-ops': 90, 'legacy': 150, 'coding': 60,
            'debugging': 90, 'scheduling': 45, 'games': 30,
            'constraint-satisfaction': 60, 'pure-logic': 90,
            'reasoning': 60, 'general': 60,
        }.get(task_type, 60)
        
        expected = base_duration * difficulty_mult
        ratio = timeout_sec / expected
        
        if ratio < 1.2:
            return 'critical'
        if ratio < 1.5:
            return 'high'
        if ratio < 2.0:
            return 'medium'
        return 'low'
    
    @staticmethod
    def get_historical_benefit(task_type: str) -> float:
        """Get historical benefit ratio for a task type."""
        return HISTORICAL_BENEFIT.get(task_type, 0.3)
    
    @staticmethod
    def select_relevant_sections(instruction: str, task_type: str) -> list:
        """Select relevant context sections based on task type and instruction."""
        lower = instruction.lower()
        sections = []
        
        section_keywords = {
            'security': ['xss', 'password', 'hash', 'crack', 'secret', 'exploit', 'injection', 'sanitize'],
            'file_formats': ['elf', 'sqlite', '7z', 'archive', 'binary', 'extract', 'format'],
            'coding': ['implement', 'function', 'class', 'refactor', 'algorithm', 'code'],
            'tools': ['hashcat', 'john', 'strings', 'objdump', 'readelf', 'command', 'cli'],
            'legacy': ['cobol', 'fortran', 'legacy', 'modernize', 'mainframe'],
        }
        
        for section, keywords in section_keywords.items():
            if any(kw in lower for kw in keywords):
                sections.append(section)
        
        # Add default sections for task types
        if task_type == 'security' and 'security' not in sections:
            sections.append('security')
        if task_type == 'file-ops' and 'file_formats' not in sections:
            sections.append('file_formats')
        if task_type == 'legacy' and 'legacy' not in sections:
            sections.append('legacy')
        
        return sections
    
    @staticmethod
    def calculate_overhead(sections: list) -> int:
        """Calculate estimated overhead in ms."""
        ms_per_token = 4
        total_tokens = sum(CONTEXT_SECTIONS.get(s, {}).get('tokens', 0) for s in sections)
        return total_tokens * ms_per_token
    
    @classmethod
    def decide_context_level(cls, instruction: str, timeout_sec: float = 300, difficulty: str = 'medium') -> ContextDecision:
        """Main decision function using hybrid approach."""
        task_type = cls.classify_task(instruction)
        
        # Rule 1: Skip UAM for pure reasoning tasks
        if task_type in LOW_BENEFIT_CATEGORIES:
            return ContextDecision(
                level='none',
                sections=[],
                reason=f"Task type '{task_type}' is pure reasoning - UAM adds no benefit",
                estimated_overhead_ms=0,
                task_type=task_type,
                time_pressure='low',
                historical_benefit=0.0,
            )
        
        # Rule 2: Assess time pressure
        time_pressure = cls.assess_time_pressure(timeout_sec, task_type, difficulty)
        
        # Rule 3: Get historical benefit
        historical_benefit = cls.get_historical_benefit(task_type)
        
        # Rule 4: Skip if historical benefit is too low
        if historical_benefit < 0.1:
            return ContextDecision(
                level='none',
                sections=[],
                reason=f"Low historical benefit ({historical_benefit*100:.1f}%) for {task_type}",
                estimated_overhead_ms=0,
                task_type=task_type,
                time_pressure=time_pressure,
                historical_benefit=historical_benefit,
            )
        
        # Rule 5: Critical time pressure - skip UAM
        if time_pressure == 'critical':
            return ContextDecision(
                level='none',
                sections=[],
                reason='Critical time pressure - skipping UAM to avoid timeout',
                estimated_overhead_ms=0,
                task_type=task_type,
                time_pressure=time_pressure,
                historical_benefit=historical_benefit,
            )
        
        # Rule 6: Select relevant sections
        sections = cls.select_relevant_sections(instruction, task_type)
        overhead = cls.calculate_overhead(sections)
        
        # Rule 7: High time pressure or high overhead ratio - use minimal
        overhead_ratio = overhead / (timeout_sec * 1000)
        if time_pressure == 'high' or overhead_ratio > 0.1:
            minimal_sections = sections[:1] if sections else ['coding']
            return ContextDecision(
                level='minimal',
                sections=minimal_sections,
                reason=f"High time pressure - using minimal context",
                estimated_overhead_ms=cls.calculate_overhead(minimal_sections),
                task_type=task_type,
                time_pressure=time_pressure,
                historical_benefit=historical_benefit,
            )
        
        # Default: Full context
        return ContextDecision(
            level='full',
            sections=sections if sections else ['coding'],
            reason=f"Full context for {task_type} task ({time_pressure} pressure)",
            estimated_overhead_ms=overhead,
            task_type=task_type,
            time_pressure=time_pressure,
            historical_benefit=historical_benefit,
        )
    
    @staticmethod
    def generate_context(decision: ContextDecision) -> str:
        """Generate context string based on decision."""
        if decision.level == 'none' or not decision.sections:
            return ''
        
        parts = ['## UAM Memory Context\n']
        for section in decision.sections:
            if section in CONTEXT_SECTIONS:
                parts.append(CONTEXT_SECTIONS[section]['content'])
        
        return '\n'.join(parts)
    
    @classmethod
    def get_progressive_levels(cls, instruction: str, error: str) -> list:
        """Get progressive context levels for retry scenarios."""
        decision = cls.decide_context_level(instruction)
        
        # Don't escalate for pure reasoning tasks
        if decision.task_type in LOW_BENEFIT_CATEGORIES:
            return ['none']
        
        # Check if error suggests context might help
        error_lower = error.lower()
        context_might_help = any(kw in error_lower for kw in [
            'unknown', 'how to', 'what is', 'command not found',
            'invalid syntax', 'format', 'parse'
        ])
        
        if not context_might_help:
            return [decision.level]
        
        # Progressive escalation
        if decision.level == 'none':
            return ['none', 'minimal', 'full']
        elif decision.level == 'minimal':
            return ['minimal', 'full']
        else:
            return ['full']


class UAMAgent(BaseAgent):
    """UAM-enhanced agent with Hybrid Adaptive context system."""
    
    def __init__(
        self,
        model: str = "claude-opus-4-5-20251101",
        use_memory: bool = True,
        max_turns: int = 3,
        project_root: Optional[str] = None,
        timeout_sec: float = 300,
    ):
        self._model = model
        self._use_memory = use_memory
        self._max_turns = max_turns
        self._project_root = project_root or os.getcwd()
        self._timeout_sec = timeout_sec
        self._memory_context: str = ""
        self._task_category: str = "general"
        self._context_decision: Optional[ContextDecision] = None
        
    @staticmethod
    def name() -> str:
        return "uam-agent"
    
    def version(self) -> str:
        return "0.7.0"  # Version bump for Hybrid Adaptive
    
    async def setup(self, environment: BaseEnvironment) -> None:
        """Initialize environment."""
        result = await environment.exec("which droid || echo 'droid not found'")
        if "not found" in result.stdout:
            await environment.exec("export PATH=$HOME/.local/bin:$PATH")
    
    def _build_prompt(self, instruction: str, attempt: int = 1, prev_error: str = "", env_info: str = "") -> str:
        """Build hierarchical prompt with adaptive context.
        
        Uses Factory Droid's proven 3-tier hierarchy:
        1. Tool descriptions / capabilities (high-level)
        2. System prompts / guidelines (behavioral)
        3. System notifications at END (recency bias for critical guidance)
        """
        sections = []
        
        # Layer 1: System capabilities
        sections.append("""## Capabilities
You are an expert terminal agent with access to:
- Shell command execution (bash)
- File operations (read, write, create, modify)
- Package management (apt, pip, npm, cargo)
- Service control (systemctl, docker)
""")
        
        # Layer 2: Environment bootstrapping (Factory Droid insight)
        # Pre-load system info to avoid redundant discovery commands
        if env_info:
            sections.append(f"## Environment (pre-discovered)\n```\n{env_info}\n```")
        
        # Layer 3: Category-specific guidelines with risk awareness (Apex2 insight)
        guidelines = self._get_category_guidelines()
        if guidelines:
            sections.append(f"## Guidelines\n\n{guidelines}")
        
        # Layer 4: Memory context (based on adaptive decision)
        if self._memory_context:
            sections.append(self._memory_context)
        
        # Layer 5: Task instruction
        sections.append(f"## Task\n\n{instruction}")
        
        # Layer 6: System notifications at END for recency bias (Factory Droid insight)
        # LLMs prioritize recent context - put critical guidance here
        notifications = ["## CRITICAL REMINDERS"]
        
        if attempt > 1:
            notifications.append(f"\n**ATTEMPT {attempt}/{self._max_turns}**: Previous attempt failed.")
            if prev_error:
                notifications.append(f"Error: {prev_error[:500]}")
            notifications.append("**Try a different approach. Do not repeat failed commands.**")
        
        # Risk-aware reminders based on task category (Apex2 insight)
        if self._task_category == 'security':
            notifications.append("\n**SECURITY TASK**: Ground exact command sequences before execution. Some operations are irreversible.")
        elif self._task_category == 'ml-training':
            notifications.append("\n**ML TASK**: Test with small epochs/batch FIRST. Training runs can exceed timeout.")
        
        notifications.extend([
            "\n**Before completing:**",
            "- Verify your solution works (run tests if available)",
            "- Check edge cases",
            "- Ensure output format matches requirements exactly"
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
    
    async def _gather_env_info(self, environment: BaseEnvironment) -> str:
        """Gather environment info for bootstrapping (Factory Droid technique).
        
        Pre-loading this info saves time and tokens by avoiding redundant 
        discovery commands during execution.
        """
        info_parts = []
        
        # Quick system checks - keep it lightweight to avoid overhead
        checks = [
            ("pwd", "Working directory"),
            ("ls -la 2>/dev/null | head -15", "Files"),
            ("which python python3 pip hashcat john 2>/dev/null", "Available tools"),
        ]
        
        for cmd, label in checks:
            try:
                result = await environment.exec(cmd, timeout=5)
                if result.stdout.strip():
                    info_parts.append(f"# {label}\n{result.stdout.strip()}")
            except Exception:
                pass
        
        return "\n\n".join(info_parts) if info_parts else ""
    
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        """Execute task with hybrid adaptive context."""
        start_time = time.time()
        
        # Phase 1: Task classification (Apex2 prediction phase)
        self._context_decision = HybridAdaptiveContext.decide_context_level(
            instruction, self._timeout_sec
        )
        self._task_category = self._context_decision.task_type
        
        # Log the decision
        context.add_metadata("context_decision", {
            "level": self._context_decision.level,
            "reason": self._context_decision.reason,
            "task_type": self._context_decision.task_type,
            "time_pressure": self._context_decision.time_pressure,
            "historical_benefit": self._context_decision.historical_benefit,
        })
        
        # Phase 2: Environment bootstrapping (Factory Droid technique)
        # Only gather if we have time budget and it's not a pure reasoning task
        env_info = ""
        if self._context_decision.level != 'none' and self._context_decision.time_pressure != 'critical':
            env_info = await self._gather_env_info(environment)
        
        # Phase 3: Generate context based on decision
        if self._use_memory:
            self._memory_context = HybridAdaptiveContext.generate_context(self._context_decision)
        else:
            self._memory_context = ""
        
        prev_error = ""
        current_context_level = self._context_decision.level
        
        for attempt in range(1, self._max_turns + 1):
            # Progressive context escalation on retry (Option 4 feature)
            if attempt > 1 and prev_error:
                progressive_levels = HybridAdaptiveContext.get_progressive_levels(
                    instruction, prev_error
                )
                if len(progressive_levels) > 1:
                    # Escalate context level
                    current_idx = ['none', 'minimal', 'full'].index(current_context_level)
                    next_levels = [l for l in progressive_levels if ['none', 'minimal', 'full'].index(l) > current_idx]
                    if next_levels:
                        current_context_level = next_levels[0]
                        # Regenerate context with escalated level
                        escalated_decision = ContextDecision(
                            level=current_context_level,
                            sections=self._context_decision.sections if current_context_level != 'full' 
                                     else HybridAdaptiveContext.select_relevant_sections(instruction, self._task_category),
                            reason=f"Escalated from {self._context_decision.level} after failure",
                            estimated_overhead_ms=0,
                            task_type=self._task_category,
                            time_pressure=self._context_decision.time_pressure,
                            historical_benefit=self._context_decision.historical_benefit,
                        )
                        self._memory_context = HybridAdaptiveContext.generate_context(escalated_decision)
            
            prompt = self._build_prompt(instruction, attempt, prev_error, env_info)
            
            # Write prompt to temp file
            prompt_file = f"/tmp/uam_prompt_{attempt}.txt"
            await environment.exec(f"cat > {prompt_file} << 'PROMPT_EOF'\n{prompt}\nPROMPT_EOF")
            
            # Execute with droid
            api_key = os.environ.get("FACTORY_API_KEY", os.environ.get("DROID_API_KEY", ""))
            cmd = f'FACTORY_API_KEY="{api_key}" droid exec --model "{self._model}" --auto high -f "{prompt_file}"'
            
            result = await environment.exec(cmd, timeout=int(self._timeout_sec))
            
            context.add_turn(
                prompt=prompt,
                response=result.stdout,
                metadata={
                    "attempt": attempt,
                    "category": self._task_category,
                    "context_level": current_context_level,
                    "memory_used": self._use_memory and current_context_level != 'none',
                    "exit_code": result.exit_code,
                }
            )
            
            if result.exit_code == 0 and not self._looks_like_error(result.stdout):
                # Record success for historical tracking
                elapsed = time.time() - start_time
                self._record_outcome(True, elapsed * 1000, current_context_level != 'none')
                return
            
            prev_error = self._extract_error(result.stdout + result.stderr)
        
        # All attempts failed
        elapsed = time.time() - start_time
        self._record_outcome(False, elapsed * 1000, current_context_level != 'none')
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
        error_lines = [l for l in lines if any(p in l for p in ["error", "Error", "ERROR", "failed", "Failed"])]
        
        if error_lines:
            return "\n".join(error_lines[-3:])
        return "\n".join(lines[-5:])
    
    def _record_outcome(self, success: bool, duration_ms: float, used_uam: bool) -> None:
        """Record outcome for historical tracking (placeholder for SQLite storage)."""
        # In production, this would update SQLite historical data
        pass


class UAMAgentWithoutMemory(UAMAgent):
    """UAM Agent without memory for A/B testing."""
    
    def __init__(self, model: str = "claude-opus-4-5-20251101", **kwargs):
        super().__init__(model=model, use_memory=False, **kwargs)
    
    @staticmethod
    def name() -> str:
        return "uam-agent-no-memory"


class UAMAgentHybridAdaptive(UAMAgent):
    """Explicit Hybrid Adaptive variant."""
    
    @staticmethod
    def name() -> str:
        return "uam-hybrid-adaptive"


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
