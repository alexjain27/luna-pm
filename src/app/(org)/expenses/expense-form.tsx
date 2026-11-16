"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { parseMoneyToCents, todayKey } from "@/lib/billing-format";

const inputClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

export type ExpenseFormProject = { id: string; name: string; workspaceName: string };
export type ExpenseInitial = {
  id: string;
  projectId: string;
  categoryId: string;
  date: string;
  amountCents: number;
  notes: string | null;
  billable: boolean;
  receiptFilename: string | null;
};

async function uploadReceipt(file: File, projectId: string) {
  const mimeType = file.type || "application/octet-stream";
  const urlRes = await fetch("/api/files/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType, size: file.size, projectId }),
  });
  if (!urlRes.ok) throw new Error("Could not get an upload URL");
  const { uploadUrl, s3Key } = await urlRes.json();
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: file });
  if (!put.ok) throw new Error("Receipt upload failed");
  return { receiptS3Key: s3Key as string, receiptFilename: file.name };
}

export function ExpenseForm({
  projects,
  categories,
  initial,
  onDone,
}: {
  projects: ExpenseFormProject[];
  categories: { id: string; name: string }[];
  initial?: ExpenseInitial;
  onDone: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [amount, setAmount] = useState(initial ? (initial.amountCents / 100).toFixed(2) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [billable, setBillable] = useState(initial?.billable ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const byWorkspace = new Map<string, ExpenseFormProject[]>();
  for (const p of projects) byWorkspace.set(p.workspaceName, [...(byWorkspace.get(p.workspaceName) ?? []), p]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = parseMoneyToCents(amount);
    if (!projectId || !categoryId) return setError("Pick a project and category");
    if (amountCents == null || amountCents < 0) return setError("Enter a valid amount");
    setSaving(true);
    try {
      const file = fileRef.current?.files?.[0];
      const receipt = file ? await uploadReceipt(file, projectId) : {};
      const res = await fetch(initial ? `/api/expenses/${initial.id}` : "/api/expenses", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, categoryId, date, amountCents, notes, billable, ...receipt }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save");
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Project" className={`${inputClass} min-w-56`} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select project…</option>
          {[...byWorkspace.entries()].map(([ws, ps]) => (
            <optgroup key={ws} label={ws}>
              {ps.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select aria-label="Category" className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input aria-label="Date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          aria-label="Amount"
          className={`${inputClass} w-28 text-right font-mono`}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} min-w-64 flex-1`}
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
          Billable
        </label>
        <label className="text-sm text-zinc-600">
          <span className="mr-1">Receipt{initial?.receiptFilename ? ` (replace ${initial.receiptFilename})` : ""}:</span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="text-xs" />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save" : "Add expense"}
        </button>
        <button type="button" onClick={onDone} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
