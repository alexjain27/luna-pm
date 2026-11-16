export const dynamic = "force-dynamic";

import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { RunningTimerPill } from "@/components/running-timer-pill";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/lists", label: "Lists" },
  { href: "/statuses", label: "Statuses" },
  { href: "/time", label: "Time" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/invoices", label: "Invoices" },
];

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const running = await prisma.timeEntry.findFirst({
    where: { userId: currentUser.id, timerStartedAt: { not: null } },
    include: { project: { select: { name: true } }, task: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="print:hidden sticky top-0 z-40 h-16 w-full bg-white shadow-[0_3px_3px_0_rgba(111,114,132,0.04)] border-b border-border">
        <div className="flex h-full items-center justify-between px-12">
          {/* Left */}
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Luna PM
            </span>
            <div className="h-4 w-px bg-border" />
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Right */}
          <div className="flex items-center gap-3">
            {running?.timerStartedAt && (
              <RunningTimerPill
                label={`${running.project.name}${running.task ? ` — ${running.task.name}` : ""}`}
                minutes={running.minutes}
                timerStartedAt={running.timerStartedAt.toISOString()}
              />
            )}
            <Link
              href="/settings/billing"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Settings
            </Link>
            <span className="text-xs text-muted-foreground">{currentUser.name ?? "Admin"}</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-12 py-8 print:max-w-none print:p-0">
        {children}
      </main>

      {/* Dog */}
      <img
        src="/dog.png"
        alt=""
        className="print:hidden pointer-events-none fixed bottom-0 right-0 w-28 select-none opacity-90 z-50"
      />
    </div>
  );
}
