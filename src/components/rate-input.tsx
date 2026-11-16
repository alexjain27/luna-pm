"use client";

import { useState } from "react";

import { parseMoneyToCents } from "@/lib/billing-format";

/** Money input that saves on blur/Enter. Empty means "no rate" (null). */
export function RateInput({ initialCents, onSave }: { initialCents: number | null; onSave: (cents: number | null) => Promise<void> }) {
  const [value, setValue] = useState(initialCents != null ? (initialCents / 100).toFixed(2) : "");
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  async function commit() {
    const trimmed = value.trim();
    const cents = trimmed ? parseMoneyToCents(trimmed) : null;
    if (trimmed && cents == null) return setState("error");
    if (cents === initialCents) return;
    try {
      await onSave(cents);
      setState("saved");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="flex items-center gap-2">
      <input
        className={`h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 w-28 text-right ${state === "error" ? "border-red-400" : ""}`}
        value={value}
        placeholder="—"
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <span className="w-10 text-xs text-emerald-700">{state === "saved" ? "Saved" : ""}</span>
    </div>
  );
}

