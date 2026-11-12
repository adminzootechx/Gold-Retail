import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../app/lib/data.ts";
import { goldWhere, pipeline, revenueNow, todos } from "../app/lib/home.ts";
import { findPiece } from "../app/lib/search.ts";
import { plural } from "../app/lib/stats.ts";

const s = { authed: true, role: "Founder" as const, ...seed() };

test("every role gets its own list, and each list only names things that role can open", () => {
  const f = todos(s, "Founder");
  const p = todos(s, "Production manager");
  const m = todos(s, "Store manager");
  const v = todos(s, "Vendor (portal)");
  assert.ok(f.some((t) => t.decide), "founder can decide approvals on Home");
  assert.ok(f.length && p.length && m.length && v.length);
  assert.notDeepEqual(f.map((t) => t.id), m.map((t) => t.id));
  assert.ok(v.every((t) => t.href.startsWith("/job-work")), "vendor only links to job work");
  assert.ok(m.every((t) => !t.decide), "a store manager decides nothing on Home");
});

test("blocked work comes first, then decisions, then the rest", () => {
  const order = todos(s, "Founder").map((t) => t.level);
  const rank = { blocked: 0, decision: 1, todo: 2 };
  assert.deepEqual(order, [...order].sort((a, b) => rank[a] - rank[b]));
  assert.equal(order[0], "blocked");
});

test("the short job card is named, with the exact gold it is short", () => {
  const t = todos(s, "Production manager").find((x) => x.id === "gold-JC-2409");
  assert.ok(t);
  assert.match(t.what, /0\.670 g/);
  assert.equal(t.href, "/job-work?jc=JC-2409");
});

test("nobody sees an empty-looking day when work is cleared", () => {
  const clear = { ...s, jcs: s.jcs.map((j) => ({ ...j, approved: true })), approvals: s.approvals.map((a) => ({ ...a, state: "approved" as const })), invoices: s.invoices.map((v) => ({ ...v, paid: v.amount })), orders: [] };
  assert.equal(todos(clear, "Founder").length, 0);
});

test("gold is shown by where it sits; pieces move along the pipeline", () => {
  const w = goldWhere(s);
  assert.equal(w.length, 3);
  assert.ok(w.every((x) => x.mg >= 0));
  assert.equal(pipeline(s).length, 4);
});

test("revenue compares the same days of last month", () => {
  const r = revenueNow(s);
  assert.equal(r.day, 12);
  assert.ok(r.now > 0 && r.before > 0 && r.prevTotal >= r.before);
});

test("scanner input finds a piece by tag, HUID or certificate, ignoring case and spaces", () => {
  assert.equal(findPiece(s.items, " ak-rng-014-0003 ")?.tag, "AK-RNG-014-0003");
  assert.equal(findPiece(s.items, "hu7k2p")?.tag, "AK-RNG-014-0001");
  assert.equal(findPiece(s.items, "igi lg6120451")?.tag, "AK-RNG-014-0001");
  assert.equal(findPiece(s.items, "nothing"), undefined);
});

test("counts read naturally", () => {
  assert.equal(plural(1, "order"), "1 order");
  assert.equal(plural(3, "order"), "3 orders");
});

test("order rows say what to do, not which step comes next", () => {
  const m = todos(s, "Store manager");
  assert.ok(m.some((t) => /WEB-5024: reserve the piece/.test(t.what)));
  assert.ok(m.every((t) => !/next is/.test(t.what)));
});
