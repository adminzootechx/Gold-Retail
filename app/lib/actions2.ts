// More state changes for the full-screen build. Same rules as actions.ts: edit the draft, return a message.
import { g } from "./calc";
import { addInvoice, log } from "./actions";
import { limitOf } from "./records";
import type { State } from "./data";

const now = () => new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const apId = (d: State) => "AP-" + (41 + d.approvals.length);

export function addDesign(d: State, name: string, origin: string) {
  const id = "D-" + (124 + d.designs.length - 6);
  d.designs.push({ id, name: name || "Untitled design", origin, stage: 0, owner: "Meera" });
  log(d, `Design request ${id} created (${origin})`);
  return id + " added to Request";
}

export function createJobCard(d: State, vendor: string, sku: string, qty: number) {
  const ref = d.items.find((i) => i.sku === sku);
  const issued = Math.round((ref?.net ?? 4000) * 0.75 * qty);
  const lot = d.lots.find((l) => l.fine >= issued);
  if (!lot) return "Not enough fine gold in the vault";
  lot.fine -= issued;
  const id = "JC-" + (2413 + d.jcs.length - 4);
  d.jcs.unshift({ id, vendor, sku, qty, issued, pieces: 0, scrap: 0, stI: qty * 20, stSet: 0, stRet: 0, state: "At vendor", lot: lot.id });
  log(d, `Job card ${id} created, ${g(issued)} fine gold reserved from ${lot.id}`);
  return `${id} created for ${vendor}`;
}

export function posSale(d: State, tags: string[], cust: string, store = "Mumbai Flagship") {
  const lines = tags.map((t) => d.items.find((i) => i.tag === t)).filter((i) => !!i);
  const who = cust || "Walk-in customer";
  const inv = addInvoice(d, { channel: "Retail", store, cust: who, amount: lines.reduce((a, i) => a + i!.price, 0), tags, sku: lines[0]?.sku });
  for (const it of lines) { it!.status = "Sold"; it!.loc = "Customer"; it!.cust = who; it!.inv = inv; }
  log(d, `Sale ${inv}: ${tags.length} piece(s) to ${who}`);
  return `Sale ${inv} completed`;
}

export function issueMemo(d: State, party: string, tags: string[]) {
  const id = "CN-" + String(13 + d.memos.filter((m) => m.dir === "Sent").length - 1).padStart(3, "0");
  for (const t of tags) {
    const it = d.items.find((i) => i.tag === t);
    if (it) { it.status = "OnConsignment"; it.loc = "Consignment partner"; it.memo = id; }
  }
  d.memos.unshift({ id, dir: "Sent", party, tags, state: "Out" });
  log(d, `Consignment memo ${id} issued to ${party}`);
  return `Memo ${id} issued`;
}

export function settleMemo(d: State, id: string, outcome: "Sold" | "Returned") {
  const m = d.memos.find((x) => x.id === id)!;
  m.state = outcome;
  if (m.dir === "Sent") {
    for (const t of m.tags) {
      const it = d.items.find((i) => i.tag === t);
      if (!it) continue;
      if (outcome === "Sold") { it.status = "Sold"; it.loc = "Customer"; it.cust = m.party; it.inv = addInvoice(d, { channel: "Corporate", store: "HO", cust: m.party, amount: it.price, tags: [it.tag] }); }
      else { it.status = "InStock"; it.loc = "HO Vault"; delete it.memo; }
    }
  }
  log(d, `Memo ${id} settled as ${outcome.toLowerCase()}`);
  return `${id} marked ${outcome.toLowerCase()}`;
}

export function transferItem(d: State, tag: string, to: string) {
  const it = d.items.find((i) => i.tag === tag)!;
  it.to = to; it.loc = `${it.loc} to ${to}`; it.status = "InTransit";
  log(d, `${tag} sent to ${to}`);
  return `${tag} in transit to ${to}`;
}

export function receiveItem(d: State, tag: string) {
  const it = d.items.find((i) => i.tag === tag)!;
  if (it.to) { it.loc = it.to; delete it.to; }
  it.status = "InStock";
  log(d, `${tag} received at ${it.loc}`);
  return `${tag} received at ${it.loc}`;
}

export function sendCampaign(d: State, channel: "WhatsApp" | "Email" | "SMS", segment: string, text: string, count: number) {
  d.messages.unshift({ t: now(), channel, segment, text, count });
  log(d, `${channel} campaign sent to ${count} customers (${segment})`);
  return `${channel} message queued for ${count} customers`;
}

export function createPO(d: State, supplier: string, what: string, qty: string, value: number) {
  const id = "PO-" + (3317 + d.pos.length - 3);
  const big = value > limitOf(d.records, "r2", 500000);
  d.pos.unshift({ id, supplier, what, qty, value, state: big ? "Pending approval" : "Sent" });
  if (big) d.approvals.unshift({ id: apId(d), type: "Purchase order", ref: id, by: "Procurement", detail: what, value, state: "pending" });
  log(d, `${id} created for ${supplier}`);
  return big ? `${id} needs approval above the PO limit` : `${id} sent to ${supplier}`;
}

export function submitDiscount(d: State, ref: string, pct: number, detail: string) {
  const lim = limitOf(d.records, "r3", 10);
  if (pct > lim) {
    d.approvals.unshift({ id: apId(d), type: "Discount over 10%", ref, by: "Store manager", detail: `${pct}% ${detail}`, value: null, state: "pending" });
    log(d, `Discount ${pct}% on ${ref} sent for approval`);
    return `Discount above ${lim}% sent for approval`;
  }
  return `Discount within the ${lim}% limit, applied`;
}

export function corporateOrder(d: State, company: string, sku: string, qty: number, advPct: number) {
  const unit = d.skus.find((k) => k.code === sku) && (d.items.find((i) => i.sku === sku)?.price ?? 100000);
  const amount = Math.round((unit ?? 100000) * qty * 0.94); // bulk rate: 6% off list
  const id = addInvoice(d, { channel: "Corporate", store: "HO", cust: company, amount, paid: Math.round((amount * advPct) / 100), tags: [], sku });
  log(d, `Corporate order ${id}: ${qty} x ${sku} for ${company}`);
  return `${id} created, ${advPct}% advance received`;
}
