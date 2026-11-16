import Link from "next/link";

type Option = { id: string; name: string };

const fieldClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400";

/** GET form for date-range + entity filters. Works without client JS. */
export function ReportFilters({
  action,
  presets,
  values,
  workspaces,
  projects,
  users,
  showBillable = true,
}: {
  action: string;
  presets: { id: string; label: string; from: string; to: string }[];
  values: { from: string; to: string; workspaceId?: string; projectId?: string; userId?: string; billable?: string };
  workspaces?: Option[];
  projects?: Option[];
  users?: Option[];
  showBillable?: boolean;
}) {
  const keep = (from: string, to: string) => {
    const q = new URLSearchParams({ from, to });
    for (const k of ["workspaceId", "projectId", "userId", "billable"] as const) {
      if (values[k]) q.set(k, values[k]!);
    }
    return `${action}?${q}`;
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const active = p.from === values.from && p.to === values.to;
          return (
            <Link
              key={p.id}
              href={keep(p.from, p.to)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="date" name="from" defaultValue={values.from} className={fieldClass} aria-label="From" />
        <span className="text-zinc-400">–</span>
        <input type="date" name="to" defaultValue={values.to} className={fieldClass} aria-label="To" />
        {workspaces && (
          <select name="workspaceId" defaultValue={values.workspaceId ?? ""} className={fieldClass} aria-label="Client">
            <option value="">All clients</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        {projects && (
          <select name="projectId" defaultValue={values.projectId ?? ""} className={fieldClass} aria-label="Project">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {users && (
          <select name="userId" defaultValue={values.userId ?? ""} className={fieldClass} aria-label="Person">
            <option value="">Everyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {showBillable && (
          <select name="billable" defaultValue={values.billable ?? ""} className={fieldClass} aria-label="Billable">
            <option value="">Billable & non-billable</option>
            <option value="billable">Billable only</option>
            <option value="nonbillable">Non-billable only</option>
          </select>
        )}
        <button type="submit" className="rounded bg-black px-3 py-2 text-xs font-semibold text-white">
          Apply
        </button>
      </form>
    </div>
  );
}
