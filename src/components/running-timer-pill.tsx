"use client";

import Link from "next/link";

import { elapsedLabel, useNow } from "@/components/use-now";

export function RunningTimerPill({
  label,
  minutes,
  timerStartedAt,
}: {
  label: string;
  minutes: number;
  timerStartedAt: string;
}) {
  const now = useNow(true);
  return (
    <Link
      href="/time"
      title={label}
      className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      <span className="max-w-40 truncate">{label}</span>
      <span className="font-mono tabular-nums" suppressHydrationWarning>{elapsedLabel(minutes, timerStartedAt, now)}</span>
    </Link>
  );
}
