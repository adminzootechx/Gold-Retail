<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AKOIRAH ERP

Lab-grown diamond jewellery ERP prototype. Same stack as the gold ERP (`D:\ZooTechX\golddddd`):
Next.js 16 App Router, React 19, TypeScript, Tailwind v4, lucide-react. Light theme only.

- Plan: the AKOIRAH ERP Build Plan artifact. Blueprint: `Desktop\AKOIRAH_ERP_Functional_Blueprint_Process_Flow.docx`.
- `app/lib/data.ts` sample data (weights: gold in mg, stones in carat points). `calc.ts` money and gold rules, tested in `tests/`.
- `app/lib/actions.ts` and `actions2.ts` every state change. `store.tsx` holds state in the browser and saves it through `/api/state` a moment after each change.
- Database: `app/lib/server/db.ts` uses Neon when `DATABASE_URL` is set (pooled string, host contains `-pooler`), otherwise an embedded Postgres (PGlite) in `.data/` for `next dev`. A production build without `DATABASE_URL` fails on purpose. Data is stored as JSON rows in one `entities` table (`app/lib/server/state.ts`); the first request seeds it from `seed()` in `app/lib/data.ts`. Reset with the Demo guide page or `DELETE /api/state`.
- Neon: project purple-meadow-66600732, branch production, linked in `.neon`; services declared in `neon.ts` (Postgres, Object Storage bucket `assets`). `neon deploy` pulls the env into `.env.local` (gitignored). Pooled `DATABASE_URL` for the app, `DATABASE_URL_UNPOOLED` for schema creation. Never point `DATABASE_URL` at the gold ERP database.
- Files: `app/api/files` + `app/lib/server/files.ts` (Files SDK, neon adapter, private `assets` bucket, presigned links), shown by `components/FilesCard.tsx` on design detail and on each piece's trace page.
- Prove the Neon wiring: run the app, then `node --env-file=.env.local scripts/check-neon.mjs` (11 checks).
- Printing: `components/Labels.tsx` (Code 128 barcode + QR tags, 80 x 50 mm) and any `.print-area` element, styles in `globals.css`.
- All 20 blueprint modules have screens (tabs inside each page), plus analytics dashboards (12), reports with CSV export, users and access, and a Demo guide. Sales, customers and stock come from the database; `app/lib/mock.ts` holds a few static rows (vendors, payables, users, rules).
- Home (`app/page.tsx`) is one view per role; what each role sees comes from `app/lib/home.ts` (tested in `tests/home.test.ts`). Touch targets are at least 40px (44px on touch devices); the sidebar is an icon rail below 1024px.
- Commands: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.
