# AKOIRAH ERP: UI upgrade design (professional gold retail tool, fast and clear)

Date: 2026-11-15. Status: draft for approval.

## Intent and why

The owner of a gold retailer should open this app and feel it is a professional tool built for gold retail that is fast and clear. Today the app is functionally broad (20 modules, stored records, role homes, analytics) but reads as a generic admin template: Home answers "what needs me" better than "how is the business doing today", every row opens a new page, and the counter and tablet flows use the same layout as the desk screens.

Success: in the first thirty seconds the owner sees today's sales against target, today's gold rate and the vault position without scrolling; staff reach any record, action or screen in one or two keystrokes or taps; and a bill can be completed at the counter with a scanner and one big button.

## Goals

A. **Retail dashboard on Home.** A top band on Home, per role, ahead of the "Needs you" list.
B. **Speed layer.** Side panel for record details, a billing mode on Store operations, a command palette on Ctrl K, keyboard control of lists.
C. **Light jewellery character** (only where it helps clarity): a gold-rate ticker in the header, consistent weight formatting, tag-shaped status chips, certificate and HUID badges.

## Non-goals

- No new modules, no change to business rules or stored data shapes beyond a daily-target figure derived from existing store targets.
- No real authentication, no messaging, no payment work.
- No rebrand or new visual world; no dark theme; no new typeface.
- No phone-sized layouts beyond what exists now.

## Anti-goals (failure even if it technically works)

- The scanner flow gets slower: Home must still put the cursor in the search field and Enter must still open a piece's trace.
- Home loses "Needs you" or the in-row Approve and Reject with confirmation and Undo.
- Any traceability link (piece to certificate, HUID, job card, lot, invoice) becomes harder to reach.
- Decoration that costs clicks, motion that makes people wait, or anything that conflicts with the blueprint's traceability and barcode requirements.

## Constraints

- Stack stays: Next.js 16, React 19, TypeScript, Tailwind v4, lucide-react, recharts. No new runtime dependency unless it replaces a larger amount of hand-written code (a command palette is written by hand).
- Binding look (PRODUCT.md): teal #043544 and gold #d0a038, light theme. Current decisions kept: plain white page, black sidebar with rounded white panel, Inter, Title Case labels, 15 px main and 13 px sub sidebar levels.
- Accessibility working standard: WCAG AA contrast, touch targets about 44 px, `prefers-reduced-motion` honoured, keyboard and screen-reader paths for every new control (panel and palette are modal dialogs with focus trap and Escape).
- Role access unchanged; the Vendor role sees no new analytics.
- Existing checks stay green: type-check, lint, 18 tests, impeccable detector.
- Source of scope is `AKOIRAH_ERP_Functional_Blueprint_Process_Flow.docx`. Nothing here removes or hides a blueprint item; C is limited to presentation.

## Approaches considered

1. **Retail dashboard only (A).** Small and low risk, answers "how's business" in one glance, does nothing for speed of work.
2. **Speed layer only (B).** Biggest gain for daily staff, medium effort across screens, leaves Home looking the same.
3. **Visual character only (C).** Feels specialist, does little for speed.

Chosen by the owner: **A + B + C**, with C limited to the light items above and dropped wherever it would conflict with the blueprint.

## The design

### A. Home retail band

Founder (new band above tiles and "Needs you"):
- Today's sales against a daily target, with a progress bar. Daily target = (Mumbai Flagship + Delhi Store monthly targets) divided by days in the month.
- 24K gold rate with change since the previous saved rate.
- Vault position: fine gold in the vault in grams.
- A compact "sales, last 7 days" bar chart beside it.
Production manager band: gold on job cards, cards short, pieces at head office waiting for a tag.
Store manager band: today's sales against their stores' share of the target, pieces in their stores, online orders to move.
Vendor: no band.
The existing four tiles stay below the band for the Founder. The "At a glance" chart strip stays.

### B. Speed layer

1. **Side panel.** Clicking a row opens a right-hand panel over the page, kept beside the list. Content types: piece (tag, status, location, weight, certificate, HUID, job card, lot, invoice, with links to the full trace), invoice (lines, customer, paid and due), job card (gold and stone balance, reconciliation state). Each panel has "Open full page". Applies first to Inventory, Sales orders and Job work lists; other lists keep page navigation.
2. **Billing mode.** On Store operations, POS tab: large scan field kept focused, line list with big totals, one 56 px "Complete sale" button, 44 px+ controls, remaining screen chrome quieter. No change to the sale logic.
3. **Command palette.** Ctrl K opens a modal. Results grouped: Pieces (tag, HUID, certificate, order), Go to (every screen the role may open), Actions (New bill, Update gold rate, Receive pieces, Raise purchase request, Open notifications). Arrow keys and Enter. The header search field stays and Enter on it still traces a piece.
4. **List keyboard control.** On lists with row actions: arrow keys move the selection, Enter opens the side panel, and on "Needs you" the key A approves and R rejects the selected row, with the existing confirmation for large amounts and Undo.

### C. Light jewellery character

- Gold-rate ticker in the header: "24K ₹13,250/g" with an up or down arrow and amount since the previous saved rate; click goes to Finance, Gold rate.
- Weight formatting: grams to three places everywhere a gold weight is shown, carats to two places for stones, through the existing formatters; fix any place that formats differently.
- Status chips: the shared Pill gets a small tag-like shape (notched or rounded-end), same colours and wording.
- Certificate and HUID badges: a shared badge used wherever a certificate number or HUID is shown (tables, trace, panel), showing lab (IGI or SGL) and number.

## Decisions the owner made

- Approaches A, B and C together; C only where it does not conflict with the blueprint.
- Priority is speed and clarity over decoration; the feel is a professional gold retail tool.

## My calls (owner can override)

- Daily target is derived from existing monthly store targets, no new setting.
- Side panel for three record types first; other lists later.
- Command palette hand-written, no library.
- Keyboard shortcuts A and R only on "Needs you" and lists that have row actions.

## Left to the builder

Component and file names; panel width and exact responsive behaviour on tablet; the exact visual shape of the tag chip; test additions for new pure logic (daily target, rate change, palette result ranking).

## Calls settled after the builder check (mine, owner can override)

- Founder band: "Stores today" = invoices dated today at Mumbai Flagship and Delhi Store, against the daily target for those two stores. "All channels today" (every invoice, including HO) shown beside it. The 7-day chart counts all channels.
- Store manager sees both stores (the role has no store link; no data change).
- "Fine gold in vault" reuses `goldWhere()` (fine gold in metal lots).
- Seed invoices are spread so the latest invoice of a month lands on the demo's today, so the band is never empty on first view.
- Band counts reuse existing definitions: cards short (`jcCalc`), pieces waiting for a tag (`inw` without a tag), online orders to move (`orders` below step 7), gold on job cards (issued on open cards).
- "Previous rate" = the rate record before the latest; no record gives no ticker change.
- Row keys (arrows, Enter) apply to the three side-panel lists and Needs You; A and R only on Needs You.
- Palette "Go to" reuses `allowed()` from `lib/modules.ts`. Ctrl K is a modifier shortcut, so scanner keystrokes never trigger it.
