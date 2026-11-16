import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDay, formatHours, formatMoney, getBillingSettings, parseDateKey } from "@/lib/billing";
import { datePresets } from "@/lib/reports";
import { buildLines, findUnbilled } from "@/lib/invoices";
import { CreateInvoiceButton } from "./create-invoice-button";

const fieldClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

function validKey(v?: string) {
  if (!v) return undefined;
  try {
    parseDateKey(v);
    return v;
  } catch {
    return undefined;
  }
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string; from?: string; to?: string; projectIds?: string | string[] }>;
}) {
  const sp = await searchParams;
  const settings = await getBillingSettings();
  const money = (c: number) => formatMoney(c, settings.currency);

  const workspaces = await prisma.workspace.findMany({
    where: { type: "CLIENT" },
    select: { id: true, name: true, projects: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  const workspace = workspaces.find((w) => w.id === sp.workspaceId);
  const from = validKey(sp.from) ?? "";
  const to = validKey(sp.to) ?? "";
  const projectIds = (Array.isArray(sp.projectIds) ? sp.projectIds : sp.projectIds ? [sp.projectIds] : []).filter(
    (id) => workspace?.projects.some((p) => p.id === id)
  );

  const unbilled = workspace
    ? await findUnbilled({ workspaceId: workspace.id, periodStart: from || null, periodEnd: to || null, projectIds })
    : null;
  const lines = unbilled ? buildLines(unbilled.timeEntries, unbilled.expenses) : [];
  const subtotal = lines.reduce((s, l) => s + l.amountCents, 0);
  const lastMonth = datePresets().find((p) => p.id === "lastmonth")!;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/invoices" className="text-xs text-zinc-500 hover:underline">← Invoices</Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">New invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pull in unbilled, billable time and expenses for a client. You can edit line items afterwards.
        </p>
      </div>

      <form action="/invoices/new" className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Client</span>
          <select name="workspaceId" defaultValue={workspace?.id ?? ""} className={`${fieldClass} max-w-sm`}>
            <option value="">Select a client…</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-zinc-700">Period from</span>
            <input type="date" name="from" defaultValue={from} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-zinc-700">to</span>
            <input type="date" name="to" defaultValue={to} className={fieldClass} />
          </label>
          <Link
            href={`/invoices/new?workspaceId=${workspace?.id ?? ""}&from=${lastMonth.from}&to=${lastMonth.to}`}
            className="mb-1 text-xs text-zinc-500 underline"
          >
            Last month
          </Link>
          <span className="mb-1 text-xs text-zinc-400">Leave blank to include all unbilled work.</span>
        </div>
        {workspace && workspace.projects.length > 0 && (
          <fieldset className="text-sm">
            <legend className="font-medium text-zinc-700">Projects (none selected = all)</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {workspace.projects.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 text-zinc-600">
                  <input type="checkbox" name="projectIds" value={p.id} defaultChecked={projectIds.includes(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <button type="submit" className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
            Preview unbilled work
          </button>
        </div>
      </form>

      {workspace && unbilled && (
        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Preview for {workspace.name}
              {from && to && <span className="font-normal text-zinc-500"> · {formatDay(from)} – {formatDay(to)}</span>}
            </h2>
            <span className="text-sm text-zinc-500">
              {unbilled.timeEntries.length} time entries ({formatHours(unbilled.timeEntries.reduce((s, e) => s + e.minutes, 0))} h) ·{" "}
              {unbilled.expenses.length} expenses
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 font-semibold">Line</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Unit</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-zinc-500">Nothing unbilled. You can still create an empty invoice and add lines by hand.</td></tr>
              )}
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2">
                    {l.description}
                    {l.kind === "EXPENSE" && <span className="ml-2 text-[10px] font-semibold uppercase text-zinc-400">Expense</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{l.quantity.toFixed(2)}</td>
                  <td className="py-2 text-right tabular-nums">{money(l.unitPriceCents)}</td>
                  <td className="py-2 text-right tabular-nums">{money(l.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-900">Subtotal {money(subtotal)}</span>
            <CreateInvoiceButton
              workspaceId={workspace.id}
              periodStart={from || null}
              periodEnd={to || null}
              projectIds={projectIds}
            />
          </div>
        </section>
      )}
    </div>
  );
}
