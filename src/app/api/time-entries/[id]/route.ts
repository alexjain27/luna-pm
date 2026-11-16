import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { liveMinutes, parseDateKey, resolveRateCents, stopRunningTimers } from "@/lib/billing";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    if (entry.invoiceId) {
      return NextResponse.json({ error: "Entry is on an invoice and is locked" }, { status: 409 });
    }

    // Timer controls
    if (body.action === "start") {
      await stopRunningTimers(entry.userId);
      const updated = await prisma.timeEntry.update({
        where: { id },
        data: { timerStartedAt: new Date() },
      });
      return NextResponse.json(updated);
    }
    if (body.action === "stop") {
      const updated = await prisma.timeEntry.update({
        where: { id },
        data: { minutes: liveMinutes(entry), timerStartedAt: null },
      });
      return NextResponse.json(updated);
    }

    const data: Prisma.TimeEntryUncheckedUpdateInput = {};

    if (body.minutes !== undefined) {
      if (!Number.isInteger(body.minutes) || body.minutes < 0) {
        return NextResponse.json({ error: "minutes must be a non-negative integer" }, { status: 400 });
      }
      data.minutes = body.minutes;
      data.timerStartedAt = null; // editing duration stops a running timer
    }
    if (body.date !== undefined) {
      try {
        data.date = parseDateKey(body.date);
      } catch {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
    }
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    const projectId: string = body.projectId ?? entry.projectId;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (projectId !== entry.projectId) {
      data.projectId = projectId;
      data.rateCents = await resolveRateCents(projectId, entry.userId);
      if (body.taskId === undefined) data.taskId = null;
    }
    if (body.taskId !== undefined) {
      if (body.taskId) {
        const task = await prisma.task.findUnique({ where: { id: body.taskId } });
        if (!task || task.projectId !== projectId) {
          return NextResponse.json({ error: "Task does not belong to project" }, { status: 400 });
        }
      }
      data.taskId = body.taskId || null;
    }
    if (body.billable !== undefined) data.billable = Boolean(body.billable);
    if (!project.billable) data.billable = false;

    const updated = await prisma.timeEntry.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    if (entry.invoiceId) {
      return NextResponse.json({ error: "Entry is on an invoice and is locked" }, { status: 409 });
    }
    await prisma.timeEntry.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
