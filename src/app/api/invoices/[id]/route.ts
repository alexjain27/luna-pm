import { NextResponse } from "next/server";
import type { InvoiceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/billing";

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "DRAFT", "VOID"],
  PAID: ["SENT", "VOID"],
  VOID: [],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (body.status !== undefined && body.status !== invoice.status) {
      const next = body.status as InvoiceStatus;
      if (!TRANSITIONS[invoice.status]?.includes(next)) {
        return NextResponse.json(
          { error: `Cannot change status from ${invoice.status} to ${next}` },
          { status: 400 }
        );
      }
      const updated = await prisma.$transaction(async (tx) => {
        if (next === "VOID") {
          await tx.timeEntry.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
          await tx.expense.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
        }
        return tx.invoice.update({
          where: { id },
          data: {
            status: next,
            sentAt: next === "SENT" ? (invoice.sentAt ?? new Date()) : next === "DRAFT" ? null : invoice.sentAt,
            paidAt: next === "PAID" ? new Date() : next === "SENT" || next === "DRAFT" ? null : invoice.paidAt,
          },
        });
      });
      return NextResponse.json(updated);
    }

    if (invoice.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 409 });
    }

    const data: Prisma.InvoiceUpdateInput = {};
    try {
      if (body.issueDate !== undefined) data.issueDate = parseDateKey(body.issueDate);
      if (body.dueDate !== undefined) data.dueDate = parseDateKey(body.dueDate);
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (body.subject !== undefined) data.subject = body.subject?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.taxRate !== undefined) {
      const rate = Number(body.taxRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: "taxRate must be between 0 and 100" }, { status: 400 });
      }
      data.taxRate = rate;
    }

    const updated = await prisma.invoice.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft invoices can be deleted; void it instead" }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.timeEntry.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } }),
      prisma.expense.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } }),
      prisma.invoice.delete({ where: { id } }),
    ]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
