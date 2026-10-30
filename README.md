# Luna PM

A bespoke project management tool built for [aviviandesigns.com](https://aviviandesigns.com) — an interior design studio that needed a purpose-built way to manage client projects, tasks, and deliverables without the overhead of a general-purpose SaaS platform.

## The Idea

Most project management SaaS tools are designed to be everything to everyone. That generality comes with a real cost: bloated feature sets, configuration complexity, per-seat pricing that grows as the business grows, and UX shaped around the lowest common denominator across industries and team sizes.

Luna PM is a test of a different hypothesis:

> **Agentic AI tooling can lower the cost of bespoke software to the point where a small business is better served by software built exactly for them than by a general SaaS product configured to approximate their needs.**

The economics work differently when AI can accelerate the build. The upfront cost of a custom tool drops dramatically, and the ongoing cost is infrastructure — not per-seat licensing. For a small studio like aviviandesigns.com, that math can easily come out ahead of tools like Asana, Monday, or Notion.

## The Broader Vision

This project is also a proof of concept for a scaffold-driven approach to bespoke software:

- A **scaffold** — a curated starting point of architecture decisions, conventions, and initial prompts — replaces the blank-page problem.
- **Agentic AI** handles the implementation, accelerating development from weeks to days.
- The result is software that fits the business precisely: right data model, right workflows, right UX — no unused tabs, no irrelevant settings, no pricing tiers.

The hypothesis is that productivity software — project management, CRM, invoicing, scheduling — is a category ripe for this model. The domain knowledge is well-understood, the requirements are tractable, and the gap between "what SaaS provides" and "what this specific business needs" is often large enough to justify building.

## AI Integration — Bring Your Own Key

Luna PM is not an AI app, but it is designed to be augmented and managed agentically.

The idea: once your projects and tasks live in a structured system, an LLM can become a useful interface to that data. You should be able to ask "what's the status of the kitchen project?" or say "create a task for the mood board review, due Friday" and have it just work — without switching to a separate tool or copying data around.

Rather than bundling a specific AI provider and billing for it, Luna PM uses a **Bring Your Own Key (BYOK)** model:

- Each workspace can be configured with an API key from any supported LLM provider (Anthropic, OpenAI, Google)
- The key is stored encrypted at rest and never returned to the client after being saved
- All LLM calls are routed through a single server-side abstraction — swapping providers is a config change, not a code change
- The app works identically with or without a key configured — AI features are additive, not load-bearing

This keeps the model simple: no LLM billing infrastructure, no per-seat AI charges, and the business stays in control of which provider they use and how much they spend.

Planned agentic capabilities (natural language task creation, project status summaries, workspace reports) are designed as discrete server actions — simple request/response, no streaming or persistent sessions required.

## What It Does

Luna PM gives aviviandesigns.com two surfaces:

- **Admin dashboard** — manage clients, projects, task lists, and individual tasks. Assign statuses, upload files, and track progress across all active work.
- **Client portal** — a clean, read-focused view for clients to see their project status, review deliverables, and stay informed without needing access to the full admin tool.

## Stack

- **Next.js 16 + React 19 + TypeScript 5** — App Router, server components for reads, API routes for mutations
- **Prisma 6 + PostgreSQL** — typed database access with migrations
- **NextAuth 4** — magic link email authentication
- **Tailwind CSS 4** — utility-first styling, no component library

## Local Development

```bash
npm install
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed with sample data
npm run dev              # Start dev server at localhost:3000
```

Other useful commands:

```bash
npm run build            # Production build (TypeScript + lint check)
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:reset         # Reset DB and reseed from scratch
```

## Deployment (AWS via SST)

`sst.config.ts` deploys the app to AWS in `us-west-2` with [SST](https://sst.dev): the Next.js app on Lambda + CloudFront (via OpenNext), the private S3 assets bucket, and a nightly database backup. The app reaches S3 through its IAM role, so no AWS access keys are stored in its environment.

The database is [Neon](https://neon.tech) serverless Postgres, outside AWS. One Neon project (region AWS us-west-2) holds a branch per stage, `production` and `staging`. It suspends when idle, so the first request after a quiet spell takes about a second longer.

Prerequisites: AWS credentials for the target account in your shell, the Neon project and branches, and an SMTP server for magic-link email (for example Amazon SES SMTP credentials in us-west-2).

First deploy of a stage (`production` here; repeat with `--stage staging`):

```bash
# 1. Secrets (once per stage). DatabaseUrl is the branch's connection string from
#    the Neon console; the config derives the pooled URL for the app from it.
npx sst secret set DatabaseUrl "postgresql://USER:PASS@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require" --stage production
npx sst secret set NextAuthSecret "$(openssl rand -base64 32)" --stage production
npx sst secret set EmailServer "smtp://USER:PASS@email-smtp.us-west-2.amazonaws.com:587" --stage production
npx sst secret set EmailFrom "Luna PM <noreply@yourdomain.com>" --stage production

# 2. Deploy — prints the app URL
npx sst deploy --stage production

# 3. Run migrations against the branch's direct (unpooled) connection
npx sst shell --stage production --target Backup -- npx prisma migrate deploy
```

Later deploys: run `npx sst deploy --stage production`, then step 3 whenever there are new migrations.

### Backups

A Fargate task runs `pg_dump` every night at 10:00 UTC and writes a custom-format dump to the stage's `Backups` bucket under `backups/`, where it expires after 30 days. This is on top of Neon's own point-in-time restore. To restore a dump into an empty database:

```bash
aws s3 cp s3://<backupBucketName>/backups/<timestamp>.dump backup.dump
pg_restore --no-owner --no-acl --dbname "<direct connection string>" backup.dump
```

### Cost and removal

The `production` stage is protected and its resources (including both buckets) are retained on removal; any other stage is torn down by `npx sst remove --stage <name>`. On Neon's free plan, idle running cost is close to zero: Lambda, CloudFront and S3 usage, about $0.50/month per stage for the VPC's private DNS zone, and a minute of Fargate per night for the backup.

## Project Structure

```
src/
  app/
    (org)/               # Admin dashboard routes
    client/[slug]/       # Client portal routes
    api/                 # Mutation endpoints
    auth/                # Sign-in and magic link verify
  components/            # Shared UI components
  lib/                   # Prisma singleton, utilities
  auth.ts                # NextAuth config
prisma/
  schema.prisma          # Database schema
  seed.js                # Seed data
docs/                    # Feature specs
```

## Docs

Feature specs live in `docs/` and describe the data model and business rules for each major area:

- [`docs/task-hierarchy.md`](docs/task-hierarchy.md) — Client > Project > List > Task hierarchy
- [`docs/file-asset-management.md`](docs/file-asset-management.md) — Folder and file structure, visibility rules
