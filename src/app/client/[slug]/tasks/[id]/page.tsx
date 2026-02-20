import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function ClientTaskPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, type: true },
  });

  if (!workspace || workspace.type !== "CLIENT") notFound();

  const task = await prisma.task.findUnique({
    where: { id, workspaceId: workspace.id },
    include: {
      project: true,
      status: true,
      owner: true,
      subtasks: {
        include: { status: true, owner: true },
        orderBy: { createdAt: "asc" },
      },
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
    },
  });

  if (!task) notFound();

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
        <h2 className="text-2xl font-semibold text-zinc-900">{task.name}</h2>
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
          {task.owner && (
            <span className="text-sm text-zinc-500">
              Assigned to {task.owner.name ?? task.owner.email}
            </span>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Subtasks</h3>
              <div className="flex flex-col gap-2">
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
            </section>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Comments</h3>
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
                        <span className="text-xs text-zinc-400">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="ml-8 rounded-lg bg-zinc-50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-zinc-900">
                            {reply.author.name ?? reply.author.email}
                          </span>
                          <span className="text-xs text-zinc-400">{formatDate(reply.createdAt)}</span>
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
                <dd className="text-zinc-900">{task.owner?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Due date</dt>
                <dd className="text-zinc-900">{formatDate(task.dueDate)}</dd>
              </div>
            </dl>
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
        </div>
      </div>
    </main>
  );
}
