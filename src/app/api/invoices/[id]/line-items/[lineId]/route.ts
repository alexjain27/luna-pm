import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

async function loadDraftLine(id: string, lineId: string) {
  const line = await prisma.invoiceLineItem.findUnique({
    where: { id: lineId },
    include: { invoice: true },
  });
  if (!line || line.invoiceId !== id) {
    return { error: NextResponse.json({ error: "Line item not found" }, { status: 404 }) };
  }
  if (line.invoice.status !== "DRAFT") {
    return { error: NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 409 }) };
  }
  return { line };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const { id, lineId } = await params;
    const { line, error } = await loadDraftLine(id, lineId);
    if (error) return error;

    const body = await req.json();
    const description = body.description !== undefined ? String(body.description).trim() : line.description;
    const quantity = body.quantity !== undefined ? Number(body.quantity) : line.quantity;
    const unitPriceCents = body.unitPriceCents !== undefined ? body.unitPriceCents : line.unitPriceCents;

    if (!description || !Number.isFinite(quantity) || !Number.isInteger(unitPriceCents)) {
      return NextResponse.json({ error: "Invalid line item" }, { status: 400 });
    }

    const updated = await prisma.invoiceLineItem.update({
      where: { id: lineId },
      data: { description, quantity, unitPriceCents, amountCents: Math.round(quantity * unitPriceCents) },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const { id, lineId } = await params;
    const { error } = await loadDraftLine(id, lineId);
    if (error) return error;
    await prisma.invoiceLineItem.delete({ where: { id: lineId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
