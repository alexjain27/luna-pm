import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Upsert or remove (rateCents: null) a person's rate override on a project.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId, rateCents } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const [project, user] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (rateCents === null) {
      await prisma.projectMemberRate.deleteMany({ where: { projectId: id, userId } });
      return new NextResponse(null, { status: 204 });
    }
    if (!Number.isInteger(rateCents) || rateCents < 0) {
      return NextResponse.json({ error: "rateCents must be a non-negative integer or null" }, { status: 400 });
    }
    const rate = await prisma.projectMemberRate.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      update: { hourlyRateCents: rateCents },
      create: { projectId: id, userId, hourlyRateCents: rateCents },
    });
    return NextResponse.json(rate);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
