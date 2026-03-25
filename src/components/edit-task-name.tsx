"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditTaskName({
  taskId,
  initialName,
  actorId,
}: {
  taskId: string;
  initialName: string;
  actorId?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim() || value.trim() === initialName) {
      setEditing(false);
      setValue(initialName);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim(), actorId }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setValue(initialName);
            setEditing(false);
          }
        }}
        disabled={saving}
        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-2xl font-semibold text-zinc-900 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
      />
    );
  }

  return (
    <h2
      className="mt-1 text-2xl font-semibold text-zinc-900 cursor-pointer hover:text-zinc-600 transition-colors"
      title="Click to edit"
      onClick={() => setEditing(true)}
    >
      {initialName}
    </h2>
  );
}
