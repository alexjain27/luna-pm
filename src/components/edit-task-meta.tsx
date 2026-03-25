"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

type Status = { id: string; name: string; color: string };
type Priority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export function EditTaskMeta({
  taskId,
  currentStatusId,
  currentPriority,
  statuses,
}: {
  taskId: string;
  currentStatusId: string;
  currentPriority: Priority;
  statuses: Status[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(field: "statusId" | "priority", value: string) {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const currentStatus = statuses.find((s) => s.id === currentStatusId);

  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Status</dt>
        <dd className="min-w-0">
          <select
            defaultValue={currentStatusId}
            disabled={saving}
            onChange={(e) => handleChange("statusId", e.target.value)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </dd>
      </div>

      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Priority</dt>
        <dd>
          <select
            defaultValue={currentPriority}
            disabled={saving}
            onChange={(e) => handleChange("priority", e.target.value)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          >
            {(["URGENT", "HIGH", "NORMAL", "LOW"] as Priority[]).map((p) => (
              <option key={p} value={p}>
                {formatLabel(p)}
              </option>
            ))}
          </select>
        </dd>
      </div>
    </dl>
  );
}
