"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { RateInput } from "@/components/rate-input";

const inputClass =
  "h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";
const card = "rounded-xl border border-zinc-200 bg-white p-5";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
}

type Settings = {
  companyName: string;
  companyAddress: string;
  currency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultTaxRate: number;
  paymentTermsDays: number;
  invoiceNotes: string;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [s, setS] = useState({
    ...settings,
    nextInvoiceNumber: String(settings.nextInvoiceNumber),
    defaultTaxRate: String(settings.defaultTaxRate),
    paymentTermsDays: String(settings.paymentTermsDays),
  });
  const [status, setStatus] = useState<string | null>(null);
  const set = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS({ ...s, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await call("/api/settings/billing", "PATCH", {
        ...s,
        nextInvoiceNumber: Number(s.nextInvoiceNumber),
        defaultTaxRate: Number(s.defaultTaxRate),
        paymentTermsDays: Number(s.paymentTermsDays),
      });
      setStatus("Saved");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <form onSubmit={save} className={`${card} grid grid-cols-2 gap-3 text-sm`}>
      <h2 className="col-span-2 font-semibold text-zinc-900">Company & invoicing</h2>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Company name</span>
        <input className={inputClass} value={s.companyName} onChange={set("companyName")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Currency</span>
        <input className={inputClass} value={s.currency} onChange={set("currency")} maxLength={3} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Company address</span>
        <textarea className={`${inputClass} h-16 py-1.5`} value={s.companyAddress} onChange={set("companyAddress")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Invoice prefix</span>
        <input className={inputClass} value={s.invoicePrefix} onChange={set("invoicePrefix")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Next invoice number</span>
        <input className={inputClass} value={s.nextInvoiceNumber} onChange={set("nextInvoiceNumber")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Default tax rate (%)</span>
        <input className={inputClass} value={s.defaultTaxRate} onChange={set("defaultTaxRate")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Payment terms (days)</span>
        <input className={inputClass} value={s.paymentTermsDays} onChange={set("paymentTermsDays")} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="font-medium text-zinc-700">Default invoice notes</span>
        <textarea className={`${inputClass} h-16 py-1.5`} value={s.invoiceNotes} onChange={set("invoiceNotes")} placeholder="Payment instructions…" />
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button type="submit" className="rounded bg-black px-3 py-2 text-xs font-semibold text-white">Save</button>
        {status && <span className={`text-xs ${status === "Saved" ? "text-emerald-700" : "text-red-600"}`}>{status}</span>}
      </div>
    </form>
  );
}


export function UserRates({
  users,
  currency,
}: {
  users: { id: string; name: string; defaultRateCents: number | null }[];
  currency: string;
}) {
  const router = useRouter();
  return (
    <div className={card}>
      <h2 className="font-semibold text-zinc-900">Default hourly rates</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Used when a project has no rate of its own. Per-project rates and per-person overrides are set on each project. Amounts in {currency}.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-zinc-100">
              <td className="py-2 text-zinc-800">{u.name}</td>
              <td className="py-2">
                <RateInput
                  initialCents={u.defaultRateCents}
                  onSave={async (cents) => {
                    await call(`/api/users/${u.id}`, "PATCH", { defaultRateCents: cents });
                    router.refresh();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Categories({ categories }: { categories: { id: string; name: string; count: number }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className={card}>
      <h2 className="font-semibold text-zinc-900">Expense categories</h2>
      <ul className="mt-3 text-sm">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between border-t border-zinc-100 py-2">
            <span className="text-zinc-800">
              {c.name} <span className="text-xs text-zinc-400">({c.count} expenses)</span>
            </span>
            <span className="flex gap-1">
              <button
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
                onClick={() => {
                  const next = prompt("Rename category", c.name);
                  if (next && next.trim() !== c.name) run(() => call(`/api/expense-categories/${c.id}`, "PATCH", { name: next }));
                }}
              >
                Rename
              </button>
              {c.count === 0 && (
                <button
                  className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => confirm(`Delete "${c.name}"?`) && run(() => call(`/api/expense-categories/${c.id}`, "DELETE"))}
                >
                  Delete
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) run(async () => {
            await call("/api/expense-categories", "POST", { name });
            setName("");
          });
        }}
      >
        <input className={`${inputClass} max-w-xs`} value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" />
        <button type="submit" className="rounded bg-black px-3 py-2 text-xs font-semibold text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
