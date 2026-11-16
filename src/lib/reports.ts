import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addDays, entryAmountCents, liveMinutes, parseDateKey, startOfWeekKey, todayKey } from "@/lib/billing";

export type ReportFilters = {
  from: string;
  to: string;
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  billable?: "billable" | "nonbillable";
};

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function validKey(v: string | undefined) {
  if (!v) return undefined;
  try {
    parseDateKey(v);
    return v;
  } catch {
    return undefined;
  }
}

export function datePresets(today = todayKey()) {
  const [y, m] = today.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastMonthStart = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
  const week = startOfWeekKey(today);
  return [
    { id: "week", label: "This week", from: week, to: addDays(week, 6) },
    { id: "lastweek", label: "Last week", from: addDays(week, -7), to: addDays(week, -1) },
    { id: "month", label: "This month", from: monthStart, to: addDays(nextMonth(monthStart), -1) },
    { id: "lastmonth", label: "Last month", from: lastMonthStart, to: addDays(monthStart, -1) },
    { id: "year", label: "This year", from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

function nextMonth(firstOfMonth: string) {
  const [y, m] = firstOfMonth.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export function parseReportFilters(params: Params): ReportFilters {
  const month = datePresets().find((p) => p.id === "month")!;
  const billable = one(params.billable);
  return {
    from: validKey(one(params.from)) ?? month.from,
    to: validKey(one(params.to)) ?? month.to,
    workspaceId: one(params.workspaceId) || undefined,
    projectId: one(params.projectId) || undefined,
    userId: one(params.userId) || undefined,
    billable: billable === "billable" || billable === "nonbillable" ? billable : undefined,
  };
}

export function filtersToQuery(f: ReportFilters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  q.set("from", f.from);
  q.set("to", f.to);
  if (f.workspaceId) q.set("workspaceId", f.workspaceId);
  if (f.projectId) q.set("projectId", f.projectId);
  if (f.userId) q.set("userId", f.userId);
  if (f.billable) q.set("billable", f.billable);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

function baseWhere(f: ReportFilters) {
  return {
    date: { gte: parseDateKey(f.from), lte: parseDateKey(f.to) },
    ...(f.projectId ? { projectId: f.projectId } : {}),
    ...(f.workspaceId ? { project: { workspaceId: f.workspaceId } } : {}),
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.billable ? { billable: f.billable === "billable" } : {}),
  };
}

export async function queryTimeReport(f: ReportFilters) {
  const where: Prisma.TimeEntryWhereInput = baseWhere(f);
  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, workspace: { select: { id: true, name: true } } } },
      task: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const now = new Date();
  return entries.map((e) => {
    const minutes = liveMinutes(e, now);
    return { ...e, minutes, amountCents: entryAmountCents({ ...e, minutes }) };
  });
}

export async function queryExpenseReport(f: ReportFilters) {
  const where: Prisma.ExpenseWhereInput = baseWhere(f);
  return prisma.expense.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, workspace: { select: { id: true, name: true } } } },
      category: true,
      invoice: { select: { id: true, number: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export type TimeReportRow = Awaited<ReturnType<typeof queryTimeReport>>[number];
