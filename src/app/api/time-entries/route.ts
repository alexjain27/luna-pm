import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseDateKey, resolveRateCents, stopRunningTimers } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, taskId, date, minutes, notes, billable, startTimer } = body;

    if (!projectId || !date) {
      return NextResponse.json({ error: "projectId and date are required" }, { status: 400 });
    }
    if (minutes != null && (!Number.isInteger(minutes) || minutes < 0)) {
      return NextResponse.json({ error: "minutes must be a non-negative integer" }, { status: 400 });
    }

    let day: Date;
    try {
      day = parseDateKey(date);
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const userId: string = body.userId || (await getCurrentUser()).id;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.projectId !== projectId) {
        return NextResponse.json({ error: "Task does not belong to project" }, { status: 400 });
      }
    }

    if (startTimer) await stopRunningTimers(userId);

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        projectId,
        taskId: taskId || null,
        date: day,
        minutes: minutes ?? 0,
        notes: notes?.trim() || null,
        billable: project.billable ? (billable ?? true) : false,
        rateCents: await resolveRateCents(projectId, userId),
        timerStartedAt: startTimer ? new Date() : null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
