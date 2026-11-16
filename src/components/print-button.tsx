"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
