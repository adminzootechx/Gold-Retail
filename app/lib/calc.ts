// Pure money, gold and stock rules. No imports at runtime, so tests/calc.test.ts can run it directly.
// Weights are integers: gold in milligrams of fine gold, stones in carat points (1 ct = 100 pts).
import type { Item, Order } from "./data";

export let RATE24 = 13250; // today's 24K rate, rupees per gram. The store keeps it in step with the latest saved rate.
export const setRate = (n: number) => { RATE24 = n; };
export const PUR = 0.75; // 18K
export const STONE_PER_CT = 45000; // sample lab-grown rate, rupees per carat
export const WASTAGE_PER_MILLE = 15; // 1.5% of issued fine gold is allowed wastage
export const ALLOC = ["HO Vault", "Mumbai Flagship", "Delhi Store"]; // locations the fulfilment engine may allocate from

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const g = (mg: number) => (mg / 1000).toFixed(3) + " g";
export const ct = (pts: number) => (pts / 100).toFixed(2) + " ct";

export interface JcAmounts { issued: number; pieces: number; scrap: number; stI: number; stSet: number; stRet: number }

/** Reconcile one job card: issued - pieces - scrap must sit within allowed wastage, stones must balance. */
export function jcCalc(j: JcAmounts) {
  const allowed = Math.round((j.issued * WASTAGE_PER_MILLE) / 1000);
  const variance = j.issued - j.pieces - j.scrap;
  return { allowed, variance, unrec: Math.max(0, variance - allowed), stDiff: j.stI - j.stSet - j.stRet };
}

export const jcBalanced = (j: JcAmounts) => {
  const c = jcCalc(j);
  return c.unrec === 0 && c.stDiff === 0;
};

export type Alloc =
  | { mode: "reserved"; item?: Item }
  | { mode: "ho" | "store"; item: Item }
  | { mode: "mto"; item?: undefined };

/** Fulfilment engine: held piece first, then HO, then a store, otherwise make to order. */
export function alloc(items: Item[], o: Pick<Order, "sku" | "variant" | "item">): Alloc {
  if (o.item) return { mode: "reserved", item: items.find((i) => i.tag === o.item) };
  const m = items.filter((i) => i.sku === o.sku && i.variant === o.variant && i.status === "InStock" && ALLOC.includes(i.loc));
  if (!m.length) return { mode: "mto" };
  const ho = m.find((i) => i.loc === "HO Vault");
  return { mode: ho ? "ho" : "store", item: ho ?? m[0] };
}

/** Lifetime exchange credit: metal at today's rate plus a share of stone value, less a deduction. */
export function exchange(it: { net: number; stones: number }, stonePct: number, dedPct: number) {
  const fine = (it.net * PUR) / 1000;
  const metal = fine * RATE24;
  const stoneFull = (it.stones / 100) * STONE_PER_CT;
  const stone = (stoneFull * stonePct) / 100;
  const sub = metal + stone;
  const deduction = (sub * dedPct) / 100;
  return { fine, metal, stoneFull, stone, sub, deduction, credit: sub - deduction };
}
