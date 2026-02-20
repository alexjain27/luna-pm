import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Tabs } from "@/components/tabs";
import { ExpandableSection } from "@/components/expandable-section";
import { KanbanBoard } from "@/components/kanban-board";
import { FileTree } from "@/components/file-tree";

interface TreeFolder {
  id: string;
  name: string;
  parentId: string | null;
  children: TreeFolder[];
  files: { id: string; filename: string; size: number; mimeType: string }[];
}

function buildFolderTree(
  folders: { id: string; name: string; parentId: string | null; files: { id: string; filename: string; size: number; mimeType: string }[] }[],
  parentId: string | null = null
): TreeFolder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .map((f) => ({
      ...f,
      children: buildFolderTree(folders, f.id),
    }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      workspace: true,
      customFieldValues: { include: { customField: true } },
      tasks: {
        where: { parentTaskId: null },
        include: {
          status: true,
          owner: true,
          lists: { include: { list: true } },
          _count: { select: { subtasks: true } },
        },
      },
      lists: {
        orderBy: { name: "asc" },
        include: {
          tasks: {
            include: {
              task: {
                include: {
                  status: true,
                  owner: true,
                  _count: { select: { subtasks: true } },
                },
              },
            },
          },
        },
      },
      folders: {
        include: {
          files: { select: { id: true, filename: true, size: true, mimeType: true } },
        },
      },
      files: {
        where: { folderId: null },
        select: { id: true, filename: true, size: true, mimeType: true },
      },
    },
  });

  if (!project) notFound();

  const statuses = await prisma.taskStatus.findMany({
    where: { state: "ACTIVE" },
    orderBy: { order: "asc" },
  });

  const directTasks = project.tasks.filter((t) => t.lists.length === 0);

  const kanbanTasks = project.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    statusId: t.statusId,
    ownerName: t.owner?.name ?? t.owner?.email ?? null,
    dueDate: t.dueDate,
    priority: t.priority,
    groupLabel: t.lists.length > 0 ? t.lists.map((l) => l.list.name).join(", ") : "Direct",
  }));

  const folderTree = buildFolderTree(project.folders);
  const rootFiles = project.files;

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <Link href={`/workspaces/${project.workspace.id}`} className="text-zinc-500 hover:underline">
                {project.workspace.name}
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Project</span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
              {project.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                project.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                project.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                project.status === "INTAKE" ? "bg-blue-50 text-blue-700" :
                "bg-zinc-100 text-zinc-600"
              }`}>
                {formatLabel(project.status)}
              </span>
              {project.startDate && (
                <span className="text-sm text-zinc-500">
                  {formatDate(project.startDate)} — {formatDate(project.endDate)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-zinc-600">{project.description}</p>
            )}
            {project.customFieldValues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {project.customFieldValues.map((cfv) => (
                  <span key={cfv.id} className="text-zinc-500">
                    <span className="font-medium text-zinc-700">{cfv.customField.name}:</span> {cfv.value}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/tasks/new?workspaceId=${project.workspace.id}&projectId=${project.id}`}
              className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              New task
            </Link>
            <Link
              href={`/workspaces/${project.workspace.id}`}
              className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
            >
              Back
            </Link>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Tabs tabs={[{ id: "lists", label: "Lists" }, { id: "kanban", label: "Kanban" }]}>
            {/* Lists Tab */}
            <div className="flex flex-col gap-4">
              {/* Direct project tasks */}
              {directTasks.length > 0 && (
                <ExpandableSection title="Direct Tasks" count={directTasks.length} defaultOpen>
                  <div className="overflow-hidden rounded-lg border border-zinc-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Task</th>
                          <th className="px-3 py-2 font-semibold">Owner</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {directTasks.map((task) => (
                          <tr key={task.id} className="border-t border-zinc-200">
                            <td className="px-3 py-2">
                              <Link href={`/tasks/${task.id}`} className="font-medium text-zinc-900 hover:underline">
                                {task.name}
                              </Link>
                              {task._count.subtasks > 0 && (
                                <span className="ml-1 text-xs text-zinc-400">+{task._count.subtasks}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-zinc-600">{task.owner?.name ?? "—"}</td>
                            <td className="px-3 py-2"><StatusBadge name={task.status.name} color={task.status.color} /></td>
                            <td className="px-3 py-2 text-zinc-600">{formatDate(task.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ExpandableSection>
              )}

              {/* Sublists */}
              {project.lists.map((list) => (
                <ExpandableSection key={list.id} title={list.name} count={list.tasks.length} defaultOpen>
                  {list.tasks.length === 0 ? (
                    <p className="text-xs italic text-zinc-400">No tasks in this list.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-zinc-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Task</th>
                            <th className="px-3 py-2 font-semibold">Owner</th>
                            <th className="px-3 py-2 font-semibold">Status</th>
                            <th className="px-3 py-2 font-semibold">Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.tasks.map((lt) => (
                            <tr key={lt.id} className="border-t border-zinc-200">
                              <td className="px-3 py-2">
                                <Link href={`/tasks/${lt.task.id}`} className="font-medium text-zinc-900 hover:underline">
                                  {lt.task.name}
                                </Link>
                                {lt.task._count.subtasks > 0 && (
                                  <span className="ml-1 text-xs text-zinc-400">+{lt.task._count.subtasks}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-zinc-600">{lt.task.owner?.name ?? "—"}</td>
                              <td className="px-3 py-2"><StatusBadge name={lt.task.status.name} color={lt.task.status.color} /></td>
                              <td className="px-3 py-2 text-zinc-600">{formatDate(lt.task.dueDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableSection>
              ))}

              {directTasks.length === 0 && project.lists.length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                  No tasks or lists yet.
                </p>
              )}
            </div>

            {/* Kanban Tab */}
            <KanbanBoard statuses={statuses} tasks={kanbanTasks} />
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Assets</h3>
          <FileTree folders={folderTree} rootFiles={rootFiles} />
        </div>
      </div>
    </main>
  );
}
