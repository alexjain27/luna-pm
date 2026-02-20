import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

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
        include: {
          status: true,
          owner: true,
        },
        orderBy: { createdAt: "asc" },
      },
      lists: { include: { list: true } },
      approval: { include: { decidedBy: true } },
      comments: {
        where: { parentCommentId: null },
        include: {
          author: true,
          replies: {
            include: { author: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      files: {
        include: {
          file: true,
        },
      },
    },
  });

  if (!task) notFound();

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
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
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">{task.name}</h2>
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
          {task.description && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Description</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{task.description}</p>
            </section>
          )}

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                Subtasks ({task.subtasks.length})
              </h3>
              <div className="flex flex-col gap-2">
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
            </section>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Comments ({task.comments.length})
            </h3>
            {task.comments.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">No comments yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-2">
                    <div className="rounded-lg bg-zinc-50 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-zinc-900">
                          {comment.author.name ?? comment.author.email}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                    {/* Replies */}
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="ml-8 rounded-lg bg-zinc-50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-zinc-900">
                            {reply.author.name ?? reply.author.email}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 whitespace-pre-wrap">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Meta */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Details</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Status</dt>
                <dd><StatusBadge name={task.status.name} color={task.status.color} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Priority</dt>
                <dd className="text-zinc-900">{formatLabel(task.priority)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Owner</dt>
                <dd className="text-zinc-900">{task.owner?.name ?? task.owner?.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Requestor</dt>
                <dd className="text-zinc-900">{task.requestor?.name ?? task.requestor?.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Due date</dt>
                <dd className="text-zinc-900">{formatDate(task.dueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Start date</dt>
                <dd className="text-zinc-900">{formatDate(task.startDate)}</dd>
              </div>
              {task.lists.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Lists</dt>
                  <dd className="text-zinc-900 text-right">
                    {task.lists.map((l) => l.list.name).join(", ")}
                  </dd>
                </div>
              )}
              {task.timeEstimate && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Estimate</dt>
                  <dd className="text-zinc-900">{task.timeEstimate}h</dd>
                </div>
              )}
              {task.points && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Points</dt>
                  <dd className="text-zinc-900">{task.points}</dd>
                </div>
              )}
              {task.tags.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Tags</dt>
                  <dd className="flex flex-wrap gap-1 justify-end">
                    {task.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
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

          {/* Files */}
          {task.files.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Files</h3>
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
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
