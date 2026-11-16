// Pure helpers shared by server and client components. No Prisma imports.

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** 90 → "1:30" */
export function formatMinutes(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  const m = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** 90 → "1.50" */
export function formatHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

/**
 * Parse a human duration into minutes. Accepts "1:30", "1.5", "1.5h", "90m",
 * "1h 30m", "2". Bare numbers are hours. Returns null when unparseable.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+):([0-5]?\d)$/))) return Number(m[1]) * 60 + Number(m[2]);
  if ((m = s.match(/^(\d*\.?\d+)\s*h?$/))) return Math.round(Number(m[1]) * 60);
  if ((m = s.match(/^(\d+)\s*m(in)?$/))) return Number(m[1]);
  if ((m = s.match(/^(\d+)\s*h\s*(\d+)\s*m?$/))) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

/** "$1,234.5" → 123450. Returns null when unparseable. */
export function parseMoneyToCents(input: string): number | null {
  const s = input.replace(/[$,\s]/g, "");
  if (!/^-?\d*\.?\d{0,2}$/.test(s) || s === "" || s === ".") return null;
  return Math.round(Number(s) * 100);
}

// Date-only values (@db.Date) come back from Prisma as UTC midnight, so all
// day arithmetic is done in UTC on "YYYY-MM-DD" keys.

export function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseDateKey(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date: ${key}`);
  const d = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${key}`);
  return d;
}

/** Today's calendar date in the runtime's local time zone. */
export function todayKey(now: Date = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number) {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
}

/** Monday of the week containing `key`. */
export function startOfWeekKey(key: string) {
  const dow = parseDateKey(key).getUTCDay(); // 0 = Sun
  return addDays(key, dow === 0 ? -6 : 1 - dow);
}

export function formatDay(
  value: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
) {
  if (!value) return "—";
  const d = typeof value === "string" ? parseDateKey(value) : value;
  return d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}
