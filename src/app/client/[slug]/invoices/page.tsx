import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, getBillingSettings, invoiceTotals, isOverdue } from "@/lib/billing";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

export default async function ClientInvoicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, type: true } });
  if (!workspace || workspace.type !== "CLIENT") notFound();

  const [invoices, settings] = await Promise.all([
    prisma.invoice.findMany({
      where: { workspaceId: workspace.id, status: { in: ["SENT", "PAID"] } },
      include: { lineItems: { select: { amountCents: true } } },
      orderBy: { issueDate: "desc" },
    }),
    getBillingSettings(),
  ]);
  const money = (c: number) => formatMoney(c, settings.currency);
  const balance = invoices.filter((i) => i.status === "SENT").reduce((s, i) => s + invoiceTotals(i).totalCents, 0);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Invoices</h2>
        <p className="mt-1 text-sm text-zinc-500">Balance due: {money(balance)}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Invoice</th>
              <th className="px-4 py-2 font-semibold">Issued</th>
              <th className="px-4 py-2 font-semibold">Due</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-zinc-500">No invoices yet.</td></tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-zinc-200">
                <td className="px-4 py-2">
                  <Link href={`/client/${slug}/invoices/${inv.id}`} className="font-mono font-medium text-zinc-900 hover:underline">
                    {inv.number}
                  </Link>
                  {inv.subject && <div className="text-xs text-zinc-500">{inv.subject}</div>}
                </td>
                <td className="px-4 py-2 text-zinc-600">{formatDay(inv.issueDate)}</td>
                <td className="px-4 py-2 text-zinc-600">{formatDay(inv.dueDate)}</td>
                <td className="px-4 py-2"><InvoiceStatusBadge status={inv.status} overdue={isOverdue(inv)} /></td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{money(invoiceTotals(inv).totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
