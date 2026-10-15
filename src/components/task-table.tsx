import Link from "next/link";

import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export interface TaskRow {
  id: string;
  name: string;
  dueDate: Date | null;
  owner: { name: string | null } | null;
  status: { name: string; color: string };
  _count: { subtasks: number };
}

export function TaskTable({
  tasks,
  showHeader = true,
}: {
  tasks: TaskRow[];
  showHeader?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full text-left text-sm">
        {showHeader && (
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Task</th>
              <th className="px-3 py-2 font-semibold">Owner</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Due</th>
            </tr>
          </thead>
        )}
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-zinc-200 first:border-t-0">
              <td className="px-3 py-2">
                <Link href={`/tasks/${task.id}`} className="font-medium text-zinc-900 hover:underline">
                  {task.name}
                </Link>
                {task._count.subtasks > 0 && (
                  <span className="ml-1 text-xs text-zinc-400">+{task._count.subtasks}</span>
                )}
              </td>
              <td className="px-3 py-2 text-zinc-600">{task.owner?.name ?? "—"}</td>
              <td className="px-3 py-2">
                <StatusBadge name={task.status.name} color={task.status.color} />
              </td>
              <td className="px-3 py-2 text-zinc-600">{formatDate(task.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
