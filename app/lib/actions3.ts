// Saving the forms that used to only show a message. Each one stores a record, changes what it should, and writes the audit log.
import type { Rec, RecKind, State } from "./data";
import { TODAY } from "./stats";
import { g } from "./calc";
import { log } from "./actions";
import { nextNo, ofKind } from "./records";

function add(d: State, kind: RecKind, id: string, f: Record<string, string>) {
  const r: Rec = { id, kind, date: TODAY, by: d.role, f };
  d.records.unshift(r);
  return r;
}
const nid = (d: State, kind: RecKind, prefix: string, start: number, pad = 0) => prefix + String(nextNo(d.records, kind, start)).padStart(pad, "0");
const version = (d: State, kind: RecKind, sku: string) => String(ofKind(d.records, kind).filter((x) => x.f.sku === sku).length + 1);
const str = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));

export function saveBom(d: State, sku: string, f: Record<string, number>) {
  const r = add(d, "bom", nid(d, "bom", "BOM-", 1), { sku, v: version(d, "bom", sku), ...str(f) });
  log(d, `Bill of materials v${r.f.v} saved for ${sku}`);
  return `BOM v${r.f.v} saved for ${sku}`;
}

export function savePrice(d: State, sku: string, making: number, margin: number) {
  const r = add(d, "price", nid(d, "price", "PRC-", 1), { sku, v: version(d, "price", sku), making: String(making), margin: String(margin) });
  log(d, `Pricing rule v${r.f.v} saved for ${sku}: making ${making}, margin ${margin}%`);
  return `Pricing rule v${r.f.v} saved for ${sku}`;
}

export function saveCertReq(d: State, sku: string, igi: boolean, sgl: boolean, huid: boolean) {
  const r = add(d, "certreq", nid(d, "certreq", "CRQ-", 1), { sku, v: version(d, "certreq", sku), igi: igi ? "yes" : "no", sgl: sgl ? "yes" : "no", huid: huid ? "yes" : "no" });
  // Pieces still waiting at inward follow the new rule.
  let n = 0;
  for (const p of d.inw) if (p.sku === sku && !p.tag) { p.need = igi || sgl; n++; }
  log(d, `Certificate requirements v${r.f.v} saved for ${sku}`);
  return `Requirements saved for ${sku}${n ? `, ${n} piece(s) at inward updated` : ""}`;
}

const parseG = (q: string) => { const m = /([\d.]+)\s*g\b/i.exec(q); return m ? Math.round(parseFloat(m[1]) * 1000) : 0; };
export const orderedMg = (qty: string) => parseG(qty);

export function postGrn(d: State, poId: string, gotMg: number) {
  const po = d.pos.find((p) => p.id === poId);
  if (!po) return "Choose a purchase order";
  const ordered = parseG(po.qty);
  const metal = ordered > 0;
  const diff = metal ? gotMg - ordered : 0;
  const id = nid(d, "grn", "GRN-", 458, 4);
  let lot = "-";
  if (metal) {
    lot = "ML-" + String(950 + d.lots.length).padStart(4, "0");
    d.lots.push({ id: lot, fine: Math.round(gotMg * 0.999) });
  }
  po.state = "Received";
  add(d, "grn", id, { po: poId, supplier: po.supplier, ordered: metal ? g(ordered) : po.qty, received: metal ? g(gotMg) : po.qty, diff: String(diff), result: Math.abs(diff) > 500 ? "Variance" : "Matched", lot });
  log(d, `${id} saved against ${poId}${metal ? `, metal lot ${lot} created with ${g(Math.round(gotMg * 0.999))} fine gold` : ""}`);
  return metal ? `${id} saved, metal lot ${lot} created` : `${id} saved`;
}

export function passQc(d: State, grn: string) {
  if (!d.records.some((x) => x.kind === "grn" && x.id === grn)) return "Choose a goods receipt";
  add(d, "qc", "QC-" + grn.slice(4), { grn, result: "Passed" });
  log(d, `Inward QC passed for ${grn}, stock released`);
  return `QC passed for ${grn}, stock released to the vault`;
}

export function issueSlip(d: State, jc: string, gold: number, stones: number) {
  const j = d.jcs.find((x) => x.id === jc);
  if (!j || j.state !== "At vendor") return "Choose a job card that is at the vendor";
  const lot = d.lots.find((l) => l.id === j.lot && l.fine >= gold) ?? d.lots.find((l) => l.fine >= gold);
  if (!lot) return "Not enough fine gold in any metal lot";
  lot.fine -= gold;
  j.issued += gold;
  j.stI += stones;
  const id = nid(d, "slip", "MI-", 1);
  add(d, "slip", id, { jc, vendor: j.vendor, gold: String(gold), stones: String(stones), lot: lot.id });
  log(d, `${id}: ${g(gold)} fine gold and ${stones} pts issued to ${j.vendor} on ${jc}`);
  return `${id} issued, ${g(gold)} on ${j.vendor}'s account`;
}

export function returnSlip(d: State, jc: string, pieces: number, scrap: number) {
  const j = d.jcs.find((x) => x.id === jc);
  if (!j || j.state === "Closed") return "Choose an open job card";
  j.pieces += pieces;
  j.scrap += scrap;
  if (j.state === "At vendor") j.state = "Received";
  const id = nid(d, "ret", "MR-", 1);
  add(d, "ret", id, { jc, vendor: j.vendor, pieces: String(pieces), scrap: String(scrap) });
  log(d, `${id}: ${pieces} pieces and ${g(scrap)} scrap returned on ${jc}`);
  return `${id} recorded, ${jc} is now at head office`;
}

export function receivePieces(d: State, jc: string, n: number, grossMg: number) {
  const j = d.jcs.find((x) => x.id === jc);
  const k = j && d.skus.find((x) => x.code === j.sku);
  if (!j || !k) return "Choose a job card";
  if (!(n > 0) || !(grossMg > 0)) return "Enter the piece count and the gross weight";
  const next = Math.max(700, ...d.inw.map((p) => +p.id.replace(/\D/g, "") || 0)) + 1;
  const rule = d.records.find((r) => r.kind === "certreq" && r.f.sku === j.sku);
  for (let i = 0; i < n; i++) {
    d.inw.push({ id: "IN-" + (next + i), jc, sku: j.sku, name: k.name, variant: k.variants[0], gross: Math.round(grossMg / n), stones: Math.round(j.stI / Math.max(1, j.qty)), need: rule ? rule.f.igi === "yes" || rule.f.sgl === "yes" : true, done: [0, 0, 0, 0, 0], huid: null, rew: null, tag: null });
  }
  if (j.state === "At vendor") j.state = "Received";
  log(d, `${n} pieces received at HO against ${jc}`);
  return `${n} pieces received against ${jc}, ready for stone matching`;
}

export function linkCert(d: State, tag: string, lab: string, no: string) {
  const it = d.items.find((i) => i.tag === tag);
  if (!it) return "Choose a tag";
  if (!no.trim()) return "Enter the report number";
  it.cert = `${lab} ${no.trim().toUpperCase()}`;
  log(d, `${it.cert} linked to ${tag}`);
  return `${it.cert} linked to ${tag}`;
}

export function sendHallmark(d: State, id: string) {
  const p = d.inw.find((x) => x.id === id);
  if (!p) return "Piece not found";
  p.sent = true;
  log(d, `${id} sent to the hallmark centre`);
  return `${id} sent to the hallmark centre`;
}

export function receiveHallmark(d: State, tag: string) {
  const it = d.items.find((i) => i.tag === tag);
  if (!it) return "Piece not found";
  it.status = "InStock";
  log(d, `${tag} received back from hallmark, re-weighed`);
  return `${tag} is back, re-weighed and in stock`;
}

export function postVoucher(d: State, type: "Receipt" | "Payment", party: string, amount: number, mode: string, ref: string) {
  if (!(amount > 0)) return "Enter an amount";
  const id = (type === "Receipt" ? "RV-" : "PV-") + (101 + ofKind(d.records, "voucher").filter((r) => r.f.type === type).length);
  if (type === "Receipt") {
    let left = amount;
    const c = d.customers.find((x) => x.name === party);
    for (const v of d.invoices.filter((x) => x.custId === c?.id && x.paid < x.amount)) {
      const take = Math.min(left, v.amount - v.paid);
      v.paid += take;
      left -= take;
    }
  }
  add(d, "voucher", id, { type, party, amount: String(amount), mode, ref: ref || "-" });
  log(d, `${id}: ${type.toLowerCase()} of ₹${amount.toLocaleString("en-IN")} ${type === "Receipt" ? "from" : "to"} ${party} by ${mode}`);
  return `${id} posted`;
}

export function saveRate(d: State, r24: number) {
  if (!(r24 > 0)) return "Enter the rate";
  add(d, "rate", nid(d, "rate", "RT-", 1), { r24: String(r24), r18: String(Math.round(r24 * 0.75)), source: "Manual" });
  log(d, `Gold rate updated to ₹${r24.toLocaleString("en-IN")}/g (24K)`);
  return `Rate saved: ₹${r24.toLocaleString("en-IN")}/g`;
}

export function saveWalkin(d: State, name: string, interest: string, store: string) {
  const who = name.trim() || "Guest";
  add(d, "walkin", nid(d, "walkin", "WK-", 1), { name: who, interest, store });
  if (!d.customers.some((c) => c.name === who)) {
    d.customers.push({ id: "C-" + String(d.customers.length + 1).padStart(3, "0"), name: who, city: "-", segment: "New", occasion: "-", pref: interest });
  }
  log(d, `Walk-in ${who} captured at ${store}`);
  return `${who} saved as a walk-in`;
}

export function receiveConsignment(d: State, from: string, n: number, terms: string) {
  if (!(n > 0)) return "Enter the piece count";
  const id = "CN-R" + String(d.memos.filter((m) => m.dir === "Received").length + 5).padStart(2, "0");
  d.memos.unshift({ id, dir: "Received", party: from, tags: Array.from({ length: n }, (_, i) => `${from.split(" ")[0]} piece ${i + 1}`), qty: n, state: "Out" });
  log(d, `Consignment ${id}: ${n} pieces received from ${from}. ${terms}`);
  return `${id} recorded, ${n} pieces held for ${from}`;
}

export function saveRules(d: State, limits: Record<string, string>) {
  for (const r of d.records) if (r.kind === "rule" && limits[r.id] !== undefined) r.f.limit = limits[r.id];
  log(d, "Approval rules updated");
  return "Approval rules saved. New requests follow them straight away.";
}

export function raisePr(d: State, item: string, qty: string, reason: string) {
  if (!item.trim()) return "Enter the item";
  const id = nid(d, "pr", "PR-", 911);
  add(d, "pr", id, { item, qty, from: d.role, reason, status: "Pending" });
  log(d, `${id} raised for ${item}`);
  return `${id} raised`;
}

export function decidePr(d: State, id: string, status: "Approved" | "Rejected") {
  const r = d.records.find((x) => x.kind === "pr" && x.id === id);
  if (!r) return;
  r.f.status = status;
  log(d, `${id} ${status.toLowerCase()}`);
  return `${id} ${status.toLowerCase()}`;
}

export function saveProfile(d: State, f: Record<string, string>) {
  const r: Rec = { id: d.role, kind: "profile", date: TODAY, by: d.role, f };
  const i = d.records.findIndex((x) => x.kind === "profile" && x.id === d.role);
  if (i >= 0) d.records[i] = r; else d.records.push(r);
  log(d, "Profile updated");
  return "Profile saved";
}
