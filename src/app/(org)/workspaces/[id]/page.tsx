import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Tabs } from "@/components/tabs";
import { ExpandableSection } from "@/components/expandable-section";
import { KanbanBoard } from "@/components/kanban-board";
import { FileTree } from "@/components/file-tree";
import { CopyLinkButton } from "@/components/copy-link-button";

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

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      primaryUser: true,
      customFields: { orderBy: { order: "asc" } },
      projects: {
        orderBy: { name: "asc" },
        include: {
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
          customFieldValues: { include: { customField: true } },
        },
      },
      tasks: {
        where: { projectId: null, parentTaskId: null },
        include: {
          status: true,
          owner: true,
          _count: { select: { subtasks: true } },
        },
        orderBy: { createdAt: "desc" },
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

  if (!workspace) notFound();

  const statuses = await prisma.taskStatus.findMany({
    where: { state: "ACTIVE" },
    orderBy: { order: "asc" },
  });

  const allTasks = await prisma.task.findMany({
    where: { workspaceId: id, parentTaskId: null },
    include: {
      status: true,
      owner: true,
      project: true,
      lists: { include: { list: true } },
    },
  });

  const kanbanTasks = allTasks.map((t) => ({
    id: t.id,
    name: t.name,
    statusId: t.statusId,
    ownerName: t.owner?.name ?? t.owner?.email ?? null,
    dueDate: t.dueDate,
    priority: t.priority,
    groupLabel: t.project?.name ?? "Workspace",
  }));

  const folderTree = buildFolderTree(workspace.folders);
  const rootFiles = workspace.files;

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Workspace
              </p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                workspace.type === "CLIENT"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}>
                {workspace.type}
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
              {workspace.name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-zinc-500">{workspace.slug}</p>
              {workspace.type === "CLIENT" && (
                <CopyLinkButton path={`/client/${workspace.slug}`} />
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600">{workspace.address}</p>
            {workspace.type === "CLIENT" && workspace.primaryUser && (
              <p className="mt-1 text-sm text-zinc-600">
                Primary contact: {workspace.primaryUser.name ?? workspace.primaryUser.email}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/tasks/new?workspaceId=${workspace.id}`}
              className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              New task
            </Link>
            <Link
              href="/workspaces"
              className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
            >
              Back
            </Link>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main content */}
        <div>
          <Tabs tabs={[{ id: "projects", label: "Projects & Lists" }, { id: "kanban", label: "Kanban" }]}>
            {/* Projects & Lists Tab */}
            <div className="flex flex-col gap-4">
              {/* Workspace implicit list */}
              {workspace.tasks.length > 0 && (
                <ExpandableSection title="Workspace Tasks" count={workspace.tasks.length} defaultOpen>
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
                        {workspace.tasks.map((task) => (
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

              {/* Projects */}
              {workspace.projects.map((project) => {
                const directTasks = project.tasks.filter(
                  (t) => t.lists.length === 0
                );
                return (
                  <ExpandableSection
                    key={project.id}
                    title={project.name}
                    count={project.tasks.length}
                    defaultOpen
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${
                        project.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                        project.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                        project.status === "INTAKE" ? "bg-blue-50 text-blue-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {formatLabel(project.status)}
                      </span>
                      {project.customFieldValues.map((cfv) => (
                        <span key={cfv.id} className="text-zinc-400">
                          {cfv.customField.name}: {cfv.value}
                        </span>
                      ))}
                      <Link href={`/projects/${project.id}`} className="ml-auto text-blue-600 hover:underline">
                        View project
                      </Link>
                    </div>

                    {/* Direct project tasks */}
                    {directTasks.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-semibold uppercase text-zinc-400">Direct tasks</p>
                        <div className="overflow-hidden rounded-lg border border-zinc-200">
                          <table className="w-full text-left text-sm">
                            <tbody>
                              {directTasks.map((task) => (
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
                                  <td className="px-3 py-2"><StatusBadge name={task.status.name} color={task.status.color} /></td>
                                  <td className="px-3 py-2 text-zinc-600">{formatDate(task.dueDate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sublists */}
                    {project.lists.map((list) => (
                      <div key={list.id} className="mb-2">
                        <p className="mb-1 text-xs font-semibold uppercase text-zinc-400">{list.name}</p>
                        {list.tasks.length === 0 ? (
                          <p className="text-xs italic text-zinc-400 pl-2">No tasks</p>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-zinc-200">
                            <table className="w-full text-left text-sm">
                              <tbody>
                                {list.tasks.map((lt) => (
                                  <tr key={lt.id} className="border-t border-zinc-200 first:border-t-0">
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
                      </div>
                    ))}
                  </ExpandableSection>
                );
              })}

              {workspace.projects.length === 0 && workspace.tasks.length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                  No projects or tasks yet.
                </p>
              )}
            </div>

            {/* Kanban Tab */}
            <KanbanBoard statuses={statuses} tasks={kanbanTasks} />
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Custom Fields */}
          {workspace.customFields.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Custom Fields</h3>
              <div className="flex flex-col gap-2 text-sm">
                {workspace.customFields.map((cf) => (
                  <div key={cf.id} className="flex items-center justify-between">
                    <span className="text-zinc-600">{cf.name}</span>
                    <span className="text-xs text-zinc-400">{cf.type}{cf.options.length > 0 ? ` (${cf.options.length})` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Assets</h3>
            <FileTree folders={folderTree} rootFiles={rootFiles} />
          </div>
        </div>
      </div>
    </main>
  );
}
