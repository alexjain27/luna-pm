import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

async function createTask(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const listId = String(formData.get("listId") ?? "").trim();
  const statusId = String(formData.get("statusId") ?? "").trim();
  const priority = String(formData.get("priority") ?? "NORMAL").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !workspaceId || !statusId) {
    throw new Error("Missing required fields.");
  }

  const task = await prisma.task.create({
    data: {
      name,
      workspaceId,
      projectId: projectId || null,
      statusId,
      priority: priority as "URGENT" | "HIGH" | "NORMAL" | "LOW",
      ownerId: ownerId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      description: description || null,
    },
  });

  if (listId) {
    await prisma.listTask.create({
      data: {
        listId,
        taskId: task.id,
      },
    });
  }

  redirect("/tasks");
}

export default async function NewTaskPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const preWorkspaceId =
    typeof searchParams.workspaceId === "string"
      ? searchParams.workspaceId
      : undefined;
  const preProjectId =
    typeof searchParams.projectId === "string"
      ? searchParams.projectId
      : undefined;
  const preListId =
    typeof searchParams.listId === "string"
      ? searchParams.listId
      : undefined;

  const [workspaces, statuses, users, projects, lists] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { name: "asc" } }),
    prisma.taskStatus.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    preWorkspaceId
      ? prisma.project.findMany({
          where: { workspaceId: preWorkspaceId },
          orderBy: { name: "asc" },
        })
      : prisma.project.findMany({ orderBy: { name: "asc" } }),
    preProjectId
      ? prisma.list.findMany({
          where: { projectId: preProjectId },
          orderBy: { name: "asc" },
        })
      : prisma.list.findMany({
          orderBy: { name: "asc" },
          include: { project: true },
        }),
  ]);

  if (workspaces.length === 0 || statuses.length === 0) {
    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">New task</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Add a workspace and at least one status before creating tasks.
        </p>
      </main>
    );
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">New task</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Create a task and assign it to a workspace.
      </p>
      <form action={createTask} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Task name
          <input
            name="name"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Workspace
          {preWorkspaceId ? (
            <>
              <input type="hidden" name="workspaceId" value={preWorkspaceId} />
              <select
                disabled
                className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500"
              >
                {workspaces
                  .filter((w) => w.id === preWorkspaceId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <select
              name="workspaceId"
              required
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">Select a workspace</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Project (optional)
          {preProjectId ? (
            <>
              <input type="hidden" name="projectId" value={preProjectId} />
              <select
                disabled
                className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500"
              >
                {projects
                  .filter((p) => p.id === preProjectId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <select
              name="projectId"
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          List (optional)
          {preListId ? (
            <>
              <input type="hidden" name="listId" value={preListId} />
              <select
                disabled
                className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500"
              >
                {(lists as { id: string; name: string }[])
                  .filter((l) => l.id === preListId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <select
              name="listId"
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">None</option>
              {(lists as { id: string; name: string; project?: { name: string } }[]).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.project ? ` — ${l.project.name}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Status
          <select
            name="statusId"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Priority
          <select
            name="priority"
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL" selected>
              Normal
            </option>
            <option value="LOW">Low</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Owner (optional)
          <select
            name="ownerId"
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email ?? user.id}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Due date
          <input
            name="dueDate"
            type="date"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Description (optional)
          <textarea
            name="description"
            rows={4}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Create task
        </button>
      </form>
    </main>
  );
}
