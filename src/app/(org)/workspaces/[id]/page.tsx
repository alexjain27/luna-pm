import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ExpandableSection } from "@/components/expandable-section";
import { KanbanBoard } from "@/components/kanban-board";
import { FileTree } from "@/components/file-tree";
import { CopyLinkButton } from "@/components/copy-link-button";
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

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const view = parseView((await searchParams).view);

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
  // Statuses are ordered as a workflow; a task in the last one counts as complete.
  const doneStatusId = statuses.at(-1)?.id;

  const allTasks = await prisma.task.findMany({
    where: { workspaceId: id, parentTaskId: null },
    include: {
      status: true,
      owner: true,
      project: true,
      lists: { include: { list: true } },
    },
    orderBy: { updatedAt: "desc" },
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

  const recentTasks = allTasks.slice(0, 8).map((t) => ({
    id: t.id,
    name: t.name,
    location: t.project?.name ?? workspace.name,
    status: t.status,
  }));

  const folderTree = buildFolderTree(workspace.folders);
  const rootFiles = workspace.files;
  const basePath = `/workspaces/${workspace.id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Workspaces", href: "/workspaces" }, { label: workspace.name }]}
        title={workspace.name}
        badge={
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              workspace.type === "CLIENT"
                ? "bg-blue-50 text-blue-700"
                : "bg-purple-50 text-purple-700"
            }`}
          >
            {workspace.type}
          </span>
        }
        actions={
          <Link
            href={`/tasks/new?workspaceId=${workspace.id}`}
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
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Slug</dt>
                  <dd className="flex items-center gap-2 text-zinc-900">
                    {workspace.slug}
                    {workspace.type === "CLIENT" && (
                      <CopyLinkButton path={`/client/${workspace.slug}`} />
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Address</dt>
                  <dd className="text-right text-zinc-900">{workspace.address}</dd>
                </div>
                {workspace.type === "CLIENT" && workspace.primaryUser && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">Primary contact</dt>
                    <dd className="text-zinc-900">
                      {workspace.primaryUser.name ?? workspace.primaryUser.email}
                    </dd>
                  </div>
                )}
                {workspace.customFields.length > 0 && (
                  <div className="mt-2 border-t border-zinc-100 pt-2">
                    <dt className="mb-1 text-xs font-semibold uppercase text-zinc-400">
                      Custom fields
                    </dt>
                    {workspace.customFields.map((cf) => (
                      <dd key={cf.id} className="flex justify-between gap-3">
                        <span className="text-zinc-600">{cf.name}</span>
                        <span className="text-xs text-zinc-400">
                          {cf.type}
                          {cf.options.length > 0 ? ` (${cf.options.length})` : ""}
                        </span>
                      </dd>
                    ))}
                  </div>
                )}
              </dl>
            </OverviewCard>
          </div>

          <OverviewCard title="Projects" className="min-h-0">
            {workspace.projects.length === 0 ? (
              <p className="text-xs italic text-zinc-400">No projects yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-100">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Progress</th>
                    <th className="px-3 py-2 font-medium">Lists</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">End</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.projects.map((project) => (
                    <tr key={project.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="py-2 pr-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-3 py-2">
                        <ProgressBar
                          done={project.tasks.filter((t) => t.statusId === doneStatusId).length}
                          total={project.tasks.length}
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{project.lists.length}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(project.startDate)}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(project.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </OverviewCard>
        </>
      )}

      {view === "list" && (
        <div className="flex flex-col gap-4">
          {/* Workspace implicit list */}
          {workspace.tasks.length > 0 && (
            <ExpandableSection title="Workspace Tasks" count={workspace.tasks.length} defaultOpen>
              <TaskTable tasks={workspace.tasks} />
            </ExpandableSection>
          )}

          {/* Projects */}
          {workspace.projects.map((project) => {
            const directTasks = project.tasks.filter((t) => t.lists.length === 0);
            return (
              <ExpandableSection
                key={project.id}
                title={project.name}
                count={project.tasks.length}
                defaultOpen
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                  <ProjectStatusBadge status={project.status} />
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
                    <TaskTable tasks={directTasks} showHeader={false} />
                  </div>
                )}

                {/* Sublists */}
                {project.lists.map((list) => (
                  <div key={list.id} className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase text-zinc-400">{list.name}</p>
                    {list.tasks.length === 0 ? (
                      <p className="text-xs italic text-zinc-400 pl-2">No tasks</p>
                    ) : (
                      <TaskTable tasks={list.tasks.map((lt) => lt.task)} showHeader={false} />
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
      )}

      {view === "board" && <KanbanBoard statuses={statuses} tasks={kanbanTasks} />}
    </div>
  );
}
