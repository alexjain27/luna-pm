# Luna PM

Project management SaaS for service providers (e.g. interior designers) to manage client projects, tasks, and deliverables. Two surfaces: Admin dashboard and Client portal.

## Stack

- Next.js 16, React 19, TypeScript 5
- Prisma 6 + PostgreSQL
- NextAuth 4 (email magic links)
- Tailwind CSS 4

## Architecture

- **App Router** with `src/app/` directory
- **Server components** with direct Prisma queries for reads — no separate API layer for fetching data
- **API routes** in `src/app/api/` for mutations (create, update, delete)
- **Prisma singleton** at `src/lib/prisma.ts`
- **Auth config** at `src/auth.ts`
- **Path alias**: `@/*` maps to `./src/*`
- **Two layouts**: `/admin` (admin nav + chrome) and `/client` (client portal)

## Conventions

- Use Tailwind utility classes, no component library
- Minimal zinc-based color palette with accent colors for status badges
- Server-side data fetching in page components (async page functions)
- Seed data in `prisma/seed.js` (plain JS, not TS)

## Specs

Feature specs live in `docs/`. Always read the relevant spec before implementing a feature.

- `docs/architecture.md` — Overarching architecture, conventions, and patterns. **Read this first.**
- `docs/task-hierarchy.md` — Client > Project > List > Task hierarchy and access model
- `docs/file-asset-management.md` — Folder/file structure and visibility rules

When I write new specs, they will go in `docs/` following the same pattern.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (use to verify no errors)
npm run lint             # ESLint
npm run db:generate      # Generate Prisma client after schema changes
npm run db:migrate       # Run migrations (prompts for name)
npm run db:seed          # Seed database
npm run db:reset         # Reset DB + reseed
```

## Workflow

1. Read the relevant spec in `docs/` before starting work
2. Make schema changes in `prisma/schema.prisma`, then run `npm run db:generate` and `npm run db:migrate`
3. Update `prisma/seed.js` if new models need seed data
4. Implement server components for reads, API routes for writes
5. Run `npm run build` to verify no TypeScript or build errors
