// State changes for the prototype. Each action edits a draft copy of State and returns a message to show.
import { alloc, g, jcBalanced, jcCalc } from "./calc";
import { mk, type Channel, type State } from "./data";
import { TODAY } from "./stats";

import { INWARD_STEPS, MTO_STEPS, REPAIR_STEPS, SALE_STEPS } from "./steps";
export { INWARD_STEPS, MTO_STEPS, REPAIR_STEPS, SALE_STEPS };

/** The day an event happened, as it shows on a piece's timeline. */
const stamp = () => new Date(TODAY + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

/** Write what happened to a piece on its own timeline, so tracing it later shows the real history. */
export function trail(d: State, tag: string, text: string) {
  const it = d.items.find((i) => i.tag === tag);
  if (it) (it.ev ??= []).push([stamp(), text]);
}

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

/** The product development chain, in the blueprint's order. Stage 6 (Final CAD Lock) is reached when the lock is approved; stage 7 when a SKU exists. */
export const DESIGN_STAGES = ["Design Request", "CAD Development", "Internal Review", "CAD Approval", "RPT", "Prototype Approval", "Final CAD Lock", "SKU Created"];

export function advanceDesign(d: State, id: string) {
  const x = d.designs.find((v) => v.id === id)!;
  if (x.stage === 5) {
    x.lockPending = true;
    d.approvals.unshift({ id: apId(d), type: "Final CAD lock", ref: x.id, by: "Design head", detail: x.name, value: null, state: "pending", design: x.id });
    log(d, "Final CAD lock requested for " + x.id);
    return "Sent to Approvals. A different person must approve.";
  }
  if (x.stage >= 6) return;
  x.stage++;
  log(d, `${x.id} moved to ${DESIGN_STAGES[x.stage]}`);
  return `${x.id}: ${DESIGN_STAGES[x.stage]}`;
}

/** Final CAD is locked: make a new SKU, or add a variant to an SKU that already exists. Planning takes over from here. */
export function createSkuFromDesign(d: State, id: string, mode: "new" | "variant", sku: string, variant: string) {
  const x = d.designs.find((v) => v.id === id);
  if (!x || x.stage !== 6) return "Lock the final CAD first";
  if (mode === "variant") {
    const k = d.skus.find((z) => z.code === sku);
    if (!k) return "Choose the SKU to add a variant to";
    const v = variant.trim();
    if (!v) return "Name the variant, for example 18K Rose";
    if (k.variants.includes(v)) return v + " already exists on " + k.code;
    k.variants.push(v);
    x.stage = 7;
    log(d, `Variant ${v} added to ${k.code} from ${x.id}`);
    return `Variant ${v} added to ${k.code}. Ready for production planning.`;
  }
  const code = "AK-" + x.name.split(" ")[0].slice(0, 3).toUpperCase() + "-" + x.id.slice(2);
  if (d.skus.some((z) => z.code === code)) return code + " already exists";
  d.skus.push({ code, name: x.name, design: x.id, variants: ["18K Yellow"], cert: "To be set" });
  x.stage = 7;
  log(d, `SKU ${code} created from ${x.id}`);
  return `SKU ${code} created. Ready for production planning.`;
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
  let what = INWARD_STEPS[i] + " done";
  if (i === 0) {
    // Certified stones are tracked one by one: the next one in the vault is set in this piece.
    const st = p.need ? d.records.find((r) => r.kind === "stone" && r.f.where === "In vault") : undefined;
    if (st) { st.f.where = "Set in " + p.id; p.stone = st.f.no; what = `Stone ${st.f.no} (${st.f.weight}, ${st.f.colour} ${st.f.clarity}) matched to its certificate and set`; }
    else what = p.need ? "Stones matched to certificate (none left in the stone register)" : "Stones checked, no certificate required";
  }
  if (i === 1) what = "QC passed";
  if (i === 2) { p.huid = "HU" + Math.random().toString(36).slice(2, 6).toUpperCase(); what = "Hallmarked, HUID " + p.huid; }
  if (i === 3) { p.rew = p.gross - 14; what = "Re-weighed after hallmark, " + g(p.rew); } // sample: hallmarking removes a little metal
  if (i === 4) what = "Jewellery report recorded";
  (p.ev ??= []).push([stamp(), what]);
  log(d, `${p.id}: ${what}`);
}

/** The order (online or high-value) a job card is making a piece for, if any. */
const orderFor = (d: State, id?: string) => {
  if (!id) return undefined;
  const w = d.orders.find((o) => o.id === id);
  if (w) return { kind: "web" as const, variant: w.variant, cust: w.cust };
  const h = d.records.find((r) => r.kind === "hni" && r.id === id);
  return h ? { kind: "hni" as const, variant: h.f.variant, cust: h.f.cust, rec: h } : undefined;
};
export { orderFor };

export function inwardTag(d: State, id: string) {
  const p = d.inw.find((v) => v.id === id)!;
  const n = d.items.filter((i) => i.sku === p.sku).length + 1;
  const tag = `${p.sku}-${String(n).padStart(4, "0")}`;
  const ref = d.items.find((i) => i.sku === p.sku);
  const jc = d.jcs.find((j) => j.id === p.jc)!;
  const cert = p.need ? (p.stone ? p.stone : "IGI LG61" + Math.floor(20000 + Math.random() * 9000)) : "None";
  const it = mk(tag, p.sku, p.name, p.variant, p.rew ?? p.gross, p.stones, p.huid ?? "Pending", cert, "HO Vault", "InStock", p.jc, jc.lot, ref?.price ?? 100000);
  it.real = true;
  it.ev = [
    [jc.opened ?? "Earlier", `Job card ${jc.id} opened with ${jc.vendor}`],
    [jc.opened ?? "Earlier", `Fine gold issued from lot ${jc.lot}, ${(jc.stI / 100).toFixed(2)} ct of stones issued to the job`],
    ...(p.ev ?? []),
    [stamp(), `Tagged ${tag} and placed in HO Vault`],
  ];
  d.items.push(it);
  p.tag = tag;
  // Certified stones set in this piece now point at its tag.
  for (const r of d.records) if (r.kind === "stone" && r.f.where === "Set in " + p.id) r.f.where = "Set in " + tag;
  // A piece made for a customer order is reserved for it the moment it is tagged.
  const o = orderFor(d, jc.order);
  if (o && jc.order) {
    it.status = "Reserved"; it.order = jc.order;
    trail(d, tag, `Made to order, reserved for ${jc.order} (${o.cust})`);
    if (o.kind === "web") d.orders.find((x) => x.id === jc.order)!.item = tag;
    else { o.rec!.f.item = tag; it.price = Math.round(+o.rec!.f.net) || it.price; }
  }
  log(d, `Tag ${tag} generated, piece in HO Vault`);
  return "Tag " + tag + " generated" + (o ? `, reserved for ${jc.order}` : "");
}

export function orderNext(d: State, id: string) {
  const o = d.orders.find((v) => v.id === id)!;
  const r = alloc(d.items, o);
  if (o.state === 0 && r.mode === "mto") o.mto = true;
  if (o.mto && o.state === 3 && !o.item) return `Production is not finished${o.jc ? ": " + o.jc + " is still being made" : ""}. Tag the piece at Head Office Inward first.`;
  o.state++;
  const steps = o.mto ? MTO_STEPS : SALE_STEPS;
  if (o.mto && o.state === 2) {
    // Nothing in stock: the manufacturing order is a real job card at a vendor, linked back to this order.
    const est = jcEstimate(d, o.sku, 1);
    const lot = d.lots.find((l) => l.fine >= est.gold);
    if (!lot) { o.state--; return "Not enough fine gold in the vault to start the manufacturing order. Buy metal first."; }
    createJobCard(d, "Shree Karigar Works", o.sku, 1, lot.id, est.gold, est.stones, o.id);
    o.jc = d.jcs[0].id;
    o.notes.push(`WhatsApp: Your piece is being made (${o.jc})`);
  }
  if (!o.mto && o.state === 2 && r.item) { r.item.status = "Reserved"; r.item.order = o.id; o.item = r.item.tag; trail(d, r.item.tag, `Reserved for online order ${o.id}`); }
  if (o.state === 6) {
    const it = d.items.find((i) => i.tag === o.item);
    if (it) { it.status = "Sold"; it.loc = "Customer"; it.cust = o.cust; it.inv = addInvoice(d, { channel: "Online", store: "HO", cust: o.cust, amount: it.price, tags: [it.tag], sku: it.sku }); trail(d, it.tag, `Shipped to ${o.cust}, sold on ${it.inv}`); }
  }
  // A message goes to the customer at every stage: WhatsApp and SMS along the way, email for the last step.
  o.notes.push((o.state === 7 ? "Email: " : o.state % 2 ? "WhatsApp: " : "SMS: ") + steps[o.state]);
  log(d, `${o.id}${o.item ? " (" + o.item + ")" : ""} moved to ${steps[o.state]}`);
  return `${o.id}: ${steps[o.state]}. The customer has been told.`;
}

export function releaseOrder(d: State, id: string) {
  const o = d.orders.find((v) => v.id === id)!;
  const it = d.items.find((i) => i.tag === o.item);
  if (it) { it.status = "InStock"; delete it.order; trail(d, it.tag, `Reservation for ${o.id} released`); }
  o.item = null; o.state = 0; o.notes = [];
  log(d, "Reservation released for " + id);
  return "Reservation released, piece back in stock";
}

export function repairNext(d: State, id: string) {
  const r = d.repairs.find((v) => v.id === id)!;
  r.state++;
  trail(d, r.tag, `Repair ${r.id}: ${REPAIR_STEPS[r.state]}`);
  log(d, `${r.id} (${r.tag}) moved to ${REPAIR_STEPS[r.state]}`);
}

export function submitExchange(d: State, tag: string) {
  const it = d.items.find((i) => i.tag === tag)!;
  d.approvals.unshift({ id: apId(d), type: "Exchange valuation", ref: tag, by: "Store manager", detail: "Credit note for " + (it.cust ?? "customer"), value: null, state: "pending", tag });
  trail(d, tag, "Lifetime exchange valuation submitted for approval");
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
    if (v === "approved") x.stage = 6;
  }
  if (p.tag && (p.type === "Refund" || p.type === "Exchange valuation")) trail(d, p.tag, `${p.type === "Refund" ? "Refund " + p.ref : "Lifetime exchange"} ${v}`);
  if (p.type === "Refund" && v === "approved" && p.tag) {
    // The piece comes back through QC under the same item record, and the sale is reversed.
    const it = d.items.find((i) => i.tag === p.tag);
    if (it) { it.status = "InStock"; it.loc = "HO Vault"; delete it.cust; delete it.inv; }
  }
  if (p.type === "Metal variance" && v === "approved") d.jcs.find((j) => j.id === p.ref)!.approved = true;
  return `${p.id} ${v}`;
}

/** A customer places an online order. It waits for payment verification; no piece is reserved until then. */
export function placeOrder(d: State, cust: string, sku: string, variant: string) {
  if (!cust.trim()) return "Enter the customer's name";
  const k = d.skus.find((x) => x.code === sku);
  if (!k || !k.variants.includes(variant)) return "Choose a SKU and one of its variants";
  const id = "WEB-" + (Math.max(5000, ...d.orders.map((o) => +o.id.replace(/[^0-9]/g, "") || 0)) + 1);
  d.orders.unshift({ id, cust: cust.trim(), sku, variant, state: 0, item: null, notes: ["Email: Order received, awaiting payment"] });
  log(d, `Online order ${id} placed by ${cust.trim()} for ${sku} ${variant}`);
  return `${id} placed, awaiting payment`;
}

/** The next job card number: one more than the highest in use, so numbers never repeat. */
export const nextJc = (jcs: { id: string }[]) => "JC-" + (Math.max(2400, ...jcs.map((j) => +j.id.replace(/[^0-9]/g, "") || 0)) + 1);

/** Fine gold and stone points a job card would need, from a reference piece of the SKU. */
export function jcEstimate(d: State, sku: string, qty: number) {
  const ref = d.items.find((i) => i.sku === sku);
  return { gold: Math.round((ref?.net ?? 4000) * 0.75 * qty), stones: Math.round((ref?.stones ?? 20) * qty) };
}

/** Open a job card at a vendor and take its gold from a metal lot. Gold and stones can be 0 and issued later from a material issue slip. */
export function createJobCard(d: State, vendor: string, sku: string, qty: number, lotId: string, gold: number, stones: number, order?: string) {
  if (!vendor) return "Choose a vendor";
  if (!d.skus.some((x) => x.code === sku)) return "Choose a SKU";
  if (!Number.isInteger(qty) || qty < 1) return "Pieces must be a whole number of at least 1";
  if (!(gold >= 0) || !(stones >= 0)) return "Gold and stones cannot be negative";
  const lot = d.lots.find((l) => l.id === lotId);
  if (!lot) return "Choose a metal lot";
  if (gold > lot.fine) return `${lot.id} has only ${g(lot.fine)} of fine gold`;
  lot.fine -= gold;
  const id = nextJc(d.jcs);
  d.jcs.unshift({ id, vendor, sku, qty, issued: gold, pieces: 0, scrap: 0, stI: stones, stSet: 0, stRet: 0, state: "At vendor", lot: lot.id, order, opened: stamp() });
  log(d, `Job card ${id} created: ${qty} × ${sku} for ${vendor}, ${g(gold)} fine gold from ${lot.id}`);
  return `${id} created for ${vendor}`;
}

