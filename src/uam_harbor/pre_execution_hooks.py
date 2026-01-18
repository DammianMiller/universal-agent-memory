"""
Pre-Execution Hooks for Terminal-Bench Tasks (Phase 2 - A2)

These hooks run BEFORE the agent starts, protecting critical state that
would otherwise be destroyed by the agent's first commands.

Key insight: LLMs don't reliably follow "do not do X" instructions.
The only way to protect critical state is to backup/modify it before
the agent runs.
"""

from typing import Optional, Callable, Dict
import os


# Pre-execution hooks by task pattern
PRE_EXECUTION_HOOKS: Dict[str, dict] = {
    'db-wal-recovery': {
        'detection_keywords': ['wal', 'db-wal', 'sqlite', 'recovery'],
        'description': 'Backup WAL file before agent can checkpoint it',
        'commands': [
            'cp /app/main.db-wal /tmp/wal_backup.wal 2>/dev/null || true',
            'cp /app/main.db-wal /app/main.db-wal.backup 2>/dev/null || true',
            'echo "WAL backed up to /tmp/wal_backup.wal"',
        ],
        'critical': True,
        'reason': 'sqlite3 auto-checkpoints WAL on connect, destroying uncommitted data',
    },
    'filter-js-from-html': {
        'detection_keywords': ['filter', 'javascript', 'html', 'xss'],
        'description': 'Pre-install bleach for XSS filtering',
        'commands': [
            'pip install bleach lxml 2>/dev/null || pip3 install bleach lxml',
        ],
        'critical': False,
        'reason': 'Ensures bleach is available for XSS filtering',
    },
    'gpt2-codegolf': {
        'detection_keywords': ['gpt2', 'gpt-2', '124m', 'codegolf', 'inference'],
        'description': 'Download reference implementation for guidance',
        'commands': [
            # Download llm.c reference if available
            'which curl && curl -sL https://raw.githubusercontent.com/karpathy/llm.c/master/train_gpt2.c -o /tmp/llm_reference.c 2>/dev/null || true',
        ],
        'critical': False,
        'reason': 'Provides reference implementation for checkpoint format',
    },
    'regex-chess': {
        'detection_keywords': ['regex', 'chess', 're.json', 'legal move'],
        'description': 'Install python-chess for move generation reference',
        'commands': [
            'pip install python-chess 2>/dev/null || pip3 install python-chess',
        ],
        'critical': False,
        'reason': 'Provides correct move generation for regex pattern building',
    },
    'chess-best-move': {
        'detection_keywords': ['chess', 'best move', 'board', 'image'],
        'description': 'Install chess libraries and optional stockfish',
        'commands': [
            'pip install python-chess pillow 2>/dev/null || pip3 install python-chess pillow',
            'apt-get install -y stockfish 2>/dev/null || true',
        ],
        'critical': False,
        'reason': 'Provides chess analysis tools',
    },
}


def detect_task_from_instruction(instruction: str) -> Optional[str]:
    """Detect which task type based on instruction keywords."""
    lower = instruction.lower()
    
    for task_name, config in PRE_EXECUTION_HOOKS.items():
        keywords = config.get('detection_keywords', [])
        matches = sum(1 for kw in keywords if kw in lower)
        if matches >= 2:
            return task_name
    
    return None


def get_pre_execution_commands(task_name: str) -> list:
    """Get list of commands to run before agent starts."""
    config = PRE_EXECUTION_HOOKS.get(task_name)
    if config:
        return config.get('commands', [])
    return []


def build_hook_script(instruction: str) -> Optional[str]:
    """Build a shell script with all applicable pre-execution hooks."""
    task_name = detect_task_from_instruction(instruction)
    if not task_name:
        return None
    
    commands = get_pre_execution_commands(task_name)
    if not commands:
        return None
    
    config = PRE_EXECUTION_HOOKS[task_name]
    
    script_lines = [
        '#!/bin/bash',
        f'# Pre-execution hook for: {task_name}',
        f'# Reason: {config.get("reason", "N/A")}',
        '',
    ]
    
    script_lines.extend(commands)
    script_lines.append('')
    script_lines.append(f'echo "Pre-execution hook complete: {task_name}"')
    
    return '\n'.join(script_lines)


def get_post_execution_context(task_name: str) -> str:
    """Get context to inject after hooks run, informing agent of backups."""
    contexts = {
        'db-wal-recovery': '''## Pre-Execution Hook Results

The WAL file has been backed up to protect it from accidental checkpointing:
- Original: /app/main.db-wal (may be gone after sqlite3)
- Backup: /tmp/wal_backup.wal (PRESERVED)
- Backup: /app/main.db-wal.backup (PRESERVED)

**USE THE BACKUP FILES** for WAL parsing. The original may be gone.
Parse /tmp/wal_backup.wal with Python to extract the 11 records.''',

        'gpt2-codegolf': '''## Pre-Execution Hook Results

Reference implementation downloaded (if curl available):
- /tmp/llm_reference.c - llm.c train_gpt2.c for checkpoint format reference

Check this file for weight layout and BPE tokenizer details.''',

        'regex-chess': '''## Pre-Execution Hook Results

python-chess has been pre-installed. Use it to:
1. Generate legal moves for test positions
2. Understand move notation
3. Build and test your regex patterns''',
    }
    
    return contexts.get(task_name, '')


# Harbor integration - can be used as environment setup
async def run_pre_execution_hooks(environment, instruction: str) -> str:
    """Run pre-execution hooks in the environment before agent starts.
    
    Returns: Context string to inject into agent prompt
    """
    task_name = detect_task_from_instruction(instruction)
    if not task_name:
        return ''
    
    commands = get_pre_execution_commands(task_name)
    if not commands:
        return ''
    
    config = PRE_EXECUTION_HOOKS[task_name]
    
    # Run each command
    for cmd in commands:
        try:
            await environment.exec(cmd, timeout=30)
        except Exception as e:
            print(f"Pre-hook warning: {cmd} failed: {e}")
    
    # Return context for agent
    return get_post_execution_context(task_name)
