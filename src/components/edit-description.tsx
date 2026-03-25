"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditDescription({
  taskId,
  initialValue,
}: {
  taskId: string;
  initialValue: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          className="rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none resize-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setValue(initialValue ?? "");
              setEditing(false);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {initialValue ? (
        <p className="text-sm text-zinc-600 whitespace-pre-wrap">{initialValue}</p>
      ) : (
        <p className="text-sm text-zinc-400 italic">No description.</p>
      )}
      <button
        onClick={() => setEditing(true)}
        className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
