import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function nonNegIntOrNull(v: unknown) {
  return v === null || (Number.isInteger(v) && (v as number) >= 0);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!(await prisma.project.findUnique({ where: { id } }))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (body.billable !== undefined) data.billable = Boolean(body.billable);
    if (body.hourlyRateCents !== undefined) {
      if (!nonNegIntOrNull(body.hourlyRateCents)) {
        return NextResponse.json({ error: "hourlyRateCents must be a non-negative integer or null" }, { status: 400 });
      }
      data.hourlyRateCents = body.hourlyRateCents;
    }
    if (body.budgetMinutes !== undefined) {
      if (!nonNegIntOrNull(body.budgetMinutes)) {
        return NextResponse.json({ error: "budgetMinutes must be a non-negative integer or null" }, { status: 400 });
      }
      data.budgetMinutes = body.budgetMinutes;
    }

    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
