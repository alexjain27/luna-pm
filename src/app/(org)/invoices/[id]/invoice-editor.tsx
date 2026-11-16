"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatMoney, parseMoneyToCents } from "@/lib/billing-format";

type Line = { id: string; kind: string; description: string; quantity: number; unitPriceCents: number; amountCents: number };

const inputClass =
  "h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
}

function LineRow({ invoiceId, line, currency, onError }: { invoiceId: string; line?: Line; currency: string; onError: (m: string | null) => void }) {
  const router = useRouter();
  const [description, setDescription] = useState(line?.description ?? "");
  const [quantity, setQuantity] = useState(line ? String(line.quantity) : "1");
  const [price, setPrice] = useState(line ? (line.unitPriceCents / 100).toFixed(2) : "");
  const [busy, setBusy] = useState(false);

  const qty = Number(quantity);
  const cents = parseMoneyToCents(price);
  const preview = Number.isFinite(qty) && cents != null ? Math.round(qty * cents) : null;
  const dirty =
    !line || description !== line.description || qty !== line.quantity || cents !== line.unitPriceCents;

  async function save() {
    if (!description.trim() || !Number.isFinite(qty) || cents == null) {
      onError("Each line needs a description, a numeric quantity and a price");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      if (line) {
        await call(`/api/invoices/${invoiceId}/line-items/${line.id}`, "PATCH", { description, quantity: qty, unitPriceCents: cents });
      } else {
        await call(`/api/invoices/${invoiceId}/line-items`, "POST", { description, quantity: qty, unitPriceCents: cents, kind: "OTHER" });
        setDescription("");
        setQuantity("1");
        setPrice("");
      }
      router.refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!line || !confirm("Remove this line?")) return;
    setBusy(true);
    try {
      await call(`/api/invoices/${invoiceId}/line-items/${line.id}`, "DELETE");
      router.refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-zinc-100 align-top">
      <td className="py-2 pr-2">
        <input className={inputClass} value={description} placeholder={line ? "" : "New line description"} onChange={(e) => setDescription(e.target.value)} />
        {line && line.kind !== "OTHER" && (
          <span className="text-[10px] font-semibold uppercase text-zinc-400">{line.kind === "SERVICE" ? "Time" : "Expense"}</span>
        )}
      </td>
      <td className="w-24 py-2 pr-2">
        <input className={`${inputClass} text-right`} value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-label="Quantity" />
      </td>
      <td className="w-32 py-2 pr-2">
        <input className={`${inputClass} text-right`} value={price} placeholder="0.00" onChange={(e) => setPrice(e.target.value)} aria-label="Unit price" />
      </td>
      <td className="w-32 py-2 pr-2 pt-3.5 text-right tabular-nums">{preview != null ? formatMoney(preview, currency) : "—"}</td>
      <td className="w-36 whitespace-nowrap py-2 text-right">
        {dirty && (
          <button disabled={busy} onClick={save} className="rounded bg-black px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {line ? "Save" : "Add line"}
          </button>
        )}
        {line && (
          <button disabled={busy} onClick={remove} className="ml-1 rounded px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

export function InvoiceEditor({
  invoice,
  totals,
  currency,
}: {
  invoice: { id: string; subject: string | null; issueDate: string; dueDate: string; taxRate: number; notes: string | null; lineItems: Line[] };
  totals: { subtotalCents: number; taxCents: number; totalCents: number };
  currency: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(invoice.subject ?? "");
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [taxRate, setTaxRate] = useState(String(invoice.taxRate));
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await call(`/api/invoices/${invoice.id}`, "PATCH", { subject, issueDate, dueDate, taxRate: Number(taxRate), notes });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  const money = (c: number) => formatMoney(c, currency);

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={saveDetails} className="grid grid-cols-4 gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
        <label className="col-span-4 flex flex-col gap-1">
          <span className="font-medium text-zinc-700">Subject</span>
          <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Design services — October" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-zinc-700">Issue date</span>
          <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-zinc-700">Due date</span>
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-zinc-700">Tax rate (%)</span>
          <input className={inputClass} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>
        <div />
        <label className="col-span-4 flex flex-col gap-1">
          <span className="font-medium text-zinc-700">Notes</span>
          <textarea className={`${inputClass} h-20 py-1.5`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="col-span-4 flex items-center gap-3">
          <button type="submit" className="rounded bg-black px-3 py-2 text-xs font-semibold text-white">Save details</button>
          {saved && <span className="text-xs text-emerald-700">Saved</span>}
        </div>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit price</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((l) => (
              <LineRow key={`${l.id}-${l.amountCents}-${l.description}`} invoiceId={invoice.id} line={l} currency={currency} onError={setError} />
            ))}
            <LineRow key={`new-${invoice.lineItems.length}`} invoiceId={invoice.id} currency={currency} onError={setError} />
          </tbody>
        </table>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm tabular-nums">
          <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{money(totals.subtotalCents)}</span></div>
          <div className="flex justify-between text-zinc-500"><span>Tax ({invoice.taxRate}%)</span><span>{money(totals.taxCents)}</span></div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900"><span>Total</span><span>{money(totals.totalCents)}</span></div>
        </div>
      </div>
    </div>
  );
}
