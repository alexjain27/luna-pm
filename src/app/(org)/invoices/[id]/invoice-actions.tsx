"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(init: RequestInit, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}`, { headers: { "Content-Type": "application/json" }, ...init });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      if (after) after();
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  const setStatus = (s: string) => run({ method: "PATCH", body: JSON.stringify({ status: s }) });

  const btn = "rounded px-3 py-2 text-xs font-semibold disabled:opacity-50";
  const secondary = `${btn} border border-zinc-200 bg-white text-zinc-700`;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-600">{error}</span>}
      {status === "DRAFT" && (
        <>
          <button disabled={busy} className={`${btn} bg-black text-white`} onClick={() => setStatus("SENT")}>
            Mark as sent
          </button>
          <button
            disabled={busy}
            className={`${btn} text-red-600 hover:bg-red-50`}
            onClick={() => {
              if (confirm("Delete this draft? Its time entries and expenses become unbilled again."))
                run({ method: "DELETE" }, () => router.push("/invoices"));
            }}
          >
            Delete draft
          </button>
        </>
      )}
      {status === "SENT" && (
        <>
          <button disabled={busy} className={`${btn} bg-emerald-600 text-white`} onClick={() => setStatus("PAID")}>
            Mark as paid
          </button>
          <button disabled={busy} className={secondary} onClick={() => setStatus("DRAFT")}>
            Back to draft
          </button>
        </>
      )}
      {status === "PAID" && (
        <button disabled={busy} className={secondary} onClick={() => setStatus("SENT")}>
          Mark unpaid
        </button>
      )}
      {(status === "SENT" || status === "PAID") && (
        <button
          disabled={busy}
          className={`${btn} text-red-600 hover:bg-red-50`}
          onClick={() => {
            if (confirm("Void this invoice? Its time entries and expenses become unbilled again. This can't be undone."))
              setStatus("VOID");
          }}
        >
          Void
        </button>
      )}
    </div>
  );
}
