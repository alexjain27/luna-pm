import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { description, statusId, priority } = body;

    const data: Record<string, unknown> = {};
    if ("description" in body) data.description = description?.trim() || null;
    if (statusId) data.statusId = statusId;
    if (priority) data.priority = priority;

    const task = await prisma.task.update({ where: { id }, data });

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
