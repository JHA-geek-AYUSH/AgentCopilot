# AgentOS — Personal Agent OS

AgentOS is an AI-powered personal operating system that turns natural language commands into real work across apps, memory, tools, and developer environments. Powered by Claude Sonnet and built on Next.js 16.

---

## What it does

AgentOS gives you a unified interface to run tasks, automate workflows, write code, and manage memory — all driven by a single AI agent that remembers context across sessions.

---

## Core Features

### Chat (`/chat`)
Talk to your agent in natural language. AgentOS understands your intent — whether you want to store something in memory, recall past context, execute a task, or get a direct answer — and routes it to the right handler automatically.

### Tasks (`/tasks`)
Every request that requires multi-step execution becomes a tracked task. Tasks are broken down into a step-by-step plan by Claude, executed tool-by-tool, and stored in Supabase with full status tracking (pending → running → success / failed).

### Autonomous Agent (`/agent`)
Run any task on autopilot. The agent loops Claude through a task repeatedly on three schedules:
- **Continuous** — runs every 30 seconds until stopped
- **Timed** — runs for a set duration then stops
- **Interval** — runs every N minutes like a cron job

- <img width="1513" height="1017" alt="image" src="https://github.com/user-attachments/assets/9eb62248-4cb6-40e4-ab16-fa37d6bcdf4a" />


While running, you can watch the agent's execution plan, reasoning thoughts, and confidence scores in real time.

### Memory (`/memory`)
A persistent knowledge store for your agent. Memories are typed (Fact, Preference, Context, Interaction, Task Summary, Output), importance-scored, and searchable. Backed by Supabase with optional semantic search via HydraDB.
<img width="1520" height="540" alt="image" src="https://github.com/user-attachments/assets/95f680b3-ee9e-4664-861c-6ac1124bc90e" />
<img width="1137" height="1018" alt="image" src="https://github.com/user-attachments/assets/d84d58aa-7a2c-4518-8720-2f9cbf7e7ddf" />
<img width="1531" height="951" alt="image" src="https://github.com/user-attachments/assets/67022453-56f8-4cfe-a1f7-71bbca490bde" />
<img width="1086" height="643" alt="image" src="https://github.com/user-attachments/assets/9da0edb7-9a01-486b-a609-739b85b84241" />
<img width="1469" height="853" alt="image" src="https://github.com/user-attachments/assets/b9204fcf-e0a5-4d6f-9df9-619eac19115a" />
<img width="422" height="689" alt="image" src="https://github.com/user-attachments/assets/22cedbe9-3dcd-4e86-b34f-aa2291a6bdbb" />
<img width="1427" height="918" alt="image" src="https://github.com/user-attachments/assets/2ba80996-9d22-4e63-9acb-198f583f525f" />

### Dev Environment (`/dev`)
A browser-based developer workspace with:
- Monaco code editor with syntax highlighting
- File tree and file management
- Integrated terminal (xterm.js)
- Git operations (commit, push, pull, branch)
- WebContainer for running code in the browser

### Profile & Integrations (`/profile`)
Connect third-party apps via Composio — Gmail, GitHub, Slack, Twitter/X, Google Calendar, Notion, Discord, and 250+ more. Once connected, your agent can read emails, create issues, post tweets, schedule events, and more — all from a single chat message.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| AI Model | Claude Sonnet 4.6 (Anthropic SDK) |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| Memory | Supabase + HydraDB (semantic search) |
| Integrations | Composio (250+ apps via OAuth) |
| Editor | Monaco Editor + WebContainers |
| Terminal | xterm.js |
| UI | Tailwind CSS v4, shadcn/ui, Framer Motion |
| Runtime | Bun |

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/chat` | AI chat interface |
| `/tasks` | Task history and status |
| `/agent` | Autonomous agent runner |
| `/memory` | Persistent memory store |
| `/dev` | Browser-based dev environment |
| `/profile` | Settings and app integrations |

---

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, Clerk keys, Supabase URL/keys

# Set up the database
# Run supabase/clerk-migration.sql in your Supabase SQL Editor

# Start dev server
bun dev

# Production build
bun run build
bun start
```

### Required Environment Variables

```env
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI
ANTHROPIC_API_KEY=

# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Optional Integrations

```env
COMPOSIO_API_KEY=          # App integrations (Gmail, GitHub, Slack, etc.)
NEXT_PUBLIC_HYDRA_DB_API_KEY=  # Semantic memory search
NEXT_PUBLIC_FIRECRAWL_API_KEY= # Web knowledge ingestion
GITHUB_TOKEN=              # GitHub access
TWITTER_API_KEY=           # Twitter/X access
SMTP_HOST=                 # Email sending
```
