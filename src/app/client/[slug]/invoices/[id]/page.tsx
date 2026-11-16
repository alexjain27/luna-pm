import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getBillingSettings, invoiceTotals } from "@/lib/billing";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";

export default async function ClientInvoicePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug }, select: { id: true, type: true } });
  if (!workspace || workspace.type !== "CLIENT") notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspace.id, status: { in: ["SENT", "PAID"] } },
    include: { workspace: { select: { name: true, address: true } }, lineItems: { orderBy: { order: "asc" } } },
  });
  if (!invoice) notFound();
  const settings = await getBillingSettings();

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/client/${slug}/invoices`} className="text-xs text-zinc-500 hover:underline">← Invoices</Link>
        <PrintButton />
      </div>
      <InvoiceDocument
        invoice={invoice}
        company={{ name: settings.companyName, address: settings.companyAddress }}
        currency={settings.currency}
        totals={invoiceTotals(invoice)}
      />
    </main>
  );
}
