import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, type PItem } from "../app/lib/palette.ts";

const items: PItem[] = [
  { id: "a1", group: "Actions", label: "New bill", href: "/stores", keywords: "pos|sale" },
  { id: "a2", group: "Actions", label: "Update gold rate", href: "/finance", keywords: "rate" },
  { id: "g1", group: "Go to", label: "Inventory", href: "/inventory" },
  { id: "g2", group: "Go to", label: "Finance", href: "/finance" },
  { id: "p1", group: "Pieces", label: "AK-RNG-014-0001", hint: "Halo solitaire ring", href: "/trace?tag=AK-RNG-014-0001", keywords: "HU7K2P|IGI LG6120451" },
  { id: "p2", group: "Pieces", label: "AK-RNG-014-0003", hint: "Halo solitaire ring", href: "/trace?tag=AK-RNG-014-0003", keywords: "HU7K5B|IGI LG6120460" },
];

test("an exact tag comes first, and a HUID finds its piece", () => {
  assert.equal(rank("ak-rng-014-0003", items)[0].id, "p2");
  assert.equal(rank("hu7k2p", items)[0].id, "p1");
});

test("nothing typed shows actions first, then screens, and never pieces", () => {
  const r = rank("", items);
  assert.deepEqual(r.map((x) => x.group), ["Actions", "Actions", "Go to", "Go to"]);
});

test("a query that matches nothing, or only spaces, gives a clear empty result", () => {
  assert.deepEqual(rank("zzzz", items), []);
  assert.equal(rank("   ", items)[0].group, "Actions");
});

test("keywords find actions: typing sale finds New bill", () => {
  assert.equal(rank("sale", items)[0].id, "a1");
});
