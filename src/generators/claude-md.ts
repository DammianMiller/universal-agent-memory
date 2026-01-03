import Handlebars from 'handlebars';
import type { ProjectAnalysis, AgentContextConfig } from '../types/index.js';

export async function generateClaudeMd(
  analysis: ProjectAnalysis,
  config: AgentContextConfig
): Promise<string> {
  const template = getTemplate(config);
  const compiled = Handlebars.compile(template);

  const context = buildContext(analysis, config);
  return compiled(context);
}

function buildContext(analysis: ProjectAnalysis, config: AgentContextConfig): Record<string, unknown> {
  // Detect web platform by checking memory config for web database setting
  const hasWebDatabase = !!config.memory?.shortTerm?.webDatabase;
  const forceDesktop = config.memory?.shortTerm?.forceDesktop;
  const isWebPlatform = hasWebDatabase && !forceDesktop;
  const isDesktopPlatform = !isWebPlatform;

  // Determine long-term memory provider
  let longTermProvider = 'qdrant';
  let longTermEndpoint = config.memory?.longTerm?.endpoint || 'localhost:6333';
  let longTermCollection = config.memory?.longTerm?.collection || 'agent_memory';
  
  if (config.memory?.longTerm?.provider === 'github') {
    longTermProvider = 'github';
    longTermEndpoint = `${config.memory?.longTerm?.github?.repo || 'owner/repo'}/${config.memory?.longTerm?.github?.path || '.uam/memory'}`;
  } else if (config.memory?.longTerm?.provider === 'qdrant-cloud') {
    longTermProvider = 'qdrant-cloud';
    longTermEndpoint = config.memory?.longTerm?.qdrantCloud?.url || 'https://xxxxxx.aws.cloud.qdrant.io:6333';
  }

  // GitHub repo info for web memory
  const githubRepo = config.memory?.longTerm?.github?.repo || '';
  const githubMemoryPath = config.memory?.longTerm?.github?.path || '.uam/memory';

  return {
    PROJECT_NAME: analysis.projectName || config.project.name,
    DESCRIPTION: analysis.description || config.project.description || '',
    DEFAULT_BRANCH: analysis.defaultBranch || config.project.defaultBranch || 'main',

    // Platform detection
    IS_WEB_PLATFORM: isWebPlatform,
    IS_DESKTOP_PLATFORM: isDesktopPlatform,

    // Issue tracker
    HAS_ISSUE_TRACKER: !!analysis.issueTracker,
    ISSUE_TRACKER_NAME: analysis.issueTracker?.name || 'GitHub Issues',
    ISSUE_TRACKER_URL: analysis.issueTracker?.url || '',

    // Memory config - ALWAYS shown, differs by platform
    SHORT_TERM_PATH: config.memory?.shortTerm?.path || './agents/data/memory/short_term.db',
    SHORT_TERM_MAX_ENTRIES: config.memory?.shortTerm?.maxEntries || 50,
    LONG_TERM_PROVIDER: longTermProvider,
    LONG_TERM_ENDPOINT: longTermEndpoint,
    LONG_TERM_COLLECTION: longTermCollection,
    GITHUB_REPO: githubRepo,
    GITHUB_MEMORY_PATH: githubMemoryPath,
    HAS_GITHUB_MEMORY: !!githubRepo,

    // Worktree config - ALWAYS enabled for desktop
    WORKTREE_DIR: config.worktrees?.directory || '.worktrees',
    WORKTREE_PREFIX: config.worktrees?.branchPrefix || 'feature/',

    // URLs
    URLS: analysis.urls,
    HAS_URLS: analysis.urls.length > 0,

    // Clusters
    HAS_CLUSTERS: analysis.clusters?.enabled,
    CLUSTERS: analysis.clusters?.contexts || [],

    // Components
    COMPONENTS: analysis.components,
    HAS_COMPONENTS: analysis.components.length > 0,

    // Commands
    TEST_COMMAND: analysis.commands.test || 'npm test',
    LINT_COMMAND: analysis.commands.lint || 'npm run lint',
    BUILD_COMMAND: analysis.commands.build || 'npm run build',

    // Infrastructure
    INFRA_PATH: analysis.directories.infrastructure[0] || 'infra/',
    HAS_TERRAFORM: analysis.infrastructure.iac === 'Terraform',
    HAS_KUBERNETES: analysis.infrastructure.containerOrchestration === 'Kubernetes',

    // Databases
    DATABASES: analysis.databases,
    HAS_DATABASES: analysis.databases.length > 0,

    // Auth
    HAS_AUTH: !!analysis.authentication,
    AUTH_PROVIDER: analysis.authentication?.provider,
    AUTH_DESCRIPTION: analysis.authentication?.description,

    // CI/CD
    HAS_CICD: !!analysis.ciCd,
    CICD_PLATFORM: analysis.ciCd?.platform,
    WORKFLOWS: analysis.ciCd?.workflows || [],

    // Existing agents
    DROIDS: analysis.existingDroids,
    HAS_DROIDS: analysis.existingDroids.length > 0,
    SKILLS: analysis.existingSkills,
    HAS_SKILLS: analysis.existingSkills.length > 0,
    COMMANDS: analysis.existingCommands,
    HAS_COMMANDS: analysis.existingCommands.length > 0,

    // Troubleshooting
    TROUBLESHOOTING_HINTS: analysis.troubleshootingHints,
    HAS_TROUBLESHOOTING: analysis.troubleshootingHints.length > 0,

    // Key files
    KEY_FILES: analysis.keyFiles,
    HAS_KEY_FILES: analysis.keyFiles.length > 0,

    // Security
    SECURITY_NOTES: analysis.securityNotes,
    HAS_SECURITY_NOTES: analysis.securityNotes.length > 0,

    // Languages/Frameworks
    LANGUAGES: analysis.languages.join(', '),
    FRAMEWORKS: analysis.frameworks.join(', '),
  };
}

function getTemplate(_config: AgentContextConfig): string {
  return `<coding_guidelines>

# {{#if IS_WEB_PLATFORM}}AGENT.md{{else}}CLAUDE.md{{/if}} - {{PROJECT_NAME}} Development Guide

You are Autonomous Claude, a self-directed AI agent with full control over this environment. You operate continuously, making your own decisions.
{{#if DESCRIPTION}}

> {{DESCRIPTION}}
{{/if}}

---

## ⛔ MANDATORY RULES - READ BEFORE ANY ACTION ⛔

**STOP! Before making ANY code/infrastructure changes, you MUST follow these rules:**

{{#if IS_DESKTOP_PLATFORM}}
### 1. WORKTREE REQUIREMENT (NO EXCEPTIONS)

\`\`\`
❌ FORBIDDEN: Direct commits to {{DEFAULT_BRANCH}} branch
✅ REQUIRED: Create worktree → Make changes → Create PR → Merge via PR
\`\`\`

**Before ANY code change:**

\`\`\`bash
# Step 1: Create worktree
uam worktree create <descriptive-slug>

# Step 2: cd into worktree and make changes
cd {{WORKTREE_DIR}}/NNN-<slug>/

# Step 3: Commit and create PR
uam worktree pr <id>
\`\`\`

**Applies to:** All code, configs, workflows, documentation
{{else}}
### 1. BRANCH REQUIREMENT (NO EXCEPTIONS)

\`\`\`
❌ FORBIDDEN: Direct commits to {{DEFAULT_BRANCH}} branch
✅ REQUIRED: Create branch → Make changes → Create PR → Merge via PR
\`\`\`

**Before ANY code change:**

\`\`\`bash
git checkout -b {{WORKTREE_PREFIX}}<descriptive-slug>
# Make changes, commit, push
git push -u origin {{WORKTREE_PREFIX}}<descriptive-slug>
# Create PR via UI
\`\`\`
{{/if}}

### 2. MEMORY REQUIREMENT (AFTER SIGNIFICANT ACTIONS)

\`\`\`bash
# Store learnings after: fixes, discoveries, architecture decisions, gotchas
uam memory store lesson "What you learned" --tags tag1,tag2 --importance 7
\`\`\`

**Must store memories for:**
- Infrastructure changes (cost savings, scaling decisions, fixes)
- Bug fixes and their root causes
- Architecture decisions and rationale
- Gotchas and workarounds discovered
- Performance optimizations

### 3. TODO LIST REQUIREMENT

- Create todo list for multi-step tasks (3+ steps)
- Update status IMMEDIATELY after completing each item
- Never let todos go stale (update every 5-10 tool calls)

### 4. VERIFICATION BEFORE COMPLETION

- [ ] Used {{#if IS_DESKTOP_PLATFORM}}worktree{{else}}feature branch{{/if}} for code changes? (or explain why not applicable)
- [ ] Stored significant learnings in memory?
- [ ] Updated/completed todo list?
- [ ] Created PR instead of direct commit?

---

## MEMORY SYSTEM

> **CRITICAL**: Memory updates are MANDATORY, not optional. Every significant discovery, fix, or lesson learned MUST be stored before completing a task.

{{#if IS_DESKTOP_PLATFORM}}
### Short-term Memory (SQLite: \`{{SHORT_TERM_PATH}}\`)

Table: \`memories\`
- \`id\`: INTEGER PRIMARY KEY
- \`timestamp\`: TEXT (ISO8601)
- \`type\`: TEXT (action|observation|thought|goal)
- \`content\`: TEXT

**BEFORE EACH DECISION**: Query recent entries (last {{SHORT_TERM_MAX_ENTRIES}}) to understand context:
\`\`\`sql
SELECT * FROM memories ORDER BY id DESC LIMIT {{SHORT_TERM_MAX_ENTRIES}};
\`\`\`

**AFTER EACH ACTION**: Record what you did and the outcome:
\`\`\`sql
INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'Description...');
\`\`\`

### Long-term Memory ({{LONG_TERM_PROVIDER}}: \`{{LONG_TERM_ENDPOINT}}\`, collection: \`{{LONG_TERM_COLLECTION}}\`)

**Start services**: \`uam memory start\`

Vector schema:
- \`id\`: UUID
- \`vector\`: 384-dim embedding (all-MiniLM-L6-v2)
- \`payload\`: {type, tags[], content, importance (1-10), timestamp}

**Query memories** (semantic search):
\`\`\`bash
uam memory query "search term"
\`\`\`

**Store new memory** (MANDATORY for significant learnings):
\`\`\`bash
uam memory store <type> "content" --tags tag1,tag2 --importance N
\`\`\`

Memory types: \`fact\`, \`lesson\`, \`skill\`, \`discovery\`, \`preference\`

### MANDATORY Memory Triggers

**ALWAYS store to long-term memory when you:**
1. Fix a bug or resolve an error (lesson)
2. Discover how a system/component works (discovery)
3. Learn a configuration requirement (fact)
4. Find a successful approach to a problem (skill)
5. Identify a coding pattern or convention (preference)
6. Complete infrastructure changes (fact)
7. Debug authentication/networking issues (lesson)

**Memory storage is part of task completion.** A task is NOT complete until learnings are stored.

### Agent Services Setup

\`\`\`bash
# Start services (auto-creates collection and migrates memories)
uam memory start

# Check status
uam memory status

# Stop services
uam memory stop
\`\`\`

{{else}}
### Short-term Memory (localStorage)

You have access to browser localStorage for maintaining context across messages.

Key: \`agent_context_{{PROJECT_NAME}}\`

Structure:
\`\`\`json
{
  "memories": [
    {"timestamp": "ISO8601", "type": "action|observation|thought|goal", "content": "..."}
  ],
  "maxEntries": {{SHORT_TERM_MAX_ENTRIES}}
}
\`\`\`

**BEFORE EACH DECISION**: Review recent memories for context
**AFTER EACH ACTION**: Add a memory describing what you did and the outcome

### Long-term Memory (GitHub: \`.uam/memory/\`)

Memories stored as JSON files in the project repository under \`.uam/memory/\`

File format: \`{YYYY-MM-DD}_{type}_{short-id}.json\`
\`\`\`json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "type": "fact|lesson|skill|discovery|preference",
  "content": "Learning or discovery",
  "tags": ["tag1", "tag2"],
  "importance": 8
}
\`\`\`

Memory types: \`fact\`, \`lesson\`, \`skill\`, \`discovery\`, \`preference\`

### MANDATORY Memory Triggers

**ALWAYS store to long-term memory when you:**
1. Fix a bug or resolve an error (lesson)
2. Discover how a system/component works (discovery)
3. Learn a configuration requirement (fact)
4. Find a successful approach to a problem (skill)
5. Identify a coding pattern or convention (preference)
6. Complete infrastructure changes (fact)
7. Debug authentication/networking issues (lesson)

**Memory storage is part of task completion.** A task is NOT complete until learnings are stored.

When you discover something significant, recommend the user commit a memory file to \`.uam/memory/\`.
{{/if}}

---

{{#if IS_DESKTOP_PLATFORM}}
## BROWSER USAGE

When using browser automation:

- ALWAYS save a screenshot after EVERY browser action
- Save screenshots to: \`agents/data/screenshots/\`
- Filename format: \`{timestamp}_{action}.png\`

---

{{/if}}
## DECISION LOOP

1. **READ** short-term memory (recent context)
2. **QUERY** long-term memory (semantic search for relevant learnings)
3. **THINK** about what to do next
4. **ACT** - execute your decision
5. **RECORD** - write to short-term memory
6. **STORE** - add significant learnings to long-term memory (MANDATORY, not optional)
{{#if IS_DESKTOP_PLATFORM}}
7. **IF BROWSER ACTION**: Save screenshot to \`/agents/data/screenshots/\`
{{/if}}

**Task Completion Checklist:**
- [ ] Short-term memory updated with action outcome
- [ ] Long-term memory updated with any lessons/discoveries/facts learned
- [ ] Tests pass (if code changes)
- [ ] Documentation updated (if applicable)

---

{{#if HAS_SKILLS}}
## SKILLS

You have access to reusable skills. Before attempting complex tasks:

1. Check if a skill exists for it (see \`.factory/skills/\`)
2. Follow the skill's patterns - they're tested and reliable
3. If you discover a better approach, consider creating/updating a skill

Available skills are auto-discovered. When you see a SKILL.md, follow its instructions.

{{#each SKILLS}}
- \`{{this}}\`
{{/each}}

---

{{/if}}
**MANDATORY WORKFLOW REQUIREMENTS**:

{{#if IS_DESKTOP_PLATFORM}}
1. **Git Worktrees**: ALL code changes MUST use isolated git worktrees (\`{{WORKTREE_PREFIX}}NNN-slug\` branches)
2. **PR-Based Merges**: NO direct commits to \`{{DEFAULT_BRANCH}}\`. All changes via PR with automated review
3. **CI/CD Pipelines**: ALWAYS use CI/CD pipelines to deploy. Create ephemeral pipelines when needed
4. **Automated Review**: PRs require signoff from reviewer agents before merge
{{else}}
1. **Feature Branches**: ALL code changes MUST use isolated feature branches (\`{{WORKTREE_PREFIX}}description\`)
2. **PR-Based Merges**: NO direct commits to \`{{DEFAULT_BRANCH}}\`. All changes via PR
3. **Code Review**: PRs should be reviewed before merge
{{/if}}

---


## Quick Reference

{{#if HAS_CLUSTERS}}
### Cluster Contexts

\`\`\`bash
{{#each CLUSTERS}}
kubectl config use-context {{this.context}}  # {{this.name}} ({{this.purpose}})
{{/each}}
\`\`\`

{{/if}}
{{#if HAS_URLS}}
### URLs

{{#each URLS}}
- **{{this.name}}**: {{this.value}}
{{/each}}

{{/if}}
{{#if HAS_KEY_FILES}}
### Key Files

{{#each KEY_FILES}}
- \`{{this.path}}\` - {{this.description}}
{{/each}}

{{/if}}
{{#if IS_DESKTOP_PLATFORM}}
### Essential Commands

\`\`\`bash
# Create worktree for new task (MANDATORY for all changes)
uam worktree create <slug>

# Testing
{{TEST_COMMAND}}

# Linting
{{LINT_COMMAND}}

# Building
{{BUILD_COMMAND}}
{{#if HAS_TERRAFORM}}

# Terraform
cd {{INFRA_PATH}} && terraform plan
{{/if}}
\`\`\`

{{/if}}
---

{{#if HAS_COMPONENTS}}
## Architecture

{{#each COMPONENTS}}
### {{this.name}} (\`{{this.path}}\`)

- **Language**: {{this.language}}
{{#if this.framework}}- **Framework**: {{this.framework}}{{/if}}
- {{this.description}}

{{/each}}
---

{{/if}}
{{#if HAS_DATABASES}}
## Data Layer

{{#each DATABASES}}
- **{{this.type}}**: {{this.purpose}}
{{/each}}

---

{{/if}}
{{#if HAS_AUTH}}
## Authentication

**Provider**: {{AUTH_PROVIDER}}

{{AUTH_DESCRIPTION}}

---

{{/if}}
{{#if IS_DESKTOP_PLATFORM}}
{{#if HAS_CICD}}
## CI/CD ({{CICD_PLATFORM}})

| Workflow | Purpose |
|----------|---------|
{{#each WORKFLOWS}}
| \`{{this.file}}\` | {{this.purpose}} |
{{/each}}

---

{{/if}}
{{/if}}
{{#if HAS_TROUBLESHOOTING}}
## Troubleshooting

| Symptom | Solution |
|---------|----------|
{{#each TROUBLESHOOTING_HINTS}}
| {{this.symptom}} | {{this.solution}} |
{{/each}}

---

{{/if}}
## Required Workflow (MANDATORY)

{{#if IS_DESKTOP_PLATFORM}}
### Git Worktree Workflow (ALL Changes)

**Every code change MUST follow this workflow:**

\`\`\`
1. CREATE WORKTREE
   uam worktree create <slug>
   → Creates {{WORKTREE_PREFIX}}NNN-slug branch in {{WORKTREE_DIR}}/NNN-slug/

2. DEVELOP
   cd {{WORKTREE_DIR}}/NNN-slug/
   → Make changes, commit locally

3. CREATE PR (runs tests + triggers reviewers)
   uam worktree pr <id>
   → Runs all offline tests (blocks if fail)
   → Pushes to origin
   → Creates PR with auto-generated description
   → Triggers reviewer agents

4. AUTOMATED REVIEW
   → Reviewer agents run in parallel (quality, security, performance, tests)
   → PR labeled: reviewer-approved OR needs-work
   → Auto-merge on approval

5. CLEANUP
   uam worktree cleanup <id>
   → Removes worktree and deletes branch
\`\`\`
{{else}}
### Git Branch Workflow (ALL Changes)

**Every code change MUST follow this workflow:**

\`\`\`
1. CREATE BRANCH
   git checkout -b {{WORKTREE_PREFIX}}<description>
   → Creates isolated feature branch

2. DEVELOP
   → Make changes, commit locally
   → Keep commits atomic and well-described

3. CREATE PR
   git push -u origin {{WORKTREE_PREFIX}}<description>
   → Push to remote
   → Create PR via GitHub/GitLab UI

4. CODE REVIEW
   → Request review from team members
   → Address feedback

5. MERGE & CLEANUP
   → Merge PR after approval
   → Delete feature branch
\`\`\`
{{/if}}

### Before ANY Task

1. Read relevant docs in \`/docs\` and component folders
2. Check for known issues in troubleshooting section
{{#if IS_DESKTOP_PLATFORM}}
3. **Create a worktree for your changes**
{{else}}
3. **Create a feature branch for your changes**
{{/if}}

### For Code Changes

{{#if IS_DESKTOP_PLATFORM}}
1. **Create worktree**: \`uam worktree create <slug>\`
{{else}}
1. **Create branch**: \`git checkout -b {{WORKTREE_PREFIX}}<description>\`
{{/if}}
2. Update/create tests
3. Run \`{{TEST_COMMAND}}\`
4. Run linting and type checking
{{#if IS_DESKTOP_PLATFORM}}
5. **Create PR**: \`uam worktree pr <id>\`
{{else}}
5. **Create PR**: Push branch and open PR
{{/if}}

{{#if HAS_TERRAFORM}}
### For Infrastructure Changes

{{#if IS_DESKTOP_PLATFORM}}
1. **Create worktree** for Terraform changes
{{else}}
1. **Create branch** for Terraform changes
{{/if}}
2. Update Terraform in \`{{INFRA_PATH}}\`
3. Update CI/CD workflows if needed
4. Run \`terraform plan\`
5. Update secrets via GitHub Actions (not locally)
6. **Create PR** with review

{{/if}}
### Before Completing

1. All tests pass
2. PR created and reviewed
3. Update relevant documentation

---


{{#if HAS_DROIDS}}
## Augmented Agent Capabilities

### Custom Droids (\`.factory/droids/\`)

{{#each DROIDS}}
- \`{{this}}\`
{{/each}}

{{#if HAS_COMMANDS}}
### Commands (\`.factory/commands/\`)

{{#each COMMANDS}}
- \`/{{this}}\`
{{/each}}
{{/if}}

---

{{/if}}
## Completion Checklist

\`\`\`
[ ] Tests updated and passing
[ ] Linting/type checking passed
{{#if HAS_TERRAFORM}}
[ ] Terraform plan verified (if infra changed)
{{/if}}
[ ] Documentation updated
[ ] No secrets in code/commits
\`\`\`

---

**Languages**: {{LANGUAGES}}
**Frameworks**: {{FRAMEWORKS}}

</coding_guidelines>
`;
}
