import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDay, formatHours, formatMoney, getBillingSettings } from "@/lib/billing";
import {
  datePresets,
  filtersToQuery,
  parseReportFilters,
  queryExpenseReport,
  queryTimeReport,
  type TimeReportRow,
} from "@/lib/reports";
import { ReportFilters } from "@/components/report-filters";

const GROUPS = [
  { id: "clients", label: "Clients" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "team", label: "Team" },
  { id: "expenses", label: "Expenses" },
] as const;
type GroupId = (typeof GROUPS)[number]["id"];

function groupKey(e: TimeReportRow, by: GroupId): { key: string; label: string; sub?: string } {
  switch (by) {
    case "clients":
      return { key: e.project.workspace.id, label: e.project.workspace.name };
    case "projects":
      return { key: e.project.id, label: e.project.name, sub: e.project.workspace.name };
    case "tasks":
      return { key: e.task?.id ?? "none", label: e.task?.name ?? "General (no task)" };
    default:
      return { key: e.user.id, label: e.user.name ?? e.user.email ?? "" };
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseReportFilters(sp);
  const groupParam = Array.isArray(sp.group) ? sp.group[0] : sp.group;
  const group: GroupId = GROUPS.some((g) => g.id === groupParam) ? (groupParam as GroupId) : "clients";

  const [entries, expenses, workspaces, projects, users, settings] = await Promise.all([
    queryTimeReport(filters),
    group === "expenses" ? queryExpenseReport(filters) : Promise.resolve([]),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({
      select: { id: true, name: true, workspace: { select: { name: true } } },
      orderBy: [{ workspace: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    getBillingSettings(),
  ]);
  const money = (c: number) => formatMoney(c, settings.currency);

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
  const billableAmount = entries.reduce((s, e) => s + e.amountCents, 0);
  const uninvoiced = entries.filter((e) => !e.invoiceId).reduce((s, e) => s + e.amountCents, 0);

  const tiles = [
    { label: "Total hours", value: formatHours(totalMinutes) },
    {
      label: "Billable hours",
      value: formatHours(billableMinutes),
      sub: totalMinutes ? `${Math.round((billableMinutes / totalMinutes) * 100)}% billable` : undefined,
    },
    { label: "Billable amount", value: money(billableAmount) },
    { label: "Uninvoiced amount", value: money(uninvoiced) },
  ];

  const groups = new Map<string, { label: string; sub?: string; minutes: number; billableMinutes: number; amount: number }>();
  if (group !== "expenses") {
    for (const e of entries) {
      const g = groupKey(e, group);
      const row = groups.get(g.key) ?? { label: g.label, sub: g.sub, minutes: 0, billableMinutes: 0, amount: 0 };
      row.minutes += e.minutes;
      if (e.billable) row.billableMinutes += e.minutes;
      row.amount += e.amountCents;
      groups.set(g.key, row);
    }
  }
  const groupRows = [...groups.values()].sort((a, b) => b.minutes - a.minutes);

  const expenseGroups = new Map<string, { project: string; client: string; category: string; amount: number; billable: number }>();
  for (const x of expenses) {
    const key = `${x.projectId}|${x.categoryId}`;
    const row = expenseGroups.get(key) ?? {
      project: x.project.name,
      client: x.project.workspace.name,
      category: x.category.name,
      amount: 0,
      billable: 0,
    };
    row.amount += x.amountCents;
    if (x.billable) row.billable += x.amountCents;
    expenseGroups.set(key, row);
  }

  const query = filtersToQuery(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDay(filters.from)} – {formatDay(filters.to)}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/time?${query}`} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
            Export time CSV
          </a>
          <a href={`/api/reports/time?${filtersToQuery(filters, { kind: "expenses" })}`} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
            Export expenses CSV
          </a>
        </div>
      </div>

      <ReportFilters
        action="/reports"
        presets={datePresets().map((p) => ({ ...p }))}
        values={filters}
        workspaces={workspaces}
        projects={projects.map((p) => ({ id: p.id, name: `${p.workspace.name} — ${p.name}` }))}
        users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "" }))}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{t.value}</p>
            {t.sub && <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>}
          </div>
        ))}
      </section>

      <div>
        <div className="mb-4 flex gap-1 border-b border-border">
          {GROUPS.map((g) => (
            <Link
              key={g.id}
              href={`/reports?${filtersToQuery(filters, { group: g.id })}`}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                group === g.id
                  ? "-mb-px border border-border border-b-white bg-white text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </div>

        {group === "expenses" ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Project</th>
                  <th className="px-4 py-2 font-semibold">Category</th>
                  <th className="px-4 py-2 text-right font-semibold">Billable</th>
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {expenseGroups.size === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">No expenses in this range.</td></tr>
                )}
                {[...expenseGroups.values()].map((r) => (
                  <tr key={`${r.project}-${r.category}`} className="border-t border-zinc-200">
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-900">{r.project}</div>
                      <div className="text-xs text-zinc-400">{r.client}</div>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{r.category}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(r.billable)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 text-right font-semibold">Hours</th>
                  <th className="w-56 px-4 py-2 font-semibold">Billable hours</th>
                  <th className="px-4 py-2 text-right font-semibold">Billable amount</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">No time in this range.</td></tr>
                )}
                {groupRows.map((r) => {
                  const pct = r.minutes ? (r.billableMinutes / r.minutes) * 100 : 0;
                  return (
                    <tr key={`${r.label}-${r.sub ?? ""}`} className="border-t border-zinc-200">
                      <td className="px-4 py-2">
                        <div className="font-medium text-zinc-900">{r.label}</div>
                        {r.sub && <div className="text-xs text-zinc-400">{r.sub}</div>}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{formatHours(r.minutes)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 text-right font-mono text-xs tabular-nums text-zinc-600">
                            {formatHours(r.billableMinutes)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{money(r.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {group !== "expenses" && (
        <details className="rounded-xl border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">
            Detailed entries ({entries.length})
          </summary>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Project / Task</th>
                <th className="px-4 py-2 font-semibold">Notes</th>
                <th className="px-4 py-2 font-semibold">Person</th>
                <th className="px-4 py-2 text-right font-semibold">Hours</th>
                <th className="px-4 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-zinc-200">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDay(e.date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-zinc-900">{e.project.name}</div>
                    <div className="text-xs text-zinc-500">{e.task?.name ?? "General"}</div>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{e.notes}</td>
                  <td className="px-4 py-2 text-zinc-600">{e.user.name ?? e.user.email}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatHours(e.minutes)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {e.billable ? money(e.amountCents) : <span className="text-zinc-400">—</span>}
                    {e.invoice && (
                      <Link href={`/invoices/${e.invoice.id}`} className="ml-2 text-xs text-blue-700 hover:underline">
                        {e.invoice.number}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
