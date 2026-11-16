const STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENT: "bg-blue-50 text-blue-700",
  OVERDUE: "bg-red-50 text-red-700",
  PAID: "bg-emerald-50 text-emerald-700",
  VOID: "bg-zinc-100 text-zinc-400 line-through",
};

export function InvoiceStatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const key = overdue ? "OVERDUE" : status;
  const label = overdue ? "Overdue" : status === "SENT" ? "Sent" : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[key] ?? STYLES.DRAFT}`}>{label}</span>
  );
}
