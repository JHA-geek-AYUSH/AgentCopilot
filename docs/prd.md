# PRD — NANDA Publishing for AgentOS `/agent`

**Owner:** Paramarsh Labs
**Status:** Draft v1 (implementation-ready)
**Surface:** AgentOS — Next.js 16 App Router, Supabase, Clerk, Anthropic SDK, Composio
**Feature:** Create persistent agents in `/agent` and auto-publish them to the NANDA directory so anyone can discover, fetch, and use them.

---

## 1. Summary

Today `/agent` is an **ephemeral runner**: you type a task, pick a run mode (continuous / timed / interval), and watch it execute. Nothing is saved as a reusable entity, and nothing is discoverable outside AgentOS.

This feature turns a configured run into a **saved, named Agent** that can be **published to NANDA** with one action. Once published:

1. AgentOS appears in the **NANDA Index** as a registered organization (one-time).
2. Each published agent becomes a **CatalogEntry** in AgentOS's own NANDA-compatible **registry surface**.
3. Each agent exposes an **A2A agent card** and a **callable runtime endpoint**.
4. Anyone browsing the NANDA directory can resolve `urn:ai:domain:agentos.app:agent:<slug>`, fetch the card, and either **invoke** it or **clone it into their own AgentOS account**.

---

## 2. How NANDA resolves (grounding)

```
Requester
  -> NANDA Index            (hop 1: org/domain/email/urn  ->  registry_url + identifier)
  -> Registry               (hop 2: GET <registry_url>/agents/<identifier> -> CatalogEntry)
  -> Agent Card / AgentFacts (hop 3: GET CatalogEntry.url -> A2A card)
  -> Agent runtime          (hop 4: POST AgentCard.url -> run)
```

Two facts drive the whole design:

- The **Index stores one record per organization**, not per agent. We register the AgentOS org **once**, pointing `registry_url` at AgentOS.
- The **registry stores one CatalogEntry per agent**. Instead of running the separate `nanda-registry` service and syncing two databases, **AgentOS serves the registry surface itself** over its existing Supabase `agents` data.

| NANDA object | Owned by | Media type | Served at |
|---|---|---|---|
| IndexRecord (org) | NANDA Index | `application/ai-catalog+json` | `nanda-index-v2` |
| CatalogEntry (agent) | AgentOS | `application/a2a-agent-card+json` | `GET /api/nanda/agents/<slug>` |
| Agent Card (AgentFacts) | AgentOS | `application/a2a-agent-card+json` | `GET /api/nanda/agents/<slug>/card` |
| Runtime | AgentOS | — | `POST /api/a2a/agents/<slug>` |

---

## 3. Goals / Non-goals

**Goals**
- Persist agents as first-class entities (extend, don't replace, the ad-hoc runner).
- One-action "Publish to NANDA" from `/agent`, plus unpublish and update propagation.
- AgentOS is a valid NANDA registry: discoverable, resolvable, fetchable.
- Published agents are **callable** (A2A-lite runtime) and **clonable** (import into another account).
- A security model where publishing never exposes the owner's connected integrations.

**Non-goals (this version)**
- Full A2A JSON-RPC spec compliance (`tasks/get`, streaming, push notifications) — Phase 2.
- Signed AgentFacts (Ed25519) — Phase 2.
- Monetization / paid agent invocation.
- Running the standalone `nanda-registry` Postgres service (kept as an **optional** mirror target only).

---

## 4. Key design decisions

### 4.1 AgentOS is its own registry (recommended)
The Index `registry_url` points to `https://agentos.app/api/nanda`. AgentOS implements the read side of the AI Catalog (`/agents`, `/agents/:id`, `/agents/search`, `/.well-known/ai-catalog.json`) directly over Supabase.

| Option | Pros | Cons |
|---|---|---|
| **A. AgentOS self-registry (chosen)** | Single source of truth; card + runtime + data co-located; no sync; less infra | Must implement catalog read endpoints |
| B. Run external `nanda-registry` + push | Reuses given code; decoupled | Two databases to keep in sync on every create/update/delete; runtime still lives in AgentOS anyway |

Option B is supported as an **optional mirror** (`NANDA_EXTERNAL_REGISTRY_URL`) for users who want their agents in a shared/third-party registry, but it is off by default.

### 4.2 Template vs. instance (the security crux)
A published agent is a **definition/template**, not a live handle to the owner's account. This prevents the obvious exploit: *"Monitor my Gmail"* published publicly must not let a stranger read the owner's Gmail.

| Concept | Runs under | Integrations used | Exposed via NANDA |
|---|---|---|---|
| **Agent definition** | — | none (declares *required* capabilities) | ✅ card + catalog entry |
| **Owner instance** | owner's account | owner's Composio connections | ❌ never |
| **Sandbox invocation** | ephemeral | none, or **caller-supplied** context only | ✅ runtime (default sandbox) |
| **Cloned instance** | importer's account | importer's own connections | created on import |

**Default public runtime = sandbox**: it runs the task with no private connections and returns a result or a structured "this agent needs integrations X, Y — clone to run" response. The primary discovery CTA is **"Add to your AgentOS"** (clone), which is both safer and the "use it in my platform" path the feature is about.

---

## 5. Architecture

```
                         NANDA Index (api.nandaindex.org)
                          ▲ register org once (hosting_path=registry)
                          │ registry_url = https://agentos.app/api/nanda
        ┌─────────────────┴───────────────────────────────────────┐
        │                       AgentOS                            │
        │                                                          │
        │  /agent UI ──► POST /api/agents (save)                   │
        │            └─► POST /api/agents/:id/publish              │
        │                                                          │
        │  Supabase: agents table  ◄── single source of truth      │
        │                                                          │
        │  Public NANDA surface (self-registry):                   │
        │   GET /api/nanda/.well-known/ai-catalog.json             │
        │   GET /api/nanda/agents            (catalog)             │
        │   GET /api/nanda/agents/:slug      (CatalogEntry)        │
        │   GET /api/nanda/agents/:slug/card (A2A card)            │
        │                                                          │
        │  Runtime:  POST /api/a2a/agents/:slug  (sandbox)         │
        │  Consume:  POST /api/agents/import     (clone)           │
        └──────────────────────────────────────────────────────────┘
```

---

## 6. Data model

### 6.1 New migration — `agents` table
`supabase/migrations/0xx_agents.sql`

```sql
create type agent_run_mode      as enum ('continuous', 'timed', 'interval');
create type agent_visibility    as enum ('private', 'unlisted', 'public');
create type agent_nanda_status  as enum ('draft', 'publishing', 'published', 'failed', 'unpublished');

create table public.agents (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,                 -- Clerk user id
  slug               text not null,                 -- URN-safe, unique per org
  name               text not null,
  description        text not null default '',
  task_template      text not null,                 -- the natural-language task
  run_mode           agent_run_mode not null default 'interval',
  run_config         jsonb not null default '{}',   -- { intervalSeconds | durationMinutes | intervalMinutes }
  required_apps      text[] not null default '{}',  -- Composio app slugs the agent needs (gmail, github, ...)
  capabilities       jsonb not null default '{}',   -- { streaming, memory, selfCorrect, ... }
  skills             jsonb not null default '[]',   -- A2A skills[]
  input_modes        text[] not null default '{text/plain}',
  output_modes       text[] not null default '{text/plain,application/json}',
  tags               text[] not null default '{}',
  version            text not null default '0.1.0',
  visibility         agent_visibility not null default 'private',
  nanda_status       agent_nanda_status not null default 'draft',
  nanda_identifier   text,                          -- == slug once published
  nanda_registry_url text,                          -- base it was published under
  card               jsonb,                         -- cached A2A card
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index agents_org_slug_uniq on public.agents (slug);  -- org-global slug
create index agents_user_idx       on public.agents (user_id);
create index agents_public_idx     on public.agents (visibility) where visibility = 'public';

-- RLS: owners manage their own rows; public read is served via service-role API routes only.
alter table public.agents enable row level security;
create policy agents_owner_all on public.agents
  using (auth.jwt() ->> 'sub' = user_id) with check (auth.jwt() ->> 'sub' = user_id);
```

> Public NANDA reads are served through **service-role** API routes (Section 7.2), so RLS stays strict and the public surface only exposes `visibility in ('public','unlisted')` rows.

### 6.2 TypeScript types
`lib/agents/types.ts`

```ts
export type RunMode = 'continuous' | 'timed' | 'interval';
export type Visibility = 'private' | 'unlisted' | 'public';
export type NandaStatus = 'draft' | 'publishing' | 'published' | 'failed' | 'unpublished';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface Agent {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string;
  taskTemplate: string;
  runMode: RunMode;
  runConfig: Record<string, number>;
  requiredApps: string[];
  capabilities: { streaming?: boolean; memory?: boolean; selfCorrect?: boolean };
  skills: AgentSkill[];
  inputModes: string[];
  outputModes: string[];
  tags: string[];
  version: string;
  visibility: Visibility;
  nandaStatus: NandaStatus;
  nandaIdentifier?: string;
  nandaRegistryUrl?: string;
  card?: AgentCard;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. API design (new AgentOS endpoints)

### 7.1 Owner-facing CRUD (Clerk-auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agents` | List caller's agents |
| `POST` | `/api/agents` | Create agent (from `/agent` config) |
| `GET` | `/api/agents/:id` | Read one (owner) |
| `PATCH` | `/api/agents/:id` | Update fields; bumps `version`, re-renders card |
| `DELETE` | `/api/agents/:id` | Delete (unpublishes first if needed) |
| `POST` | `/api/agents/:id/run` | Owner run — uses owner's Composio connections (wraps existing `POST /api/agent` execute) |
| `POST` | `/api/agents/:id/publish` | Validate → set public/unlisted → render card → ensure index org → mark `published` |
| `DELETE` | `/api/agents/:id/publish` | Unpublish (set `unpublished`, optional external-registry delete) |

**Create payload**
```jsonc
{
  "name": "Gmail Client Monitor",
  "description": "Watches inbox for client emails and summarizes them.",
  "taskTemplate": "Monitor my Gmail for client emails and summarize new ones.",
  "runMode": "interval",
  "runConfig": { "intervalMinutes": 5 },
  "requiredApps": ["gmail"],
  "skills": [{ "id": "summarize-inbox", "name": "Summarize inbox", "description": "...", "tags": ["email"] }],
  "tags": ["email", "productivity"],
  "visibility": "private"
}
```

`slug` is auto-derived from `name` (kebab-case, URN-safe `^[a-z0-9][a-z0-9-]{1,62}$`), deduped with a numeric suffix.

### 7.2 Public NANDA registry surface (no auth, service-role read)

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/nanda/.well-known/ai-catalog.json` | Catalog discovery doc |
| `GET` | `/api/nanda/agents` | `CatalogDocument` (all active public/unlisted) |
| `GET` | `/api/nanda/agents/search?q=` | Keyword or URN fast-path |
| `GET` | `/api/nanda/agents/:slug` | `CatalogEntry` |
| `GET` | `/api/nanda/agents/:slug/card` | A2A `AgentCard` |

Add a root rewrite so the convention-standard well-known path also resolves:
`next.config.ts` →
```ts
async rewrites() {
  return [{ source: '/.well-known/ai-catalog.json', destination: '/api/nanda/.well-known/ai-catalog.json' }];
}
```

**CatalogEntry** (matches `nanda-registry` `toCatalogEntry`):
```jsonc
{
  "id": "gmail-client-monitor",
  "name": "Gmail Client Monitor",
  "media_type": "application/a2a-agent-card+json",
  "url": "https://agentos.app/api/nanda/agents/gmail-client-monitor/card",
  "tags": ["email", "productivity"],
  "version": "0.1.0",
  "updated_at": "2026-06-26T00:00:00Z",
  "metadata": {
    "provider": "Paramarsh Labs",
    "platform": "AgentOS",
    "requiredApps": ["gmail"],
    "runMode": "interval",
    "importUrl": "https://agentos.app/agent?import=gmail-client-monitor"
  }
}
```

### 7.3 Runtime (A2A-lite, sandbox by default)

`POST /api/a2a/agents/:slug`

```jsonc
// request (A2A-lite)
{
  "message": { "role": "user", "parts": [{ "kind": "text", "text": "run with these inputs..." }] },
  "context": {}                       // optional caller-supplied context/creds
}
// response
{
  "taskId": "uuid",
  "status": "completed | failed | needs_integration",
  "result": { "parts": [{ "kind": "text", "text": "..." }] },
  "requiredApps": ["gmail"],          // present when status = needs_integration
  "importUrl": "https://agentos.app/agent?import=gmail-client-monitor"
}
```

Rules:
- Runs the agent's `taskTemplate` against the caller's message **with no owner integrations**.
- If the definition declares `requiredApps` and no caller-supplied equivalent is present → returns `needs_integration` + `importUrl` (does **not** silently use owner creds).
- Rate-limited and quota-capped per IP/agent (Section 11).

> Phase 2 promotes this to full A2A JSON-RPC (`message/send`, `message/stream`, `tasks/get`) without changing the card URL.

### 7.4 Consume / clone (the "use it in my platform" path)

`POST /api/agents/import` (Clerk-auth)
```jsonc
// by NANDA locator OR direct card url
{ "locator": "urn:ai:domain:agentos.app:agent:gmail-client-monitor" }
{ "cardUrl": "https://other-registry.example/agents/x/card" }
```
Flow: resolve via Index (or fetch card) → map card → create a **new private `agents` row owned by the caller** → return it. The caller then connects their own apps in `/profile` and runs it. This is also wired to the `/agent?import=<slug>` deep link used in `importUrl`.

---

## 8. Card / catalog builders

`lib/nanda/card.ts`
```ts
import type { Agent, AgentCard } from '@/lib/agents/types';
import { nandaConfig } from './config';

export function buildAgentCard(a: Agent): AgentCard {
  const base = nandaConfig.publicBaseUrl;          // https://agentos.app
  return {
    schemaVersion: '0.2.0',                        // validate against current A2A spec
    name: a.name,
    description: a.description,
    url: `${base}/api/a2a/agents/${a.slug}`,       // runtime
    version: a.version,
    provider: { organization: nandaConfig.providerName, url: base },
    capabilities: {
      streaming: a.capabilities.streaming ?? false,
      stateTransitionHistory: false,
    },
    defaultInputModes: a.inputModes,
    defaultOutputModes: a.outputModes,
    skills: a.skills.map(s => ({
      id: s.id, name: s.name, description: s.description, tags: s.tags,
    })),
    // AgentOS extensions (namespaced so we don't collide with A2A core)
    'x-agentos': {
      runMode: a.runMode,
      requiredApps: a.requiredApps,
      importUrl: `${base}/agent?import=${a.slug}`,
    },
  };
}
```

`lib/nanda/catalog.ts`
```ts
export function toCatalogEntry(a: Agent) {
  return {
    id: a.slug,
    name: a.name,
    media_type: 'application/a2a-agent-card+json',
    url: `${nandaConfig.publicBaseUrl}/api/nanda/agents/${a.slug}/card`,
    tags: a.tags,
    version: a.version,
    updated_at: a.updatedAt,
    metadata: {
      provider: nandaConfig.providerName,
      platform: 'AgentOS',
      requiredApps: a.requiredApps,
      runMode: a.runMode,
      importUrl: `${nandaConfig.publicBaseUrl}/agent?import=${a.slug}`,
    },
  };
}
```

---

## 9. Publish service

`lib/nanda/publish.ts`
```ts
export async function publishAgent(agentId: string, userId: string) {
  const agent = await repo.getOwned(agentId, userId);
  assertPublishable(agent);                         // name, description, >=1 skill, valid slug

  await repo.setStatus(agent.id, 'publishing');
  try {
    const card = buildAgentCard(agent);
    await ensureIndexOrg();                          // idempotent; verifies env/ORG_ID present
    await repo.update(agent.id, {
      card,
      visibility: agent.visibility === 'private' ? 'public' : agent.visibility,
      nandaStatus: 'published',
      nandaIdentifier: agent.slug,
      nandaRegistryUrl: nandaConfig.registryBaseUrl,
      publishedAt: new Date().toISOString(),
    });
    if (nandaConfig.externalRegistryUrl) await mirrorToExternalRegistry(agent, card); // optional
    return { ok: true, locator: `urn:ai:domain:${nandaConfig.orgDomain}:agent:${agent.slug}` };
  } catch (e) {
    await repo.setStatus(agent.id, 'failed');
    throw e;
  }
}
```

`assertPublishable` validation:
- `name`, `description` non-empty; `slug` matches URN-safe regex and is unique.
- At least one skill **or** a non-trivial `taskTemplate`.
- `NANDA_ORG_ID` present (org onboarded) — otherwise return actionable error pointing to the onboarding runbook.

`mirrorToExternalRegistry` (optional) → `POST <externalRegistryUrl>/agents` with `Authorization: Bearer <NANDA_EXTERNAL_REGISTRY_JWT>` and a `CatalogEntry`-shaped body; store remote id; mirror updates/deletes too.

---

## 10. One-time NANDA Index org onboarding (runbook + script)

This registers the **AgentOS org** so the directory points at the AgentOS registry surface. Do it once per environment.

`scripts/nanda-onboard-org.ts` (run with `bun run scripts/nanda-onboard-org.ts`):

1. `POST {INDEX}/auth/register` (or login) → JWT.
2. `POST {INDEX}/api/v1/orgs`
   ```jsonc
   {
     "name": "AgentOS by Paramarsh Labs",
     "domain": "agentos.app",
     "hosting_path": "registry",
     "registry_url": "https://agentos.app/api/nanda",
     "media_type": "application/ai-catalog+json",
     "tags": ["agentos", "autonomous-agents"],
     "metadata": { "homepage": "https://agentos.app" }
   }
   ```
3. Index emails a contact-verification link → click it.
4. Request DNS challenge → Index returns a token. Publish TXT:
   - name: `_nanda-challenge.agentos.app`
   - value: `nanda-verify=<token>`
5. Trigger verify → org goes **active**.
6. Script prints the returned `org_id`; set `NANDA_ORG_ID` in env.

> Updating the org domain later clears domain verification and can return the org to pending — keep `agentos.app` stable.

---

## 11. Security, abuse, cost

| Risk | Mitigation |
|---|---|
| Stranger invokes owner's private agent and reads owner data | Public runtime is **sandbox**: never loads owner Composio connections. `needs_integration` response instead. |
| Public runtime = unbounded Anthropic/tool cost | Per-IP + per-agent rate limit (e.g. 10/min, 200/day); hard token + step caps per sandbox run; global kill switch `NANDA_RUNTIME_ENABLED`. |
| Prompt injection via caller message | Sandbox runs under a constrained system prompt; tool allow-list excludes anything stateful/destructive; no memory writes to owner store. |
| Slug squatting / collisions | Org-global unique slug + reserved-word list. |
| Leaking unpublished agents | Public read routes filter `visibility in ('public','unlisted')` and `nanda_status='published'`; everything else 404. |
| External registry JWT leakage | Server-only env; never shipped to client; mirror calls are server-side. |
| Card tampering claims | Phase 2: sign AgentFacts (Ed25519) and expose public key; reuse pattern from index `signing.ts`. |

---

## 12. `/agent` UI changes

Extend, don't break, the existing runner.

**Control Panel additions**
- After a task is configured, a **"Save as Agent"** action opens a small form: name, description, tags, required apps (auto-suggested from tools the run used), visibility.
- Saved agents appear in a new **"My Agents"** drawer/tab (reuses the Execution History sidebar styling).

**Agent detail / publish**
- Per-agent: **Publish to NANDA** button → calls `/api/agents/:id/publish`.
- On success show the **locator** `urn:ai:domain:agentos.app:agent:<slug>`, a copy button, the card URL, and a "View in directory" link.
- States surfaced from `nanda_status`: `draft → publishing → published / failed`, plus **Unpublish**.

**Import affordance**
- `/agent?import=<slug>` (and `?import=<urn>`) opens the import confirmation → calls `/api/agents/import` → drops a private clone into "My Agents" and nudges to connect required apps in `/profile`.

**Reuse existing primitives:** the new publish/status chips mirror the existing Agent Status Card; the directory link list mirrors Execution History rows.

---

## 13. Environment variables (add to `.env.example`)

```env
# --- NANDA publishing ---
NANDA_ENABLED=true
NANDA_RUNTIME_ENABLED=true
NANDA_PUBLIC_BASE_URL=https://agentos.app
NANDA_REGISTRY_BASE_URL=https://agentos.app/api/nanda   # what the Index points to
NANDA_INDEX_API_URL=https://api.nandaindex.org
NANDA_ORG_DOMAIN=agentos.app
NANDA_ORG_ID=                                           # filled after onboarding script
NANDA_PROVIDER_NAME=Paramarsh Labs

# Optional: mirror into an external nanda-registry instead of / in addition to self-registry
NANDA_EXTERNAL_REGISTRY_URL=
NANDA_EXTERNAL_REGISTRY_JWT=

# Optional Phase 2: signed AgentFacts (Ed25519, base64)
NANDA_SIGNING_PRIVATE_KEY=
```

---

## 14. New files

```
app/api/agents/route.ts                         # GET list, POST create
app/api/agents/[id]/route.ts                    # GET, PATCH, DELETE
app/api/agents/[id]/run/route.ts                # owner run (uses owner integrations)
app/api/agents/[id]/publish/route.ts            # POST publish, DELETE unpublish
app/api/agents/import/route.ts                  # clone from locator/cardUrl

app/api/nanda/.well-known/ai-catalog.json/route.ts
app/api/nanda/agents/route.ts                   # catalog
app/api/nanda/agents/search/route.ts
app/api/nanda/agents/[slug]/route.ts            # CatalogEntry
app/api/nanda/agents/[slug]/card/route.ts       # A2A card

app/api/a2a/agents/[slug]/route.ts              # sandbox runtime (A2A-lite)

lib/agents/types.ts
lib/agents/repo.ts                              # Supabase data access (service-role for public reads)
lib/agents/runtime.ts                           # owner vs sandbox execution; wraps /api/agent execute
lib/nanda/config.ts                             # env-driven config
lib/nanda/card.ts                               # buildAgentCard
lib/nanda/catalog.ts                            # toCatalogEntry, buildCatalogDocument
lib/nanda/publish.ts                            # publish/unpublish/validate
lib/nanda/index-client.ts                       # ensureIndexOrg, resolve locator
lib/nanda/registry-client.ts                    # optional external-registry mirror

scripts/nanda-onboard-org.ts                    # one-time org registration runbook

supabase/migrations/0xx_agents.sql

components/agent/SaveAgentDialog.tsx
components/agent/PublishPanel.tsx
components/agent/MyAgentsDrawer.tsx
```

---

## 15. Implementation order

1. **DB + types** — migration, `lib/agents/types.ts`, `lib/agents/repo.ts`.
2. **Owner CRUD** — `/api/agents` + `/api/agents/[id]`; wire `/agent` "Save as Agent" + My Agents drawer.
3. **Owner run** — `/api/agents/[id]/run` reusing the existing `/api/agent` execute pipeline bound to a saved agent.
4. **Card + catalog builders** — `lib/nanda/{config,card,catalog}.ts`.
5. **Public registry surface** — `/api/nanda/*` routes + well-known rewrite. Validate against `nanda-index-v2/web` resolver shapes.
6. **Org onboarding** — `scripts/nanda-onboard-org.ts`; perform DNS TXT + email verify; capture `NANDA_ORG_ID`.
7. **Publish flow** — `lib/nanda/publish.ts` + `/api/agents/[id]/publish` + `PublishPanel`. End-to-end: publish → resolve via Index → fetch card.
8. **Sandbox runtime** — `/api/a2a/agents/[slug]` with rate limits, step/token caps, `needs_integration` path.
9. **Consume/clone** — `/api/agents/import` + `/agent?import=` deep link.
10. **Optional mirror** — `registry-client.ts` push/update/delete behind `NANDA_EXTERNAL_REGISTRY_URL`.
11. **Phase 2** — full A2A JSON-RPC, signed AgentFacts.

---

## 16. Testing

| Layer | Tests |
|---|---|
| Unit | slug derivation/validation; `buildAgentCard` / `toCatalogEntry` shapes; `assertPublishable` |
| API | CRUD authz (owner-only); public reads filter by visibility+status; 404 on private |
| NANDA contract | `GET /api/nanda/agents/:slug` returns valid `CatalogEntry`; card validates against A2A schema; well-known reachable at both paths |
| Resolution e2e | publish → `GET {INDEX}/api/v1/resolve?locator=urn:ai:domain:agentos.app:agent:<slug>` → follow `registry_url` → fetch CatalogEntry → fetch card |
| Runtime | sandbox never touches owner connections; `needs_integration` returned with `importUrl`; rate limit + caps enforced |
| Consume | import by locator and by cardUrl creates a private clone owned by caller |

---

## 17. Open questions

1. **Slug namespace** — org-global slugs, or namespace by user (`<user>/<agent>`)? Global is simpler for URNs; namespacing avoids contention if many users publish. *Recommend global + reserved list for v1.*
2. **Sandbox depth** — should public invocation actually execute (cost) or only return the plan + `importUrl`? *Recommend: cheap deterministic plan + capped single run; full runs gated behind clone.*
3. **External registry** — do you actually want a shared `nanda-registry` in the loop, or is self-registry enough for the directory listing you need? (Self-registry already makes you discoverable via the Index.)
4. **AgentFacts signing** — needed for v1 trust, or fine to defer to Phase 2?
5. **Visibility default on publish** — promote `private → public`, or require explicit `unlisted`/`public` choice in the publish dialog? *Recommend explicit choice.*