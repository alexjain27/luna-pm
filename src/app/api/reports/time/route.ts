import { NextResponse } from "next/server";

import { dateKey, formatHours } from "@/lib/billing";
import { parseReportFilters, queryExpenseReport, queryTimeReport } from "@/lib/reports";

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV export. A read-only API route because a file download can't come from a
// server component (see docs/time-billing.md).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filters = parseReportFilters(Object.fromEntries(url.searchParams));
    const kind = url.searchParams.get("kind") === "expenses" ? "expenses" : "time";

    let rows: (string | number | null)[][];
    if (kind === "expenses") {
      const expenses = await queryExpenseReport(filters);
      rows = [
        ["Date", "Client", "Project", "Category", "Person", "Notes", "Amount", "Billable", "Invoice"],
        ...expenses.map((x) => [
          dateKey(x.date),
          x.project.workspace.name,
          x.project.name,
          x.category.name,
          x.user.name ?? x.user.email,
          x.notes,
          (x.amountCents / 100).toFixed(2),
          x.billable ? "Yes" : "No",
          x.invoice?.number ?? "",
        ]),
      ];
    } else {
      const entries = await queryTimeReport(filters);
      rows = [
        ["Date", "Client", "Project", "Task", "Person", "Notes", "Hours", "Billable", "Rate", "Amount", "Invoice"],
        ...entries.map((e) => [
          dateKey(e.date),
          e.project.workspace.name,
          e.project.name,
          e.task?.name ?? "",
          e.user.name ?? e.user.email,
          e.notes,
          formatHours(e.minutes),
          e.billable ? "Yes" : "No",
          (e.rateCents / 100).toFixed(2),
          (e.amountCents / 100).toFixed(2),
          e.invoice?.number ?? "",
        ]),
      ];
    }

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${kind}-${filters.from}-to-${filters.to}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
