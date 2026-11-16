"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatMinutes, parseDuration, todayKey } from "@/lib/billing-format";
import { elapsedLabel, useNow } from "@/components/use-now";
import { ProjectTaskSelect } from "./project-task-select";
import type { EntryVM, ProjectOption } from "./types";

const inputClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
}

function EntryForm({
  projects,
  date,
  userId,
  initial,
  onDone,
}: {
  projects: ProjectOption[];
  date: string;
  userId: string;
  initial?: EntryVM;
  onDone: () => void;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [taskId, setTaskId] = useState(initial?.taskId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [duration, setDuration] = useState(
    initial && !initial.timerStartedAt ? formatMinutes(initial.minutes) : ""
  );
  const [billable, setBillable] = useState(initial?.billable ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const isToday = date === todayKey();
  const startsTimer = !initial && !duration.trim() && isToday;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId) return setError("Pick a project");
    let minutes: number | undefined;
    if (duration.trim()) {
      const parsed = parseDuration(duration);
      if (parsed == null) return setError("Duration must look like 1:30, 1.5 or 90m");
      minutes = parsed;
    } else if (!initial && !isToday) {
      return setError("Enter a duration (timers can only run today)");
    }
    setSaving(true);
    try {
      if (initial) {
        await send(`/api/time-entries/${initial.id}`, "PATCH", {
          projectId,
          taskId: taskId || null,
          notes,
          billable,
          ...(minutes !== undefined ? { minutes } : {}),
        });
      } else {
        await send("/api/time-entries", "POST", {
          userId,
          projectId,
          taskId: taskId || null,
          date,
          notes,
          billable,
          minutes: minutes ?? 0,
          startTimer: startsTimer,
        });
      }
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
        <ProjectTaskSelect
          projects={projects}
          projectId={projectId}
          taskId={taskId}
          onChange={(p, t) => {
            setProjectId(p);
            setTaskId(t);
            const next = projects.find((x) => x.id === p);
            if (next && !next.billable) setBillable(false);
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} flex-1 min-w-64`}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <input
          className={`${inputClass} w-24 text-right font-mono`}
          placeholder={initial?.timerStartedAt ? "running" : "0:00"}
          aria-label="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={billable}
            disabled={project ? !project.billable : false}
            onChange={(e) => setBillable(e.target.checked)}
          />
          Billable
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {initial ? "Save" : startsTimer ? "Start timer" : "Save entry"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EntryRow({
  entry,
  projects,
  userId,
  now,
}: {
  entry: EntryVM;
  projects: ProjectOption[];
  userId: string;
  now: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = Boolean(entry.timerStartedAt);
  const locked = Boolean(entry.invoiceNumber);

  async function act(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (editing) {
    return (
      <li className="border-t border-zinc-200 p-3">
        <EntryForm
          projects={projects}
          date={entry.date}
          userId={userId}
          initial={entry}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-4 border-t border-zinc-200 px-4 py-3 ${running ? "bg-emerald-50/50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900">{entry.projectName}</span>
          <span className="text-xs text-zinc-400">({entry.workspaceName})</span>
          {!entry.billable && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
              Non-billable
            </span>
          )}
          {locked && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
              Invoiced {entry.invoiceNumber}
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-600">
          {entry.taskName ?? "General"}
          {entry.notes && <span className="text-zinc-400"> — {entry.notes}</span>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <span suppressHydrationWarning className={`w-24 text-right font-mono text-lg tabular-nums ${running ? "text-emerald-700" : "text-zinc-900"}`}>
        {elapsedLabel(entry.minutes, entry.timerStartedAt, now)}
      </span>
      {!locked && (
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              act(() => send(`/api/time-entries/${entry.id}`, "PATCH", { action: running ? "stop" : "start" }))
            }
            className={`w-16 rounded px-2 py-1.5 text-xs font-semibold ${
              running ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            {running ? "Stop" : "Start"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this time entry?")) act(() => send(`/api/time-entries/${entry.id}`, "DELETE"));
            }}
            className="rounded px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

export function DayView({
  entries,
  projects,
  date,
  userId,
}: {
  entries: EntryVM[];
  projects: ProjectOption[];
  date: string;
  userId: string;
}) {
  const [adding, setAdding] = useState(false);
  const anyRunning = entries.some((e) => e.timerStartedAt);
  const now = useNow(anyRunning);
  const totalMinutes = entries.reduce((sum, e) => {
    if (!e.timerStartedAt) return sum + e.minutes;
    return sum + e.minutes + Math.max(0, Math.floor((now - new Date(e.timerStartedAt).getTime()) / 60000));
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      {adding ? (
        <EntryForm projects={projects} date={date} userId={userId} onDone={() => setAdding(false)} />
      ) : (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            + Track time
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No time tracked for this day.</p>
        ) : (
          <ul className="-mt-px">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} projects={projects} userId={userId} now={now} />
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-4 border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          <span className="text-zinc-500">Total</span>
          <span suppressHydrationWarning className="w-24 text-right font-mono font-semibold tabular-nums text-zinc-900">
            {formatMinutes(totalMinutes)}
          </span>
          <span className="w-[13.5rem]" />
        </div>
      </div>
    </div>
  );
}
