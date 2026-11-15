// Ranking for the Ctrl K command palette. Pure, so tests/palette.test.ts can run it directly.
export type Group = "Pieces" | "Go to" | "Actions";
export interface PItem { id: string; group: Group; label: string; hint?: string; href?: string; run?: "notifications"; keywords?: string }

const ORDER: Group[] = ["Actions", "Pieces", "Go to"];
const squash = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

/** How well a query matches one item: exact, then prefix, then contained, then letters in order. Zero is no match. */
function score(q: string, it: PItem) {
  const fields = [it.label, ...(it.keywords ?? "").split("|")].map(squash).filter(Boolean);
  let best = 0;
  for (const f of fields) {
    if (f === q) best = Math.max(best, 100);
    else if (f.startsWith(q)) best = Math.max(best, 80);
    else if (f.includes(q)) best = Math.max(best, 50);
    else { let i = 0; for (const c of f) if (c === q[i]) i++; if (i === q.length && q.length > 2) best = Math.max(best, 20); }
  }
  return best;
}

/** The best matches for what was typed. Nothing typed shows the actions, then the screens. */
export function rank(query: string, items: PItem[], limit = 9): PItem[] {
  const q = squash(query);
  const by = (a: PItem, b: PItem) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group);
  if (!q) return items.filter((i) => i.group !== "Pieces").sort(by).slice(0, limit);
  return items.map((it) => ({ it, s: score(q, it) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || by(a.it, b.it)).slice(0, limit).map((x) => x.it);
}
