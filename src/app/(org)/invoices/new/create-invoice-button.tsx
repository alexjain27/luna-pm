"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateInvoiceButton(props: {
  workspaceId: string;
  periodStart: string | null;
  periodEnd: string | null;
  projectIds: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create invoice");
      router.push(`/invoices/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button onClick={create} disabled={saving} className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Creating…" : "Create draft invoice"}
      </button>
    </div>
  );
}
