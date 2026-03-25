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
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your workspace activity.
        </p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
