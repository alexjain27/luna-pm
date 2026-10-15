import Link from "next/link";
import { ListTodo } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";

export function RecentTasks({
  tasks,
}: {
  tasks: {
    id: string;
    name: string;
    location: string;
    status: { name: string; color: string };
  }[];
}) {
  if (tasks.length === 0) {
    return <p className="text-xs italic text-zinc-400">No tasks yet.</p>;
  }

  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/tasks/${task.id}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50"
          >
            <ListTodo className="size-4 shrink-0 text-zinc-400" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-zinc-900">{task.name}</span>
              <span className="truncate text-xs text-zinc-400">in {task.location}</span>
            </span>
            <span className="shrink-0">
              <StatusBadge name={task.status.name} color={task.status.color} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
