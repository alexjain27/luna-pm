import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { addDays, getBillingSettings, parseDateKey, todayKey } from "@/lib/billing";
import { buildLines, findUnbilled } from "@/lib/invoices";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, periodStart, periodEnd, projectIds, subject } = body;
    const includeTime = body.includeTime ?? true;
    const includeExpenses = body.includeExpenses ?? true;

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    try {
      if (periodStart) parseDateKey(periodStart);
      if (periodEnd) parseDateKey(periodEnd);
    } catch {
      return NextResponse.json({ error: "Invalid period date" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (workspace.type !== "CLIENT") {
      return NextResponse.json({ error: "Only CLIENT workspaces can be invoiced" }, { status: 400 });
    }

    const settings = await getBillingSettings();
    const unbilled = await findUnbilled({ workspaceId, periodStart, periodEnd, projectIds });
    const timeEntries = includeTime ? unbilled.timeEntries : [];
    const expenses = includeExpenses ? unbilled.expenses : [];
    const lines = buildLines(timeEntries, expenses);

    const issueDate = body.issueDate || todayKey();

    const invoice = await prisma.$transaction(async (tx) => {
      const s = await tx.billingSettings.update({
        where: { id: settings.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const created = await tx.invoice.create({
        data: {
          number: `${s.invoicePrefix}${s.nextInvoiceNumber - 1}`,
          workspaceId,
          subject: subject?.trim() || null,
          issueDate: parseDateKey(issueDate),
          dueDate: parseDateKey(addDays(issueDate, s.paymentTermsDays)),
          periodStart: periodStart ? parseDateKey(periodStart) : null,
          periodEnd: periodEnd ? parseDateKey(periodEnd) : null,
          taxRate: s.defaultTaxRate,
          notes: s.invoiceNotes,
          lineItems: { create: lines.map((l, i) => ({ ...l, order: i })) },
        },
      });
      if (timeEntries.length) {
        await tx.timeEntry.updateMany({
          where: { id: { in: timeEntries.map((e) => e.id) }, invoiceId: null },
          data: { invoiceId: created.id },
        });
      }
      if (expenses.length) {
        await tx.expense.updateMany({
          where: { id: { in: expenses.map((e) => e.id) }, invoiceId: null },
          data: { invoiceId: created.id },
        });
      }
      return created;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
