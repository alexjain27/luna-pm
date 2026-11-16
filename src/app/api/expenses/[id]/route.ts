import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/billing";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    if (expense.invoiceId) {
      return NextResponse.json({ error: "Expense is on an invoice and is locked" }, { status: 409 });
    }

    const data: Prisma.ExpenseUncheckedUpdateInput = {};
    if (body.projectId !== undefined) {
      if (!(await prisma.project.findUnique({ where: { id: body.projectId } }))) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      data.projectId = body.projectId;
    }
    if (body.categoryId !== undefined) {
      if (!(await prisma.expenseCategory.findUnique({ where: { id: body.categoryId } }))) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      data.categoryId = body.categoryId;
    }
    if (body.date !== undefined) {
      try {
        data.date = parseDateKey(body.date);
      } catch {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
    }
    if (body.amountCents !== undefined) {
      if (!Number.isInteger(body.amountCents) || body.amountCents < 0) {
        return NextResponse.json({ error: "amountCents must be a non-negative integer" }, { status: 400 });
      }
      data.amountCents = body.amountCents;
    }
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.billable !== undefined) data.billable = Boolean(body.billable);
    if (body.receiptS3Key !== undefined) {
      data.receiptS3Key = body.receiptS3Key || null;
      data.receiptFilename = body.receiptFilename || null;
    }

    const updated = await prisma.expense.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    if (expense.invoiceId) {
      return NextResponse.json({ error: "Expense is on an invoice and is locked" }, { status: 409 });
    }
    await prisma.expense.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
