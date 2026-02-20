import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function ListsPage() {
  const lists = await prisma.list.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: { workspace: true },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Lists</h2>
          <p className="text-sm text-zinc-500">
            Organize tasks inside each project.
          </p>
        </div>
      </div>
      {lists.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          No lists yet. Add lists inside a project to organize tasks.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">List</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {list.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <Link
                      href={`/projects/${list.project.id}`}
                      className="text-zinc-600 hover:underline"
                    >
                      {list.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {list.project.workspace.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {list._count.tasks}
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
