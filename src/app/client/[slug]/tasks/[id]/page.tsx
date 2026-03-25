import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { CommentList } from "@/components/comment-list";
import { EditDescription } from "@/components/edit-description";
import { EditTaskMeta } from "@/components/edit-task-meta";
import { EditTaskName } from "@/components/edit-task-name";
import { AddSubtaskForm } from "@/components/add-subtask-form";
import { TaskFileUpload } from "@/components/task-file-upload";
import { TaskActivityLog } from "@/components/task-activity-log";

export default async function ClientTaskPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, type: true, primaryUserId: true },
  });

  if (!workspace || workspace.type !== "CLIENT") notFound();

  const task = await prisma.task.findUnique({
    where: { id, workspaceId: workspace.id },
    include: {
      project: true,
      status: true,
      owner: true,
      requestor: true,
      subtasks: {
        include: { status: true, owner: true },
        orderBy: { createdAt: "asc" },
      },
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
  const actorId = workspace.primaryUserId ?? undefined;

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
          <Link href={`/client/${slug}`} className="hover:underline">Overview</Link>
          {task.project && (
            <>
              <span className="text-zinc-300">/</span>
              <Link href={`/client/${slug}/projects/${task.project.id}`} className="hover:underline">
                {task.project.name}
              </Link>
            </>
          )}
        </div>
        <EditTaskName taskId={task.id} initialName={task.name} actorId={actorId} />
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
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {/* Description */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Description</h3>
            <EditDescription taskId={task.id} initialValue={task.description} actorId={actorId} />
          </section>

          {/* Subtasks */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Subtasks {task.subtasks.length > 0 && `(${task.subtasks.length})`}
            </h3>
            {task.subtasks.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge name={sub.status.name} color={sub.status.color} />
                      <span className="text-sm text-zinc-900">{sub.name}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{sub.owner?.name ?? "Unassigned"}</span>
                  </div>
                ))}
              </div>
            )}
            {!task.parentTaskId && defaultStatus && actorId && (
              <AddSubtaskForm taskId={task.id} defaultStatusId={defaultStatus.id} />
            )}
          </section>

          {/* Comments */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Comments</h3>
            {actorId ? (
              <CommentList comments={task.comments} taskId={task.id} authorId={actorId} />
            ) : (
              task.comments.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No comments yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg bg-zinc-50 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-zinc-900">
                          {comment.author.name ?? comment.author.email}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )
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
              actorId={actorId}
              currentStatusId={task.statusId}
              currentPriority={task.priority}
              currentOwnerId={task.ownerId}
              currentRequestorId={task.requestorId}
              currentStartDate={task.startDate}
              currentDueDate={task.dueDate}
              statuses={statuses}
              users={users}
            />
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Attachments</h3>
            {actorId ? (
              <TaskFileUpload
                taskId={task.id}
                uploaderId={actorId}
                workspaceId={workspace.id}
                existingFiles={task.files}
              />
            ) : (
              task.files.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No attachments.</p>
              ) : (
                <div className="flex flex-col gap-1 text-sm">
                  {task.files.map((tf) => (
                    <div key={tf.id} className="flex items-center gap-2 text-zinc-600">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {tf.file.filename}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Approval */}
          {task.approval && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Approval</h3>
              <div className="text-sm">
                <span className={`font-semibold ${
                  task.approval.status === "APPROVED" ? "text-emerald-600" :
                  task.approval.status === "REJECTED" ? "text-red-600" :
                  "text-amber-600"
                }`}>
                  {formatLabel(task.approval.status)}
                </span>
                {task.approval.note && (
                  <p className="mt-2 text-xs text-zinc-600">{task.approval.note}</p>
                )}
                {task.approval.decidedBy && (
                  <p className="mt-1 text-xs text-zinc-400">
                    by {task.approval.decidedBy.name} on {formatDate(task.approval.decidedAt)}
                  </p>
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
