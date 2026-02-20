import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { ExpandableSection } from "@/components/expandable-section";

export default async function ClientProjectPage({
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

  const project = await prisma.project.findUnique({
    where: { id, workspaceId: workspace.id },
    include: {
      customFieldValues: { include: { customField: true } },
      tasks: {
        where: { parentTaskId: null },
        include: {
          status: true,
          owner: true,
          approval: true,
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
                  approval: true,
                  _count: { select: { subtasks: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const directTasks = project.tasks.filter((t) => t.lists.length === 0);

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
          <Link href={`/client/${slug}`} className="hover:underline">Overview</Link>
          <span className="text-zinc-300">/</span>
          <span>Project</span>
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900">{project.name}</h2>
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
      </section>

      {/* Tasks */}
      <div className="flex flex-col gap-4">
        {directTasks.length > 0 && (
          <ExpandableSection title="Direct Tasks" count={directTasks.length} defaultOpen>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Task</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Due</th>
                    <th className="px-3 py-2 font-semibold">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {directTasks.map((task) => (
                    <tr key={task.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">
                        <Link href={`/client/${slug}/tasks/${task.id}`} className="font-medium text-zinc-900 hover:underline">
                          {task.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2"><StatusBadge name={task.status.name} color={task.status.color} /></td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(task.dueDate)}</td>
                      <td className="px-3 py-2">
                        {task.approval ? (
                          <span className={`text-xs font-semibold ${
                            task.approval.status === "APPROVED" ? "text-emerald-600" :
                            task.approval.status === "REJECTED" ? "text-red-600" :
                            "text-amber-600"
                          }`}>
                            {formatLabel(task.approval.status)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ExpandableSection>
        )}

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
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Due</th>
                      <th className="px-3 py-2 font-semibold">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.tasks.map((lt) => (
                      <tr key={lt.id} className="border-t border-zinc-200">
                        <td className="px-3 py-2">
                          <Link href={`/client/${slug}/tasks/${lt.task.id}`} className="font-medium text-zinc-900 hover:underline">
                            {lt.task.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2"><StatusBadge name={lt.task.status.name} color={lt.task.status.color} /></td>
                        <td className="px-3 py-2 text-zinc-600">{formatDate(lt.task.dueDate)}</td>
                        <td className="px-3 py-2">
                          {lt.task.approval ? (
                            <span className={`text-xs font-semibold ${
                              lt.task.approval.status === "APPROVED" ? "text-emerald-600" :
                              lt.task.approval.status === "REJECTED" ? "text-red-600" :
                              "text-amber-600"
                            }`}>
                              {formatLabel(lt.task.approval.status)}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ExpandableSection>
        ))}
      </div>
    </main>
  );
}
