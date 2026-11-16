"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatDay, formatMinutes, parseDuration } from "@/lib/billing-format";
import { ProjectTaskSelect } from "./project-task-select";
import type { EntryVM, ProjectOption } from "./types";

type Row = { projectId: string; taskId: string | null };
const rowKey = (r: Row) => `${r.projectId}|${r.taskId ?? ""}`;

function Cell({
  entries,
  row,
  date,
  userId,
  userParam,
}: {
  entries: EntryVM[];
  row: Row;
  date: string;
  userId: string;
  userParam: string;
}) {
  const router = useRouter();
  const total = entries.reduce((s, e) => s + e.minutes, 0);
  const editable =
    entries.length === 0 || (entries.length === 1 && !entries[0].invoiceNumber && !entries[0].timerStartedAt);
  const [value, setValue] = useState(total ? formatMinutes(total) : "");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editable) {
    const running = entries.some((e) => e.timerStartedAt);
    return (
      <Link
        href={`/time?date=${date}&view=day${userParam}`}
        title={running ? "Timer running — open day view" : "Multiple or invoiced entries — open day view"}
        className={`block rounded-md px-2 py-1.5 text-right font-mono text-sm tabular-nums hover:bg-zinc-100 ${
          running ? "text-emerald-700" : "text-zinc-500"
        }`}
      >
        {formatMinutes(total)}
        {running ? " ●" : ""}
      </Link>
    );
  }

  async function commit() {
    const trimmed = value.trim();
    const minutes = trimmed ? parseDuration(trimmed) : 0;
    if (minutes == null) {
      setError(true);
      return;
    }
    setError(false);
    if (minutes === total) {
      setValue(minutes ? formatMinutes(minutes) : "");
      return;
    }
    setSaving(true);
    try {
      const existing = entries[0];
      let res: Response;
      if (existing && minutes === 0) {
        res = await fetch(`/api/time-entries/${existing.id}`, { method: "DELETE" });
      } else if (existing) {
        res = await fetch(`/api/time-entries/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes }),
        });
      } else {
        res = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, projectId: row.projectId, taskId: row.taskId, date, minutes }),
        });
      }
      if (!res.ok) throw new Error();
      setValue(minutes ? formatMinutes(minutes) : "");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      aria-label={`Hours on ${date}`}
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`h-8 w-full rounded-md border px-2 text-right font-mono text-sm tabular-nums outline-none focus:border-zinc-400 ${
        error ? "border-red-400 bg-red-50" : "border-zinc-200 bg-white"
      }`}
      placeholder="0:00"
    />
  );
}

export function WeekGrid({
  entries,
  projects,
  days,
  userId,
  userParam,
}: {
  entries: EntryVM[];
  projects: ProjectOption[];
  days: string[];
  userId: string;
  userParam: string;
}) {
  const [extraRows, setExtraRows] = useState<Row[]>([]);
  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newTask, setNewTask] = useState("");

  const rowsMap = new Map<string, Row>();
  for (const e of entries) {
    const r = { projectId: e.projectId, taskId: e.taskId };
    rowsMap.set(rowKey(r), r);
  }
  for (const r of extraRows) rowsMap.set(rowKey(r), r);
  const rows = [...rowsMap.values()];

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const entryFor = (r: Row, d: string) =>
    entries.filter((e) => e.projectId === r.projectId && (e.taskId ?? null) === (r.taskId ?? null) && e.date === d);

  const label = (r: Row) => {
    const sample = entries.find((e) => e.projectId === r.projectId && e.taskId === r.taskId);
    const p = projectById.get(r.projectId);
    return {
      project: sample?.projectName ?? p?.name ?? "Project",
      workspace: sample?.workspaceName ?? p?.workspaceName ?? "",
      task: sample?.taskName ?? p?.tasks.find((t) => t.id === r.taskId)?.name ?? (r.taskId ? "Task" : "General"),
    };
  };

  const dayTotal = (d: string) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.minutes, 0);
  const rowTotal = (r: Row) => days.reduce((s, d) => s + entryFor(r, d).reduce((a, e) => a + e.minutes, 0), 0);
  const weekTotal = days.reduce((s, d) => s + dayTotal(d), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Project / Task</th>
              {days.map((d) => (
                <th key={d} className="w-24 px-1 py-2 text-right font-semibold">
                  <Link href={`/time?date=${d}&view=day${userParam}`} className="hover:underline">
                    {formatDay(d, { weekday: "short", day: "numeric" })}
                  </Link>
                </th>
              ))}
              <th className="w-20 px-4 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-6 text-zinc-500">
                  No time this week. Add a row to start filling in your timesheet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const l = label(r);
              return (
                <tr key={rowKey(r)} className="border-t border-zinc-200">
                  <td className="px-4 py-2">
                    <div className="font-medium text-zinc-900">
                      {l.project} <span className="text-xs font-normal text-zinc-400">({l.workspace})</span>
                    </div>
                    <div className="text-xs text-zinc-500">{l.task}</div>
                  </td>
                  {days.map((d) => {
                    const cellEntries = entryFor(r, d);
                    return (
                      <td key={d} className="px-1 py-2">
                        <Cell
                          key={cellEntries.map((e) => `${e.id}:${e.minutes}`).join(",") || "empty"}
                          entries={cellEntries}
                          row={r}
                          date={d}
                          userId={userId}
                          userParam={userParam}
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums">
                    {formatMinutes(rowTotal(r))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50">
            <tr>
              <td className="px-4 py-2 text-xs font-semibold uppercase text-zinc-500">Total</td>
              {days.map((d) => (
                <td key={d} className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                  {formatMinutes(dayTotal(d))}
                </td>
              ))}
              <td className="px-4 py-2 text-right font-mono font-bold tabular-nums">{formatMinutes(weekTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <ProjectTaskSelect
            projects={projects}
            projectId={newProject}
            taskId={newTask}
            onChange={(p, t) => {
              setNewProject(p);
              setNewTask(t);
            }}
          />
          <button
            disabled={!newProject}
            onClick={() => {
              setExtraRows((rs) => [...rs, { projectId: newProject, taskId: newTask || null }]);
              setAdding(false);
              setNewProject("");
              setNewTask("");
            }}
            className="rounded bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Add row
          </button>
          <button
            onClick={() => setAdding(false)}
            className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
          >
            + Add row
          </button>
        </div>
      )}
    </div>
  );
}
