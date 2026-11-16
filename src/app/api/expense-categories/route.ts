import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const existing = await prisma.expenseCategory.findUnique({ where: { name: name.trim() } });
    if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    const category = await prisma.expenseCategory.create({ data: { name: name.trim() } });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
