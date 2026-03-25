import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { CommentList } from "@/components/comment-list";
import { EditDescription } from "@/components/edit-description";
import { EditTaskMeta } from "@/components/edit-task-meta";
import { EditTaskName } from "@/components/edit-task-name";
import { AddSubtaskForm } from "@/components/add-subtask-form";
import { TaskFileUpload } from "@/components/task-file-upload";
import { TaskActivityLog } from "@/components/task-activity-log";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      workspace: true,
      project: true,
      status: true,
      owner: true,
      requestor: true,
      parentTask: true,
      subtasks: {
        include: { status: true, owner: true },
        orderBy: { createdAt: "asc" },
      },
      lists: { include: { list: true } },
      approval: { include: { decidedBy: true } },
      comments: {
        where: { parentCommentId: null },
        include: {
          author: true,
          replies: { include: { author: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      files: { include: { file: true } },
    },
  });

  if (!task) notFound();

  const [statuses, users, activityLogs] = await Promise.all([
    prisma.taskStatus.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.taskActivityLog.findMany({
      where: { taskId: id },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0];

  // Use the first admin user as the actor until proper auth is wired up
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const breadcrumbs = [
    { label: task.workspace.name, href: `/workspaces/${task.workspace.id}` },
    ...(task.project
      ? [{ label: task.project.name, href: `/projects/${task.project.id}` }]
      : []),
  ];

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              {breadcrumbs.map((bc, i) => (
                <span key={bc.href} className="flex items-center gap-1">
                  {i > 0 && <span className="text-zinc-300">/</span>}
                  <Link href={bc.href} className="hover:underline">{bc.label}</Link>
                </span>
              ))}
              {task.parentTask && (
                <>
                  <span className="text-zinc-300">/</span>
                  <Link href={`/tasks/${task.parentTask.id}`} className="hover:underline">
                    {task.parentTask.name}
                  </Link>
                </>
              )}
            </div>
            <EditTaskName taskId={task.id} initialName={task.name} actorId={adminUser?.id} />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusBadge name={task.status.name} color={task.status.color} />
              {task.priority !== "NORMAL" && (
                <span className={`text-xs font-semibold ${
                  task.priority === "URGENT" ? "text-red-600" :
                  task.priority === "HIGH" ? "text-orange-500" : "text-gray-400"
                }`}>
                  {formatLabel(task.priority)}
                </span>
              )}
            </div>
          </div>
          <Link
            href={task.project ? `/projects/${task.project.id}` : `/workspaces/${task.workspace.id}`}
            className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
          >
            Back
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Description */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Description</h3>
            <EditDescription taskId={task.id} initialValue={task.description} actorId={adminUser?.id} />
          </section>

          {/* Subtasks — only shown on top-level tasks */}
          {!task.parentTaskId && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                Subtasks {task.subtasks.length > 0 && `(${task.subtasks.length})`}
              </h3>
              {task.subtasks.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {task.subtasks.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/tasks/${sub.id}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge name={sub.status.name} color={sub.status.color} />
                        <span className="text-sm font-medium text-zinc-900">{sub.name}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{sub.owner?.name ?? "Unassigned"}</span>
                    </Link>
                  ))}
                </div>
              )}
              {defaultStatus && (
                <AddSubtaskForm taskId={task.id} defaultStatusId={defaultStatus.id} />
              )}
            </section>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Comments ({task.comments.length})
            </h3>
            {adminUser ? (
              <CommentList comments={task.comments} taskId={task.id} authorId={adminUser.id} />
            ) : (
              <p className="text-sm text-zinc-400 italic">No admin user found.</p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Details */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Details</h3>
            <EditTaskMeta
              taskId={task.id}
              actorId={adminUser?.id}
              currentStatusId={task.statusId}
              currentPriority={task.priority}
              currentOwnerId={task.ownerId}
              currentRequestorId={task.requestorId}
              currentStartDate={task.startDate}
              currentDueDate={task.dueDate}
              statuses={statuses}
              users={users}
            />
            {task.lists.length > 0 && (
              <dl className="flex flex-col gap-2 text-sm mt-3">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Lists</dt>
                  <dd className="text-zinc-900 text-right">
                    {task.lists.map((l) => l.list.name).join(", ")}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Files */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Attachments</h3>
            {adminUser && (
              <TaskFileUpload
                taskId={task.id}
                uploaderId={adminUser.id}
                workspaceId={task.workspaceId}
                existingFiles={task.files}
              />
            )}
          </div>

          {/* Approval */}
          {task.approval && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Approval</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className={`font-semibold ${
                    task.approval.status === "APPROVED" ? "text-emerald-600" :
                    task.approval.status === "REJECTED" ? "text-red-600" :
                    "text-amber-600"
                  }`}>
                    {formatLabel(task.approval.status)}
                  </span>
                </div>
                {task.approval.decidedBy && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Decided by</span>
                    <span className="text-zinc-900">{task.approval.decidedBy.name}</span>
                  </div>
                )}
                {task.approval.decidedAt && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Decided at</span>
                    <span className="text-zinc-900">{formatDate(task.approval.decidedAt)}</span>
                  </div>
                )}
                {task.approval.note && (
                  <p className="mt-1 text-xs text-zinc-600">{task.approval.note}</p>
                )}
              </div>
            </div>
          )}

          {/* Activity log */}
          <TaskActivityLog entries={activityLogs} />
        </div>
      </div>
    </main>
  );
}
