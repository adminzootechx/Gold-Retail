// Builds the twelve analytics dashboards from the stored data. Pure, no React.
import { g, inr, jcCalc } from "../lib/calc";
import { THIS_MONTH, ageBucket, customerTotals, lakh, monthKey, monthLabel, plural, prevMonthKey, receivables, revenueToDay, TODAY } from "../lib/stats";
import { STORES, VENDORS } from "../lib/mock";
import { payables } from "../lib/ledger";
import { ofKind } from "../lib/records";
import { STORE_TARGET } from "../lib/home";
import type { Channel, Invoice, State } from "../lib/data";

export type Row = Record<string, string | number | null>;
export interface Chart {
  title: string; note?: string;
  kind: "bar" | "hbar" | "line" | "lines" | "stack" | "donut";
  data: Row[]; keys?: string[]; unit?: string;
}
export interface Dash {
  id: string; title: string; about: string; sample?: boolean;
  alerts: { text: string; href: string }[];
  kpis: [string, string, string?, number?][];
  charts: Chart[];
  insights: string[];
  table: { title: string; head: string[]; rows: (string | number)[][]; num?: number[] };
}
export interface Filter { months: number; channel: Channel | "All" }

const lossPct = (cards: { issued: number; pieces: number; scrap: number }[]) => { const i = cards.reduce((a, j) => a + j.issued, 0); return i ? (cards.reduce((a, j) => a + (j.issued - j.pieces - j.scrap), 0) / i) * 100 : 0; };
const days = (tag: string) => 5 + ([...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % 140);
const L = (n: number) => Math.round(n / 10000) / 10;
const pct = (a: number, b: number) => Math.round((a / Math.max(1, b)) * 100);
const sum = <T,>(a: T[], f: (x: T) => number) => a.reduce((x, r) => x + f(r), 0);
const due = (v: Invoice) => v.amount - v.paid;
const top = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0];
const tally = <T,>(a: T[], f: (x: T) => string, w: (x: T) => number = () => 1) => a.reduce<Record<string, number>>((m, x) => ({ ...m, [f(x)]: (m[f(x)] ?? 0) + w(x) }), {});
const rows = (m: Record<string, number>, unit = 1): Row[] => Object.entries(m).map(([name, v]) => ({ name, v: Math.round(v * unit) / unit }));
const delta = (now: number, before: number) => (before ? `${now >= before ? "up" : "down"} ${Math.abs(pct(now - before, before))}% on the same days last month` : "no earlier month");

/** The months a filter covers, oldest first. */
export function monthsIn(n: number) {
  const out: string[] = [];
  for (let k = THIS_MONTH, i = 0; i < n; i++, k = prevMonthKey(k)) out.unshift(k);
  return out;
}

export function build(s: State, f: Filter): Dash[] {
  const AP = payables(s);
  const grns = ofKind(s.records, "grn");
  const vouchers = ofKind(s.records, "voucher");
  const walkins = ofKind(s.records, "walkin");
  const span = monthsIn(f.months);
  const all = s.invoices;
  const inv = all.filter((v) => span.includes(monthKey(v.date)) && (f.channel === "All" || v.channel === f.channel));
  const monthly = (list: Invoice[], pick: (v: Invoice) => number = (v) => v.amount) => span.map((k) => ({ key: k, name: monthLabel(k), v: sum(list.filter((v) => monthKey(v.date) === k), pick) }));
  const day = +TODAY.slice(8);
  const lastKey = prevMonthKey(THIS_MONTH);
  const upTo = (m: string) => all.filter((v) => monthKey(v.date) === m && +v.date.slice(8) <= day);
  const cur = sum(all.filter((v) => monthKey(v.date) === THIS_MONTH), (v) => v.amount);
  const prev = revenueToDay(all, lastKey, day);
  const nowN = upTo(THIS_MONTH).length, prevN = upTo(lastKey).length;
  const chg = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : undefined);
  const byTag = new Map(s.items.map((i) => [i.tag, i]));
  const fineSold = (list: Invoice[]) => Math.round(sum(list.flatMap((v) => v.tags), (t) => (byTag.get(t)?.net ?? 0) * 0.75) / 100) / 10;
  const mtd = (m: string, d: number) => L(revenueToDay(all, m, d));
  const rateHistory = [...ofKind(s.records, "rate")].reverse();
  const nowInv = inv.filter((v) => monthKey(v.date) === THIS_MONTH);
  const total = sum(inv, (v) => v.amount);
  const channels = ["Retail", "Online", "HNI", "Corporate"] as const;
  const byChannel = tally(inv, (v) => v.channel, (v) => v.amount);

  const live = s.items.filter((i) => i.status !== "Sold");
  const stock = s.items.filter((i) => i.status === "InStock");
  const fine = sum(s.lots, (l) => l.fine);
  const open = s.jcs.filter((j) => j.state !== "Closed");
  const unrec = sum(s.jcs.filter((j) => j.state === "Received" && !j.approved), (j) => jcCalc(j).unrec);
  const owed = receivables(all);
  const owedTotal = sum(owed, due);
  const apTotal = sum(AP, (r) => r.due);
  const cust = customerTotals(inv, s.customers).sort((a, b) => b.spend - a.spend);
  const sold = inv.filter((v) => v.sku);
  const aged = stock.filter((i) => days(i.tag) > 90);
  const storeRev = (n: string, list = nowInv) => sum(list.filter((v) => v.store === n), (v) => v.amount);
  const ageOwed = (b: string) => sum(owed.filter((v) => ageBucket(v.date) === b), due);
  const best = top(byChannel);
  const topSku = top(tally(sold, (v) => v.sku!));
  const seen = (name: string) => s.customers.find((c) => c.id === name)?.name ?? "Walk-in";

  const base: Omit<Dash, "alerts">[] = [
    { id: "inventory", title: "Inventory", about: "What is on the books, where it sits and what state it is in.",
      kpis: [["Pieces on the books", String(live.length), `${plural(stock.length, "piece")} ready to sell`], ["Stock value", inr(sum(live, (i) => i.price))], ["In stock", String(stock.length)], ["In transit", String(s.items.filter((i) => i.status === "InTransit").length), "between locations"]],
      charts: [
        { title: "Pieces by location", kind: "hbar", data: rows(tally(live, (i) => i.loc)) },
        { title: "Pieces by status", kind: "donut", data: rows(tally(live, (i) => i.status)) },
        { title: "Stock value by SKU (lakh)", kind: "bar", data: rows(tally(live, (i) => i.sku.slice(3), (i) => i.price / 100000), 10) },
      ],
      insights: [
        `${top(tally(live, (i) => i.loc))?.[0] ?? "No location"} holds the most pieces (${top(tally(live, (i) => i.loc))?.[1] ?? 0} of ${live.length}).`,
        `${plural(s.items.filter((i) => i.status === "InTransit").length, "piece")} in transit. Receive them to make them sellable.`,
        `${plural(live.filter((i) => i.status !== "InStock" && i.status !== "InTransit").length, "piece")} held, reserved or out on memo, so not available to sell.`,
      ],
      table: { title: "Every piece on the books", head: ["Tag", "SKU", "Variant", "Location", "Status", "Net wt", "Price"], num: [5, 6], rows: live.map((i) => [i.tag, i.sku, i.variant, i.loc, i.status, g(i.net), inr(i.price)]) } },

    { id: "raw", title: "Raw material", about: "Fine gold by lot, and how much of it is committed to work.",
      kpis: [["Fine gold on hand", g(fine)], ["Metal lots", String(s.lots.length), plural(grns.length, "goods receipt") + " booked"], ["Issued on open cards", g(sum(open, (j) => j.issued)), `${plural(open.length, "open card")}`], ["Stones issued", (sum(open, (j) => j.stI) / 100).toFixed(2) + " ct"]],
      charts: [
        { title: "Fine gold by lot (g)", kind: "bar", data: s.lots.map((l) => ({ name: l.id, v: Math.round(l.fine / 1000) })) },
        { title: "Share of gold by lot", kind: "donut", data: s.lots.map((l) => ({ name: l.id, v: Math.round(l.fine / 1000) })) },
        { title: "Gold issued to each open card (g)", kind: "hbar", data: open.map((j) => ({ name: j.id, v: Math.round(j.issued / 1000) })) },
      ],
      insights: [
        `Fine gold on hand is ${g(fine)} across ${plural(s.lots.length, "lot")}.`,
        `${g(sum(open, (j) => j.issued))} is out on ${plural(open.length, "open job card")}.`,
        "Gold is counted in fine milligrams, so purity never has to be recalculated.",
      ],
      table: { title: "Metal lots", head: ["Lot", "Fine gold", "Share"], num: [2], rows: s.lots.map((l) => [l.id, g(l.fine), pct(l.fine, fine) + "%"]) } },

    { id: "production", title: "Production", about: "Job cards, who holds the work and where it is stuck.",
      kpis: [["Open job cards", String(open.length)], ["At vendor", String(s.jcs.filter((j) => j.state === "At vendor").length)], ["Received at HO", String(s.jcs.filter((j) => j.state === "Received").length)], ["Pieces in work", String(sum(open, (j) => j.qty))]],
      charts: [
        { title: "Pieces in work by vendor", kind: "bar", data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], v: sum(open.filter((j) => j.vendor === v.name), (j) => j.qty) })) },
        { title: "Job cards by state and vendor", kind: "stack", keys: ["At vendor", "Received", "Closed"], data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], "At vendor": s.jcs.filter((j) => j.vendor === v.name && j.state === "At vendor").length, Received: s.jcs.filter((j) => j.vendor === v.name && j.state === "Received").length, Closed: s.jcs.filter((j) => j.vendor === v.name && j.state === "Closed").length })) },
      ],
      insights: [
        `${plural(s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0).length, "received card")} does not reconcile and cannot close.`,
        `${top(tally(open, (j) => j.vendor, (j) => j.qty))?.[0] ?? "No vendor"} holds the most open pieces.`,
        `${g(unrec)} of fine gold is unaccounted for on received cards.`,
      ],
      table: { title: "Job cards", head: ["Card", "Vendor", "SKU", "Pieces", "Issued", "Unreconciled", "State"], num: [3, 4, 5], rows: s.jcs.map((j) => [j.id, j.vendor, j.sku, j.qty, g(j.issued), j.state === "Received" ? g(jcCalc(j).unrec) : "-", j.state]) } },

    { id: "manufacturing", title: "Manufacturing", sample: true, about: "How long each stage takes. Cycle times here are sample figures.",
      kpis: [["Cycle time", "13 days", "issue to HO receipt"], ["QC fail rate", "4%", "last 30 days"], ["Rework pieces", "2"], ["Unreconciled gold", g(unrec)]],
      charts: [
        { title: "Cycle time by month (days)", kind: "line", data: span.map((k, i) => ({ name: monthLabel(k), v: [17, 16, 15, 15, 14, 13][i + 6 - span.length] ?? 13 })) },
        { title: "Where the days go", kind: "donut", data: [{ name: "Casting", v: 3 }, { name: "Setting", v: 5 }, { name: "Finishing", v: 2 }, { name: "QC and hallmark", v: 3 }] },
      ],
      insights: ["Stone setting is the longest stage at 5 days.", "Cycle time has fallen from 17 to 13 days in six months.", `${g(unrec)} of gold is still unreconciled, and that is real data, not a sample.`],
      table: { title: "Stage times", head: ["Stage", "Average days", "Target", "Gap"], num: [1, 2, 3], rows: [["Casting", 3, 3, 0], ["Setting", 5, 4, 1], ["Finishing", 2, 2, 0], ["QC and hallmark", 3, 3, 0]] } },

    { id: "sales", title: "Sales", about: "Revenue, channel mix and what a typical invoice looks like.",
      kpis: [["Revenue this month", lakh(cur), `${lakh(prev)} on the same days last month`, chg(cur, prev)], ["Invoices this month", String(nowN), `${prevN} on the same days last month`, chg(nowN, prevN)], ["Average invoice", inr(cur / Math.max(1, nowN)), `${inr(prev / Math.max(1, prevN))} last month`, chg(cur / Math.max(1, nowN), prev / Math.max(1, prevN))], ["Fine gold sold this month", fineSold(nowInv) + " g", `${plural(sum(nowInv, (v) => v.tags.length), "piece")} sold`]],
      charts: [
        { title: "Revenue by month (lakh)", kind: "line", data: monthly(inv).map((r) => ({ name: r.name, v: L(r.v) })) },
        { title: "Revenue by channel and month (lakh)", kind: "stack", keys: [...channels], data: span.map((k) => ({ name: monthLabel(k), ...Object.fromEntries(channels.map((c) => [c, L(sum(inv.filter((v) => v.channel === c && monthKey(v.date) === k), (v) => v.amount))])) })) },
        { title: "Channel share of revenue", kind: "donut", data: rows(byChannel) },
        { title: "This month against last month (lakh, running total)", kind: "lines", keys: ["This month", "Last month"], data: Array.from({ length: 30 }, (_, i) => ({ name: String(i + 1), "This month": i + 1 <= day ? mtd(THIS_MONTH, i + 1) : null, "Last month": mtd(lastKey, i + 1) })) },
        { title: "Fine gold sold by month (g)", kind: "bar", data: span.map((k) => ({ name: monthLabel(k), v: fineSold(inv.filter((v) => monthKey(v.date) === k)) })) },
        { title: "Average invoice by month (thousand)", kind: "line", data: span.map((k) => { const m = inv.filter((v) => monthKey(v.date) === k); return { name: monthLabel(k), v: Math.round(sum(m, (v) => v.amount) / Math.max(1, m.length) / 1000) }; }) },
      ],
      insights: [
        best ? `${best[0]} brings the most revenue: ${lakh(best[1])}, ${pct(best[1], total)}% of the period.` : "No sales in this period.",
        `This month is ${delta(cur, prev)}.`,
        `Biggest single invoice: ${inr(Math.max(0, ...inv.map((v) => v.amount)))}.`,
      ],
      table: { title: "Largest invoices", head: ["Invoice", "Date", "Customer", "Channel", "Store", "Amount", "Paid"], num: [5, 6], rows: [...inv].sort((a, b) => b.amount - a.amount).slice(0, 15).map((v) => [v.id, v.date, seen(v.custId), v.channel, v.store, inr(v.amount), inr(v.paid)]) } },

    { id: "finance", title: "Finance", about: "Billed against collected, and what is still owed either way.",
      kpis: [["Collected this month", lakh(sum(nowInv, (v) => v.paid))], ["Collection rate", pct(sum(inv, (v) => v.paid), total) + "%", "of billed in the period"], ["Gold rate 24K", inr(13250), "per gram"], ["Net receivable", inr(owedTotal - apTotal), "owed to us less we owe"], ["Vouchers posted", String(vouchers.length), inr(sum(vouchers, (v) => Number(v.f.amount))) + " in total"]],
      charts: [
        { title: "Billed against collected (lakh)", kind: "lines", keys: ["Billed", "Collected"], data: span.map((k) => ({ name: monthLabel(k), Billed: L(sum(inv.filter((v) => monthKey(v.date) === k), (v) => v.amount)), Collected: L(sum(inv.filter((v) => monthKey(v.date) === k), (v) => v.paid)) })) },
        { title: "Receivable against payable (lakh)", kind: "bar", data: [{ name: "Receivable", v: L(owedTotal) }, { name: "Payable", v: L(apTotal) }] },
        { title: "24K gold rate (₹ per gram)", kind: "line", data: rateHistory.map((r) => ({ name: r.date.slice(8) + " " + monthLabel(r.date.slice(0, 7)), v: Number(r.f.r24) })) },
      ],
      insights: [`We are owed ${inr(owedTotal)} and owe ${inr(apTotal)}.`, `${pct(sum(inv, (v) => v.paid), total)}% of what we billed in this period has been collected.`, "Margin, tax and ledger postings are not built yet, so no profit figure is shown."],
      table: { title: "Unpaid invoices", head: ["Invoice", "Customer", "Date", "Age", "Due"], num: [4], rows: owed.map((v) => [v.id, seen(v.custId), v.date, ageBucket(v.date), inr(due(v))]) } },

    { id: "ledgers", title: "Receivables and payables", about: "Money in and out by age. Payment vouchers reduce what we owe.",
      kpis: [["Receivable", inr(owedTotal), plural(owed.length, "unpaid invoice")], ["Payable", inr(apTotal), plural(AP.length, "open bill")], ["Receivable over 60 days", inr(ageOwed("61-90+"))], ["Payable due this week", inr(sum(AP.filter((r) => r.age === "0-30"), (r) => r.due))]],
      charts: [
        { title: "Receivable and payable by age (thousand)", kind: "stack", keys: ["Receivable", "Payable"], data: ["0-30", "31-60", "61-90+"].map((b) => ({ name: b, Receivable: Math.round(ageOwed(b) / 1000), Payable: Math.round(sum(AP.filter((r) => r.age === b), (r) => r.due) / 1000) })) },
        { title: "Who owes us (thousand)", kind: "hbar", data: rows(tally(owed, (v) => seen(v.custId), (v) => due(v) / 1000)) },
      ],
      insights: [ageOwed("61-90+") ? `${inr(ageOwed("61-90+"))} has been owed for over 60 days. Call it in first.` : "Nothing has been owed for more than 60 days.", `${AP.length} supplier bills are open.`, `We owe ${inr(sum(AP.filter((r) => r.age === "61-90+"), (r) => r.due))} on bills past 60 days.`],
      table: { title: "Supplier bills", head: ["Party", "Reference", "Age", "Due"], num: [3], rows: AP.map((r) => [r.party, r.note, r.age, inr(r.due)]) } },

    { id: "customer", title: "Customer", about: "Who buys, how often, and who is behind on paying.",
      kpis: [["Customers", String(s.customers.length)], ["Repeat share", pct(cust.filter((c) => c.orders >= 2).length, cust.length) + "%", "bought twice or more"], ["Top spender", inr(cust[0]?.spend ?? 0), cust[0]?.name], ["After-sales cases", String(s.repairs.length + s.approvals.filter((a) => a.type === "Refund" || a.type === "Exchange valuation").length)]],
      charts: [
        { title: "Spend by customer (lakh)", kind: "hbar", data: cust.slice(0, 8).map((c) => ({ name: c.name.split(" ").slice(0, 2).join(" "), v: L(c.spend) })) },
        { title: "Spend by segment", kind: "donut", data: rows(tally(cust, (c) => c.segment, (c) => c.spend)) },
      ],
      insights: [`${cust[0]?.name ?? "Nobody"} is the top customer with ${inr(cust[0]?.spend ?? 0)}.`, `${plural(cust.filter((c) => c.due > 0).length, "customer")} still owe us money.`, `${top(tally(cust, (c) => c.segment, (c) => c.spend))?.[0] ?? "No"} is the biggest segment by spend.`],
      table: { title: "All customers", head: ["Customer", "Segment", "City", "Invoices", "Spend", "Owes"], num: [3, 4, 5], rows: cust.map((c) => [c.name, c.segment, c.city, c.orders, inr(c.spend), inr(c.due)]) } },

    { id: "vendor", title: "Vendor", about: "Where the gold sits with each vendor, and how much each one loses against the allowance.",
      kpis: [["Vendors", String(VENDORS.length), plural(open.length, "open job card")], ["Gold held by vendors", g(sum(open, (j) => j.issued - j.pieces - j.scrap))], ["Average loss", lossPct(s.jcs.filter((j) => j.state !== "At vendor")).toFixed(2) + "%", "of gold issued, allowed 1.50%"], ["Cards over allowance", String(s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0).length)]],
      charts: [
        { title: "Gold held by vendor (g)", kind: "bar", data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], v: Math.round(sum(open.filter((j) => j.vendor === v.name), (j) => j.issued - j.pieces - j.scrap) / 1000) })) },
        { title: "Loss against the 1.5% allowance (%)", kind: "lines", keys: ["Loss", "Allowed"], data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], Loss: +lossPct(s.jcs.filter((j) => j.vendor === v.name && j.state !== "At vendor")).toFixed(2), Allowed: 1.5 })) },
      ],
      insights: [`${top(tally(open, (j) => j.vendor, (j) => j.issued - j.pieces - j.scrap))?.[0] ?? "No vendor"} holds the most gold.`, `${plural(s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0).length, "card")} over the wastage allowance and waiting for a decision.`, `${plural(s.jcs.filter((j) => j.state === "Closed").length, "job card")} closed and reconciled.`],
      table: { title: "Vendor account", head: ["Vendor", "City", "Work", "Cards", "Open", "Gold held", "Loss", "Rating"], num: [3, 4, 5, 6], rows: VENDORS.map((v) => [v.name, v.city, v.work, s.jcs.filter((j) => j.vendor === v.name).length, open.filter((j) => j.vendor === v.name).length, g(sum(open.filter((j) => j.vendor === v.name), (j) => j.issued - j.pieces - j.scrap)), lossPct(s.jcs.filter((j) => j.vendor === v.name && j.state !== "At vendor")).toFixed(2) + "%", v.rating]) } },

    { id: "stores", title: "Store performance", about: "Each store against its monthly target, and what is on its shelves.",
      kpis: [...STORES.map((n) => [n, pct(storeRev(n), STORE_TARGET[n]) + "%", `${lakh(storeRev(n))} of ${lakh(STORE_TARGET[n])}`] as [string, string, string]), ["Store revenue this month", lakh(sum(STORES, (n) => storeRev(n)))], ["Pieces in store stock", String(stock.filter((i) => STORES.includes(i.loc)).length), plural(walkins.length, "walk-in") + " captured"]],
      charts: [
        { title: "Revenue against target (%)", kind: "bar", data: STORES.map((n) => ({ name: n.split(" ")[0], v: pct(storeRev(n), STORE_TARGET[n]) })) },
        { title: "Store revenue by month (lakh)", kind: "stack", keys: STORES, data: span.map((k) => ({ name: monthLabel(k), ...Object.fromEntries(STORES.map((n) => [n, L(sum(inv.filter((v) => v.store === n && monthKey(v.date) === k), (v) => v.amount))])) })) },
      ],
      insights: STORES.map((n) => `${n} is at ${pct(storeRev(n), STORE_TARGET[n])}% of target with ${stock.filter((i) => i.loc === n).length} pieces on the shelf.`),
      table: { title: "Stores", head: ["Store", "Revenue", "Target", "Pieces", "Stock value", "Invoices"], num: [1, 2, 3, 4, 5], rows: STORES.map((n) => [n, lakh(storeRev(n)), lakh(STORE_TARGET[n]), stock.filter((i) => i.loc === n).length, inr(sum(stock.filter((i) => i.loc === n), (i) => i.price)), nowInv.filter((v) => v.store === n).length]) } },

    { id: "dead", title: "Dead stock", about: "Pieces that have sat too long. Ages here are estimated from the tag.",
      kpis: [["Pieces over 90 days", String(aged.length)], ["Value locked", inr(sum(aged, (i) => i.price))], ["Share of stock", pct(aged.length, stock.length) + "%"], ["Oldest", Math.max(0, ...stock.map((i) => days(i.tag))) + " days"]],
      charts: [
        { title: "Pieces by age", kind: "bar", data: [["0-30", 0, 30], ["31-60", 31, 60], ["61-90", 61, 90], ["90+", 91, 999]].map(([name, a, b]) => ({ name: String(name), v: stock.filter((i) => days(i.tag) >= Number(a) && days(i.tag) <= Number(b)).length })) },
        { title: "Old stock by location", kind: "donut", data: rows(tally(aged, (i) => i.loc)) },
      ],
      insights: [`${inr(sum(aged, (i) => i.price))} is tied up in pieces older than 90 days.`, `${top(tally(aged, (i) => i.sku))?.[0] ?? "No SKU"} has the most old pieces.`, "Move old pieces to the store with the best sell-through, or put them on a campaign."],
      table: { title: "Pieces over 90 days", head: ["Tag", "SKU", "Days", "Location", "Price"], num: [2, 4], rows: [...aged].sort((a, b) => days(b.tag) - days(a.tag)).map((i) => [i.tag, i.sku, days(i.tag), i.loc, inr(i.price)]) } },

    { id: "fast", title: "Fast movers", about: "What sells, how fast, and what is about to run out.",
      kpis: [["Pieces sold", String(sold.length), `last ${plural(f.months, "month")}`], ["Top SKU", topSku?.[0] ?? "-", topSku ? plural(topSku[1], "piece") : ""], ["Sell-through", pct(sold.length, sold.length + stock.length) + "%"], ["Average days of cover", "26", "sample"]],
      charts: [
        { title: "Pieces sold by SKU", kind: "bar", data: s.skus.map((k) => ({ name: k.code.slice(3), v: sold.filter((v) => v.sku === k.code).length })) },
        { title: "Pieces sold by month", kind: "line", data: span.map((k) => ({ name: monthLabel(k), v: sold.filter((v) => monthKey(v.date) === k).length })) },
      ],
      insights: [`${topSku?.[0] ?? "No SKU"} is the fastest mover.`, `${plural(s.skus.filter((k) => !stock.some((i) => i.sku === k.code)).length, "SKU")} with nothing in stock.`, `Sell-through is ${pct(sold.length, sold.length + stock.length)}%.`],
      table: { title: "SKU movement", head: ["SKU", "Name", "Sold", "In stock", "Sell-through"], num: [2, 3, 4], rows: s.skus.map((k) => { const a = sold.filter((v) => v.sku === k.code).length, b = stock.filter((i) => i.sku === k.code).length; return [k.code, k.name, a, b, pct(a, a + b) + "%"]; }) } },
  ];
  return base.map((d) => ({ ...d, alerts: alertsFor(d.id) }));

  function alertsFor(id: string): Dash["alerts"] {
    const out: Dash["alerts"] = [];
    const short = s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0);
    const hold = s.items.filter((i) => i.status === "Reserved");
    if (id === "inventory") {
      if (hold.length) out.push({ text: plural(hold.length, "piece") + " reserved for orders and not yet picked", href: "/ecommerce" });
      const t = s.items.filter((i) => i.status === "InTransit").length;
      if (t) out.push({ text: plural(t, "piece") + " in transit, waiting to be received", href: "/inventory" });
    }
    if (id === "raw") {
      const low = s.lots.filter((l) => l.fine < 250000);
      if (low.length) out.push({ text: plural(low.length, "metal lot") + " under 250 g of fine gold: " + low.map((l) => l.id).join(", "), href: "/raw-material" });
      const po = s.pos.filter((p) => p.state === "Sent").length;
      if (po) out.push({ text: plural(po, "purchase order") + " sent and not yet received", href: "/procurement" });
    }
    if (id === "production" || id === "manufacturing") {
      for (const j of short) out.push({ text: j.id + " is short " + g(jcCalc(j).unrec) + " of gold and cannot close", href: "/job-work?jc=" + j.id });
      const q = s.inw.filter((p) => !p.tag).length;
      if (q) out.push({ text: plural(q, "piece") + " at head office still waiting for a tag", href: "/inward" });
    }
    if (id === "vendor") for (const j of short) out.push({ text: j.vendor + " is over the wastage allowance on " + j.id, href: "/job-work?jc=" + j.id });
    if (id === "sales") {
      const p = s.approvals.filter((a) => a.state === "pending" && /Discount/.test(a.type)).length;
      if (p) out.push({ text: plural(p, "discount") + " waiting for approval", href: "/approvals" });
    }
    if (id === "finance" || id === "ledgers") {
      const o = ageOwed("61-90+");
      if (o) out.push({ text: inr(o) + " owed to us for over 60 days", href: "/finance" });
      const p = s.approvals.filter((a) => a.state === "pending" && a.type === "Purchase order").length;
      if (p) out.push({ text: plural(p, "purchase order") + " waiting for approval", href: "/approvals" });
    }
    if (id === "customer") {
      const d = cust.filter((c) => c.due > 0);
      if (d.length) out.push({ text: plural(d.length, "customer") + " have unpaid invoices", href: "/crm" });
    }
    if (id === "dead" && aged.length) out.push({ text: plural(aged.length, "piece") + " older than 90 days. Consider a campaign or a transfer.", href: "/inventory" });
    if (id === "fast") {
      const none = s.skus.filter((k) => !stock.some((i) => i.sku === k.code));
      if (none.length) out.push({ text: none.map((k) => k.code).join(", ") + " has no stock left", href: "/planning" });
    }
    if (id === "stores") for (const n of STORES) if (pct(storeRev(n), STORE_TARGET[n]) < 60) out.push({ text: n + " is at " + pct(storeRev(n), STORE_TARGET[n]) + "% of its monthly target", href: "/stores" });
    return out;
  }
}
