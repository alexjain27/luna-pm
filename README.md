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
