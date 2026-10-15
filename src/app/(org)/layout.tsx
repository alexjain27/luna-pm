export const dynamic = "force-dynamic";

import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { SidebarTree } from "./sidebar-tree";

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      projects: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          lists: { orderBy: { name: "asc" }, select: { id: true, name: true } },
        },
      },
    },
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white">
        <div className="flex h-12 items-center border-b border-border px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Luna PM
          </Link>
        </div>
        <SidebarTree workspaces={workspaces} />
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Admin
        </div>
      </aside>

      {/* Page content */}
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {children}
      </main>

      {/* Dog */}
      <img
        src="/dog.png"
        alt=""
        className="pointer-events-none fixed bottom-0 right-0 w-28 select-none opacity-90 z-50"
      />
    </div>
  );
}
