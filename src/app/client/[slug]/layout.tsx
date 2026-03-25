export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function ClientPortalLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true },
  });

  if (!workspace || workspace.type !== "CLIENT") notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 h-16 w-full bg-white shadow-[0_3px_3px_0_rgba(111,114,132,0.04)] border-b border-border">
        <div className="flex h-full items-center justify-between px-12">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Luna PM
            </span>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Portal
            </span>
            <span className="text-muted-foreground">›</span>
            <span className="text-sm font-medium text-foreground">{workspace.name}</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href={`/client/${slug}`}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Overview
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-5xl px-12 py-8">
        {children}
      </main>
    </div>
  );
}
