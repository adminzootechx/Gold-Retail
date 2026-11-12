// Numbers the dashboards, sales and finance screens derive from the invoice and item data.
// No runtime imports, so tests/stats.test.ts can run it directly.
import type { Customer, Invoice } from "./data";

export const NOW = new Date("2026-11-12T00:00:00");
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const monthKey = (d: string) => d.slice(0, 7);
export const monthLabel = (key: string) => MONTH[+key.slice(5, 7) - 1];
export const ageDays = (d: string) => Math.max(0, Math.round((NOW.getTime() - new Date(d + "T00:00:00").getTime()) / 86400000));
export const ageBucket = (d: string) => { const a = ageDays(d); return a <= 30 ? "0-30" : a <= 60 ? "31-60" : "61-90+"; };

/** Revenue per month, oldest first. Amounts in rupees. */
export function revenueByMonth(inv: Invoice[]) {
  const m = new Map<string, number>();
  for (const v of inv) m.set(monthKey(v.date), (m.get(monthKey(v.date)) ?? 0) + v.amount);
  return [...m.entries()].sort().map(([k, v]) => ({ key: k, name: monthLabel(k), v }));
}

export function sumBy<T extends string>(inv: Invoice[], f: (v: Invoice) => T, month?: string) {
  const m = new Map<T, number>();
  for (const v of inv) if (!month || monthKey(v.date) === month) m.set(f(v), (m.get(f(v)) ?? 0) + v.amount);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** What each customer has bought and still owes. */
export function customerTotals(inv: Invoice[], customers: Customer[]) {
  return customers.map((c) => {
    const mine = inv.filter((v) => v.custId === c.id);
    return { ...c, orders: mine.length, spend: mine.reduce((a, v) => a + v.amount, 0), due: mine.reduce((a, v) => a + (v.amount - v.paid), 0), last: mine.length ? mine[mine.length - 1].date : "" };
  });
}

export const receivables = (inv: Invoice[]) => inv.filter((v) => v.paid < v.amount);
export const lakh = (n: number) => "₹" + (n / 100000).toFixed(1) + " L";

export const custName = (cs: Customer[], id: string) => cs.find((c) => c.id === id)?.name ?? "Walk-in customer";

/** The demo's today. Every figure that says "this month" is computed from this, never typed. */
export const TODAY = "2026-11-12";
export const THIS_MONTH = TODAY.slice(0, 7);
export const prevMonthKey = (k: string) => { const y = +k.slice(0, 4), m = +k.slice(5, 7); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
export const dayLabel = (d = TODAY) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

/** Revenue from the 1st to the given day of a month. */
export function revenueToDay(inv: Invoice[], month: string, day: number) {
  return inv.filter((v) => monthKey(v.date) === month && +v.date.slice(8) <= day).reduce((a, v) => a + v.amount, 0);
}

/** Lakh for big amounts, plain rupees for small ones. */
export const short = (n: number) => (n >= 100000 ? lakh(n) : "₹" + Math.round(n).toLocaleString("en-IN"));
