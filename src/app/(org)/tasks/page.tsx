import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    where: { parentTaskId: null },
    orderBy: { createdAt: "desc" },
    include: {
      workspace: true,
      project: true,
      status: true,
      owner: true,
      lists: {
        include: { list: true },
      },
      _count: {
        select: { subtasks: true },
      },
    },
  });

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Tasks</h2>
          <p className="text-sm text-zinc-500">
            Monitor task status, owners, and approvals.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
        >
          New task
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          No tasks yet. Create a task to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Lists</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-zinc-900 hover:underline"
                    >
                      {task.name}
                    </Link>
                    {task._count.subtasks > 0 && (
                      <span className="ml-1 text-xs text-zinc-400">
                        ({task._count.subtasks})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {task.workspace.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {task.project?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {task.lists.length > 0
                      ? task.lists.map((lt) => lt.list.name).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {task.owner?.name ?? task.owner?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      name={task.status.name}
                      color={task.status.color}
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(task.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
