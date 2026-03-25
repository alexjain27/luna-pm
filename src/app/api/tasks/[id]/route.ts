import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function toDateStr(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      statusId,
      priority,
      ownerId,
      requestorId,
      startDate,
      dueDate,
      actorId,
    } = body;

    // Fetch current task state for activity log diffing
    const current = actorId
      ? await prisma.task.findUnique({
          where: { id },
          include: {
            status: { select: { name: true } },
            owner: { select: { name: true, email: true } },
            requestor: { select: { name: true, email: true } },
          },
        })
      : null;

    // Resolve new user/status display names for logging
    let newOwnerName: string | null = null;
    let newRequestorName: string | null = null;
    let newStatusName: string | null = null;

    if (actorId && "ownerId" in body && ownerId) {
      const u = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { name: true, email: true },
      });
      newOwnerName = u?.name ?? u?.email ?? ownerId;
    }
    if (actorId && "requestorId" in body && requestorId) {
      const u = await prisma.user.findUnique({
        where: { id: requestorId },
        select: { name: true, email: true },
      });
      newRequestorName = u?.name ?? u?.email ?? requestorId;
    }
    if (actorId && statusId) {
      const s = await prisma.taskStatus.findUnique({
        where: { id: statusId },
        select: { name: true },
      });
      newStatusName = s?.name ?? statusId;
    }

    // Build update data
    const data: Record<string, unknown> = {};
    if ("name" in body) data.name = (name as string)?.trim() || undefined;
    if ("description" in body) data.description = description?.trim() || null;
    if (statusId) data.statusId = statusId;
    if (priority) data.priority = priority;
    if ("ownerId" in body) data.ownerId = ownerId || null;
    if ("requestorId" in body) data.requestorId = requestorId || null;
    if ("startDate" in body) data.startDate = startDate ? new Date(startDate) : null;
    if ("dueDate" in body) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({ where: { id }, data });

    // Write activity log entries
    if (actorId && current) {
      type LogEntry = {
        taskId: string;
        actorId: string;
        field: string;
        oldValue: string | null;
        newValue: string | null;
      };
      const entries: LogEntry[] = [];

      const diff = (
        field: string,
        oldVal: string | null | undefined,
        newVal: string | null | undefined,
      ) => {
        const o = oldVal ?? null;
        const n = newVal ?? null;
        if (o !== n) entries.push({ taskId: id, actorId, field, oldValue: o, newValue: n });
      };

      if ("name" in body) diff("name", current.name, (name as string)?.trim());
      if (statusId) diff("statusId", current.status.name, newStatusName);
      if (priority) diff("priority", current.priority, priority);
      if ("ownerId" in body) {
        const oldOwner = current.owner?.name ?? current.owner?.email ?? null;
        diff("ownerId", oldOwner, ownerId ? newOwnerName : null);
      }
      if ("requestorId" in body) {
        const oldReq = current.requestor?.name ?? current.requestor?.email ?? null;
        diff("requestorId", oldReq, requestorId ? newRequestorName : null);
      }
      if ("startDate" in body)
        diff("startDate", toDateStr(current.startDate) || null, startDate || null);
      if ("dueDate" in body)
        diff("dueDate", toDateStr(current.dueDate) || null, dueDate || null);
      if ("description" in body && current.description !== (description?.trim() || null))
        entries.push({
          taskId: id,
          actorId,
          field: "description",
          oldValue: current.description ? "(had description)" : null,
          newValue: description?.trim() ? "(updated)" : null,
        });

      if (entries.length > 0) {
        await prisma.taskActivityLog.createMany({ data: entries });
      }
    }

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
