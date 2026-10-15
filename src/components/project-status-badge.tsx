import { cn, formatLabel } from "@/lib/utils";

const styles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  INTAKE: "bg-blue-50 text-blue-700",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        styles[status] ?? "bg-zinc-100 text-zinc-600"
      )}
    >
      {formatLabel(status)}
    </span>
  );
}
