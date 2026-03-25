import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, workspaceId, projectId, listId, statusId, requestorId, dueDate, description } =
      body;

    if (!name?.trim() || !workspaceId || !statusId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        workspaceId,
        projectId: projectId || null,
        statusId,
        requestorId: requestorId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description?.trim() || null,
      },
    });

    if (listId) {
      await prisma.listTask.create({ data: { listId, taskId: task.id } });
    }

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
