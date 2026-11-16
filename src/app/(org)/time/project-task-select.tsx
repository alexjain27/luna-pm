"use client";

import type { ProjectOption } from "./types";

const selectClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

export function ProjectTaskSelect({
  projects,
  projectId,
  taskId,
  onChange,
}: {
  projects: ProjectOption[];
  projectId: string;
  taskId: string;
  onChange: (projectId: string, taskId: string) => void;
}) {
  const byWorkspace = new Map<string, ProjectOption[]>();
  for (const p of projects) {
    byWorkspace.set(p.workspaceName, [...(byWorkspace.get(p.workspaceName) ?? []), p]);
  }
  const project = projects.find((p) => p.id === projectId);

  return (
    <>
      <select
        aria-label="Project"
        className={`${selectClass} min-w-56`}
        value={projectId}
        onChange={(e) => onChange(e.target.value, "")}
      >
        <option value="">Select project…</option>
        {[...byWorkspace.entries()].map(([ws, ps]) => (
          <optgroup key={ws} label={ws}>
            {ps.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        aria-label="Task"
        className={`${selectClass} min-w-48`}
        value={taskId}
        disabled={!project}
        onChange={(e) => onChange(projectId, e.target.value)}
      >
        <option value="">General (no task)</option>
        {project?.tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </>
  );
}

export { selectClass };
