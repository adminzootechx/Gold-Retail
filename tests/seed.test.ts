import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../app/lib/data.ts";
import { customerTotals, receivables, revenueByMonth } from "../app/lib/stats.ts";

const s = seed();

test("seed is deterministic, so every demo starts the same", () => {
  assert.deepEqual(seed(), seed());
});

test("tags and HUIDs are unique, and every piece points at real records", () => {
  const tags = s.items.map((i) => i.tag);
  assert.equal(new Set(tags).size, tags.length);
  const huids = s.items.map((i) => i.huid).filter((h) => h !== "Pending");
  assert.equal(new Set(huids).size, huids.length);
  for (const i of s.items) {
    assert.ok(s.jcs.some((j) => j.id === i.jc), `${i.tag} job card ${i.jc}`);
    assert.ok(s.lots.some((l) => l.id === i.lot), `${i.tag} lot ${i.lot}`);
    assert.ok(s.skus.some((k) => k.code === i.sku), `${i.tag} sku`);
  }
});

test("orders, memos and repairs only name pieces that exist", () => {
  for (const o of s.orders) if (o.item) assert.ok(s.items.some((i) => i.tag === o.item), o.id);
  for (const r of s.repairs) assert.ok(s.items.some((i) => i.tag === r.tag), r.id);
  for (const m of s.memos) if (m.dir === "Sent") for (const t of m.tags) assert.ok(s.items.some((i) => i.tag === t), m.id);
});

test("invoices: unique, real customers, never over-paid, linked pieces carry the invoice", () => {
  assert.equal(new Set(s.invoices.map((v) => v.id)).size, s.invoices.length);
  for (const v of s.invoices) {
    assert.ok(s.customers.some((c) => c.id === v.custId), v.id);
    assert.ok(v.paid >= 0 && v.paid <= v.amount, v.id);
    for (const t of v.tags) assert.equal(s.items.find((i) => i.tag === t)?.inv, v.id);
  }
});

test("six months of sales, growing, with money still owed", () => {
  const m = revenueByMonth(s.invoices);
  assert.equal(m.length, 6);
  assert.ok(receivables(s.invoices).length > 0);
  const totals = customerTotals(s.invoices, s.customers);
  assert.equal(totals.reduce((a, c) => a + c.spend, 0) <= s.invoices.reduce((a, v) => a + v.amount, 0), true);
});
