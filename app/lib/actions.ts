// State changes for the prototype. Each action edits a draft copy of State and returns a message to show.
import { alloc, g, jcBalanced, jcCalc } from "./calc";
import { mk, type Channel, type State } from "./data";
import { TODAY } from "./stats";

import { INWARD_STEPS, MTO_STEPS, REPAIR_STEPS, SALE_STEPS } from "./steps";
export { INWARD_STEPS, MTO_STEPS, REPAIR_STEPS, SALE_STEPS };

export function log(d: State, text: string) {
  const t = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  d.log.unshift({ t, u: d.role, text });
}

/** Book a sale: a row in the invoice ledger that every dashboard reads. */
export function addInvoice(d: State, v: { channel: Channel; store: string; cust: string; amount: number; tags: string[]; paid?: number; sku?: string }) {
  const id = "INV-" + (3200 + d.invoices.length);
  const c = d.customers.find((x) => x.name === v.cust);
  d.invoices.push({ id, date: TODAY, channel: v.channel, store: v.store, custId: c?.id ?? "WALK", amount: v.amount, paid: v.paid ?? v.amount, tags: v.tags, sku: v.sku });
  return id;
}

const apId = (d: State) => "AP-" + (41 + d.approvals.length);

export function advanceDesign(d: State, id: string) {
  const x = d.designs.find((v) => v.id === id)!;
  if (x.stage === 3) {
    x.lockPending = true;
    d.approvals.unshift({ id: apId(d), type: "Final CAD lock", ref: x.id, by: "Design head", detail: x.name, value: null, state: "pending", design: x.id });
    log(d, "Final CAD lock requested for " + x.id);
    return "Sent to Approvals. A different person must approve.";
  }
  if (x.stage === 4) {
    const code = "AK-" + x.name.split(" ")[0].slice(0, 3).toUpperCase() + "-" + x.id.slice(2);
    d.skus.push({ code, name: x.name, design: x.id, variants: ["18K Yellow"], cert: "To be set" });
    x.stage = 5;
    log(d, `SKU ${code} created from ${x.id}`);
    return "SKU " + code + " created";
  }
  x.stage++;
  log(d, `${x.id} moved to stage ${x.stage}`);
}

export function requestVariance(d: State, id: string) {
  const j = d.jcs.find((v) => v.id === id)!;
  d.approvals.unshift({ id: apId(d), type: "Metal variance", ref: id, by: "Production manager", detail: g(jcCalc(j).unrec) + " beyond allowed wastage", value: null, state: "pending" });
  log(d, "Variance approval requested for " + id);
  return "Variance sent to Approvals";
}

export function closeJobCard(d: State, id: string) {
  const j = d.jcs.find((v) => v.id === id)!;
  if (!jcBalanced(j) && !j.approved) return "Cannot close: balances do not reconcile"; // guard, the button is also disabled
  j.state = "Closed";
  log(d, `Job card ${id} closed`);
  return id + " closed";
}

export function inwardStep(d: State, id: string) {
  const p = d.inw.find((v) => v.id === id)!;
  const i = [0, 1, 2, 3, 4].find((k) => !(p.done[k] || (k === 4 && !p.need)));
  if (i === undefined) return;
  p.done[i] = 1;
  if (i === 2) p.huid = "HU" + Math.random().toString(36).slice(2, 6).toUpperCase();
  if (i === 3) p.rew = p.gross - 14; // sample: hallmarking removes a little metal
  log(d, `${p.id}: ${INWARD_STEPS[i]} done`);
}

export function inwardTag(d: State, id: string) {
  const p = d.inw.find((v) => v.id === id)!;
  const n = d.items.filter((i) => i.sku === p.sku).length + 1;
  const tag = `${p.sku}-${String(n).padStart(4, "0")}`;
  const ref = d.items.find((i) => i.sku === p.sku);
  const jc = d.jcs.find((j) => j.id === p.jc)!;
  d.items.push(mk(tag, p.sku, p.name, p.variant, p.rew ?? p.gross, p.stones, p.huid ?? "Pending",
    p.need ? "IGI LG61" + Math.floor(20000 + Math.random() * 9000) : "None", "HO Vault", "InStock", p.jc, jc.lot, ref?.price ?? 100000));
  p.tag = tag;
  log(d, `Tag ${tag} generated, piece in HO Vault`);
  return "Tag " + tag + " generated";
}

export function orderNext(d: State, id: string) {
  const o = d.orders.find((v) => v.id === id)!;
  const r = alloc(d.items, o);
  if (o.state === 0 && r.mode === "mto") o.mto = true;
  o.state++;
  const steps = o.mto ? MTO_STEPS : SALE_STEPS;
  if (!o.mto && o.state === 1 && r.item) { r.item.status = "Reserved"; r.item.order = o.id; o.item = r.item.tag; }
  if (!o.mto && o.state === 6) {
    const it = d.items.find((i) => i.tag === o.item);
    if (it) { it.status = "Sold"; it.loc = "Customer"; it.cust = o.cust; it.inv = addInvoice(d, { channel: "Online", store: "HO", cust: o.cust, amount: it.price, tags: [it.tag], sku: it.sku }); }
  }
  o.notes.push((o.state % 2 ? "WhatsApp: " : "SMS: ") + steps[o.state]);
  log(d, `${o.id} moved to ${steps[o.state]}`);
}

export function releaseOrder(d: State, id: string) {
  const o = d.orders.find((v) => v.id === id)!;
  const it = d.items.find((i) => i.tag === o.item);
  if (it) { it.status = "InStock"; delete it.order; }
  o.item = null; o.state = 0; o.notes = [];
  log(d, "Reservation released for " + id);
  return "Reservation released, piece back in stock";
}

export function repairNext(d: State, id: string) {
  const r = d.repairs.find((v) => v.id === id)!;
  r.state++;
  log(d, `${r.id} moved to ${REPAIR_STEPS[r.state]}`);
}

export function submitExchange(d: State, tag: string) {
  const it = d.items.find((i) => i.tag === tag)!;
  d.approvals.unshift({ id: apId(d), type: "Exchange valuation", ref: tag, by: "Store manager", detail: "Credit note for " + (it.cust ?? "customer"), value: null, state: "pending" });
  log(d, "Exchange valuation submitted for " + tag);
  return "Exchange sent for approval";
}

export function decide(d: State, id: string, v: "approved" | "rejected") {
  const p = d.approvals.find((a) => a.id === id)!;
  if (p.by === d.role) return "You cannot approve your own request"; // guard, the buttons are also hidden
  p.state = v;
  log(d, `${p.id} ${p.type} ${v}`);
  if (p.type === "Final CAD lock") {
    const x = d.designs.find((z) => z.id === p.design)!;
    x.lockPending = false;
    if (v === "approved") x.stage = 4;
  }
  if (p.type === "Metal variance" && v === "approved") d.jcs.find((j) => j.id === p.ref)!.approved = true;
  return `${p.id} ${v}`;
}
