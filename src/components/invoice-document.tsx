import { formatDay, formatMoney } from "@/lib/billing-format";

export type InvoiceDocumentData = {
  number: string;
  status: string;
  subject: string | null;
  issueDate: Date;
  dueDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  taxRate: number;
  notes: string | null;
  workspace: { name: string; address: string };
  lineItems: { id: string; kind: string; description: string; quantity: number; unitPriceCents: number; amountCents: number }[];
};

export function InvoiceDocument({
  invoice,
  company,
  currency,
  totals,
}: {
  invoice: InvoiceDocumentData;
  company: { name: string; address: string | null };
  currency: string;
  totals: { subtotalCents: number; taxCents: number; totalCents: number };
}) {
  const money = (c: number) => formatMoney(c, currency);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-sm text-zinc-800 shadow-sm print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-start justify-between gap-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Invoice</h2>
          <p className="mt-1 font-mono text-zinc-500">{invoice.number}</p>
          {invoice.status === "PAID" && (
            <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-700">Paid</span>
          )}
          {invoice.status === "VOID" && (
            <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold uppercase text-zinc-500">Void</span>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-zinc-900">{company.name}</p>
          {company.address && <p className="whitespace-pre-line text-zinc-500">{company.address}</p>}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Bill to</p>
          <p className="mt-1 font-semibold text-zinc-900">{invoice.workspace.name}</p>
          <p className="whitespace-pre-line text-zinc-500">{invoice.workspace.address}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Issued</p>
          <p className="mt-1">{formatDay(invoice.issueDate)}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Due</p>
          <p className="mt-1">{formatDay(invoice.dueDate)}</p>
        </div>
        <div>
          {invoice.periodStart && invoice.periodEnd && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Period</p>
              <p className="mt-1">
                {formatDay(invoice.periodStart)} – {formatDay(invoice.periodEnd)}
              </p>
            </>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Amount due</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{money(totals.totalCents)}</p>
        </div>
      </div>

      {invoice.subject && <p className="mt-8 font-medium text-zinc-900">{invoice.subject}</p>}

      <table className="mt-6 w-full text-left">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 font-semibold">Description</th>
            <th className="w-20 py-2 text-right font-semibold">Qty</th>
            <th className="w-28 py-2 text-right font-semibold">Unit price</th>
            <th className="w-28 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li) => (
            <tr key={li.id} className="border-b border-zinc-100">
              <td className="py-2 pr-4">{li.description}</td>
              <td className="py-2 text-right tabular-nums">{li.quantity.toFixed(2)}</td>
              <td className="py-2 text-right tabular-nums">{money(li.unitPriceCents)}</td>
              <td className="py-2 text-right tabular-nums">{money(li.amountCents)}</td>
            </tr>
          ))}
          {invoice.lineItems.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-400">No line items.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1 tabular-nums">
        <div className="flex justify-between text-zinc-500">
          <span>Subtotal</span>
          <span>{money(totals.subtotalCents)}</span>
        </div>
        {invoice.taxRate > 0 && (
          <div className="flex justify-between text-zinc-500">
            <span>Tax ({invoice.taxRate}%)</span>
            <span>{money(totals.taxCents)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
          <span>Total</span>
          <span>{money(totals.totalCents)}</span>
        </div>
      </div>

      {invoice.notes && <p className="mt-10 whitespace-pre-line border-t border-zinc-100 pt-4 text-zinc-500">{invoice.notes}</p>}
    </div>
  );
}
