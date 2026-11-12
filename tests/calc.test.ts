import { test } from "node:test";
import assert from "node:assert/strict";
import { jcCalc, alloc, exchange, jcBalanced } from "../app/lib/calc.ts";

test("job card within allowed wastage balances", () => {
  const c = jcCalc({ issued: 49500, pieces: 46300, scrap: 2480, stI: 96, stSet: 94, stRet: 2 });
  assert.equal(c.allowed, 743);
  assert.equal(c.variance, 720);
  assert.equal(c.unrec, 0);
  assert.equal(c.stDiff, 0);
});

test("job card over allowed wastage cannot close without approval", () => {
  const j = { issued: 36000, pieces: 32980, scrap: 1810, stI: 120, stSet: 112, stRet: 6 };
  const c = jcCalc(j);
  assert.equal(c.unrec, 670);
  assert.equal(c.stDiff, 2);
  assert.equal(jcBalanced(j), false);
});

const item = (tag: string, loc: string, status = "InStock") =>
  ({ tag, sku: "S", variant: "V", loc, status }) as never;

test("fulfilment prefers HO, then a store, then make-to-order", () => {
  const o = { sku: "S", variant: "V", item: null };
  assert.equal(alloc([item("a", "Mumbai Flagship"), item("b", "HO Vault")], o).item?.tag, "b");
  assert.equal(alloc([item("a", "Mumbai Flagship")], o).mode, "store");
  assert.equal(alloc([item("a", "Consignment partner")], o).mode, "mto");
  assert.equal(alloc([item("a", "HO Vault", "Reserved")], o).mode, "mto");
});

test("exchange credit = (metal + stone share) less deduction", () => {
  const e = exchange({ net: 5000, stones: 100 }, 40, 10);
  assert.equal(Math.round(e.metal), 49688); // 3.75 g fine x 13250
  assert.equal(Math.round(e.stone), 18000); // 1.00 ct x 45000 x 40%
  assert.equal(Math.round(e.credit), Math.round((e.metal + e.stone) * 0.9));
});
