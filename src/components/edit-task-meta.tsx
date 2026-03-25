"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatLabel } from "@/lib/utils";

type Status = { id: string; name: string; color: string };
type Priority = "URGENT" | "HIGH" | "NORMAL" | "LOW";
type User = { id: string; name: string | null; email: string | null };

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDateTimeInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${min}`;
}

export function EditTaskMeta({
  taskId,
  actorId,
  currentStatusId,
  currentPriority,
  currentOwnerId,
  currentRequestorId,
  currentStartDate,
  currentDueDate,
  statuses,
  users,
}: {
  taskId: string;
  actorId?: string;
  currentStatusId: string;
  currentPriority: Priority;
  currentOwnerId: string | null;
  currentRequestorId: string | null;
  currentStartDate: Date | null;
  currentDueDate: Date | null;
  statuses: Status[];
  users: User[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function patch(field: string, value: unknown) {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value, actorId }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Status</dt>
        <dd>
          <select
            defaultValue={currentStatusId}
            disabled={saving}
            onChange={(e) => patch("statusId", e.target.value)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
            onChange={(e) => patch("priority", e.target.value)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          >
            {(["URGENT", "HIGH", "NORMAL", "LOW"] as Priority[]).map((p) => (
              <option key={p} value={p}>{formatLabel(p)}</option>
            ))}
          </select>
        </dd>
      </div>

      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Owner</dt>
        <dd>
          <select
            defaultValue={currentOwnerId ?? ""}
            disabled={saving}
            onChange={(e) => patch("ownerId", e.target.value || null)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50 max-w-[140px]"
          >
            <option value="">— Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
        </dd>
      </div>

      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Requestor</dt>
        <dd>
          <select
            defaultValue={currentRequestorId ?? ""}
            disabled={saving}
            onChange={(e) => patch("requestorId", e.target.value || null)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50 max-w-[140px]"
          >
            <option value="">— None</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
        </dd>
      </div>

      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Start date</dt>
        <dd>
          <input
            type="date"
            defaultValue={toDateInputValue(currentStartDate)}
            disabled={saving}
            onBlur={(e) => patch("startDate", e.target.value || null)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          />
        </dd>
      </div>

      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500 shrink-0">Due date</dt>
        <dd>
          <input
            type="datetime-local"
            defaultValue={toDateTimeInputValue(currentDueDate)}
            disabled={saving}
            onBlur={(e) => patch("dueDate", e.target.value || null)}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          />
        </dd>
      </div>
    </dl>
  );
}
