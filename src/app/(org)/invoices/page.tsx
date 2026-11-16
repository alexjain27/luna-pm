import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, getBillingSettings, invoiceTotals, isOverdue, parseDateKey, todayKey } from "@/lib/billing";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "outstanding", label: "Outstanding" },
  { id: "overdue", label: "Overdue" },
  { id: "paid", label: "Paid" },
  { id: "void", label: "Void" },
] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const tab = TABS.find((t) => t.id === status)?.id ?? "all";
  const today = todayKey();

  const where: Prisma.InvoiceWhereInput =
    tab === "draft" ? { status: "DRAFT" }
    : tab === "outstanding" ? { status: "SENT" }
    : tab === "overdue" ? { status: "SENT", dueDate: { lt: parseDateKey(today) } }
    : tab === "paid" ? { status: "PAID" }
    : tab === "void" ? { status: "VOID" }
    : {};

  const [invoices, outstanding, settings] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { workspace: { select: { name: true } }, lineItems: { select: { amountCents: true } } },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    }),
    prisma.invoice.findMany({
      where: { status: "SENT" },
      select: { status: true, dueDate: true, taxRate: true, lineItems: { select: { amountCents: true } } },
    }),
    getBillingSettings(),
  ]);
  const money = (c: number) => formatMoney(c, settings.currency);

  const outstandingTotal = outstanding.reduce((s, i) => s + invoiceTotals(i).totalCents, 0);
  const overdueTotal = outstanding.filter((i) => isOverdue(i, today)).reduce((s, i) => s + invoiceTotals(i).totalCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bill clients for tracked time and expenses.</p>
        </div>
        <Link href="/invoices/new" className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
          + New invoice
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{money(outstandingTotal)}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue</p>
          <p className={`mt-2 text-3xl font-semibold tabular-nums ${overdueTotal ? "text-red-700" : ""}`}>{money(overdueTotal)}</p>
        </div>
      </section>

      <div>
        <div className="mb-4 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "all" ? "/invoices" : `/invoices?status=${t.id}`}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                tab === t.id ? "-mb-px border border-border border-b-white bg-white text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Number</th>
                <th className="px-4 py-2 font-semibold">Client</th>
                <th className="px-4 py-2 font-semibold">Issued</th>
                <th className="px-4 py-2 font-semibold">Due</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-zinc-500">No invoices.</td></tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <Link href={`/invoices/${inv.id}`} className="font-mono font-medium text-zinc-900 hover:underline">
                      {inv.number}
                    </Link>
                    {inv.subject && <div className="text-xs text-zinc-500">{inv.subject}</div>}
                  </td>
                  <td className="px-4 py-2 text-zinc-700">{inv.workspace.name}</td>
                  <td className="px-4 py-2 text-zinc-600">{formatDay(inv.issueDate)}</td>
                  <td className="px-4 py-2 text-zinc-600">{formatDay(inv.dueDate)}</td>
                  <td className="px-4 py-2">
                    <InvoiceStatusBadge status={inv.status} overdue={isOverdue(inv, today)} />
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{money(invoiceTotals(inv).totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
