"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSubtaskForm({
  taskId,
  defaultStatusId,
}: {
  taskId: string;
  defaultStatusId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), statusId: defaultStatusId }),
      });
      if (!res.ok) throw new Error("Failed");
      setName("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not add subtask. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <span className="text-sm leading-none">+</span> Add subtask
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Subtask name"
        className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(""); }}
        className="text-xs text-zinc-400 hover:text-zinc-600"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}
