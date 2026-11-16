// High-value (HNI) made-to-order sales, and the raw material registers. Same rules as the other action files: edit the draft, return a message.
import type { Rec, State } from "./data";
import { TODAY } from "./stats";
import { addInvoice, createJobCard, jcEstimate, log, trail } from "./actions";
import { inr } from "./calc";
import { limitOf, nextNo, ofKind } from "./records";

export const HNI_STEPS = ["Quote", "Advance paid", "In production", "Ready", "Delivered"] as const;
export const HNI_ACTIONS: Record<string, string> = { Quote: "Collect advance", "Advance paid": "Start production", "In production": "Mark ready", Ready: "Deliver" };

/** A high-value order is made to order: quote, advance, a job card at a vendor, the piece, then delivery. */
export function createHniOrder(d: State, cust: string, sku: string, variant: string, spec: string, disc: number, adv: number) {
  const k = d.skus.find((x) => x.code === sku);
  if (!cust.trim()) return "Choose the customer";
  if (!k || !k.variants.includes(variant)) return "Choose a SKU and one of its variants";
  if (!(disc >= 0 && disc <= 30)) return "The discount must be between 0 and 30%";
  if (!(adv >= 10 && adv <= 100)) return "The advance must be between 10 and 100%";
  const list = d.items.find((i) => i.sku === sku)?.price ?? 100000;
  const net = Math.round(list * (1 - disc / 100));
  const id = "HN-" + nextNo(d.records, "hni", 210);
  let approval = "";
  if (disc > limitOf(d.records, "r3", 10)) {
    approval = "AP-" + (41 + d.approvals.length);
    d.approvals.unshift({ id: approval, type: "Discount over 10%", ref: id, by: d.role, detail: `${disc}% on ${k.name}, ${variant}`, value: null, state: "pending" });
  }
  const r: Rec = { id, kind: "hni", date: TODAY, by: d.role, f: { cust: cust.trim(), sku, variant, spec: spec.trim(), list: String(list), disc: String(disc), net: String(net), adv: String(adv), state: "Quote", approval, jc: "", inv: "", item: "" } };
  d.records.unshift(r);
  log(d, `HNI order ${id} quoted for ${cust.trim()}: ${k.name}, ${variant}, ${inr(net)}`);
  return approval ? `${id} quoted. The ${disc}% discount needs the founder's approval before the advance.` : `${id} quoted at ${inr(net)}`;
}

/** Move a high-value order to its next stage. Each stage does the real work: invoice, job card, delivery. */
export function hniNext(d: State, id: string) {
  const r = d.records.find((x) => x.kind === "hni" && x.id === id);
  if (!r) return "Order not found";
  const f = r.f;
  const net = +f.net;
  if (f.state === "Quote") {
    const ap = d.approvals.find((a) => a.id === f.approval);
    if (ap?.state === "pending") return "Waiting for the founder to approve the discount";
    if (ap?.state === "rejected") return "The discount was rejected. Raise a new quote with a smaller discount.";
    const paid = Math.round((net * +f.adv) / 100);
    f.inv = addInvoice(d, { channel: "HNI", store: "HO", cust: f.cust, amount: net, paid, tags: [], sku: f.sku });
    f.state = "Advance paid";
    log(d, `${id}: advance ${inr(paid)} collected, price locked at ${inr(net)}, invoice ${f.inv}`);
    return `${id}: ${inr(paid)} advance collected, price locked. Invoice ${f.inv}.`;
  }
  if (f.state === "Advance paid") {
    const est = jcEstimate(d, f.sku, 1);
    const lot = d.lots.find((l) => l.fine >= est.gold);
    if (!lot) return "Not enough fine gold in the vault to start. Buy metal first.";
    createJobCard(d, "Shree Karigar Works", f.sku, 1, lot.id, est.gold, est.stones, id);
    f.jc = d.jcs[0].id;
    f.state = "In production";
    return `${id}: job card ${f.jc} opened at the vendor`;
  }
  if (f.state === "In production") {
    if (!f.item) return `${f.jc} is still being made. Tag the piece at Head Office Inward first.`;
    f.state = "Ready";
    log(d, `${id}: piece ${f.item} is ready`);
    return `${id}: ${f.item} is ready for the customer`;
  }
  if (f.state === "Ready") {
    const it = d.items.find((i) => i.tag === f.item);
    const inv = d.invoices.find((v) => v.id === f.inv);
    if (it) { it.status = "Sold"; it.loc = "Customer"; it.cust = f.cust; it.inv = f.inv; trail(d, it.tag, `Delivered to ${f.cust} on ${f.inv}, balance collected`); }
    if (inv) { inv.paid = inv.amount; inv.tags = it ? [it.tag] : []; }
    f.state = "Delivered";
    log(d, `${id} delivered to ${f.cust}`);
    return `${id} delivered, balance collected`;
  }
  return;
}

// ---------------- raw material registers

export type StockCat = "stone" | "melee" | "cstone" | "finding" | "pack";
export const CAT_LABEL: Record<StockCat, string> = { stone: "Certified stone", melee: "Melee lot", cstone: "Colour stone", finding: "Finding", pack: "Packaging" };
const PREFIX: Record<StockCat, string> = { stone: "ST-", melee: "ML-", cstone: "CS-", finding: "FD-", pack: "PK-" };

/** Receive stock into a register. Findings, packaging and lots add to what is there; certified stones are one record each. */
export function addStock(d: State, cat: StockCat, f: Record<string, string>) {
  const num = (v: string) => +v || 0;
  const mine = ofKind(d.records, cat);
  let id = PREFIX[cat] + nextNo(d.records, cat, 1);
  const add = (id: string, fields: Record<string, string>) => d.records.unshift({ id, kind: cat, date: TODAY, by: d.role, f: fields });
  if (cat === "finding" || cat === "pack") {
    const item = (f.item ?? "").trim();
    if (!item) return "Enter the item";
    if (!(num(f.qty) > 0)) return "Enter a quantity above 0";
    const ex = mine.find((r) => r.f.item.toLowerCase() === item.toLowerCase());
    if (ex) { ex.f.stock = String(num(ex.f.stock) + num(f.qty)); if (f.reorder) ex.f.reorder = f.reorder; }
    else add(id, { item, stock: String(num(f.qty)), reorder: String(num(f.reorder)) });
    log(d, `${CAT_LABEL[cat]} stock in: ${f.qty} × ${item}`);
    return `${f.qty} × ${item} added to stock`;
  }
  if (cat === "stone") {
    const no = (f.no ?? "").trim().toUpperCase();
    if (!no) return "Enter the report number";
    if (mine.some((r) => r.f.no === no)) return no + " is already in the register";
    if (!(num(f.weight) > 0)) return "Enter the weight in carats";
    add(id, { no, shape: f.shape || "Round", weight: num(f.weight).toFixed(2) + " ct", colour: f.colour || "-", clarity: f.clarity || "-", where: "In vault" });
    log(d, `Certified stone ${no} received`);
    return `${no} added to the stone register`;
  }
  const lot = (f.lot ?? "").trim();
  if (!lot) return "Enter the lot number";
  if (!(num(f.ct) > 0)) return "Enter the weight in carats";
  const ex = mine.find((r) => r.f.lot === lot);
  if (ex) { ex.f.pcs = String(num(ex.f.pcs) + num(f.pcs)); ex.f.ct = (num(ex.f.ct) + num(f.ct)).toFixed(2); return `${lot} topped up`; }
  id = PREFIX[cat] + nextNo(d.records, cat, 1);
  add(id, cat === "melee" ? { lot, type: f.type || "Round", pcs: String(num(f.pcs)), ct: num(f.ct).toFixed(2), grade: f.grade || "-" } : { lot, type: f.type || "-", pcs: String(num(f.pcs)), ct: num(f.ct).toFixed(2), where: "In vault" });
  log(d, `${CAT_LABEL[cat]} ${lot} received: ${num(f.ct).toFixed(2)} ct`);
  return `${lot} added to the ${CAT_LABEL[cat].toLowerCase()} register`;
}

/** Set a certified or colour stone in a piece, so the piece's trace names it. */
export function setStoneIn(d: State, recId: string, tag: string) {
  const r = d.records.find((x) => x.id === recId && (x.kind === "stone" || x.kind === "cstone"));
  if (!r || !d.items.some((i) => i.tag === tag)) return "Choose a stone and a piece";
  if (r.f.where !== "In vault") return "That stone is not in the vault";
  r.f.where = "Set in " + tag;
  trail(d, tag, `${r.kind === "stone" ? "Certified stone " + r.f.no : "Colour stone " + r.f.type + " (" + r.f.lot + ")"} set`);
  log(d, `${r.f.no ?? r.f.lot} set in ${tag}`);
  return `${r.f.no ?? r.f.lot} set in ${tag}`;
}

/** A goods receipt for something other than metal adds to the matching register. */
export function stockIn(d: State, what: string, qty: string) {
  const n = parseFloat(qty) || 0;
  if (!(n > 0)) return;
  const key = what.toLowerCase();
  if (/ct\b/i.test(qty)) {
    const m = ofKind(d.records, "melee").find((r) => key.includes(r.f.type.toLowerCase()) || r.f.type.toLowerCase().includes(key));
    if (m) { m.f.ct = (+m.f.ct + n).toFixed(2); log(d, `${m.f.lot} stock in: ${n} ct`); }
    return;
  }
  const r = [...ofKind(d.records, "finding"), ...ofKind(d.records, "pack")].find((x) => key.includes(x.f.item.toLowerCase()) || x.f.item.toLowerCase().includes(key));
  if (r) { r.f.stock = String(+r.f.stock + n); log(d, `${r.f.item} stock in: ${n} pcs`); }
  else addStock(d, "finding", { item: what, qty: String(n), reorder: "0" });
}
