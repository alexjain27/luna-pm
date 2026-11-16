import { prisma } from "@/lib/prisma";
import { dateKey, todayKey } from "@/lib/billing-format";

export * from "@/lib/billing-format";

// ── Settings ─────────────────────────────────────────────

export async function getBillingSettings() {
  return prisma.billingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

// ── Rates ────────────────────────────────────────────────

/** Rate resolution order: member override → project rate → user default → 0. */
export async function resolveRateCents(projectId: string, userId: string) {
  const [memberRate, project, user] = await Promise.all([
    prisma.projectMemberRate.findUnique({
      where: { projectId_userId: { projectId, userId } },
    }),
    prisma.project.findUnique({ where: { id: projectId }, select: { hourlyRateCents: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { defaultRateCents: true } }),
  ]);
  return memberRate?.hourlyRateCents ?? project?.hourlyRateCents ?? user?.defaultRateCents ?? 0;
}

// ── Time entries ─────────────────────────────────────────

/** Minutes including the currently running segment, if any. */
export function liveMinutes(
  entry: { minutes: number; timerStartedAt: Date | null },
  now: Date = new Date()
) {
  if (!entry.timerStartedAt) return entry.minutes;
  return entry.minutes + Math.max(0, Math.floor((now.getTime() - entry.timerStartedAt.getTime()) / 60000));
}

export function entryAmountCents(entry: { minutes: number; rateCents: number; billable: boolean }) {
  return entry.billable ? Math.round((entry.minutes / 60) * entry.rateCents) : 0;
}

/** Stop every running timer for a user, folding elapsed time into minutes. */
export async function stopRunningTimers(userId: string) {
  const running = await prisma.timeEntry.findMany({
    where: { userId, timerStartedAt: { not: null } },
  });
  for (const entry of running) {
    await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { minutes: liveMinutes(entry), timerStartedAt: null },
    });
  }
}

// ── Invoices ─────────────────────────────────────────────

export function invoiceTotals(
  invoice: { taxRate: number; lineItems: { amountCents: number }[] }
) {
  const subtotalCents = invoice.lineItems.reduce((sum, li) => sum + li.amountCents, 0);
  const taxCents = Math.round((subtotalCents * invoice.taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function isOverdue(invoice: { status: string; dueDate: Date }, today = todayKey()) {
  return invoice.status === "SENT" && dateKey(invoice.dueDate) < today;
}
