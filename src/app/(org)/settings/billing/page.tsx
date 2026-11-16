import { prisma } from "@/lib/prisma";
import { getBillingSettings } from "@/lib/billing";
import { SettingsForm, UserRates, Categories } from "./settings-forms";

export default async function BillingSettingsPage() {
  const [settings, users, categories] = await Promise.all([
    getBillingSettings(),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true, email: true, defaultRateCents: true },
      orderBy: { name: "asc" },
    }),
    prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Company details, invoicing defaults, rates and expense categories.</p>
      </div>
      <SettingsForm
        settings={{
          companyName: settings.companyName,
          companyAddress: settings.companyAddress ?? "",
          currency: settings.currency,
          invoicePrefix: settings.invoicePrefix,
          nextInvoiceNumber: settings.nextInvoiceNumber,
          defaultTaxRate: settings.defaultTaxRate,
          paymentTermsDays: settings.paymentTermsDays,
          invoiceNotes: settings.invoiceNotes ?? "",
        }}
      />
      <UserRates
        users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "", defaultRateCents: u.defaultRateCents }))}
        currency={settings.currency}
      />
      <Categories categories={categories.map((c) => ({ id: c.id, name: c.name, count: c._count.expenses }))} />
    </div>
  );
}
