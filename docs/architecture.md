# Architecture

This document describes the architectural conventions for Luna PM. Follow these patterns consistently. When implementing a new feature, read this doc first and adhere to the patterns here before reading framework docs or inventing new patterns.

---

## Guiding Principles

- **Server-first.** Fetch data in server components. Avoid client-side data fetching unless required for interactivity.
- **Simple over clever.** No unnecessary abstraction. If a pattern only appears once, don't abstract it.
- **Minimal surface area.** No separate API layer for reads. No global state management library. No component library.
- **Colocate by feature.** Keep route-specific components close to the route, not in a global components folder.

---

## Directory Structure

```
src/
  app/
    (org)/               # Admin/org routes — wrapped in org layout
      layout.tsx         # Org nav + chrome
      page.tsx           # Dashboard
      workspaces/
      projects/
      tasks/
      lists/
    client/
      [slug]/            # Client portal — wrapped in client layout
        layout.tsx
        page.tsx
        projects/
        tasks/
    api/                 # Mutation endpoints only (POST, PATCH, DELETE)
      workspaces/
      projects/
      tasks/
      lists/
    auth/                # Sign-in and magic link pages
    layout.tsx           # Root layout (fonts, global CSS)
    globals.css
  components/            # Shared UI only — used across 2+ routes
  lib/
    prisma.ts            # Prisma singleton (import this everywhere)
    utils.ts             # Pure utility functions
  auth.ts                # NextAuth config
```

New route-specific components belong next to the route file, not in `src/components/`. Only promote to `src/components/` if a component is used across multiple routes.

---

## Data Fetching

### Reads — Server Components

All data fetching for page rendering happens in `async` server components using Prisma directly. There is no separate API layer for reads.

```ts
// src/app/(org)/projects/[id]/page.tsx
import prisma from '@/lib/prisma'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: params.id },
    include: { lists: true, tasks: true },
  })

  return <ProjectDetail project={project} />
}
```

- Use `findUniqueOrThrow` and `findFirstOrThrow` — let them throw on missing records; Next.js will handle the error boundary.
- Pass fetched data down as props to child components.
- Never fetch data inside a `useEffect`.

### Writes — API Routes

All mutations (create, update, delete) go through API routes in `src/app/api/`. These are standard Next.js route handlers.

```ts
// src/app/api/projects/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  // validate, then write
  const project = await prisma.project.create({ data: { ... } })
  return NextResponse.json(project, { status: 201 })
}
```

- Return appropriate HTTP status codes.
- Validate required fields and return `400` with a message on bad input.
- Return `404` with a message when a referenced resource doesn't exist.
- On success: return the created/updated resource or redirect.

### Client-side mutations

Client components call API routes via `fetch`. After a successful mutation, call `router.refresh()` to re-render server components with fresh data — do not manage local state manually.

```ts
'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()

async function handleSubmit(data) {
  await fetch('/api/projects', { method: 'POST', body: JSON.stringify(data) })
  router.refresh()
}
```

---

## Routing

### Org app — `(org)` route group

The main application for organization users lives under the `(org)` route group. This group applies the org layout (nav sidebar + chrome) without adding a URL segment.

- Routes: `/`, `/workspaces`, `/workspaces/[id]`, `/projects`, `/projects/[id]`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/lists`
- All routes under `(org)` require an authenticated org user session.

### Client portal — `client/[slug]`

The client-facing portal is entirely separate from the org app. It uses a different layout and a different auth check (client session, not org session).

- Routes: `/client/[slug]`, `/client/[slug]/projects/[id]`, `/client/[slug]/tasks/[id]`
- The `[slug]` is the workspace slug — URL-friendly identifier for the CLIENT workspace.
- Client users can only access their own workspace. Return 404 for any other slug.

### API routes — `api/`

URL convention for API routes:

| Operation           | Method   | Path                              |
|---------------------|----------|-----------------------------------|
| Create resource     | POST     | `/api/[resource]`                 |
| Update resource     | PATCH    | `/api/[resource]/[id]`            |
| Delete resource     | DELETE   | `/api/[resource]/[id]`            |
| Nested create       | POST     | `/api/[resource]/[id]/[child]`    |
| Nested delete       | DELETE   | `/api/[resource]/[id]/[child]/[childId]` |

---

## Authentication

Auth is handled by NextAuth 4. Config lives in `src/auth.ts`. The API route is at `src/app/api/auth/[...nextauth]/route.ts`.

- **Magic links** — users receive an email with a sign-in link. No passwords.
- **Two session types:**
  - Org users: authenticated via email, can access the org app.
  - Client users: authenticated via email, restricted to their workspace's client portal.
- Always check the session in API routes before performing mutations. Return `401` if unauthenticated, `403` if the user lacks permission.
- In server components, use `getServerSession` to get the current session. Redirect to sign-in if not authenticated.

---

## Database

### Prisma singleton

Always import Prisma from `src/lib/prisma.ts`. Never instantiate `PrismaClient` directly in a route or component.

```ts
import prisma from '@/lib/prisma'
```

### Schema conventions

- Primary keys: `cuid` (e.g. `id String @id @default(cuid())`)
- All models have `createdAt` and `updatedAt` with `@default(now())` and `@updatedAt`.
- Foreign keys are named `[relation]Id` (e.g. `workspaceId`, `projectId`).
- Enums are `SCREAMING_SNAKE_CASE`.
- Model names are `PascalCase`.
- Field names are `camelCase`.

### Migrations

After any schema change:

```bash
npm run db:generate   # Regenerate Prisma client
npm run db:migrate    # Create and apply migration (prompts for a name)
```

Migration names should be short and descriptive: `add_workspace_slug`, `add_list_task_join`.

Never edit migration files after they've been applied. If you made a mistake, create a new migration to fix it.

### Seed data

`prisma/seed.js` is written in plain JS (not TypeScript). It creates a consistent set of test data for local development. After schema changes that add new models, add corresponding seed records.

```bash
npm run db:seed    # Seed without reset
npm run db:reset   # Drop, migrate, and reseed
```

---

## Styling

- **Tailwind CSS 4** — utility classes only. No custom CSS except in `globals.css` for resets and base styles.
- **No component library.** Build all UI from scratch with Tailwind.
- **Color palette:** zinc-based grays for structure, with small accent colors for status badges and interactive states. Keep the palette minimal.
- **Status badges:** use the `<StatusBadge>` component in `src/components/status-badge.tsx`.
- **Responsive design:** not a current requirement. Design for desktop viewport.

---

## TypeScript

- Strict mode is enabled. Fix type errors — do not use `any` or `@ts-ignore`.
- Infer types from Prisma where possible. Use `Prisma.ProjectGetPayload<{ include: { ... } }>` to type query results.
- Keep type definitions close to where they're used. Only add to a shared types file if a type is used across multiple files.

---

## Error Handling

- In server components: let Prisma `OrThrow` methods throw. Next.js error boundaries will catch unhandled errors.
- In API routes: wrap handler body in try/catch and return appropriate status codes and messages.
- In client components: show inline error states after failed `fetch` calls. Don't use alert dialogs for errors.
- Destructive operations (delete) must show a confirmation before proceeding.

---

## Deployment

### Goals

- **Cloud-agnostic** — the app must not be tightly coupled to any one cloud provider. Avoid vendor-specific APIs, SDKs, or platform primitives that would make migration painful.
- **Low cost** — suitable for a small business with low traffic. Optimize for idle cost, not peak throughput.
- **Easy to deploy** — minimal ops overhead. No Kubernetes, no managed orchestration.
- **Easy to migrate** — standard containerized runtime means the app can move to a different host without code changes.

### Target: AWS Amplify + Containerized Database

The primary deployment target is **AWS Amplify** (container-based, not the static/SSR hosting mode). Amplify runs the Next.js app as a Docker container, which keeps deployment straightforward and the runtime portable.

The database runs as a **PostgreSQL container** — either:
- A sidecar container if the hosting environment supports multi-container deployments, or
- A lightweight managed PostgreSQL instance (e.g. Amazon RDS for PostgreSQL on the free/micro tier, or a small Render/Railway Postgres instance).

The preference is a containerized PostgreSQL over a managed service when cost is the deciding factor. The only coupling to the database is the `DATABASE_URL` connection string — switching providers is a config change, not a code change.

### Docker

The app should be runnable as a single Docker container. A `Dockerfile` at the project root builds the Next.js app and serves it via the built-in Node.js server. The database is a separate container (not bundled into the app image).

A `docker-compose.yml` is provided for local development and simple self-hosted deployments — it spins up the app container and a PostgreSQL container together.

### Environment Variables

All environment-specific configuration is passed via environment variables. There are no hard-coded environment values in code. Required variables:

| Variable            | Description                                      |
|---------------------|--------------------------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string                     |
| `NEXTAUTH_URL`      | Public URL of the app (for auth callbacks)       |
| `NEXTAUTH_SECRET`   | Secret for signing session tokens                |
| `EMAIL_SERVER`      | SMTP connection string for magic link emails     |
| `EMAIL_FROM`        | From address for auth emails                     |

### Migrations on Deploy

Prisma migrations run as a step before the app starts. In the Docker entrypoint or deploy hook:

```bash
npx prisma migrate deploy   # applies pending migrations (non-interactive)
node server.js              # start the app
```

Never run `prisma migrate dev` in production — use `prisma migrate deploy`.

---

## LLM Integration — Bring Your Own Key (BYOK)

### Philosophy

Luna PM can support AI-powered agentic features (task creation from natural language, status summaries, project reporting, etc.) without maintaining or billing for API access itself. Instead, users provide their own API key from their preferred LLM provider. The application holds the key, routes requests through it, and never proxies usage through a shared Anthropic/OpenAI account.

This keeps the model simple:
- No LLM billing infrastructure required.
- No per-seat AI charges passed to the user.
- Users choose their own provider (Anthropic Claude, OpenAI, Google Gemini, etc.).
- The application works identically regardless of which provider key is configured.

### Database Schema

Each workspace can store one LLM configuration. This keeps AI context workspace-scoped — different workspaces could use different providers if needed.

**`WorkspaceLlmConfig` model** (to be added to schema when implementing):

| Column       | Type    | Notes                                                        |
|--------------|---------|--------------------------------------------------------------|
| id           | cuid    | Primary key                                                  |
| workspaceId  | String  | FK to Workspace. Unique (one config per workspace).          |
| provider     | String  | `anthropic`, `openai`, `google` (extensible, stored as string) |
| model        | String  | Model ID (e.g. `claude-sonnet-4-6`, `gpt-4o`, `gemini-2.0-flash`) |
| encryptedKey | String  | API key, encrypted at rest                                   |
| createdAt    | DateTime | Auto                                                        |
| updatedAt    | DateTime | Auto                                                        |

The API key must be **encrypted at rest** before writing to the database. Use a server-side encryption key (an additional environment variable, `LLM_ENCRYPTION_KEY`) to encrypt/decrypt. Never store or return the plaintext key to the client.

### Key Storage Rules

- The API key is write-only from the UI: the user can set or replace it, but never retrieve it after saving.
- The key is decrypted server-side only, at the moment it's needed to make an LLM call.
- API routes that invoke LLM features decrypt the key in memory and do not log it.

### LLM Client Abstraction

All LLM calls go through a single abstraction in `src/lib/llm.ts`. This function accepts a `WorkspaceLlmConfig` (with decrypted key) and a prompt, and routes the call to the appropriate provider SDK. This is the only place in the codebase that imports provider SDKs.

This means adding a new provider requires changing one file, not hunting through feature code.

### Agentic Features (Future)

Planned AI-powered capabilities, in rough priority order:

1. **Natural language task creation** — describe a task in plain text, the model extracts structured fields (name, due date, owner, list, etc.).
2. **Project status summary** — generate a human-readable summary of a project's current state (tasks complete, overdue, blocked).
3. **Workspace report** — roll up status across all active projects in a workspace for client-facing updates.
4. **Task suggestions** — given a project description, suggest a set of tasks and sublists.

Each feature is a discrete server action or API route. None of them require streaming or persistent agent sessions at this stage — simple request/response is sufficient.

### Settings UI

LLM configuration lives in workspace settings:
- Provider dropdown (Anthropic, OpenAI, Google).
- Model input (free text, so new models don't require a code change).
- API key field (password input, masked, write-only).
- A "Test connection" button that makes a minimal API call to verify the key works.
- Once a key is saved, the UI shows "API key configured" with a "Replace key" button — never shows the key value.

---

## Build Verification

Before considering any feature complete, run:

```bash
npm run build
```

This runs the TypeScript compiler and Next.js build. Fix all errors before marking work done. Do not suppress errors with type casts or `any`.
