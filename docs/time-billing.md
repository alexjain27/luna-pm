# Time Tracking, Expenses & Invoicing

This document specifies Luna PM's built-in time tracking, expense logging, reporting, and invoicing — a Harvest-style feature set that lives inside the existing Workspace > Project > Task hierarchy.

Read `docs/architecture.md` first. Everything here follows its conventions (server components for reads, API routes for writes, `router.refresh()` after mutations).

## Context & Constraints

- **Single tenant.** One organization runs one Luna PM instance. There is no Organization model; org-wide settings live in a single `BillingSettings` row.
- **Low volume.** A small team, tens of clients. No caching, no background jobs, no pre-aggregated rollups. Reports query raw rows and aggregate in JS.
- **One currency.** Configured in `BillingSettings` (default `USD`). No multi-currency.
- **Clients are CLIENT workspaces.** Invoices are addressed to a CLIENT workspace. COMPANY workspaces can track time (internal work) but are never invoiced.

## Concepts

| Concept       | Description |
|---------------|-------------|
| Time entry    | Minutes a user spent on a project (optionally a specific task) on a given date. Billable or not. |
| Timer         | A time entry that is currently running. One running timer per user. |
| Hourly rate   | Resolved per (project, user) and snapshotted onto each time entry when it is saved. |
| Expense       | A cost a user incurred for a project (with optional receipt). Billable or not. |
| Invoice       | A bill to a CLIENT workspace, built from unbilled billable time and expenses, plus free-form line items. |

---

## Data Model

### Units

- **Durations** are stored as `Int` minutes.
- **Money** is stored as `Int` cents. Never use floats for money.
- **Dates** for time entries and expenses are calendar days, stored as `@db.Date`.
- Invoice line item `quantity` is a `Float` (hours to 2 decimal places, or a unit count). `amountCents` is stored, computed as `round(quantity * unitPriceCents)`.

### BillingSettings (singleton)

| Column            | Type    | Notes |
|-------------------|---------|-------|
| id                | String  | Always `"default"` |
| companyName       | String  | Shown on invoices |
| companyAddress    | String? | Shown on invoices |
| currency          | String  | ISO 4217 code, default `USD` |
| invoicePrefix     | String  | Default `INV-` |
| nextInvoiceNumber | Int     | Default `1001`. Incremented atomically when an invoice is created. |
| defaultTaxRate    | Float   | Percent, default `0` |
| paymentTermsDays  | Int     | Default `30`. Due date = issue date + terms. |
| invoiceNotes      | String? | Default footer notes (payment instructions) |

Read via `getBillingSettings()` in `src/lib/billing.ts`, which upserts the row if missing.

### User (updated)

| Column            | Type | Notes |
|-------------------|------|-------|
| defaultRateCents  | Int? | Fallback billable rate for this person |

### Project (updated)

| Column           | Type    | Notes |
|------------------|---------|-------|
| billable         | Boolean | Default `true`. New time entries on this project default to billable. Non-billable projects force entries to non-billable. |
| hourlyRateCents  | Int?    | Project default rate |
| budgetMinutes    | Int?    | Optional hours budget, shown as progress |

### ProjectMemberRate

Per-person override of the project rate.

| Column          | Type   | Notes |
|-----------------|--------|-------|
| projectId       | String | FK |
| userId          | String | FK |
| hourlyRateCents | Int    | |

Unique on `(projectId, userId)`.

### Rate resolution

When a time entry is created, or its project/user changes, its `rateCents` is set to the first non-null of:

1. `ProjectMemberRate(project, user).hourlyRateCents`
2. `Project.hourlyRateCents`
3. `User.defaultRateCents`
4. `0`

Changing a rate later does **not** rewrite existing entries. Billable amount of an entry = `round(minutes / 60 * rateCents)` when billable, else `0`.

### TimeEntry

| Column         | Type      | Notes |
|----------------|-----------|-------|
| userId         | String    | FK User (org user) |
| projectId      | String    | FK Project. Required. |
| taskId         | String?   | FK Task. Must belong to the project. |
| date           | Date      | The day the work is attributed to |
| minutes        | Int       | Accumulated duration, excluding the currently running segment |
| notes          | String?   | |
| billable       | Boolean   | |
| rateCents      | Int       | Snapshot (see rate resolution) |
| timerStartedAt | DateTime? | Non-null while the timer is running |
| invoiceId      | String?   | Set when billed. Locked while set. |

### ExpenseCategory

| Column | Type   | Notes |
|--------|--------|-------|
| name   | String | Unique. e.g. Materials, Travel, Samples, Delivery |

### Expense

| Column          | Type    | Notes |
|-----------------|---------|-------|
| userId          | String  | FK User |
| projectId       | String  | FK Project |
| categoryId      | String  | FK ExpenseCategory |
| date            | Date    | |
| amountCents     | Int     | |
| notes           | String? | |
| billable        | Boolean | |
| receiptS3Key    | String? | Uploaded via the existing presigned-URL flow (`/api/files/upload-url`) |
| receiptFilename | String? | |
| invoiceId       | String? | Set when billed. Locked while set. |

### Invoice

| Column      | Type          | Notes |
|-------------|---------------|-------|
| number      | String        | Unique. `invoicePrefix + nextInvoiceNumber` at creation. |
| workspaceId | String        | FK Workspace (must be CLIENT) |
| status      | InvoiceStatus | `DRAFT`, `SENT`, `PAID`, `VOID` |
| subject     | String?       | |
| issueDate   | Date          | |
| dueDate     | Date          | |
| periodStart | Date?         | Billing period used to import time/expenses |
| periodEnd   | Date?         | |
| taxRate     | Float         | Percent |
| notes       | String?       | |
| sentAt      | DateTime?     | |
| paidAt      | DateTime?     | |

Totals are **derived**, not stored: `subtotal = Σ lineItem.amountCents`, `tax = round(subtotal * taxRate / 100)`, `total = subtotal + tax`.

"Overdue" is derived: `status = SENT and dueDate < today`.

### InvoiceLineItem

| Column         | Type         | Notes |
|----------------|--------------|-------|
| invoiceId      | String       | FK (cascade delete) |
| kind           | LineItemKind | `SERVICE`, `EXPENSE`, `OTHER` |
| description    | String       | |
| quantity       | Float        | Hours for SERVICE, 1 for EXPENSE, free for OTHER |
| unitPriceCents | Int          | |
| amountCents    | Int          | `round(quantity * unitPriceCents)` |
| order          | Int          | |

---

## Behavior

### Timer

- Starting a timer on an entry stops any other running timer for that user first (folding its elapsed time into `minutes`).
- `POST /api/time-entries` with `startTimer: true` creates an entry for today with `minutes` (default 0) and starts it.
- Stopping: `minutes += floor((now - timerStartedAt) / 60s)`, `timerStartedAt = null`.
- The UI shows elapsed time live as `minutes + (now - timerStartedAt)`.
- A running entry can still have its notes/task edited; editing `minutes` on a running entry stops it first.

### Locking

- Entries and expenses with `invoiceId` set cannot be edited or deleted (API returns `409`).
- Deleting a `DRAFT` invoice, or voiding an invoice, releases its entries and expenses (`invoiceId = null`).
- `SENT`/`PAID` invoices cannot be deleted, only voided.

### Creating an invoice from tracked work

`POST /api/invoices` with `{ workspaceId, periodStart?, periodEnd?, projectIds?, includeTime, includeExpenses }`:

1. Collect **unbilled, billable** time entries (`invoiceId = null`, `billable = true`, `timerStartedAt = null`) and expenses for the workspace's projects (optionally filtered by `projectIds`) within the period.
2. Group time entries by **(project, task, rate)** into one `SERVICE` line each: description `"<Project> — <Task or 'General'>"`, quantity = total hours (2dp), unit price = rate.
3. One `EXPENSE` line per expense: `"<Project> — <Category>: <notes>"`, quantity 1.
4. Mark the collected rows with the new `invoiceId`.
5. All of this happens in one Prisma transaction, together with incrementing `nextInvoiceNumber`.

An empty invoice (no imported rows) is allowed — the user can add `OTHER` lines by hand.

Line items are editable while the invoice is `DRAFT`. Editing a SERVICE/EXPENSE line's amount does not modify the underlying entries.

### Invoice status transitions

`DRAFT → SENT` (sets `sentAt`), `SENT → PAID` (sets `paidAt`), `SENT → DRAFT` (undo), `PAID → SENT` (undo), any → `VOID` (releases rows). Sending an email is out of scope; "Mark as sent" is manual.

### PDF

The invoice page (org and client portal) has a "Print / Save PDF" button that calls `window.print()`. Both layouts hide their chrome under `print:` styles, so only the invoice document prints. No PDF library dependency.

---

## UI — Org App

Nav gains: **Time**, **Expenses**, **Reports**, **Invoices**, **Billing settings** (under `/settings/billing`).

### `/time` — Timesheet

- Query params: `date=YYYY-MM-DD` (default today), `view=day|week` (default `day`), `userId` (default current user; any org user can view/edit another's timesheet).
- **Day view:** day strip for the week with daily totals; list of the day's entries (project, task, notes, duration, start/stop button, edit, delete); "New entry" form with project, task (filtered to project), notes, duration (`1:30`, `1.5`, `90m`) and a "Start timer" option when duration is empty and the day is today.
- **Week view:** grid with one row per (project, task) seen that week, one column per day, cell = minutes total, row and column totals. A cell with zero or one unlocked, non-running entry is directly editable (creates/updates/deletes that entry). Cells with multiple entries are read-only and link to the day. "Add row" picks a project/task.
- A running timer is shown in the org header as a small pill linking to `/time`.

### `/expenses`

List for a date range (default: this month) with filters for user/project; create form with project, category, date, amount, notes, billable, receipt upload; edit/delete for unlocked rows.

### `/reports`

- Filters: date range (presets: this week, last week, this month, last month, this year, custom), workspace, project, user, billable (all/billable/non-billable).
- Summary tiles: total hours, billable hours, billable amount, uninvoiced amount.
- Group-by tabs: **Clients** (workspace), **Projects**, **Tasks**, **Team**. Each row: hours, billable hours, billable amount.
- Detailed entries table below.
- **Export CSV** links to `GET /api/reports/time?…` with the same params. This and the receipt redirect are the only read API routes — both exist because a file download can't come from a server component.
- Expenses report: same filters, grouped by project and category.

### `/invoices`

- List with status filter tabs (All, Draft, Outstanding, Overdue, Paid, Void), showing number, client, issue date, due date, total, status. Totals of outstanding and overdue at top.
- `/invoices/new`: pick CLIENT workspace, period, projects, and include time/expenses. Shows a preview of unbilled totals per project before creating.
- `/invoices/[id]`: header (client, dates, status, actions), editable line items while DRAFT (add/edit/delete), tax rate, notes, subject. Lists the time entries/expenses attached.

### Project page

New "Time & budget" sidebar card: hours logged, billable amount, uninvoiced amount, budget progress bar (if `budgetMinutes`), and settings: billable toggle, project rate, budget hours, per-person rate overrides.

### Task page

Shows hours logged on the task (and vs `timeEstimate` minutes if set) and a "Start timer" button that starts a timer for the current user on that task.

### `/settings/billing`

Company name/address, currency, invoice prefix and next number, default tax rate, payment terms, default invoice notes; per-user default rates; expense categories (add/rename/delete-if-unused).

---

## UI — Client Portal (read-only)

- Nav gains **Invoices**.
- Project page shows a "Time" section: total billable hours logged on the project and a list of **billable** entries (date, person, task, notes, hours). Non-billable time is internal and never shown. No rates or amounts are shown on this list.
- `/client/[slug]/invoices`: list of `SENT`, `PAID` invoices (never `DRAFT` or `VOID`) for the workspace.
- `/client/[slug]/invoices/[id]`: read-only invoice view with a print link.

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/time-entries` | Create entry (optionally start timer) |
| PATCH  | `/api/time-entries/[id]` | Update fields; `{ action: "start" \| "stop" }` controls the timer |
| DELETE | `/api/time-entries/[id]` | Delete |
| POST   | `/api/expenses` | Create |
| PATCH  | `/api/expenses/[id]` | Update |
| DELETE | `/api/expenses/[id]` | Delete |
| GET    | `/api/expenses/[id]/receipt` | Redirect to a presigned receipt URL |
| POST   | `/api/expense-categories` | Create |
| PATCH  | `/api/expense-categories/[id]` | Rename |
| DELETE | `/api/expense-categories/[id]` | Delete (409 if in use) |
| POST   | `/api/invoices` | Create from tracked work |
| PATCH  | `/api/invoices/[id]` | Update fields / status |
| DELETE | `/api/invoices/[id]` | Delete draft |
| POST   | `/api/invoices/[id]/line-items` | Add line |
| PATCH  | `/api/invoices/[id]/line-items/[lineId]` | Edit line |
| DELETE | `/api/invoices/[id]/line-items/[lineId]` | Delete line |
| PATCH  | `/api/projects/[id]/billing` | Billable flag, rate, budget |
| PUT    | `/api/projects/[id]/member-rates` | Upsert/remove a person's rate (`rateCents: null` removes) |
| PATCH  | `/api/settings/billing` | Update BillingSettings |
| PATCH  | `/api/users/[id]` | Update `defaultRateCents` |
| GET    | `/api/reports/time` | CSV export |

## Auth Note

The app does not yet enforce sessions. Like existing pages, the "current user" is resolved by `getCurrentUser()` in `src/lib/current-user.ts`, which uses the NextAuth session when present and otherwise falls back to the first ADMIN user. When auth is wired up, that helper is the single place to change.

## Out of Scope (v1)

Candidates for v2 (these would bring parity with commercial solo-tier tools such as Keito Solo): estimates, recurring invoices / retainers, online payment via Stripe.

Also out of scope: approvals of timesheets, partial payments, multi-currency, emailing invoices, cost rates / profitability, idle detection, desktop/mobile apps.
