import { cn } from "@/lib/utils";

export function OverviewCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-48 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
