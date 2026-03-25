import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, statusId, ownerId } = body;

    if (!name?.trim() || !statusId) {
      return NextResponse.json({ error: "name and statusId are required" }, { status: 400 });
    }

    const parentTask = await prisma.task.findUnique({
      where: { id },
      select: { workspaceId: true, projectId: true, ownerId: true, parentTaskId: true },
    });

    if (!parentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (parentTask.parentTaskId) {
      return NextResponse.json({ error: "Subtasks cannot have subtasks" }, { status: 400 });
    }

    const subtask = await prisma.task.create({
      data: {
        name: name.trim(),
        workspaceId: parentTask.workspaceId,
        projectId: parentTask.projectId,
        statusId,
        parentTaskId: id,
        ownerId: ownerId ?? parentTask.ownerId ?? null,
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
