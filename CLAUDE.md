<coding_guidelines>

# CLAUDE.md - Pay2U Development Guide

You are Autonomous Claude, a self-directed AI agent with full control over this virtual machine. You operate continuously, making your own decisions.

**Note**: Use [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. See AGENTS.md for workflows.

---

## ⚠️⚠️⚠️ CRITICAL: READ THIS FIRST - EVERY SINGLE TIME ⚠️⚠️⚠️

**YOU MUST FOLLOW THE DECISION LOOP BELOW FOR EVERY ACTION. NO EXCEPTIONS.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MANDATORY DECISION LOOP                              │
│                     (Execute this for EVERY task)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. READ MEMORY FIRST                                                        │
│     ├─ Query short-term: sqlite3 tools/agents/data/memory/short_term.db     │
│     │    "SELECT * FROM memories ORDER BY id DESC LIMIT 20;"                │
│     └─ Query long-term for relevant context:                                 │
│          tools/agents/.venv/bin/python tools/agents/scripts/query_memory.py │
│          long "<keywords related to current task>"                           │
│                                                                              │
│  2. CHECK FOR APPLICABLE SKILLS                                              │
│     ├─ Review .factory/skills/ for relevant skills                          │
│     ├─ Use pay2u-design-expert for ANY UI/design work                       │
│     ├─ Use senior-frontend for React/TypeScript work                        │
│     └─ Invoke skill BEFORE starting implementation                          │
│                                                                              │
│  3. CREATE WORKTREE (for ANY code changes)                                   │
│     ├─ .factory/scripts/worktree-manager.sh create <slug>                   │
│     ├─ cd .worktrees/NNN-<slug>/                                            │
│     └─ NEVER commit directly to main                                         │
│                                                                              │
│  4. CREATE TODO LIST (for 3+ step tasks)                                     │
│     ├─ Use TodoWrite tool immediately                                        │
│     ├─ Update status after EACH step                                         │
│     └─ Mark completed items immediately                                      │
│                                                                              │
│  5. DO THE WORK                                                              │
│     ├─ Implement changes                                                     │
│     ├─ Run tests                                                             │
│     └─ Create PR via worktree-manager.sh pr-create <id>                     │
│                                                                              │
│  6. UPDATE MEMORY (after EVERY significant action)                           │
│     ├─ Short-term: INSERT INTO memories...                                   │
│     └─ Long-term (for learnings): query_memory.py store lesson...           │
│                                                                              │
│  7. VERIFY BEFORE RESPONDING                                                 │
│     ├─ [ ] Memory updated?                                                   │
│     ├─ [ ] Worktree used?                                                    │
│     ├─ [ ] PR created (not direct commit)?                                   │
│     ├─ [ ] Todos updated?                                                    │
│     └─ [ ] Skills consulted?                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⛔ MANDATORY RULES - ZERO TOLERANCE ⛔

**FAILURE TO FOLLOW THESE RULES IS A CRITICAL ERROR. STOP AND RE-READ IF UNSURE.**

### 1. WORKTREE REQUIREMENT (NO EXCEPTIONS)

```
❌ FORBIDDEN: Direct commits to main branch
❌ FORBIDDEN: Making changes without creating worktree first
✅ REQUIRED: Create worktree → Make changes → Create PR → Merge via PR
```

**Before ANY code change:**

```bash
# Step 1: Create worktree
.factory/scripts/worktree-manager.sh create <descriptive-slug>

# Step 2: cd into worktree and make changes
cd .worktrees/NNN-<slug>/

# Step 3: Commit and create PR
.factory/scripts/worktree-manager.sh pr-create <id>
```

**Applies to:** Terraform, application code, configs, workflows, documentation, CLAUDE.md itself

### 2. MEMORY REQUIREMENT (MANDATORY - NOT OPTIONAL)

**You MUST update memory. This is not a suggestion.**

```bash
# AFTER EVERY SIGNIFICANT ACTION - update short-term memory:
sqlite3 tools/agents/data/memory/short_term.db \
  "INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'What you did and the result');"

# AFTER EVERY FIX/DISCOVERY/LEARNING - update long-term memory:
tools/agents/.venv/bin/python tools/agents/scripts/query_memory.py store lesson \
  "What you learned" --tags tag1,tag2 --importance 7
```

**MUST store memories for:**

- ✅ Every bug fix (root cause + solution)
- ✅ Every infrastructure change
- ✅ Every architecture decision
- ✅ Every gotcha or workaround discovered
- ✅ Every performance optimization
- ✅ Every deployment issue and resolution
- ✅ Every API behavior discovery

**Importance scale:**

- 9-10: Critical system knowledge (will break things if forgotten)
- 7-8: Important patterns and fixes
- 5-6: Useful context and learnings
- 3-4: Minor observations

### 3. SKILLS REQUIREMENT (CHECK BEFORE IMPLEMENTING)

**Before starting ANY implementation, check if a skill applies:**

| Task Type                                         | Required Skill        |
| ------------------------------------------------- | --------------------- |
| UI/Design work (buttons, modals, colors, layouts) | `pay2u-design-expert` |
| React/TypeScript/Frontend                         | `senior-frontend`     |
| Code review                                       | `code-reviewer`       |
| Web testing                                       | `webapp-testing`      |

```bash
# Invoke skill FIRST, then follow its guidance
Skill(skill: "pay2u-design-expert")
```

### 4. TODO LIST REQUIREMENT

- Create todo list for multi-step tasks (3+ steps)
- Update status IMMEDIATELY after completing each item
- Never let todos go stale (update every 5-10 tool calls)
- Use TodoWrite tool, not manual tracking

### 5. VERIFICATION BEFORE EVERY RESPONSE

Before sending ANY response, verify:

```
┌─────────────────────────────────────────────────────────────┐
│ CHECKLIST - Complete before responding:                     │
├─────────────────────────────────────────────────────────────┤
│ [ ] Read memory at start of task?                           │
│ [ ] Checked for applicable skills?                          │
│ [ ] Used worktree for code changes?                         │
│ [ ] Updated short-term memory after actions?                │
│ [ ] Stored learnings in long-term memory?                   │
│ [ ] Updated todo list status?                               │
│ [ ] Created PR (not direct commit)?                         │
└─────────────────────────────────────────────────────────────┘
```

---

## MEMORY SYSTEM

### Short-term Memory (SQLite: `tools/agents/data/memory/short_term.db`)

Table: `memories`

- `id`: INTEGER PRIMARY KEY
- `timestamp`: TEXT (ISO8601)
- `type`: TEXT (action|observation|thought|goal)
- `content`: TEXT

**BEFORE EACH DECISION**: Query recent entries (last 50) to understand your context

```sql
SELECT * FROM memories ORDER BY id DESC LIMIT 50;
```

**AFTER EACH ACTION**: INSERT a new row describing what you did and the outcome

```sql
INSERT INTO memories (timestamp, type, content) VALUES (datetime('now'), 'action', 'Description of action and result');
```

Maintains last 50 entries - older entries auto-deleted via trigger.

### Long-term Memory (Qdrant: `localhost:6333`, collection: `claude_memory`)

**Start services**: `./tools/agents/scripts/start-services.sh`

Vector schema:

- `id`: UUID
- `vector`: 384-dim embedding (all-MiniLM-L6-v2)
- `payload`: {type, tags[], content, importance (1-10), timestamp}

**Query memories** (semantic search):

```bash
tools/agents/.venv/bin/python tools/agents/scripts/query_memory.py long "Redis caching"
```

**Store new memory**:

```bash
tools/agents/.venv/bin/python tools/agents/scripts/query_memory.py store lesson "Always check network policies" --tags networking,kubernetes --importance 8
```

**WHEN TO READ**: Search for memories relevant to current task/decision
**WHEN TO WRITE**: Only store significant learnings:

- Discoveries about your environment/capabilities
- Successful strategies that worked
- Failed approaches to avoid repeating
- Important facts learned
- Skills or tools mastered

### Agent Services Setup

```bash
# Start Qdrant (auto-creates collection and migrates memories)
./tools/agents/scripts/start-services.sh

# Check status
./tools/agents/scripts/start-services.sh status

# Stop services
./tools/agents/scripts/start-services.sh stop
```

**Docker Compose**: `tools/agents/docker-compose.yml` defines Qdrant with persistent storage.

---

## BROWSER USAGE

When using browser automation (Playwright, Puppeteer, or any browser tool):

- ALWAYS save a screenshot after EVERY browser action (click, type, navigate, scroll, etc.)
- Save screenshots to: `agents/data/screenshots/`
- Filename format: `{timestamp}_{action}.png` (e.g., `1703180400_click_button.png`)
- Also save a `.meta` file with the same name containing:
  ```
  url: {current_url}
  title: {page_title}
  action: {what_you_did}
  ```
- Take a screenshot BEFORE and AFTER any significant visual change

---

## DECISION LOOP

1. **READ** short-term memory (recent context)
2. **QUERY** long-term memory (semantic search for relevant past learnings)
3. **THINK** about what to do next
4. **ACT** - execute your decision
5. **RECORD** - write to short-term memory
6. **IF BROWSER ACTION**: Save screenshot to `/agents/data/screenshots/`
7. **OPTIONALLY** - if significant learning, add to long-term memory

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

## Repository Structure (January 2026)

```
pay2u/
├── apps/                    # Deployable applications
│   ├── api/                 # C++ Products REST API (Crow framework)
│   ├── web/                 # PWA Frontend (Vanilla JS + SCSS)
│   ├── cms/                 # OpenCMS marketing site
│   └── marketing/           # Static marketing assets
│
├── services/                # Backend microservices
│   ├── image-to-list/       # Python OCR service (DeepSeek-OCR)
│   └── ml-anomaly-detection/# ML anomaly detection service
│
├── infra/                   # Infrastructure as Code
│   ├── terraform/           # Terraform configurations (94 files)
│   ├── k8s/                 # Kubernetes manifests
│   ├── helm_charts/         # Helm chart templates
│   ├── postgres-spock/      # PostgreSQL Spock configs
│   └── scripts/             # Infrastructure automation scripts
│
├── tools/                   # Development tools
│   ├── agents/              # AI agent memory & automation
│   ├── pay2u-deploy/        # Deployment CLI tool
│   └── sla-calculator/      # SLA calculation utilities
│
├── tests/                   # Cross-cutting test suites
│   ├── e2e/                 # End-to-end Playwright tests
│   ├── visual/              # Visual regression tests
│   ├── performance/         # k6 performance tests
│   └── database/            # Database integration tests
│
├── docs/                    # Documentation
│   ├── architecture/        # System architecture docs
│   ├── compliance/          # SOC2 & compliance docs
│   ├── deployment/          # Deployment guides
│   ├── changelog/           # Change history
│   └── archive/             # Historical documentation
│
├── .factory/                # Factory AI configuration
│   ├── droids/              # Custom AI agent definitions
│   ├── skills/              # Reusable skill definitions
│   ├── commands/            # CLI command definitions
│   └── scripts/             # Automation scripts
│
├── .github/                 # GitHub configuration
│   └── workflows/           # CI/CD pipelines (22+ workflows)
│
└── observability/           # Monitoring configurations
    └── dashboards/          # OpenObserve dashboards
```

### Path Migration Reference (December 2025)

| Old Path                           | New Path                  | Component      |
| ---------------------------------- | ------------------------- | -------------- |
| `platform/products/api/`           | `apps/api/`               | C++ REST API   |
| `ui/main/web/`                     | `apps/web/`               | PWA Frontend   |
| `ui/marketing/`                    | `apps/marketing/`         | Marketing Site |
| `platform/opencms/`                | `apps/cms/`               | OpenCMS        |
| `platform/services/image-to-list/` | `services/image-to-list/` | OCR Service    |
| `agents/`                          | `tools/agents/`           | AI Agent Tools |
| `k8s/`                             | `infra/k8s/`              | K8s Manifests  |
| `platform/postgres-spock/`         | `infra/postgres-spock/`   | DB Configs     |

---

## Quick Reference

### Cluster Contexts

```bash
kubectl config use-context do-syd1-pay2u              # Main (apps)
kubectl config use-context do-syd1-pay2u-openobserve  # OpenObserve (observability)
kubectl config use-context do-syd1-zitadel            # Zitadel (auth)
```

### URLs

- **App**: https://app.pay2u.com.au
- **API**: https://api.pay2u.com.au
- **Auth**: https://auth.pay2u.com.au
- **Observability**: https://observe.pay2u.com.au

### Key Workflow Files

```
.github/workflows/
├── cd-frontend-multicloud.yml  # Frontend deployment
├── cd-products-api.yml         # Backend API (C++)
├── iac-terraform-cicd.yml      # Infrastructure
├── db-postgres-backup.yml      # Database backups
├── security-unified.yml        # Security scans
└── test-e2e-playwright.yml     # E2E tests
```

### Essential Commands

```bash
# Create worktree for new task (MANDATORY for all changes)
.factory/scripts/worktree-manager.sh create <slug>

# Create PR with automated review
.factory/scripts/worktree-manager.sh pr-create <id>

# Frontend tests
cd apps/web && npm test

# Python tests
cd services/image-to-list && pytest

# Terraform
cd infra/terraform && terraform plan

# Build API
cd apps/api && mkdir -p build && cd build
cmake -DCROW_ENABLE_SSL=ON -DCROW_ENABLE_COMPRESSION=ON -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
```

---

## Architecture Overview

### Three-Cluster Architecture

| Cluster         | Context                     | Purpose        | Components                                                           |
| --------------- | --------------------------- | -------------- | -------------------------------------------------------------------- |
| **Main**        | `do-syd1-pay2u`             | Applications   | API, Frontend, image-to-list, PostgreSQL, PgDog, OAuth2-proxy, Istio |
| **OpenObserve** | `do-syd1-pay2u-openobserve` | Observability  | OpenObserve, PostgreSQL, PgDog, Logs/Metrics/Traces                  |
| **Zitadel**     | `do-syd1-zitadel`           | Authentication | Zitadel, PostgreSQL, PgDog, Redis                                    |

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

## Core Components

### Backend API (`apps/api/`)

- **Language**: C++20 with Crow framework
- **Database**: PostgreSQL via taopq with prepared statements
- **Storage**: DigitalOcean Spaces (S3-compatible) with streaming uploads
- **Auth**: JWT from Zitadel, org ID from `x-active-org-id` header
- **Caching**: Redis 7 with in-memory fallback (cache-aside pattern)

#### Performance Architecture

The API uses a multi-layer caching and optimization strategy:

```
Request → Redis Cache → Memory Cache → Connection Pool → Prepared Statement → PostgreSQL
              ↓              ↓              ↓                   ↓
         Cache HIT      Fallback       15 pooled          Pre-compiled
         (sub-ms)       (in-proc)      connections         queries
```

**Key optimizations:**

- **Redis caching**: Caches pre-serialized JSON responses (not DB results)
  - Product list: 5-minute TTL, key: `products:list:{org_id}`
  - Product detail: 10-minute TTL, key: `products:detail:{org_id}:{slug}`
- **Memory fallback**: In-process LRU cache when Redis unavailable
- **Connection pooling**: 15 connections per read/write pool
- **Prepared statements**: 12 pre-compiled queries for common operations
- **API-side JSON**: JSON built in C++ to reduce PostgreSQL CPU load

**Cache invalidation**: Automatic on upsert/delete operations via `invalidateOrgProducts()`

**Network policies required for Redis:**

- `allow-api-to-redis` (egress from API to Redis)
- `allow-ingress-to-redis` (ingress to Redis from API)

### Frontend (`apps/web/`)

- **Type**: Vanilla JS PWA with SCSS
- **Hosting**: DigitalOcean Spaces CDN with custom domain
- **Auth**: `modules/auth-guard.js` checks auth before API calls
- **Service Worker**: Handles caching and root URL redirect (fixes DO Spaces 403)
- **Performance**: Preconnect hints for auth/api domains, cache-first for assets
- **Architecture**: See [`ARCHITECTURE.md`](apps/web/ARCHITECTURE.md) for comprehensive documentation

**Important**: DigitalOcean Spaces CDN does NOT support default index documents.
The service worker intercepts `/` requests and serves cached `/index.html`.

**SECURITY - DOM Manipulation Rules:**

- **NEVER use `innerHTML`** - XSS vulnerability risk. Always use programmatic DOM creation:

  ```javascript
  // ❌ BAD - XSS vulnerable
  container.innerHTML = `<div>${userInput}</div>`;

  // ✅ GOOD - Safe programmatic creation
  const div = document.createElement("div");
  div.textContent = userInput;
  container.appendChild(div);
  ```

- Use `textContent` for text, `createElement`/`appendChild` for structure
- For complex HTML, use `apps/web/infrastructure/utils/dom.js` helpers

### image-to-list (`services/image-to-list/`)

- **Language**: Python with DeepSeek-OCR
- **Pattern**: S3-as-Queue (polls `product-images/` directory)
- **Flow**: Upload → `product-images/` → `processing/` → Delete after success

---

## Authentication Flow

### Istio + OAuth2-Proxy Architecture

```
Client → Istio Gateway → ext-authz filter → OAuth2-Proxy
                                              ↓
                              ┌─ 202: Forward to Backend with auth headers
                              └─ 401: Redirect to Zitadel login
```

### Frontend Auth Guard (`apps/web/modules/auth-guard.js`)

- Calls `GET /oauth2/auth` on page load
- If 202: Proceed with API calls
- If 401: Redirect entire page to `/oauth2/start`
- Uses `rd` parameter to return to original page after login

### Key Files

- `infra/terraform/istio-gateways.tf` - Gateway definitions
- `infra/terraform/istio-oauth2-extauthz.tf` - OAuth2 integration
- `infra/terraform/istio-cors-origin-echo.tf` - CORS handling

### Zitadel Redis Cache (Performance Optimization)

Zitadel uses Redis for centralized caching across all replicas:

```
Zitadel Pod → Redis Cache → PostgreSQL (via PgDog)
                 ↓
            Cache HIT (<1ms) vs DB query (5-10ms)
```

**Architecture:**

- **Redis**: Bitnami chart 24.0.8 (Redis 8.4.0), replication mode
- **Service**: `redis-zitadel.zitadel.svc.cluster.local:6379`
- **HA**: 2 nodes (1 master + 1 replica) with Sentinel
- **No auth**: Secured via NetworkPolicy (Zitadel pods only)

**Cached Objects (1h TTL):**

- **Instance**: Every request needs this - MOST IMPACTFUL
- **Organization**: Frequently accessed, rarely changes
- **Milestones**: Tracked across replicas

**Key Files:**

- `infra/terraform/zitadel-redis.tf` - Redis Helm deployment
- `infra/terraform/zitadel-cluster-values.yaml` - Cache configuration

**Circuit Breaker**: If Redis fails, Zitadel falls back to database queries (graceful degradation).

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

## Troubleshooting Quick Reference

### pgEdge/CNPG Issues

| Symptom                                    | Solution                                                    |
| ------------------------------------------ | ----------------------------------------------------------- |
| `dial tcp 10.245.0.1:443: i/o timeout`     | Create `allow-cnpg-egress` NetworkPolicy                    |
| `spock is not in shared_preload_libraries` | Use list format under `postgresql.shared_preload_libraries` |
| PgDog can't reach pgEdge                   | Update `allow-pgdog-egress` policy                          |
| `SELECT FOR UPDATE` fails                  | Use `role = "primary"` only for Zitadel                     |
| Replica stuck in WAL recovery              | Delete pod AND PVC, let CNPG rebuild                        |

### Auth Issues

| Symptom                 | Solution                                      |
| ----------------------- | --------------------------------------------- |
| CORS errors on redirect | Check EnvoyFilter targets correct `app` label |
| Infinite redirect loop  | Verify OAuth2 proxy session cookie domain     |
| 401 after login         | Check OAuth2 callback URL configuration       |

### Redis/Cache Issues (Main Cluster - API)

| Symptom                                         | Solution                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `Redis connection failed: Connection timed out` | Create `allow-api-to-redis` and `allow-ingress-to-redis` NetworkPolicies |
| No cache HITs in logs                           | Check `REDIS_CACHE_ENABLED=true` env var and Redis service accessibility |
| Cache not invalidating                          | Verify `invalidateOrgProducts()` called on upsert/delete                 |
| Memory cache only (no Redis)                    | Check Redis pod running: `kubectl get pods -l app=redis`                 |

### Redis/Cache Issues (Zitadel Cluster)

| Symptom                                        | Solution                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `circuit breaker is open` in Zitadel logs      | Restart Zitadel pods to reset circuit breaker; check Redis connectivity          |
| `NOREPLICAS Not enough good replicas to write` | Check Redis replication: `redis-cli INFO replication` - NetworkPolicy egress fix |
| `connected_slaves:0` on Redis master           | Add egress rules to NetworkPolicy for Redis pod-to-pod communication             |
| Redis pods in `ImagePullBackOff`               | Bitnami chart version issue - use chart 24.0.8+ (Redis 8.4.0)                    |
| No keys in Redis keyspace                      | Verify service name: `redis-zitadel` not `redis-zitadel-master` for replication  |

```bash
# Check Zitadel Redis status
kubectl --context do-syd1-zitadel exec -n zitadel redis-zitadel-node-0 -c redis -- redis-cli INFO replication
kubectl --context do-syd1-zitadel exec -n zitadel redis-zitadel-node-0 -c redis -- redis-cli INFO keyspace
```

### Gateway Issues

```bash
# Find gateway pods for a domain
dig +short api.pay2u.com.au
kubectl get svc -n istio-ingress
kubectl get pods -n istio-ingress -o wide --show-labels
```

---

## Key Terraform Files

| File                          | Purpose                               |
| ----------------------------- | ------------------------------------- |
| `main.tf`                     | Multi-cloud provider config           |
| `production.tfvars`           | Production variables                  |
| `pgdog-deployment.tf`         | PgDog pooler (replaces pgcat)         |
| `cnpg-pgedge-spock.tf`        | pgEdge cluster config                 |
| `istio-gateways.tf`           | Istio gateway definitions             |
| `istio-oauth2-extauthz.tf`    | OAuth2 integration                    |
| `workbench.tf`                | Application deployments               |
| `zitadel-redis.tf`            | Zitadel Redis cache (HA)              |
| `zitadel-cluster-values.yaml` | Zitadel Helm values with cache config |

---

## Completion Checklist

```
[ ] Tests updated and passing
[ ] Linting/type checking passed
[ ] Terraform plan verified (if infra changed)
[ ] CI/CD workflows updated (if deployment changed)
[ ] Changelog created (for significant changes)
[ ] Documentation updated
[ ] No secrets in code/commits
```

---

## Changelog Quick Reference

**When to create**: New features, breaking changes, security updates, infrastructure changes, API modifications, database schema changes.

**Location**: `docs/changelog/YYYY-MM/YYYY-MM-DD_description.md`
**Template**: `docs/changelog/CHANGELOG_TEMPLATE.md`

**Required sections**: Metadata, Summary, Details, Technical Details, Migration Guide, Testing

---

## Augmented Agent Capabilities

### Skills (`.factory/skills/`)

Invoke with `Skill` tool. Skills expand inline with detailed instructions.

| Skill                   | Purpose                                                                           | Use When                                                                              |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pay2u-design-expert`   | **Pay2U Liquid Glass design system expert** - colors, shadows, glassmorphism      | **USE PROACTIVELY for ALL design work**: buttons, modals, themes, layouts, animations |
| `senior-frontend`       | React/Next.js/TypeScript/Tailwind development                                     | Building UI features, performance optimization, state management                      |
| `ui-ux-pro-max`         | UI/UX design intelligence with 50 styles, 21 palettes, 50 font pairings, 8 stacks | General UI/UX patterns, color palettes, typography, external projects                 |
| `code-reviewer`         | Automated code analysis, security scanning                                        | Reviewing PRs, code quality checks, identifying issues                                |
| `webapp-testing`        | Playwright-based web testing                                                      | Verifying frontend functionality, debugging UI, browser screenshots                   |
| `web-artifacts-builder` | React+Tailwind+shadcn/ui bundled artifacts                                        | Complex multi-component HTML artifacts                                                |

### Custom Droids (`.factory/droids/`)

Launch via `Task` tool with `subagent_type`. Droids run autonomously.

**Language Specialists (PROACTIVE):**
| Droid | Purpose |
|-------|---------|
| `cpp-pro` | C++20 with RAII, smart pointers, STL, templates, move semantics |
| `python-pro` | Async/await, decorators, generators, pytest, type hints |
| `javascript-pro` | ES6+, async patterns, Node.js, promises, event loops |

**Code Review Pipeline:**
| Droid | Focus |
|-------|-------|
| `git-summarizer` | Gathers repo context (status, diffs, commit range) for downstream droids |
| `code-quality-reviewer` | Naming, complexity, duplication, error handling, style |
| `security-code-reviewer` | OWASP Top 10, secrets, authn/z, injection, risky configs |
| `performance-reviewer` | Algorithmic complexity, N+1 queries, caching, memory/IO |
| `test-coverage-reviewer` | Test gaps, brittle tests, coverage analysis |
| `documentation-accuracy-reviewer` | Verifies docs/README accuracy against implementation |
| `pr-readiness-reviewer` | Branch readiness: tests, docs, blockers, changelog |

**Utilities:**
| Droid | Purpose |
|-------|---------|
| `release-notes-writer` | Structured release notes from commit history |
| `test-plan-writer` | Focused automated and manual test plans |
| `todo-fixme-scanner` | Scans repo for TODO/FIXME markers |
| `session-context-preservation-droid` | Maintains project knowledge across sessions |

### Commands (`.factory/commands/`)

High-level orchestration workflows:

| Command          | Purpose                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `/worktree`      | Manage git worktrees (create, list, pr, cleanup) - **USE FOR ALL CHANGES**    |
| `/code-review`   | Full code review (git-summarizer → quality/security/perf/test/docs reviewers) |
| `/pr-ready`      | Validate branch, auto-create PR, trigger reviewer agents                      |
| `/release-notes` | Generate structured release notes from changes                                |
| `/test-plan`     | Produce test plans for code changes                                           |
| `/todo-scan`     | Scan for TODO/FIXME markers                                                   |

### MCP Plugins (`.mcp.json`)

External tool integrations:

| Plugin                                | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `playwright-server`                   | Browser automation via Playwright MCP |
| `terraform`                           | Terraform operations via Docker       |
| `executeautomation-playwright-server` | Alternative Playwright integration    |
| `automatalabs-playwright-server`      | Additional Playwright capabilities    |

### Usage Patterns

**Code Review Workflow:**

```
1. Invoke /code-review command
2. git-summarizer gathers context
3. Parallel delegation to quality/security/perf/test/docs droids
4. Consolidated report with prioritized findings
```

**PR Preparation:**

```
1. Run /pr-ready command
2. Validates: tests, docs, changelog, TODO markers
3. Returns blockers and required actions
```

**Language-Specific Refactoring:**

```
# For C++ API work
Task(subagent_type: "cpp-pro", prompt: "Refactor X using RAII...")

# For Python service work
Task(subagent_type: "python-pro", prompt: "Optimize async handlers...")
```

**Frontend Development:**

```
# Invoke skill for React/TypeScript work
Skill(skill: "senior-frontend")
# Then follow expanded instructions
```

</coding_guidelines>
