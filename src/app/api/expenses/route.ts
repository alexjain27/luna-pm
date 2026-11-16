import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseDateKey } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, categoryId, date, amountCents, notes, billable, receiptS3Key, receiptFilename } = body;

    if (!projectId || !categoryId || !date || amountCents == null) {
      return NextResponse.json(
        { error: "projectId, categoryId, date and amountCents are required" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      return NextResponse.json({ error: "amountCents must be a non-negative integer" }, { status: 400 });
    }
    let day: Date;
    try {
      day = parseDateKey(date);
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const [project, category] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.expenseCategory.findUnique({ where: { id: categoryId } }),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const userId: string = body.userId || (await getCurrentUser()).id;

    const expense = await prisma.expense.create({
      data: {
        userId,
        projectId,
        categoryId,
        date: day,
        amountCents,
        notes: notes?.trim() || null,
        billable: billable ?? true,
        receiptS3Key: receiptS3Key || null,
        receiptFilename: receiptFilename || null,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
