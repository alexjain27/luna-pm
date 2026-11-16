import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { defaultRateCents } = await req.json();
    if (!(await prisma.user.findUnique({ where: { id } }))) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (defaultRateCents !== null && (!Number.isInteger(defaultRateCents) || defaultRateCents < 0)) {
      return NextResponse.json({ error: "defaultRateCents must be a non-negative integer or null" }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { defaultRateCents },
      select: { id: true, name: true, email: true, defaultRateCents: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
