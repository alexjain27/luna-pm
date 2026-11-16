"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatHours, formatMoney, parseDuration, formatMinutes } from "@/lib/billing-format";
import { RateInput } from "@/components/rate-input";

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
}

export function ProjectBillingCard({
  projectId,
  billable,
  hourlyRateCents,
  budgetMinutes,
  stats,
  members,
  currency,
}: {
  projectId: string;
  billable: boolean;
  hourlyRateCents: number | null;
  budgetMinutes: number | null;
  stats: { minutes: number; billableMinutes: number; amountCents: number; uninvoicedCents: number; expenseCents: number };
  members: { id: string; name: string; rateCents: number | null; defaultRateCents: number | null }[];
  currency: string;
}) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [budget, setBudget] = useState(budgetMinutes != null ? formatMinutes(budgetMinutes) : "");
  const [error, setError] = useState<string | null>(null);
  const money = (c: number) => formatMoney(c, currency);

  async function patch(body: unknown) {
    setError(null);
    try {
      await call(`/api/projects/${projectId}/billing`, "PATCH", body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      throw err;
    }
  }

  const pct = budgetMinutes ? Math.min(100, (stats.minutes / budgetMinutes) * 100) : 0;
  const over = budgetMinutes != null && stats.minutes > budgetMinutes;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Time & budget</h3>
        <button onClick={() => setShowSettings((v) => !v)} className="text-xs text-zinc-500 hover:underline">
          {showSettings ? "Done" : "Billing settings"}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Hours logged</dt>
          <dd className="font-semibold tabular-nums">{formatHours(stats.minutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Billable hours</dt>
          <dd className="font-semibold tabular-nums">{formatHours(stats.billableMinutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Billable amount</dt>
          <dd className="font-semibold tabular-nums">{money(stats.amountCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Uninvoiced</dt>
          <dd className="font-semibold tabular-nums">{money(stats.uninvoicedCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Expenses</dt>
          <dd className="font-semibold tabular-nums">{money(stats.expenseCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Rate</dt>
          <dd className="font-semibold tabular-nums">
            {!billable ? "Non-billable" : hourlyRateCents != null ? `${money(hourlyRateCents)}/h` : "Per person"}
          </dd>
        </div>
      </dl>

      {budgetMinutes != null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Budget</span>
            <span className={over ? "font-semibold text-red-600" : ""}>
              {formatHours(stats.minutes)} / {formatHours(budgetMinutes)} h
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {showSettings && (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 text-sm">
          <label className="flex items-center gap-2 text-zinc-700">
            <input type="checkbox" checked={billable} onChange={(e) => patch({ billable: e.target.checked }).catch(() => {})} />
            Billable project
          </label>
          <div className="flex items-center justify-between">
            <span className="text-zinc-700">Project hourly rate</span>
            <RateInput initialCents={hourlyRateCents} onSave={(cents) => patch({ hourlyRateCents: cents })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-700">Budget (hours)</span>
            <input
              className="h-8 w-28 rounded-lg border border-zinc-200 bg-white px-2 text-right text-sm outline-none focus:border-zinc-400"
              value={budget}
              placeholder="—"
              onChange={(e) => setBudget(e.target.value)}
              onBlur={() => {
                const trimmed = budget.trim();
                const minutes = trimmed ? parseDuration(trimmed) : null;
                if (trimmed && minutes == null) return setError("Budget must look like 40, 40:00 or 40h");
                if (minutes !== budgetMinutes) patch({ budgetMinutes: minutes }).catch(() => {});
              }}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Per-person rate overrides</p>
            <p className="text-xs text-zinc-400">Blank uses the project rate, then the person&apos;s default.</p>
            <table className="mt-1 w-full">
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1 text-zinc-700">
                      {m.name}
                      {m.defaultRateCents != null && (
                        <span className="ml-1 text-xs text-zinc-400">(default {money(m.defaultRateCents)})</span>
                      )}
                    </td>
                    <td className="py-1">
                      <RateInput
                        initialCents={m.rateCents}
                        onSave={async (cents) => {
                          await call(`/api/projects/${projectId}/member-rates`, "PUT", { userId: m.id, rateCents: cents });
                          router.refresh();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400">Rate changes apply to new time entries. Existing entries keep their rate.</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
