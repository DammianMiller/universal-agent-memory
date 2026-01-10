<!--
  CLAUDE.md Universal Template - Optimized v3.0
  
  Single-source-of-truth workflow engine with zero duplication.
  All variables populated by UAM generator from project analysis.
  
  Template Variables: {{PROJECT_NAME}}, {{PROJECT_PATH}}, {{DEFAULT_BRANCH}},
  {{MEMORY_DB_PATH}}, {{MEMORY_QUERY_CMD}}, {{MEMORY_STORE_CMD}}, {{MEMORY_START_CMD}},
  {{LONG_TERM_BACKEND}}, {{LONG_TERM_ENDPOINT}}, {{LONG_TERM_COLLECTION}}, {{SHORT_TERM_LIMIT}},
  {{WORKTREE_CREATE_CMD}}, {{WORKTREE_PR_CMD}}, {{WORKTREE_CLEANUP_CMD}}, {{WORKTREE_DIR}},
  {{BRANCH_PREFIX}}, {{SKILLS_PATH}}, {{DROIDS_PATH}}, {{COMMANDS_PATH}}, {{DOCS_PATH}},
  {{SCREENSHOTS_PATH}}, {{TEST_COMMAND}}, {{STRUCTURE_DATE}}
-->

<coding_guidelines>

# {{PROJECT_NAME}} - Autonomous Agent Guide

You are an autonomous AI agent. Follow the WORKFLOW ENGINE below for EVERY action. No exceptions.

---

## WORKFLOW ENGINE (Execute Every Time)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MANDATORY WORKFLOW ENGINE                             │
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │  START  │───►│  TASK   │───►│ CONTEXT │───►│  WORK   │───►│ COMPLETE│   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CHECK TASKS  │ CREATE/CLAIM │ MEMORY+SKILL │ WORKTREE+DO │ VERIFY   │   │
│  │ READ MEMORY  │ TASK         │ CHECK        │ TEST+PR     │ RELEASE  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  GATES: Each phase MUST complete before advancing. No skipping.             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: START (Execute on every session/request)

```bash
uam task ready                    # What's already in progress?
sqlite3 {{MEMORY_DB_PATH}} "SELECT * FROM memories ORDER BY id DESC LIMIT 10;"
```

**Gate**: Do NOT proceed until both commands executed.

### Phase 2: TASK (Create or claim before ANY work)

```bash
# If new work requested:
uam task create --title "Description" --type task|bug|feature --priority 0-4

# Then claim it:
uam task claim <id>               # Announces work, detects overlaps
```

**Gate**: Task ID must exist and be claimed before proceeding.

### Phase 3: CONTEXT (Load relevant knowledge)

```bash
# Query semantic memory for related learnings
{{MEMORY_QUERY_CMD}} "<keywords>"

# Check for applicable skills
ls {{SKILLS_PATH}}/               # Then invoke: Skill(skill: "name")
```

**Gate**: Memory queried and skill identified (if applicable).

### Phase 4: WORK (All changes in worktree)

```bash
# Create isolated worktree
{{WORKTREE_CREATE_CMD}} <slug>
cd {{WORKTREE_DIR}}/NNN-<slug>/

# Verify location before ANY edit
pwd | grep -q "{{WORKTREE_DIR}}" || echo "STOP! Wrong directory!"

# Make changes, test, commit
git add -A && git commit -m "type: description"
{{TEST_COMMAND}}
{{WORKTREE_PR_CMD}} <id>
```

**Gate**: Changes committed via PR from worktree. Never direct to {{DEFAULT_BRANCH}}.

### Phase 5: COMPLETE (Verify and release)

```bash
# Update memories
sqlite3 {{MEMORY_DB_PATH}} "INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'What was done');"
{{MEMORY_STORE_CMD}} lesson "Key learning" --tags relevant,tags --importance 7

# Release task
uam task release <id> --reason "Completed: summary"
```

**Gate**: All items verified before responding:

```
[ ] Task released?     [ ] PR created (not direct push)?
[ ] Memory updated?    [ ] Tests passing?
[ ] Worktree used?     [ ] Skills consulted?
```

---

## QUICK REFERENCE

### Task Commands
```bash
uam task create --title "..." --type task|bug|feature|chore|epic|story --priority 0-4
uam task list [--filter-status open|in_progress] [--filter-priority 0,1]
uam task ready                    # Show unblocked tasks
uam task blocked                  # Show blocked tasks
uam task claim <id>               # Claim and start work
uam task show <id>                # View details
uam task release <id> --reason "..." # Complete task
uam task dep --from <blocked> --to <blocker>  # Add dependency
```

### Worktree Commands
```bash
{{WORKTREE_CREATE_CMD}} <slug>    # Create feature branch
cd {{WORKTREE_DIR}}/NNN-<slug>/   # Enter worktree
{{WORKTREE_PR_CMD}} <id>          # Create PR
{{WORKTREE_CLEANUP_CMD}} <id>     # Remove worktree
```

### Memory Commands
```bash
# Short-term (after every action)
sqlite3 {{MEMORY_DB_PATH}} "INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'description');"

# Long-term (for learnings, importance 7+)
{{MEMORY_QUERY_CMD}} "<search>"
{{MEMORY_STORE_CMD}} lesson "learning" --tags a,b --importance 8
```

### Agent Coordination (Multi-agent only)
```bash
uam agent register --name "name" --capabilities "coding,review"
uam agent announce --id <id> --resource "path/" --intent editing
uam agent overlaps --resource "path/"
uam agent complete --id <id> --resource "path/"
uam deploy queue --agent-id <id> --action-type commit --message "..." --files "..."
uam deploy flush
```

### Skills & Droids
```bash
Skill(skill: "typescript-node-expert")  # Inline guidance
Skill(skill: "cli-design-expert")       # CLI work
Skill(skill: "senior-frontend")         # React/TS work
Task(subagent_type: "code-quality-guardian", prompt: "Review...")
Task(subagent_type: "security-auditor", prompt: "Audit...")
```

---

## AUTOMATIC TRIGGERS

| Pattern Detected | Immediate Action |
|-----------------|------------------|
| Work request (fix/add/change/create/build) | `uam task create --title "..." --type task` |
| Bug report or error | `uam task create --title "..." --type bug --priority 1` |
| Feature request | `uam task create --title "..." --type feature` |
| Code file editing | Check skills → Create worktree → Edit |
| Review/check request | Query memory first |
{{#if SKILL_TRIGGERS}}
{{{SKILL_TRIGGERS}}}
{{/if}}

---

## RECOVERY PROCEDURES

### Forgot to create task?
```bash
# Create task now, link existing work
uam task create --title "Retroactive: what you did" --type task
uam task update <id> --status in_progress
# Continue with workflow, release when done
```

### Forgot worktree? Edited main repo directly?
```bash
# If not committed yet: stash and move to worktree
git stash
{{WORKTREE_CREATE_CMD}} <slug>
cd {{WORKTREE_DIR}}/NNN-<slug>/
git stash pop

# If already committed: cherry-pick to worktree, reset main
git log -1 --format="%H"  # Note commit hash
git reset --hard HEAD~1   # Remove from main
{{WORKTREE_CREATE_CMD}} <slug>
cd {{WORKTREE_DIR}}/NNN-<slug>/
git cherry-pick <hash>
```

### Command failed?
```bash
# Check service status
{{MEMORY_START_CMD}}
uam coord status

# Verify database exists
ls -la {{MEMORY_DB_PATH}}
```

---

## RULES (Zero Tolerance)

### 1. Tasks
- **ALWAYS** create task before work
- **ALWAYS** claim before starting
- **ALWAYS** release when complete
- **NEVER** work without task tracking

### 2. Worktrees
- **ALWAYS** create worktree for code changes
- **ALWAYS** verify `pwd` contains `{{WORKTREE_DIR}}`
- **ALWAYS** use PR, never direct push
- **NEVER** commit directly to {{DEFAULT_BRANCH}}

### 3. Memory
- **ALWAYS** query memory at task start
- **ALWAYS** update short-term after actions
- **ALWAYS** store learnings (importance 7+) in long-term
- **NEVER** complete task without memory update

### 4. Skills
- **ALWAYS** check for applicable skills before implementing
- **ALWAYS** invoke proactively for: TypeScript, CLI, Frontend, Security, Performance
- **NEVER** implement without consulting relevant skill/droid

---

## MEMORY SYSTEM

### Layer Selection
| Question | If YES → Layer |
|----------|---------------|
| Did this just happen (last few minutes)? | L1: Working Memory |
| Session-specific decision/context? | L2: Session Memory |
| Reusable learning for future sessions? | L3: Semantic Memory (importance 7+) |
| Relationship between entities? | L4: Knowledge Graph |

### What to Store (Importance 7+)
- Bug fixes with root cause + solution
- Architecture decisions with rationale
- Performance optimizations that worked
- Gotchas and workarounds
- API behaviors that aren't obvious

### Services
```bash
{{MEMORY_START_CMD}}              # Start Qdrant
{{MEMORY_STATUS_CMD}}             # Check status
{{MEMORY_STOP_CMD}}               # Stop services
uam memory migrate                # Upgrade schema
```

---

## PROACTIVE DROIDS (Invoke before commit/PR)

| Droid | Trigger | Purpose |
|-------|---------|---------|
| `code-quality-guardian` | All code changes | Complexity, naming, SOLID |
| `security-auditor` | All code changes | OWASP, secrets, injection |
| `performance-optimizer` | Performance-critical | Algorithms, memory, caching |
| `documentation-expert` | New features/APIs | JSDoc, README, accuracy |

---

## BROWSER AUTOMATION

After EVERY browser action:
1. Screenshot → `{{SCREENSHOTS_PATH}}/{timestamp}_{action}.png`
2. Meta file → `{{SCREENSHOTS_PATH}}/{timestamp}_{action}.meta`

---

{{#if REPOSITORY_STRUCTURE}}
## Repository Structure ({{STRUCTURE_DATE}})

```
{{PROJECT_NAME}}/
{{{REPOSITORY_STRUCTURE}}}
```
{{/if}}

{{#if ARCHITECTURE_OVERVIEW}}
## Architecture

{{{ARCHITECTURE_OVERVIEW}}}
{{/if}}

{{#if DATABASE_ARCHITECTURE}}
### Database

{{{DATABASE_ARCHITECTURE}}}
{{/if}}

{{#if CORE_COMPONENTS}}
## Core Components

{{{CORE_COMPONENTS}}}
{{/if}}

{{#if CLUSTER_CONTEXTS}}
## Cluster Contexts

```bash
{{{CLUSTER_CONTEXTS}}}
```
{{/if}}

{{#if PROJECT_URLS}}
## URLs

{{{PROJECT_URLS}}}
{{/if}}

{{#if KEY_WORKFLOWS}}
## CI/CD Workflows

```
{{{KEY_WORKFLOWS}}}
```
{{/if}}

{{#if ESSENTIAL_COMMANDS}}
## Project Commands

```bash
{{{ESSENTIAL_COMMANDS}}}
```
{{/if}}

{{#if INFRA_WORKFLOW}}
## Infrastructure Workflow

{{{INFRA_WORKFLOW}}}
{{/if}}

{{#if TROUBLESHOOTING}}
## Troubleshooting

{{{TROUBLESHOOTING}}}
{{/if}}

{{#if KEY_CONFIG_FILES}}
## Config Files

| File | Purpose |
|------|---------|
{{{KEY_CONFIG_FILES}}}
{{/if}}

{{#if DISCOVERED_SKILLS}}
## Project Skills

{{{DISCOVERED_SKILLS}}}
{{/if}}

{{#if LANGUAGE_DROIDS}}
## Language Specialists

{{{LANGUAGE_DROIDS}}}
{{/if}}

{{#if PREPOPULATED_KNOWLEDGE}}
## Project Knowledge

### Recent Activity
{{{RECENT_ACTIVITY}}}

### Learned Lessons
{{{LEARNED_LESSONS}}}

### Known Gotchas
{{{KNOWN_GOTCHAS}}}

### Hot Spots
{{{HOT_SPOTS}}}
{{/if}}

---

## Completion Checklist

```
[ ] Task created and released
[ ] Worktree used (not main repo)
[ ] PR created (not direct push)
[ ] Tests passing
[ ] Memory updated (short + long term)
[ ] Skills consulted
[ ] No secrets in code
```

</coding_guidelines>
