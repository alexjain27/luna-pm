import { formatDateTime } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  statusId: "Status",
  priority: "Priority",
  ownerId: "Owner",
  requestorId: "Requestor",
  startDate: "Start date",
  dueDate: "Due date",
  description: "Description",
};

type LogEntry = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  actor: { name: string | null; email: string | null };
};

export function TaskActivityLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900 mb-3">Activity</h3>
      <ol className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.id} className="text-xs text-zinc-600">
            <span className="font-medium text-zinc-800">
              {e.actor.name ?? e.actor.email}
            </span>{" "}
            {buildSentence(e.field, e.oldValue, e.newValue)}
            <span className="block text-zinc-400 mt-0.5">{formatDateTime(e.createdAt)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function buildSentence(field: string, oldVal: string | null, newVal: string | null): string {
  const label = FIELD_LABELS[field] ?? field;
  if (!oldVal && newVal) return `set ${label} to "${newVal}"`;
  if (oldVal && !newVal) return `cleared ${label} (was "${oldVal}")`;
  if (oldVal && newVal) return `changed ${label} from "${oldVal}" to "${newVal}"`;
  return `updated ${label}`;
}
