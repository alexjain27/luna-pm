"use client";

import { StatusBadge } from "./status-badge";

interface KanbanTask {
  id: string;
  name: string;
  statusId: string;
  ownerName?: string | null;
  dueDate?: Date | null;
  priority: string;
  groupLabel: string;
}

interface KanbanStatus {
  id: string;
  name: string;
  color: string;
}

export function KanbanBoard({
  statuses,
  tasks,
}: {
  statuses: KanbanStatus[];
  tasks: KanbanTask[];
}) {
  const groups = Array.from(new Set(tasks.map((t) => t.groupLabel))).sort();

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-4 min-w-max"
        style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(240px, 1fr))` }}
      >
        {statuses.map((status) => {
          const statusTasks = tasks.filter((t) => t.statusId === status.id);
          return (
            <div key={status.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: status.color }}>
                <StatusBadge name={status.name} color={status.color} />
                <span className="text-xs text-gray-500">{statusTasks.length}</span>
              </div>
              {groups.map((group) => {
                const groupTasks = statusTasks.filter((t) => t.groupLabel === group);
                if (groupTasks.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                      {group}
                    </div>
                    {groupTasks.map((task) => (
                      <a
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="block bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">{task.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {task.ownerName && <span>{task.ownerName}</span>}
                          {task.dueDate && (
                            <span>
                              {new Date(task.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          {task.priority !== "NORMAL" && (
                            <span
                              className={`font-medium ${
                                task.priority === "URGENT"
                                  ? "text-red-600"
                                  : task.priority === "HIGH"
                                    ? "text-orange-500"
                                    : "text-gray-400"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
