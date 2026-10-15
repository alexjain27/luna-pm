import Link from "next/link";
import { Columns3, LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type View = "overview" | "list" | "board";

const views: { id: View; label: string; icon: typeof List }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: Columns3 },
];

export function parseView(value: string | undefined): View {
  return value === "list" || value === "board" ? value : "overview";
}

/**
 * Full-width header for a workspace or project page: breadcrumbs, title,
 * actions, and the Overview / List / Board view tabs (driven by `?view=`).
 * Bleeds to the edges of the org layout's padded main area.
 */
export function PageHeader({
  breadcrumbs,
  title,
  badge,
  actions,
  basePath,
  activeView,
}: {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  basePath: string;
  activeView: View;
}) {
  return (
    <header className="-mx-8 -mt-6 border-b border-border bg-white px-8 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-zinc-300">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-zinc-900 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-zinc-900">{title}</h1>
            {badge}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="mt-3 flex gap-1">
        {views.map((view) => (
          <Link
            key={view.id}
            href={view.id === "overview" ? basePath : `${basePath}?view=${view.id}`}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              activeView === view.id
                ? "border-zinc-900 font-medium text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            )}
          >
            <view.icon className="size-4" />
            {view.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
