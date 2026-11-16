import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  addDays,
  dateKey,
  formatDay,
  formatMinutes,
  liveMinutes,
  parseDateKey,
  startOfWeekKey,
  todayKey,
} from "@/lib/billing";
import { DayView } from "./day-view";
import { WeekGrid } from "./week-grid";
import { UserSelect } from "./user-select";
import type { EntryVM, ProjectOption } from "./types";

function validKey(v: string | undefined) {
  if (!v) return undefined;
  try {
    parseDateKey(v);
    return v;
  } catch {
    return undefined;
  }
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; userId?: string }>;
}) {
  const sp = await searchParams;
  const today = todayKey();
  const date = validKey(sp.date) ?? today;
  const view = sp.view === "week" ? "week" : "day";
  const currentUser = await getCurrentUser();

  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const userId = users.some((u) => u.id === sp.userId) ? sp.userId! : currentUser.id;
  const userParam = userId === currentUser.id ? "" : `&userId=${userId}`;

  const weekStart = startOfWeekKey(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [projects, weekEntries] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        billable: true,
        workspace: { select: { name: true } },
        tasks: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: [{ workspace: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.timeEntry.findMany({
      where: { userId, date: { gte: parseDateKey(days[0]), lte: parseDateKey(days[6]) } },
      include: {
        project: { select: { name: true, workspace: { select: { name: true } } } },
        task: { select: { name: true } },
        invoice: { select: { number: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const projectOptions: ProjectOption[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    workspaceName: p.workspace.name,
    billable: p.billable,
    tasks: p.tasks,
  }));

  const entries: EntryVM[] = weekEntries.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    projectName: e.project.name,
    workspaceName: e.project.workspace.name,
    taskId: e.taskId,
    taskName: e.task?.name ?? null,
    date: dateKey(e.date),
    minutes: e.minutes,
    timerStartedAt: e.timerStartedAt?.toISOString() ?? null,
    notes: e.notes,
    billable: e.billable,
    invoiceNumber: e.invoice?.number ?? null,
  }));

  const now = new Date();
  const dayTotals = days.map((d) =>
    weekEntries.filter((e) => dateKey(e.date) === d).reduce((s, e) => s + liveMinutes(e, now), 0)
  );
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  const step = view === "week" ? 7 : 1;
  const nav = (d: string, v = view) => `/time?date=${d}&view=${v}${userParam}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Time</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "week"
              ? `Week of ${formatDay(days[0], { month: "long", day: "numeric", year: "numeric" })}`
              : formatDay(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UserSelect users={users} value={userId} date={date} view={view} />
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-xs font-semibold">
            <Link href={nav(addDays(date, -step))} className="px-3 py-2 text-zinc-600 hover:bg-zinc-50" aria-label="Previous">
              ←
            </Link>
            <Link href={nav(today)} className="border-x border-zinc-200 px-3 py-2 text-zinc-600 hover:bg-zinc-50">
              Today
            </Link>
            <Link href={nav(addDays(date, step))} className="px-3 py-2 text-zinc-600 hover:bg-zinc-50" aria-label="Next">
              →
            </Link>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-xs font-semibold">
            <Link
              href={nav(date, "day")}
              className={`px-3 py-2 ${view === "day" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              Day
            </Link>
            <Link
              href={nav(date, "week")}
              className={`px-3 py-2 ${view === "week" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              Week
            </Link>
          </div>
        </div>
      </div>

      {view === "day" && (
        <div className="grid grid-cols-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {days.map((d, i) => (
            <Link
              key={d}
              href={nav(d)}
              className={`border-r border-zinc-200 px-3 py-2 text-center ${
                d === date ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
              }`}
            >
              <div className={`text-xs ${d === date ? "text-zinc-300" : "text-zinc-500"}`}>
                {formatDay(d, { weekday: "short" })}
                {d === today ? " · today" : ""}
              </div>
              <div className="font-mono text-sm tabular-nums">{formatMinutes(dayTotals[i])}</div>
            </Link>
          ))}
          <div className="bg-zinc-50 px-3 py-2 text-center">
            <div className="text-xs text-zinc-500">Week</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{formatMinutes(weekTotal)}</div>
          </div>
        </div>
      )}

      {view === "day" ? (
        <DayView
          key={`${date}-${userId}`}
          entries={entries.filter((e) => e.date === date)}
          projects={projectOptions}
          date={date}
          userId={userId}
        />
      ) : (
        <WeekGrid
          key={`${weekStart}-${userId}`}
          entries={entries}
          projects={projectOptions}
          days={days}
          userId={userId}
          userParam={userParam}
        />
      )}
    </div>
  );
}
