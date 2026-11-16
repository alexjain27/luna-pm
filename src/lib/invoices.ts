import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/billing";

export type UnbilledFilter = {
  workspaceId: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  projectIds?: string[] | null;
};

function dateRange(start?: string | null, end?: string | null): Prisma.DateTimeFilter | undefined {
  if (!start && !end) return undefined;
  return {
    ...(start ? { gte: parseDateKey(start) } : {}),
    ...(end ? { lte: parseDateKey(end) } : {}),
  };
}

/** Billable, unbilled, stopped time entries and expenses for a client workspace. */
export async function findUnbilled(filter: UnbilledFilter) {
  const projectWhere: Prisma.ProjectWhereInput = {
    workspaceId: filter.workspaceId,
    ...(filter.projectIds?.length ? { id: { in: filter.projectIds } } : {}),
  };
  const date = dateRange(filter.periodStart, filter.periodEnd);

  const [timeEntries, expenses] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        project: projectWhere,
        invoiceId: null,
        billable: true,
        timerStartedAt: null,
        minutes: { gt: 0 },
        ...(date ? { date } : {}),
      },
      include: { project: true, task: true },
      orderBy: [{ date: "asc" }],
    }),
    prisma.expense.findMany({
      where: {
        project: projectWhere,
        invoiceId: null,
        billable: true,
        ...(date ? { date } : {}),
      },
      include: { project: true, category: true },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  return { timeEntries, expenses };
}

type UnbilledTime = Awaited<ReturnType<typeof findUnbilled>>["timeEntries"];
type UnbilledExpenses = Awaited<ReturnType<typeof findUnbilled>>["expenses"];

export type DraftLine = {
  kind: "SERVICE" | "EXPENSE";
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
};

/** One SERVICE line per (project, task, rate); one EXPENSE line per expense. */
export function buildLines(timeEntries: UnbilledTime, expenses: UnbilledExpenses): DraftLine[] {
  const groups = new Map<string, { description: string; minutes: number; rateCents: number }>();
  for (const e of timeEntries) {
    const key = `${e.projectId}|${e.taskId ?? ""}|${e.rateCents}`;
    const g = groups.get(key);
    if (g) g.minutes += e.minutes;
    else
      groups.set(key, {
        description: `${e.project.name} — ${e.task?.name ?? "General"}`,
        minutes: e.minutes,
        rateCents: e.rateCents,
      });
  }

  const lines: DraftLine[] = [...groups.values()]
    .sort((a, b) => a.description.localeCompare(b.description))
    .map((g) => {
      const quantity = Math.round((g.minutes / 60) * 100) / 100;
      return {
        kind: "SERVICE",
        description: g.description,
        quantity,
        unitPriceCents: g.rateCents,
        amountCents: Math.round(quantity * g.rateCents),
      };
    });

  for (const x of expenses) {
    lines.push({
      kind: "EXPENSE",
      description: `${x.project.name} — ${x.category.name}${x.notes ? `: ${x.notes}` : ""}`,
      quantity: 1,
      unitPriceCents: x.amountCents,
      amountCents: x.amountCents,
    });
  }
  return lines;
}
