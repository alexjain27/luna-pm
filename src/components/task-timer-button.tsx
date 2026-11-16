"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { todayKey } from "@/lib/billing-format";

/** Starts (or stops) a timer for the current user on a task. */
export function TaskTimerButton({
  projectId,
  taskId,
  runningEntryId,
}: {
  projectId: string;
  taskId: string;
  runningEntryId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = runningEntryId
        ? await fetch(`/api/time-entries/${runningEntryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" }),
          })
        : await fetch("/api/time-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, taskId, date: todayKey(), startTimer: true }),
          });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`w-full rounded px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
          runningEntryId ? "bg-emerald-600 text-white" : "bg-black text-white"
        }`}
      >
        {runningEntryId ? "Stop timer" : "Start timer"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
