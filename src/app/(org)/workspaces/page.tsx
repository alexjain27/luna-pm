import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatLabel } from "@/lib/utils";

export default async function WorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true, tasks: true } } },
  });

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Workspaces</h2>
          <p className="text-sm text-zinc-500">
            Manage client and company workspaces.
          </p>
        </div>
      </div>
      {workspaces.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          No workspaces yet. Create your first workspace to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Projects</th>
                <th className="px-4 py-3 font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((workspace) => (
                <tr key={workspace.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="text-zinc-900 hover:underline"
                    >
                      {workspace.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                      {formatLabel(workspace.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {workspace.slug}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {workspace._count.projects}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {workspace._count.tasks}
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
