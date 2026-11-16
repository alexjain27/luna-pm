import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getBillingSettings } from "@/lib/billing";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await getBillingSettings(); // ensure row exists

    const data: Prisma.BillingSettingsUpdateInput = {};
    if (body.companyName !== undefined) {
      if (!String(body.companyName).trim()) {
        return NextResponse.json({ error: "companyName is required" }, { status: 400 });
      }
      data.companyName = String(body.companyName).trim();
    }
    if (body.companyAddress !== undefined) data.companyAddress = body.companyAddress?.trim() || null;
    if (body.invoiceNotes !== undefined) data.invoiceNotes = body.invoiceNotes?.trim() || null;
    if (body.currency !== undefined) {
      const c = String(body.currency).trim().toUpperCase();
      try {
        new Intl.NumberFormat("en-US", { style: "currency", currency: c });
      } catch {
        return NextResponse.json({ error: "Invalid currency code" }, { status: 400 });
      }
      data.currency = c;
    }
    if (body.invoicePrefix !== undefined) data.invoicePrefix = String(body.invoicePrefix);
    if (body.nextInvoiceNumber !== undefined) {
      if (!Number.isInteger(body.nextInvoiceNumber) || body.nextInvoiceNumber < 1) {
        return NextResponse.json({ error: "nextInvoiceNumber must be a positive integer" }, { status: 400 });
      }
      data.nextInvoiceNumber = body.nextInvoiceNumber;
    }
    if (body.defaultTaxRate !== undefined) {
      const r = Number(body.defaultTaxRate);
      if (!Number.isFinite(r) || r < 0 || r > 100) {
        return NextResponse.json({ error: "defaultTaxRate must be between 0 and 100" }, { status: 400 });
      }
      data.defaultTaxRate = r;
    }
    if (body.paymentTermsDays !== undefined) {
      if (!Number.isInteger(body.paymentTermsDays) || body.paymentTermsDays < 0) {
        return NextResponse.json({ error: "paymentTermsDays must be a non-negative integer" }, { status: 400 });
      }
      data.paymentTermsDays = body.paymentTermsDays;
    }

    const settings = await prisma.billingSettings.update({ where: { id: "default" }, data });
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
