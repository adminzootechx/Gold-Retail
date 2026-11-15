// What each role's Home shows: a ranked list of things that need them, and the few figures behind it.
// Pure functions of State, so tests/home.test.ts can run them directly.
import type { Role, State } from "./data.ts";
import { PUR, alloc, g, inr, jcCalc } from "./calc.ts";
import { INWARD_STEPS, MTO_ACTIONS, REPAIR_STEPS, SALE_ACTIONS } from "./steps.ts";
import { THIS_MONTH, TODAY, ageBucket, custName, monthKey, plural, prevMonthKey, receivables, revenueToDay } from "./stats.ts";

export type Level = "blocked" | "decision" | "todo";
export interface Todo {
  id: string;
  level: Level;
  what: string;
  meta: string;
  href: string;
  cta: string;
  /** Set on approvals the viewer may decide on the spot. */
  decide?: string;
}

/** Monthly sales targets per store, in rupees. */
export const STORE_TARGET: Record<string, number> = { "Mumbai Flagship": 2400000, "Delhi Store": 1200000 };

/** The vendor the portal prototype signs in as. */
export const VENDOR_SELF = "Shree Karigar Works";
const RANK: Record<Level, number> = { blocked: 0, decision: 1, todo: 2 };

export function todos(s: State, role: Role): Todo[] {
  const out: Todo[] = [];
  const pending = s.approvals.filter((a) => a.state === "pending");
  const unrec = s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0);
  const blockedGold = unrec.map<Todo>((j) => ({
    id: "gold-" + j.id, level: "blocked",
    what: `${j.id} is short ${g(jcCalc(j).unrec)} of gold`,
    meta: `${j.vendor} · allowed wastage ${g(jcCalc(j).allowed)}`,
    href: "/job-work?jc=" + j.id, cta: "Reconcile",
  }));

  if (role === "Founder") {
    for (const a of pending) {
      out.push({ id: a.id, level: "decision", what: `${a.type}: ${a.detail}${a.value ? ", " + inr(a.value) : ""}`, meta: `${a.ref} · asked by ${a.by}`, href: "/approvals", cta: "Open", decide: a.id });
    }
    out.push(...blockedGold);
    const owed = new Map<string, number>();
    for (const v of receivables(s.invoices)) if (ageBucket(v.date) === "61-90+") owed.set(v.custId, (owed.get(v.custId) ?? 0) + (v.amount - v.paid));
    for (const [id, amt] of owed) out.push({ id: "ar-" + id, level: "todo", what: `${custName(s.customers, id)} owes ${inr(amt)}, over 60 days`, meta: "Receivable", href: "/finance", cta: "Chase" });
    for (const o of s.orders) if (o.state === 0 && alloc(s.items, o).mode === "mto") out.push({ id: "mto-" + o.id, level: "todo", what: `${o.id} has no stock, make it to order`, meta: `${o.cust} · ${o.sku} ${o.variant}`, href: "/ecommerce?order=" + o.id, cta: "Open" });
  }

  if (role === "Production manager") {
    out.push(...blockedGold);
    for (const p of s.inw.filter((x) => !x.tag)) {
      const next = [0, 1, 2, 3, 4].find((i) => !(p.done[i] || (i === 4 && !p.need)));
      out.push({ id: p.id, level: "todo", what: next === undefined ? `${p.name} is ready to tag` : `${p.name} waits at: ${INWARD_STEPS[next]}`, meta: `${p.id} · ${p.jc} · ${p.variant}`, href: "/inward", cta: next === undefined ? "Tag it" : "Continue" });
    }
    for (const j of s.jcs.filter((x) => x.state === "At vendor")) out.push({ id: "out-" + j.id, level: "todo", what: `${j.id} is with ${j.vendor}`, meta: `${plural(j.qty, "piece")} · ${g(j.issued)} fine gold issued`, href: "/job-work?jc=" + j.id, cta: "Open" });
    for (const a of pending.filter((x) => x.by === role)) out.push({ id: a.id, level: "todo", what: `Waiting on the founder: ${a.type}, ${a.detail}`, meta: a.ref, href: "/approvals", cta: "See" });
  }

  if (role === "Store manager") {
    for (const o of s.orders.filter((x) => x.state < 7)) {
      const mto = o.mto || (o.state === 0 && alloc(s.items, o).mode === "mto");
      const action = (mto ? MTO_ACTIONS : SALE_ACTIONS)[o.state] ?? "Open it";
      out.push({ id: o.id, level: "todo", what: o.state === 0 && mto ? `${o.id} has no stock: ${action.toLowerCase()} and make it to order` : `${o.id}: ${action.toLowerCase()}`, meta: `${o.cust} · ${o.sku} ${o.variant}`, href: "/ecommerce?order=" + o.id, cta: "Open" });
    }
    for (const i of s.items.filter((x) => x.status === "InTransit")) out.push({ id: "rx-" + i.tag, level: "todo", what: `Receive ${i.tag} at ${i.to ?? "the store"}`, meta: i.loc, href: "/stores", cta: "Receive" });
    for (const r of s.repairs.filter((x) => REPAIR_STEPS[x.state] === "Ready")) out.push({ id: r.id, level: "todo", what: `${r.id} is ready, call the customer`, meta: `${r.tag} · ${r.issue}`, href: "/after-sales", cta: "Open" });
    for (const a of pending.filter((x) => x.by === role)) out.push({ id: a.id, level: "todo", what: `Waiting on the founder: ${a.type}, ${a.detail}`, meta: a.ref, href: "/approvals", cta: "See" });
  }

  if (role === "Vendor (portal)") {
    for (const j of s.jcs.filter((x) => x.vendor === VENDOR_SELF && x.state === "At vendor")) out.push({ id: j.id, level: "todo", what: `${j.id}: return ${plural(j.qty, "piece")} and the scrap`, meta: `${g(j.issued)} fine gold and ${(j.stI / 100).toFixed(2)} ct issued to you`, href: "/job-work?jc=" + j.id, cta: "Open" });
    for (const j of s.jcs.filter((x) => x.vendor === VENDOR_SELF && x.state === "Received" && !x.approved && jcCalc(x).unrec > 0)) out.push({ id: "v-" + j.id, level: "blocked", what: `${j.id} does not balance by ${g(jcCalc(j).unrec)}`, meta: "Head office will ask you about this", href: "/job-work?jc=" + j.id, cta: "See" });
  }

  return out.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

/** Where the fine gold is: in the vault, out with vendors, or in finished pieces. Milligrams. */
export function goldWhere(s: State) {
  const vault = s.lots.reduce((a, l) => a + l.fine, 0);
  const vendors = s.jcs.filter((j) => j.state !== "Closed").reduce((a, j) => a + Math.max(0, j.issued - j.pieces - j.scrap), 0);
  const pieces = s.items.filter((i) => i.status !== "Sold").reduce((a, i) => a + Math.round(i.net * PUR), 0);
  return [
    { label: "In the vault", mg: vault, href: "/raw-material" },
    { label: "With vendors", mg: vendors, href: "/job-work" },
    { label: "In finished pieces", mg: pieces, href: "/inventory" },
  ];
}

/** How many pieces sit at each step between the vendor and the shelf. */
export function pipeline(s: State) {
  return [
    { label: "Being made", n: s.jcs.filter((j) => j.state === "At vendor").reduce((a, j) => a + j.qty, 0), href: "/job-work" },
    { label: "Received, not tagged", n: s.inw.filter((p) => !p.tag).length, href: "/inward" },
    { label: "At the hallmark centre", n: s.items.filter((i) => i.status === "AtHallmark").length, href: "/inventory" },
    { label: "In stock", n: s.items.filter((i) => i.status === "InStock").length, href: "/inventory" },
  ];
}

/** This month so far against the same days last month. */
export function revenueNow(s: State) {
  const day = +TODAY.slice(8);
  const now = revenueToDay(s.invoices, THIS_MONTH, day);
  const before = revenueToDay(s.invoices, prevMonthKey(THIS_MONTH), day);
  const prevTotal = revenueToDay(s.invoices, prevMonthKey(THIS_MONTH), 31);
  return { now, before, prevTotal, day };
}

export const salesToday = (s: State, stores: string[]) => s.invoices.filter((v) => v.date === TODAY && stores.includes(v.store));
export const salesMonth = (s: State, stores: string[]) => s.invoices.filter((v) => monthKey(v.date) === THIS_MONTH && stores.includes(v.store)).reduce((a, v) => a + v.amount, 0);
