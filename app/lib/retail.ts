// The numbers behind the retail band on Home. Pure functions of State, so tests/retail.test.ts can run them directly.
import type { State } from "./data.ts";
import { jcCalc } from "./calc.ts";
import { STORE_TARGET, goldWhere, salesMonth, salesToday } from "./home.ts";
import { TODAY } from "./stats.ts";

const STORES = Object.keys(STORE_TARGET);
const sum = <T,>(a: T[], f: (x: T) => number) => a.reduce((x, r) => x + f(r), 0);

export const daysIn = (today: string) => new Date(+today.slice(0, 4), +today.slice(5, 7), 0).getDate();

/** One day's share of a monthly target. */
export const dailyTarget = (monthly: number, daysInMonth: number) => (daysInMonth > 0 ? Math.round(monthly / daysInMonth) : 0);

/** The latest saved 24K rate and how far it moved from the one before. Records are newest first. */
export function rateChange(rates: { f: Record<string, string> }[]) {
  const rate = Number(rates[0]?.f.r24) || 0;
  const before = Number(rates[1]?.f.r24);
  return { rate, diff: rates[1] && before ? rate - before : null };
}

/** Sales per day for the last n days, oldest first, with zero for quiet days. */
export function lastDays(inv: { date: string; amount: number }[], today: string, n: number) {
  const end = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end - (n - 1 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { name: String(d.getUTCDate()), v: sum(inv.filter((v) => v.date === key), (v) => v.amount) };
  });
}

/** Founder: stores against their daily target, the whole business today, the vault, the week. */
export function founderBand(s: State) {
  const month = sum(STORES, (n) => STORE_TARGET[n]);
  const target = dailyTarget(month, daysIn(TODAY));
  const stores = sum(salesToday(s, STORES), (v) => v.amount);
  return {
    stores, target, pct: target ? Math.round((stores / target) * 100) : 0,
    all: sum(s.invoices.filter((v) => v.date === TODAY), (v) => v.amount),
    monthSoFar: salesMonth(s, STORES), monthTarget: month,
    vaultMg: goldWhere(s)[0]?.mg ?? 0,
    week: lastDays(s.invoices, TODAY, 7),
  };
}

/** Production manager: gold out on cards, cards that do not balance, pieces still waiting for a tag. */
export function productionBand(s: State) {
  const open = s.jcs.filter((j) => j.state !== "Closed");
  return {
    goldOutMg: sum(open, (j) => j.issued),
    cardsShort: s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0).length,
    awaitingTag: s.inw.filter((p) => !p.tag).length,
    openCards: open.length,
  };
}

/** Store manager: both stores against their daily target, stock on the shelf, online orders still moving. */
export function storeBand(s: State) {
  const month = sum(STORES, (n) => STORE_TARGET[n]);
  const target = dailyTarget(month, daysIn(TODAY));
  const today = sum(salesToday(s, STORES), (v) => v.amount);
  return {
    today, target, pct: target ? Math.round((today / target) * 100) : 0,
    inStores: s.items.filter((i) => i.status === "InStock" && STORES.includes(i.loc)).length,
    orders: s.orders.filter((o) => o.state < 7).length,
  };
}
