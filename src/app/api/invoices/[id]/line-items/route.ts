import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { description, quantity, unitPriceCents, kind } = await req.json();

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { _count: { select: { lineItems: true } } },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 409 });
    }
    const qty = Number(quantity);
    if (!description?.trim() || !Number.isFinite(qty) || !Number.isInteger(unitPriceCents)) {
      return NextResponse.json(
        { error: "description, quantity and unitPriceCents are required" },
        { status: 400 }
      );
    }

    const line = await prisma.invoiceLineItem.create({
      data: {
        invoiceId: id,
        kind: kind === "SERVICE" || kind === "EXPENSE" ? kind : "OTHER",
        description: description.trim(),
        quantity: qty,
        unitPriceCents,
        amountCents: Math.round(qty * unitPriceCents),
        order: invoice._count.lineItems,
      },
    });
    return NextResponse.json(line, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
