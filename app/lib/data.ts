// Types and the deterministic sample data. Weights: gold in mg, stones in carat points.
// The server seeds the database from seed() on first run; the browser falls back to it if the API is down.
export type Role = "Founder" | "Production manager" | "Store manager" | "Vendor (portal)";
export type Status = "InStock" | "Reserved" | "InTransit" | "OnConsignment" | "Sold" | "InRepair" | "AtHallmark";
export type Channel = "Retail" | "Online" | "HNI" | "Corporate";

export interface Item {
  tag: string; sku: string; name: string; variant: string;
  gross: number; stones: number; net: number;
  huid: string; cert: string; loc: string; status: Status;
  jc: string; lot: string; price: number;
  order?: string; cust?: string; inv?: string; memo?: string; to?: string;
}
export interface Design { id: string; name: string; origin: string; stage: number; owner: string; lockPending?: boolean }
export interface Sku { code: string; name: string; design: string; variants: string[]; cert: string }
export interface JobCard {
  id: string; vendor: string; sku: string; qty: number;
  issued: number; pieces: number; scrap: number; stI: number; stSet: number; stRet: number;
  state: "Received" | "At vendor" | "Closed"; lot: string; approved?: boolean;
}
export interface Inward {
  sent?: boolean;
  id: string; jc: string; sku: string; name: string; variant: string;
  gross: number; stones: number; need: boolean; done: number[];
  huid: string | null; rew: number | null; tag: string | null;
}
export interface Approval {
  id: string; type: string; ref: string; by: Role | string; detail: string;
  value: number | null; state: "pending" | "approved" | "rejected"; design?: string;
}
export interface Repair { id: string; tag: string; issue: string; state: number; quote: number }
export interface Order { id: string; cust: string; sku: string; variant: string; state: number; item: string | null; mto?: boolean; notes: string[] }
export interface LogRow { t: string; u: string; text: string }
export interface Lot { id: string; fine: number }
export interface PO { id: string; supplier: string; what: string; qty: string; value: number; state: "Draft" | "Pending approval" | "Sent" | "Received" }
export interface Memo { qty?: number; id: string; dir: "Sent" | "Received"; party: string; tags: string[]; state: "Out" | "Sold" | "Returned" }
export interface Msg { t: string; channel: "WhatsApp" | "Email" | "SMS"; segment: string; text: string; count: number }
export interface Customer { id: string; name: string; city: string; segment: "Repeat" | "HNI" | "Online" | "Corporate" | "New"; occasion: string; pref: string }
export interface Invoice { id: string; date: string; channel: Channel; store: string; custId: string; amount: number; paid: number; tags: string[]; sku?: string }

/** Saved forms: BOMs, pricing, certificate rules, goods receipts, slips, vouchers, rates, rules, walk-ins, requests and profiles. */
export type RecKind = "bom" | "price" | "certreq" | "grn" | "qc" | "slip" | "ret" | "voucher" | "rate" | "walkin" | "rule" | "pr" | "profile";
export interface Rec { id: string; kind: RecKind; date: string; by: string; f: Record<string, string> }

export interface State {
  authed: boolean; role: Role;
  lots: Lot[]; designs: Design[]; skus: Sku[]; jcs: JobCard[]; inw: Inward[];
  approvals: Approval[]; repairs: Repair[]; orders: Order[]; items: Item[]; log: LogRow[];
  pos: PO[]; memos: Memo[]; messages: Msg[]; customers: Customer[]; invoices: Invoice[]; records: Rec[];
}
/** The parts of State that live in the database. Who is signed in stays in the browser tab. */
export type Stored = Omit<State, "authed" | "role">;

export const mk = (
  tag: string, sku: string, name: string, variant: string, gross: number, stones: number,
  huid: string, cert: string, loc: string, status: Status, jc: string, lot: string, price: number,
  x: Partial<Item> = {},
): Item => ({ tag, sku, name, variant, gross, stones, net: gross - stones * 2, huid, cert, loc, status, jc, lot, price, ...x });

/** One product family: what a typical piece weighs, costs and needs. */
const CATALOG = [
  { code: "AK-RNG-014", name: "Halo solitaire ring", design: "D-104", variants: ["18K Yellow", "18K White", "18K Rose"], cert: "IGI jewellery report", gross: 5300, stones: 94, price: 148000, cp: "IGI LG61", jc: "JC-2411", lot: "ML-0912" },
  { code: "AK-RNG-021", name: "Eternity band", design: "D-110", variants: ["18K Yellow", "18K White"], cert: "IGI jewellery report", gross: 4200, stones: 180, price: 198000, cp: "IGI LG61", jc: "JC-2398", lot: "ML-0905" },
  { code: "AK-PND-007", name: "Arc pendant", design: "D-099", variants: ["18K Yellow", "18K Rose"], cert: "SGL", gross: 3160, stones: 28, price: 64000, cp: "SGL 77", jc: "JC-2409", lot: "ML-0918" },
  { code: "AK-PND-011", name: "Heart pendant", design: "D-113", variants: ["18K Yellow", "18K White", "18K Rose"], cert: "None", gross: 2400, stones: 40, price: 52000, cp: "", jc: "JC-2401", lot: "ML-0909" },
  { code: "AK-EAR-021", name: "Drop earrings", design: "D-107", variants: ["18K Yellow", "18K White"], cert: "None", gross: 4020, stones: 60, price: 92000, cp: "", jc: "JC-2412", lot: "ML-0925" },
  { code: "AK-EAR-030", name: "Stud earrings", design: "D-115", variants: ["18K Yellow", "18K White"], cert: "SGL", gross: 1800, stones: 50, price: 48000, cp: "SGL 78", jc: "JC-2402", lot: "ML-0909" },
  { code: "AK-BNG-003", name: "Tennis bracelet", design: "D-109", variants: ["18K White", "18K Rose"], cert: "IGI jewellery report", gross: 11200, stones: 400, price: 310000, cp: "IGI LG61", jc: "JC-2405", lot: "ML-0925" },
  { code: "AK-NCK-009", name: "Cluster necklace", design: "D-112", variants: ["18K Yellow"], cert: "SGL", gross: 9800, stones: 220, price: 205000, cp: "SGL 77", jc: "JC-2405", lot: "ML-0925" },
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS: Customer[] = [
  { id: "C-1001", name: "Ananya Rao", city: "Mumbai", segment: "Repeat", occasion: "Anniversary 14 Dec", pref: "18K Yellow, solitaire" },
  { id: "C-1002", name: "Rohan Mehta", city: "Mumbai", segment: "HNI", occasion: "Birthday 3 Jan", pref: "18K White, bracelets" },
  { id: "C-1003", name: "Sana Qureshi", city: "Delhi", segment: "Repeat", occasion: "Anniversary 9 Feb", pref: "Rose gold, necklaces" },
  { id: "C-1004", name: "Meera Iyer", city: "Bengaluru", segment: "Online", occasion: "Birthday 22 Mar", pref: "18K White rings" },
  { id: "C-1005", name: "Kavya Nair", city: "Kochi", segment: "Online", occasion: "None", pref: "Pendants" },
  { id: "C-1006", name: "Dev Malhotra", city: "Delhi", segment: "Online", occasion: "Wedding 20 Feb", pref: "Necklaces" },
  { id: "C-1007", name: "Isha Verma", city: "Pune", segment: "Online", occasion: "Anniversary 1 Dec", pref: "Bracelets" },
  { id: "C-1008", name: "Corporate Gifting Co.", city: "Mumbai", segment: "Corporate", occasion: "Diwali gifting", pref: "Pendants, bulk" },
  { id: "C-1009", name: "Vikram Singhania", city: "Delhi", segment: "HNI", occasion: "Anniversary 18 Dec", pref: "Solitaires" },
  { id: "C-1010", name: "Tara Bose", city: "Kolkata", segment: "Repeat", occasion: "Birthday 11 Jan", pref: "Earrings" },
  { id: "C-1011", name: "Arvind & Sons Corporate", city: "Pune", segment: "Corporate", occasion: "Year-end gifting", pref: "Bulk pendants" },
  { id: "C-1012", name: "Nandini Shah", city: "Ahmedabad", segment: "New", occasion: "Wedding 14 Feb", pref: "Bridal set" },
];

const SEED_DATE = "2026-11-12";
const rec = (id: string, kind: RecKind, f: Record<string, string>, by = "Founder", date = SEED_DATE): Rec => ({ id, kind, date, by, f });
function seedRecords(skus: Sku[]): Rec[] {
  const out: Rec[] = [];
  const rates: [string, string, string][] = [["2026-11-12", "13250", "9938"], ["2026-11-11", "13210", "9908"], ["2026-11-10", "13180", "9885"], ["2026-11-07", "13095", "9821"]];
  rates.forEach(([date, r24, r18], i) => out.push(rec("RT-" + (4 - i), "rate", { r24, r18, source: "Manual" }, "Founder", date)));
  [["r1", "Final CAD lock", "Always", "", "Design head, then founder"], ["r2", "Purchase order", "Above value", "500000", "Procurement head, founder above the limit"], ["r3", "Discount", "Above percent", "10", "Store manager up to the limit, founder above"],
   ["r4", "Metal variance", "Beyond allowed wastage", "1.5", "Production manager, founder"], ["r5", "Refund", "Always", "", "Store manager and accounts"], ["r6", "Stock write-off", "Always", "", "Founder"]]
    .forEach(([id, name, rule, limit, approver]) => out.push(rec(id, "rule", { name, rule, limit, approver })));
  [["PR-908", "Round 1.0 mm melee, VS-EF", "14.00 ct", "Production", "Below minimum for JC-2412", "Approved"], ["PR-909", "Bails 18K", "300 pcs", "Production", "Reorder alert", "Pending"], ["PR-910", "Gift sleeves", "400 pcs", "Store", "Below reorder level", "Pending"]]
    .forEach(([id, item, qty, from, reason, status]) => out.push(rec(id, "pr", { item, qty, from, reason, status }, from)));
  skus.forEach((k, i) => {
    out.push(rec("BOM-" + (i + 1), "bom", { sku: k.code, v: "1", gold: String(+(2.4 + (i % 4) * 0.7).toFixed(2)), centre: String(+(0.3 + (i % 3) * 0.2).toFixed(2)), melee: String(+(0.1 + (i % 2) * 0.12).toFixed(2)), findings: String(2 + (i % 4)), pack: "1" }, "Design head"));
    out.push(rec("PRC-" + (i + 1), "price", { sku: k.code, v: "1", making: String(12000 + i * 1800), margin: String(20 + (i % 3) * 2) }, "Founder"));
    out.push(rec("CRQ-" + (i + 1), "certreq", { sku: k.code, v: "1", igi: i % 5 === 3 ? "no" : "yes", sgl: "no", huid: "yes" }, "Production manager"));
  });
  out.push(rec("GRN-0457", "grn", { po: "PO-3309", supplier: "Pack & Pride", ordered: "300 pcs", received: "300 pcs", diff: "0", result: "Matched", lot: "-" }, "Production manager", "2026-11-04"));
  out.push(rec("RV-101", "voucher", { type: "Receipt", party: "Anand Jewellers, Pune", amount: "250000", mode: "Bank transfer", ref: "-" }, "Accounts", "2026-11-09"));
  return out;
}

export function seed(): Stored {
  const rand = rng(20261112);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const AL = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const hu = () => "HU" + Array.from({ length: 4 }, () => AL[Math.floor(rand() * AL.length)]).join("");

  /* ---------- the story pieces, kept stable for the demo walk-through ---------- */
  const items: Item[] = [
    mk("AK-RNG-014-0001", "AK-RNG-014", "Halo solitaire ring", "18K Yellow", 5310, 94, "HU7K2P", "IGI LG6120451", "HO Vault", "InStock", "JC-2411", "ML-0912", 148000),
    mk("AK-RNG-014-0002", "AK-RNG-014", "Halo solitaire ring", "18K Yellow", 5280, 94, "HU7K3A", "IGI LG6120452", "HO Vault", "InStock", "JC-2411", "ML-0912", 148000),
    mk("AK-RNG-014-0003", "AK-RNG-014", "Halo solitaire ring", "18K White", 5350, 94, "HU7K5B", "IGI LG6120460", "Mumbai Flagship", "InStock", "JC-2411", "ML-0912", 152000),
    mk("AK-RNG-014-0004", "AK-RNG-014", "Halo solitaire ring", "18K White", 5330, 94, "HU7K6C", "IGI LG6120461", "Delhi Store", "Reserved", "JC-2411", "ML-0912", 152000, { order: "WEB-5019" }),
    mk("AK-RNG-014-0005", "AK-RNG-014", "Halo solitaire ring", "18K Yellow", 5300, 94, "HU6J1X", "IGI LG6119870", "Customer", "Sold", "JC-2411", "ML-0912", 148000, { cust: "Ananya Rao" }),
    mk("AK-PND-007-0001", "AK-PND-007", "Arc pendant", "18K Rose", 3170, 28, "HU8P1Q", "SGL 77120", "HO Vault", "InStock", "JC-2409", "ML-0918", 64000),
    mk("AK-PND-007-0002", "AK-PND-007", "Arc pendant", "18K Yellow", 3150, 28, "HU8P2R", "SGL 77121", "Mumbai Flagship", "InStock", "JC-2409", "ML-0918", 62000),
    mk("AK-PND-007-0003", "AK-PND-007", "Arc pendant", "18K Rose", 3160, 28, "HU8N9S", "SGL 77090", "Customer", "Sold", "JC-2409", "ML-0918", 64000, { cust: "Rohan Mehta" }),
    mk("AK-EAR-021-0001", "AK-EAR-021", "Drop earrings", "18K Yellow", 4020, 60, "HU3E4T", "None", "HO Vault", "InStock", "JC-2412", "ML-0925", 92000),
    mk("AK-EAR-021-0002", "AK-EAR-021", "Drop earrings", "18K White", 4050, 60, "HU3E5U", "None", "Consignment partner", "OnConsignment", "JC-2412", "ML-0925", 95000, { memo: "CN-012" }),
    mk("AK-EAR-021-0003", "AK-EAR-021", "Drop earrings", "18K Yellow", 4010, 60, "HU3E6V", "None", "HO to Delhi Store", "InTransit", "JC-2412", "ML-0925", 92000, { to: "Delhi Store" }),
    mk("AK-BNG-003-0001", "AK-BNG-003", "Tennis bracelet", "18K White", 11200, 400, "HU5B1W", "IGI LG6118100", "HO Vault", "InStock", "JC-2405", "ML-0925", 310000),
    mk("AK-BNG-003-0002", "AK-BNG-003", "Tennis bracelet", "18K White", 11150, 400, "Pending", "IGI LG6118101", "Hallmark Centre", "AtHallmark", "JC-2405", "ML-0925", 310000),
    mk("AK-NCK-009-0001", "AK-NCK-009", "Cluster necklace", "18K Yellow", 9800, 220, "HU2C7Y", "SGL 77001", "Repair", "InRepair", "JC-2405", "ML-0925", 205000, { cust: "Sana Qureshi" }),
    mk("AK-NCK-009-0002", "AK-NCK-009", "Cluster necklace", "18K Yellow", 9760, 220, "HU2C8Z", "SGL 77002", "Mumbai Flagship", "InStock", "JC-2405", "ML-0925", 205000),
    // pieces behind two delivered online orders
    mk("AK-EAR-030-0001", "AK-EAR-030", "Stud earrings", "18K White", 1810, 50, "HU4S1A", "SGL 78011", "Customer", "Sold", "JC-2402", "ML-0909", 48000, { cust: "Isha Verma", order: "WEB-5018" }),
    mk("AK-RNG-021-0001", "AK-RNG-021", "Eternity band", "18K Yellow", 4190, 180, "HU4S2B", "IGI LG6121001", "Customer", "Sold", "JC-2398", "ML-0905", 198000, { cust: "Dev Malhotra", order: "WEB-5017" }),
  ];

  /* ---------- fill the shelves: more pieces per product family ---------- */
  const next: Record<string, number> = {};
  for (const it of items) next[it.sku] = Math.max(next[it.sku] ?? 0, +it.tag.slice(-4));
  const place = () => { const r = rand(); return r < 0.45 ? "HO Vault" : r < 0.75 ? "Mumbai Flagship" : "Delhi Store"; };
  for (const c of CATALOG) {
    for (const v of c.variants) {
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const no = (next[c.code] = (next[c.code] ?? 0) + 1);
        const gross = Math.round(c.gross * (0.98 + rand() * 0.04));
        const cert = c.cp ? c.cp + String(100000 + Math.floor(rand() * 899999)) : "None";
        const price = Math.round((c.price * (v.includes("White") ? 1.03 : 1)) / 1000) * 1000;
        items.push(mk(`${c.code}-${String(no).padStart(4, "0")}`, c.code, c.name, v, gross, c.stones, hu(), cert, place(), "InStock", c.jc, c.lot, price));
      }
    }
  }

  /* ---------- six months of invoices ---------- */
  const invoices: Invoice[] = [];
  const months: [string, number, number][] = [["2026-06", 11, 30], ["2026-07", 12, 31], ["2026-08", 13, 31], ["2026-09", 15, 30], ["2026-10", 17, 31], ["2026-11", 9, 12]];
  const byseg = (s: Customer["segment"][]) => CUSTOMERS.filter((c) => s.includes(c.segment));
  for (const [ym, count, lastDay] of months) {
    for (let i = 0; i < count; i++) {
      const r = rand();
      const channel: Channel = r < 0.5 ? "Retail" : r < 0.75 ? "Online" : r < 0.9 ? "HNI" : "Corporate";
      const day = 1 + Math.floor(rand() * lastDay);
      const prod = pick(CATALOG);
      const base = prod.price;
      const amount = Math.round((channel === "HNI" ? 500000 + rand() * 700000 : channel === "Corporate" ? 800000 + rand() * 1000000 : base * (0.9 + rand() * 0.3)) / 100) * 100;
      const cust = pick(channel === "Retail" ? byseg(["Repeat", "New", "HNI"]) : channel === "Online" ? byseg(["Online", "New"]) : channel === "HNI" ? byseg(["HNI"]) : byseg(["Corporate"]));
      const store = channel === "Retail" ? pick(["Mumbai Flagship", "Mumbai Flagship", "Delhi Store"]) : channel === "HNI" ? "Mumbai Flagship" : "HO";
      const recent = ym === "2026-11" || (ym === "2026-10" && day > 20);
      const paid = recent && (channel === "HNI" || channel === "Corporate") ? (rand() < 0.5 ? 0 : Math.round(amount * 0.5)) : amount;
      invoices.push({ id: "", date: `${ym}-${String(day).padStart(2, "0")}`, channel, store, custId: cust.id, amount, paid, tags: [], sku: channel === "Retail" || channel === "Online" ? prod.code : undefined });
    }
  }
  invoices.sort((a, b) => a.date.localeCompare(b.date));
  invoices.forEach((v, i) => { v.id = "INV-" + (3200 + i); });

  // The story pieces point at real invoices: the latest three retail ones.
  const retail = invoices.filter((v) => v.channel === "Retail").slice(-4);
  const link = (tag: string, custId: string, inv: Invoice) => {
    const it = items.find((x) => x.tag === tag)!;
    inv.custId = custId; inv.tags = [tag]; inv.amount = it.price; inv.paid = it.price; inv.sku = it.sku;
    it.inv = inv.id; it.cust = CUSTOMERS.find((c) => c.id === custId)!.name;
  };
  link("AK-RNG-014-0005", "C-1001", retail[0]);
  link("AK-PND-007-0003", "C-1002", retail[1]);
  link("AK-NCK-009-0001", "C-1003", retail[2]);
  const online = invoices.filter((v) => v.channel === "Online").slice(-2);
  link("AK-EAR-030-0001", "C-1007", online[0]);
  link("AK-RNG-021-0001", "C-1006", online[1]);

  const lots: Lot[] = [{ id: "ML-0905", fine: 188400 }, { id: "ML-0909", fine: 264700 }, { id: "ML-0912", fine: 412300 }, { id: "ML-0918", fine: 318900 }, { id: "ML-0925", fine: 553400 }];

  return {
    lots,
    customers: CUSTOMERS,
    invoices,
    items,
    designs: [
      { id: "D-118", name: "Halo solitaire ring", origin: "Client", stage: 3, owner: "Meera" },
      { id: "D-121", name: "Lotus stud earrings", origin: "Social media", stage: 1, owner: "Arjun" },
      { id: "D-122", name: "Arc pendant, rose gold", origin: "Founder", stage: 2, owner: "Meera" },
      { id: "D-123", name: "Cuff bracelet", origin: "Design team", stage: 0, owner: "Arjun" },
      { id: "D-124", name: "Pearl-and-diamond drop", origin: "Client", stage: 0, owner: "Meera" },
      { id: "D-125", name: "Signet ring, lab emerald", origin: "Founder", stage: 2, owner: "Arjun" },
      { id: "D-109", name: "Tennis bracelet", origin: "Design team", stage: 5, owner: "Meera" },
      { id: "D-112", name: "Cluster necklace", origin: "Founder", stage: 5, owner: "Arjun" },
      { id: "D-115", name: "Stud earrings", origin: "Design team", stage: 5, owner: "Arjun" },
    ],
    skus: CATALOG.map((c) => ({ code: c.code, name: c.name, design: c.design, variants: c.variants, cert: c.cert })),
    jcs: [
      { id: "JC-2411", vendor: "Shree Karigar Works", sku: "AK-RNG-014", qty: 6, issued: 49500, pieces: 46300, scrap: 2480, stI: 96, stSet: 94, stRet: 2, state: "Received", lot: "ML-0912" },
      { id: "JC-2409", vendor: "Mehta Jewel Casting", sku: "AK-PND-007", qty: 8, issued: 36000, pieces: 32980, scrap: 1810, stI: 120, stSet: 112, stRet: 6, state: "Received", lot: "ML-0918" },
      { id: "JC-2412", vendor: "Shree Karigar Works", sku: "AK-EAR-021", qty: 10, issued: 28400, pieces: 0, scrap: 0, stI: 80, stSet: 0, stRet: 0, state: "At vendor", lot: "ML-0925" },
      { id: "JC-2410", vendor: "Kalyan Setters", sku: "AK-RNG-021", qty: 5, issued: 17800, pieces: 0, scrap: 0, stI: 90, stSet: 0, stRet: 0, state: "At vendor", lot: "ML-0905" },
      { id: "JC-2405", vendor: "Kalyan Setters", sku: "AK-BNG-003", qty: 4, issued: 52000, pieces: 49500, scrap: 1720, stI: 400, stSet: 400, stRet: 0, state: "Closed", lot: "ML-0925" },
      { id: "JC-2402", vendor: "Shree Karigar Works", sku: "AK-EAR-030", qty: 12, issued: 16300, pieces: 15900, scrap: 330, stI: 60, stSet: 60, stRet: 0, state: "Closed", lot: "ML-0909" },
      { id: "JC-2401", vendor: "Mehta Jewel Casting", sku: "AK-PND-011", qty: 10, issued: 18000, pieces: 17400, scrap: 450, stI: 40, stSet: 40, stRet: 0, state: "Closed", lot: "ML-0909" },
      { id: "JC-2398", vendor: "Kalyan Setters", sku: "AK-RNG-021", qty: 6, issued: 18900, pieces: 18400, scrap: 330, stI: 180, stSet: 180, stRet: 0, state: "Closed", lot: "ML-0905" },
    ],
    inw: [
      { id: "IN-701", jc: "JC-2411", sku: "AK-RNG-014", name: "Halo solitaire ring", variant: "18K Yellow", gross: 5320, stones: 94, need: true, done: [0, 0, 0, 0, 0], huid: null, rew: null, tag: null },
      { id: "IN-702", jc: "JC-2411", sku: "AK-RNG-014", name: "Halo solitaire ring", variant: "18K Yellow", gross: 5290, stones: 94, need: true, done: [1, 1, 1, 0, 0], huid: "HU4Q8M", rew: null, tag: null },
      { id: "IN-703", jc: "JC-2409", sku: "AK-PND-007", name: "Arc pendant", variant: "18K Rose", gross: 3180, stones: 28, need: false, done: [1, 1, 1, 1, 1], huid: "HU9R2D", rew: 3166, tag: null },
      { id: "IN-704", jc: "JC-2409", sku: "AK-PND-007", name: "Arc pendant", variant: "18K Yellow", gross: 3140, stones: 28, need: false, done: [1, 0, 0, 0, 0], huid: null, rew: null, tag: null },
    ],
    approvals: [
      { id: "AP-41", type: "Discount over 10%", ref: "HNI order HN-208", by: "Store manager", detail: "12% on 18K Halo ring set", value: null, state: "pending" },
      { id: "AP-42", type: "Purchase order", ref: "PO-3316", by: "Procurement", detail: "Lab-grown melee, 14 ct", value: 620000, state: "pending" },
      { id: "AP-43", type: "Refund", ref: "RF-88", by: "Store manager", detail: "Arc pendant, wrong length", value: 64000, state: "pending" },
      { id: "AP-39", type: "Final CAD lock", ref: "D-115", by: "Design head", detail: "Stud earrings", value: null, state: "approved", design: "D-115" },
      { id: "AP-38", type: "Metal variance", ref: "JC-2402", by: "Production manager", detail: "0.012 g beyond allowed wastage", value: null, state: "approved" },
    ],
    repairs: [
      { id: "RP-301", tag: "AK-NCK-009-0001", issue: "Prong re-tip, 3 stones", state: 1, quote: 2400 },
      { id: "RP-298", tag: "AK-PND-007-0003", issue: "Clasp replacement", state: 3, quote: 1800 },
      { id: "RP-295", tag: "AK-RNG-014-0005", issue: "Resize to 13", state: 5, quote: 1200 },
      { id: "RP-290", tag: "AK-EAR-030-0001", issue: "Post replaced", state: 7, quote: 900 },
    ],
    orders: [
      { id: "WEB-5024", cust: "Kavya Nair", sku: "AK-PND-007", variant: "18K Rose", state: 0, item: null, notes: [] },
      { id: "WEB-5023", cust: "Dev Malhotra", sku: "AK-NCK-009", variant: "18K Yellow", state: 0, item: null, notes: [] },
      { id: "WEB-5022", cust: "Isha Verma", sku: "AK-BNG-003", variant: "18K Rose", state: 0, item: null, notes: [] },
      { id: "WEB-5021", cust: "Nandini Shah", sku: "AK-EAR-030", variant: "18K Yellow", state: 0, item: null, notes: [] },
      { id: "WEB-5019", cust: "Meera Iyer", sku: "AK-RNG-014", variant: "18K White", state: 2, item: "AK-RNG-014-0004", notes: ["WhatsApp: Order confirmed", "SMS: Payment received"] },
      { id: "WEB-5018", cust: "Isha Verma", sku: "AK-EAR-030", variant: "18K White", state: 7, item: "AK-EAR-030-0001", notes: ["WhatsApp: Order confirmed", "SMS: Payment verified", "WhatsApp: Shipped", "SMS: Delivered"] },
      { id: "WEB-5017", cust: "Dev Malhotra", sku: "AK-RNG-021", variant: "18K Yellow", state: 6, item: "AK-RNG-021-0001", notes: ["WhatsApp: Order confirmed", "SMS: Shipped"] },
    ],
    pos: [
      { id: "PO-3316", supplier: "Lab Diamonds Surat", what: "Round 1.0 mm melee, VS-EF", qty: "14.00 ct", value: 620000, state: "Pending approval" },
      { id: "PO-3314", supplier: "Gem Source Jaipur", what: "Oval 1.0 ct certified, 3 pcs", qty: "3 pcs", value: 410000, state: "Sent" },
      { id: "PO-3312", supplier: "Bullion Desk Mumbai", what: "Fine gold 999", qty: "500.000 g", value: 6625000, state: "Sent" },
      { id: "PO-3309", supplier: "Pack & Pride", what: "Ring boxes, black", qty: "300 pcs", value: 66000, state: "Received" },
      { id: "PO-3305", supplier: "Findings House", what: "Prong settings 18K, 200 pcs", qty: "200 pcs", value: 84000, state: "Received" },
    ],
    memos: [
      { id: "CN-012", dir: "Sent", party: "Anand Jewellers, Pune", tags: ["AK-EAR-021-0002"], state: "Out" },
      { id: "CN-R04", dir: "Received", party: "Studio Rhea (designer)", tags: ["Rhea cuff 01", "Rhea cuff 02"], state: "Out" },
      { id: "CN-010", dir: "Sent", party: "Royal Gems, Hyderabad", tags: ["AK-PND-011-0001"], state: "Returned" },
    ],
    messages: [
      { t: "10 Nov, 11:00", channel: "WhatsApp", segment: "Occasion in the next 60 days", text: "A small gift from AKOIRAH for your anniversary.", count: 9 },
      { t: "05 Nov, 16:30", channel: "Email", segment: "HNI customers", text: "Preview: the winter solitaire collection.", count: 3 },
      { t: "29 Oct, 10:15", channel: "SMS", segment: "Online buyers", text: "Diwali offer: complimentary engraving on all pendants.", count: 6 },
    ],
    records: seedRecords(CATALOG.map((c) => ({ code: c.code })) as Sku[]),
    log: [
      { t: "12 Nov, 09:14", u: "Production manager", text: "Job card JC-2411 received at HO, 6 pieces" },
      { t: "12 Nov, 08:50", u: "Store manager", text: "Refund RF-88 requested for AK-PND-007-0003" },
      { t: "11 Nov, 17:20", u: "Founder", text: "Gold rate updated to ₹13,250/g (24K)" },
      { t: "11 Nov, 12:05", u: "Design head", text: "Final CAD lock approved for D-115" },
      { t: "10 Nov, 15:40", u: "Production manager", text: "Metal variance on JC-2402 approved" },
    ],
  };
}

export { CATALOG };
