import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDate, formatLabel } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { workspace: true },
  });

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Projects</h2>
          <p className="text-sm text-zinc-500">
            Track timelines and overall status.
          </p>
        </div>
      </div>
      {projects.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          No projects yet. Create a project after adding a workspace.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Start</th>
                <th className="px-4 py-3 font-semibold">End</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-zinc-900 hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <Link
                      href={`/workspaces/${project.workspace.id}`}
                      className="text-zinc-600 hover:underline"
                    >
                      {project.workspace.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {formatLabel(project.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(project.startDate)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(project.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
