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
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Client Portal
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">{workspace.name}</h1>
          <nav className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/client/${slug}`}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Overview
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
