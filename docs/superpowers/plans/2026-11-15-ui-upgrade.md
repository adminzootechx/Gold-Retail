# UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Make AKOIRAH ERP feel like a fast, clear, professional gold retail tool: a retail band on Home, a speed layer (side panel, billing mode, command palette, list keys) and light jewellery character.

**Architecture:** Pure helpers in `app/lib/retail.ts` and `app/lib/palette.ts` (tested with the node test runner), small client components under `app/components/`, mounted once in `Frame.tsx`. No new dependency.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, lucide-react, recharts.

**Spec:** docs/superpowers/specs/2026-11-15-ui-upgrade-design.md

## Global Constraints

- Teal #043544 and gold #d0a038; plain white page; black sidebar; Inter; Title Case labels.
- WCAG AA contrast, 44 px touch targets (40 px minimum), `prefers-reduced-motion` honoured.
- No new runtime dependency; role access unchanged; Vendor sees no new analytics.
- Type-check, lint, all tests and the impeccable detector stay green.
- Scanner flow unchanged: Home focuses the header search; Enter on it opens a piece's trace.

## Review Focus

- A month with 0 store target or day 1 of a month: daily target and "vs last month" must not divide by zero or show NaN.
- Only one saved gold rate: ticker shows the rate with no change arrow.
- Palette query that matches nothing, or only whitespace: shows "Nothing found" guidance, never a blank dialog.
- Side panel opened for a tag that was sold or moved after the list rendered: shows its current status, no crash.
- Keyboard shortcuts A/R while typing in an input: must not fire.

---

### Task 1: Retail numbers
**Files:** Create `app/lib/retail.ts`, `tests/retail.test.ts`.
**Produces:** `dailyTarget(monthly: number, daysInMonth: number): number`; `rateChange(rates: {f:{r24:string}}[]): {rate:number; diff:number|null}`; `lastDays(invoices, today: string, n: number): {name:string; v:number}[]`.
- [ ] Test: `dailyTarget(6000000, 30) === 200000`, `dailyTarget(0, 30) === 0`; `rateChange([{f:{r24:"13250"}},{f:{r24:"13210"}}])` is `{rate:13250, diff:40}`; one rate gives `diff:null`; `lastDays` returns n entries oldest first with zero for empty days.
- [ ] Implement; run `npm test`; commit.

### Task 2: Retail band on Home
**Files:** Create `app/components/RetailBand.tsx`; modify `app/page.tsx`.
**Consumes:** Task 1 helpers, `STORE_TARGET`, `salesToday`, `goldWhere` from `lib/home.ts`.
- [ ] Founder band: today's sales vs daily target with progress bar, 24K rate with change, vault grams, 7-day bars. Production and Store variants per spec. Vendor none.
- [ ] Verify in browser; commit.

### Task 3: Light jewellery character
**Files:** modify `components/Frame.tsx` (rate ticker), `components/kit.tsx` (tag-shaped Pill, `CertBadge`), tables showing cert/HUID.
- [ ] Ticker links to Finance; no arrow when `diff` is null. `CertBadge({cert, huid})` used in Inventory, Trace, panel.
- [ ] Commit.

### Task 4: Side panel
**Files:** Create `components/DetailPanel.tsx`, `lib/detail.tsx` (context `useDetail(): {open(d: Detail): void}`; `type Detail = {kind:"piece"|"invoice"|"jobcard"; id:string}`); modify `Frame.tsx`, `inventory/page.tsx`, `sales/page.tsx`, `job-work/page.tsx`.
- [ ] Modal dialog, focus trap, Escape, "Open full page" link; content per kind from the store, tolerant of missing records.
- [ ] Commit.

### Task 5: Command palette
**Files:** Create `lib/palette.ts` (`rank(query, items): Item[]`), `tests/palette.test.ts`, `components/CommandPalette.tsx`; modify `Frame.tsx`.
- [ ] Tests: exact tag first; empty query returns actions and screens; no match returns `[]`.
- [ ] Palette groups Pieces, Go to, Actions; Ctrl K opens; header Enter still traces.
- [ ] Commit.

### Task 6: List keys
**Files:** modify `components/Home.tsx` (Needs You), `components/kit.tsx` (Grid).
- [ ] Arrow keys move selection, Enter opens, A/R on Needs You (ignored in inputs). Commit.

### Task 7: Billing mode
**Files:** modify `stores/page.tsx`.
- [ ] Large scan field, big totals, 56 px Complete sale; no change to `posSale`. Commit.

### Task 8: Verify and ship
- [ ] type-check, lint, tests, detector; browser pass on each role; push as adminzootechx.
