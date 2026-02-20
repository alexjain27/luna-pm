import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      projects: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { tasks: true } },
          customFieldValues: { include: { customField: true } },
        },
      },
      tasks: {
        where: {
          approval: { status: "PENDING" },
        },
        include: {
          status: true,
          approval: true,
          project: true,
        },
      },
    },
  });

  if (!workspace || workspace.type !== "CLIENT") notFound();

  const pendingApprovals = workspace.tasks.filter(
    (t) => t.approval?.status === "PENDING"
  );

  return (
    <main className="flex flex-col gap-6">
      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Projects</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{workspace.projects.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Active Projects</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {workspace.projects.filter((p) => p.status === "ACTIVE").length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Pending Approvals</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{pendingApprovals.length}</p>
        </div>
      </section>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Pending Approvals</h2>
          <div className="flex flex-col gap-3">
            {pendingApprovals.map((task) => (
              <Link
                key={task.id}
                href={`/client/${slug}/tasks/${task.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{task.name}</p>
                  <p className="text-xs text-zinc-500">{task.project?.name ?? "Workspace task"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  Needs approval
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Projects</h2>
        {workspace.projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
            No projects yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workspace.projects.map((project) => (
              <Link
                key={project.id}
                href={`/client/${slug}/projects/${project.id}`}
                className="rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-zinc-900">{project.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    project.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                    project.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                    project.status === "INTAKE" ? "bg-blue-50 text-blue-700" :
                    "bg-zinc-100 text-zinc-600"
                  }`}>
                    {formatLabel(project.status)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {project._count.tasks} tasks
                  {project.startDate && ` · Started ${formatDate(project.startDate)}`}
                </p>
                {project.customFieldValues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                    {project.customFieldValues.map((cfv) => (
                      <span key={cfv.id}>{cfv.customField.name}: {cfv.value}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
