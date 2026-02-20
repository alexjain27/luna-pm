import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [workspacesCount, activeProjects, openTasks, pendingApprovals] =
    await Promise.all([
      prisma.workspace.count(),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({ where: { parentTaskId: null } }),
      prisma.taskApproval.count({ where: { status: "PENDING" } }),
    ]);

  const stats = [
    { label: "Workspaces", value: workspacesCount.toString() },
    { label: "Active projects", value: activeProjects.toString() },
    { label: "Open tasks", value: openTasks.toString() },
    { label: "Pending approvals", value: pendingApprovals.toString() },
  ];

  return (
    <main className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {stat.value}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
