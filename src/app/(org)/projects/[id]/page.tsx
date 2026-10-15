import Link from "next/link";
import { notFound } from "next/navigation";
import { List as ListIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ExpandableSection } from "@/components/expandable-section";
import { KanbanBoard } from "@/components/kanban-board";
import { FileTree } from "@/components/file-tree";
import { PageHeader, parseView } from "@/components/page-header";
import { OverviewCard } from "@/components/overview-card";
import { ProgressBar } from "@/components/progress-bar";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { RecentTasks } from "@/components/recent-tasks";
import { TaskTable } from "@/components/task-table";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const view = parseView((await searchParams).view);

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
        orderBy: { updatedAt: "desc" },
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
  // Statuses are ordered as a workflow; a task in the last one counts as complete.
  const doneStatusId = statuses.at(-1)?.id;
  const countDone = (tasks: { statusId: string }[]) =>
    tasks.filter((t) => t.statusId === doneStatusId).length;

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

  const recentTasks = project.tasks.slice(0, 8).map((t) => ({
    id: t.id,
    name: t.name,
    location: t.lists.length > 0 ? t.lists.map((l) => l.list.name).join(", ") : project.name,
    status: t.status,
  }));

  const folderTree = buildFolderTree(project.folders);
  const rootFiles = project.files;
  const basePath = `/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: project.workspace.name, href: `/workspaces/${project.workspace.id}` },
          { label: "Project" },
        ]}
        title={project.name}
        badge={<ProjectStatusBadge status={project.status} />}
        actions={
          <Link
            href={`/tasks/new?workspaceId=${project.workspace.id}&projectId=${project.id}`}
            className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            New task
          </Link>
        }
        basePath={basePath}
        activeView={view}
      />

      {view === "overview" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <OverviewCard title="Recent">
              <RecentTasks tasks={recentTasks} />
            </OverviewCard>

            <OverviewCard title="Assets">
              <FileTree folders={folderTree} rootFiles={rootFiles} />
            </OverviewCard>

            <OverviewCard title="Details">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Dates</dt>
                  <dd className="text-zinc-900">
                    {project.startDate
                      ? `${formatDate(project.startDate)} — ${formatDate(project.endDate)}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Progress</dt>
                  <dd>
                    <ProgressBar done={countDone(project.tasks)} total={project.tasks.length} />
                  </dd>
                </div>
                {project.customFieldValues.map((cfv) => (
                  <div key={cfv.id} className="flex justify-between gap-3">
                    <dt className="text-zinc-500">{cfv.customField.name}</dt>
                    <dd className="text-right text-zinc-900">{cfv.value}</dd>
                  </div>
                ))}
                {project.description && (
                  <p className="mt-2 border-t border-zinc-100 pt-2 text-zinc-600">
                    {project.description}
                  </p>
                )}
              </dl>
            </OverviewCard>
          </div>

          <OverviewCard title="Lists" className="min-h-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="border-b border-zinc-100">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: null, name: "Direct tasks", tasks: directTasks },
                  ...project.lists.map((list) => ({
                    id: list.id,
                    name: list.name,
                    tasks: list.tasks.map((lt) => lt.task),
                  })),
                ].map((row) => (
                  <tr key={row.id ?? "direct"} className="border-b border-zinc-100 last:border-b-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`${basePath}?view=list${row.id ? `#list-${row.id}` : ""}`}
                        className="flex items-center gap-2 font-medium text-zinc-900 hover:underline"
                      >
                        <ListIcon className="size-4 text-zinc-400" />
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <ProgressBar done={countDone(row.tasks)} total={row.tasks.length} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OverviewCard>
        </>
      )}

      {view === "list" && (
        <div className="flex flex-col gap-4">
          {/* Direct project tasks */}
          {directTasks.length > 0 && (
            <ExpandableSection title="Direct Tasks" count={directTasks.length} defaultOpen>
              <TaskTable tasks={directTasks} />
            </ExpandableSection>
          )}

          {/* Sublists */}
          {project.lists.map((list) => (
            <ExpandableSection
              key={list.id}
              id={`list-${list.id}`}
              title={list.name}
              count={list.tasks.length}
              defaultOpen
            >
              {list.tasks.length === 0 ? (
                <p className="text-xs italic text-zinc-400">No tasks in this list.</p>
              ) : (
                <TaskTable tasks={list.tasks.map((lt) => lt.task)} />
              )}
            </ExpandableSection>
          ))}

          {directTasks.length === 0 && project.lists.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
              No tasks or lists yet.
            </p>
          )}
        </div>
      )}

      {view === "board" && <KanbanBoard statuses={statuses} tasks={kanbanTasks} />}
    </div>
  );
}
