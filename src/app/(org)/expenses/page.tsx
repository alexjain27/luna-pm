import { prisma } from "@/lib/prisma";
import { dateKey, formatMoney, getBillingSettings } from "@/lib/billing";
import { datePresets, parseReportFilters, queryExpenseReport } from "@/lib/reports";
import { ReportFilters } from "@/components/report-filters";
import { ExpenseList, type ExpenseRow } from "./expense-list";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseReportFilters(await searchParams);

  const [expenses, projects, categories, users, settings] = await Promise.all([
    queryExpenseReport(filters),
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, name: true, workspace: { select: { name: true } } },
      orderBy: [{ workspace: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    getBillingSettings(),
  ]);

  const rows: ExpenseRow[] = expenses.map((x) => ({
    id: x.id,
    projectId: x.projectId,
    categoryId: x.categoryId,
    date: dateKey(x.date),
    amountCents: x.amountCents,
    notes: x.notes,
    billable: x.billable,
    receiptFilename: x.receiptFilename,
    projectName: x.project.name,
    workspaceName: x.project.workspace.name,
    categoryName: x.category.name,
    userName: x.user.name ?? x.user.email ?? "",
    invoiceNumber: x.invoice?.number ?? null,
    hasReceipt: Boolean(x.receiptS3Key),
  }));

  const billable = expenses.filter((x) => x.billable).reduce((s, x) => s + x.amountCents, 0);
  const unbilled = expenses.filter((x) => x.billable && !x.invoiceId).reduce((s, x) => s + x.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Billable {formatMoney(billable, settings.currency)} · Uninvoiced {formatMoney(unbilled, settings.currency)}
          </p>
        </div>
      </div>
      <ReportFilters
        action="/expenses"
        presets={datePresets()}
        values={filters}
        projects={projects.map((p) => ({ id: p.id, name: `${p.workspace.name} — ${p.name}` }))}
        users={users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "" }))}
      />
      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
          Add expense categories in Settings before logging expenses.
        </p>
      ) : (
        <ExpenseList
          expenses={rows}
          projects={projects.map((p) => ({ id: p.id, name: p.name, workspaceName: p.workspace.name }))}
          categories={categories}
          currency={settings.currency}
        />
      )}
    </div>
  );
}
