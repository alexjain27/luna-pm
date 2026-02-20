import { prisma } from "@/lib/prisma";
import { formatLabel } from "@/lib/utils";

export default async function StatusesPage() {
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Statuses</h2>
          <p className="text-sm text-zinc-500">
            Configure task statuses for every project.
          </p>
        </div>
      </div>
      {statuses.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          No statuses yet. Add your first task status to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Color</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => (
                <tr key={status.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs text-zinc-500">
                        {status.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {status.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{status.order}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatLabel(status.state)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {status._count.tasks}
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
