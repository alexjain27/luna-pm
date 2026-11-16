import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!(await prisma.expenseCategory.findUnique({ where: { id } }))) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    const clash = await prisma.expenseCategory.findUnique({ where: { name: name.trim() } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    const category = await prisma.expenseCategory.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: { _count: { select: { expenses: true } } },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category._count.expenses > 0) {
      return NextResponse.json({ error: "Category is in use by expenses" }, { status: 409 });
    }
    await prisma.expenseCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
