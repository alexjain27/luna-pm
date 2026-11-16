import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { dateKey, formatDay, formatHours, formatMoney, getBillingSettings, invoiceTotals, isOverdue } from "@/lib/billing";
import { InvoiceDocument } from "@/components/invoice-document";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { PrintButton } from "@/components/print-button";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceEditor } from "./invoice-editor";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true, name: true, address: true, slug: true } },
        lineItems: { orderBy: { order: "asc" } },
        timeEntries: {
          include: { user: { select: { name: true } }, project: { select: { name: true } }, task: { select: { name: true } } },
          orderBy: { date: "asc" },
        },
        expenses: {
          include: { project: { select: { name: true } }, category: { select: { name: true } } },
          orderBy: { date: "asc" },
        },
      },
    }),
    getBillingSettings(),
  ]);
  if (!invoice) notFound();

  const totals = invoiceTotals(invoice);
  const money = (c: number) => formatMoney(c, settings.currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Link href="/invoices" className="text-xs text-zinc-500 hover:underline">← Invoices</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-foreground">{invoice.number}</h1>
            <InvoiceStatusBadge status={invoice.status} overdue={isOverdue(invoice)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/workspaces/${invoice.workspace.id}`} className="hover:underline">{invoice.workspace.name}</Link>
            {" · "}
            {money(totals.totalCents)}
            {invoice.sentAt && ` · sent ${formatDay(invoice.sentAt)}`}
            {invoice.paidAt && ` · paid ${formatDay(invoice.paidAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <InvoiceActions id={invoice.id} status={invoice.status} />
        </div>
      </div>

      {invoice.status === "DRAFT" ? (
        <InvoiceEditor
          invoice={{
            id: invoice.id,
            subject: invoice.subject,
            issueDate: dateKey(invoice.issueDate),
            dueDate: dateKey(invoice.dueDate),
            taxRate: invoice.taxRate,
            notes: invoice.notes,
            lineItems: invoice.lineItems.map((li) => ({
              id: li.id,
              kind: li.kind,
              description: li.description,
              quantity: li.quantity,
              unitPriceCents: li.unitPriceCents,
              amountCents: li.amountCents,
            })),
          }}
          totals={totals}
          currency={settings.currency}
        />
      ) : null}

      <div className={invoice.status === "DRAFT" ? "hidden print:block" : ""}>
        <InvoiceDocument
          invoice={invoice}
          company={{ name: settings.companyName, address: settings.companyAddress }}
          currency={settings.currency}
          totals={totals}
        />
      </div>

      {(invoice.timeEntries.length > 0 || invoice.expenses.length > 0) && (
        <details className="rounded-xl border border-zinc-200 bg-white print:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">
            Billed work: {invoice.timeEntries.length} time entries, {invoice.expenses.length} expenses
          </summary>
          <table className="w-full text-left text-sm">
            <tbody>
              {invoice.timeEntries.map((e) => (
                <tr key={e.id} className="border-t border-zinc-200">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDay(e.date)}</td>
                  <td className="px-4 py-2">{e.project.name} — {e.task?.name ?? "General"}</td>
                  <td className="px-4 py-2 text-zinc-500">{e.notes}</td>
                  <td className="px-4 py-2 text-zinc-600">{e.user.name}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatHours(e.minutes)} h</td>
                </tr>
              ))}
              {invoice.expenses.map((x) => (
                <tr key={x.id} className="border-t border-zinc-200">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDay(x.date)}</td>
                  <td className="px-4 py-2">{x.project.name} — {x.category.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{x.notes}</td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{money(x.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500">
            These rows are locked while on this invoice. Deleting the draft or voiding the invoice releases them.
          </p>
        </details>
      )}
    </div>
  );
}
