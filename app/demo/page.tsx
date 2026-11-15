"use client";
import Link from "../components/Go";
import { useState } from "react";
import { useStore } from "../lib/store";
import { Btn, Card, PageHeader } from "../components/ui";
import type { Role } from "../lib/data";

const STEPS: { role: string; title: string; href: string; say: string; do: string }[] = [
  { role: "Founder", title: "Start from the dashboard", href: "/", say: "One screen for the whole business: stock, gold in the vault, open work, orders and what needs a decision.", do: "Point at Needs attention and the gold-by-lot figure." },
  { role: "Founder", title: "Design to SKU", href: "/design", say: "Every design moves through CAD, review and prototype. A SKU can only be made from a locked final CAD.", do: "Press Lock final CAD on D-118. It goes to Approvals." },
  { role: "Founder", title: "Approve the lock", href: "/approvals", say: "Locks, large purchases, big discounts and refunds wait here. Nobody approves their own request.", do: "Approve the CAD lock, then return to Product development and press Create SKU." },
  { role: "Production manager", title: "Gold to the vendor, reconciled to the milligram", href: "/job-work", say: "Gold is issued in fine gold. When the vendor returns, the books must balance or the variance needs approval.", do: "Open JC-2409: unreconciled gold blocks closing. Request variance approval." },
  { role: "Production manager", title: "Receive, QC, hallmark and tag", href: "/inward", say: "A piece only gets a tag when stones match their certificates, QC passes, hallmark is done and it is re-weighed.", do: "Finish IN-701 step by step, generate the tag, then open Tag print queue." },
  { role: "Production manager", title: "Print the barcode tag", href: "/inward", say: "A real Code 128 barcode and a QR that opens the piece's full history.", do: "Choose Tag print queue, press Print. Scan the barcode at the POS." },
  { role: "Store manager", title: "Sell it at the counter", href: "/stores", say: "Scan the tag, the bill builds itself, the receipt prints, stock and dashboards update.", do: "Scan AK-RNG-014-0003 (Mumbai Flagship), Complete sale, Print receipt." },
  { role: "Store manager", title: "Online order and the fulfilment engine", href: "/ecommerce", say: "The engine reserves the piece before payment, so two customers cannot buy the same unique piece.", do: "Open WEB-5024 and press Next step. Open WEB-5022: no stock, so it becomes a manufacturing order." },
  { role: "Founder", title: "Trace any piece in seconds", href: "/trace", say: "Search a tag, HUID or certificate and see the gold lot, vendor, stones, hallmark and owner.", do: "Search HU7K2P in the top bar, then show the reverse trace." },
  { role: "Store manager", title: "After-sales that stays on the piece", href: "/after-sales", say: "Repairs, lifetime exchange and refunds all start from the tag and keep the history.", do: "Show the exchange valuation, move the slider, submit for approval." },
  { role: "Founder", title: "Close on the analytics", href: "/?view=analytics", say: "Twelve dashboards from the same data. The sale you just made is already in Sales and Store performance.", do: "Open Sales, then Store performance, then export a report as CSV." },
];

export default function Demo() {
  const { s, setRole, dbKind, sync, reset } = useStore();
  const [done, setDone] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader title="Demo guide" sub="A walk-through for the client, in order.">
        <Btn disabled={busy} onClick={async () => { setBusy(true); await reset(); setDone([]); setBusy(false); }}>Reset demo data</Btn>
      </PageHeader>

      <div className="mb-3.5 grid gap-3.5 md:grid-cols-3">
        <Card title="Database"><p className="text-[13.5px]">{dbKind === "neon" ? "Neon Postgres" : dbKind === "local" ? "Embedded local Postgres (no DATABASE_URL set)" : "Not reachable, running on bundled sample data"}</p><p className="text-xs text-muted-foreground">{sync === "saved" ? "Every change is saved." : sync === "saving" ? "Saving..." : "Changes are kept in this tab only."}</p></Card>
        <Card title="Signed in as"><p className="text-[13.5px]">{s.role}</p><p className="text-xs text-muted-foreground">Use the role menu in the top bar to switch.</p></Card>
        <Card title="Scanner"><p className="text-[13.5px]">Any USB barcode scanner works.</p><p className="text-xs text-muted-foreground">It types the tag and presses Enter, in the top search, the POS and stock audit.</p></Card>
      </div>

      <ol className="flex flex-col gap-2.5">
        {STEPS.map((st, i) => (
          <li key={i} className={"rounded-[var(--radius)] border bg-card p-4 " + (done.includes(i) ? "border-success/50" : "border-border")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2"><span className="font-display font-bold text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span><b className="text-base">{st.title}</b><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{st.role}</span></div>
                <p className="text-muted-foreground">{st.say}</p>
                <p className="mt-1 text-[13px]"><b>Do:</b> {st.do}</p>
              </div>
              <div className="flex gap-2">
                <Link href={st.href} onClick={() => { if (s.role !== st.role) setRole(st.role as Role); }}
                  className="rounded-lg border border-gold bg-gold px-3.5 py-1.5 text-sm font-semibold text-gold-fg hover:brightness-110">Go as {st.role}</Link>
                <Btn onClick={() => setDone(done.includes(i) ? done.filter((x) => x !== i) : [...done, i])}>{done.includes(i) ? "Undo" : "Done"}</Btn>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
