import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../app/lib/data.ts";
import { dailyTarget, daysIn, founderBand, lastDays, productionBand, rateChange, storeBand } from "../app/lib/retail.ts";

const s = { authed: true, role: "Founder" as const, ...seed() };

test("daily target is a day's share of the month and never divides by zero", () => {
  assert.equal(dailyTarget(6000000, 30), 200000);
  assert.equal(dailyTarget(0, 30), 0);
  assert.equal(dailyTarget(6000000, 0), 0);
  assert.equal(daysIn("2026-11-12"), 30);
});

test("the gold rate ticker shows the move from the previous rate, and nothing when there is only one", () => {
  assert.deepEqual(rateChange([{ f: { r24: "13250" } }, { f: { r24: "13210" } }]), { rate: 13250, diff: 40 });
  assert.deepEqual(rateChange([{ f: { r24: "13250" } }]), { rate: 13250, diff: null });
  assert.deepEqual(rateChange([]), { rate: 0, diff: null });
});

test("last days are oldest first and quiet days are zero", () => {
  const w = lastDays([{ date: "2026-11-12", amount: 500 }, { date: "2026-11-10", amount: 200 }], "2026-11-12", 7);
  assert.equal(w.length, 7);
  assert.deepEqual(w.map((d) => d.name), ["6", "7", "8", "9", "10", "11", "12"]);
  assert.equal(w[6].v, 500);
  assert.equal(w[4].v, 200);
  assert.equal(w[0].v, 0);
});

test("the founder band has sales today in the demo data, so the first screen is never empty", () => {
  const b = founderBand(s);
  assert.ok(b.target > 0 && b.all > 0 && b.stores > 0 && b.vaultMg > 0);
  assert.ok(Number.isFinite(b.pct));
  assert.equal(b.week.length, 7);
});

test("production and store bands reuse the same definitions as the rest of the app", () => {
  assert.equal(productionBand(s).cardsShort, 1);
  assert.ok(productionBand(s).awaitingTag > 0);
  assert.ok(storeBand(s).inStores > 0);
});
