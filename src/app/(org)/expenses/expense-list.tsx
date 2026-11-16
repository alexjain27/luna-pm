"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatDay, formatMoney } from "@/lib/billing-format";
import { ExpenseForm, type ExpenseFormProject, type ExpenseInitial } from "./expense-form";

export type ExpenseRow = ExpenseInitial & {
  projectName: string;
  workspaceName: string;
  categoryName: string;
  userName: string;
  invoiceNumber: string | null;
  hasReceipt: boolean;
};

export function ExpenseList({
  expenses,
  projects,
  categories,
  currency,
}: {
  expenses: ExpenseRow[];
  projects: ExpenseFormProject[];
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    setError(null);
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Failed to delete");
    else router.refresh();
  }

  const total = expenses.reduce((s, x) => s + x.amountCents, 0);

  return (
    <div className="flex flex-col gap-4">
      {adding ? (
        <ExpenseForm projects={projects} categories={categories} onDone={() => setAdding(false)} />
      ) : (
        <div>
          <button onClick={() => setAdding(true)} className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
            + Add expense
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-4 py-2 font-semibold">Project</th>
              <th className="px-4 py-2 font-semibold">Category</th>
              <th className="px-4 py-2 font-semibold">Notes</th>
              <th className="px-4 py-2 font-semibold">Person</th>
              <th className="px-4 py-2 text-right font-semibold">Amount</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-zinc-500">No expenses in this period.</td>
              </tr>
            )}
            {expenses.map((x) =>
              editingId === x.id ? (
                <tr key={x.id} className="border-t border-zinc-200">
                  <td colSpan={7} className="p-3">
                    <ExpenseForm projects={projects} categories={categories} initial={x} onDone={() => setEditingId(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={x.id} className="border-t border-zinc-200">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDay(x.date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-zinc-900">{x.projectName}</div>
                    <div className="text-xs text-zinc-400">{x.workspaceName}</div>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{x.categoryName}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {x.notes}
                    <div className="mt-0.5 flex gap-2">
                      {!x.billable && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">Non-billable</span>
                      )}
                      {x.invoiceNumber && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Invoiced {x.invoiceNumber}</span>
                      )}
                      {x.hasReceipt && (
                        <a href={`/api/expenses/${x.id}/receipt`} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline">
                          Receipt
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{x.userName}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatMoney(x.amountCents, currency)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {!x.invoiceNumber && (
                      <>
                        <button onClick={() => setEditingId(x.id)} className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700">
                          Edit
                        </button>
                        <button onClick={() => remove(x.id)} className="ml-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase text-zinc-500">Total</td>
              <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums">{formatMoney(total, currency)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
