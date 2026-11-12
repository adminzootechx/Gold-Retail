# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AKOIRAH is a lab-grown diamond jewellery business. The ERP serves four roles, and **each role gets its own home view**:

- **Founder**: checks how the business stands each morning and decides what is waiting on approval.
- **Production manager**: runs vendors and job cards, receives pieces at head office, reconciles gold and stones.
- **Store manager**: bills at the counter, handles online orders, repairs, exchanges and refunds.
- **Vendor (portal)**: sees only their own job cards and metal and stone account.

Used on **both desktop and tablets**: office staff on desktop, store, vault and inward-bench staff on tablets, often standing, with a USB barcode scanner.

The immediate audience is the client's team in a product walk-through; the product is meant for daily operation afterwards.

## Product Purpose

A functional ERP for the full lifecycle of a lab-grown diamond jewellery business, from design and CAD through manufacturing at vendors, head-office QC, hallmarking, tagging, inventory, sales (store, online, HNI, corporate), after-sales (repair, exchange, refund), CRM, finance and analytics. Source of scope: `AKOIRAH_ERP_Functional_Blueprint_Process_Flow.docx` (20 modules, three core flows, 12 dashboards).

Success: staff run the business from it instead of spreadsheets and WhatsApp, and the client's demo makes that believable.

## Positioning

Every gram of gold, every stone, certificate, HUID, SKU, order and movement is traceable, from vendor to customer and back through after-sales. A neighbouring ERP would not truthfully claim this level of per-piece, per-gram tracing as its core rule.

## Operating Context

- Gold is accounted in fine gold, in integer milligrams; stones in carat points. Vendors are reconciled per job card.
- A finished piece gets a tag only after stone-to-certificate matching, QC, hallmark (HUID) with re-weigh, and any IGI or SGL report.
- Pieces are identified by a Code 128 barcode and a QR on an 80 x 50 mm tag; scanners type the tag and press Enter.
- Approvals gate CAD locks, large purchases, discounts over 10%, refunds and variances; nobody approves their own request.
- Data lives in Neon Postgres, files in Neon Object Storage; deployment target is Vercel.

## Capabilities and Constraints

- Existing codebase: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, lucide-react, recharts, shares conventions with the gold ERP at `D:\ZooTechX\golddddd`.
- All 20 modules have screens; some figures are static samples (vendor scorecards, payables, users, approval limits, parts of finance and manufacturing).
- Light theme only.
- Undecided with the client: real gold-rate source, wastage allowances, GST treatment, exchange and refund policy values, approval thresholds, number of stores, whether a vendor portal and a customer storefront are in scope.

## Brand Commitments

- Name: AKOIRAH. Tagline in use: "Lab-grown diamond jewellery".
- The look follows the Jewelrex gold ERP reference (https://golddddd-eight.vercel.app/) and is light only; the user asked for this directly.
- Plain, direct wording; sentence case.

## Evidence on Hand

- The functional blueprint document and the implementation plan artifact.
- Sample data only: seeded products, pieces, customers and invoices. No real client data, real certificates, real hallmark numbers or real prices exist yet and none should be invented as fact.

## Product Principles

1. Traceability is the product. Any screen that shows a piece, gram or stone should make its origin one step away.
2. Each role starts where its work starts. A home view shows that role's next decisions, not everyone's metrics.
3. Staff can use it without training. Plain words, one obvious next action, mistakes hard to make and easy to undo.
4. Built for the floor as well as the desk. Tablet and scanner use are first-class, not afterthoughts.
5. Say what is a sample. Demo figures are labelled as such; the client must never mistake sample data for their own.

## Accessibility & Inclusion

No client-specific requirement established. Working standard from the owner's standing preferences: WCAG AA contrast, touch targets of about 44 px, respect `prefers-reduced-motion`.
