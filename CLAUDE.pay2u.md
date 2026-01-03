<coding_guidelines>

# AGENT.md - pay2u Development Guide

You are an AI assistant helping with the pay2u project.

> [![Build Status](https://github.com/miller-tech/pay2u/actions/workflows/cd-frontend-multicloud.yml/badge.svg)](https://github.com/miller-tech/pay2u/actions)
[![API Status](https://github.com/miller-te

---

## MEMORY SYSTEM (MANDATORY)

> **CRITICAL**: Memory updates are MANDATORY, not optional. Every significant discovery, fix, or lesson learned MUST be stored before completing a task.

### Short-term Memory (SQLite: `agents/data/memory/short_term.db`)

Table: `memories`
- `id`: INTEGER PRIMARY KEY
- `timestamp`: TEXT (ISO8601)
- `type`: TEXT (action|observation|thought|goal)
- `content`: TEXT

**BEFORE EACH DECISION**: Query recent entries (last 50) to understand context:
```sql
SELECT * FROM memories ORDER BY id DESC LIMIT 50;
```

**AFTER EACH ACTION**: Record what you did and the outcome:
```sql
INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'Description...');
```

### Long-term Memory (Qdrant: `localhost:6333`, collection: `claude_memory`)

**Start services**: `./agents/scripts/start-services.sh`

Vector schema:
- `id`: UUID
- `vector`: 384-dim embedding (all-MiniLM-L6-v2)
- `payload`: {type, tags[], content, importance (1-10), timestamp}

**Query memories** (semantic search):
```bash
agents/.venv/bin/python agents/scripts/query_memory.py long "search term"
```

**Store new memory** (MANDATORY for significant learnings):
```bash
agents/.venv/bin/python agents/scripts/query_memory.py store <type> "content" --tags tag1,tag2 --importance N
```

Memory types: `fact`, `lesson`, `skill`, `discovery`, `preference`

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

```bash
# Start Qdrant (auto-creates collection and migrates memories)
./agents/scripts/start-services.sh

# Check status
./agents/scripts/start-services.sh status

# Stop services
./agents/scripts/start-services.sh stop
```

---

## BROWSER USAGE

When using browser automation:

- ALWAYS save a screenshot after EVERY browser action
- Save screenshots to: `agents/data/screenshots/`
- Filename format: `{timestamp}_{action}.png`

---

---

## DECISION LOOP

1. **READ** short-term memory (recent context)
2. **QUERY** long-term memory (semantic search for relevant learnings)
3. **THINK** about what to do next
4. **ACT** - execute your decision
5. **RECORD** - write to short-term memory
6. **STORE** - add significant learnings to long-term memory (MANDATORY, not optional)
7. **IF BROWSER ACTION**: Save screenshot to `/agents/data/screenshots/`

**Task Completion Checklist:**
- [ ] Short-term memory updated with action outcome
- [ ] Long-term memory updated with any lessons/discoveries/facts learned
- [ ] Tests pass (if code changes)
- [ ] Documentation updated (if applicable)

---

---

## Quick Reference

### Essential Commands

```bash
# Testing
pytest

# Linting
npm run lint

# Building
npm run build

# Terraform
cd infra && terraform plan
```

---

---

## Core Components

### UI - main (`ui/main`)

- **Language**: JavaScript

- Frontend component: main

### UI - marketing (`ui/marketing`)

- **Language**: JavaScript

- Frontend component: marketing

---

---

## Databases

- **SQLite**: Agent memory

---

---

## CI/CD (GitHub Actions)

| Workflow | Purpose |
|----------|---------|
| `_prometheus-openobserve-integration.yml` | Workflow |
| `_reusable-deploy.yml` | Deployment |
| `cd-frontend-multicloud.yml` | Deployment |
| `cd-image-to-list.yml` | Deployment |
| `cd-opencms.yml` | Deployment |
| `cd-pgedge.yml` | Deployment |
| `cd-postgres-spock.yml` | Deployment |
| `cd-products-api.yml` | Deployment |
| `db-postgres-backup.yml` | Workflow |
| `db-postgres-replication.yml` | Workflow |
| `dns-auth-istio-update.yml` | Workflow |
| `dns-cname-create.yml` | Workflow |
| `dns-opencms-update.yml` | Workflow |
| `docs-validation.yml` | Workflow |
| `dr-operations.yml` | Workflow |
| `iac-cert-automation.yml` | Workflow |
| `iac-drift-detection.yml` | Workflow |
| `iac-terraform-cicd.yml` | Deployment |
| `ops-cdn-custom-domain.yml` | Deployment |
| `ops-jwt-token.yml` | Workflow |
| `ops-opencms-module.yml` | Workflow |
| `ops-openobserve-dashboards.yml` | Workflow |
| `ops-rotate-secrets.yml` | Workflow |
| `pr-auto-review-merge.yml` | Workflow |
| `quality-code-review.yml` | Workflow |
| `quality-metrics.yml` | Workflow |
| `security-cookie-monitoring.yml` | Security scanning |
| `security-pentest-automated.yml` | Testing |
| `security-pgdog-compliance.yml` | Security scanning |
| `security-unified.yml` | Security scanning |
| `test-advanced.yml` | Testing |
| `test-chaos-engineering.yml` | Testing |
| `test-e2e-playwright.yml` | Testing |
| `test-integration.yml` | Testing |
| `test-performance-comprehensive.yml` | Testing |
| `test-performance-k6.yml` | Testing |
| `worktree-cleanup.yml` | Workflow |
| `zitadel-performance-optimization.yml` | Workflow |

---

---

## Augmented Agent Capabilities

### Custom Droids (`.factory/droids/`)

- `code-quality-reviewer`
- `cpp-pro`
- `documentation-accuracy-reviewer`
- `git-summarizer`
- `javascript-pro`
- `performance-reviewer`
- `pr-readiness-reviewer`
- `pr-reviewer-agent`
- `project-analyzer`
- `python-pro`
- `release-notes-writer`
- `security-code-reviewer`
- `session-context-preservation-droid`
- `test-coverage-reviewer`
- `test-plan-writer`
- `todo-fixme-scanner`
- `worktree-manager`
- `cpp-pro`
- `javascript-pro`
- `python-pro`
- `terraform-specialist`

### Skills (`.factory/skills/`)

- `code-reviewer`
- `senior-frontend`
- `ui-ux-pro-max`
- `web-artifacts-builder`
- `webapp-testing`

### Commands (`.factory/commands/`)

- `/code-review`
- `/init-claude-md`
- `/pr-ready`
- `/release-notes`
- `/test-plan`
- `/todo-scan`
- `/worktree`

---

## Completion Checklist

```
[ ] Tests updated and passing
[ ] Linting/type checking passed
[ ] Terraform plan verified (if infra changed)
[ ] Documentation updated
[ ] No secrets in code/commits
```

---

**Languages**: JavaScript, Python
**Frameworks**: 

</coding_guidelines>

---

## SKILLS

You have access to reusable skills. Before attempting complex tasks:

1. Check if a skill exists for it (see `.factory/skills/`)
2. Follow the skill's patterns - they're tested and reliable
3. If you discover a better approach, consider creating/updating a skill

Available skills are auto-discovered. When you see a SKILL.md, follow its instructions.

---

**MANDATORY WORKFLOW REQUIREMENTS**:

1. **Git Worktrees**: ALL code changes MUST use isolated git worktrees (`feature/NNN-slug` branches)
2. **PR-Based Merges**: NO direct commits to `main`. All changes via PR with automated review
3. **CI/CD Pipelines**: ALWAYS use CI/CD pipelines to deploy. Create ephemeral pipelines when needed
4. **Automated Review**: PRs require signoff from reviewer agents before merge

See [Git Worktree Workflow](docs/workflows/GIT_WORKTREE_WORKFLOW.md) for complete details.

---

## Architecture Overview

### Three-Cluster Architecture

| Cluster         | Context                     | Purpose        | Components                                                           |
| --------------- | --------------------------- | -------------- | -------------------------------------------------------------------- |
| **Main**        | `do-syd1-pay2u`             | Applications   | API, Frontend, image-to-list, PostgreSQL, PgDog, OAuth2-proxy, Istio |
| **OpenObserve** | `do-syd1-pay2u-openobserve` | Observability  | OpenObserve, PostgreSQL, PgDog, Logs/Metrics/Traces                  |
| **Zitadel**     | `do-syd1-zitadel`           | Authentication | Zitadel, PostgreSQL, PgDog                                           |

**Rule**: Each cluster serves ONE concern. Never mix concerns across clusters.

### Component Placement Decision

- **Application logic/APIs?** → Main Cluster
- **Logs/Metrics/Traces/Dashboards?** → OpenObserve Cluster
- **Authentication/Identity?** → Zitadel Cluster

### HA Configuration

- **PostgreSQL (CNPG)**: 2 instances per cluster (HA n+1)
- **PgDog pooler**: 2 replicas per cluster (HA n+1)
- **Application services**: 2+ replicas with PodDisruptionBudgets

### Database Architecture

**Production Clusters:**
| Cluster | Name | Databases | Pooler |
|---------|------|-----------|--------|
| Main | `pay2u-pgedge` | pay2u, opencms | pgdog-main |
| OpenObserve | `openobserve-pgedge` | app | pgdog-openobserve |
| Zitadel | `zitadel-pgedge` | zitadel | pgdog-zitadel |

**Technology Stack:**

- **CNPG Operator** with pgEdge + Spock 5.0.4
- **PgDog v0.1.17** for connection pooling (replaced PgCat Dec 2025)
- **Image**: `ghcr.io/pgedge/pgedge-postgres:17-spock5-standard`

**Critical CNPG Syntax:**

```yaml
postgresql:
  parameters:
    wal_level: "logical"
    track_commit_timestamp: "on"
  shared_preload_libraries: # LIST format, NOT under parameters!
    - pg_stat_statements
    - snowflake
    - spock
```

---

---

## Gateway API (Critical Knowledge)

Pay2U uses **Kubernetes Gateway API**, creating separate deployments per Gateway:

```
Gateway Resource         → Deployment          → Pod Labels
api-gateway             → api-gateway-istio   → app=api
frontend-gateway        → frontend-gateway-istio → app=frontend
```

**EnvoyFilters must target correct labels:**

```yaml
# ✅ CORRECT
workloadSelector:
  labels:
    app: api

# ❌ WRONG (legacy)
workloadSelector:
  labels:
    app: istio-ingress
```

---

---

## Multi-Cloud (Progressive Deployment)

**Current**: DigitalOcean only (Phase 0)
**Available**: AWS, Azure, GCP via `production.tfvars` flags

```hcl
enable_digitalocean = true   # Always true (primary)
enable_aws          = false  # Phase 1
enable_azure        = false  # Phase 2
enable_gcp          = false  # Phase 3
```

**Data Sovereignty**: ALL customer data in Sydney (Australia).

---

---

## Required Workflow (MANDATORY)

### Git Worktree Workflow (ALL Changes)

**Every code change MUST follow this workflow:**

```
1. CREATE WORKTREE
   .factory/scripts/worktree-manager.sh create <slug>
   → Creates feature/NNN-slug branch in .worktrees/NNN-slug/

2. DEVELOP
   cd .worktrees/NNN-slug/
   → Make changes, commit locally

3. CREATE PR (runs tests + triggers reviewers)
   .factory/scripts/worktree-manager.sh pr-create <id>
   → Runs all offline tests (blocks if fail)
   → Pushes to origin
   → Creates PR with auto-generated description
   → Triggers reviewer agents

4. AUTOMATED REVIEW
   → Reviewer agents run in parallel (quality, security, performance, tests)
   → PR labeled: reviewer-approved OR needs-work
   → Auto-merge on approval

5. CLEANUP
   .factory/scripts/worktree-manager.sh cleanup <id>
   → Removes worktree and deletes branch
```

**Install hooks** (one-time setup):

```bash
.factory/scripts/install-hooks.sh
```

### Before ANY Task

1. Read relevant docs in `/docs` and component folders
2. Check `docs/fixes/` for known issues
3. Identify which cluster(s) affected
4. **Create a worktree for your changes**

### For Code Changes

1. **Create worktree**: `.factory/scripts/worktree-manager.sh create <slug>`
2. Update/create tests
3. Run `npm test` or `pytest`
4. Run linting and type checking
5. **Create PR**: `.factory/scripts/worktree-manager.sh pr-create <id>`

### For Infrastructure Changes

1. **Create worktree** for Terraform changes
2. Update Terraform in `/infra/terraform/`
3. Update CI/CD workflows in `.github/workflows/`
4. Run `terraform plan`
5. Update secrets via GitHub Actions (not locally)
6. **Create PR** with automated review

### Before Completing

1. All tests pass (enforced by pre-push hook)
2. PR created and reviewed by agents
3. Create changelog in `docs/changelog/YYYY-MM/YYYY-MM-DD_description.md`
4. Update relevant documentation

---

---

## Key Terraform Files

| File                       | Purpose                       |
| -------------------------- | ----------------------------- |
| `main.tf`                  | Multi-cloud provider config   |
| `production.tfvars`        | Production variables          |
| `pgdog-deployment.tf`      | PgDog pooler (replaces pgcat) |
| `cnpg-pgedge-spock.tf`     | pgEdge cluster config         |
| `istio-gateways.tf`        | Istio gateway definitions     |
| `istio-oauth2-extauthz.tf` | OAuth2 integration            |
| `workbench.tf`             | Application deployments       |

---